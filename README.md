# bible-microservices 备份

**备份时间**: 2026-05-29 10:10 CST
**备份大小**: 573.5 MB (源码+数据+部署包)
**源路径**: C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices

## 项目概述

基于 Spring Boot 3.2 + Kotlin 的圣经微服务系统，4 服务架构：
- **Gateway** (:8080) — API 网关/路由/CORS
- **Text** (:8081) — 经文查询/译本管理/Strong's 词典
- **Search** (:8082) — Lucene 全文检索
- **Module** (:8083) — 模块导入/格式解析

## 当前数据

| 类别 | 数量 |
|------|------|
| 译本 | 13 个 (英文7 + 中文2 + 希腊2 + 拉丁1 + 希伯来1) |
| 经文 | 23.2万+ 节 |
| Strong's 词典 | 14,341 条 (希腊5,667 + 希伯来8,674) |
| TSK 交叉引用 | 29,059 条 (52/66 书卷) |
| 注释 | JFB 602 + MHCC 524 |
| 搜索索引 | 13 个 Lucene 索引 |
| 前端 | 三栏暗色主题，多版本对照，中英双语 |
| 回归测试 | 74 项全通过 |

## 部署要求

- **运行环境**: Java 17+ (推荐 OpenJDK 17)
- **系统**: Windows / Linux (cloud-deploy 包支持 Linux)
- **端口**: 8080-8083, 3000
- **数据库**: H2 文件数据库 (data/text-db.mv.db, 121 MB)

## 目录结构

```
bible-microservices/
├── bible-gateway/         # API 网关源码
├── bible-text-service/    # 经文服务源码
├── bible-search-service/  # 搜索服务源码
├── bible-module-service/  # 模块服务源码
├── frontend/              # 前端 SPA
├── data/                  # 数据库 + 搜索索引 + SWORD 模块
├── scripts/               # 导入脚本 + 工具
├── cloud-deploy/          # Linux 云部署包 (含 4 个 JAR)
├── tests/                 # 回归测试套件
└── artifacts/             # 任务文档
```

## 快速启动

```bash
# 方式 1: Gradle 启动 (Windows)
gradlew.bat :bible-text-service:bootRun
gradlew.bat :bible-search-service:bootRun
gradlew.bat :bible-gateway:bootRun

# 方式 2: JAR 启动 (Linux)
cd cloud-deploy && ./start.sh

# 方式 3: 前端
cd frontend && python -m http.server 3000
```

启动顺序: Text → Search → Module → Gateway，每个等待 15-30 秒。

## 同步

- GitHub: 待推送
- 云服务器: cloud-deploy/ 目录上传即可
# bible-microservices — 圣经微服务系统

**最后更新**: 2026-06-02 CST  
**项目路径**: `C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices`  
**数据库**: H2 文件数据库 `data/text-db.mv.db` (~231 MB)

---

## 项目概述

基于 Spring Boot 3.2 + Kotlin 的圣经学习微服务系统，灵感来自 AndBible，支持本地运行、服务器部署、多端适配。自研 SWORD 格式解析引擎，不依赖 JSword 库。

**4 服务架构**:
- **Gateway** (:8080) — API 网关 / 路由聚合 / CORS
- **Text** (:8081) — 经文查询 / 译本管理 / 注释 / Strong's 词典 / 字典
- **Search** (:8082) — Lucene 全文检索（22 索引）
- **Module** (:8083) — SWORD 模块导入 / 格式解析

**前端**: 纯静态 SPA (:3000)，三栏暗色主题，22 译本支持，多版本对照，中英双语界面。

---

## 当前数据 (2026-06-02)

| 类别 | 数量 | 说明 |
|------|------|------|
| **译本** | 22 | 英文 9 + 中文 3 + 希腊文 4 + 拉丁文 1 + 希伯来文 2 + 俄文 1 + 撒玛利亚五经 1 |
| **经文** | ~35 万节 | 涵盖 66 正典 + 次经 / 伪经 |
| **Strong's 词典** | 14,341 条 | 希腊文 5,667 + 希伯来文 8,674 |
| **TSK 交叉引用** | 29,059 条 | 52/66 书卷覆盖 |
| **注释源** | 10 | JFB / MHCC / MHC / Clarke / Calvin / Barnes / RWP / Catena / TSK / Wesley |
| **词典源** | 3 | Easton (3,961) / ISBE (9,349) / Nave (5,319) — 共 18,629 条 |
| **搜索索引** | 22 | 每个译本独立 Lucene 索引 |
| **前端** | 中英双语 | TTS 朗读 / 多版本对照 / 注释面板 / 字典搜索 / Strong's 弹窗 |

