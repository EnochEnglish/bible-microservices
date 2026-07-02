# 注释源双通道合并 (H2 + JSword SWORD) — 2026-07-01

## 目标
将 25 个 SWORD COMMENTARY 模块（CrossWire 下载）直接通过 JSword 读取，与现有 H2 表 9 个源合并，前端一套 API 同时获取两者。

## 架构

```
前端 fetch('/api/v1/annotations/commentaries/Gen/1')
        │
        ▼
AnnotationController.getCommentaries()
        │
        ├── AnnotationService (H2)  → 9 sources (JFB, MHCC, ...)
        │
        └── SwordCommentaryService  → 25 SWORD modules (TDavid, KD, ...)
           │
           ▼
        BookData(book, key).getOsisFragment() → extractPlainText()
```

## 新增/修改文件

### 后端
- **新建** `bible-monolith/.../service/SwordCommentaryService.kt` (5794 bytes)
  - `listSources(excludeIds)` → 列出未被 H2 覆盖的 SWORD 注释模块
  - `getCommentaryText(module, osisRef)` → BookData → OSIS XML → 纯文本
  - `getCommentaryForChapter(module, bookId, chapter)` → 逐节读取，3 连无数据停止
  - `getCommentaryForVerse(module, bookId, chapter, verse)` → 单节查

- **修改** `bible-monolith/.../controller/AnnotationController.kt`
  - 注入 `SwordCommentaryService`
  - `getCommentaries()` 合并两种源返回 unified JSON，每条带 `storage: "h2"|"sword"`
  - `getSources()` 返回全部 34 源

### 前端
- **修改** `frontend/js/app.js` — `COMMENTARY_NAMES_ZH`/`EN` 各 +25 条目
- **修改** `frontend/m/mobile.js` — 同上

## 验证结果

| 测试 | 结果 |
|------|------|
| 源总数 | 34 (H2:9 + SWORD:25) ✅ |
| H2 源 (JFB 创1) | 1 条, storage=h2 ✅ |
| SWORD 源 (TDavid 诗23) | 6 条, storage=sword ✅ |
| 全源 (创1, 34 源) | 804 条 ✅ |
| 前端 I18N | TDavid 等 25 新源已纳入 ✅ |

## 关键设计决策
- **不重复**: `SwordCommentaryService.listSources(excludeIds)` 排除已在 H2 表的源（同名不覆盖）
- **storage 字段**: 前端可据此判断来源，后续可加"导入到 H2"按钮
- **3 连无数据**: 注释模块章节末尾检测（避免读完 31 节 Proverbs 后继续到 176 节）
- **后期扩展**: 新书录入走 H2 `POST /api/v1/annotations/import-commentary`
