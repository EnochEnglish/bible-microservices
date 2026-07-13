# 知识库技术文档（最终版）

## 1. 系统架构

```
┌──────────────────────────────────────────────────────────────────┐
│                    后端 bible-monolith (Kotlin, 8080)             │
│                                                                    │
│  KbSearchService                                                   │
│    ├─ KbEmbeddingService (路由器)                                  │
│    │    ├─ TfidfHashEmbedding (Kotlin 本地, 256d)                 │
│    │    └─ RemoteSemanticEmbedding (HTTP → Node.js)               │
│    │         ├─ bgesmall_512 (512d)                               │
│    │         └─ bgebase_768 (768d)                                │
│    │                                                              │
│    ├─ BibleSearchService (Lucene BM25 关键词搜索)                  │
│    │                                                              │
│    ├─ KbIndexService (索引构建/增量/删除)                          │
│    │    ├─ LibraryIndexer (library-data/ JSON)                    │
│    │    ├─ BibleIndexer (H2 verses 表)                            │
│    │    ├─ CommentaryIndexer (JSword SwordCommentaryService)      │
│    │    ├─ DictionaryIndexer (JSword DictionaryService)           │
│    │    ├─ DevotionIndexer (JSword GenBook API)                   │
│    │    ├─ GenBookIndexer (JSword GenBook API)                    │
│    │    └─ CourseIndexer (H2 Course/Lesson 表)                    │
│    │                                                              │
│    ├─ KbQueryCache (LRU + H2 持久化)                              │
│    └─ BibleRefParser (引用精确查找)                                │
│                                                                    │
│  HTTP 通信                                                         │
│    ├─ GET  /zvec/embed    → 前端嵌入                               │
│    ├─ POST /zvec/search   → 前端 Zvec 搜索                        │
│    └─ POST /zvec/insert   → 前端 Zvec 插入                        │
└──────────────────────────────────────────────────────────────────┘
                              ↓ HTTP
┌──────────────────────────────────────────────────────────────────┐
│                  前端 Node.js (3000)                               │
│                                                                    │
│  transformers.js (@xenova/transformers)                           │
│    ├─ bgesmall_512: Xenova/bge-small-zh-v1.5 (ONNX INT8, 24MB)   │
│    └─ bgebase_768: Xenova/bge-base-zh-v1.5  (ONNX INT8, 55MB)   │
│                                                                    │
│  Zvec 嵌入式向量数据库                                             │
│    ├─ tfidf_256_library       (256d)                              │
│    ├─ tfidf_256_bible         (256d)                              │
│    ├─ tfidf_256_commentary    (256d)                              │
│    ├─ tfidf_256_dictionary    (256d)                              │
│    ├─ tfidf_256_devotion      (256d)                              │
│    ├─ tfidf_256_genbook       (256d)                              │
│    ├─ tfidf_256_course        (256d)                              │
│    ├─ bgesmall_512_library    (512d)                              │
│    ├─ bgesmall_512_bible      (512d)                              │
│    ├─ bgesmall_512_commentary (512d)                              │
│    ├─ bgesmall_512_dictionary (512d)                              │
│    ├─ bgesmall_512_devotion   (512d)                              │
│    ├─ bgesmall_512_genbook    (512d)                              │
│    ├─ bgesmall_512_course     (512d)                              │
│    ├─ bgebase_768_library     (768d)                              │
│    ├─ bgebase_768_bible       (768d)                              │
│    ├─ bgebase_768_commentary  (768d)                              │
│    ├─ bgebase_768_dictionary  (768d)                              │
│    ├─ bgebase_768_devotion    (768d)                              │
│    ├─ bgebase_768_genbook     (768d)                              │
│    └─ bgebase_768_course      (768d)                              │
│                                                                    │
│  Express 路由                                                      │
│    ├─ POST /zvec/embed       → transformers.js 嵌入               │
│    ├─ POST /zvec/search      → Zvec 向量搜索                      │
│    ├─ POST /zvec/insert      → Zvec 批量插入                      │
│    ├─ DELETE /zvec/delete    → Zvec 按元数据删除                  │
│    ├─ POST /zvec/compact     → Zvec 压缩                          │
│    ├─ GET  /zvec/status      → 服务状态                           │
│    └─ POST /zvec/preload     → 预加载模型                         │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Zvec Collection 设计

### 2.1 Collection 命名规则

```
{modelId}_{sourceType}
```

### 2.2 各来源的元数据 Schema

#### bible（圣经经文）
```json
{
  "id": "bible_cuv_gb_LUK_15_11_32",
  "metadata": {
    "source_type": "bible",
    "translation": "cuv_gb",
    "book": "LUK",
    "book_name": "路加福音",
    "chapter": 15,
    "verse_start": 11,
    "verse_end": 32,
    "display_ref": "路加福音 15:11-32",
    "language": "zh"
  }
}
```

#### bible_chapter（圣经篇章）
```json
{
  "id": "bible_chapter_cuv_gb_PSA_023",
  "metadata": {
    "source_type": "bible_chapter",
    "translation": "cuv_gb",
    "book": "PSA",
    "book_name": "诗篇",
    "chapter": 23,
    "display_ref": "诗篇 23篇",
    "language": "zh"
  }
}
```

#### commentary（注释书）
```json
{
  "id": "cmt_JFB_GEN_1_1_chunk0",
  "metadata": {
    "source_type": "commentary",
    "module": "JFB",
    "module_name": "Jamieson Fausset Brown",
    "book": "GEN",
    "chapter": 1,
    "verse_ref": "1:1",
    "display_ref": "创世记 1:1 — JFB注释",
    "author": "Robert Jamieson",
    "language": "en",
    "chunk_index": 0
  }
}
```

#### dictionary（词典）
```json
{
  "id": "dict_Easton_Love",
  "metadata": {
    "source_type": "dictionary",
    "module": "Easton",
    "module_name": "Easton's Bible Dictionary",
    "entry_key": "Love",
    "language": "en"
  }
}
```

#### devotion（灵修）
```json
{
  "id": "dev_SME_0713",
  "metadata": {
    "source_type": "devotion",
    "module": "SME",
    "module_name": "Spurgeon's Morning and Evening",
    "date_key": "07.13",
    "title": "July 13 — Morning",
    "language": "en"
  }
}
```

#### genbook（通用书）
```json
{
  "id": "gb_Pilgrim_chunk0",
  "metadata": {
    "source_type": "genbook",
    "module": "Pilgrim",
    "module_name": "The Pilgrim's Progress",
    "chapter_key": "CONTENTS",
    "title": "The Pilgrim's Progress",
    "author": "John Bunyan",
    "language": "en",
    "chunk_index": 0
  }
}
```

#### course（课程）
```json
{
  "id": "course_12_71",
  "metadata": {
    "source_type": "course",
    "course_id": 12,
    "lesson_id": 71,
    "title": "新生活与祷告",
    "language": "zh"
  }
}
```

#### library（图书馆）
```json
{
  "id": "lib_aizhiyu_003_chunk0",
  "metadata": {
    "source_type": "library",
    "book_code": "aizhiyu",
    "chapter_id": "003",
    "title": "第三章 爱的含义",
    "category": "灵修",
    "language": "zh",
    "chunk_index": 0,
    "parent_ref": "aizhiyu/003"
  }
}
```

---

## 3. H2 数据库 Schema

```sql
-- 知识库文档表（统一存储所有来源的分块）
CREATE TABLE kb_document (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  source_type   VARCHAR(20) NOT NULL,      -- bible | bible_chapter | commentary | dictionary | devotion | genbook | course | library
  source_ref    VARCHAR(300) NOT NULL,      -- 唯一引用路径
  title         VARCHAR(500) NOT NULL,
  content       TEXT NOT NULL,              -- 原始文本
  content_hash  VARCHAR(64) NOT NULL,       -- 内容哈希（增量更新检测）
  
  -- 分块信息
  chunk_index   INT DEFAULT 0,
  chunk_text    TEXT,                       -- 分块文本（用于嵌入）
  parent_ref    VARCHAR(300),               -- 父文档引用
  
  -- 圣经元数据
  translation   VARCHAR(20),
  book          VARCHAR(10),
  book_name     VARCHAR(50),
  chapter       INT,
  verse_start   INT,
  verse_end     INT,
  display_ref   VARCHAR(100),
  
  -- 注释书元数据
  module        VARCHAR(50),                -- SWORD 模块缩写
  module_name   VARCHAR(200),
  author        VARCHAR(100),
  verse_ref     VARCHAR(20),
  
  -- 词典元数据
  entry_key     VARCHAR(200),
  
  -- 灵修元数据
  date_key      VARCHAR(10),
  
  -- 通用元数据
  book_code     VARCHAR(50),
  category      VARCHAR(50),
  language      VARCHAR(10) DEFAULT 'zh',
  
  -- 向量索引信息（三个模型各一组）
  vec_id_tfidf       VARCHAR(100),
  vec_id_bgesmall    VARCHAR(100),
  vec_id_bgebase     VARCHAR(100),
  
  -- 状态
  is_indexed_tfidf    BOOLEAN DEFAULT FALSE,
  is_indexed_bgesmall BOOLEAN DEFAULT FALSE,
  is_indexed_bgebase  BOOLEAN DEFAULT FALSE,
  
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT uq_kb_doc UNIQUE (source_type, source_ref, chunk_index)
);

