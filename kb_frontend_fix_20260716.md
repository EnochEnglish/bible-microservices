# KB 知识库前端页面修复 + zhOnly 索引构建（2026-07-16 08:40）

## 任务
用户报告前端报错 `Not Found: /plugins/knowledge-base/index.html`，需创建知识库前端页面并确保 KB 系统可用。

## 完成的工作

### 1. 修复 KbIndexService 编译错误
- `clearAll()` 方法插入位置错误导致 `getStats()` 函数体被拆散，产生重复定义
- 修复：合并两个 `getStats`，删除重复代码
- `zvecBridge.status()` 返回可空类型 `Map<String, Any>?`，与非空 `mutableMapOf` 类型不匹配
- 修复：添加 `?: mapOf("available" to false)` 空值兜底

### 2. 添加 ZvecBridge.dropCollection()
- 新增 `dropCollection(collection)` 方法，POST 到 `/zvec/drop` 端点

### 3. KbController 添加 clearIndex API
- `DELETE /api/v1/kb/index/clear` — 清理所有 KB 索引数据（H2 + Zvec）

### 4. zhOnly 参数支持
- `buildAll(zhOnly=true)` — 跳过英文语料，只索引中文
- `buildSource(source, zhOnly)` — 按源构建也支持 zhOnly
- `application.yml` 中 `kb.sources.bible.translations` 改为仅 `cuv_gb`
- 中文词典过滤：`processDictionaryIncrementalZh()` 只处理 `Ch*`/`Zh*` 开头模块

### 5. 创建知识库前端页面
- 路径：`frontend/plugins/knowledge-base/index.html`（11KB）
- 功能：
  - 搜索框 + 来源/模式/数量过滤器
  - 混合搜索（hybrid/vector/keyword/metadata）
  - 结果卡片展示（来源标签、翻译、模块、引用、分数）
  - 展开全文切换
  - 统计面板（各来源文档数、Zvec 状态）
  - 深色主题适配

## 当前 KB 系统状态
- **后端**：运行中（PID 11060, 端口 8080）
- **前端**：运行中（PID 11828, 端口 3000）
- **Zvec**：可用，361,555 条向量（圣经 6,705 + 字典 354,850）
- **H2 索引**：圣经 80,460 条（73,755 已 TF-IDF 索引）、字典 355,425 条
- **搜索**：正常工作（hybrid 模式，271ms 响应）

## 已知限制
- TF-IDF 对中文单字搜索语义效果差（score: 0.0）
- 搜索结果 snippet 只有标题没有正文预览
- BGE 嵌入模型不可用（transformers.js 未安装）
- `zhOnly=true` 构建尚未执行（旧的英文数据保留，后续只加中文）

## 关键文件
- `frontend/plugins/knowledge-base/index.html` — 知识库前端页面
- `KbController.kt` — 添加 clearIndex API
- `KbIndexService.kt` — 修复编译错误 + zhOnly 支持
- `ZvecBridge.kt` — 添加 dropCollection
- `application.yml` — 译本列表改为 cuv_gb
