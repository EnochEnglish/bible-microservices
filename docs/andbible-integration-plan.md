# AndBible 功能移植到 bible-microservices 完整方案

> 分析对象: AndBible v5.x (GPLv3) / JSword v2.4.29
> 来源: https://github.com/AndBible/and-bible.git
> 分析日期: 2026-06-04

---

## 一、AndBible 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│  AndBible Android App                                       │
├────────────┬────────────┬────────────┬──────────────────────┤
│  View      │  Control   │  Service   │  Database            │
│  (143 文件) │  (71 文件)  │  (159 文件) │  (34 文件)            │
├────────────┼────────────┼────────────┼──────────────────────┤
│ WebView UI │ 页面管理    │ JSword 2.4 │ Room/SQLite          │
│ JS Bridge  │ 导航控制    │ 下载管理     │ Bookmarks            │
│ Activity   │ 搜索控制    │ TTS 引擎    │ ReadingPlans         │
│ Dialog     │ 书签控制    │ 云同步      │ MyDocuments          │
│ 导航 Grid  │ 阅读计划    │ OSIS→HTML  │ Progress             │
│ AI UI      │ 备份控制    │ LLM (65)   │ Migrations           │
└────────────┴────────────┴────────────┴──────────────────────┘
```

**技术栈**: Kotlin / Android SDK / WebView / JSword / Room ORM / Coroutines

**核心依赖**:
- JSword v2.4.29 (SWORD 模块读取)
- JDOM 2.0.6.1 (OSIS XML 处理)
- Room (数据库 ORM)
- WebView + JS Bridge (渲染引擎)
- Kotlin Serialization

---

## 二、AndBible 全部功能清单 (21 项)

### 🔵 已有功能 (bible-microservices 已实现)
| # | 功能 | AndBible 实现 | 我们的实现 | 状态 |
|---|------|-------------|-----------|------|
| 1 | 多译本阅读 | JSword PassageBook | H2 数据库 + Kotlin API | ✅ |
| 2 | 逐节注释 | JSword CommentaryBook | COMMENTARIES 表 + API | ✅ |
| 3 | 词典/Strong's | JSword GenBook | DICTIONARIES 表 + API | ✅ |
| 4 | 全文搜索 | JSword Lucene Index | Lucene 索引 + Search API | ✅ |
| 5 | TTS 朗读 | Android TTS Engine | Web Speech API | ✅ |
| 6 | 双语对照 | Window Sync | Compare Mode | ✅ |
| 7 | 书卷/章节导航 | BookList/ChapterGrid | 侧栏导航 + 章节网格 | ✅ |

### 🟡 部分实现
| # | 功能 | 缺少部分 | 难度 |
|---|------|---------|------|
| 8 | 模块导入 | SWORD 原生读取（不用预导入） | ⭐⭐⭐⭐⭐ |

### 🔴 未实现 (需要移植)
| # | 功能 | AndBible 实现方式 | 移植难度 |
|---|------|-----------------|---------|
| 9 | 模块下载/安装 | DownloadManager + CrossWire mirrors | ⭐⭐⭐ |
| 10 | 书签管理 | BookmarkControl + Room DB | ⭐⭐ |
| 11 | 阅读计划 | ReadingPlanControl + properties文件 | ⭐⭐ |
| 12 | 笔记/Study Pad | MyNotePage + Room DB | ⭐⭐⭐ |
| 13 | 分屏多窗口 | WindowControl + WebView | ⭐⭐⭐⭐ |
| 14 | 备份/恢复 | BackupControl + Zip | ⭐⭐ |
| 15 | 云同步 | GoogleDrive / NextCloud adapter | ⭐⭐⭐⭐ |
| 16 | AI/LLM 助手 | Agent + Tools 架构 (65文件) | ⭐⭐⭐⭐⭐ |
| 17 | 地图 | MapPage (仅 Android UI) | ⭐⭐ |
| 18 | 通用书籍 | GeneralBookPage | ⭐⭐ |
| 19 | 经文进度追踪 | ProgressControl + Room DB | ⭐ |
| 20 | 经文关联/交叉引用 | LinkControl + JSword | ⭐⭐⭐ |
| 21 | 错误报告 | ErrorReportControl + AI | ⭐⭐ |

---

## 三、核心移植方案

### 3.1 JSword 作为原生模块读取器 (P0·已启动)

**目标**: 用 JSword v2.4.29 替代自制导入脚本，实现 SWORD 模块的原生读取

**已完成**:
- ✅ bible-sword-reader 模块创建 (396 Java 文件编译通过)
- ✅ 移除不需要的包 (index/lucene, bridge, install, readings, study)

**待完成**:
1. 升级 JSword 版本到 2.4.29（当前编译基于旧版源码）
2. 实现 `SwordBookRegistry`：扫描 `mods.d/` 目录发现模块
3. 实现 `PassageProvider`：通过 JSword API 读取经文
4. 对接现有 `bible-text-service` API，提供 "file://" 协议直接读取 .bzz/.bzv/.bzs 文件
5. 处理 versification 映射（KJV/German/LXX/... 之间的节号转换）

**文件**: `bible-sword-reader/src/main/java/org/crosswire/jsword/...`

### 3.2 模块下载系统 (P1)

**目标**: 让用户可以浏览和下载 CrossWire 仓库的 SWORD 模块

**从 AndBible 移植的关键文件**:
```
service/download/
├── DownloadManager.kt        → 下载管理器
├── RepoFactory.kt            → 仓库工厂（CrossWire 官方源 + 镜像）
├── Repositories.kt           → 仓库配置
├── RepositoriesExt.kt        → 仓库扩展
├── GenericFileDownloader.kt  → HTTP 下载器
├── RepoBookDeduplicator.kt   → 去重
└── FakeBookFactory.kt        → 虚拟Book对象（用于预览未安装模块）
```

**bible-module-service 新增端点**:
```
GET  /api/v1/modules/repositories          → 仓库列表
GET  /api/v1/modules/available             → 可用模块列表（从远程获取）
GET  /api/v1/modules/search?q=Chinese      → 搜索模块
POST /api/v1/modules/download/{module}     → 下载/安装模块
GET  /api/v1/modules/download/{module}/progress → 下载进度
POST /api/v1/modules/reload                → 重新扫描 mods.d/
DELETE /api/v1/modules/{module}             → 卸载模块
```

### 3.3 书签系统 (P2)

**数据库模型** (移植自 AndBible Room schema):
```kotlin
@Entity
data class Bookmark(
    val id: Long,
    val key: String,          // 经文引用 "Matt.5.3" 或 "Gen.1.1-Gen.2.3"
    val bookInitials: String, // 译本缩写
    val createdAt: Instant,
    val labels: List<String>  // "默认", "重要", "个人"
)
```

**API 端点**:
```
GET    /api/v1/bookmarks                    → 用户书签列表
POST   /api/v1/bookmarks                    → 创建书签
DELETE /api/v1/bookmarks/{id}               → 删除书签
PUT    /api/v1/bookmarks/{id}/labels        → 更新标签
GET    /api/v1/bookmarks/labels             → 标签列表
```

### 3.4 阅读计划 (P3)

**移植内容**:
- 7 个内置计划 (McCheyne, Chronological, Horner's, OT+NT 等)
- `ReadingPlanControl.kt` 逻辑
- `ReadingStatus.kt` / `HistoricReadingStatus.kt`

**数据库模型**:
```kotlin
@Entity
data class ReadingPlan(
    val planId: String,
    val day: Int,              // 第几天
    val passages: List<String> // 经文范围列表
)

