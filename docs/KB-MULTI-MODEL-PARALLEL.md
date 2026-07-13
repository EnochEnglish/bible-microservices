# 多模型并行索引设计（修正版）

## 核心修正

**不是"切换模型→重建索引"，而是"三个模型索引并行存在，查询时选择使用哪个"。**

```
传统方案（已否决）：
  同一时刻只有一个模型索引 → 切换需重建 → 测试效率低

修正方案（采纳）：
  三个模型索引同时存在 → 查询时路由到指定 Collection → 秒级切换
```

---

## 三模型并行架构

### 选中模型

| 模型 ID | 模型 | 维度 | 大小 | 定位 |
|---------|------|------|------|------|
| `tfidf_256` | TF-IDF 哈希 | 256 | 0 MB | 基线，零依赖，线上服务器可用 |
| `bgesmall_512` | bge-small-zh-v1.5 | 512 | 24 MB | 中文优先，轻量语义 |
| `bgebase_768` | bge-base-zh-v1.5 | 768 | 55 MB | 最高精度中文语义 |

### Zvec Collection 设计

三个模型各建独立的 Collection，**同时存活**：

```
Zvec 数据库 (data/zvec-index/)
├── tfidf_256_library       ← TF-IDF 嵌入的图书馆向量
├── tfidf_256_bible         ← TF-IDF 嵌入的圣经向量
├── bgesmall_512_library    ← BGE-small 嵌入的图书馆向量
├── bgesmall_512_bible      ← BGE-small 嵌入的圣经向量
├── bgebase_768_library     ← BGE-base 嵌入的图书馆向量
└── bgebase_768_bible       ← BGE-base 嵌入的圣经向量
```

### 存储与内存估算

| 模型 | 向量数 | 向量大小 | 索引大小 | 模型内存 | 总计 |
|------|--------|----------|----------|----------|------|
| tfidf_256 | ~11,000 | 11 MB | 11 MB | 0 MB | 22 MB |
| bgesmall_512 | ~11,000 | 23 MB | 23 MB | 24 MB | 70 MB |
| bgebase_768 | ~11,000 | 34 MB | 34 MB | 55 MB | 123 MB |
| **合计** | **~33,000** | **68 MB** | **68 MB** | **79 MB** | **215 MB** |

- 本地 32GB RAM：215 MB 占 0.7%，毫无压力
- 线上 1GB ECS：可只加载 tfidf_256（22MB），或 bgesmall_512（70MB）

---

## 数据流

### 索引构建（一次性，后台批量）

```
文档文本 → 分块
    │
    ├─→ TF-IDF 哈希嵌入（Kotlin 本地，~1ms/块）
    │     → 写入 Zvec Collection: tfidf_256_*
    │
    ├─→ BGE-small 嵌入（Node.js transformers.js，~35ms/块）
    │     → 写入 Zvec Collection: bgesmall_512_*
    │
    └─→ BGE-base 嵌入（Node.js transformers.js，~80ms/块）
          → 写入 Zvec Collection: bgebase_768_*

三个模型独立写入各自的 Collection，互不干扰。
```

### 构建时间估算

| 模型 | 11,000 块 | 耗时 |
|------|-----------|------|
| tfidf_256 | ~1ms/块 | ~11 秒 |
| bgesmall_512 | ~35ms/块 | ~6.4 分钟 |
| bgebase_768 | ~80ms/块 | ~14.7 分钟 |
| **总计** | | **~21 分钟**（并行可缩短到 ~15 分钟） |

首次构建可以三个模型并行嵌入（Node.js worker_threads），预计 ~15 分钟完成全部三个索引。

### 查询路由

```
用户搜索 "因信称义"
    │
    ├──→ 指定模型 = "bgebase_768"（默认/用户选择）
    │
    ├──→ 用 bgebase_768 嵌入查询文本 → 768 维向量
    │
    ├──→ 在 Zvec Collection "bgebase_768_bible" 中搜索
    │
    ├──→ 同时 Lucene 关键词搜索（混合搜索）
    │
    └──→ 融合排序 → 返回结果
```

