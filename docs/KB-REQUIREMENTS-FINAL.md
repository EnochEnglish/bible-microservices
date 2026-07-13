# 知识库需求文档（最终版）

## 1. 项目目标

基于 Zvec 向量数据库构建本地语义搜索引擎，整合以下所有内容：

| 数据源 | 来源 | 文档数 | 预估数据量 |
|--------|------|--------|------------|
| 图书馆 | library-data/ JSON 文件 | 95 本 × 946 章 | 940 万字 / 21 MB |
| 圣经 | H2 数据库（22 译本） | ~31,000 节/译本 | ~500 万字/译本 |
| 注释书 | JSword SWORD COMMENTARY 模块（33 个） | 34 源 × 1,189 章 | ~1,290 MB |
| 词典 | JSword SWORD DICTIONARY 模块（35 个） | ~50,000+ 词条 | ~200 MB |
| 灵修 | JSword SWORD DAILY_DEVOTIONS 模块（3 个） | 366 天 × 3 源 | ~3 MB |
| 通用书 | JSword SWORD GENERAL_BOOK 模块（31 个） | ~500+ 章节 | ~50 MB |
| 课程 | H2 数据库 | 3 门 × 42 课 | 17 万字 |

**总数据量预估：~1.6 GB（含注释书全文），核心索引数据 ~200 MB**

---

## 2. 核心功能需求

### 2.1 语义搜索

用户用自然语言提问，系统从全部数据源中检索最相关的内容：

- "因信称义" → 命中罗马书经文 + 加拉太书注释 + ISBE 词典条目 + 门徒训练课程
- "耶稣平静风浪" → 命中可4:35-41 + 注释书解释 + 灵修默想
- "agape 爱的含义" → 命中 Strong's 词典 + Easton 词典 + 约翰一书经文

### 2.2 混合搜索（三层协作）

| 层 | 职责 | 技术 |
|----|------|------|
| 语义层 | 概念搜索、主题查考 | Zvec 向量相似度 |
| 关键词层 | 精确措辞匹配 | Lucene BM25 |
| 元数据层 | 精确定位（书卷/章节/引用） | H2 SQL filter |

### 2.3 多模型并行索引

三个嵌入模型索引同时存在，用户可实时切换或对比：

| 模型 | 维度 | 定位 |
|------|------|------|
| TF-IDF Hash 256 | 256 | 基线，零依赖，线上服务器可用 |
| BGE-small-zh 512 | 512 | 中文轻量语义 |
| BGE-base-zh 768 | 768 | 最高精度中文语义 |

### 2.4 数据源全覆盖

#### 2.4.1 圣经文本
- 分块策略：按自然段落（Pericope-based），携带精确坐标（book/chapter/verse_start/verse_end）
- 多粒度：经文级（3-5节/块）+ 篇章级（整章/块）
- 元数据：translation, book, book_name, chapter, verse_start, verse_end, display_ref, language
- 索引译本：cuv_gb（和合本简体）、KJV、BSB 为优先，逐步扩展

#### 2.4.2 注释书（33 个 SWORD COMMENTARY 模块）
- 来源：JSword 直接读取 SWORD 模块（SwordCommentaryService）
- 分块策略：按注释条目（每条注释对应一段经文引用），长条目按段落+句号分块
- 元数据：source_type="commentary", module（JFB/MHC/Clarke...）, book, chapter, verse_ref, author, display_ref
- 数据量：34 源 × 1,189 章 ≈ ~40,000 条注释，~1.3 GB
- 索引策略：按注释条目分块（每条 300-500 字），长条目拆分

#### 2.4.3 词典（35 个 SWORD DICTIONARY 模块）
- 来源：JSword 直接读取 SWORD 模块（DictionaryService）
- 分块策略：每个词条作为一个块（平均 200-2000 字），长词条按段落分块
- 元数据：source_type="dictionary", module（Easton/ISBE/Nave/StrongsGreek...）, entry_key, language
- 数据量：~50,000+ 词条，~200 MB
- 特殊处理：
  - Strong's 词典（StrongsGreek/StrongsHebrew）：词条以 H/G + 数字为 key
  - 中文词典（ChisStrongsGreek 等）：language 标记为 "zh"
  - 主题词典（Nave/Torrey）：按主题组织，entry_key 即主题名

#### 2.4.4 灵修内容（3 个 SWORD DAILY_DEVOTIONS 模块）
- 来源：JSword GenBook API（SME/Daily/DBD）
- 分块策略：每日灵修作为一个块（~3000-5000 字）
- 元数据：source_type="devotion", module（SME/Daily/DBD）, date_key（MM.DD）, title, language
- 数据量：366 天 × 3 源 = 1,098 个块，~3 MB

#### 2.4.5 通用书（31 个 SWORD GENERAL_BOOK 模块）
- 来源：JSword GenBook API
- 分块策略：按章节（key）分块，每章 300-500 字拆分
- 元数据：source_type="genbook", module（Pilgrim/Institutes/Imitation...）, chapter_key, title, author, language
- 数据量：~500+ 章节，~50 MB
- 涵盖内容：天路历程、基督教要义、效法基督、奥古斯丁忏悔录等经典著作

#### 2.4.6 课程内容
- 来源：H2 数据库（Course/Lesson 表）
- 分块策略：每课作为一个块（~4000 字）
- 元数据：source_type="course", course_id, lesson_id, title
- 数据量：3 门 × 42 课 = 42 个块，17 万字

#### 2.4.7 图书馆
- 来源：library-data/ JSON 文件（95 本书）
- 分块策略：段落 + 句号边界，300-500 字/块，重叠 50 字
- 元数据：source_type="library", book_code, chapter_id, title, category, language
- 数据量：946 章，940 万字

