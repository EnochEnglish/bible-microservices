# 图书馆滚动修复 + 自动化书单

**日期：** 2026-07-03  
**版本：** v=20260703b

## 修复内容

### 1. 滚动条问题修复
- **问题：** library.html 页面无法滚动查看底部书籍
- **根因：** `style.css` 中 `body { height:100vh; overflow:hidden }` 限制了页面高度
- **修复：** `library.css` 中 `html, body` 改为 `overflow: visible !important; max-height: none !important`，`#library-app` 加 `height: auto; overflow: visible`

### 2. 静态书单自动化
- **问题：** 每次新增书籍都要手动修改 `library.js` 中的 `STATIC_BOOKS` 数组
- **修复：** 
  - 新增 `gen-library-index.js` 脚本，扫描 `library-data/` 下所有 `meta.json`，生成 `index.json` 清单
  - `library.js` 的 `STATIC_BOOKS` 改为空数组，运行时 `fetch('library-data/index.json')` 自动加载
  - 新增书籍只需：放数据到 `library-data/{code}/` → 运行 `node gen-library-index.js` → 完成，无需改任何 JS 代码

### 文件变更
- `frontend/css/library.css` — 滚动修复
- `frontend/js/library.js` — STATIC_BOOKS 改为自动加载
- `frontend/library-data/index.json` — 新增，30本书的自动清单
- `gen-library-index.js` — 新增，清单生成脚本
- 版本号更新为 v=20260703b
