# 知识库优化设计方案 v2 — 采纳圣经专用设计

## 核心设计哲学

> **元数据为骨架、关键词为约束、语义为血肉**

不依赖纯向量搜索，而是三层协作：
1. **元数据层**：书卷/章节/译本/来源 作为精确坐标，支持 `filter` 过滤
2. **关键词层**：Lucene BM25 关键词匹配，确保精确引用不丢失
3. **语义层**：Zvec 向量相似度，捕获主题和概念关联

---

## 数据源与规模

| 数据源 | 文档数 | 总字数 | 用途 |
|--------|--------|--------|------|
| 图书馆 | 95 本 × 946 章 | 940 万字 | 主题搜索、参考阅读 |
| 圣经 | 22 译本 × ~31,000 节 | ~500 万字/译本 | 经文搜索、主题查考 |
| 课程 | 3 门 × 42 课 | 17 万字 | 课程内容搜索 |

---

## 分块策略（三种数据源各自优化）

### 1. 图书馆分块（段落 + 句号边界）

```
原始章节 (平均 9,936 字)
    ↓
按段落 \n\n 切分
    ↓
段落 > 500字? → 按句号 。/？/！切分 → 每块 300-500 字
段落 ≤ 500字? → 整段作为一个块
    ↓
相邻块重叠 50 字
    ↓
每块元数据：
  - source_type: "library"
  - book_code: "aizhiyu"
  - chapter_id: "003"
  - title: "第三章 爱的含义"
  - category: "灵修"
  - language: "zh"
  - chunk_index: 0
  - parent_ref: "aizhiyu/003"  ← 同章所有块共享
```

### 2. 圣经分块（完整段落 + 精确坐标）

**不按固定字数切分**，按圣经原有段落标记分块：

```
方式A：按"段落"分块（Pericope-based）
  - 利用 OSIS XML 的 <div> / <p> 段落标记
  - 每个段落包含 1-20 节经文（自然叙事单元）
  - 例如：浪子回头比喻 = 路15:11-32 作为一块

方式B：按"节组"分块（Verse-group，当无段落标记时）
  - 每 3-5 节为一组（保持叙事完整）
  - 耶稣的比喻、保罗的论证不跨块
  - 单节经文（如约3:16）独立成块

每块元数据（关键！）：
  - source_type: "bible"
  - translation: "cuv_gb"          ← 译本缩写
  - book: "LUK"                    ← 书卷缩写
  - book_name: "路加福音"
  - chapter: 15
  - verse_start: 11                ← 起始节
  - verse_end: 32                  ← 结束节
  - display_ref: "路加福音 15:11-32"  ← 人类可读引用
  - language: "zh"
```

**为什么这样做**：
- 用户搜"浪子回头"→ 命中路15:11-32整块，而不是零碎的单节
- 结果直接展示 `路加福音 15:11-32`，满足学术引用需求
- 避免比喻被切碎导致检索失败

### 3. 课程分块（按课分块）

```
每课作为一个块（平均 4,000 字，不分块）
  - source_type: "course"
  - course_id: 12
  - lesson_id: 71
  - title: "新生活与祷告"
```

---

## 多粒度索引（经文级 + 篇章级）

同时建立两层索引，应对不同查询场景：

### 细粒度（经文级）
```
用途：精准问答、主题查考
  "耶稣平静风浪" → 命中可4:35-41
  "赐新心的应许" → 命中结36:26
粒度：3-5节/块
数量：~10,000块/译本（仅索引主要译本）
```

### 粗粒度（篇章级）
```
用途：宏观主题、概括性查询
  "诗篇23篇讲了什么" → 命中诗23整章
  "罗马书第8章的主题" → 命中罗8整章
粒度：整章/块
数量：1,189块/译本（圣经共1,189章）
```

**搜索策略**：先搜篇章级找范围，再在范围内搜经文级精确定位。

---

## 混合搜索（三层协作）