### 2.5 增量索引

- 添加新书/新译本/新模块 → 同时写入三个模型的 Zvec Collection
- 更新内容 → 删旧 + 追新
- 删除 → 按元数据过滤删除
- 不停服，像 SQLite 一样动态操作

### 2.6 模型对比测试

- 100 条标准查询（中文主题 + 英文主题 + 经文引用 + 模糊语义 + 跨译本）
- 评估指标：Recall@5、Recall@10、MRR、延迟
- 前端展示对比表格

### 2.7 圣经引用精确查找

- 检测"约3:16"/"约翰福音3:16"/"John 3:16"格式
- 直接元数据查找，不走向量搜索
- 返回精确经文 + 上下文

### 2.8 神学同义词映射

- 缓解 TF-IDF 无语义理解的局限
- 覆盖：祷告/爱/信/称义/挽回祭/团契/救恩/罪/恩典/圣灵 等核心术语
- 嵌入时自动扩展查询

---

## 3. 非功能需求

### 3.1 性能

| 指标 | 目标 |
|------|------|
| 查询延迟（TF-IDF） | < 10ms |
| 查询延迟（BGE-small） | < 50ms |
| 查询延迟（BGE-base） | < 100ms |
| 首次索引构建 | < 30 分钟（全部三个模型） |
| 增量添加单本书 | < 10 秒 |

### 3.2 存储

| 模型 | 向量存储 | 索引 | 合计 |
|------|----------|------|------|
| TF-IDF 256 | ~30 MB | ~30 MB | ~60 MB |
| BGE-small 512 | ~60 MB | ~60 MB | ~120 MB |
| BGE-base 768 | ~90 MB | ~90 MB | ~180 MB |
| **合计** | | | **~360 MB** |

（基于 ~75,000 个文档块的估算）

### 3.3 内存

| 模式 | 加载模型 | 内存占用 | 适用环境 |
|------|----------|----------|----------|
| full | tfidf + bgesmall + bgebase | ~400 MB | 本地（32GB） |
| lite | tfidf + bgesmall | ~180 MB | 中等服务器（2GB+） |
| tfidf-only | tfidf | ~60 MB | 线上 ECS（1GB） |

### 3.4 不接入大模型

当前阶段：
- 不使用 LLM 生成回答（无 RAG）
- 不使用 HyDE 查询增强
- 嵌入模型为本地 TF-IDF 或 ONNX 量化的小模型

未来可选：
- 本地 Sentence-BERT 模型升级（已设计，模型可切换）
- 外部 Embedding API（接口已预留）

---

## 4. 数据源汇总

### SWORD 模块完整清单

**注释书（33 个）**：
Abbott, Barnes, Burkitt, CalvinCommentaries, Catena, Clarke, DTN, Family, Geneva, JFB, KD, KingComments, Lightfoot, Luther, MAK, MHC, MHCC, NETnotesfree, Personal, PNT, QuotingPassages, Rieger, RWP, SBLGNTApp, Scofield, Sentiment, Spurious, TDavid, TFG, TSK, VarApp, VulgGlossa, Wesley

**词典（35 个）**：
2BabDict, AbbottSmith, AbbottSmithStrongs, AmTract, BDBGlosses_Strongs, Cawdrey, CBC, ChisStrongsGreek, ChitStrongsGreek, ChisStrongsHebrew, ChitStrongsHebrew, Dodson, Easton, FVDPVietAnh, GreekHebrew, HebrewGreek, Hitchcock, ISBE, MLStrong, Nave, OSHM, Packard, Robinson, SAOA, Smith, StrongsGreek, StrongsHebrew, TCR, Torrey, Webster1828, Webster1806, Webster1913, ZhEnglish, ZhHanzi, ZhPinyin

**灵修（3 个）**：
SME（Spurgeon 晨更晚祷）, Daily（Daily Light）, DBD（Day By Day By Grace）

**通用书（31 个）**：
alzat, BaptistConfession1646, BaptistConfession1689, Concord, Didache, DarkNightOfTheSoul, EMBReality, Enoch, Finney, Heretics, Imitation, Institutes, JCRHoliness, JEAffections, JESermons, JOChrist, JOCommGod, JOGlory, JOMortSin, Josephus, Jubilees, LawGospel, MollColossians, Orthodoxy, Passion, Phaistos, Pilgrim, Practice, Summa, Westminster, Westminster21

---

## 5. API 总览

### 搜索

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/v1/kb/search` | POST | 搜索（指定模型/来源/过滤器） |
| `/api/v1/kb/compare` | POST | 三模型对比搜索 |
| `/api/v1/kb/suggest` | GET | 搜索建议 |

### 索引管理

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/v1/kb/index/build-all` | POST | 构建全部三个模型索引 |
| `/api/v1/kb/index/build/{modelId}` | POST | 只构建指定模型 |
| `/api/v1/kb/index/library/{code}/add` | POST | 增量添加新书到三个索引 |
| `/api/v1/kb/index/library/{code}` | DELETE | 删除指定书 |
| `/api/v1/kb/index/compact` | POST | 压缩索引碎片 |
| `/api/v1/kb/index/diff` | GET | H2 vs Zvec 差异检测 |
| `/api/v1/kb/index/rebuild` | POST | 全量重建（模型变更时） |

### 模型管理

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/v1/kb/models` | GET | 可用模型列表 + 状态 |
| `/api/v1/kb/embedding/models` | GET | 嵌入模型详情 |
| `/api/v1/kb/preload` | POST | 预加载所有模型到内存 |

### 统计

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/v1/kb/stats` | GET | 各来源/模型索引统计 |
| `/api/v1/kb/status` | GET | 服务状态 |
| `/api/v1/kb/eval/run` | POST | 运行评估测试 |
