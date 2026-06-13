# 仓库源可配置 + TSK 集成 + 自建库指南

> 日期：2026-06-13 | 版本：v20260613c

## 用户三点需求

1. **仓库源 UI 可配置** — 用户可以自由添加/删除第三方 SWORD 模块仓库，不修改代码
2. **自建库指导文档** — 用户级别操作指南，非代码级别
3. **TSK 按钮移除** — TSK 是注释模块，应集成到注释系统而非独立按钮，符合 AndBible/JSword 设计理念

## 实现方案

### 1. 仓库源 UI 可配置

**机制**：
- `frontend/repos.json` — 用户级配置文件，存储自定义仓库列表
- 后端内置仓库从 `/api/v1/sword/install/sources` API 动态加载
- 前端 `loadRepoSources()` 合并内置 + 自定义，动态渲染 `<select>`
- 模块面板新增 ⚙ 按钮 → `reposOverlay` → 查看/添加/删除仓库
- 自定义仓库保存：`POST /api/v1/text/repos` → `server.js` 写回 `repos.json`

**新增函数**（app.js）：
- `loadRepoSources()` — Promise.all 并行加载内置+自定义源
- `renderSourceSelector()` — 动态填充仓库下拉
- `openReposPanel()` / `closeReposPanel()` — 仓库管理面板
- `renderRepoList()` — 显示所有仓库（内置 + 自定义），各自带标签
- `showAddRepoForm()` / `cancelAddRepo()` / `saveCustomRepo()` — 添加自定义仓库
- `removeCustomRepo(id)` — 删除自定义仓库
- `loadCustomReposFile()` / `saveCustomReposFile()` — 读写 repos.json

### 2. 自建库指导文档

**文件**：`docs/SELF_HOSTING.md`（4.7KB）
- 目录结构要求（mods.d.tar.gz + packages/rawzip/）
- 如何准备/自制 SWORD 模块
- .conf 文件示例
- 生成 mods.d.tar.gz（tar -czf）
- HTTP 服务器搭建（Python/nginx/GitHub Pages）
- 在阅读器中添加仓库的步骤
- 验证仓库可访问性
- 常见问题 Q&A

### 3. TSK 按钮移除 + 注释集成

**移除**：
- index.html：删除工具栏 🔗 TSK 按钮
- index.html：删除 tskOverlay 完整 HTML块
- app.js：删除全部 TSK 专用函数（openTSKPanel/closeTSKPanel/loadTSKContent/loadTSKFromSword/renderTSKEntries/parseTSKRefs，约 120 行）

**注释集成**：
- `renderCommentaryBody()` 修改：当 `state.activeCommentary === 'TSK'` 且 text-service 无数据时，自动从 Sword service 拉取 `/api/v1/sword/TSK/passage/{ref}?strongs=false`
- TSK 作为注释标签始终在 `renderCommentaryTabs()` 的 fallback 源列表中
- 用户切换注释到 TSK 即可看到交叉引用数据

## 变更文件清单

| 文件 | 动作 | 说明 |
|------|------|------|
| `frontend/repos.json` | NEW | 用户级仓库配置 |
| `docs/SELF_HOSTING.md` | NEW | 自建仓库指南 |
| `frontend/index.html` | 编辑 | -TSK按钮 -TSK overlay + reposOverlay + source动态化 |
| `frontend/js/app.js` | 编辑 | -TSK函数 + repos管理函数 + source动态化 + TSK注释fallback |
| `frontend/css/style.css` | 编辑 | +53行(repo面板样式) |
| `frontend/server.js` | 编辑 | +POST /api/v1/text/repos→写repos.json |

## 验证结果

- `node -c` 语法通过
- API proxy 200 OK
- GET /repos.json 200 OK
- POST /api/v1/text/repos → {success:true} 200 OK
- GET /api/v1/sword/TSK/passage/gen.1 → 200, 13768 chars
- 前端重启 (PID 12700, v=20260613c)