---

## 译本清单 (22)

### 英文 (9)
| ID | 名称 | 年代 |
|----|------|------|
| `asv` | American Standard Version | 1901 |
| `bbe` | Bible in Basic English | 1949 |
| `bsb` | Berean Standard Bible | 2016 |
| `dby` | Darby Bible | 1890 |
| `drc` | Douay-Rheims (Challoner) | 1752 |
| `geneva1599` | Geneva Bible | 1599 |
| `kjv` | King James Version | 1611 |
| `wbt` | Webster's Bible | 1833 |
| `web` | World English Bible | 2000 |
| `ylt` | Young's Literal Translation | 1862 |

### 中文 (3)
| ID | 名称 |
|----|------|
| `cuv_gb` | 和合本 简体 |
| `cuv_tw` | 和合本 繁体 |
| `chincvs` | 中文新译本 |

### 希腊文 (4)
| ID | 名称 |
|----|------|
| `lxx` | Septuagint (七十士译本) |
| `byz` | Byzantine Greek NT |
| `tr` | Textus Receptus (1550/1894) |
| `sblgnt` | SBL Greek New Testament |
| `morphgnt` | Morphologically Parsed GNT |

### 希伯来文 (2)
| ID | 名称 |
|----|------|
| `oshb` | Open Scriptures Hebrew Bible |
| `sp` | Samaritan Pentateuch |

### 其他 (2)
| ID | 名称 |
|----|------|
| `vulgate` | Latin Vulgate (武加大译本) |
| `russynodal` | Russian Synodal Bible |

---

## 注释源 (10)

| ID | 名称 | 覆盖 | 类型 |
|----|------|------|------|
| `JFB` | Jamieson Fausset Brown | NT+OT | 节级 |
| `MHCC` | Matthew Henry Concise | 66 卷 | 章级 |
| `MHC` | Matthew Henry Complete | 32/66 卷 | 章级 |
| `Clarke` | Adam Clarke | 32/66 卷 | 章级 |
| `Calvin` | John Calvin | 28 卷 | 节级 |
| `Barnes` | Barnes' NT Notes | 18 卷 | 章级 |
| `RWP` | Robertson's Word Pictures | 27 卷 | 章级 |
| `Catena` | Catena Aurea (Thomas Aquinas) | 4 福音书 | 节级 |
| `TSK` | Treasury of Scripture Knowledge | 52/66 卷 | 交叉引用 |
| `Wesley` | John Wesley's Notes | OT=Genesis / NT=全部 | 连续注释 |

---

## 词典源 (3)

| ID | 名称 | 条目数 |
|----|------|--------|
| `easton` | Easton's Bible Dictionary | 3,961 |
| `isbe` | International Standard Bible Encyclopedia (1915) | 9,349 |
| `nave` | Nave's Topical Bible | 5,319 |

---

## 目录结构

```
bible-microservices/
├── bible-gateway/         # API 网关源码 (Spring Boot 3.2 + Kotlin)
├── bible-text-service/    # 经文服务源码 (核心数据层)
├── bible-search-service/  # 搜索服务源码 (Lucene 索引)
├── bible-module-service/  # 模块服务源码 (SWORD 导入)
├── frontend/              # 前端 SPA (纯 HTML/CSS/JS)
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js          # 主逻辑 (~1200 行)
├── data/
│   ├── text-db.mv.db      # H2 数据库 (~231MB)
│   ├── lucene-index/      # 22 个 Lucene 搜索索引
│   └── sword-mods/        # SWORD 模块原始 zip
├── scripts/               # 数据导入脚本 (Python + Java)
├── cloud-deploy/          # Linux 云部署包 (含 4 JAR + start.sh)
├── tests/                 # 回归测试
├── build.gradle.kts       # Gradle 构建 (Maven 仓库)
├── settings.gradle.kts
└── README.md
```

