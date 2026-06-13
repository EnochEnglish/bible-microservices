# 书签 / 笔记 / TSK 管理面板

> 日期：2026-06-13 | 版本：v20260613b

## 后端：Bookmark & Note REST API

**模块**：`bible-text-service`

### 新增 Controller

| 文件 | Controller | 路由前缀 | CRUD |
|------|-----------|---------|------|
| `BookmarkController.kt` | Bookmark | `/api/v1/text/bookmarks` | GET all, GET/{ref}, POST, DELETE/{ref} |
| `NoteController.kt` | Note | `/api/v1/text/notes` | GET all, GET/{ref}, POST, DELETE/{ref} |

### 已知问题

DELETE `/{verseRef}` 路径含点号  (`gen.1.1`) 时 Spring MVC suffix pattern 可能截断匹配。如需修复：`@DeleteMapping("/{verseRef:.+}")`。

备选方案：可改用 `DELETE /{id}` 基于 ID 删除。

## 前端：管理面板

### HTML（index.html）
- `bookmarksOverlay` — 书签列表
- `notesOverlay` — 笔记列表  
- `tskOverlay` — TSK 交叉引用面板
- Toolbar 新增按钮：🔖 书签 / 📝 笔记 / 🔗 TSK

### CSS（style.css，+52 行）
- `.bm-panel` / `.bm-list` / `.bm-item` — 通用管理面板样式
- `.tsk-panel` / `.tsk-verse-ref` / `.tsk-xref-list` / `.tsk-xref` — TSK 专属样式

### JS（app.js，+170 行）
| 函数 | 功能 |
|------|------|
| `openBookmarksPanel()` / `closeBookmarksPanel()` | 书签面板开关 |
| `loadBookmarkList()` | 加载全部书签列表 |
| `deleteBookmarkItem(ref)` | 删除单个书签 |
| `openNotesPanel()` / `closeNotesPanel()` | 笔记面板开关 |
| `loadNoteList()` | 加载全部笔记列表 |
| `deleteNoteItem(ref)` | 删除单个笔记 |
| `openTSKPanel()` / `closeTSKPanel()` | TSK 面板开关 |
| `loadTSKContent()` | 从 text-service 加载 TSK annotations |
| `loadTSKFromSword()` | 后备：从 Sword service 拉取 TSK 数据 |
| `renderTSKEntries()` | 渲染交叉引用条目 |
| `parseTSKRefs()` | 解析 TSK 文本→可点击引用链接 |

## 数据流

```
frontend → /api/v1/text/bookmarks  → text-service:8081 → H2 bookmarks 表
frontend → /api/v1/text/notes      → text-service:8081 → H2 notes 表
frontend → /api/v1/annotations/... → gateway:8080 → text-service:8081
frontend → /api/v1/sword/TSK/...   → sword-service:8086 (后备)
```

## 变更文件

| 文件 | 状态 |
|------|------|
| `bible-text-service/src/.../BookmarkController.kt` | NEW |
| `bible-text-service/src/.../NoteController.kt` | NEW |
| `frontend/server.js` | MODIFIED (+3 行 proxy) |
| `frontend/index.html` | MODIFIED (+30 行 overlays, +3 按钮) |
| `frontend/css/style.css` | MODIFIED (+52 行) |
| `frontend/js/app.js` | MODIFIED (+170 行) |
| `dist/bible-text-service.jar` | REBUILT |

## 待办

- [ ] 修复 DELETE /{verseRef} 点号匹配问题
- [ ] 确保 `navigateToRef()` 函数存在
- [ ] 测试全部 CRUD 流程
- [ ] Git commit + push