```
用户查询 "神的爱不同于人的爱"
    │
    ├──→ 缓存检查 ──命中──→ 返回
    │      │未命中
    │      ↓
    ├──→ 解析查询意图：
    │    - 提取关键词："神"、"爱"、"人"
    │    - 生成查询向量
    │    - 检测元数据过滤条件（如"只搜新约"）
    │      ↓
    ├──→ 三通道并行搜索：
    │    ├─ A: Zvec 向量搜索 → top 30（语义相似）
    │    │     适用：找到"agape"与"phileo"的关联
    │    │
    │    ├─ B: Lucene 关键词搜索 → top 30（精确匹配）
    │    │     适用：确保含"爱"字的经文不遗漏
    │    │
    │    └─ C: 元数据精确查找（如果查询含书卷名）
    │          适用：用户搜"约翰福音3:16"直接定位
    │      ↓
    ├──→ 加权融合排序：
    │    score = 0.5 × 向量分数 + 0.3 × 关键词分数 + 0.2 × 元数据匹配
    │      ↓
    ├──→ 去重（同一段落被多个通道命中时取最高分）
    │      ↓
    ├──→ 元数据过滤（sourceType / category / book / translation）
    │      ↓
    ├──→ 返回 top 10 + 写入缓存
    │
    └──→ 前端渲染：
         - 高亮匹配关键词
         - 展示精确引用（路加福音 15:11-32）
         - 来源链接（点击跳转阅读）
```

### 精确引用兜底

用户搜"约翰福音3:16"时，纯向量搜索可能返回一堆关于"爱"和"永生"的经文。解决方案：

```kotlin
// 检测查询是否包含圣经引用格式（如"约3:16"、"John 3:16"、"约翰福音3:16"）
val bibleRefPattern = Regex("""(?:创|出|利|民|申|书|士|得|撒上?|王上?|代上?|拉|尼|斯|伯|诗|箴|传|歌|赛|耶|哀|结|但|何|珥|摩|俄|拿|弥|鸿|哈|番|该|亚|玛|太|可|路|约|徒|罗|林前|林后|加|弗|腓|西|帖前|帖后|提前|提后|多|门|来|雅|彼前|彼后|约一|约二|约三|犹|启|Genesis|Exodus|...\s*\d+:\d+(?:-\d+)?""", RegexOption.IGNORE_CASE)

if (bibleRefPattern.containsMatchIn(query)) {
    // 直接走元数据精确查找，不走向量搜索
    val ref = parseBibleRef(query)  // → { book: "JHN", chapter: 3, verseStart: 16, verseEnd: 16 }
    return bibleExactLookup(ref)
}
```

---

## 元数据 Schema 设计

### Zvec Collection: `library_chunks`

```json
{
  "id": "lib_aizhiyu_003_chunk0",
  "vector": [0.12, -0.34, ...],
  "metadata": {
    "source_type": "library",
    "book_code": "aizhiyu",
    "chapter_id": "003",
    "title": "第三章 爱的含义",
    "category": "灵修",
    "language": "zh",
    "chunk_index": 0,
    "chunk_text": "爱是恒久忍耐，又有恩慈...",
    "parent_ref": "aizhiyu/003"
  }
}
```

### Zvec Collection: `bible_verses`（经文级）

```json
{
  "id": "bible_cuv_gb_LUK_15_11_32",
  "vector": [0.08, -0.21, ...],
  "metadata": {
    "source_type": "bible",
    "translation": "cuv_gb",
    "book": "LUK",
    "book_name": "路加福音",
    "chapter": 15,
    "verse_start": 11,
    "verse_end": 32,
    "display_ref": "路加福音 15:11-32",
    "language": "zh",
    "text": "耶稣又说：一个人有两个儿子..."
  }
}
```

### Zvec Collection: `bible_chapters`（篇章级）

```json
{
  "id": "bible_cuv_gb_PSA_023",
  "vector": [0.15, -0.08, ...],
  "metadata": {
    "source_type": "bible_chapter",
    "translation": "cuv_gb",
    "book": "PSA",
    "book_name": "诗篇",
    "chapter": 23,
    "display_ref": "诗篇 23篇",
    "language": "zh",
    "text": "耶和华是我的牧者，我必不至缺乏..."
  }
}
```

---

## H2 数据库 Schema

