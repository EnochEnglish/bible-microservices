# Day 1 — bible-sword-service 创建完成

**时间:** 2026-06-04 01:33 ~ 02:20 (Asia/Shanghai)
**目标:** 创建 bible-sword-service Spring Boot 微服务（端口 8086），实现通过 JSword 原生读取 SWORD 模块的 REST API

## 完成内容

### 1. 项目骨架
- 目录: `bible-sword-service/src/main/kotlin/com/bible/sword/`
- 文件: 7 个 Kotlin 源文件 + 1 个配置
- 依赖: 继承父项目 Spring Boot 3.2.2 + Kotlin 1.9.22 + JDK 17
- 通过 `implementation(project(":bible-sword-reader"))` 链接 JSword LGPL 库

### 2. 关键技术突破

**IndexManager NPE 修复:**
- JSword 的 `Books.<clinit>` 静态初始化器自动调用 `autoRegister()` → `SwordBookDriver.getBooks()` → `IndexManagerFactory.getIndexManager()` 发现 `instance` 为 `null`
- 根因: 已删除的 `index/lucene` 包删除了 `IndexManager` 实现（440 个编译错误中的 Lucene 依赖）
- 解决方案: 创建 `StubIndexManager` 实现接口，在 `main()` 中用反射注入 `IndexManagerFactory.instance`，**必须在 Spring 启动前**

**模块目录结构适配:**
- 每个 SWORD 模块独立子目录（如 `KJV/mods.d/` + `KJV/modules/`），非标准扁平布局
- `SwordConfig` 自动扫描包含 `mods.d/` + `modules/` 的所有子目录作为 `SwordBookPath.setAugmentPath()`

### 3. API 端点（已验证全部通过）

| 端点 | 响应 | 状态 |
|------|------|------|
| `GET /api/v1/sword/modules` | 15 模块（14 Bibles + 1 Commentary） | ✅ |
| `GET /api/v1/sword/modules?category=BIBLE` | 14 Bibles | ✅ |
| `GET /api/v1/sword/modules/KJV` | KJV 完整元数据含 Strong's、Versification | ✅ |
| `GET /api/v1/sword/modules/KJV/books` | 66 卷书、章节数、总节数 | ✅ |
| `POST /api/v1/sword/reload` | 重新扫描模块 | ✅ |

### 4. 数据验证
- KJV 66 卷: Gen 50章/1533节, Exod 40章/1213节, Rev 22章/404节 ✅
- Strong's 检测: KJV/Byz/LXX/MorphGNT/OSHB/SP/TR ✅
- 多语言: en, zh, ru, la ✅
- MHC 注释: 唯一注释模块，正确分类为 COMMENTARY ✅

### 5. 废弃代码保留
- 所有 Python/Java 导入脚本保留作为历史资产
- `scripts/import_*`、旧 Import*.java 文件未删除

## 下一步（Day 2）
- Passage 提取: 逐节经文读取 + Strong's `<w>` 标签解析
- Caffeine 缓存集成（已配置，待开发）
- 与前端对接
