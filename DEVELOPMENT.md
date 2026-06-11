# Bible Microservices — 开发笔记

> 项目根目录：`bible-microservices/`
> 最后更新：2026-06-03

---

## 一、架构分析：模块管理方案

### 1.1 业界参考

#### JSword (CrossWire 官方 Java 库)

**定位**：底层引擎库，被 AndBible/BibleDesktop/Xiphos 等应用依赖。

**核心架构**：**文件驱动，非数据库驱动**

```
modules/
├── mods.d/              ← 每个已安装模块一个 .conf 元数据文件
│   ├── KJV.conf
│   ├── CUV.conf
│   └── MHC.conf
├── modules/
│   ├── texts/ztext/
│   │   ├── kjv/         ← .bzz / .bzs / .bzv 压缩数据文件
│   │   └── cuv/
│   ├── comments/zcom/
│   │   └── mhc/
│   └── lexdict/zld/
│       └── easton/
└── lucene/              ← 搜索索引（独立于文本数据）
```

关键源码逻辑：
- `SwordBookDriver.getBooks()` — 扫描文件系统发现已安装模块
- `SwordBookDriver.delete()` — 删除 .conf + 数据目录 + 内存注销
- `registerNewBook()` — 下载后注册新模块到内存列表
- 数据读取时从压缩文件**按需解压**，不预导入数据库

#### AndBible (Android App)

**定位**：构建在 JSword 之上的 Android 应用。

**关系**：AndBible ⊃ JSword，不是"取代"而是"封装"

AndBible 自己做的事：
- Android UI（Kotlin/Vue.js）
- 模块下载管理（`DownloadManager.kt`）
- 多源仓库支持（CrossWire / MyBible / eSword 等 8 种格式）
- 用户数据持久化（书签、笔记、历史）

AndBible 有 SQLite 数据库（Room），但**只存元数据**（仓库地址、下载记录、用户设置），**经文文本永不存数据库**。

#### AndBible 支持的 8 种模块格式

| 格式 | 来源 | 存储方式 |
|---|---|---|
| SWORD (zText/zCom/zLD/RawLD) | CrossWire 官方 | 压缩文件目录 |
| MyBible | mybible.zone | .SQLite3 独立文件 |
| MySword | Google Play | .bbl.mybible |
| eSword | e-Sword 社区 | .bblx / .cmtx |
| EPUB | 自定义 | .epub 文件 |
| CSV/Prompt | 用户导入 | .csv 文件 |
| MyDocuments | 用户创建 | 应用内存储 |
| TTF 字体 | CrossWire | 字体文件 |

---

### 1.2 三种存储方案对比

| 方案 | 添加模块 | 删除模块 | 分发 | 查询速度 | 存储大小 |
|---|---|---|---|---|---|
| **纯文件-读压缩（SWORD方式）** | 下载zip → 解压 | `rm -rf` | 3.8MB/模块 | 需解压+缓存 | ⭐最小 |
| **单H2大库（当前方案）** | 写导入脚本 → INSERT | SQL DELETE + VACUUM | 整个231MB | ⭐最快 | ❌膨胀 |
| **SQLite/模块（推荐折中）** | 导入 → 独立.db | `rm -rf .db` | .db文件/模块 | ⭐快 | ⭐小 |

#### 当前方案的问题（All-in-one H2）
1. **单点故障**：231MB 单文件，损坏 = 全部丢失
2. **无法按需分发**：用户只想用 KJV+CUV，需下载全部 231MB
3. **移除困难**：删 KJV 需要 SQL DELETE 级联 + VACUUM
4. **扩展不友好**：新增译本 = 修改已有表结构/冲突风险

#### 推荐方案：SQLite 按模块分库
```
data/modules/
├── module-index.json          ← 注册表
├── bibles/
│   ├── kjv/kjv.db            ← 独立 SQLite
│   ├── cuv_gb/cuv_gb.db
│   └── ...
├── commentaries/
│   ├── mhc/mhc.db
│   └── ...
└── dictionaries/
    ├── easton/easton.db
    └── strongs/strongs.db
```

---

### 1.3 结论

| 决策 | 理由 |
|---|---|
| **当前不改架构** | 22译本单H2工作良好，优先做功能 |
| **下一阶段做Module Service** | 导入脚本改为输出独立SQLite |
| **Module Service端点** | available / install / remove / installed / status |
| **前端API不变** | Gateway路由不变，后端定位切换到按模块名找库 |

---

## 二、Interlinear 逐词对照功能

### 2.1 数据源确认

**本地 KJV 模块（SWORD Project 安装）**
- 路径：`D:\Program Files (x86)\CrossWire\The SWORD Project\modules\texts\ztext\kjv`
- NT: 27/27 卷 ✅，OT: 39/39 卷 ✅
- 总 `<w>` 标签量：~418K（NT ~170K + OT ~248K）
- 许可：Public Domain
- 成本：零，本地读取，无 API 依赖

