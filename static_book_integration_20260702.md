# 静态电子书集成：圣经问题解答 — 2026-07-02b

## 目标
将 `D:\dev\usebible.com\html\bible_wenti` 的 183 篇 HTM 文件集成为图书馆中的静态电子书，零后端开销。

## 方案：静态 JSON + 前端 fetch

```
前端 library.html
  ↓ fetch
静态目录 /library-data/bible_wenti/
  ├── meta.json     ← 书目信息 + 目录树
  ├── 001.json      ← {title, category, content}
  ├── 002.json
  └── ... 183 个
```

**零数据库、零 API、零 CPU**。nginx 直接 serve 静态 JSON。

## 完成的工作

### 1. 转换脚本 `convert-bible-wenti.js`
- 读取 186 个 HTM 文件（实际编码 UTF-8 with BOM，尽管 meta 标签声明 GB2312）
- 去除 BOM、提取 `<TITLE>` 和 `<BODY>` 内容
- 清理 `<FONT>`、`<CENTER>`、`<META>`、`<BASE>`、`tppabs` 等旧 HTML 标签
- 输出 184 个 JSON 文件（1 个 meta.json + 183 个章节 JSON），总 550 KB

### 2. 电子书内容
- 书名：圣经问题解答
- 作者：陈终道
- 出版：宣道书局 1977 年 5 月第 5 版
- 183 篇，分 4 类：解经问题(102)、生活问题(41)、神学问题(29)、教会问题(11)

### 3. library.js 扩展为双源架构
- **SWORD 书**：通过 `/api/v1/sword/genbook/{module}/keys` 和 `/content` API 读取
- **静态书**：通过 `/library-data/{code}/meta.json` 和 `{id}.json` 读取
- `STATIC_BOOKS` 注册表：新增书只需加一行 `{ code, title, author, category, icon }`
- 书架过滤栏新增"中文著作 / Chinese"按钮

### 4. 修改的文件
- `frontend/library.html` — 新增中文著作过滤按钮 + LIBRARY_DATA_BASE 变量 + 版本号 v=20260702b
- `frontend/js/library.js` — 重写为双源架构（SWORD + Static），17940 字节
- `frontend/library-data/bible_wenti/` — 184 个 JSON 文件（新增）
- `frontend/index.html` — 版本号更新
- `frontend/m/index.html` — 版本号更新
- `convert-bible-wenti.js` — 转换脚本（工具）

### 5. 验证
- `http://localhost:3000/library.html` 200 ✅
- `http://localhost:3000/library-data/bible_wenti/meta.json` 200, 183 chapters ✅
- `http://localhost:3000/library-data/bible_wenti/001.json` 200, title="神用六日便创造了天地？" ✅
- Git commit `f8085a7` pushed to `monolith-clean` ✅

## 扩展性
`D:\dev\usebible.com\html\` 下还有更多内容目录可用同样方式导入：
- `devotion/` — 灵修材料
- `classic/` — 经典著作（天路历程、殉道史等）
- `deshen/` — 讲道
- `dsz/` — 丁淑贞

每本书只需：1) 写转换脚本 → 2) 在 `STATIC_BOOKS` 加一行 → 3) JSON 文件放 `library-data/` 目录
