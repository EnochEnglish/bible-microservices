# Bible Microservices 系统架构

## 概览

Bible Microservices 是一个自托管的圣经学习微服务系统，支持多版本对照、逐词原文分析、注释、词典、灵修等功能。设计目标是与 AndBible / JSword / Logos 等专业圣经软件对标，同时保持完全的自主可控。

## 架构图

`
┌──────────────────────────────────────────────────────────────┐
│                     Browser (前端 SPA)                         │
│            http://localhost:3000  (npx serve)                  │
└──────────┬───────────────────────────────────────────────────┘
           │ /api/*
           ▼
┌──────────────────────────────────────────────────────────────┐
│              Frontend Proxy (server.js :3000)                   │
│  静态文件 serve + API 代理到 Gateway :8080                     │
└──────────┬───────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│                 Gateway (:8080) - Spring Boot                   │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ 路由分发:                                                │  │
│  │   /api/v1/bible/*        → bible-text-service   :8081    │  │
│  │   /api/v1/search/*       → bible-search-service :8082    │  │
│  │   /api/v1/annotations/*  → bible-text-service   :8081    │  │
│  │   /api/v1/strongs/*      → bible-text-service   :8081    │  │
│  │   /api/v1/sword/*        → bible-sword-service  :8086    │  │
│  │   /api/v1/module/*       → bible-module-service :8083    │  │
│  └─────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
           │
    ┌──────┼───────┬──────────┐
    ▼      ▼       ▼          ▼
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│ Text │ │Search│ │Module│ │Sword │
│ :8081│ │:8082 │ │:8083 │ │:8086 │
│      │ │      │ │      │ │      │
│ H2   │ │H2    │ │H2    │ │JSword│
│ DB   │ │索引  │ │DB    │ │引擎  │
└──────┘ └──────┘ └──────┘ └──────┘
`

## 微服务详解

### bible-gateway (:8080)
- **职责**: API 网关，路由分发
- **技术**: Spring Cloud Gateway (Kotlin)
- **CORS**: ddAllowedOriginPattern("*")

### bible-text-service (:8081)
- **职责**: 圣经正文、Strong's词典、注释、笔记、书签、交叉引用
- **数据库**: H2 file-based (data/text-db.mv.db, ~231MB)
- **译本**: 22+ 译本（H2 存储）
- **核心 API**:
  - GET /api/v1/bible/{transl}/{book}/{chapter}[/{verse}]
  - GET /api/v1/bible/{transl}/interlinear/{book}/{chapter}
  - GET /api/v1/strongs/{id}
  - GET /api/v1/annotations/commentaries/{book}/{chapter}
  - GET /api/v1/text/notes/{verseRef} (笔记 CRUD)
  - GET /api/v1/text/bookmarks/{verseRef} (书签 CRUD)
  - GET /api/v1/text/crossrefs (TSK 交叉引用)

### bible-search-service (:8082)
- **职责**: 全文搜索，Lucene 索引
- **数据库**: H2 + Lucene 索引
- **核心 API**:
  - GET /api/v1/search/{transl}?query=
  - POST /api/v1/search/index/{transl}

### bible-module-service (:8083)
- **职责**: 模块元数据管理（H2 存储的模块信息）
- **核心 API**: 模块 CRUD

### bible-sword-service (:8086)
- **职责**: SWORD 格式模块的原生解析（基于 JSword）
- **引擎**: JSword (CrossWire) — 全格式支持
- **模块**: 16 Bible + 5 Dictionary + 1 Commentary + 2 Devotion + 1 GenBook
- **核心 API**:
  - GET /api/v1/sword/{module}/passage/{ref} (with ?strongs=true)
  - GET /api/v1/sword/{module}/dict/{key}
  - GET /api/v1/sword/genbook/{module}/keys
  - GET /api/v1/sword/modules
  - GET /api/v1/sword/install/available?source=
  - POST /api/v1/sword/install

### bible-sword-reader
- **职责**: JSword 基础设施库
- **关键修复**: LuceneIndexManager stub 类（解决 ClassNotFoundException）
- **模块驱动**: SwordBookDriver

## 前端 (:3000)

- **文件**: rontend/js/app.js (2282+ 行, 122 函数)
- **状态管理**: 全局 state 对象
- **渲染**: 纯 DOM 操作, 无框架
- **i18n**: 中/英/双语三模式 (I18N 对象 + 	() 函数)
- **代理**: server.js 将 /api/* 转发到 Gateway :8080

详细前端架构见 [FRONTEND-ARCHITECTURE.md](./FRONTEND-ARCHITECTURE.md)

## 数据层

### H2 数据库 (bible-text-service)
`
data/text-db.mv.db (~231MB)
├── TRANSLATIONS        — 译本注册
├── BOOKS              — 书卷（FK→TRANSLATIONS）
├── VERSES             — 经文（FK→BOOKS, 含 chapter/verse/text/verseKey）
├── COMMENTARIES       — 注释（按 bookId/chapter）
├── DICTIONARIES       — 词典/百科条目
├── STRONGS            — Strong's 编号定义
├── NOTES              — 用户笔记
└── BOOKMARKS          — 用户书签
`

### SWORD 模块 (bible-sword-service)
`
data/sword-mods/  (JSword 管理)
├── KJV/              — King James Version (zText)
├── ChiUns/           — 中文简体 + Strong's (zText)
├── ChiUn/            — 中文繁体 + Strong's (zText)
├── OSHB/             — 希伯来文旧约
├── LXX/              — 七十士译本
├── TR/               — Textus Receptus
├── StrongsGreek/     — 希腊文词典 (RawLD)
├── StrongsHebrew/    — 希伯来文词典 (RawLD)
├── ISBE/             — 国际标准圣经百科 (RawLD)
├── Easton/           — Easton 圣经词典 (RawLD)
├── Nave/             — Nave 主题词典 (RawLD)
├── MHCC/             — Matthew Henry 注释 (zCom)
├── SME/              — Spurgeon 晨更灵修 (RawGenBook)
├── DCD/              — Daily Christian Devotions (RawGenBook)
└── ...
`

## 技术栈

| 层 | 技术 |
|----|------|
| 构建 | Gradle 8.x (Kotlin DSL) |
| 后端语言 | Kotlin |
| 后端框架 | Spring Boot 3.x |
| 数据库 | H2 (file-based) |
| 搜索引擎 | Apache Lucene |
| SWORD 引擎 | JSword (CrossWire) |
| 前端 | 原生 HTML/CSS/JS (无框架) |
| 前端 serve | npx serve 或 Python http.server |
| JDK | 17 (通过 scoop 安装) |
| OS | Windows 11 |

## 数据源

- **H2 译本**: open-bibles GitHub（OSIS/USFX/Zefania XML）
- **SWORD 模块**: CrossWire (crosswire.org)
- **特殊格式**: zText (经文), zCom/zCom4 (注释), RawLD/zLD (词典), RawGenBook (灵修/通用书)

## 关键设计决策

1. **放弃 JSword 直接集成** → 自研 XML 解析 + 后期引入 JSword 作为 SWORD 服务
2. **H2 而非 PostgreSQL** → 简化部署，零配置
3. **前端无框架** → 保持轻量，避免构建步骤
4. **server.js 代理** → 最轻量 CORS 方案，零后端改动
5. **SWORD 服务独立** → JSword 依赖隔离，可选启用