### 2.2 数据格式

```xml
<w lemma="strong:G4074" lemma.TR="πετρος" morph="robinson:N-NSM" src="3">Peter</w>
```

| 属性 | 含义 | 示例值 |
|---|---|---|
| `lemma="strong:G4074"` | Strong's 编号 | G=希腊文, H=希伯来文 |
| `lemma.TR="πετρος"` | 希腊/希伯来原文 | Textus Receptus |
| `morph="robinson:N-NSM"` | Robinson 形态编码 | N=名词, NSM=主格单数阳性 |
| `src="3"` | 词在经节内位置 | 第3个`<w>`标签 |

特殊处理：
- `src="5p"` — 插入语(paren)，不按 src 顺序排列
- 多值属性：`strong:G3588 strong:G2316` — 一词对应多个原文词
- `<transChange type="added">` — KJV 斜体添加词（原文无对应）

### 2.3 实现方案

**数据库设计：**
```sql
CREATE TABLE words (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    verse_id    BIGINT NOT NULL,          -- FK → verses
    position    INT NOT NULL,             -- src 属性值
    text        VARCHAR(255) NOT NULL,    -- 英文词
    strongs     VARCHAR(20),              -- G4074 / H7225
    lemma       VARCHAR(255),             -- πετρος / ראשׁית
    morphology  VARCHAR(50),              -- robinson:N-NSM
    is_parenthetical BOOLEAN DEFAULT FALSE
);
CREATE INDEX idx_words_verse ON words(verse_id);
```

**API 设计：**
```
GET /api/v1/bible/interlinear/kjv/1Pet/1
→ {
    verse: 1,
    words: [
      {pos:1, text:"Peter", strongs:"G4074", lemma:"πετρος", morph:"N-NSM"},
      {pos:2, text:"an apostle", strongs:"G652", lemma:"αποστολος", morph:"N-NSM"},
      ...
    ]
  }
```

**导入流程：**
1. 扫描 KJV `ot.bzz` + `nt.bzz`，找到 66 个 zlib 块的偏移量
2. 逐块解压 → 正则提取 `<w>` 标签
3. 建立 verse_id 映射（已有 KJV 经文在 verses 表中）
4. 批量 INSERT 到 words 表

---

## 三、历史决策记录

### 3.1 已废弃方案
| 方案 | 废弃原因 | 日期 |
|---|---|---|
| JSword 库集成 | CrossWire Maven 仓库 404，JitPack API 不兼容 | 2026-04-30 |
| bible-api.com 在线 | 用户决定自建 | 2026-05-01 |
| FixCUV.java 编码修复 | ISO-8859-1→UTF-8 转换损坏数据 | 2026-05-23 |
| H2 RunScript CLI charset | 当前 H2 版本不支持 charset 参数 | 2026-05-24 |
| 逐节 HTTP API 导入字典 | 231MB DB 导致 HTTP 500 | 2026-05-31 |
| v2 字典子索引解析 | break 条件过早，仅 47% | 2026-05-31 |
| v3 字典正则扫描 | HTTP 批量导入 OOM | 2026-05-31 |

### 3.2 关键技术发现
- H2 在 Windows 上 RunScript 默认 GBK → 需 Java JDBC 显式 UTF-8
- SWORD zCom4 格式 = 标准 zlib（非 LZSS），BZS 索引 stride=3
- zLD 格式 = zdx 索引(8B/条) + zdt zlib 压缩块，部分有子索引层
- PowerShell 终端无法显示希腊/希伯来字符，但 Python 文件写入正常
- Gateway CORS 用 `addAllowedOriginPattern("*")` 替代固定域名
- NestJS 在 Windows 上 `background:true` 会 SIGKILL → 用 `Start-Process -WindowStyle Hidden`

### 3.3 当前系统状态
- **服务**：Gateway :8080 / Text :8081 / Search :8082 / Frontend :3000
- **数据**：22 译本 + 10 注释源 + 3 词典(18,629条) + Strong's(14,341条)
- **H2 数据库**：~231MB
- **前端**：双语 UI，双语对照，TTS 朗读，注释面板，词典弹窗

---

## 四、开发路线图

### P0 — Interlinear 逐词对照（当前）
- [ ] words 表设计 + 实体
- [ ] KJV 66卷 zlib 块扫描导入脚本
- [ ] API `/api/v1/bible/interlinear/{t}/{b}/{c}`
- [ ] 前端逐行对照视图

### P1 — Module Service 模块化
- [ ] module-index.json 注册表格式
- [ ] Module Service 端点（available/install/remove/status）
- [ ] 导入脚本改造为「输出到独立 SQLite」
- [ ] CrossWire 仓库镜像（或自建 CDN）

### P2 — 前端增强
- [ ] 分屏多译本对比
- [ ] 阅读计划
- [ ] 笔记/书签持久化
- [ ] 移动端响应式优化