-- 索引
CREATE INDEX idx_kb_source_type ON kb_document(source_type);
CREATE INDEX idx_kb_module ON kb_document(module);
CREATE INDEX idx_kb_book ON kb_document(book);
CREATE INDEX idx_kb_category ON kb_document(category);
CREATE INDEX idx_kb_content_hash ON kb_document(content_hash);

-- 索引配置
CREATE TABLE kb_index_config (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  config_key      VARCHAR(50) UNIQUE NOT NULL,
  config_value    VARCHAR(500),
  description     VARCHAR(200)
);

-- 查询缓存
CREATE TABLE kb_query_cache (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  query_hash      VARCHAR(64) UNIQUE NOT NULL,
  query_text      VARCHAR(500) NOT NULL,
  model_id        VARCHAR(30) NOT NULL,
  filter_json     VARCHAR(500),
  results_json    TEXT NOT NULL,
  hit_count       INT DEFAULT 0,
  created_at      TIMESTAMP DEFAULT NOW(),
  last_accessed   TIMESTAMP DEFAULT NOW()
);
```

---

## 4. 数据量估算

### 4.1 文档块数量

| 数据源 | 块数量估算 | 说明 |
|--------|-----------|------|
| 圣经（cuv_gb，经文级） | ~10,000 | 31,000节 ÷ 3-5节/块 |
| 圣经（cuv_gb，篇章级） | 1,189 | 1,189 章 |
| 注释书（34源） | ~40,000 | ~1.3GB ÷ 300-500字/块 |
| 词典（35模块） | ~50,000 | ~50,000词条 |
| 灵修（3源） | 1,098 | 366天 × 3 |
| 通用书（31模块） | ~2,000 | ~500章 ÷ 段落分块 |
| 课程 | 42 | 42课 |
| 图书馆 | ~5,000 | 940万字 ÷ 300-500字/块 |
| **合计** | **~109,338** | |

### 4.2 向量存储

| 模型 | 维度 | 块数 | 向量大小 | 索引大小 | 合计 |
|------|------|------|----------|----------|------|
| tfidf_256 | 256 | 109K | 112 MB | 112 MB | 224 MB |
| bgesmall_512 | 512 | 109K | 224 MB | 224 MB | 448 MB |
| bgebase_768 | 768 | 109K | 336 MB | 336 MB | 672 MB |
| **合计** | | | | | **~1.3 GB** |

### 4.3 构建时间估算

| 模型 | 109K 块 | 耗时 |
|------|---------|------|
| tfidf_256 | ~1ms/块 | ~2 分钟 |
| bgesmall_512 | ~35ms/块 | ~64 分钟 |
| bgebase_768 | ~80ms/块 | ~145 分钟 |
| **总计** | | **~3.5 小时**（串行） |

并行优化：Node.js worker_threads × 3 并行嵌入 → ~1.5 小时

分批策略：先索引图书馆+圣经+灵修+课程（~16K 块，~20 分钟），再索引注释书+词典（~93K 块）

---

## 5. 混合搜索流程

```
用户查询 "因信称义"
    │
    ├──→ 1. 缓存检查（key 含 modelId + filters）
    │      ├─ 命中 → 返回
    │      └─ 未命中 ↓
    │
    ├──→ 2. 引用检测
    │      ├─ 匹配"约3:16"格式 → 元数据精确查找 → 返回
    │      └─ 不匹配 ↓
    │
    ├──→ 3. 查询预处理
    │      ├─ 同义词扩展（"因信称义" → + "算为义" "归算为义" "justification"）
    │      └─ 关键词提取 → Lucene 查询
    │
    ├──→ 4. 三通道并行搜索
    │      ├─ A: Zvec 向量搜索（指定 modelId 的 Collection）→ top 30
    │      ├─ B: Lucene 关键词搜索 → top 30
    │      └─ C: 元数据精确查找（可选，查询含书卷名时）
    │
    ├──→ 5. 加权融合
    │      score = 0.5 × 向量分数 + 0.3 × 关键词分数 + 0.2 × 元数据匹配
    │
    ├──→ 6. 去重（同一文档被多个通道命中时取最高分）
    │
    ├──→ 7. 元数据过滤（sourceType / category / book / translation / module）
    │
    ├──→ 8. 返回 top 10 + 写入缓存
    │
    └──→ 前端渲染：
         - 高亮匹配关键词
         - 展示精确引用
         - 来源类型图标（📖 圣经 / 📝 注释 / 📚 词典 / 🌅 灵修 / 📘 通用书 / 🎓 课程）