```sql
-- 知识库文档（所有来源统一存储）
CREATE TABLE kb_document (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  source_type   VARCHAR(20) NOT NULL,     -- 'library' | 'bible' | 'bible_chapter' | 'course'
  source_ref    VARCHAR(200) NOT NULL,     -- 'library/aizhiyu/003' | 'bible/cuv_gb/LUK/15/11-32'
  title         VARCHAR(500) NOT NULL,
  content       TEXT NOT NULL,             -- 原始文本
  content_hash  VARCHAR(64) NOT NULL,      -- 内容哈希（增量更新）
  
  -- 分块信息
  chunk_index   INT DEFAULT 0,
  chunk_text    TEXT,                      -- 分块文本
  parent_ref    VARCHAR(200),              -- 父文档引用（同章/同段）
  
  -- 圣经专用元数据
  translation   VARCHAR(20),               -- 译本缩写
  book          VARCHAR(10),               -- 书卷缩写
  book_name     VARCHAR(50),               -- 书卷名
  chapter       INT,                       -- 章号
  verse_start   INT,                       -- 起始节
  verse_end     INT,                       -- 结束节
  display_ref   VARCHAR(100),              -- 人类可读引用
  
  -- 通用元数据
  book_code     VARCHAR(50),               -- 图书编码（library 来源）
  category      VARCHAR(50),               -- 分类
  language      VARCHAR(10) DEFAULT 'zh',
  
  -- 向量索引信息
  vector_id     VARCHAR(100),              -- Zvec 向量 ID
  collection    VARCHAR(50),               -- Zvec Collection 名
  
  -- 状态
  is_indexed    BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT uq_kb_doc UNIQUE (source_type, source_ref, chunk_index)
);

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
  filter_json     VARCHAR(500),
  results_json    TEXT NOT NULL,
  hit_count       INT DEFAULT 0,
  created_at      TIMESTAMP DEFAULT NOW(),
  last_accessed   TIMESTAMP DEFAULT NOW()
);
```

---

## API 设计（更新）

### 搜索 API

```
POST /api/v1/kb/search
```

```json
// Request
{
  "query": "神的爱不同于人的爱",
  "topK": 10,
  "filters": {
    "sourceType": "bible",          // 可选：bible | library | course | bible_chapter
    "translation": "cuv_gb",        // 可选：限定译本
    "book": "1JN",                  // 可选：限定书卷
    "category": "灵修",             // 可选：限定分类
    "language": "zh"                // 可选：限定语言
  },
  "mode": "hybrid",                 // 搜索模式：hybrid | vector | keyword | exact
  "threshold": 0.3                  // 最低相似度
}

// Response
{
  "total": 10,
  "query": "神的爱不同于人的爱",
  "mode": "hybrid",
  "tookMs": 23,
  "results": [
    {
      "id": 42,
      "title": "约翰一书 4:7-12",
      "sourceType": "bible",
      "sourceRef": "bible/cuv_gb/1JN/4/7-12",
      "displayRef": "约翰一书 4:7-12",
      "snippet": "亲爱的弟兄啊，我们应当彼此相爱，因为爱是从神来的...",
      "score": 0.892,
      "vectorScore": 0.91,
      "keywordScore": 0.85,
      "highlight": "<em>爱</em>是从<em>神</em>来的。凡有<em>爱</em>心的，都是由<em>神</em>而生...",
      "metadata": {
        "translation": "cuv_gb",
        "book": "1JN",
        "bookName": "约翰一书",
        "chapter": 4,
        "verseStart": 7,
        "verseEnd": 12
      }
    }
  ]
}
```

### 搜索模式

| 模式 | 说明 | 适用场景 |
|------|------|----------|
| `hybrid` | 向量 + 关键词 + 元数据（默认） | 主题查考、概念搜索 |
| `vector` | 纯向量语义搜索 | 跨语言/跨译本搜索 |
| `keyword` | 纯 Lucene 关键词搜索 | 精确措辞匹配 |
| `exact` | 圣经引用精确查找 | "约3:16"直接定位 |

### 索引管理 API

```
# 全量索引
POST   /api/v1/kb/index/bible/{translation}   — 索引指定译本（经文级+篇章级）
POST   /api/v1/kb/index/library               — 索引图书馆全部
POST   /api/v1/kb/index/library/{code}        — 索引指定书籍
POST   /api/v1/kb/index/course                — 索引课程内容
DELETE /api/v1/kb/index                       — 清空所有索引

# 增量索引（不停服动态追加）
POST   /api/v1/kb/index/library/{code}/incremental  — 追加单本书到现有索引
PUT    /api/v1/kb/index/library/{code}              — 更新指定书籍（删旧+追新）
DELETE /api/v1/kb/index/library/{code}              — 从索引中删除指定书籍
POST   /api/v1/kb/index/compact                     — 压缩索引碎片（compaction）

# 状态与统计
GET    /api/v1/kb/stats                       — 索引统计（各来源文档数/向量数）
GET    /api/v1/kb/status                      — 服务状态（Zvec 连接/索引健康度）
GET    /api/v1/kb/index/diff                  — 对比 H2 文档与 Zvec 索引差异
```