@Entity
data class ReadingStatus(
    val planId: String,
    val day: Int,
    val completedAt: Instant?,
    val notes: String?
)
```

### 3.5 备份/恢复 (P3)

**从 AndBible 移植**:
- `BackupControl.kt` → 导出/导入功能
- `SwordDocumentInfoDao.kt` → 模块元数据

**API**:
```
POST /api/v1/backup/export    → 导出备份文件（JSON/SQLite dump）
POST /api/v1/backup/import    → 导入备份文件
GET  /api/v1/backup/info      → 服务器备份状态
```

**备份内容**: 书签 + 阅读进度 + 笔记 + 设置 + 已安装模块列表

### 3.6 OSIS→HTML 渲染管线 (P2)

**移植 `service/format/osistohtml/`**:
```
osistohtml/
├── OsisToBibleSpeak.kt              → TTS 文本提取
├── OsisToCanonicalTextSaxHandler.kt → 规范文本提取
├── OsisToSpeakTextSaxHandler.kt     → TTS markdown
│
├── osishandlers/
│   ├── ...                          → 5 个 SAX 处理器
└── taghandler/
    └── ...                          → 1 个标签处理器
```

**用途**:
- 将 OSIS 格式经文渲染为 HTML（服务端渲染）
- 为前端提供格式化的节经文
- 生成用于 AI 上下文的纯文本

### 3.7 AI/LLM 助手 (P4·长期)

**AndBible LLM 模块包含** (65 文件):
```
llm/
├── agent/
│   ├── LLMAgent.kt           → AI Agent 核心
│   ├── LLMMessage.kt         → 消息结构
│   ├── LLMConfig.kt          → 配置管理
│   └── ...
└── tools/
    ├── BibleSearchTool.kt    → 工具：经文搜索
    ├── CommentaryTool.kt     → 工具：注释查询
    ├── DictionaryTool.kt     → 工具：词典查询
    ├── ReadingPlanTool.kt    → 工具：阅读计划
    └── ... (45 个工具定义)