```

---

## 6. 增量索引

```kotlin
// 新增 SWORD 模块时，同时写入三个模型索引
fun indexSwordModule(moduleId: String, moduleType: String) {
    val chunks = when (moduleType) {
        "COMMENTARY" -> loadCommentaryChunks(moduleId)    // JSword SwordCommentaryService
        "DICTIONARY" -> loadDictionaryChunks(moduleId)     // JSword DictionaryService
        "DAILY_DEVOTIONS" -> loadDevotionChunks(moduleId)  // JSword GenBook API
        "GENERAL_BOOK" -> loadGenBookChunks(moduleId)      // JSword GenBook API
        else -> return
    }
    
    // H2 写入
    kbDocumentRepository.saveAll(chunks.map { it.toEntity() })
    
    // 三个模型并行写入 Zvec
    for (modelId in listOf("tfidf_256", "bgesmall_512", "bgebase_768")) {
        val collection = "${modelId}_${moduleType.lowercase()}"
        val vectors = embeddingService.embedBatch(chunks.map { it.text }, modelId)
        zvecBridge.batchInsert(collection, chunks, vectors)
        zvecBridge.flush(collection)
    }
    
    // 清除缓存
    queryCache.invalidate()
}
```

---

## 7. 前端 Node.js 实现

### 7.1 依赖

```json
{
  "@xenova/transformers": "^2.17.2"
}
```

### 7.2 模型加载

```javascript
const MODEL_CONFIG = {
  bgesmall_512: { name: 'Xenova/bge-small-zh-v1.5', dim: 512 },
  bgebase_768:  { name: 'Xenova/bge-base-zh-v1.5',  dim: 768 }
};