---

## 增量索引设计（动态增删改，不停服）

### 核心原则

Zvec 像 SQLite 一样支持在线 CRUD，不需要停服重建索引：

```
首次建库：批量插入所有文档 → flush → 构建索引
日常维护：增量插入新书 → 自动更新索引 → 定期 compact
内容修正：delete + insert（替换旧块）→ 下次查询即生效
```

### 增量添加新书

```kotlin
fun addBookToIndex(bookCode: String) {
    // 1. 从 H2 读取书籍章节
    val chapters = libraryService.getBookChapters(bookCode)
    
    // 2. 分块 + 嵌入
    val newChunks = chapters.flatMap { chapter ->
        chunkByParagraph(chapter.content, bookCode, chapter.id)
    }.map { chunk ->
        chunk.copy(vector = embeddingService.embed(chunk.text))
    }
    
    // 3. 写入 H2（标记 is_indexed = true）
    kbDocumentRepository.saveAll(newChunks.map { it.toEntity() })
    
    // 4. 批量插入 Zvec（追加模式，不重建）
    zvecBridge.batchInsert(newChunks)
    zvecBridge.flush()  // 确保持久化
    
    // 5. 清除查询缓存（新内容可能改变搜索结果）
    queryCache.invalidate()
}
```

### 更新已有书籍（内容修正/OCR修复）

```kotlin
fun updateBookIndex(bookCode: String) {
    // 1. 删除旧索引（按 book_code 过滤）
    zvecBridge.deleteByFilter(mapOf("book_code" to bookCode))
    kbDocumentRepository.deleteByBookCode(bookCode)
    
    // 2. 重新分块 + 嵌入 + 插入（与添加新书相同）
    addBookToIndex(bookCode)
    
    // 3. 清除缓存
    queryCache.invalidate()
}
```

### 删除书籍

```kotlin
fun removeBookFromIndex(bookCode: String) {
    // 1. 从 Zvec 删除（按元数据过滤）
    zvecBridge.deleteByFilter(mapOf("book_code" to bookCode))
    
    // 2. 从 H2 删除记录
    kbDocumentRepository.deleteByBookCode(bookCode)
    
    // 3. 清除缓存
    queryCache.invalidate()
}
```

### 定期压缩（Compaction）

```kotlin
// 频繁增删后索引可能碎片化，定期压缩恢复性能
fun compactIndex() {
    zvecBridge.compact()  // 合并小段向量数据
    logger.info("Index compacted")
}
```

### 增量 vs 全量重建

| 场景 | 方式 | 耗时 |
|------|------|------|
| 新增 1 本书 | 增量插入 | ~2 秒 |
| 修正 1 本书 | 删旧+追新 | ~3 秒 |
| 删除 1 本书 | 元数据过滤删除 | <1 秒 |
| 新增 1 个译本 | 增量插入 ~10,000 块 | ~30 秒 |
| 更换嵌入模型 | 全量重建 | ~10 分钟 |
| 索引损坏恢复 | 全量重建 | ~10 分钟 |

### 内容一致性校验

```kotlin
// 对比 H2 文档表与 Zvec 索引的差异
fun indexDiff(): IndexDiffReport {
    val h2Docs = kbDocumentRepository.findAllIndexed()  // H2 中 is_indexed=true 的文档
    val zvecIds = zvecBridge.getAllVectorIds()           // Zvec 中所有向量 ID
    
    val missingInZvec = h2Docs.filterNot { it.vectorId in zvecIds }  // H2有但Zvec没有
    val orphanInZvec = zvecIds.filterNot { id -> h2Docs.any { it.vectorId == id } }  // Zvec有但H2没有
    val contentChanged = h2Docs.filter { doc ->
        zvecBridge.getMetadata(doc.vectorId)?.get("content_hash") != doc.contentHash
    }  // 内容已变更但向量未更新
    
    return IndexDiffReport(missingInZvec, orphanInZvec, contentChanged)
}
```

### 嵌入模型一致性约束

**关键约束**：向量维度必须始终一致。如果未来从 TF-IDF 256 维升级到 Sentence-BERT 512 维，必须全量重建索引。

