# 多版本可切换嵌入架构设计

## 设计目标

提供多个嵌入模型版本，用户可根据场景实测选择：
- **本地开发**：资源充足（32GB RAM），可运行所有模型
- **线上服务器**：资源受限（1GB RAM），按性能选择轻量模型
- **切换模型时自动全量重建索引**，避免维度不兼容

---

## 系统资源对比

| 指标 | 本地 | 线上 ECS |
|------|------|----------|
| CPU | Celeron N5095 4核 | 1-2 vCPU |
| RAM | 32 GB（19 GB 空闲） | 1 GB |
| 磁盘 | C: 8GB / D: 5GB 剩余 | 40 GB |
| Node.js | v22.22.3 | v18+ |

---

## 嵌入模型选项

| ID | 模型 | 维度 | 大小 | 语言 | 推理速度 | 内存占用 | 适用场景 |
|---|---|---|---|---|---|---|---|
| `tfidf_256` | TF-IDF 哈希 | 256 | 0 MB | 通用 | ~1ms | ~5 MB | 基线对比、资源极度受限 |
| `tfidf_512` | TF-IDF 哈希 | 512 | 0 MB | 通用 | ~1ms | ~8 MB | TF-IDF 高维度版本 |
| `minilm_384` | all-MiniLM-L6-v2 | 384 | 23 MB | 英文 | ~30ms | ~120 MB | 英文圣经(KJV/BSB) |
| `e5small_384` | multilingual-e5-small | 384 | 47 MB | 多语言 | ~40ms | ~180 MB | 中英文混合搜索 |
| `bgesmall_512` | bge-small-zh-v1.5 | 512 | 24 MB | 中文优先 | ~35ms | ~140 MB | 中文圣经+图书馆 |
| `bgebase_768` | bge-base-zh-v1.5 | 768 | 55 MB | 中文优先 | ~80ms | ~280 MB | 最高精度中文语义 |

### 运行环境推荐

| 环境 | 推荐模型 | 原因 |
|------|----------|------|
| 本地开发 | `bgebase_768` 或 `e5small_384` | 资源充足，追求最佳精度 |
| 线上 ECS (1GB) | `tfidf_256` 或 `bgesmall_512` | 内存受限，需留空间给 monolith |
| 线上 ECS (升级后) | `bgesmall_512` 或 `e5small_384` | 平衡精度与性能 |

---

## 技术方案

### 运行时：transformers.js (ONNX Runtime)

使用 `@xenova/transformers` 在 Node.js 中运行 ONNX 量化模型，无需 Python：

```
依赖：@xenova/transformers@2.17.2
模型格式：ONNX INT8 量化（比原始 PyTorch 小 4 倍）
推理引擎：ONNX Runtime（CPU，利用 WASM SIMD 加速）
模型存储：首次使用时自动下载到本地缓存目录
```

### 架构设计

```
┌─────────────────────────────────────────────────┐
│                  KbEmbeddingService              │
│                    (后端 Kotlin)                  │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │        EmbeddingProvider (接口)           │   │
│  │  - embed(text): FloatArray               │   │
│  │  - modelName: String                     │   │
│  │  - dimension: Int                        │   │
│  │  - isReady: Boolean                      │   │
│  └──────────────────────────────────────────┘   │
│                    ↑ implements                  │
│  ┌──────┬──────┬──────┬──────┬──────┬────────┐  │
│  │TF-IDF│TF-IDF│MiniLM│ E5   │BGE   │BGE     │  │
│  │ 256  │ 512  │ 384  │Small │Small │Base    │  │
│  │      │      │      │ 384  │ 512  │ 768    │  │
│  └──────┴──────┴──────┴──────┴──────┴────────┘  │
│                                                  │
│  HTTP 调用 → 前端 Node.js /zvec/embed           │
│  (TF-IDF 在 Kotlin 本地计算，无需 Node.js)       │
└─────────────────────────────────────────────────┘
                    ↓ HTTP
┌─────────────────────────────────────────────────┐
│              前端 Node.js (端口 3000)             │
│                                                   │
│  /zvec/embed     → 调用 transformers.js 嵌入     │
│  /zvec/search    → Zvec 向量搜索                  │
│  /zvec/insert    → 批量插入                       │
│  /zvec/status    → 服务状态                       │
│                                                   │
│  transformers.js (ONNX Runtime)                  │
│  ├─ pipeline('feature-extraction', model)        │
│  └─ 模型缓存：~/.cache/xenova/                   │
│                                                   │
│  Zvec 嵌入式向量数据库                            │
│  ├─ Collection: library_chunks                   │
│  ├─ Collection: bible_verses                     │
│  └─ Collection: bible_chapters                   │
└─────────────────────────────────────────────────┘
```