**切换模型查询**：用户在前端选择不同模型，下次查询路由到对应 Collection，**零等待、零重建**。

---

## 后端实现

### KbEmbeddingService（路由器）

```kotlin
@Service
class KbEmbeddingService(
    private val tfidfEmbedding: TfidfHashEmbedding,
    private val configRepo: KbIndexConfigRepository
) {
    // 三个模型配置（固定，不可动态添加）
    data class ModelDef(
        val id: String,
        val displayName: String,
        val dimension: Int,
        val sizeMB: Int,
        val requiresNode: Boolean,
        val description: String
    )
    
    val models = listOf(
        ModelDef("tfidf_256", "TF-IDF Hash", 256, 0, false, "基线，零依赖，毫秒级"),
        ModelDef("bgesmall_512", "BGE-small-zh", 512, 24, true, "中文语义，轻量，~35ms"),
        ModelDef("bgebase_768", "BGE-base-zh", 768, 55, true, "最高精度中文，~80ms")
    )
    
    /**
     * 用指定模型嵌入文本
     */
    fun embed(text: String, modelId: String): FloatArray {
        return when (modelId) {
            "tfidf_256" -> tfidfEmbedding.embed(text)
            "bgesmall_512", "bgebase_768" -> {
                // HTTP 调用前端 Node.js transformers.js
                remoteEmbed(text, modelId)
            }
            else -> throw IllegalArgumentException("未知模型: $modelId")
        }
    }
    
    fun embedBatch(texts: List<String>, modelId: String): List<FloatArray> {
        return when (modelId) {
            "tfidf_256" -> tfidfEmbedding.embedBatch(texts)
            else -> remoteEmbedBatch(texts, modelId)
        }
    }
    
    /**
     * 获取指定模型的 Zvec Collection 名
     */
    fun collectionName(modelId: String, sourceType: String): String {
        return "${modelId}_${sourceType}"  // e.g. "bgebase_768_library"
    }
    
    private fun remoteEmbed(text: String, modelId: String): FloatArray {
        return remoteEmbedBatch(listOf(text), modelId)[0]
    }
    
    private fun remoteEmbedBatch(texts: List<String>, modelId: String): List<FloatArray> {
        // HTTP POST to http://localhost:3000/zvec/embed
        // { texts: [...], model: "bgesmall_512" }
        // → { embeddings: [[...], [...]], dimension: 512 }
        val reqBody = objectMapper.writeValueAsString(mapOf(
            "texts" to texts,
            "model" to modelId
        ))
        val request = Request.Builder()
            .url("$nodeServiceUrl/zvec/embed")
            .post(reqBody.toRequestBody("application/json".toMediaType()))
            .build()
        httpClient.newCall(request).execute().use { resp ->
            val body = objectMapper.readTree(resp.body!!.string())
            val dim = models.find { it.id == modelId }!!.dimension
            return body.get("embeddings").map { arr ->
                FloatArray(dim) { i -> arr[i].asDouble().toFloat() }
            }
        }
    }
}
```

### KbSearchService（多模型搜索）

```kotlin
@Service
class KbSearchService(
    private val embeddingService: KbEmbeddingService,
    private val zvecBridge: ZvecBridge,
    private val luceneSearch: BibleSearchService,
    private val queryCache: KbQueryCache
) {
    
    /**
     * 混合搜索——指定模型
     */
    fun search(query: String, modelId: String, topK: Int, filters: SearchFilters): SearchResult {
        // 1. 缓存检查（key 包含 modelId）
        val cacheKey = "${query}|${modelId}|${filters}"
        queryCache.get(cacheKey)?.let { return it }
        
        // 2. 用指定模型嵌入查询
        val queryVec = embeddingService.embed(query, modelId)
        
        // 3. 在对应模型的 Collection 中搜索
        val collection = embeddingService.collectionName(modelId, filters.sourceType)
        val vectorResults = zvecBridge.search(collection, queryVec, topK * 3, filters)
        
        // 4. Lucene 关键词搜索（与模型无关，复用同一索引）
        val keywordResults = luceneSearch.search(query, ...)
        
        // 5. 加权融合
        val fused = fuseResults(vectorResults, keywordResults)
        
        // 6. 写入缓存
        queryCache.put(cacheKey, fused)
        
        return fused
    }
}
```

