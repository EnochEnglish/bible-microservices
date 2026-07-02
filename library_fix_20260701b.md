# 图书馆页面 Bug 修复 + 隐藏阅读按钮 — 2026-07-01b

## 问题1：library.html 加载失败 "Cannot read properties of undefined (reading 'filter')"

### 根因
`config.js` 中 `API_BASE = "/api/v1"`，而 `library.js` 中调用 `fetchJson(API + '/api/v1/sword/modules')`，导致 URL 拼接为 `/api/v1/api/v1/sword/modules`（双重前缀），请求 404 返回 HTML 而非 JSON，`data.modules` 为 undefined。

### 修复
3处 API 调用路径去掉多余的 `/api/v1` 前缀：
- `API + '/api/v1/sword/modules'` → `API + '/sword/modules'`
- `API + '/api/v1/sword/genbook/' + module + '/keys'` → `API + '/sword/genbook/' + module + '/keys'`
- `API + '/api/v1/sword/genbook/' + module + '/content'` → `API + '/sword/genbook/' + module + '/content'`

## 问题2：隐藏桌面版"阅读"按钮

用户要求隐藏 topbar 的 genbookBtn（📖 阅读），因为天路历程等经典著作已在图书馆页面阅读。

### 修复
`index.html` 中 genbookBtn 添加 `style="display:none"`。

## 图书馆应显示的书目（35本）

### 经典著作（31本）
- alzat（芬兰语灵修，非英文）
- BaptistConfession1646 / BaptistConfession1689（浸信会信条）
- Concord（协和书/路德宗信纲）
- Didache（十二使徒遗训）
- DarkNightOfTheSoul（灵魂黑夜 - 十字架约翰）
- EMBReality（祷告的真实 - E.M. Bounds）
- Enoch（以诺书）
- Finney（芬尼讲道集）
- Heretics / Orthodoxy（切斯特顿 异端/正统）
- Imitation（效法基督 - 托马斯·阿·肯培）
- Institutes（基督教要义 - 加尔文）
- JCRHoliness（圣洁 - J.C. Ryle）
- JEAffections / JESermons（爱德华兹 宗教情感/讲道集）
- JOChrist / JOCommGod / JOGlory / JOMortSin（欧文 基督论/与神交通/基督的荣耀/治死罪）
- Josephus（约瑟夫全集）
- Jubilees（禧年书）
- LawGospel（律法与福音 - Walther）
- MollColossians（歌罗西书灵修）
- Passion（主的受难）
- Phaistos（费斯托斯盘）
- Pilgrim（天路历程 - 班扬）
- Practice（与神同在 - 劳伦斯弟兄）
- Summa（神学大全 - 阿奎那）
- Westminster / Westminster21（威斯敏斯特信条 原版/现代版）

### 每日灵修（3本）
- Daily（每日灵粮 - Bagster）
- DBD（恩典日日新 - Hoekstra）
- SME（清晨甘露·静夜亮光 - 司布真）

### 论文（1本）
- ABS_Essay_GoodSam_SWB（好撒玛利亚人论文）

## 版本号
v=20260701b