### 关键决策：嵌入计算放在前端 Node.js

**原因**：
- transformers.js 是 Node.js 库，无法在 Kotlin/JVM 中直接调用
- 前端 Node.js 进程已有 Zvec（向量数据库），嵌入→插入→搜索全在同一个进程，避免网络传输向量
- 后端通过 HTTP 调用前端的 `/zvec/embed` 端点获取嵌入向量
- TF-IDF 哈希不需要模型，直接在 Kotlin 中计算，不经过 Node.js

**数据流**：
```
索引构建：
  后端读取文本 → 分块
    ├─ TF-IDF: 后端本地计算向量 → HTTP 发送给前端 Zvec 插入
    └─ 语义模型: 后端发送文本 → 前端 /zvec/embed → transformers.js 嵌入 → Zvec 插入

查询搜索：
  后端接收查询
    ├─ TF-IDF: 后端本地计算查询向量 → 前端 Zvec 搜索
    └─ 语义模型: 后端发送查询文本 → 前端 /zvec/embed → Zvec 搜索
```

---

## 后端实现

### EmbeddingProvider 接口

```kotlin
package com.bible.monolith.kb.embedding

/**
 * 嵌入模型提供者接口
 * 所有嵌入模型实现此接口，支持运行时切换
 */
interface EmbeddingProvider {
    /** 模型唯一标识 */
    val modelId: String
    
    /** 向量维度 */
    val dimension: Int
    
    /** 模型显示名 */
    val displayName: String
    
    /** 是否需要外部服务（Node.js） */
    val requiresNodeService: Boolean
    
    /** 是否已就绪 */
    fun isReady(): Boolean
    
    /** 嵌入单个文本 */
    fun embed(text: String): FloatArray
    
    /** 批量嵌入 */
    fun embedBatch(texts: List<String>): List<FloatArray>
}
```

### TF-IDF 实现（Kotlin 本地计算）

```kotlin
@Component
class TfidfHashEmbedding(
    @Value("\${kb.embedding.tfidf.dim:256}") private val dim: Int
) : EmbeddingProvider {
    
    override val modelId = "tfidf_${dim}"
    override val dimension = dim
    override val displayName = "TF-IDF Hash ${dim}d"
    override val requiresNodeService = false
    
    private val synonyms = mapOf(
        "祷告" to listOf("祈求", "呼求", "恳求", "代求"),
        "爱" to listOf("agape", "圣爱", "慈爱", "仁爱"),
        "信" to listOf("信心", "相信", "信靠", "信任"),
        "称义" to listOf("义", "算为义", "归算为义"),
        "挽回祭" to listOf("propitiation", "赎罪", "挽回"),
        "团契" to listOf("koinonia", "相交", "交通"),
        "救恩" to listOf("拯救", "救赎", "salvation"),
        "罪" to listOf("sin", "过犯", "罪孽", "悖逆"),
        "恩典" to listOf("grace", "恩惠", "恩宠"),
        "圣灵" to listOf("神的灵", "真理的灵", "保惠师")
    )
    
    override fun isReady() = true
    
    override fun embed(text: String): FloatArray {
        val expanded = expandQuery(text)
        val tokens = tokenize(expanded)
        val vec = FloatArray(dim)
        
        for (token in tokens) {
            val hash = token.hashCode().and(0x7FFFFFFF)
            val idx = hash % dim
            val sign = if ((hash / dim) % 2 == 0) 1f else -1f
            // TF-IDF 权重：bigram 权重 > unigram 权重
            val weight = if (token.length > 1) 2.0f else 1.0f
            vec[idx] += sign * weight
        }
        
        // L2 归一化
        val norm = sqrt(vec.map { it * it }.sum())
        if (norm > 0) for (i in vec.indices) vec[i] /= norm
        
        return vec
    }
    
    override fun embedBatch(texts: List<String>) = texts.map { embed(it) }
    
    private fun tokenize(text: String): List<String> {
        val tokens = mutableListOf<String>()
        // 英文按空格分词
        tokens.addAll(text.split(Regex("\\s+")).filter { it.isNotBlank() })
        // 中文 bigram
        val chineseChars = text.filter { it.code in 0x4E00..0x9FFF }
        for (i in 0 until chineseChars.length - 1) {
            tokens.add(chineseChars.substring(i, i + 2))
        }
        return tokens
    }
    
    private fun expandQuery(query: String): String {
        var expanded = query
        synonyms.forEach { (key, syns) ->
            if (query.contains(key)) {
                expanded += " " + syns.joinToString(" ")
            }
        }
        return expanded
    }
}
```