---

## 快速启动

### 前提条件
- **Java 17+** (推荐 OpenJDK 17，scoop 安装路径: `C:\Users\PC\scoop\apps\openjdk17\current`)
- **Python 3** (导入脚本 / 前端 HTTP 服务)
- **Node.js** (前端 JS 验证)

### 方式 1: Gradle 启动 (Windows 开发)

```powershell
cd C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices

# 按顺序启动，每个等待 15-30 秒确认 HTTP 就绪
$env:JAVA_HOME = "C:\Users\PC\scoop\apps\openjdk17\current"

# 1. Text Service (:8081) — 启动最慢 (~90s，数据库大)
Start-Process -WindowStyle Hidden -FilePath gradlew.bat `
  -ArgumentList ":bible-text-service:bootRun"

# 2. Search Service (:8082) — ~30s
Start-Process -WindowStyle Hidden -FilePath gradlew.bat `
  -ArgumentList ":bible-search-service:bootRun"

# 3. Module Service (:8083) — 可选
Start-Process -WindowStyle Hidden -FilePath gradlew.bat `
  -ArgumentList ":bible-module-service:bootRun"

# 4. Gateway (:8080) — ~15s
Start-Process -WindowStyle Hidden -FilePath gradlew.bat `
  -ArgumentList ":bible-gateway:bootRun"
```

### 方式 2: JAR 启动 (生产 / Linux)

```bash
# 使用 cloud-deploy 包
cd cloud-deploy
chmod +x start.sh
./start.sh

# 或手动逐个启动
java -jar text-service.jar &
java -jar search-service.jar &
java -jar gateway.jar &
```

### 方式 3: 构建 JAR

```powershell
cd C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices
$env:JAVA_HOME = "C:\Users\PC\scoop\apps\openjdk17\current"
.\gradlew.bat clean build -x test
# JAR 生成于各子服务 build/libs/ 目录
```

### 方式 4: 前端启动

```powershell
cd frontend
python -m http.server 3000
# 或
Start-Process -FilePath "python" -ArgumentList "-m","http.server","3000" -WorkingDirectory "frontend" -WindowStyle Hidden
```

### 健康检查

```powershell
Invoke-RestMethod http://localhost:8080/api/v1/bible/translations  # Gateway
Invoke-RestMethod http://localhost:8081/api/v1/bible/translations  # Text
Invoke-RestMethod http://localhost:8082/api/v1/search?query=God&translation=kjv  # Search
Invoke-RestMethod http://localhost:3000  # Frontend
```

### 停止服务

```powershell
# 查找并杀掉 Java 进程
Get-Process java | Stop-Process -Force
# 或精确杀掉
netstat -ano | Select-String ":8080" | ForEach-Object { ... }

# Linux
./cloud-deploy/stop.sh
```

---

## API 接口文档

所有接口通过 Gateway (:8080) 统一访问，前缀 `/api/v1`。

### 译本 & 经文

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/bible/translations` | 译本列表 (22) |
| GET | `/bible/{translation}/books` | 某译本的书卷列表 |
| GET | `/bible/{translation}/{book}/{chapter}` | 某章所有经文 |
| GET | `/bible/{translation}/{book}/{chapter}/{verse}` | 单节经文 |

### 搜索

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/search?query=...&translation=...&size=...` | 全文搜索 |
| POST | `/search/index/{translation}` | 为某译本建索引 |

### 注释

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/annotations/commentary-sources` | 注释源列表 (10) |
| GET | `/annotations/commentaries/{book}/{chapter}?source=...` | 某章节注释 |
| POST | `/annotations/import-commentary` | 导入注释 |

### Strong's 词典

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/strongs/{id}` | 查询 Strong's 编号 (G1-G5667, H1-H8674) |
| GET | `/strongs/search?q=...` | 搜索 Strong's 条目 |