```

**移植方案**:
1. 将 `tools/` 转换为后端数据源工具（已有 API 可复用）
2. 实现 `LLMContextService`：为 AI 模型提供圣经上下文
3. 前端添加聊天界面，调用 `/api/v1/ai/chat` 端点
4. 支持多模型（OpenAI/Anthropic/本地）
5. System Prompt: `raw/llm_agent_system_prompt.md`

### 3.8 经文进度追踪 (P2)

**移植**: `ProgressControl.kt` + `ReadingProgressSettingsChangedEvent.kt`

**API**:
```
GET  /api/v1/progress/{translation}          → 进度概览
POST /api/v1/progress/{translation}/{book}/{chapter} → 标记已读
DELETE /api/v1/progress/{translation}        → 重置进度
```

---

## 四、实施计划（分 4 个阶段）

### 阶段 1: 核心引擎升级 (1-2 周)
```
□ JSword v2.4.29 集成 → bible-sword-reader
□ SWORD 模块原生读取（不经预导入）
□ Versification 映射系统
□ Module Service API 对接
```

### 阶段 2: 模块生态系统 (1 周)
```
□ 模块下载/安装 → bible-module-service 重构
□ CrossWire 仓库浏览器
□ 下载进度 API
□ 模块管理 API (安装/卸载/列表)
```

### 阶段 3: 用户功能 (2 周)
```
□ 书签系统 → bible-user-service (新)
□ 阅读计划 → bible-reading-service (新)
□ 进度追踪 → 同上
□ 笔记/Study Pad → 同上
□ 备份/恢复 → 同上
□ OSIS→HTML 服务端渲染
```

### 阶段 4: 增强功能 (3-4 周)
```
□ AI/LLM 助手 → bible-ai-service (新)
□ 云同步 (WebDAV/Google Drive)
□ 高级搜索 (跨译本/分词优化)
□ 移动端适配 (PWA)
```

---

## 五、许可证合规

| 组件 | 许可证 | 集成方式 |
|------|--------|---------|
| JSword | GPLv2 | 源码集成（需保持 GPLv2 兼容） |
| AndBible | GPLv3 | 不直接集成，参考架构 |
| bible-microservices | 待定 | **需评估 GPL 兼容性** |

⚠️ **重要**: JSword 是 GPLv2，如果以源码形式集成，整个项目可能需要 GPL 许可证。
避责方案：将 JSword 作为独立模块（bible-sword-reader.jar），通过 API 调用，保持 LGPL 兼容。

---

## 六、推荐新增微服务

基于移植需求，建议新增 2-3 个微服务：

```
bible-microservices/
├── bible-gateway          (8080) - API 网关 [已有]
├── bible-text-service     (8081) - 经文查询   [已有]
├── bible-search-service   (8082) - 全文搜索   [已有]
├── bible-module-service   (8083) - 模块管理   [已有·待重构]
├── bible-sword-reader     (.jar) - SWORD 读取 [NEW·已编译]
├── bible-user-service     (8084) - 用户功能   [NEW]
│   书签/阅读计划/进度/笔记/备份
└── bible-ai-service       (8085) - AI 助手    [NEW·长期]
    LLM 接口/上下文管理/工具链
```

---

## 七、技术风险

1. **JSword GPLv2 污染**: 必须作为独立模块，不混入项目主代码
2. **SWORD 模块兼容性**: 部分旧模块(MySword/MyBible)格式可能不支持
3. **性能**: 实时解压 .bzz 读取比预导入数据库慢（需实现缓存层）
4. **Versification**: 不同译本节号体系不一致（KJV vs LXX vs German）
5. **安卓依赖**: 部分代码依赖 Android SDK（需替换为标准 Java API）