const modelCache = new Map();

async function getEmbedder(modelId) {
  if (modelCache.has(modelId)) return modelCache.get(modelId);
  const config = MODEL_CONFIG[modelId];
  const embedder = await pipeline('feature-extraction', config.name, {
    quantized: true,
    cache_dir: path.join(os.homedir(), '.cache', 'xenova'),
  });
  modelCache.set(modelId, embedder);
  return embedder;
}
```

### 7.3 环境模式

```javascript
const KB_MODE = process.env.KB_MODE || 'full';

async function preloadModels() {
  if (KB_MODE === 'full') {
    await getEmbedder('bgesmall_512');
    await getEmbedder('bgebase_768');
  } else if (KB_MODE === 'lite') {
    await getEmbedder('bgesmall_512');
  }
  // tfidf-only: 不加载模型
}
```

---

## 8. 配置

```yaml
# application.yml
kb:
  enabled: true
  embedding:
    models:
      - { id: tfidf_256, dimension: 256, local: true }
      - { id: bgesmall_512, dimension: 512, local: false }
      - { id: bgebase_768, dimension: 768, local: false }
    default-model: tfidf_256
    node-service-url: http://localhost:3000
    tfidf:
      dim: 256
  zvec:
    db-path: ./data/zvec-index
    batch-size: 500
  index:
    auto-invalidate-cache: true
    consistency-check-interval: 24
  sources:
    bible:
      enabled: true
      translations: [cuv_gb, KJV, BSB]
    commentary:
      enabled: true
      modules: all  # 或指定列表 [JFB, MHC, Clarke, ...]
    dictionary:
      enabled: true
      modules: all  # 或指定列表 [Easton, ISBE, Nave, ...]
    devotion:
      enabled: true
      modules: [SME, Daily, DBD]
    genbook:
      enabled: true
      modules: all  # 或指定列表 [Pilgrim, Institutes, Imitation, ...]
    course:
      enabled: true
    library:
      enabled: true
