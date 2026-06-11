# bible-sword-service 详细设计

> 基于 JSword LGPL v2.1 — 独立 JAR 模块，通过 HTTP API 隔离许可证
> 设计日期: 2026-06-04

---

## 一、许可证结论

✅ **JSword 实际是 LGPL v2.1**（32 个随机文件 100% LGPL 头），不是 GPLv2。
LGPL 允许以 JAR 形式动态链接，无需开源项目主代码。唯一条款：最终用户必须能替换 JSword JAR。

---

## 二、JSword 原生支持的功能（不需要任何解析代码）

| SWORD 格式 | 数据类型 | JSword 类 | 我们的工作量 |
|-----------|---------|----------|-----------|
| zText | Bible (含 Strong's) | `ZVerseBackend` | **零** |
| RawLD | 词典 | `RawLDBackend` | **零** |
| zCom | 逐节注释 | `RawLDBackend` | **零** |
| RawGenBook | 通用书籍 | `RawLDBackend` | **零** |
| zLD | 词典 | `RawLDBackend` | **零** |
| RawFiles | 每日灵修 | `RawFileBackend` | **零** |

JSword 内置 BZV/BZS/BZZ 解析器，直接返回 OSIS XML（含 `<w src="StrongsHebrew/0430">` 等 Strong's 编号标签），完全不需要我们写 Python 解析脚本。

---

## 三、新增微服务架构

```
bible-microservices/                         项目根目录
├── bible-gateway          (8080)  [已有]    API 网关 / 路由
├── bible-text-service     (8081)  [已有]    H2 预导入经文（计划退役）
├── bible-search-service   (8082)  [已有]    Lucene 搜索
├── bible-module-service   (8083)  [已有]    模块管理
├── bible-sword-reader     (JAR)   [已完成]  JSword LGPL 库（396 Java 文件编译通过）
└── bible-sword-service    (8086)  [新设计]  SWORD 原生读取 HTTP 服务
```

### 3.1 bible-sword-service 技术栈

```
bible-sword-service/
├── src/main/kotlin/com/bible/sword/
│   ├── SwordServiceApplication.kt
│   ├── config/
│   │   └── SwordConfig.kt              # 初始化 SWORD 路径 + 注册驱动
│   ├── service/
│   │   ├── SwordRegistry.kt            # 模块发现/列表/重载
│   │   ├── PassageProvider.kt          # 经文读取 + Strong's 提取
│   │   ├── DictionaryProvider.kt       # 词典查询
│   │   └── CommentaryProvider.kt       # 注释读取
│   └── controller/
│       ├── ModuleController.kt         # 模块列表 API
│       ├── PassageController.kt        # 经文 API
│       ├── DictionaryController.kt     # 词典 API
│       └── CommentaryController.kt     # 注释 API
├── build.gradle.kts
└── lib/
    └── bible-sword-reader.jar          # JSword LGPL JAR (compileOnly)
```

### 3.2 关键依赖

```kotlin
// build.gradle.kts
dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    compileOnly(files("lib/bible-sword-reader.jar"))  // LGPL, 运行时动态链接
    // JDOM 已在 JSword 传递依赖中
}
```

运行时部署：
```
bible-sword-service.jar
lib/
  bible-sword-reader.jar  ← 用户可替换此文件（满足 LGPL 条款）
```

---

## 四、核心 API 设计

### 4.1 模块管理

```kotlin
// SwordConfig.kt — 应用启动时初始化
@Configuration
class SwordConfig {
    @PostConstruct
    fun initSword() {
        // 读取配置的 SWORD 模块目录
        val swordDir = File(config.swordModulesPath) // data/sword-mods/
        SwordBookPath.setAugmentPath(arrayOf(swordDir))
        SwordBookPath.setDownloadDir(swordDir)
        // SwordBookDriver 自动扫描 mods.d/ 下的 .conf 文件发现模块
        Books.installed().registerDriver(SwordBookDriver.instance())
    }
}
```

### 4.2 模块列表 API

```kotlin
// GET /api/v1/sword/modules
data class ModuleInfo(
    val initials: String,        // "KJV", "CUV", "StrongsGreek"
    val name: String,            // "King James Version"
    val description: String,     // "King James Version of the Holy Bible"
    val category: String,        // "BIBLE", "COMMENTARY", "DICTIONARY", "GENERAL_BOOK"
    val language: String,        // "en", "zh"
    val hasStrongs: Boolean,     // 是否含 Strong's 编号
    val versification: String?,  // "KJV", "German", "LXX" ...
    val features: List<String>,  // ["StrongsNumbers", "GreekDef", "HebrewDef"...]
    val fileSize: Long           // 模块文件总大小
)

// SwordRegistry.kt
fun listModules(): List<ModuleInfo> {
    return Books.installed().books
        .map { book ->
            val meta = book.bookMetaData
            ModuleInfo(
                initials = book.initials,
                name = meta.getProperty("Description") ?: book.name,
                description = meta.getProperty("About") ?: "",
                category = book.bookCategory.name,
                language = book.language.code,
                hasStrongs = meta.hasFeature(FeatureType.STRONGS_NUMBERS),
                versification = (book as? SwordBook)?.versification?.name,
                features = meta.features.map { it.name },
                fileSize = book.file?.length() ?: 0
            )
        }
}
```

### 4.3 经文读取 API（核心！）

```kotlin
// GET /api/v1/sword/{module}/books
//   → ["Gen", "Exod", "Lev", ...]  (书卷缩写列表)

// GET /api/v1/sword/{module}/{book}/{chapter}
//   → { verses: [...], interlinear: [...] }

// GET /api/v1/sword/{module}/{book}/{chapter}/{verse}
//   → { text: "...", interlinear: [...] }

// GET /api/v1/sword/{module}/{book}/{chapter}?interlinear=true
//   → 带 Strong's 编号的经文

data class VerseResponse(
    val key: String,           // "KJV.Gen.1.1"
    val text: String,          // 纯文本（已去除 OSIS 标签）
    val osis: String?,         // 原始 OSIS XML（可选）
    val interlinear: List<WordInfo>?
)

data class WordInfo(
    val text: String,          // "beginning"
    val strongsHebrew: String?, // "H7225"
    val strongsGreek: String?,  // null (for OT)
    val morphology: String?,    // "H-ncfsc"
    val lemma: String?          // "רֵאשִׁית"
)

// PassageProvider.kt
fun getChapter(module: String, book: String, chapter: Int, interlinear: Boolean): List<VerseResponse> {
    val swordBook = Books.installed().getBook(module)
        ?: throw NotFoundException("Module not found: $module")
    val versification = (swordBook as SwordBook).versification
    val bibleBook = BibleBook.getBook(book)
    val key = PassageKeyFactory.createEmptyKeyList(versification)
    
    // JSword 原生 API：直接读取整章
    key.addAll(bibleBook, chapter)
    val bookData = BookData(swordBook, key)
    
    if (interlinear) {
        // 保留 OSIS XML 中的 <w> 标签（含 Strong's 编号）
        return parseOsisWithStrongs(bookData.osis)
    } else {
        // 返回纯文本
        return parseOsisPlain(bookData.osis)
    }
}

// Strong's 提取（关键逻辑！）
fun parseOsisWithStrongs(osisXml: String): List<VerseResponse> {
    val doc = SAXBuilder().build(StringReader(osisXml))
    val namespace = Namespace.getNamespace("http://www.bibletechnologies.net/2003/OSIS/namespace")
    
    // OSIS 根 → div(type=chapter) → 每个 verse → <w> + 纯文本
    return doc.rootElement
        .getChild("text", namespace)!!
        .getChild("body", namespace)!!
        .getChildren("div", namespace)
        .filter { it.getAttributeValue("type") == "chapter" }
        .flatMap { div ->
            div.children.filterIsInstance<Element>().map { verseElem ->
                val verseKey = verseElem.getAttributeValue("id") // "Gen.1.1"
                val interlinear = mutableListOf<WordInfo>()
                val textBuilder = StringBuilder()
                
                traverseOsis(verseElem, namespace) { wordElem ->
                    val wordText = wordElem.text
                    textBuilder.append(wordText)
                    interlinear.add(WordInfo(
                        text = wordText,
                        strongsHebrew = wordElem.getAttributeValue("lemma")?.takeIf { it.startsWith("strong") },
                        strongsGreek = null,
                        morphology = wordElem.getAttributeValue("morph")
                    ))
                }
                
                VerseResponse(verseKey, textBuilder.toString(), null, interlinear)
            }
        }
}
```

### 4.4 词典 API

```kotlin
// GET /api/v1/sword/dict/{module}?q=Aaron
//   → { entries: [{ title: "Aaron", content: "..." }] }

fun searchDictionary(module: String, query: String): List<DictEntry> {
    val book = Books.installed().getBook(module) as SwordGenBook
    val key = book.getGlobalKeyList().find { it.name.contains(query, true) }
        ?: return emptyList()
    
    val bookData = BookData(book, key)
    return listOf(DictEntry(key.name, bookData.osis))
}
```

### 4.5 注释 API

```kotlin
// GET /api/v1/sword/commentary/{module}/{book}/{chapter}
//   → { verses: [{ key: "Gen.1.1", comment: "..." }] }

fun getCommentary(module: String, book: String, chapter: Int): List<CommentaryEntry> {
    val book = Books.installed().getBook(module) as SwordBook
    val key = PassageKeyFactory.getKey(book.versification, "$book.$chapter")
    
    val bookData = BookData(book, key)
    // 返回逐节注释
    return parseCommentaryOsis(bookData.osis)
}
```

---

## 五、与现有服务的集成方案

### 5.1 Gateway 路由（过渡期）
```yaml
# Gateway 路由配置
spring:
  cloud:
    gateway:
      routes:
        # 现有路由
        - id: text-service
          uri: http://localhost:8081
          predicates: Path=/api/v1/bible/**
        # 新路由：SWORD 原生读取
        - id: sword-service
          uri: http://localhost:8086
          predicates: Path=/api/v1/sword/**
```

### 5.2 前端迁移策略

**阶段 1: 双路径并行**
- 现有 API 保持不变 (`/api/v1/bible/...`)
- 新 API 以 `/api/v1/sword/...` 提供
- 前端同时支持两套

**阶段 2: 逐步切换**
- Bible 经文 → 切到 sword-service（享 Strong's 自动支持）
- 词典 → 切到 sword-service（享原生解析，无需 Python 导入）
- 注释 → 切到 sword-service（享自动章节解析）
- 搜索 → 保持现有 Lucene 服务（可集成 JSword IndexManager）

**阶段 3: 退役旧服务**
- text-service: 数据全部来自 SWORD 模块后下线
- 所有 Python 导入脚本: 不再需要
- H2 预导入数据: 仅保留用户数据（书签/进度等）

### 5.3 前端代码最小改动

```javascript
// app.js — 添加新后端切换
const SWORD_BACKEND = '/api/v1/sword'; // 新

async function fetchChapter(translation, book, chapter) {
    // 尝试新 SWORD 后端（含 Strong's 自动支持）
    const res = await fetch(`${SWORD_BACKEND}/${translation}/${book}/${chapter}?interlinear=true`);
    if (res.ok) return res.json();
    // 回退到旧 text-service
    return fetch(`/api/v1/bible/${translation}/${book}/${chapter}`).then(r => r.json());
}
```

---

## 六、实施计划（3 天）

### Day 1: 服务骨架 + 模块发现
```
□ 创建 bible-sword-service Spring Boot 项目
□ 复制 bible-sword-reader.jar 到 lib/
□ 实现 SwordConfig（初始化 SWORD 路径）
□ 实现 SwordRegistry（模块扫描/列表）
□ 实现 ModuleController（REST API）
□ 测试：启动服务，验证能列出 CrossWire 模块
```

### Day 2: 经文读取 + Strong's
```
□ 实现 PassageProvider（经文读取）
□ 实现 OSIS→JSON 解析器（含 Strong's 提取）
□ 实现 PassageController（经文 API）
□ 测试：KJV + Strong's 数据验证
□ 性能测试：整章读取耗时
```

### Day 3: 词典 + 注释 + 集成
```
□ 实现 DictionaryProvider（词典查询）
□ 实现 CommentaryProvider（注释读取）
□ Gateway 路由配置
□ 前端对接
□ 全链路 E2E 测试
```

---

## 七、需废弃的代码（JSword 替代后）

| 文件 | 原因 |
|------|------|
| `scripts/import_kjv_interlinear.py` | JSword 原生读 Strong's |
| `scripts/import_wesley.py` | JSword 原生读注释 |
| `scripts/dict_import_v4_jdbc.py` | JSword 原生读词典 |
| `scripts/import_clarke.py` | JSword 原生读注释 |
| `scripts/import_mhc.py` | JSword 原生读注释 |
| `scripts/import_jfb.py` | JSword 原生读注释 |
| `scripts/import_cuv*.java` | JSword 原生读圣经 |
| `scripts/import_kjv*.java` | JSword 原生读圣经 |
| ≈20 个导入脚本 | 全部可废弃 |

**保留**：
- `bible-search-service` (Lucene 索引，JSword 的 IndexManager 也可用但我们的已调优)
- 用户数据服务（书签、阅读计划 — 这些不是 SWORD 数据）

---

## 八、性能预估

| 操作 | JSword 原生 | 当前方案 |
|------|-----------|---------|
| 整章经文 KJV Gen 1 | ~50ms (解压+解析) | ~5ms (H2 查询) |
| 整章经文 KJV Gen 1 + Strong's | ~60ms | 不支持 |
| 词典搜索 Easton | ~20ms (RawLD 索引) | ~3ms (H2 查询) |
| 模块发现/列表 | ~100ms (首次) | 无（手动注册） |
| 首次启动（扫描 mods.d） | ~200ms | N/A |

> JSword 有内置 LRU 缓存 (LruCache)，热点数据可缓存。整体性能可接受。

---

## 九、风险与缓解

| 风险 | 缓解 |
|------|------|
| JSword 线程安全（原为桌面单线程） | 每个请求新建 BookData 实例 + synchronized 块 |
| 内存占用（大型模块解压） | Caffeine Cache 限制大小 + 按需加载 |
| mods.d 路径兼容（Windows/Linux） | SwordBookPath 已处理跨平台 |
| Versification 映射不一致 | JSword VersificationsMapper 已实现 KJV↔NRSV↔LXX 等 |
| 中文编码（GBK/UTF-8） | JSword sword.conf 指定 Encoding=UTF-8 |