```kotlin
// 索引配置表记录当前嵌入模型信息
// kb_index_config 表中存储：
// embedding_model = "tfidf_hash_v1"
// embedding_dim = 256
// embedding_version = 1

fun checkModelConsistency(): Boolean {
    val config = kbIndexConfigRepository.findByKey("embedding_model")
    val currentModel = embeddingService.modelName
    return config?.configValue == currentModel
}

// 如果模型不匹配，拒绝增量插入，提示需要全量重建
fun addBookToIndex(bookCode: String) {
    if (!checkModelConsistency()) {
        throw IllegalStateException(
            "嵌入模型已变更（${embeddingService.modelName}），需要全量重建索引。" +
            "请调用 POST /api/v1/kb/index/rebuild"
        )
    }
    // ... 正常增量插入
}
```

---

## 嵌入方案（当前阶段不接入大模型）

### 阶段 1：本地 TF-IDF 哈希（当前）

```kotlin
class LocalHashEmbedding(private val dim: Int = 256) {
    fun embed(text: String): FloatArray {
        // 中文 bigram + 英文分词 → 哈希到 256 维 → L2 归一化
        // 优点：零依赖、毫秒级
        // 缺点：无法理解同义语义
    }
}
```

**缓解同义词问题的方案**：构建神学同义词映射表

```kotlin
// 神学同义词映射（辅助 TF-IDF 嵌入）
val THEOLOGY_SYNONYMS = mapOf(
    "祷告" to listOf("祈求", "呼求", "恳求", "代求"),
    "爱" to listOf("agape", "圣爱", "慈爱", "仁爱"),
    "信" to listOf("信心", "相信", "信靠", "信任"),
    "称义" to listOf("义", "称义", "算为义", "归算为义"),
    "挽回祭" to listOf("propitiation", "赎罪", "挽回"),
    "团契" to listOf("koinonia", "相交", "交通", "圣徒相通"),
    "救恩" to listOf("拯救", "救赎", "救拔", "salvation"),
    "罪" to listOf("sin", "过犯", "罪孽", "罪恶", "悖逆"),
    "恩典" to listOf("grace", "恩惠", "恩宠"),
    "圣灵" to listOf("神的灵", "真理的灵", "保惠师", "圣神")
)

// 嵌入时对查询做同义词扩展
fun expandQuery(query: String): String {
    var expanded = query
    THEOLOGY_SYNONYMS.forEach { (key, synonyms) ->
        if (query.contains(key)) {
            expanded += " " + synonyms.joinToString(" ")
        }
    }
    return expanded
}
```

### 阶段 2（未来可选）：本地 Sentence-BERT

```
模型：shibing624/text2vec-base-chinese
部署：Node.js + ONNX Runtime INT8 量化
维度：256 或 512
推理：~50ms/query（CPU）
模型大小：~90MB
```

---

## 实施优先级（更新）

| 优先级 | 项 | 说明 |
|--------|---|------|
| **P0** | 动态插件框架 | ✅ 已完成（后端编译通过，API 验证通过） |
| **P0** | Zvec 合并到前端 Node 进程 | 安装 `@zvec/zvec` npm 包 |
| **P0** | 图书馆索引（段落+句号分块） | 95 本 × 946 章 |
| **P0** | 圣经索引（段落级分块 + 精确坐标） | 主要译本（cuv_gb / KJV） |
| **P0** | 混合搜索 API | Zvec + Lucene 双通道融合 |
| **P0** | 知识库前端页面 | 搜索 + 结果展示 |
| **P1** | 圣经引用精确查找 | "约3:16" → 直接定位 |
| **P1** | 篇章级索引 | 整章向量，宏观搜索 |
| **P1** | 查询缓存（LRU + H2 持久化） | 重复查询零延迟 |
| **P1** | 神学同义词映射表 | 缓解 TF-IDF 语义理解不足 |
| **P1** | 增量索引（添加/更新/删除单本书） | 不停服动态追加，像 SQLite 一样用 |
| **P1** | 内容一致性校验 | H2 vs Zvec 差异检测 + 自动修复 |
| **P1** | 嵌入模型版本锁定 | 记录模型信息，防止维度不兼容 |
| **P2** | 多译本索引 | KJV + BSB + ChiUns 等 |
| **P2** | 父子文档模式 | 小块检索 → 返回整段上下文 |
| **P2** | 定期压缩（Compaction） | 频繁增删后索引碎片整理 |
| **P3** | 本地 Sentence-BERT 模型 | 真正语义理解（需全量重建索引） |
| **P3** | 交叉编码器重排序 | 精确度提升 |