### 字典

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/annotations/dictionary-sources` | 字典源列表 (3) |
| GET | `/annotations/dictionaries/{source}?search=...` | 字典搜索 |

---

## 前端功能

### 核心阅读
- 📖 **22 译本切换**: 左侧栏下拉选择，实时加载
- 📚 **书卷导航**: 66 卷旧约/新约分类，快速跳转
- 🔢 **章节网格**: 点击弹出章节跳转网格
- 📝 **逐节渲染**: 每节可单独点击 Strong's 分析

### 多版本对照
- 👥 **双语/三语对比**: 最多同时对比 3 个译本
- 📐 **Grid/Row 布局**: 对照显示可选网格或行布局
- 🔤 **双语模式**: 中文译本显示 "中文名 / English Name"

### 注释系统
- 📑 **标签页切换**: 10 个注释源独立标签
- 🗂️ **按章节加载**: 切换书卷/章节自动刷新
- 📜 **长内容滚动**: 注释面板支持 max-height 滚动

### 字典系统
- 📖 **3 词典源**: Easton + ISBE + Nave
- 🔍 **字典搜索**: 独立弹窗，关键词检索
- 📄 **条目展示**: 富文本 HTML 渲染

### Strong's 词典
- 🏷️ **单词可点击**: 经文中单词点击弹出 Strong's 面板
- 🔤 **希腊/希伯来原文**: 显示原文字母 + 定义
- 📎 **词形映射**: 希伯来文 300,764 词形映射

### TTS 语音朗读
- 🔊 **逐节朗读**: 点击节编号 → 浏览器原生 TTS
- 📢 **整章朗读**: 章节标题旁按钮连续朗读
- 🌐 **自动语言检测**: 中文选 cmn/zh 语音，英文选 en 语音
- 💡 **双语提示**: 节编号 hover 显示 "点击朗读本节 / Click to hear verse"

### 国际化
- 🌍 **三语模式**: 双语 / 中文 / 英文
- 🏷️ **22 译本中英文名映射**
- 📝 **10 注释源中英文名映射**
- 📖 **3 字典源中英文名映射**

### 其他
- 🌙 **暗色主题**: 暖棕色调，阅读舒适
- 📱 **响应式设计**: 桌面三栏 / 平板两栏 / 手机单栏
- ⚡ **防抖搜索**: 350ms 防抖

---

## 启动顺序与等待时间

| 顺序 | 服务 | 端口 | 启动时间 | 说明 |
|------|------|------|----------|------|
| 1 | Text Service | 8081 | ~90s | 数据库 231MB，H2 加载慢 |
| 2 | Search Service | 8082 | ~30s | 22 个 Lucene 索引加载 |
| 3 | Module Service | 8083 | ~15s | 可选，不启动不影响阅读 |
| 4 | Gateway | 8080 | ~15s | 聚合路由，CORS 配置 |
| 5 | Frontend | 3000 | 即时 | Python http.server |

**重要**: 必须等前一个服务 HTTP 就绪再启下一个。

---

## 历次变更 (Timeline)

### 2026-04-30 ~ 2026-05-02 — 项目启动
- 尝试集成 JSword (Java SWORD 库) → 失败 (CrossWire Maven 仓库 404，JitPack API 不兼容)
- 决策: 放弃 JSword，自研格式解析
- 微服务架构骨架搭建: Gradle 多模块 + Spring Boot 3.2 + Kotlin

### 2026-05-02 ~ 2026-05-03 — 4 服务骨架
- Gateway / Text / Search / Module 源码结构建立
- Gradle 构建配置，Docker Compose 准备
- H2 数据库 schema 设计 (TRANSLATIONS / BOOKS / VERSES)

### 2026-05-21 — KJV 导入 & Gradle 构建成功
- KJV 36,820 节 81 卷导入完成
- 修复 5 个 Bug: BookRepository 大小写 → IgnoreCase, 分批导入数据丢失, 字段名兼容映射, chapterCount 逻辑
- Gradle 构建成功，4 个 fat JAR 生成

### 2026-05-22 ~ 2026-05-23 — CUV 中文 & 注释
- CUV 简体导入 (和合本)，发现 H2 RunScript Windows GBK 编码问题
- TSK 交叉引用导入: 29,059 条 → HTTP API 575 rec/s
- SWORD zCom 格式首次逆向: zlib 解压 + ThML 解析

### 2026-05-24 — 搜索 & 更多译本
- 8 译本 Lucene 搜索索引完成
- SmartChineseAnalyzer 用于中文分词
- CUV 中文乱码修复: H2 RunScript GBK 陷阱 → JDBC UTF-8 直接导入

### 2026-05-25 — 前端 & Strong's
- 前端双语 UI: TRANSLATION_NAMES 映射 9 译本中英文名
- Strong's 希腊文词典: 5,667 条目 (zLD 格式，小端序)
- 前端三栏布局: 侧栏 260px / flex 经文排印 / 三档响应式

### 2026-05-26 — Strong's 希伯来文
- Strong's 希伯来文词典: 8,674 条目 (rawLD 纯文本)
- 希伯来词汇映射: 8,640 个 H 编号 → 300,764 词形 (morphhb npm 包 OSIS XML)
- 前端单词点击弹出 Strong's 词典面板

### 2026-05-27 — 注释 & 测试
- 前端注释面板修复: CORS + JS 语法错误
- JFB 602 条 + MHCC 524 条注释导入完成
- CUV 繁体导入，74 项回归测试创建

### 2026-05-29 — OSHB & MHC
- OSHB 希伯来文旧约导入: 39 卷 23,213 节，lxml + JDBC
- MHC 完整注释: zCom4 格式 → 标准 zlib，524 章/32 卷
- 注释数据限制: CrossWire 原始数据仅覆盖部分书卷
- 系统备份: D:\bible-microservices-backup\ (573.5 MB)

### 2026-05-30 — 批量导入 22 译本 & 注释 & 字典
- **译本**: 新增 9 个 → 总计 22 (TR/SBLGNT/MorphGNT/SP/BSB/Geneva1599/DRC/ChiNCVs/RussianSynodal)
- **注释**: 新增 5 个 (Clarke/Calvin/Barnes/RWP/Catena) → 总计 8
- **字典**: Easton 133 + ISBE 313 + Nave 178 → 624 条目 (首次导入有 bug，合并为单条)
- **前端崩溃修复**: app.js UTF-8 多字节字符损坏 → 从 D 盘备份恢复
- zCom4 格式确认: 全部为标准 zlib 压缩，BZS 索引 0,3,6... 为有效块

### 2026-05-31 — 字典重导入 & 前端修复
- **字典重导入 (v4 JDBC)**: Easton 3,961 + ISBE 9,349 + Nave 5,319 = 18,629 条
- zLD 子索引解析修复: 过滤二进制垃圾数据 (子索引包装块 <entryFree> 标签)
- 前端 Bug 修复: 字典 URL 双重前缀 + COMMENTARY_NAMES 重复声明
- 数据库涨至 231MB

### 2026-06-01 — 服务恢复 & 词典/注释分离 & 前端大改
- 服务全量重启验证 (Gateway:8080 / Text:8081 / Frontend:3000)
- **词典/注释分离**: 后端 `getAllCommentarySources()` 过滤掉 Easton/ISBE/Nave
- **前端语言切换**: 注释源/字典源名称支持三语 (双语/中文/英文)
- **UI 优化**: 章节导航双位置 (顶部+底部)，注释面板滚动条
- **I18N 完善**: 12+ 新增 key，修复英文残留中文值

### 2026-06-01 ~ 2026-06-02 — Wesley 注释
- Wesley SWORD 模块: zCom 格式，OT 仅 Genesis(353K chars)，NT 全连续(196K chars)
- BZS 是交叉引用入口点而非书卷边界，scripRef 跳来跳去
- 最终导入: GEN/1 + MAT/1 两条记录，前端删除独立加载器 (~130 行)
- TTS "Read Chapter" 按钮 i18n

### 2026-06-02 — TTS 双语提示 & 备份
- 节编号点击提示双语化: "点击朗读本节 / Click to hear verse"
- 完整 README 文档编写
- 代码备份至 D:\dev\github\bible-microservices

---

## 格式解析技术积累

### SWORD 模块格式
| 格式 | 用途 | 特点 |
|------|------|------|
| **zText** | 圣经译本 | Block=BOOK, Compress=ZIP (标准 zlib) |
| **zCom/zCom4** | 注释 | BZS 8 字节索引 (offset+size)，zlib 压缩块 |
| **zLD** | 词典 | zdx 索引 + zdt zlib 压缩数据，两层结构 (Easton/ISBE) |
| **RawLD** | 旧版词典 | 无 zdx/zdt，纯文本 |

### 关键发现
- zCom4 全部为标准 zlib (非 LZSS)，索引模式: 0,3,6... 为有效块
- zLD 子索引: entry 0 解压后含 3,158 子条目，仅 1 条有效 XML，其余为二进制包装块
- BZS 偏移量是压缩文件空间而非解压文本空间
- BZV 多数 key=0，不可用于 verse 映射
- Windows H2 RunScript 默认 GBK 编码，必须用 JDBC + InputStream 显式 UTF-8

### 已知数据限制
- CrossWire SWORD 模块数据不完整: Clarke/MHC 仅 32/66 卷
- Strong's 希伯来文 1890 版无希伯来字符，仅 ASCII 音译
- Wesley OT 仅 Genesis 注释
- Gill 注释不在 CrossWire 仓库，需从 CCEL/StudyLight 获取

---

## 待处理

### P1 (高优先级)
- [ ] 中文搜索分词优化 (SmartChineseAnalyzer 高亮不精准)
- [ ] 分屏对比模式 (两个独立阅读面板)
- [ ] TTS 朗读计划 (每日经文推送)
- [ ] 移动端优化 (触控翻页 + 注释面板下拉)

### P2
- [ ] 阅读计划功能
- [ ] 笔记 / 书签持久化
- [ ] 深色/浅色主题切换
- [ ] Gill 注释获取与导入
- [ ] Strong's 希伯来文新版数据源 (含希伯来字符)

### P3
- [ ] Module Service 导入接口 (POST /api/v1/modules/import-url)
- [ ] Gateway 反向代理前端静态文件
- [ ] 容器化部署 (Docker Compose 完善)
- [ ] 云服务器实际部署

---

## 技术栈

- **后端**: Spring Boot 3.2 + Kotlin + Gradle (Maven)
- **数据库**: H2 File Database (embedded)
- **搜索**: Apache Lucene 9.x
- **前端**: Vanilla JS + CSS3 + HTML5
- **语音**: Web Speech API (SpeechSynthesis)
- **格式解析**: Python (zlib/lxml/jaydebeapi) + Java JDBC

## 环境要求

| 依赖 | 版本 | 路径 (Windows) |
|------|------|----------------|
| JDK | 17+ | `C:\Users\PC\scoop\apps\openjdk17\current` |
| Python | 3.12+ | `C:\Users\PC\AppData\Local\Programs\Python\Python312\python.exe` |
| Node.js | 22+ | (系统 PATH) |

## 相关文件

- 备份: `D:\bible-microservices-backup\` (573.5 MB)
- GitHub 镜像: `D:\dev\github\bible-microservices\`
- 任务文档: `artifacts/`
- 版权清单: `COPYRIGHTS.md`

---

## 2026-06-02 更新

### TTS 双语提示
- 新增 I18N 键 `verseClickHint`: 中"点击朗读本节" / 英"Click to hear verse"
- 双语模式: "点击朗读本节 / Click to hear verse"
- 经节编号 title 属性动态获取

### Wesley 注释修复
- 分析 Wesley SWORD 模块：OT 仅 Genesis，NT 连续注释流
- 重新导入为 2 条记录（GEN/1 + MAT/1）
- 删除前端独立加载器 (~130 行)，Wesley 通过标准注释流程加载

### 部署配置化
- 新增 `frontend/js/config.js`：三种模式 (local/production/auto)
  - `local`: API → `http://localhost:8080/api/v1`
  - `production`: API → `/api/v1`（相对路径，配合 Nginx 反代）
  - `auto`: 根据 hostname 自动检测
- `api.js`: 删除硬编码 API_BASE
- `app.js`: `var API = APP_CONFIG.apiBase`
- `CorsConfig.kt`: 新增 usebible.com 白名单
- 多域名支持 (usebible.com / www.usebible.com) 通过 Nginx + CORS 实现
- SSL 建议使用 Let's Encrypt (免费)，非必须但强烈建议

### 修改文件
- `frontend/js/config.js` (新增)
- `frontend/js/api.js` (API_BASE 配置化)
- `frontend/js/app.js` (API 变量 + 删除 Wesley 独立函数 + verseClickHint)
- `frontend/index.html` (加载顺序 config→api→app)
- `bible-gateway/.../CorsConfig.kt` (新增域名白名单)
- `README.md` (本次更新)