### 语义模型实现（HTTP 调用前端 Node.js）

```kotlin
@Component
class RemoteSemanticEmbedding(
    @Value("\${kb.embedding.model-id:bgebase_768}") private val modelId: String,
    @Value("\${kb.embedding.dimension:768}") private val dim: Int,
    @Value("\${kb.node-service.url:http://localhost:3000}") private val nodeUrl: String
) : EmbeddingProvider {
    
    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(120, TimeUnit.SECONDS)  // 模型首次加载较慢
        .build()
    private val objectMapper = ObjectMapper()
    
    override val dimension = dim
    override val displayName = modelId
    override val requiresNodeService = true
    
    override fun isReady(): Boolean {
        return try {
            val resp = httpGet("$nodeUrl/zvec/status")
            val node = objectMapper.readTree(resp)
            node.get("embeddingReady")?.asBoolean() ?: false
        } catch (e: Exception) {
            false
        }
    }
    
    override fun embed(text: String): FloatArray {
        return embedBatch(listOf(text))[0]
    }
    
    override fun embedBatch(texts: List<String>): List<FloatArray> {
        val reqBody = objectMapper.writeValueAsString(mapOf(
            "texts" to texts,
            "model" to modelId
        ))
        val request = Request.Builder()
            .url("$nodeUrl/zvec/embed")
            .post(reqBody.toRequestBody("application/json".toMediaType()))
            .build()
        
        httpClient.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                throw RuntimeException("Embedding failed: ${response.code}")
            }
            val body = response.body!!.string()
            val node = objectMapper.readTree(body)
            val embeddings = node.get("embeddings")
            return embeddings.map { arr ->
                FloatArray(dim) { i -> arr[i].asDouble().toFloat() }
            }
        }
    }
    
    private fun httpGet(url: String): String {
        val request = Request.Builder().url(url).get().build()
        httpClient.newCall(request).execute().use { resp ->
            return if (resp.isSuccessful) resp.body!!.string() else ""
        }
    }
}
```

### 嵌入服务路由器

```kotlin
@Service
class KbEmbeddingService(
    private val tfidf256: TfidfHashEmbedding,
    private val tfidf512: TfidfHashEmbedding,
    private val remoteSemantic: RemoteSemanticEmbedding,
    private val configRepo: KbIndexConfigRepository
) {
    
    private var currentProvider: EmbeddingProvider? = null
    
    /**
     * 获取当前嵌入提供者（懒加载，根据配置选择）
     */
    fun getProvider(): EmbeddingProvider {
        if (currentProvider != null) return currentProvider!!
        
        val modelId = configRepo.findByKey("embedding_model")?.configValue
            ?: "tfidf_256"  // 默认
        
        currentProvider = createProvider(modelId)
        return currentProvider!!
    }
    
    /**
     * 切换嵌入模型（触发全量重建）
     */
    fun switchModel(modelId: String): SwitchResult {
        val oldProvider = currentProvider
        val newProvider = createProvider(modelId)
        
        if (oldProvider != null && oldProvider.dimension != newProvider.dimension) {
            // 维度不同，需要全量重建
            return SwitchResult(
                success = false,
                requiresRebuild = true,
                message = "维度从 ${oldProvider.dimension} 变为 ${newProvider.dimension}，需要全量重建索引",
                oldModel = oldProvider.modelId,
                newModel = modelId
            )
        }
        
        // 更新配置
        configRepo.save(KbIndexConfig(
            configKey = "embedding_model",
            configValue = modelId
        ))
        configRepo.save(KbIndexConfig(
            configKey = "embedding_dim",
            configValue = newProvider.dimension.toString()
        ))
        
        currentProvider = newProvider
        return SwitchResult(success = true, requiresRebuild = false, message = "已切换到 $modelId")
    }
    
    /**
     * 列出所有可用模型
     */
    fun listModels(): List<ModelInfo> {
        return listOf(
            ModelInfo("tfidf_256", "TF-IDF Hash 256d", 256, 0, "本地", true, "基线，零依赖"),
            ModelInfo("tfidf_512", "TF-IDF Hash 512d", 512, 0, "本地", true, "TF-IDF 高维度"),
            ModelInfo("minilm_384", "all-MiniLM-L6-v2", 384, 23, "英文", false, "英文语义，速度快"),
            ModelInfo("e5small_384", "multilingual-e5-small", 384, 47, "多语言", false, "中英文混合"),
            ModelInfo("bgesmall_512", "bge-small-zh-v1.5", 512, 24, "中文优先", false, "中文语义，轻量"),
            ModelInfo("bgebase_768", "bge-base-zh-v1.5", 768, 55, "中文优先", false, "最高精度中文")
        )
    }
    
    private fun createProvider(modelId: String): EmbeddingProvider {
        return when (modelId) {
            "tfidf_256" -> tfidf256
            "tfidf_512" -> tfidf512
            "minilm_384", "e5small_384", "bgesmall_512", "bgebase_768" -> {
                val dim = listModels().find { it.id == modelId }!!.dimension
                RemoteSemanticEmbedding(modelId, dim, nodeUrl)
            }
            else -> throw IllegalArgumentException("未知嵌入模型: $modelId")
        }
    }
}
```

