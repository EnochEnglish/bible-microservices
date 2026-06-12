# 前端架构文档

## 概览

前端是一个单页应用 (SPA)，使用原生 HTML/CSS/JavaScript 构建，无任何框架依赖。设计理念是保持轻量、快速加载、零构建步骤。

## 文件结构

`
frontend/
├── index.html          # 主 HTML 结构
├── server.js           # Node.js 静态文件 + API 代理服务器
├── style.css           # 全局样式表
└── js/
    ├── app.js          # 核心应用逻辑 (2282+ 行, 122 函数)
    ├── api.js          # BibleAPI 类 (Strong's 操作)
    └── config.js       # 环境配置 (local/production/auto)
`

## 全局状态: state 对象

`javascript
var state = {
    // 译本
    translations: [],           // 可用译本列表
    currentTranslation: 'kjv',  // 当前译本
    onlySword: {},              // 仅存在于 SWORD 的译本标记

    // 多版本对照
    compare: false,             // 对照模式开关
    compareTranslations: [],    // 对照译本列表

    // 书卷/章节
    currentBook: null,          // 当前书卷对象
    currentChapter: 1,          // 当前章节

    // 经文数据
    verses: [],                 // 当前显示的经文

    // 搜索
    searchQuery: '',
    searchResults: [],

    // UI
    lang: 'zh',                 // 当前语言 (zh/en/bilingual)

    // Interlinear
    interlinear: false,
    interlinearData: null,

    // TTS
    ttsPlaying: false,
    ttsCurrentVerse: null,

    // 注释
    activeCommentary: null,
    commentaries: [],
};
`

## 函数分类 (122 个)

### 初始化链 (DOMContentLoaded)
`
loadTranslations() → renderTranslationSelector() → loadBooks() → loadChapter() → renderVerses()
`

### 译本管理 (5 函数)
`
loadTranslations()      — 从 H2 + SWORD 加载译本
renderTranslationSelector() — 渲染下拉选择器
transLabel()            — 双语标签
transShortLabel()       — 短标签
isSwordTranslation()    — 判断是否 SWORD 译本
`

### 书卷/章节 (6 函数)
`
loadBooks()             — 加载书卷列表 + 初始化网格
renderBookList()        — 渲染书卷选择器
renderChapterGrid()     — 渲染章节网格（含点击事件）
renderChapterNav()      — 上/下章导航
renderChapterHeader()   — 章节标题 + 朗读按钮
loadChapter()           — 加载经文（sword/text 分流）
`

### 经文渲染 (7 函数)
`
renderVerses()          — 主渲染函数（单版/对照/interlinear 分流）
renderInterlinear()     — 逐词对照视图
renderCompareBar()      — 多版本对照栏
loadAllCompare()        — 加载所有对照版本
renderCompareSelector() — 对照版本选择器
makeWordsClickable()    — 词点击事件绑定
highlight()             — 搜索高亮
`

### 注释系统 (4 函数)
`
loadCommentaries()      — 加载注释源列表
renderCommentaryTabs()  — 渲染注释标签页
renderCommentaryBody()  — 渲染注释正文
cmtName()               — 注释名称双语化
`

### Strong's / 词典 (10 函数)
`
fetchStrongsTooltip()   — Hover 气泡 (300ms 防抖)
showStrongsTooltip()    — 显示气泡
hideStrongsTooltip()    — 隐藏气泡
searchStrongs()         — Strong's 编号查询
renderStrongsResults()  — 渲染查询结果
renderStrongsEntry()    — 单个条目渲染
openUnifiedPopup()      — 统一弹窗（希/希伯来语/搜索）
dictSearch()            — 词典搜索
unifiedSearch()         — 统一词典搜索
strongsKeywordSearch()  — 关键词搜索 Strong's
`

### 形态码 (3 函数)
`
fetchMorphTooltip()     — Morph hover 解释 (先查 MORPH_TABLE 再调 API)
isMorphCode()           — 判断是否为形态码 (H≥8685/G≥5000)
showMorphHelp()         — 形态码帮助面板
`

