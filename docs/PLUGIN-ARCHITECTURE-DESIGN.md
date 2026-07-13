# 动态插件架构 + Zvec 知识库设计方案

## 一、现有系统架构分析

```
bible-monolith (Spring Boot 3.x, Kotlin, JDK 17, 端口 8080)
├── config/     — SecurityConfig, CorsConfig, SwordConfig, DataInitializer
├── controller/ — 27 个 REST Controller（Bible/Course/Auth/Library/Settings...）
├── service/    — 18 个 Service（BibleText/Course/Domain/Sword/Annotation...）
├── model/      — 22 个 JPA 实体（User/Course/Verse/Translation/DomainConfig...）
├── repository/ — 20 个 Spring Data JPA Repository
├── dto/        — 8 个 DTO 包
├── parser/     — Bible 解析器（OSIS/USFX/Zefania）
└── security/   — JWT 认证过滤器

frontend (Node.js 静态服务, 端口 3000)
├── index.html  — 桌面版主页面（topbar 按钮硬编码）
├── library.html — 图书馆页面
├── courses.html — 课程页面
├── settings.html — 系统设置页面
├── admin.html / org-admin.html / modules.html / login.html
├── js/ — app.js, library.js, courses.js, settings.js, quiz.js, grading.js...
├── css/ — style.css, library.css, courses.css...
├── library-data/ — 94 本书 × ~946 章 JSON 文件
└── server.js — 静态文件服务 + /api/* 代理到 8080
```

**问题**：新增功能需修改 `index.html`（加菜单项）、`SecurityConfig.kt`（加路由权限）、`server.js`（加静态路由）——三处硬编码。

---

## 二、设计目标

1. **动态插件菜单**：后端数据库配置 → 前端自动渲染菜单项 → 新功能零代码改动原有系统
2. **Zvec 知识库**：基于本地图书库 94 本书 × 946 章构建向量索引，支持语义搜索
3. **不接入大模型**：纯向量相似度搜索，不做 RAG 生成
4. **代码解耦**：新功能作为独立模块，不修改任何现有 .kt / .js / .html 文件

---

## 三、动态插件架构设计

### 3.1 数据库模型

```
┌─────────────────────────────────────────────────────────┐
│  plugin_module (插件模块表)                               │
├─────────────────────────────────────────────────────────┤
│  id              BIGINT PK AUTO_INCREMENT                │
│  code            VARCHAR(50)  UNIQUE NOT NULL  -- 插件编码│
│  name_zh         VARCHAR(100) NOT NULL         -- 中文名  │
│  name_en         VARCHAR(100)                 -- 英文名  │
│  icon            VARCHAR(20)                  -- emoji   │
│  description     VARCHAR(500)                 -- 描述    │
│  entry_url       VARCHAR(200) NOT NULL  -- 前端入口URL   │
│  api_prefix      VARCHAR(100)           -- 后端API前缀   │
│  sort_order      INT DEFAULT 0             -- 菜单排序   │
│  is_active       BOOLEAN DEFAULT TRUE       -- 是否启用   │
│  required_role   VARCHAR(20) DEFAULT 'USER' -- 所需角色   │
│  open_in_new_tab BOOLEAN DEFAULT FALSE      -- 新标签打开 │
│  created_at      TIMESTAMP DEFAULT NOW()                 │
│  updated_at      TIMESTAMP DEFAULT NOW()                 │
└─────────────────────────────────────────────────────────┘
```

### 3.2 后端 API 设计（新增文件，不改原有代码）

```
GET  /api/v1/plugins                          → 获取所有启用的插件列表（公开）
GET  /api/v1/plugins/all                      → 获取所有插件（含禁用，管理员）
POST /api/v1/plugins                          → 创建插件（ADMIN）
PUT  /api/v1/plugins/{id}                     → 更新插件（ADMIN）
DELETE /api/v1/plugins/{id}                   → 禁用插件（软删除，ADMIN）
PUT  /api/v1/plugins/{id}/toggle              → 启用/禁用切换（ADMIN）
GET  /api/v1/plugins/{code}/config            → 获取插件配置（公开）
PUT  /api/v1/plugins/{code}/config            → 更新插件配置（ADMIN）
```

