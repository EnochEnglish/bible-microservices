# Strong's Hebrew 词汇映射 — 总结

**任务**：为 Strong's 希伯来文字典填充真实希伯来词汇（之前仅 ASCII 音译）

**解决方案**：使用 `morphhb` npm 包（Open Scriptures Hebrew Bible，CC-BY 4.0），包含全部 39 卷 OT 的 306,741 个词，每个词都有 Strong's lemma 编号

**结果**：
- 8,640 个 unique Strong's H 编号 → 300,764 个词映射
- 每个编号有 1-83 个形态变体（含前缀：ב/ו/ל/מ/ה/כ）
- 数据文件：`data/sword-dicts/strongs_hebrew_words.json`（984KB）

**后端变更**：
- `StrongsEntry` 新增 `hebrew_words: List<String>?` 字段
- `StrongsService.loadHebrew()` 加载并合并 `strongs_hebrew_words.json`
- `StrongsController` lookup/search 端点均返回 `hebrew_words` 字段
- 重建 text-service，验证通过：
  - H430 (אלהים): 55 个形态
  - H7225 (ראשית): 12 个形态  
  - H1961 (היה): 83 个形态
  - search 端点同步返回 `hebrew_words`

**前端变更**：
- `app.js` `renderStrongsEntry()` 显示 Hebrew 词条（RTL 排列）
- `style.css` 新增 `.strongs-hebrew-words` 等样式

**服务状态**：
- text-service:8081 ✅ 运行中，含完整 Strong's API
- 其他 3 服务正常运行
- 前端:3000 ✅ 运行中