### 索引构建服务

```kotlin
@Service
class KbIndexService(
    private val embeddingService: KbEmbeddingService,
    private val zvecBridge: ZvecBridge
) {
    
    /**
     * 构建所有三个模型的索引（首次建库）
     */
    fun buildAllIndexes() {
        val chunks = loadAllChunks()  // 从 H2 读取所有分块文本
        
        // 三个模型依次构建（也可并行）
        for (modelId in listOf("tfidf_256", "bgesmall_512", "bgebase_768")) {
            logger.info("Building index with model: $modelId")
            val collection = embeddingService.collectionName(modelId, "all")
            
            // 批量嵌入 + 批量插入
            val batchSize = 500
            for (batch in chunks.chunked(batchSize)) {
                val vectors = embeddingService.embedBatch(
                    batch.map { it.text }, modelId
                )
                zvecBridge.batchInsert(collection, batch, vectors)
            }
            zvecBridge.flush(collection)
            logger.info("Index $modelId complete: ${chunks.size} vectors")
        }
    }
    
    /**
     * 只构建指定模型的索引
     */
    fun buildIndex(modelId: String) {
        val chunks = loadAllChunks()
        val collection = embeddingService.collectionName(modelId, "all")
        
        val batchSize = 500
        for (batch in chunks.chunked(batchSize)) {
            val vectors = embeddingService.embedBatch(batch.map { it.text }, modelId)
            zvecBridge.batchInsert(collection, batch, vectors)
        }
        zvecBridge.flush(collection)
    }
    
    /**
     * 增量添加新书到所有三个模型索引
     */
    fun addBookIncremental(bookCode: String) {
        val chunks = loadBookChunks(bookCode)
        
        for (modelId in listOf("tfidf_256", "bgesmall_512", "bgebase_768")) {
            val collection = embeddingService.collectionName(modelId, "library")
            val vectors = embeddingService.embedBatch(chunks.map { it.text }, modelId)
            zvecBridge.batchInsert(collection, chunks, vectors)
            zvecBridge.flush(collection)
            logger.info("Added $bookCode to $modelId (${chunks.size} chunks)")
        }
    }
}
```

---

## 前端 Node.js 实现

### 模型管理

```javascript
// frontend/zvec-bridge.js

const { pipeline } = require('@xenova/transformers');

const MODEL_CONFIG = {
  bgesmall_512: {
    name: 'Xenova/bge-small-zh-v1.5',
    dim: 512,
    type: 'feature-extraction'
  },
  bgebase_768: {
    name: 'Xenova/bge-base-zh-v1.5',
    dim: 768,
    type: 'feature-extraction'
  }
};

// 两个模型都常驻内存（本地 32GB 够用）
const modelCache = new Map();  // modelId → pipeline

async function getEmbedder(modelId) {
  if (modelCache.has(modelId)) return modelCache.get(modelId);
  
  const config = MODEL_CONFIG[modelId];
  if (!config) throw new Error(`未知模型: ${modelId}`);
  
  console.log(`加载嵌入模型: ${config.name}...`);
  const embedder = await pipeline(config.type, config.name, {
    quantized: true,
    cache_dir: path.join(os.homedir(), '.cache', 'xenova'),
  });
  
  modelCache.set(modelId, embedder);
  console.log(`模型 ${config.name} 加载完成 (${modelCache.size} 个模型已加载)`);
  return embedder;
}

// 预加载所有模型（启动时调用）
async function preloadAllModels() {
  for (const modelId of Object.keys(MODEL_CONFIG)) {
    await getEmbedder(modelId);
  }
  console.log(`所有 ${modelCache.size} 个模型已就绪`);
}

async function embed(texts, modelId) {
  const embedder = await getEmbedder(modelId);
  const results = [];
  for (const text of texts) {
    const output = await embedder(text, { pooling: 'mean', normalize: true });
    results.push(Array.from(output.data));
  }
  return { embeddings: results, model: modelId, dimension: MODEL_CONFIG[modelId].dim };
}

// Express 路由
function setupZvecRoutes(app) {
  app.post('/zvec/embed', async (req, res) => {
    try {
      const { texts, model } = req.body;
      const result = await embed(texts, model);
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  
  app.get('/zvec/status', (req, res) => {
    res.json({
      zvecReady: !!zvecDb,
      loadedModels: Array.from(modelCache.keys()),
      availableModels: Object.keys(MODEL_CONFIG),
      allModelsReady: modelCache.size === Object.keys(MODEL_CONFIG).length,
    });
  });
  
  app.post('/zvec/preload', async (req, res) => {
    try {
      await preloadAllModels();
      res.json({ success: true, loaded: Array.from(modelCache.keys()) });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
}
```