### 3.3 前端动态菜单渲染机制

```javascript
// === 新文件: js/plugin-menu.js ===
// 在 DOMContentLoaded 时请求 /api/v1/plugins
// 动态在 topbar 下拉菜单中渲染插件入口
// 不修改 index.html / app.js 任何一行代码

(function() {
  const MENU_CONTAINER_SELECTOR = '.navbar-dropdown'; // 现有下拉菜单容器
  
  async function loadPluginMenu() {
    try {
      const resp = await fetch('/api/v1/plugins');
      const plugins = await resp.json();
      const container = document.querySelector(MENU_CONTAINER_SELECTOR);
      if (!container) return;
      
      plugins.forEach(p => {
        const a = document.createElement('a');
        a.className = 'dropdown-item plugin-menu-item';
        a.href = p.entryUrl;
        if (p.openInNewTab) a.target = '_blank';
        a.dataset.pluginCode = p.code;
        a.innerHTML = `${p.icon} <span data-zh="${p.nameZh}" data-en="${p.nameEn || p.nameZh}">${p.nameZh}</span>`;
        container.appendChild(a);
      });
      
      // 触发语言标签刷新（复用现有 applyLanguageLabels 机制）
      if (typeof applyLanguageLabels === 'function') applyLanguageLabels();
    } catch(e) { console.warn('Plugin menu load failed:', e); }
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadPluginMenu);
  } else {
    loadPluginMenu();
  }
})();
```

### 3.4 插件注册流程

```
管理员后台 (settings.html 新增"插件管理"Tab)
  → 填写插件信息（名称/图标/入口URL/API前缀/角色）
  → POST /api/v1/plugins
  → 数据库写入 plugin_module 表
  → 前端刷新页面时 plugin-menu.js 自动拉取并渲染新菜单项
  → 用户点击菜单 → 打开 entry_url 指向的新功能页面
```

### 3.5 关键约束

| 约束 | 说明 |
|------|------|
| **不改 index.html** | `plugin-menu.js` 通过 `<script>` 标签在 `index.html` 末尾追加一行引入（或通过 server.js 注入） |
| **不改 SecurityConfig.kt** | 插件 API 统一走 `/api/v1/plugins/**` 路径，已在 `permitAll` 通配范围内 |
| **不改 server.js** | 插件前端页面放在 `frontend/plugins/{code}/` 目录，server.js 已有的静态文件服务自动支持 |
| **不改 app.js** | `plugin-menu.js` 是独立文件，通过 MutationObserver 或 DOMContentLoaded 注入菜单 |

**唯一需要的一行改动**：在 `index.html` 底部加一行 `<script src="js/plugin-menu.js"></script>`（或在 server.js 中自动注入）——这是最小侵入。

---

## 四、Zvec 知识库模块设计

### 4.1 Zvec 概述

Zvec 是阿里巴巴开源的轻量级进程内向量数据库：
- **C++ 内核**，Python/Node.js/Go/Rust SDK 绑定
- **无需独立服务**，嵌入应用程序进程
- **支持磁盘索引**（DiskANN），大规模数据不占内存
- **WAL 持久化**，崩溃不丢数据
- **Apache 2.0 协议**，可商用

### 4.2 架构设计

