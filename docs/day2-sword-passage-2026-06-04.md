# Day 2: Sword Service — Passage + Strong's 提取完成

## 时间
2026-06-04 01:39 ~ 02:20 (Asia/Shanghai)

## 目标
在 bible-sword-service 中实现逐节经文提取 + Strong's 词级数据解析。

## 关键成果

### 经文提取 API
- `GET /api/v1/sword/KJV/passage/Gen.1` — 整章 32 节 (1489ms)
- `GET /api/v1/sword/KJV/passage/Gen.1.1` — 单节
- `GET /api/v1/sword/KJV/passage/Matt.1.1` — 新约希腊文 Strong's
- `GET /api/v1/sword/KJV/passage/Gen.1.1?strongs=false` — 纯文本模式

### Strong's 数据验证
- **OT (希伯来文)**: Gen 1:1 — H7225/H0430/H0853+H01254/H08064/H0853/H0776 + morph (TH8804)
- **NT (希腊文)**: John 1:1 — πᾶς λόγος → G3588+G3056 (T-NSM/N-NSM), G1510 (V-IAI-3S) 等 13 词
- **多 Strong's 复合**: "created" → H0853+H01254, "the Word" → G3588+G3056

### 架构决策
1. **逐节迭代**: KJV zText 模块每节独立 `<w>` 标签，无 `<verse>` 容器 → 用 `Key.iterator()` 遍历 `Verse`，逐节 `getRawText()`
2. **正则解析**: `<w lemma="strong:..." morph="robinson:...">text</w>` 提取 lemma/morph/Strong's
3. **XML 清理**: `stripXmlTags()` 处理 `<transChange>`, `<divineName>`, `<note>` 等内联标签
4. **跳过无 Strong's**: `hasFeature(FeatureType.STRONGS_NUMBERS)` 检测，非 Strong's 模块走纯文本路径

### 代码结构
- `service/SwordPassageService.kt` — 核心解析 (parseOsisLine, stripXmlTags)
- `dto/PassageDtos.kt` — VerseInfo (osisId, text, words: List<WordInfo>)
- `dto/WordInfo` — text, strongs, lemma, morph, src
- `controller/PassageController.kt` — REST 端点

### 前端集成要点 (后续)
- KJV 自动返回 Strong's，前端可展示 Interlinear 模式
- `strongs=false` 参数可关闭词级数据
- Strong's 格式: "H7225" (希伯来), "G3588+G3056" (多个希腊)，可直接用于 Strong's 词典查询

## 已知问题
1. **Byz 模块编码**: UTF-8 希腊文显示为 Latin-1 乱码 (非 KJV 核心问题)
2. **morph 前缀**: `robinson:` 前缀未去除，需在后续版本修复
3. **服务稳定性**: Windows PowerShell 下 Java 进程间歇 SIGKILL (与 NestJS 相同模式)
4. **Verse 0**: 章节标题 verse (osisId=Gen.1.0) 包含 chapter/title 标签，HTML 需特殊处理

## 下一步 (Day 3)
- 强词词典查询端点: `/api/v1/sword/{module}/strongs/{id}` (整合 Easton/ISBE/Nave)
- 注释模块提取 (MHC): `/api/v1/sword/MHC/passage/Gen.1`
- 前端对接: Interlinear 模式 + Strong's 弹窗联动
- 多译本并行查询 (双语对照)