---

## API 设计

### 搜索 API（带模型选择）

```
POST /api/v1/kb/search
```

```json
// Request
{
  "query": "因信称义",
  "modelId": "bgebase_768",         // 指定模型，可选，默认 tfidf_256
  "topK": 10,
  "filters": {
    "sourceType": "bible",
    "translation": "cuv_gb"
  },
  "mode": "hybrid"
}

// Response
{
  "total": 10,
  "query": "因信称义",
  "modelId": "bgebase_768",          // 回显使用的模型
  "mode": "hybrid",
  "tookMs": 85,
  "results": [...]
}
```

### 索引管理 API

```
POST   /api/v1/kb/index/build-all             — 构建全部三个模型索引
POST   /api/v1/kb/index/build/{modelId}       — 只构建指定模型索引
POST   /api/v1/kb/index/library/{code}/add    — 增量添加新书到三个索引
DELETE /api/v1/kb/index/{modelId}             — 删除指定模型的索引
GET    /api/v1/kb/stats                        — 各模型索引统计
GET    /api/v1/kb/models                       — 可用模型列表 + 状态
POST   /api/v1/kb/preload                      — 预加载所有模型到内存
```

### 模型对比 API

```
POST /api/v1/kb/compare
```

```json
// Request：同一个查询，三个模型同时返回结果对比
{
  "query": "神的爱不同于人的爱",
  "topK": 5,
  "filters": { "sourceType": "bible" }
}

// Response
{
  "query": "神的爱不同于人的爱",
  "models": {
    "tfidf_256": {
      "tookMs": 2,
      "results": [
        { "title": "约翰一书 4:7-12", "score": 0.62, "snippet": "..." },
        ...
      ]
    },
    "bgesmall_512": {
      "tookMs": 37,
      "results": [
        { "title": "约翰一书 4:7-12", "score": 0.87, "snippet": "..." },
        ...
      ]
    },
    "bgebase_768": {
      "tookMs": 82,
      "results": [
        { "title": "约翰一书 4:7-12", "score": 0.91, "snippet": "..." },
        ...
      ]
    }
  }
}
```

---

## 前端搜索页面