```
┌──────────────────────────────────────────────────────────────┐
│                    bible-monolith (8080)                      │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐   │
│  │           新增：plugins/knowledge-base/                │   │
│  │                                                       │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  │   │
│  │  │ KBController│  │ KBService    │  │ KBIndexer   │  │   │
│  │  │ (REST API)  │  │ (业务逻辑)    │  │ (索引管理)  │  │   │
│  │  └─────────────┘  └──────────────┘  └─────────────┘  │   │
│  │         │                │               │            │   │
│  │         │           ┌────┴────┐          │            │   │
│  │         │           │ ZvecJNI │←─────────┘            │   │
│  │         │           │ (桥接层) │                       │   │
│  │         │           └────┬────┘                        │   │
│  │         │                │                             │   │
│  │  ┌──────┴──────┐  ┌─────┴──────┐  ┌──────────────┐   │   │
│  │  │ KB Document │  │ Zvec Index │  │ Embedding    │   │   │
│  │  │ (H2 表)     │  │ (磁盘文件)  │  │ Service      │   │   │
│  │  └─────────────┘  └────────────┘  └──────────────┘   │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐   │
│  │           现有代码（完全不动）                          │   │
│  │  BibleController / CourseController / Library...       │   │
│  └───────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                    frontend (3000)                            │
│  ┌───────────────────────────────────────────────────────┐   │
│  │  plugins/knowledge-base/                               │   │
│  │    index.html  — 知识库搜索页面                         │   │
│  │    kb.js       — 搜索/索引管理逻辑                      │   │
│  │    kb.css      — 样式                                  │   │
│  └───────────────────────────────────────────────────────┘   │
│  ┌───────────────────────────────────────────────────────┐   │
│  │  js/plugin-menu.js — 动态菜单注入（通用）               │   │
│  └───────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### 4.3 数据模型

#### H2 表：kb_document（知识库文档）

```sql
CREATE TABLE kb_document (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  source_type   VARCHAR(20) NOT NULL,    -- 'library' | 'bible' | 'course' | 'manual'
  source_ref    VARCHAR(200) NOT NULL,    -- 来源引用，如 'library/aizhiyu/001'
  title         VARCHAR(500) NOT NULL,    -- 文档标题
  content       TEXT NOT NULL,            -- 原始文本内容
  content_hash  VARCHAR(64) NOT NULL,     -- 内容哈希（用于增量更新）
  chunk_index   INT DEFAULT 0,            -- 分块索引
  chunk_text    TEXT,                     -- 分块后的文本
  vector_id     VARCHAR(100),             -- Zvec 中的向量 ID
  book_code     VARCHAR(50),             -- 图书编码（library 来源时）
  chapter_id    VARCHAR(20),             -- 章节ID
  category      VARCHAR(50),             -- 分类
  language      VARCHAR(10) DEFAULT 'zh', -- 语言
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW(),
  is_indexed    BOOLEAN DEFAULT FALSE,    -- 是否已索引
  CONSTRAINT uq_kb_doc UNIQUE (source_type, source_ref, chunk_index)
);
```

#### H2 表：kb_index_config（索引配置）

```sql
CREATE TABLE kb_index_config (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  config_key      VARCHAR(50) UNIQUE NOT NULL,
  config_value    VARCHAR(500),
  description     VARCHAR(200)
);
-- 种子数据：
-- ('vector_dim', '768', '向量维度')
-- ('index_type', 'diskann', '索引类型: flat|hnsw|diskann')
-- ('chunk_size', '500', '分块字符数')
-- ('chunk_overlap', '50', '分块重叠字符数')
-- ('distance_metric', 'cosine', '距离度量: cosine|l2|ip')
-- ('zvec_data_path', 'data/zvec', 'Zvec 数据目录')
-- ('embedding_model', 'local-hash', '嵌入模型: local-hash|external-api')
```

### 4.4 嵌入方案（不接入大模型）

由于不接入大模型 RAG，向量嵌入采用以下策略：

#### 方案 A：本地 TF-IDF 哈希嵌入（默认，零依赖）

```
将文本分词 → 计算 TF-IDF → 哈希到固定维度向量 → L2 归一化
```

```kotlin
// 纯 Kotlin 实现，无需任何外部依赖
class LocalHashEmbedding(
    private val dim: Int = 768,
    private val vocab: Map<String, Int> = emptyMap()
) {
    /**
     * 将文本转换为固定维度的稠密向量
     * 使用字符级 n-gram + 词级 TF-IDF 双通道哈希
     */
    fun embed(text: String): FloatArray {
        val vec = FloatArray(dim)
        
        // 通道1: 词级 TF 哈希（中文按字符 bigram，英文按空格分词）
        val tokens = tokenize(text)
        val tf = tokens.groupingBy { it }.eachCount()
        tf.forEach { (word, count) ->
            val hash = murmurHash3(word)
            val idx = (hash % dim).toInt()
            val sign = if (hash % 2 == 0L) 1f else -1f
            vec[idx] += sign * (1 + ln(count.toFloat()))
        }
        
        // 通道2: 字符 bigram 补充（捕获中文语义相似性）
        for (i in 0 until text.length - 1) {
            val bigram = text.substring(i, i + 2)
            val hash = murmurHash3(bigram)
            val idx = ((hash shr 1) % dim).toInt()
            vec[idx] += 0.3f
        }
        
        // L2 归一化
        val norm = sqrt(vec.sumOf { it * it.toDouble() }).toFloat()
        if (norm > 0) for (i in vec.indices) vec[i] /= norm
        
        return vec
    }
    
    private fun tokenize(text: String): List<String> {
        val tokens = mutableListOf<String>()
        // 中文按字符 bigram
        for (i in 0 until text.length - 1) {
            val c1 = text[i]; val c2 = text[i + 1]
            if (c1.code > 0x4E00 && c2.code > 0x4E00) {
                tokens.add("$c1$c2")
            }
        }
        // 英文按空格分词
        text.split(Regex("\\s+")).forEach { word ->
            if (word.matches(Regex("[a-zA-Z]+")) && word.length >= 2) {
                tokens.add(word.lowercase())
            }
        }
        return tokens
    }
}
```

#### 方案 B：外部 Embedding API（可选，预留接口）

```kotlin
interface EmbeddingProvider {
    fun embed(text: String): FloatArray
    fun embedBatch(texts: List<String>): List<FloatArray>
}