```

---

## 9. 文件结构

```
bible-monolith/src/main/kotlin/com/bible/monolith/kb/
├── embedding/
│   ├── EmbeddingProvider.kt          # 接口
│   ├── TfidfHashEmbedding.kt         # TF-IDF 256d
│   └── RemoteSemanticEmbedding.kt    # HTTP → Node.js
├── service/
│   ├── KbEmbeddingService.kt         # 嵌入路由器
│   ├── KbSearchService.kt            # 混合搜索
│   ├── KbIndexService.kt             # 索引构建/增量
│   ├── KbQueryCache.kt               # 查询缓存
│   └── BibleRefParser.kt             # 圣经引用解析
├── indexer/
│   ├── LibraryIndexer.kt             # 图书馆索引器
│   ├── BibleIndexer.kt               # 圣经索引器
│   ├── CommentaryIndexer.kt          # 注释书索引器（JSword）
│   ├── DictionaryIndexer.kt          # 词典索引器（JSword）
│   ├── DevotionIndexer.kt            # 灵修索引器（JSword）
│   ├── GenBookIndexer.kt             # 通用书索引器（JSword）
│   └── CourseIndexer.kt              # 课程索引器
├── controller/
│   └── KbController.kt               # REST API
├── model/
│   ├── KbDocument.kt                 # JPA 实体
│   ├── KbIndexConfig.kt              # 索引配置实体
│   ├── KbQueryCache.kt               # 查询缓存实体
│   └── dto/
│       ├── SearchRequest.kt
│       ├── SearchResponse.kt
│       └── ModelInfo.kt
└── repository/
    ├── KbDocumentRepository.kt
    ├── KbIndexConfigRepository.kt
    └── KbQueryCacheRepository.kt

frontend/
├── zvec-bridge.js                    # Zvec + transformers.js 桥接
├── plugins/knowledge-base/
│   ├── index.html                    # 搜索页面
│   ├── search.js                     # 搜索逻辑
│   └── search.css                    # 样式
└── server.js                         # Express 路由注册
```