```
┌──────────────────────────────────────────────────────────────┐
│  🔍 知识库搜索                                                │
│                                                               │
│  [因信称义                                          ] [搜索]  │
│                                                               │
│  模型: ○ TF-IDF 256  ○ BGE-small 512  ● BGE-base 768        │
│        [对比全部模型 →]                                      │
│                                                               │
│  来源: [全部 ▼]  译本: [全部 ▼]  书卷: [全部 ▼]             │
├──────────────────────────────────────────────────────────────┤
│  结果 (BGE-base 768, 82ms):                                  │
│                                                               │
│  1. 罗马书 3:21-26          0.91                              │
│     ...就是神的义，因信耶稣基督加给一切相信的人...            │
│     📖 圣经 · cuv_gb · 罗3:21-26                             │
│                                                               │
│  2. 加拉太书 2:15-21        0.85                              │
│     ...既知道人称义不是因行律法，乃是因信耶稣基督...          │
│     📖 圣经 · cuv_gb · 加2:15-21                             │
│  ...                                                         │
└──────────────────────────────────────────────────────────────┘

点击 [对比全部模型 →] 后：

┌──────────────────────────────────────────────────────────────┐
│  模型对比: "因信称义"                                        │
│  ┌────────────────┬───────┬────────────┬──────────────────┐  │
│  │ 模型           │ 延迟  │ Top-1 结果 │ Top-1 分数       │  │
│  ├────────────────┼───────┼────────────┼──────────────────┤  │
│  │ TF-IDF 256     │ 2ms   │ 罗3:21-26  │ 0.62             │  │
│  │ BGE-small 512  │ 37ms  │ 罗3:21-26  │ 0.87             │  │
│  │ BGE-base 768   │ 82ms  │ 罗3:21-26  │ 0.91             │  │
│  └────────────────┴───────┴────────────┴──────────────────┘  │
│                                                               │
│  三模型都命中同一经文 ✓                                       │
│  BGE-base 分数最高 (0.91)，说明语义匹配度最好               │
└──────────────────────────────────────────────────────────────┘
```

---

## 配置

```yaml
# application.yml
kb:
  embedding:
    models:
      - id: tfidf_256
        dimension: 256
        local: true
      - id: bgesmall_512
        dimension: 512
        local: false
      - id: bgebase_768
        dimension: 768
        local: false
    default-model: tfidf_256
    node-service-url: http://localhost:3000
  zvec:
    db-path: ./data/zvec-index
    collections:
      library: ["tfidf_256_library", "bgesmall_512_library", "bgebase_768_library"]
      bible: ["tfidf_256_bible", "bgesmall_512_bible", "bgebase_768_bible"]
    batch-size: 500
```

```javascript
// frontend - 线上服务器配置（只加载轻量模型）
// server.js 启动时根据环境变量决定预加载哪些模型
const SERVER_MODE = process.env.KB_MODE || 'full';  // 'full' | 'lite' | 'tfidf-only'

if (SERVER_MODE === 'full') {
  await preloadAllModels();  // 加载 bgesmall + bgebase
} else if (SERVER_MODE === 'lite') {
  await getEmbedder('bgesmall_512');  // 只加载轻量模型
}
// tfidf-only: 不加载任何模型，TF-IDF 在后端计算
```

---

## 线上服务器适配

| 模式 | 加载模型 | 内存占用 | 适用环境 |
|------|----------|----------|----------|
| `full` | tfidf + bgesmall + bgebase | ~215 MB | 本地（32GB） |
| `lite` | tfidf + bgesmall | ~92 MB | 中等服务器（2GB+） |
| `tfidf-only` | tfidf | ~22 MB | 线上 ECS（1GB） |

线上服务器通过环境变量 `KB_MODE=tfidf-only` 控制，只使用 TF-IDF 索引，不加载任何模型文件。三个模型的 Zvec Collection 仍然在磁盘上存在，只是查询时不加载语义模型。

---

## 实施优先级

| 优先级 | 项 | 说明 |
|--------|---|------|
| **P0** | 后端 EmbeddingProvider 接口 + TfidfHashEmbedding | TF-IDF 在 Kotlin 本地计算 |
| **P0** | 前端 Node.js 安装 @xenova/transformers | 两个 BGE 模型 |
| **P0** | Zvec 三个 Collection 并行索引 | 一次性构建全部三个 |
| **P0** | 搜索 API 支持 modelId 参数 | 路由到对应 Collection |
| **P1** | 对比 API（同查询三模型同时返回） | 前端对比表格展示 |
| **P1** | 增量添加同时写入三个索引 | 新书 → 三个 Collection 各插入一份 |
| **P2** | 线上服务器 KB_MODE 配置 | 按资源选择加载策略 |