// 本地哈希嵌入（默认）
class LocalHashEmbeddingProvider : EmbeddingProvider { ... }

// 外部 API 嵌入（预留，如 OpenAI text-embedding-3-small）
class ExternalApiEmbeddingProvider(
    private val apiUrl: String,
    private val apiKey: String,
    private val model: String
) : EmbeddingProvider { ... }
```

### 4.5 Zvec 集成方案（合并到现有 Node 进程）

Zvec 是 C++ 库，官方提供 Node.js SDK（`@zvec/zvec`）。

服务器内存有限（1GiB），**不新增独立进程**。Zvec 集成直接挂载到现有前端 Node 服务（端口 3000）中：

```
bible-monolith (Kotlin, 8080)
  │
  ├── HTTP → frontend/server.js (Node, 3000, 已有进程)
  │            ├── 现有：静态文件 + /api/* 代理到 8080
  │            └── 新增：/zvec/* 端点（Zvec SDK 调用）
  │
  └── 直接读取 H2 数据库（kb_document 表）
```

**为什么可行**：
- 现有 `server.js` 已经是一个 Node.js HTTP 服务，加路由分支零成本
- Zvec Node.js SDK 是进程内库（不需要独立服务进程）
- 前端 Node 进程内存占用约 30-50MB，加 Zvec SDK + 索引约额外 20-50MB
- 总计仍远低于启动第二个 Node 进程（省 ~30MB）

**实现方式**：
- 新建 `frontend/zvec-bridge.js` 模块（约 200 行）
- `server.js` 加 1 行 `require('./zvec-bridge')(rq, rs, url)` 路由分发
- 或更优雅：在 `server.js` 的 `createServer` 回调中，`/api/*` 代理逻辑前插入 `/zvec/*` 拦截

**API 端点（挂载在 3000 端口）**：
```
POST /zvec/embed           — 接收文本，返回向量
POST /zvec/index           — 批量索引文档
POST /zvec/search          — 向量搜索
GET  /zvec/collections     — 列出集合
POST /zvec/collection/create — 创建集合
DELETE /zvec/collection/:name — 删除集合
GET  /zvec/status          — 服务状态
```

### 4.6 后端 Kotlin 代码结构

```
bible-monolith/src/main/kotlin/com/bible/monolith/
├── (现有代码 — 不动)
└── plugin/
    └── kb/
        ├── KbController.kt          — REST API 端点
        ├── KbService.kt             — 业务逻辑
        ├── KbIndexer.kt             — 索引管理（调用 zvec-bridge）
        ├── KbDocument.kt            — JPA 实体
        ├── KbDocumentRepository.kt  — Repository
        ├── KbIndexConfig.kt         — 索引配置实体
        ├── KbIndexConfigRepository.kt
        ├── EmbeddingProvider.kt     — 嵌入接口
        ├── LocalHashEmbedding.kt    — 本地哈希嵌入实现
        ├── ZvecBridgeClient.kt      — HTTP 客户端调用 zvec-bridge
        ├── PluginModule.kt          — 插件注册实体
        ├── PluginModuleRepository.kt
        ├── PluginController.kt      — 插件管理 API
        ├── PluginService.kt         — 插件管理逻辑
        └── PluginAutoRegistrar.kt   — 启动时自动注册知识库插件
```

### 4.7 REST API 设计

```
# 知识库 API（前缀 /api/v1/kb）
POST   /api/v1/kb/index                    — 触发索引构建（ADMIN）
POST   /api/v1/kb/index/library            — 索引图书馆全部书籍
POST   /api/v1/kb/index/library/{code}     — 索引指定书籍
POST   /api/v1/kb/index/bible              — 索引圣经
DELETE /api/v1/kb/index                    — 清空索引
GET    /api/v1/kb/stats                    — 索引统计信息
POST   /api/v1/kb/search                   — 语义搜索
GET    /api/v1/kb/documents                — 文档列表（分页）
GET    /api/v1/kb/documents/{id}           — 文档详情
DELETE /api/v1/kb/documents/{id}           — 删除文档（ADMIN）
GET    /api/v1/kb/config                   — 获取索引配置
PUT    /api/v1/kb/config                   — 更新索引配置（ADMIN）
GET    /api/v1/kb/status                   — 索引服务状态
```

**搜索请求/响应示例**：
```json
// POST /api/v1/kb/search
// Request:
{
  "query": "如何祷告",
  "topK": 10,
  "sourceType": "library",      // 可选，过滤来源
  "category": "灵修",           // 可选，过滤分类
  "threshold": 0.3              // 可选，最低相似度
}

// Response:
{
  "total": 10,
  "query": "如何祷告",
  "results": [
    {
      "id": 42,
      "title": "新生活与祷告",
      "sourceType": "library",
      "sourceRef": "library/newlive/003",
      "snippet": "祷告是信徒与神交通的途径...",
      "score": 0.892,
      "highlight": "<em>祷告</em>是信徒与神交通的途径...",
      "bookCode": "newlive",
      "chapterId": "003",
      "category": "查经"
    }
  ]
}
```

### 4.8 前端页面设计

```
frontend/plugins/knowledge-base/
├── index.html    — 知识库搜索页面
├── kb.js         — 搜索 + 索引管理逻辑
└── kb.css        — 样式（复用深色主题变量）
```

**页面布局**：
```
┌─────────────────────────────────────────────────┐
│  📚 知识库搜索                                    │
├─────────────────────────────────────────────────┤
│  [搜索框________________] [搜索按钮] [高级筛选 ▼] │
│                                                   │
│  来源: [全部 ▼]  分类: [全部 ▼]  结果数: [10 ▼]   │
├─────────────────────────────────────────────────┤
│  搜索结果 (10 条)                    耗时: 23ms   │
├─────────────────────────────────────────────────┤
│  📖 新生活与祷告                    相似度: 89.2%  │
│  来源: 图书馆 / 新生活 / 第3课                     │
│  ...祷告是信徒与神交通的途径，借着祷告我们可以...   │
│  [阅读全文]                                       │
├─────────────────────────────────────────────────┤
│  📖 祷告的秘诀                      相似度: 85.1%  │
│  来源: 图书馆 / 灵修书籍 / 第5章                    │
│  ...祷告不是一套仪式，而是一种关系...               │
│  [阅读全文]                                       │
├─────────────────────────────────────────────────┤
│  📖 如何祷告                        相似度: 82.7%  │
│  来源: 课程 / 新生命 / 第6课                       │
│  ...主耶稣教导门徒祷告的榜样...                     │
│  [阅读全文]                                       │
└─────────────────────────────────────────────────┘

# 管理员可见：
┌─────────────────────────────────────────────────┐
│  ⚙️ 索引管理                                     │
│  [构建索引] [增量更新] [清空索引]                  │
│  已索引文档: 946 / 946   状态: 就绪              │
│  索引大小: 12.3 MB    最后更新: 2026-07-13 09:30 │
└─────────────────────────────────────────────────┘
```

---

## 五、实现步骤

### Phase 1: 动态插件框架（2-3 天）

1. **后端**：创建 `PluginModule.kt` 实体 + `PluginController.kt` + `PluginService.kt`
2. **后端**：`PluginAutoRegistrar.kt` — 启动时自动注册内置插件
3. **前端**：`js/plugin-menu.js` — 动态菜单注入
4. **前端**：`settings.html` 新增"插件管理"Tab（或独立页面 `plugins.html`）
5. **验证**：管理员后台创建插件 → 前端刷新后菜单出现新项

- Phase 2: Zvec 合并到前端 Node 进程（2-3天）
1. **npm install**：`@zvec/zvec` 安装到 frontend/ 目录
2. **Node.js 模块**：`zvec-bridge.js` — 封装 Zvec SDK + HTTP 端点
3. **Node.js 模块**：`zvec-embedding.js` — 本地 TF-IDF 哈希嵌入
4. **挂载**：`server.js` 加 1 行路由分发
5. **验证**：直接 HTTP 调用 `localhost:3000/zvec/embed`、`/zvec/index`、`/zvec/search`

### Phase 3: 知识库后端（3-4 天）

1. **Kotlin**：`KbDocument` 实体 + Repository
2. **Kotlin**：`KbService` — 索引构建 + 搜索逻辑
3. **Kotlin**：`KbController` — REST API
4. **Kotlin**：`ZvecBridgeClient` — HTTP 调用 zvec-bridge
5. **Kotlin**：`LocalHashEmbedding` — 本地嵌入实现（备用，如果 zvec-bridge 不含嵌入）
6. **验证**：API 端点测试 — 索引图书馆 → 搜索 → 返回结果

### Phase 4: 知识库前端（2-3 天）

1. **HTML**：`plugins/knowledge-base/index.html` — 搜索页面
2. **JS**：`plugins/knowledge-base/kb.js` — 搜索 + 索引管理
3. **CSS**：`plugins/knowledge-base/kb.css` — 样式
4. **集成**：通过插件管理后台注册知识库插件
5. **验证**：前端搜索 → 后端 API → Zvec 搜索 → 返回结果 → 渲染

### Phase 5: 图书馆数据导入（1-2 天）

1. **脚本**：扫描 `library-data/` 全部 94 本书 × 946 章
2. **分块**：按章节自然边界分块（每块 300-500 字，重叠 50 字）
3. **嵌入**：调用嵌入服务生成向量
4. **索引**：写入 Zvec + H2 元数据
5. **验证**：搜索"如何祷告"返回相关章节

---

## 六、文件清单（全部新增，零修改原有代码）

### 后端 Kotlin（新增 14 个文件）
```
bible-monolith/src/main/kotlin/com/bible/monolith/plugin/
├── kb/
│   ├── KbController.kt
│   ├── KbService.kt
│   ├── KbIndexer.kt
│   ├── KbDocument.kt
│   ├── KbDocumentRepository.kt
│   ├── KbIndexConfig.kt
│   ├── KbIndexConfigRepository.kt
│   ├── EmbeddingProvider.kt
│   ├── LocalHashEmbedding.kt
│   └── ZvecBridgeClient.kt
├── PluginModule.kt
├── PluginModuleRepository.kt
├── PluginController.kt
└── PluginService.kt
```

### Node.js 桥接模块（新增 3 个文件，挂载到现有 3000 端口）
```
frontend/
├── zvec-bridge.js     — Zvec SDK 封装 + HTTP 端点（挂载到 server.js）
├── zvec-embedding.js  — 本地 TF-IDF 哈希嵌入实现
└── zvec-config.js     — Zvec 配置常量
```

### 前端（新增 5 个文件）
```
frontend/
├── js/plugin-menu.js                    — 通用动态菜单
├── plugins/
│   └── knowledge-base/
│       ├── index.html
│       ├── kb.js
│       └── kb.css
└── plugins.html                         — 插件管理页面
```

**唯一需要的最小改动（2 行）**：

1. `frontend/index.html` 底部 `</body>` 前加 1 行：
```html
<script src="js/plugin-menu.js"></script>
```

2. `frontend/server.js` 的 `createServer` 回调中加 1 行路由分发：
```javascript
if (url.startsWith('/zvec/')) { require('./zvec-bridge')(rq, rs, url); return; }
```

这两行是"最小侵入"——不修改任何现有业务逻辑代码，仅在入口处加载新模块。

---

## 七、技术选型汇总

| 组件 | 选型 | 理由 |
|------|------|------|
| 向量数据库 | Zvec v0.5+ (Node.js SDK) | 阿里巴巴开源，进程内嵌入，无需独立服务 |
| 嵌入方案 | 本地 TF-IDF 哈希（默认） | 零依赖，不接入大模型，纯本地计算 |
| 嵌入方案B | 预留外部 API 接口 | 未来可切换到 OpenAI/BGE 等嵌入模型 |
| 桥接方式 | 合并到现有前端 Node 进程（端口 3000） | 不新增进程，节省内存 |
| 插件配置 | H2 数据库 `plugin_module` 表 | 运行时配置，管理员后台管理 |
| 菜单注入 | 前端 `plugin-menu.js` 动态渲染 | 不修改现有 HTML/JS |
| 搜索协议 | HTTP REST + JSON | 与现有 API 风格一致 |
| 分块策略 | 按章节自然边界 + 滑动窗口 | 保持语义完整性 |

---

## 八、安全与权限

| 端点 | 权限 | 说明 |
|------|------|------|
| `GET /api/v1/plugins` | 公开 | 所有用户可查看启用的插件 |
| `POST/PUT/DELETE /api/v1/plugins/**` | ADMIN | 仅管理员管理插件 |
| `POST /api/v1/kb/search` | 公开 | 所有用户可搜索 |
| `POST /api/v1/kb/index/**` | ADMIN | 仅管理员构建索引 |
| `DELETE /api/v1/kb/**` | ADMIN | 仅管理员删除文档 |
| `GET /api/v1/kb/config` | 公开 | 查看配置 |
| `PUT /api/v1/kb/config` | ADMIN | 修改配置 |

Spring Security 配置无需改动——`/api/v1/**` 已 `permitAll`，细粒度控制通过 `@PreAuthorize` 或 Controller 内逻辑实现。

---

## 九、扩展性

1. **新增任何功能**：管理员后台注册插件 → 前端自动出现菜单 → 用户访问新功能页面
2. **嵌入模型升级**：实现新的 `EmbeddingProvider` → 修改配置 → 重建索引
3. **Zvec 升级**：仅更新 zvec-bridge 的 npm 依赖，不影响主应用
4. **多知识库**：Zvec 支持多 Collection，可为不同来源（图书馆/圣经/课程）建独立索引
5. **未来 RAG**：在 `KbService` 之上新增 `RagService`，调用 LLM API 拼接检索结果——不影响现有知识库模块