### 每日灵修 (15 函数)
`
openDevotionPanel()     — 打开灵修面板
loadDevotionKeys()      — 加载灵修键列表
renderDevotionCalendar() — 渲染日历选择器
selectDevotionKey()     — 选择日期
devotionKeyToMMDD()     — 中文日期 → MM.DD 转换
renderDevotionSection() — 渲染灵修正文
parseDevotionOSIS()     — OSIS XML 解析
renderDevotionInline()  — 内联渲染
toggleDevotionRead()    — 标记已读
isDevotionRead()        — 检查已读状态
toggleDevotionNote()    — 笔记切换
saveDevotionNote()      — 保存笔记
loadDevotionNote()      — 读取笔记
getDevotionReadSet()    — 获取已读集合
goToToday()             — 跳转到今天
`

### 通用书 (6 函数)
`
openGenBookPanel()      — 打开通用书面板
loadGenBookKeys()       — 加载键列表（分页）
selectGenBookKey()      — 选择键
searchGenBookKeys()     — 键搜索
switchGenBookModule()   — 切换模块
parseThMLContent()      — ThML 解析
`

### 模块管理 (10 函数)
`
openModulesPanel()      — 打开模块面板
loadInstalledModules()  — 加载已安装
loadAvailableModules()  — 加载可安装
filterModuleList()      — 搜索/分类过滤
renderModuleList()      — 渲染模块卡片
installModule()         — 安装模块
uninstallModule()       — 卸载模块
setModuleStatus()       — 状态提示
switchModulesTab()      — 切换标签
mcCatLabel()            — 分类标签双语
`

### TTS (7 函数)
`
initTTS()               — 初始化语音
speakVerse()            — 朗读单节
speakChapter()          — 朗读整章
speakNext()             — 自动跳到下一节
stopTTS()               — 停止
highlightSpeakingVerse() — 高亮正在朗读的节
updateTTSControls()     — 更新朗读按钮
`

### UI / i18n (7 函数)
`
t()                     — 双语翻译函数
setupLanguage()         — 语言切换
refreshLabels()         — 刷新所有标签
escHtml()               — HTML 转义
escAttr()               — 属性转义
bookLabel()             — 书卷名双语
findBookName()          — 反向查找书卷名
`

### 数据/辅助 (15+ 函数)
`
apiGet()                — 通用 API 请求
loadTranslations()       — 从 /translations + /sword/modules 加载
merge()                 — 深度合并对象
flushBuf()              — 缓冲处理 (dispatchTag)
handleWordClick()       — 词点击事件分发
... 等其他辅助函数
`

## 渲染流程

`
用户操作
   ↓
事件处理函数
   ↓
API 请求 (fetch → Gateway → 微服务)
   ↓
state 更新
   ↓
DOM 渲染 (直接操作 DOM)
`

## 双语系统

### I18N 对象结构
`javascript
var I18N = {
    "Reading": { zh: "阅读", en: "Reading" },
    "Devotion": { zh: "灵修", en: "Devotion" },
    "Modules": { zh: "模块", en: "Modules" },
    "Commentary": { zh: "注释", en: "Commentary" },
    // ... 100+ 条目
};
`

### t() 函数
`javascript
function t(key, lang) {
    // 如果 I18N[key] 不存在，返回 key 本身
    // lang 默认 state.lang
    // bilingual 模式返回 "中文 / English"
}
`

## 关键设计模式

### 1. 直连 vs 代理
`javascript
// config.js 控制 API 路径
// SWORD_SERVICE_URL = '' → 空字符串使 fetch 变相对路径 → server.js 代理
// server.js 将 /api/* 转发到 Gateway :8080
`

### 2. 防抖
`javascript
// 搜索: 350ms 防抖 (searchTimer)
// Strong's hover: 300ms 防抖 (strongsHoverTimer)
// GenBook 搜索: 300ms 防抖 (_genbookKeySearchTimer)
`

### 3. Session 缓存
`javascript
// Strong's 释义: strongsCache = {} (session 内缓存)
// Morph 释义: morphCache = {} (session 内缓存)
`

### 4. localStorage 持久化
`javascript
// 灵修已读状态: localStorage 'devotion_read'
// 灵修笔记: localStorage 'devotion_note_MM.DD'
// 语言偏好: localStorage 'bible_lang'
`

## 浏览器兼容性

- 目标: Chrome/Edge/Firefox 现代版本
- 不依赖任何 polyfill
- 使用 ES5+ 语法（无 Babel 转译）
- CSS: Flexbox + CSS Grid + CSS Variables