### 模型切换 API

```
GET    /api/v1/kb/embedding/models         — 列出所有可用模型
GET    /api/v1/kb/embedding/current        — 当前使用的模型
POST   /api/v1/kb/embedding/switch         — 切换模型
POST   /api/v1/kb/index/rebuild            — 全量重建索引
```

```json
// GET /api/v1/kb/embedding/models
{
  "models": [
    {
      "id": "tfidf_256",
      "name": "TF-IDF Hash 256d",
      "dimension": 256,
      "sizeMB": 0,
      "language": "通用",
      "local": true,
      "description": "基线，零依赖",
      "ready": true
    },
    {
      "id": "bgebase_768",
      "name": "bge-base-zh-v1.5",
      "dimension": 768,
      "sizeMB": 55,
      "language": "中文优先",
      "local": false,
      "description": "最高精度中文语义",
      "ready": false,
      "downloadRequired": true
    }
  ],
  "current": "tfidf_256"
}

// POST /api/v1/kb/embedding/switch
// Request
{ "modelId": "bgebase_768" }
// Response（维度不同，需要重建）
{
  "success": false,
  "requiresRebuild": true,
  "message": "维度从 256 变为 768，需要全量重建索引",
  "oldModel": "tfidf_256",
  "newModel": "bgebase_768"
}
// Response（维度相同，直接切换）
{
  "success": true,
  "requiresRebuild": false,
  "message": "已切换到 tfidf_512"
}
```

---

## 前端 Node.js 实现

### 安装依赖

```bash
cd frontend
npm install @xenova/transformers
# 或使用 @huggingface/transformers (v4.x，更新但更大)
```

### 嵌入服务路由

```javascript
// frontend/zvec-bridge.js

const { pipeline } = require('@xenova/transformers');
const path = require('path');
const os = require('os');

// 模型配置表
const MODEL_CONFIG = {
  minilm_384:    { name: 'Xenova/all-MiniLM-L6-v2',      dim: 384, type: 'feature-extraction' },
  e5small_384:   { name: 'Xenova/multilingual-e5-small', dim: 384, type: 'feature-extraction' },
  bgesmall_512:  { name: 'Xenova/bge-small-zh-v1.5',     dim: 512, type: 'feature-extraction' },
  bgebase_768:   { name: 'Xenova/bge-base-zh-v1.5',      dim: 768, type: 'feature-extraction' },
};

// 模型缓存（已加载的 pipeline 不重复加载）
const modelCache = new Map();
let currentModel = null;

async function getEmbedder(modelId) {
  if (modelCache.has(modelId)) return modelCache.get(modelId);
  
  const config = MODEL_CONFIG[modelId];
  if (!config) throw new Error(`未知模型: ${modelId}`);
  
  console.log(`加载嵌入模型: ${config.name} (${modelId})...`);
  const embedder = await pipeline(config.type, config.name, {
    quantized: true,  // INT8 量化，体积更小
    cache_dir: path.join(os.homedir(), '.cache', 'xenova'),
  });
  
  modelCache.set(modelId, embedder);
  console.log(`模型 ${config.name} 加载完成`);
  return embedder;
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
  // 嵌入
  app.post('/zvec/embed', async (req, res) => {
    try {
      const { texts, model } = req.body;
      const result = await embed(texts, model || currentModel);
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  
  // 服务状态
  app.get('/zvec/status', (req, res) => {
    res.json({
      zvecReady: !!zvecDb,
      embeddingReady: currentModel !== null,
      currentModel,
      availableModels: Object.keys(MODEL_CONFIG),
      loadedModels: Array.from(modelCache.keys()),
    });
  });
  
  // 预加载模型（避免首次查询时延迟）
  app.post('/zvec/preload', async (req, res) => {
    try {
      const { model } = req.body;
      await getEmbedder(model);
      currentModel = model;
      res.json({ success: true, model });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
}
```

---

## 模型对比测试方案

### 测试数据集（100 条标准查询）

```
分类构成：
- 30 条中文主题查考（"因信称义"、"神的主权"、"安息日的意义"）
- 20 条英文主题查考（"justification by faith"、"God's sovereignty"）
- 20 条圣经引用查找（"约3:16"、"罗马书8:28"）
- 15 条模糊语义查询（"耶稣关于钱财的教导"、"保罗如何论述恩典"）
- 15 条跨译本查询（中文搜→命中英文经文，反向亦然）
```

### 评估指标

| 指标 | 说明 |
|------|------|
| Recall@5 | 前 5 条结果中包含正确答案的比例 |
| Recall@10 | 前 10 条结果中包含正确答案的比例 |
| MRR | 平均倒数排名（正确答案的平均排名倒数） |
| 查询延迟 | 从发送查询到返回结果的毫秒数 |
| 首次加载时间 | 模型加载 + 索引构建时间 |

### 测试脚本

```
POST /api/v1/kb/eval/run
{
  "modelId": "bgebase_768",
  "testSet": "standard_100",
  "topK": 10
}

// Response
{
  "modelId": "bgebase_768",
  "totalQueries": 100,
  "recall@5": 0.82,
  "recall@10": 0.91,
  "mrr": 0.68,
  "avgLatencyMs": 85,
  "totalTimeMs": 8500
}
```

### 对比结果展示

前端管理页面 `plugins.html` 中的知识库管理 Tab：

```
┌─────────────────────────────────────────────────────────────┐
│  知识库管理                                                  │
├─────────────────────────────────────────────────────────────┤
│  当前模型: [TF-IDF Hash 256d ▼]  [切换模型] [全量重建]     │
│                                                              │
│  可选模型:                                                   │
│  ○ TF-IDF Hash 256d    256d  0MB   本地    ✅ 就绪         │
│  ○ TF-IDF Hash 512d    512d  0MB   本地    ✅ 就绪         │
│  ○ all-MiniLM-L6-v2    384d  23MB  英文    ⬇ 需下载        │
│  ○ multilingual-e5-small 384d 47MB 多语言  ⬇ 需下载        │
│  ○ bge-small-zh-v1.5   512d  24MB  中文    ⬇ 需下载        │
│  ○ bge-base-zh-v1.5    768d  55MB  中文    ⬇ 需下载        │
│                                                              │
│  索引状态:                                                   │
│  - 图书馆: 946 章已索引                                      │
│  - 圣经(cuv_gb): 1,189 章已索引                              │
│  - 向量总数: 11,935                                          │
│  - 索引大小: 12.3 MB                                         │
│                                                              │
│  模型对比测试:                                               │
│  [运行测试]                                                  │
│  ┌────────────────┬────────┬────────┬───────┬──────────┐    │
│  │ 模型           │Recall@5│Recall@10│ MRR  │ 延迟(ms) │    │
│  ├────────────────┼────────┼────────┼───────┼──────────┤    │
│  │ tfidf_256      │ 0.45   │ 0.62   │ 0.31 │ 2        │    │
│  │ tfidf_512      │ 0.48   │ 0.65   │ 0.34 │ 2        │    │
│  │ bgesmall_512   │ 0.78   │ 0.89   │ 0.62 │ 35       │    │
│  │ bgebase_768    │ 0.82   │ 0.91   │ 0.68 │ 80       │    │
│  └────────────────┴────────┴────────┴───────┴──────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 配置文件

```yaml
# application.yml
kb:
  embedding:
    # 默认嵌入模型
    default-model: tfidf_256
    # TF-IDF 维度
    tfidf:
      dim: 256
    # 远程语义模型配置
    node-service:
      url: http://localhost:3000
    # 模型缓存目录（Node.js 端）
    model-cache: ${user.home}/.cache/xenova
  zvec:
    # Zvec 数据库路径
    db-path: ./data/zvec-index
    # 批量插入大小
    batch-size: 500
    # HNSW 参数
    index:
      m: 16
      ef-construction: 200
      ef-search: 50
  index:
    # 增量索引时是否自动失效缓存
    auto-invalidate-cache: true
    # 内容一致性校验间隔（小时）
    consistency-check-interval: 24
```

---

## 实施步骤

1. **后端**：实现 EmbeddingProvider 接口 + TfidfHashEmbedding + RemoteSemanticEmbedding + KbEmbeddingService
2. **前端 Node.js**：安装 @xenova/transformers + 实现 /zvec/embed /zvec/status /zvec/preload 路由
3. **API**：实现模型列表/切换/重建端点
4. **测试**：构建 100 条标准查询 + 评估脚本
5. **前端管理页面**：模型选择 + 对比结果展示
6. **文档**：更新 KB-DESIGN-V2.md
