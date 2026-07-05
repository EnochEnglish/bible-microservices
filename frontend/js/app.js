console.log('[DEBUG app.js] loaded');
// ── State ──
var state = {
  translations: [],
  currentTranslation: "kjv",
  compareTranslations: [],       // array, multi-version
  compareData: {},               // keyed by translation id
  books: [],
  currentBook: { id: "GEN", name: "Genesis", nameZh: "创世记", chapters: 50 },
  currentChapter: 1,
  verses: null,
  searchResults: null,
  view: "reader",
  lang: "bilingual",
  interlinear: false,
  interlinearData: null,
  hasStrongs: false,
  commentaries: null,
  activeCommentary: "TSK",
  // TTS
  tts: { playing: false, currentVerse: -1, voices: [] }
};

// ── Translation Names (Chinese) ──
var TRANSLATION_NAMES = {
  kjv: "KJV 英王钦定本", web: "WEB 英文世界版", asv: "ASV 美国标准版",
  bbe: "BBE 基础英文", dby: "Darby 达秘译本", wbt: "Webster 韦氏译本",
  ylt: "YLT 杨氏直译本", cuv_gb: "和合本 (简体)", cuv_tw: "和合本 (繁体)",
  lxx: "七十士译本", byz: "拜占庭希腊文新约", vulgate: "武加大译本",
  oshb: "希伯来原文圣经",
  tr: "TR 公认经文", sblgnt: "SBL 希腊文新约", morphgnt: "MorphGNT 词形分析",
  sp: "撒玛利亚五经", bsb: "BSB 庇哩亚标准", geneva1599: "日内瓦圣经",
  drc: "杜埃-兰斯译本", chincvs: "中文新译本", russynodal: "俄文译本"
};

// ── SWORD module map (for interlinear / Strong's data) ──
var SWORD_MODULE_MAP = {
  "kjv": "KJV",
  "chiuns": "ChiUns",
  "chiun": "ChiUn",
  "bsb": "BSB",
  "oshb": "OSHB",
  "sp": "SP",
  "lxx": "LXX"
};
function isSwordTranslation(tid) { return tid in SWORD_MODULE_MAP; }

// Translations that support interlinear (have Strong's words data)
var INTERLINEAR_TRANSLATIONS = ['kjv', 'chiuns', 'chiun', 'bsb', 'oshb', 'sp', 'lxx'];
function isInterlinearTranslation(tid) { return INTERLINEAR_TRANSLATIONS.indexOf(tid) >= 0; }

// Sword-only translations (not in text-service H2, only in sword-service via JSword)
function isSwordOnlyTranslation(tid) { return tid === "chiuns" || tid === "chiun"; }

function swordBookToAppBook(swordBook) {
  var osisId = swordBook.osisId.toUpperCase();
  var b = BOOK_ORDER.find(function(x) { return x.id === osisId; });
  return {
    id: osisId,
    book_id: osisId,
    name: b ? b.name : osisId,
    nameZh: b ? b.nameZh : osisId,
    chapter_count: swordBook.chapterCount,
    chapters: swordBook.chapterCount
  };
}

// ── Commentary Names (language-aware) ──
var COMMENTARY_NAMES_ZH = {
  TSK: "TSK 交叉引用",
  JFB: "JFB 注释",
  MHCC: "Matthew Henry 简注",
  MHC: "Matthew Henry 全注",
  Clarke: "Adam Clarke 注释",
  Calvin: "加尔文注释",
  Barnes: "Barnes NT 注释",
  RWP: "Robertson 词图",
  Catena: "教父集注",
  Wesley: "Wesley 注释",
  Abbott: "Abbott NT 插图",
  Burkitt: "Burkitt 注释",
  CalvinCommentaries: "加尔文全集注释",
  DTN: "Darby 译本注释",
  Family: "Family Bible 注释",
  Geneva: "日内瓦圣经注释",
  KD: "KD 旧约注释",
  KingComments: "Kingcomments 全本注释",
  Lightfoot: "Lightfoot 注释",
  Luther: "路德注释选",
  MAK: "MAK 注释",
  NETnotesfree: "NET 圣经脚注",
  PNT: "人民新约注释",
  Personal: "个人注释",
  QuotingPassages: "经文引证",
  Rieger: "Rieger 注释",
  SBLGNTApp: "SBLGNT 校勘",
  Scofield: "Scofield 串珠",
  Sentiment: "圣经情感分析",
  Spurious: "Tischendorf 伪经",
  TDavid: "司布真大卫宝库",
  TFG: "四福音合参",
  VarApp: "NT 抄本异文",
  VulgGlossa: "Glossa 标准注疏"
};

var COMMENTARY_NAMES_EN = {
  TSK: "TSK Cross-Refs",
  JFB: "JFB Commentary",
  MHCC: "M.H. Concise",
  MHC: "M.H. Complete",
  Clarke: "Clarke's Commentary",
  Calvin: "Calvin's Commentary",
  Barnes: "Barnes NT Notes",
  RWP: "Robertson Word Pix",
  Catena: "Catena Aurea",
  Wesley: "Wesley's Notes",
  Abbott: "Abbott's Illustrated NT",
  Burkitt: "Burkitt's Notes",
  CalvinCommentaries: "Calvin's Collected Comm.",
  DTN: "Darby Translation Notes",
  Family: "Family Bible Notes",
  Geneva: "Geneva Bible Notes",
  KD: "Keil & Delitzsch (OT)",
  KingComments: "Kingcomments",
  Lightfoot: "Lightfoot Commentary",
  Luther: "Luther's Selected Comm.",
  MAK: "Matthias Ansorgs Komm.",
  NETnotesfree: "NET Bible Footnotes",
  PNT: "People's New Testament",
  Personal: "Personal Commentary",
  QuotingPassages: "Quoting Passages",
  Rieger: "Rieger's Commentary",
  SBLGNTApp: "SBLGNT Apparatus",
  Scofield: "Scofield Ref Notes",
  Sentiment: "Bible Sentiment Analysis",
  Spurious: "Tischendorf's Spurious",
  TDavid: "Spurgeon's Treasury",
  TFG: "Fourfold Gospel",
  VarApp: "NT Variant Apparatus",
  VulgGlossa: "Glossa Ordinaria"
};

function cmtName(id) {
  if (state.lang === "en") return COMMENTARY_NAMES_EN[id] || id;
  if (state.lang === "zh") return COMMENTARY_NAMES_ZH[id] || id;
  return (COMMENTARY_NAMES_ZH[id] || id) + " / " + (COMMENTARY_NAMES_EN[id] || id);
}

var DICT_NAMES_ZH = {
  easton: "Easton 圣经词典",
  isbe: "ISBE 国际圣经百科",
  nave: "Nave 主题索引"
};

var DICT_NAMES_EN = {
  easton: "Easton's Bible Dictionary",
  isbe: "ISBE Encyclopedia",
  nave: "Nave's Topical Bible"
};

function dictName(id) {
  if (state.lang === "en") return DICT_NAMES_EN[id] || id;
  if (state.lang === "zh") return DICT_NAMES_ZH[id] || id;
  return DICT_NAMES_ZH[id] || DICT_NAMES_EN[id] || id;
}

// ── I18N ──
var I18N = {
  en: {
    search: "Search the Bible...",
    loading: "Loading...",
    failed: "Failed to load",
    searching: "Searching...",
    noResults: "No results found",
    searchFailed: "Search failed",
    results: "results",
    commentary: "Commentary",
    noCommentary: "No commentary for this chapter",
    oldTestament: "Old Testament",
    newTestament: "New Testament",
    previous: "← Prev",
    next: "Next →",
    compareMode: "Compare",
    compareOff: "Close Compare",
    selectVersions: "Select versions...",
    strongsPlaceholder: "Strong's...",
    strongsTitle: "Strong's Dictionary",
    strongsSearching: "Searching...",
    strongsNoResult: "No Strong's entry found",
    strongsHebrew: "Hebrew",
    strongsGreek: "Greek",
    chapterNum: "Ch.",
    searchEmpty: "Enter a keyword to search",
    dictTitle: "Bible Dictionary",
    dictSearch: "Select a dictionary and search for a term",
    dictSelect: "Select",
    commentarySection: "Commentary",
    readChapter: "Read Full Chapter",
    verseClickHint: "Click to hear verse",
    // I18N keys for bilingual labels
    interlinearBtn: "🔤 Interlinear",
    interlinearTip: "Toggle word-by-word interlinear view",
    ilWord: "Word", ilStrongs: "Strong's", ilLemma: "Lemma", ilMorph: "Morph", ilFootnote: "Footnotes",
    morphUnknown: "No description available for this code",
    devotionToday: "📅 Today's Devotion",
    devotionRead: "Mark as read",
    devotionNote: "Write a note...",
    devotionNoContent: "No devotion content for this date",
    devotionError: "Failed to load devotion",
    devotionModuleSME: "Spurgeon M&E",
    devotionModuleDaily: "Daily Light",
    mapsTitle: "Bible Maps",
    mapsSelectAtlas: "-- Select Atlas --",
    planTitle: "Reading Plan",
    planToday: "Today",
    authTitle: "Login",
    authTabLogin: "Login",
    authTabRegister: "Register",
    authForgotLink: "Forgot password?",
    authForgotHint: "Enter username to show password and reset login",
    authResetBtn: "Reset Password",
    authBackLogin: "Back to Login",
    profileEdit: "Edit Profile",
    profileChangePwd: "Change Password",
    profileLogout: "Logout",
    profileSave: "Save",
    profileCancel: "Cancel",
    pwdChange: "Change",
    captchaLoad: "Click to load",
    genderMale: "Male",
    genderFemale: "Female",
    genderLabel: "Gender"
  },
  zh: {
    search: "搜索经文...",
    loading: "加载中...",
    failed: "加载失败",
    searching: "搜索中...",
    noResults: "未找到结果",
    searchFailed: "搜索失败",
    results: "条结果",
    commentary: "注释",
    noCommentary: "本章暂无注释",
    oldTestament: "旧约",
    newTestament: "新约",
    previous: "← 上一章",
    next: "下一章 →",
    compareMode: "多版本对照",
    compareOff: "关闭对照",
    selectVersions: "选择对照版本...",
    strongsPlaceholder: "Strong's 词典...",
    strongsTitle: "Strong's 词典",
    strongsSearching: "搜索中...",
    strongsNoResult: "未找到匹配的词典条目",
    strongsHebrew: "希伯来文",
    strongsGreek: "希腊文",
    chapterNum: "第",
    searchEmpty: "输入关键词搜索经文",
    dictTitle: "圣经词典",
    dictSearch: "选择词典并搜索词条",
    dictSelect: "选择词典",
    commentarySection: "注释",
    readChapter: "朗读全章",
    verseClickHint: "点击朗读本节",
    interlinearBtn: "🔤 逐词对照",
    interlinearTip: "切换逐词对照视图",
    ilWord: "词", ilStrongs: "原文字典", ilLemma: "词形", ilMorph: "形态", ilFootnote: "脚注",
    morphUnknown: "此编码暂无中文说明",
    devotionToday: "📅 今日灵修",
    devotionRead: "标记已读",
    devotionNote: "写笔记...",
    devotionNoContent: "此日期暂无灵修内容",
    devotionError: "灵修加载失败",
    devotionModuleSME: "司布真晨晚祷",
    devotionModuleDaily: "每日亮光",
    mapsTitle: "圣经地图",
    mapsSelectAtlas: "-- 选择地图集 --",
    planTitle: "读经计划",
    planToday: "今天",
    authTitle: "登录",
    authTabLogin: "登录",
    authTabRegister: "注册",
    authForgotLink: "忘记密码？",
    authForgotHint: "请输入用户名，系统将显示密码并重置登录",
    authResetBtn: "重置密码",
    authBackLogin: "返回登录",
    profileEdit: "编辑资料",
    profileChangePwd: "修改密码",
    profileLogout: "退出登录",
    profileSave: "保存",
    profileCancel: "取消",
    pwdChange: "修改",
    captchaLoad: "点击加载",
    genderMale: "男",
    genderFemale: "女",
    genderLabel: "性别"
  }
};

function t(key) {
  if (state.lang === "zh") return I18N.zh[key] || I18N.en[key];
  if (state.lang === "bilingual") {
    // For bilingual, prefer Chinese for section labels, English for UI
    var zh = I18N.zh[key];
    var en = I18N.en[key];
    // I18N bilingual: commentary / noCommentary / oldTestament / newTestament / compareMode / compareOff → prefer zh in bilingual
  // I18N bilingual: readChapter stays bilingual
  if (key === "readChapter" || key === "verseClickHint" || key === "devotionToday" || key === "devotionRead" || key === "devotionNote") return (zh || "") + " / " + (en || "");
  if (key === "commentary" || key === "oldTestament" || key === "newTestament" || key === "compareMode" || key === "compareOff") return zh || en;
  if (key === "interlinearBtn" || key === "interlinearTip" || key === "ilStrongs" || key === "ilLemma" || key === "ilMorph" || key === "ilFootnote") return (zh || "") + " / " + (en || "");
    return en;
  }
  return I18N.en[key];
}

function bookLabel(b) {
  if (state.lang === "zh") return b.nameZh || b.name;
  if (state.lang === "bilingual") return b.nameZh + " / " + (b.name || "");
  return b.name;
}

function transLabel(t, lang) {
  var l = lang || state.lang;
  var short = t.abbreviation || t.id.toUpperCase();
  var zhName = TRANSLATION_NAMES[t.id] || t.name || t.id.toUpperCase();
  var enName = t.name || t.id.toUpperCase();
  if (l === "zh") return zhName + " (" + short + ")";
  if (l === "bilingual") return enName + " / " + zhName;
  return enName + " (" + short + ")";
}

function transShortLabel(t) {
  var zh = TRANSLATION_NAMES[t.id] || t.name || t.id.toUpperCase();
  return zh;
}

// ── Book Order (66 canonical) ──
var BOOK_ORDER = [
  {id:"GEN",name:"Genesis",nameZh:"创世记",chapters:50},{id:"EXO",name:"Exodus",nameZh:"出埃及记",chapters:40},
  {id:"LEV",name:"Leviticus",nameZh:"利未记",chapters:27},{id:"NUM",name:"Numbers",nameZh:"民数记",chapters:36},
  {id:"DEU",name:"Deuteronomy",nameZh:"申命记",chapters:34},{id:"JOS",name:"Joshua",nameZh:"约书亚记",chapters:24},
  {id:"JDG",name:"Judges",nameZh:"士师记",chapters:21},{id:"RUT",name:"Ruth",nameZh:"路得记",chapters:4},
  {id:"1SA",name:"1 Samuel",nameZh:"撒母耳记上",chapters:31},{id:"2SA",name:"2 Samuel",nameZh:"撒母耳记下",chapters:24},
  {id:"1KI",name:"1 Kings",nameZh:"列王纪上",chapters:22},{id:"2KI",name:"2 Kings",nameZh:"列王纪下",chapters:25},
  {id:"1CH",name:"1 Chronicles",nameZh:"历代志上",chapters:29},{id:"2CH",name:"2 Chronicles",nameZh:"历代志下",chapters:36},
  {id:"EZR",name:"Ezra",nameZh:"以斯拉记",chapters:10},{id:"NEH",name:"Nehemiah",nameZh:"尼希米记",chapters:13},
  {id:"EST",name:"Esther",nameZh:"以斯帖记",chapters:10},{id:"JOB",name:"Job",nameZh:"约伯记",chapters:42},
  {id:"PSA",name:"Psalms",nameZh:"诗篇",chapters:150},{id:"PRO",name:"Proverbs",nameZh:"箴言",chapters:31},
  {id:"ECC",name:"Ecclesiastes",nameZh:"传道书",chapters:12},{id:"SNG",name:"Song of Solomon",nameZh:"雅歌",chapters:8},
  {id:"ISA",name:"Isaiah",nameZh:"以赛亚书",chapters:66},{id:"JER",name:"Jeremiah",nameZh:"耶利米书",chapters:52},
  {id:"LAM",name:"Lamentations",nameZh:"耶利米哀歌",chapters:5},{id:"EZK",name:"Ezekiel",nameZh:"以西结书",chapters:48},
  {id:"DAN",name:"Daniel",nameZh:"但以理书",chapters:12},{id:"HOS",name:"Hosea",nameZh:"何西阿书",chapters:14},
  {id:"JOL",name:"Joel",nameZh:"约珥书",chapters:3},{id:"AMO",name:"Amos",nameZh:"阿摩司书",chapters:9},
  {id:"OBA",name:"Obadiah",nameZh:"俄巴底亚书",chapters:1},{id:"JON",name:"Jonah",nameZh:"约拿书",chapters:4},
  {id:"MIC",name:"Micah",nameZh:"弥迦书",chapters:7},{id:"NAM",name:"Nahum",nameZh:"那鸿书",chapters:3},
  {id:"HAB",name:"Habakkuk",nameZh:"哈巴谷书",chapters:3},{id:"ZEP",name:"Zephaniah",nameZh:"西番雅书",chapters:3},
  {id:"HAG",name:"Haggai",nameZh:"哈该书",chapters:2},{id:"ZEC",name:"Zechariah",nameZh:"撒迦利亚书",chapters:14},
  {id:"MAL",name:"Malachi",nameZh:"玛拉基书",chapters:4},
  {id:"MAT",name:"Matthew",nameZh:"马太福音",chapters:28},{id:"MRK",name:"Mark",nameZh:"马可福音",chapters:16},
  {id:"LUK",name:"Luke",nameZh:"路加福音",chapters:24},{id:"JHN",name:"John",nameZh:"约翰福音",chapters:21},
  {id:"ACT",name:"Acts",nameZh:"使徒行传",chapters:28},{id:"ROM",name:"Romans",nameZh:"罗马书",chapters:16},
  {id:"1CO",name:"1 Corinthians",nameZh:"哥林多前书",chapters:16},{id:"2CO",name:"2 Corinthians",nameZh:"哥林多后书",chapters:13},
  {id:"GAL",name:"Galatians",nameZh:"加拉太书",chapters:6},{id:"EPH",name:"Ephesians",nameZh:"以弗所书",chapters:6},
  {id:"PHP",name:"Philippians",nameZh:"腓立比书",chapters:4},{id:"COL",name:"Colossians",nameZh:"歌罗西书",chapters:4},
  {id:"1TH",name:"1 Thessalonians",nameZh:"帖撒罗尼迦前书",chapters:5},{id:"2TH",name:"2 Thessalonians",nameZh:"帖撒罗尼迦后书",chapters:3},
  {id:"1TI",name:"1 Timothy",nameZh:"提摩太前书",chapters:6},{id:"2TI",name:"2 Timothy",nameZh:"提摩太后书",chapters:4},
  {id:"TIT",name:"Titus",nameZh:"提多书",chapters:3},{id:"PHM",name:"Philemon",nameZh:"腓利门书",chapters:1},
  {id:"HEB",name:"Hebrews",nameZh:"希伯来书",chapters:13},{id:"JAS",name:"James",nameZh:"雅各书",chapters:5},
  {id:"1PE",name:"1 Peter",nameZh:"彼得前书",chapters:5},{id:"2PE",name:"2 Peter",nameZh:"彼得后书",chapters:3},
  {id:"1JN",name:"1 John",nameZh:"约翰一书",chapters:5},{id:"2JN",name:"2 John",nameZh:"约翰二书",chapters:1},
  {id:"3JN",name:"3 John",nameZh:"约翰三书",chapters:1},{id:"JUD",name:"Jude",nameZh:"犹大书",chapters:1},
  {id:"REV",name:"Revelation",nameZh:"启示录",chapters:22}
];
var OT_BOOKS = BOOK_ORDER.slice(0, 39);
var NT_BOOKS = BOOK_ORDER.slice(39);
var API = APP_CONFIG.apiBase;  // from config.js
console.log('[DEBUG] API =', API, 'APP_CONFIG.apiBase =', APP_CONFIG.apiBase);

function apiGet(path) {
  return fetch('/api/v1' + path).then(function(r) {
    if (!r.ok) throw new Error(r.status);
    return r.json();
  });
}

// ═══════════════════════════════════════════
//  TRANSLATIONS
// ═══════════════════════════════════════════
function loadTranslations() {
  return apiGet("/bible/translations").then(function(data) {
    state.translations = data.translations || [];
    // Inject sword-only translations not in text-service
    var swordOnly = [{id:"chiuns", name:"和合本 (简体字)", nameZh:"和合本 (简体字)", language:"chinese", abbreviation:"CUVS"},{id:"chiun", name:"和合本 (繁體字)", nameZh:"和合本 (繁體字)", language:"chinese", abbreviation:"CUVT"}];
    swordOnly.forEach(function(st) {
      if (!state.translations.find(function(t) { return t.id === st.id; })) {
        state.translations.push(st);
      }
    });
    renderTranslationSelector();
    renderCompareSelector();
  }).catch(function() {
    setTimeout(loadTranslations, 3000);
  });
}

function renderTranslationSelector() {
  var sel = document.getElementById("translationSelect");
  var html = "";
  // Sort: sword/interlinear versions first, then others
  var sorted = state.translations.slice().sort(function(a, b) {
    var aIl = isSwordTranslation(a.id) ? 0 : 1;
    var bIl = isSwordTranslation(b.id) ? 0 : 1;
    return aIl - bIl;
  });
  sorted.forEach(function(t) {
    var label = transLabel(t);
    var ilBadge = isSwordTranslation(t.id) ? ' 🔤' : '';
    html += '<option value="' + t.id + '"' + (t.id === state.currentTranslation ? " selected" : "") + '>' + label + ilBadge + '</option>';
  });
  sel.innerHTML = html;
  sel.onchange = function(e) {
    state.currentTranslation = e.target.value;
    state.compareTranslations = [];
    state.compareData = {};
    // Reset interlinear when switching translations
    state.interlinear = false;
    state.interlinearData = null;
    renderCompareSelector();
    renderCompareBar();
    loadBooks().then(function() { loadChapter(); });
  };
}

function renderCompareSelector() {
  var sel = document.getElementById("compareSelect");
  var others = state.translations.filter(function(t) { return t.id !== state.currentTranslation; });
  var html = '<option value="">📐 ' + t("compareMode") + '</option>';
  others.forEach(function(t) {
    var selected = state.compareTranslations.indexOf(t.id) >= 0 ? " selected" : "";
    html += '<option value="' + t.id + '"' + selected + '>' + transShortLabel(t) + '</option>';
  });
  sel.innerHTML = html;
  sel.onchange = function(e) {
    if (!e.target.value) return;
    var tid = e.target.value;
    if (state.compareTranslations.indexOf(tid) < 0) {
      state.compareTranslations.push(tid);
    }
    e.target.value = ""; // reset dropdown
    loadAllCompare();
    renderCompareBar();
  };
}

// ═══════════════════════════════════════════
//  LANGUAGE
// ═══════════════════════════════════════════
function applyLanguageLabels() {
  // Update all elements with data-zh/data-en
  document.querySelectorAll('[data-zh]').forEach(function(el){
    var zh=el.getAttribute('data-zh');var en=el.getAttribute('data-en');
    if(!zh)return;
    if(state.lang==='zh')el.textContent=zh;
    else if(state.lang==='bilingual')el.textContent=zh+' / '+en;
    else el.textContent=en;
  });
  // Update all elements with data-zh-ph/data-en-ph (placeholders)
  document.querySelectorAll('[data-zh-ph]').forEach(function(el){
    var zh=el.getAttribute('data-zh-ph');var en=el.getAttribute('data-en-ph');
    if(!zh)return;
    if(state.lang==='zh')el.placeholder=zh;
    else if(state.lang==='bilingual')el.placeholder=zh+' / '+en;
    else el.placeholder=en;
  });
  // Update all elements with data-zh-title/data-en-title (tooltips)
  document.querySelectorAll('[data-zh-title]').forEach(function(el){
    var zh=el.getAttribute('data-zh-title');var en=el.getAttribute('data-en-title');
    if(!zh)return;
    if(state.lang==='zh')el.title=zh;
    else if(state.lang==='bilingual')el.title=zh+' / '+en;
    else el.title=en;
  });
}

function setupLanguage() {
  var sel = document.getElementById("langToggle");
  if (!sel) return;
  sel.value = state.lang;
  sel.onchange = function(e) {
    state.lang = e.target.value;
    renderTranslationSelector();
    renderBookList();
    renderChapterGrid();
    renderChapterNav();
    if (state.view === "reader") {
      renderChapterHeader();
      updateTTSControls();
      renderCompareSelector();
      renderCommentaryTabs();
      renderCommentaryBody();
    }
    if (state.view === "search") {
      renderSearchResults(state._lastQuery || "");
    }
    refreshLabels();
    applyLanguageLabels();
    // Update login button (may be overridden by updateLoginButton)
    if (!authState.loggedIn) updateLoginButton();
    // Refresh dictionary popup if open
    if (document.getElementById("dictOverlay").style.display === "flex") {
      document.getElementById("dictPopupTitle").textContent = "📚 " + t("dictTitle");
      loadDictSources();
    }
  };
  // Apply labels on initial load
  applyLanguageLabels();
}

function refreshLabels() {
  document.getElementById("searchBox").placeholder = t("search");
}

// ═══════════════════════════════════════════
//  BOOKS
// ═══════════════════════════════════════════
function loadBooks() {
  // Sword-only translations: fetch books from sword-service
  if (isSwordOnlyTranslation(state.currentTranslation)) {
    var mod = SWORD_MODULE_MAP[state.currentTranslation];
    return fetch("/api/v1/sword/modules/" + mod + "/books")
      .then(function(r) { return r.json(); })
      .then(function(data) {
        state.books = (data.books || []).map(swordBookToAppBook);
        renderBookList();
      }).catch(function() { renderBookList(); });
  }
  return apiGet("/bible/" + state.currentTranslation + "/books").then(function(data) {
    if (data.books) state.books = data.books.map(function(b) {
      b.id = b.book_id; b.chapters = b.chapter_count; return b;
    });
    renderBookList();
  }).catch(function() { renderBookList(); });
}

function renderBookList() {
  var ctx = document.getElementById("bookList");
  var map = {};
  state.books.forEach(function(b) { map[b.id] = b; });

  function merge(arr) {
    return arr.map(function(b) {
      var m = map[b.id] || {};
      return { id: b.id, name: b.name, nameZh: b.nameZh, chapters: m.chapters || b.chapters };
    });
  }

  var html = '<div class="section-title">' + t("oldTestament") + '</div>';
  merge(OT_BOOKS).forEach(function(b) {
    html += '<div class="book-item' + (state.currentBook.id === b.id ? " active" : "") + '" data-book="' + b.id + '">'
      + '<span>' + bookLabel(b) + '</span>'
      + '<span class="book-ch-count">' + b.chapters + '</span></div>';
  });
  html += '<div class="section-title">' + t("newTestament") + '</div>';
  merge(NT_BOOKS).forEach(function(b) {
    html += '<div class="book-item' + (state.currentBook.id === b.id ? " active" : "") + '" data-book="' + b.id + '">'
      + '<span>' + bookLabel(b) + '</span>'
      + '<span class="book-ch-count">' + b.chapters + '</span></div>';
  });
  ctx.innerHTML = html;

  ctx.querySelectorAll(".book-item").forEach(function(el) {
    el.addEventListener("click", function() {
      var id = el.dataset.book;
      var b = BOOK_ORDER.find(function(x) { return x.id === id; });
      if (b) {
        state.currentBook = b;
        state.currentChapter = 1;
        renderBookList();
        renderChapterGrid();
        loadChapter();
      }
    });
  });
}

function renderChapterGrid() {
  var ctx = document.getElementById("chapterGrid");
  var ch = state.currentBook.chapters;
  var step = ch <= 50 ? 1 : ch <= 100 ? 2 : 5;
  var nums = [];
  for (var i = 1; i <= ch; i += step) nums.push(i);
  if (nums.indexOf(ch) === -1) nums.push(ch);

  var html = "";
  nums.forEach(function(n) {
    html += '<div class="ch' + (n === state.currentChapter ? " active" : "") + '" data-ch="' + n + '">' + n + '</div>';
  });
  ctx.innerHTML = html;

  ctx.querySelectorAll(".ch").forEach(function(el) {
    el.addEventListener("click", function() {
      state.currentChapter = parseInt(el.dataset.ch);
      renderChapterGrid();
      loadChapter();
    });
  });
}

// ═══════════════════════════════════════════
//  CHAPTER LOADING
// ═══════════════════════════════════════════
function loadChapter() {
  stopTTS();
  state.view = "reader";
  document.getElementById("verseContent").innerHTML = '<div class="loading">' + t("loading") + '</div>';
  document.getElementById("searchResults").style.display = "none";
  document.getElementById("readerView").style.display = "block";
  document.getElementById("searchBox").value = "";

  var bookId = state.currentBook.id.toLowerCase();

  // Sword-only translations: fetch verse text from sword-service
  if (isSwordOnlyTranslation(state.currentTranslation)) {
    var mod = SWORD_MODULE_MAP[state.currentTranslation];
    var ref = bookId + "." + state.currentChapter;
    var swordUrl = "/api/v1/sword/" + mod + "/passage/" + ref;
    if (state.interlinear) swordUrl += "?strongs=true";

    fetch(swordUrl).then(function(r) { return r.json(); }).then(function(data) {
      // Normalize sword response to text-service format, strip OSIS tags
      var verses = (data.verses || []).map(function(v) {
        return { chapter: v.chapter, verse: v.verse, text: stripOsisTags(v.text) };
      });
      state.verses = { verses: verses };
      state.hasStrongs = !!(data.verses && data.verses.length > 0 && data.verses[0].words);
      renderChapterHeader();
      renderChapterNav();
      updateTTSControls();
      // If interlinear, sword data is both verse text and word-level data
      if (state.interlinear && data.verses && data.verses.length > 0 && data.verses[0].words) {
        state.interlinearData = data;
      }
      renderVerses();
    }).catch(function(e) {
      document.getElementById("verseContent").innerHTML = '<div class="loading">' + t("failed") + '</div>';
    });
    loadCommentaries();
    return;
  }

  var url = "/bible/" + state.currentTranslation + "/" + bookId + "/" + state.currentChapter;

  apiGet(url).then(function(data) {
    state.verses = data;
    state.hasStrongs = (data.verses && data.verses.length > 0 && data.verses[0].strongsAnnotation != null);
    renderChapterHeader();
    renderChapterNav();
    updateTTSControls();
    // Reload all compare versions
    if (state.compareTranslations.length) loadAllCompare();

    // Load interlinear data if applicable
    if (state.interlinear && isInterlinearTranslation(state.currentTranslation)) {
      loadInterlinear();
    } else {
      renderVerses();
    }
  }).catch(function(e) {
    document.getElementById("verseContent").innerHTML = '<div class="loading">' + t("failed") + '</div>';
  });

  loadCommentaries();
}

// ═══════════════════════════════════════════
//  VERSE RENDERING
// ═══════════════════════════════════════════
function renderVerses() {
  var container = document.getElementById("verseContent");

  // Interlinear mode: render word-by-word from sword data
  if (state.interlinear && state.interlinearData && isInterlinearTranslation(state.currentTranslation)) {
    renderInterlinear();
    return;
  }
  // Interlinear pending: show loading while waiting for sword data
  if (state.interlinear && isInterlinearTranslation(state.currentTranslation) && !state.interlinearData) {
    container.innerHTML = '<div class="loading">' + t("loading") + '</div>';
    return;
  }

  var verses = state.verses ? (state.verses.verses || []) : [];

  // Multi-version compare mode
  if (state.compareTranslations.length && Object.keys(state.compareData).length) {
    var allData = [];
    // Primary translation first
    allData.push({ id: state.currentTranslation, label: transShortLabel({id: state.currentTranslation}), data: verses });
    // Compare translations
    state.compareTranslations.forEach(function(tid) {
      var cd = state.compareData[tid];
      allData.push({ id: tid, label: transShortLabel({id: tid}), data: cd ? (cd.verses || []) : [] });
    });

    var numCols = allData.length;
    var maxN = verses.length;
    allData.forEach(function(d) { if (d.data.length > maxN) maxN = d.data.length; });

    var html = "";
    for (var i = 0; i < maxN; i++) {
      var vn = null;
      // Find verse number from any translation
      allData.forEach(function(d) {
        if (vn === null && d.data[i]) vn = d.data[i].verse;
      });
      if (vn === null) vn = i + 1;

      // Determine if wide enough for side-by-side (>=3 cols uses row layout)
      var useRow = (numCols >= 3);

      if (useRow) {
        // Row-based: each version on its own line with label
        html += '<div class="compare-row">';
        html += '<div class="compare-vn">' + vn + '</div>';
        html += '<div class="compare-cols">';
        allData.forEach(function(d, ci) {
          var v = d.data[i];
          var text = v ? (v.text || "") : "";
          html += '<div class="compare-col-item">';
          html += '<span class="compare-col-label">' + d.label + '</span>';
          html += '<span class="compare-col-text">' + makeWordsClickable(text) + '</span>';
          html += '</div>';
        });
        html += '</div></div>';
      } else {
        // 2-column side-by-side
        html += '<div class="bilingual-row" style="grid-template-columns: repeat(' + numCols + ', 1fr)">';
        allData.forEach(function(d, ci) {
          var v = d.data[i];
          var text = v ? (v.text || "") : "";
          html += '<div class="bilingual-col"' + (ci > 0 ? '' : '') + '>';
          html += '<div class="bilingual-label">' + d.label + '</div>';
          html += '<div class="verse" style="padding-left:0;margin-bottom:0"><span class="verse-text">' + makeWordsClickable(text) + '</span></div>';
          html += '</div>';
        });
        html += '</div>';
      }
    }
    container.innerHTML = html;
    container.classList.remove("loading");

  } else {
    // Normal single-translation mode
    var html = "";
    var bookId = state.currentBook ? state.currentBook.id : "gen";
    var chapter = state.currentChapter;
    verses.forEach(function(v) {
      var ref = bookId + "." + chapter + "." + v.verse;
      html += '<div class="verse-line" data-ref="' + ref + '" id="v-' + ref + '">' +
        '<div class="verse">' +
        '<span class="verse-num tts-btn" onclick="speakVerse(' + v.verse + ')" title="' + t("verseClickHint") + '">' + v.verse + '</span>' +
        '<span class="verse-text">' + makeWordsClickable(v.text || "") + '</span>' +
        '</div>' +
        '<div class="verse-tools">' +
        '<button class="vt-btn vt-bookmark" title="' + (t("bookmark")||"Bookmark") + '" onclick="event.stopPropagation();toggleBookmark(\'' + ref + '\',this)" style="' + (isLoggedIn() ? '' : 'display:none') + '">🔖</button>' +
        '<button class="vt-btn vt-note" title="' + (t("note")||"Note") + '" onclick="event.stopPropagation();openNoteEditor(\'' + ref + '\')" style="' + (isLoggedIn() ? '' : 'display:none') + '">📝</button>' +
        '<button class="vt-btn vt-xref" title="' + (t("crossRefs")||"Cross Refs") + '" onclick="event.stopPropagation();toggleCrossRefs(\'' + ref + '\',this)">🔗</button>' +
        '</div></div>';
    });
    container.innerHTML = html;
    container.classList.remove("loading");
    // Apply bookmark indicators
    updateVerseToolUI();
  }

  // Attach click handlers for Strong's
  container.querySelectorAll(".verse-word").forEach(function(el) {
    el.addEventListener("click", function() {
      var word = el.textContent.trim();
      if (word) searchStrongs(word);
    });
  });
}

// Strip OSIS/ThML/HTML tags from SWORD passage text (e.g. <divineName>Lord</divineName>)
function stripOsisTags(text) {
  if (!text) return text;
  return text.replace(/<\/?[a-zA-Z_:][^>]*>/g, '');
}

function makeWordsClickable(text) {
  return stripOsisTags(text).replace(/([a-zA-ZΑ-ω]{3,})/g, '<span class="verse-word">$1</span>');
}

// ── Interlinear Data Loader (from sword-service :8086, via proxy) ──
function loadInterlinear() {
  var mod = SWORD_MODULE_MAP[state.currentTranslation];
  if (!mod) {
    state.interlinear = false;
    renderVerses();
    return Promise.reject("no sword module");
  }
  var key = state.currentBook.id.toLowerCase() + "." + state.currentChapter;
  state.interlinearData = null; // reset while loading
  console.log('[IL] fetching interlinear data:', mod, key);
  return fetch("/api/v1/sword/" + mod + "/passage/" + key + "?strongs=true")
    .then(function(r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function(data) {
      console.log('[IL] data loaded:', data.verses ? data.verses.length : 0, 'verses, first:', data.verses && data.verses[1] ? data.verses[1].words && data.verses[1].words.length : 0);
      state.interlinearData = data;
      renderVerses();
    }).catch(function(e) {
      console.error("Interlinear failed, fallback to plain", e);
      state.interlinear = false;
      state.interlinearData = null;
      renderVerses();
    });
}

// ── Strong's hover tooltip ──
var strongsCache = {};
var strongsHoverTimer = null;

function hideStrongsTooltip() {
  var el = document.getElementById("strongsTooltip");
  if (el) el.style.display = "none";
  if (strongsHoverTimer) { clearTimeout(strongsHoverTimer); strongsHoverTimer = null; }
}

function showStrongsTooltip(event, html) {
  var el = document.getElementById("strongsTooltip");
  if (!el) return;
  el.innerHTML = html;
  el.style.display = "block";
  var x = event.clientX + 14;
  var y = event.clientY - 8;
  var vw = window.innerWidth, vh = window.innerHeight;
  if (x + 370 > vw) x = event.clientX - 370;
  if (y + 200 > vh) y = event.clientY - 210;
  if (x < 4) x = 4;
  if (y < 4) y = 4;
  el.style.left = x + "px";
  el.style.top = y + "px";
}

function parseStrongsContent(raw, prefix) {
  if (!raw) return '<div class="st-def">(no definition)</div>';
  // Greek XML format from sword-service
  if (raw.indexOf("<entryFree") !== -1 || raw.indexOf("<orth>") !== -1) {
    var m0 = raw.match(/<orth[^>]*>([^<]+)<\/orth>/);
    var mT = raw.match(/<orth[^>]*type=\"trans\"[^>]*>([^<]+)<\/orth>/);
    var mP = raw.match(/<pron[^>]*>([^<]+)<\/pron>/);
    var mD = raw.match(/<def>\s*([\s\S]*?)\s*<\/def>/);
    var tr = mT ? mT[1] : "";
    var pr = mP ? mP[1] : "";
    var df = mD ? mD[1].replace(/<lb\/>/g, "").replace(/--/g, "—").trim() : "";
    var or = m0 ? m0[1] : "";
    var h = "";
    if (or) h += '<div class="st-head">' + escHtml(or) + (tr ? ' <span style="font-weight:400;color:#aaa">' + escHtml(tr) + '</span>' : "") + '</div>';
    if (pr) h += '<div class="st-pron">' + escHtml(pr) + '</div>';
    if (df) h += '<div class="st-def">' + escHtml(df) + '</div>';
    return h || '<div class="st-def">(no definition)</div>';
  }
  // Hebrew plain text
  var lines = raw.split(/\n/);
  var head = "", i = 0;
  while (i < lines.length && /^\s*\d+/.test(lines[i])) { head += lines[i].trim() + " "; i++; }
  var def = lines.slice(i).join(" ").replace(/\s+/g, " ").trim();
  head = head.replace(/\\$/, "").trim();
  var h2 = "";
  if (head) h2 += '<div class="st-head">' + escHtml(head) + '</div>';
  if (def) {
    var kj = def.indexOf("--");
    var md = def, kp = "";
    if (kj !== -1) { md = def.substring(0, kj).trim(); kp = def.substring(kj + 2).trim(); }
    h2 += '<div class="st-def">' + escHtml(md) + '</div>';
    if (kp) h2 += '<div class="st-kjv">KJV: ' + escHtml(kp) + '</div>';
  }
  return h2 || '<div class="st-def">(no definition)</div>';
}

function fetchStrongsTooltip(sn, event) {
  var mod = sn.charAt(0).toUpperCase() === "H" ? "StrongsHebrew" : "StrongsGreek";
  if (strongsCache[sn] !== undefined) {
    if (strongsCache[sn] !== "__EMPTY__") showStrongsTooltip(event, strongsCache[sn]);
    return;
  }
  var eve = event;
  fetch('/api/v1' + "/sword/" + mod + "/dict/" + sn)
    .then(function(r) { return r.json(); })
    .then(function(d) {
      if (d && d.found && d.content) {
        var h = parseStrongsContent(d.content, sn.charAt(0));
        strongsCache[sn] = h;
        showStrongsTooltip(eve, h);
      } else { strongsCache[sn] = "__EMPTY__"; }
    })
    .catch(function() { strongsCache[sn] = "__EMPTY__"; });
}

// ── Morph tooltip (hover) ──
var morphCache = {};

var MORPH_QUICK = {
  // Hebrew (partial subset for quick lookup; full table in showMorphHelp)
  "H8804": "Qal Perfect — simple action completed",
  "H8764": "Hiphil Imperfect — causative, ongoing",
  "H8685": "Hithpael Perfect — reflexive action completed",
  "H8799": "Qal Imperfect — simple action, ongoing",
  "H8802": "Qal Participle active — continuous state",
  "H8735": "Niphal Perfect — passive/reflexive completed",
  "H8737": "Niphal Imperfect — passive/reflexive ongoing",
  "H8848": "Piel Perfect — intensive action completed",
  "H8849": "Piel Imperfect — intensive, ongoing",
  "H8852": "Pual Perfect — passive intensive completed",
  "H8853": "Pual Imperfect — passive intensive ongoing",
  "H8688": "Hiphil Perfect — causative completed",
  "H8689": "Hiphil Imperfect — causative ongoing",
  "H8714": "Hophal Perfect — passive causative completed",
  "H8717": "Hophal Imperfect — passive causative ongoing"
};

function fetchMorphTooltip(morph, event) {
  // Check quick cache
  if (morphCache[morph] !== undefined) {
    if (morphCache[morph]) showStrongsTooltip(event, morphCache[morph]);
    return;
  }
  // Primary: describeMorph() from morphology.js parses Hebrew + Greek codes
  var desc = describeMorph(morph, state.lang);
  if (desc) {
    morphCache[morph] = desc;
    showStrongsTooltip(event, desc);
    return;
  }
  // Fallback: unknown code — silently hide
  morphCache[morph] = null;
}

// DEPRECATED: getMorphFallback replaced by describeMorph() in morphology.js
function getMorphFallback(morph) { return null; }
function getMorphFallback(morph) {
  if (!morph) return null;
  var upper = morph.toUpperCase();
  if (/^H\d+$/.test(upper)) {
    return '<div class="st-head">' + escHtml(morph) + '</div><div class="st-def"><em>' + (state.lang==='zh' ? '希伯来文形态码' : 'Hebrew Morphology') + '</em></div>';
  }
  if (/^G\d+$/.test(upper)) {
    return '<div class="st-head">' + escHtml(morph) + '</div><div class="st-def"><em>' + (state.lang==='zh' ? '希腊文形态码' : 'Greek Morphology') + '</em></div>';
  }
  return null;
}

// ── Interlinear Rendering (word-by-word with Strong's links) ──
// Check if a strongs-like code is actually a morphology code
function isMorphCode(code) {
  if (!code) return false;
  var upper = code.toUpperCase();
  // JSword adds "T" prefix to morphology codes (e.g. TH8804, TG5001)
  var clean = upper.replace(/^T([HG])/, '$1');
  var m = clean.match(/^([HG])(\d+)$/);
  if (!m) return false;
  var num = parseInt(m[2], 10);
  // Hebrew morphology: H8685-H8999, Greek morphology: G5000-G5999
  if (m[1] === 'H' && num >= 8685) return true;
  if (m[1] === 'G' && num >= 5000) return true;
  return false;
}

// Normalize morph codes: strip JSword "T" prefix (TH8804 → H8804)
function normalizeMorph(morph) {
  if (!morph) return morph;
  return morph.replace(/^T([HG])/i, '$1');
}

function renderInterlinear() {
  var ctx = document.getElementById("verseContent");
  if (!state.interlinearData || !state.interlinearData.verses) {
    ctx.innerHTML = '<div class="loading">' + t("loading") + '</div>';
    return;
  }

  var bookId = state.currentBook.id.toLowerCase();
  var html = "";

  try {
  state.interlinearData.verses.forEach(function(v) {
    if (v.verse === 0) return; // skip chapter headings
    if (!v.words || !v.words.length) return;

    html += '<div class="interlinear-verse">';
    html += '<span class="verse-num">' + v.verse + '</span> ';

    // Rebuild word list: separate Strong's numbers from morphology codes
    v.words.forEach(function(w) {
      var strongsList = (w.strongs || "").split("+").filter(Boolean);
      var morph = w.morph || "";
      var morphClean = normalizeMorph(morph.replace(/^robinson:/i, "").replace(/^[TVPM]/, "").trim());

      // Separate real Strong's numbers from morphology codes mixed in strongs field
      var realStrongs = [];
      var morphTags = [];
      strongsList.forEach(function(sn) {
        if (isMorphCode(sn)) {
          morphTags.push(normalizeMorph(sn));
        } else {
          realStrongs.push(sn);
        }
      });

      // Ghost word: JSword extracted Strong's data but no display text
      // (e.g. ChiUns Gen.1:2 H05921+H06440 — the "面" character lives
      // between OSIS <w> tags, not inside them). Show only Strong's links
      // so the numbers are preserved in the right position.
      if (!w.text || !w.text.trim()) {
        html += '<span class="il-word il-word-ghost">';
        if (realStrongs.length > 0) {
          html += '<sub class="il-strongs il-strongs-only">';
          realStrongs.forEach(function(sn, si) {
            if (si > 0) html += ' + ';
            html += '<a class="il-strongs-link" data-strongs="' + escHtml(sn) + '">' + escHtml(sn) + '</a>';
          });
          html += '</sub>';
        }
        if (morphTags.length > 0) {
          html += ' <sup class="il-morph" data-morph="' + escHtml(morphTags[0]) + '">' + escHtml(morphTags[0]) + '</sup>';
        }
        html += '</span> ';
        return;
      }

      html += '<span class="il-word">';
      html += escHtml(stripOsisTags(w.text));
      if (realStrongs.length > 0) {
        html += ' <sub class="il-strongs">';
        realStrongs.forEach(function(sn, si) {
          if (si > 0) html += ' ';
          html += '<a class="il-strongs-link" data-strongs="' + escHtml(sn) + '">' + escHtml(sn) + '</a>';
        });
        html += '</sub>';
      }
      // Show morphology codes (from both strongs field and morph field)
      var allMorph = morphTags.concat(morphClean ? [morphClean] : []);
      if (allMorph.length > 0) {
        html += ' <sup class="il-morph" title="' + escHtml(allMorph.join(', ')) + '" data-morph="' + escHtml(allMorph[0]) + '">' + escHtml(allMorph[0]) + '</sup>';
      }
      html += '</span> ';
    });

    // Footnotes (render as HTML — sword-service provides safe semantic markup)
    if (v.footnotes && v.footnotes.length) {
      html += '<div class="il-footnotes">';
      v.footnotes.forEach(function(fn) {
        html += '<span class="il-fn">' + (fn.text || fn.note || "") + '</span> ';
      });
      html += '</div>';
    }

    html += '</div>';
  });

  // Bilingual legend (must be before innerHTML set so event bindings survive)
  html += '<div class="il-legend">' +
    '<span class="il-strongs-label">🔢 ' + t("ilStrongs") + '</span> &nbsp;' +
    '<span class="il-lemma-label">📝 ' + t("ilLemma") + '</span> &nbsp;' +
    '<span class="il-morph-label">🏷 ' + t("ilMorph") + '</span> &nbsp;' +
    '<span class="il-footnote-label">📌 ' + t("ilFootnote") + '</span>' +
  '</div>';

  ctx.innerHTML = html;

  // Bind interlinear Strong's link clicks (split numbers, each clickable)
  ctx.querySelectorAll(".il-strongs-link").forEach(function(link) {
    link.addEventListener("click", function(e) {
      e.stopPropagation();
      var sn = link.dataset.strongs;
      if (sn) searchStrongs(sn);
    });
    // Hover tooltip (300ms debounce)
    link.addEventListener("mouseenter", function(e) {
      var sn = link.dataset.strongs;
      if (!sn) return;
      var eve = e;
      strongsHoverTimer = setTimeout(function() {
        fetchStrongsTooltip(sn, eve);
      }, 300);
    });
    link.addEventListener("mouseleave", function() {
      hideStrongsTooltip();
    });
  });

  // Morph links: hover shows tooltip (300ms debounce)
  ctx.querySelectorAll(".il-morph").forEach(function(el) {
    el.addEventListener("mouseenter", function(e) {
      var morph = el.getAttribute("data-morph");
      if (!morph) return;
      var eve = e;
      strongsHoverTimer = setTimeout(function() {
        fetchMorphTooltip(morph, eve);
      }, 300);
    });
    el.addEventListener("mouseleave", function() {
      hideStrongsTooltip();
    });
  });
  } catch(e) {
    console.error('[IL] renderInterlinear error:', e);
    state.interlinear = false;
    state.interlinearData = null;
    renderVerses();
    return;
  }
}

function renderChapterHeader() {
  var hdrEl = document.getElementById("chapterHeader");
  var label = bookLabel(state.currentBook);
  var isIL = isInterlinearTranslation(state.currentTranslation);
  var ilBtn = isIL
    ? '<button id="btnInterlinear" class="il-btn' + (state.interlinear ? ' active' : '') + '" title="' + t("interlinearTip") + '">' + t("interlinearBtn") + '</button>'
    : '';
  hdrEl.innerHTML = '<span class="book-name">' + label + '</span>' +
    '<span class="chapter-num">' + t("chapterNum") + ' ' + state.currentChapter + ' 章</span>' + ilBtn;
  if (isIL) {
    setTimeout(function() {
      var btn = document.getElementById("btnInterlinear");
      if (btn) btn.addEventListener("click", toggleInterlinear);
    }, 0);
  }
}

function toggleInterlinear() {
  state.interlinear = !state.interlinear;
  state.interlinearData = null;
  loadChapter();
}

function renderChapterNav() {
  function _render(el, suffix) {
    var hasPrev = state.currentChapter > 1;
    var hasNext = state.currentChapter < state.currentBook.chapters;
    el.innerHTML =
      (hasPrev ? '<button id="btnPrev' + suffix + '">' + t("previous") + '</button>' : '<span></span>') +
      '<span class="nav-info">' + state.currentChapter + ' / ' + state.currentBook.chapters + '</span>' +
      (hasNext ? '<button id="btnNext' + suffix + '">' + t("next") + '</button>' : '<span></span>');
    var prev = document.getElementById("btnPrev" + suffix);
    var next = document.getElementById("btnNext" + suffix);
    if (prev) prev.addEventListener("click", function() { state.currentChapter--; renderChapterGrid(); loadChapter(); });
    if (next) next.addEventListener("click", function() { state.currentChapter++; renderChapterGrid(); loadChapter(); });
  }
  _render(document.getElementById("chapterNavTop"), "Top");
  _render(document.getElementById("chapterNav"), "");
}

// ═══════════════════════════════════════════
//  MULTI-VERSION COMPARISON
// ═══════════════════════════════════════════
function loadAllCompare() {
  var bookId = state.currentBook.id.toLowerCase();
  state.compareTranslations.forEach(function(tid) {
    var url = "/bible/" + tid + "/" + bookId + "/" + state.currentChapter;
    apiGet(url).then(function(data) {
      state.compareData[tid] = data;
      renderVerses();
    }).catch(function() {
      delete state.compareData[tid];
      renderVerses();
    });
  });
}

function renderCompareBar() {
  var bar = document.getElementById("compareBar");
  if (!bar) return;

  if (!state.compareTranslations.length) {
    bar.style.display = "none";
    return;
  }

  bar.style.display = "flex";
  var html = '<label>📐 ' + t("compareMode") + ':</label>';
  state.compareTranslations.forEach(function(tid) {
    var label = transShortLabel({id: tid});
    html += '<span class="compare-tag" data-remove="' + tid + '">' + label + ' ✕</span>';
  });
  html += '<select id="compareAddSel" style="flex:0;min-width:auto;margin-left:6px"><option value="">+ ' + t("selectVersions") + '</option>';
  state.translations.forEach(function(t) {
    if (t.id === state.currentTranslation || state.compareTranslations.indexOf(t.id) >= 0) return;
    html += '<option value="' + t.id + '">' + transShortLabel(t) + '</option>';
  });
  html += '</select>';
  html += '<div class="close-btn" id="compareCloseAll" title="' + t("compareOff") + '">✕</div>';
  bar.innerHTML = html;

  // Remove tag click
  bar.querySelectorAll(".compare-tag").forEach(function(tag) {
    tag.addEventListener("click", function() {
      var tid = tag.dataset.remove;
      state.compareTranslations = state.compareTranslations.filter(function(x) { return x !== tid; });
      delete state.compareData[tid];
      renderCompareSelector();
      if (state.compareTranslations.length) {
        renderCompareBar();
        renderVerses();
      } else {
        bar.style.display = "none";
        renderVerses();
      }
    });
  });

  // Add dropdown
  var addSel = document.getElementById("compareAddSel");
  if (addSel) {
    addSel.onchange = function(e) {
      if (!e.target.value) return;
      state.compareTranslations.push(e.target.value);
      var tid = e.target.value;
      e.target.value = "";
      renderCompareSelector();
      var bookId = state.currentBook.id.toLowerCase();
      apiGet("/bible/" + tid + "/" + bookId + "/" + state.currentChapter).then(function(data) {
        state.compareData[tid] = data;
        renderCompareBar();
        renderVerses();
      });
    };
  }

  // Close all
  var closeAll = document.getElementById("compareCloseAll");
  if (closeAll) {
    closeAll.addEventListener("click", function() {
      state.compareTranslations = [];
      state.compareData = {};
      renderCompareSelector();
      bar.style.display = "none";
      renderVerses();
    });
  }
}

// ═══════════════════════════════════════════
//  COMMENTARIES
// ═══════════════════════════════════════════
function loadCommentaries() {
  var body = document.getElementById("commentaryBody");
  body.innerHTML = '<div class="loading">' + t("loading") + '</div>';

  apiGet("/annotations/commentaries/" + state.currentBook.id.toLowerCase() + "/" + state.currentChapter).then(function(data) {
    state.commentaries = data;
    var tskEl = document.getElementById('tskContent');
    if (tskEl) tskEl.style.display = 'block';
    renderCommentaryTabs();
    renderCommentaryBody();
  }).catch(function() {
    state.commentaries = null;
    var tskEl2 = document.getElementById('tskContent');
    if (tskEl2) tskEl2.style.display = 'none';
    renderCommentaryTabs();
    body.innerHTML = '<div class="empty-state">' + t("noCommentary") + '</div>';
  });
}

function renderCommentaryTabs() {
  var tabsEl = document.getElementById("commentaryTabs");
  var sources = state.commentaries ? (state.commentaries.sources || []) : [];

  if (!sources.length && state.commentaries && state.commentaries.commentaries) {
    var seen = {};
    state.commentaries.commentaries.forEach(function(c) {
      if (!seen[c.source]) {
        seen[c.source] = true;
        sources.push({ id: c.source, name: cmtName(c.source) || c.sourceName || c.source });
      }
    });
  }

  // Always show TSK as an option (data comes from Sword service, not text-service)
  var fallbacks = [
    { id: "TSK", name: cmtName("TSK") },
    { id: "JFB", name: cmtName("JFB") },
    { id: "MHCC", name: cmtName("MHCC") }
  ];
  if (!sources.length) {
    sources = fallbacks;
  } else {
    fallbacks.forEach(function(fb) {
      if (!sources.some(function(s){return s.id === fb.id})) {
        sources.push(fb);
      }
    });
  }

  // Sort alphabetically by id
  sources.sort(function(a, b) { return a.id.localeCompare(b.id); });

  var html = '<select class="cmt-select" id="cmtSelect">';
  sources.forEach(function(s) {
    var label = cmtName(s.id) || s.name;
    html += '<option value="' + s.id + '"' + (state.activeCommentary === s.id ? ' selected' : '') + '>' + label + '</option>';
  });
  html += '</select>';
  tabsEl.innerHTML = html;

  var sel = tabsEl.querySelector("#cmtSelect");
  if (sel) {
    sel.addEventListener("change", function() {
      state.activeCommentary = this.value;
      renderCommentaryBody();
    });
  }
}

function renderCommentaryBody() {
  var body = document.getElementById("commentaryBody");

  if (!state.commentaries || !state.commentaries.commentaries) {
    body.innerHTML = '<div class="empty-state">' + t("noCommentary") + '</div>';
    return;
  }

  var filtered = state.commentaries.commentaries.filter(function(c) {
    return c.source === state.activeCommentary;
  });

  if (!filtered.length) {
    body.innerHTML = '<div class="empty-state">' + t("noCommentary") + '</div>';
    return;
  }

  if (state.activeCommentary === "TSK") {
    if (filtered.length) {
      // TSK data from text-service
      var html = "";
      filtered.forEach(function(c) {
        var ref = (c.bookId || "") + " " + (c.chapter || "") + ":" + (c.verseStart || "");
        if (c.verseEnd && c.verseEnd !== c.verseStart) ref += "-" + c.verseEnd;
        html += '<div class="tsk-item"><div class="tsk-ref">' + ref + '</div><div>' + (c.text || "") + '</div></div>';
      });
      body.innerHTML = html;
    } else {
      // TSK not in text-service, load from Sword service
      body.innerHTML = '<div class="loading">' + t("loading") + '</div>';
      var bookId = state.currentBook ? state.currentBook.id.toLowerCase() : 'gen';
      var passageRef = bookId + '.' + state.currentChapter;
      fetch('/api/v1/sword/TSK/passage/' + passageRef + '?strongs=false')
        .then(function(r){return r.json()})
        .then(function(data){
          if (!data || !data.verses || !data.verses.length) {
            body.innerHTML = '<div class="empty-state">' + t("noCommentary") + '</div>';
            return;
          }
          var html = '';
          data.verses.forEach(function(v){
            html += '<div class="tsk-item"><div class="tsk-ref">v' + (v.verse||'') + '</div><div>' + escHtml(v.text||'') + '</div></div>';
          });
          body.innerHTML = html;
        }).catch(function(){
          body.innerHTML = '<div class="empty-state">TSK data unavailable. Install TSK module in Module Manager.</div>';
        });
    }
  } else {
    var html = "";
    filtered.forEach(function(c) {
      var text = (c.text || "").replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>');
      html += '<div class="commentary-item"><div class="cmt-source">' + (cmtName(c.source) || c.source) + '</div><div class="cmt-text"><p>' + text + '</p></div></div>';
    });
    body.innerHTML = html;
  }
}

// ═══════════════════════════════════════════
//  SEARCH
// ═══════════════════════════════════════════
var searchTimer = null;
function setupSearch() {
  var box = document.getElementById("searchBox");
  box.addEventListener("input", function() {
    clearTimeout(searchTimer);
    var q = box.value.trim();
    if (!q) {
      document.getElementById("searchResults").style.display = "none";
      document.getElementById("readerView").style.display = "block";
      return;
    }
    searchTimer = setTimeout(function() { doSearch(q); }, 350);
  });
  box.addEventListener("keydown", function(e) {
    if (e.key === "Enter") { clearTimeout(searchTimer); doSearch(box.value.trim()); }
  });
}

// Translations that have full-text search indexes
var SEARCHABLE_TRANSLATIONS = ['asv','bbe','cuv_gb','dby','kjv','wbt','web','ylt'];

function doSearch(query) {
  if (!query) return;
  state.view = "search";
  state._lastQuery = query;
  var ctx = document.getElementById("searchResults");
  ctx.style.display = "block";
  document.getElementById("readerView").style.display = "none";
  ctx.innerHTML = '<div class="loading">' + t("searching") + '</div>';

  // Fallback: if current translation has no search index, use KJV
  var searchTranslation = state.currentTranslation;
  if (SEARCHABLE_TRANSLATIONS.indexOf(searchTranslation) < 0) {
    searchTranslation = 'kjv';
    ctx.innerHTML = '<div class="loading" style="color:#e65100">当前译本无搜索索引，使用 KJV 搜索...</div>';
  }

  apiGet("/search?query=" + encodeURIComponent(query) + "&translation=" + searchTranslation + "&size=30").then(function(data) {
    state.searchResults = data;
    renderSearchResults(query);
  }).catch(function(e) {
    ctx.innerHTML = '<div class="loading">' + t("searchFailed") + '</div>';
  });
}

function renderSearchResults(query) {
  var ctx = document.getElementById("searchResults");
  var results = state.searchResults ? (state.searchResults.results || []) : [];
  var total = state.searchResults ? (state.searchResults.total || 0) : 0;

  if (!results.length) {
    ctx.innerHTML = '<div class="empty-state">' + t("noResults") + '</div>';
    return;
  }

  function findBookName(bookId) {
    var b = BOOK_ORDER.find(function(x) { return x.id.toLowerCase() === (bookId || "").toLowerCase(); });
    if (!b) return bookId || "";
    return state.lang === "zh" ? (b.nameZh || b.name) :
           state.lang === "bilingual" ? b.nameZh + " / " + b.name :
           b.name;
  }

  var html = '<div class="panel-title" style="margin-bottom:10px;color:var(--accent);font-size:14px;padding:8px 12px">🔍 ' + total + ' ' + t("results") + '</div>';
  results.forEach(function(item) {
    var bn = item.book_name || item.book_id || "";
    var label = findBookName(bn);

    html += '<div class="search-result-item" data-book="' + (item.book_id || "") + '" data-ch="' + (item.chapter || 0) + '">';
    html += '<div class="search-ref">' + label + ' ' + (item.chapter || 0) + ':' + (item.verse || 0) + '</div>';
    html += '<div class="search-preview">' + highlight(item.text || "", query) + '</div>';
    html += '</div>';
  });
  ctx.innerHTML = html;

  ctx.querySelectorAll(".search-result-item").forEach(function(el) {
    el.addEventListener("click", function() {
      var bookId = el.dataset.book;
      var ch = parseInt(el.dataset.ch);
      var b = BOOK_ORDER.find(function(x) { return x.id.toLowerCase() === bookId.toLowerCase(); });
      if (b) {
        state.currentBook = b;
        state.currentChapter = ch;
        renderBookList();
        renderChapterGrid();
        loadChapter();
      }
    });
  });
}

function highlight(text, query) {
  if (!query || !text) return text || "";
  var escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(new RegExp("(" + escaped + ")", "gi"), "<mark>$1</mark>");
}

// Wesley is now stored as standard book/chapter entries (OT→GEN/1, NT→MAT/1)
// and handled by the normal loadCommentaries() flow. No standalone loader needed.

// ═══════════════════════════════════════════
//  TTS (Text-to-Speech)
// ═══════════════════════════════════════════
function initTTS() {
  if (!window.speechSynthesis) return;
  // Load voices (may be async)
  state.tts.voices = window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = function() {
    state.tts.voices = window.speechSynthesis.getVoices();
  };
}

function getTTSCfg() {
  // Prefer an English voice; fall back to default
  var voices = state.tts.voices;
  var lang = state.lang;
  var voice = null;
  if (lang === "zh") {
    voice = voices.find(function(v) { return v.lang.startsWith("zh") || v.lang.startsWith("cmn"); });
  }
  if (!voice) {
    voice = voices.find(function(v) { return v.lang.startsWith("en") && v.name.indexOf("Google") < 0; });
  }
  if (!voice && voices.length) voice = voices[0];
  return { voice: voice, rate: 0.9, pitch: 1.0 };
}

function speakVerse(verseNum) {
  if (!state.verses || !state.verses.verses) return;
  stopTTS();
  var v = state.verses.verses.find(function(x) { return x.verse === verseNum; });
  if (!v || !v.text) return;

  var cfg = getTTSCfg();
  var utterance = new SpeechSynthesisUtterance(cleanForTTS(v.text));
  utterance.rate = cfg.rate;
  utterance.pitch = cfg.pitch;
  if (cfg.voice) utterance.voice = cfg.voice;

  state.tts.playing = true;
  state.tts.currentVerse = verseNum;
  state.tts.utterance = utterance;
  highlightSpeakingVerse();

  utterance.onend = function() {
    state.tts.playing = false;
    state.tts.currentVerse = -1;
    highlightSpeakingVerse();
  };
  utterance.onerror = function() {
    state.tts.playing = false;
    state.tts.currentVerse = -1;
    highlightSpeakingVerse();
  };

  window.speechSynthesis.speak(utterance);
  updateTTSControls();
}

function speakChapter() {
  if (!state.verses || !state.verses.verses) return;
  stopTTS();
  
  var verses = state.verses.verses.slice();
  if (!verses.length) return;

  var cfg = getTTSCfg();
  state.tts.playing = true;
  state.tts.utterances = [];
  state.tts.chapterIdx = 0;
  state.tts.chapterVerses = verses;

  function speakNext() {
    if (!state.tts.playing) return;
    var idx = state.tts.chapterIdx;
    if (idx >= verses.length) {
      state.tts.playing = false;
      state.tts.currentVerse = -1;
      highlightSpeakingVerse();
      updateTTSControls();
      return;
    }
    var v = verses[idx];
    state.tts.currentVerse = v.verse;
    highlightSpeakingVerse();

    var utterance = new SpeechSynthesisUtterance(cleanForTTS(v.text));
    utterance.rate = cfg.rate;
    utterance.pitch = cfg.pitch;
    if (cfg.voice) utterance.voice = cfg.voice;

    utterance.onend = function() {
      state.tts.chapterIdx++;
      speakNext();
    };
    utterance.onerror = function() {
      state.tts.chapterIdx++;
      speakNext();
    };

    window.speechSynthesis.speak(utterance);
  }

  updateTTSControls();
  speakNext();
}

function stopTTS() {
  window.speechSynthesis.cancel();
  state.tts.playing = false;
  state.tts.currentVerse = -1;
  state.tts.chapterIdx = 0;
  state.tts.chapterVerses = [];
  highlightSpeakingVerse();
  updateTTSControls();
}

function highlightSpeakingVerse() {
  // Remove all highlights
  document.querySelectorAll(".verse.speaking").forEach(function(el) {
    el.classList.remove("speaking");
  });
  // Add highlight to current
  if (state.tts.currentVerse > 0) {
    var verses = document.querySelectorAll(".verse");
    verses.forEach(function(el) {
      var numEl = el.querySelector(".verse-num, .tts-btn");
      if (numEl) {
        var num = parseInt(numEl.textContent.replace(/[^0-9]/g, ""));
        if (num === state.tts.currentVerse) {
          el.classList.add("speaking");
        }
      }
    });
  }
  updateTTSControls();
}

function updateTTSControls() {
  var hdr = document.getElementById("chapterHeader");
  var existing = document.getElementById("ttsControls");
  if (existing) existing.remove();

  var html = '<span id="ttsControls" style="margin-left:12px;display:inline-flex;gap:6px;align-items:center">';
  if (state.tts.playing) {
    html += '<button onclick="stopTTS()" title="Stop" style="padding:2px 8px;border-radius:4px;border:1px solid var(--accent);background:var(--accent);color:#fff;cursor:pointer;font-size:12px">⏹</button>';
    html += '<span style="font-size:12px;color:var(--accent)">v.' + state.tts.currentVerse + '</span>';
  } else {
    html += '<button onclick="speakChapter()" title="' + t("readChapter") + '" style="padding:2px 8px;border-radius:4px;border:1px solid var(--border);background:var(--bg3);color:var(--text1);cursor:pointer;font-size:12px">🔊 ' + t("readChapter") + '</button>';
  }
  html += '</span>';
  hdr.insertAdjacentHTML("beforeend", html);
}

function cleanForTTS(text) {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/[\u0300-\u036f\u0591-\u05c7\u05b0-\u05bd]/g, "")  // strip diacritics
    .replace(/[{}[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ═══════════════════════════════════════════
//  STRONG'S DICTIONARY
// ═══════════════════════════════════════════
function searchStrongs(query) {
  if (!query || query.length < 2) return;
  // Normalize: strip leading zeros (H0853 → H853, G0001 → G1)
  query = query.replace(/^([HG])0+(\d+)$/i, '$1$2');
  unifiedQuery = query;
  unifiedTab = "strongs";
  openUnifiedPopup("strongs", query);
}

function doWordSearch(query) {
  strongsKeywordSearch(query);
}

function renderStrongsResults(query, matches, total) {
  var content = document.getElementById("unifiedContent");
  if (!content) return;
  if (!matches.length) {
    content.innerHTML = '<div class="empty-state">' + t("strongsNoResult") + ' &quot;' + escHtml(query) + '&quot;</div>';
    return;
  }

  var greek = matches.filter(function(m) { return m.prefix === "G" || (m.id && m.id.startsWith("G")); });
  var hebrew = matches.filter(function(m) { return m.prefix === "H" || (m.id && m.id.startsWith("H")); });

  var html = '<div class="strongs-count">' + total + ' ' + t("results") + '</div>';

  if (hebrew.length) {
    html += '<div class="strongs-section-title">' + t("strongsHebrew") + ' (' + hebrew.length + ')</div>';
    hebrew.forEach(function(m) { html += renderStrongsEntry(m.id || "H" + m.number, m); });
  }
  if (greek.length) {
    html += '<div class="strongs-section-title">' + t("strongsGreek") + ' (' + greek.length + ')</div>';
    greek.forEach(function(m) { html += renderStrongsEntry(m.id || "G" + m.number, m); });
  }

  content.innerHTML = html;
}

function renderStrongsEntry(id, entry) {
  var word = entry.original_word || "";
  var trans = entry.transliteration || "";
  var pron = entry.pronunciation || "";
  var def = entry.definition || "";
  var hebWords = entry.hebrew_words || [];

  var html = '<div class="strongs-entry">';
  html += '<div class="strongs-entry-header">';
  html += '<span class="strongs-id">' + id + '</span>';
  html += '<span class="strongs-word">' + escHtml(word) + '</span>';
  if (trans) html += '<span class="strongs-trans">' + escHtml(trans) + '</span>';
  html += '</div>';
  if (hebWords.length) {
    html += '<div class="strongs-hebrew-words">';
    html += '<span class="strongs-hebrew-label">Hebrew:</span> ';
    hebWords.forEach(function(hw) {
      html += '<span class="strongs-hebrew-word">' + escHtml(hw) + '</span> ';
    });
    html += '</div>';
  }
  if (pron) html += '<div class="strongs-pron">' + escHtml(pron) + '</div>';
  html += '<div class="strongs-def">' + escHtml(def) + '</div>';
  html += '</div>';
  return html;
}

// ── Unified Popup (Strong's + Dictionaries with Tabs) ──
var unifiedDictSources = []; // [{id, name}]
var unifiedDictResults = []; // current dict results
var unifiedTab = "strongs";   // "strongs" or dict source id
var unifiedQuery = "";

function setupDictPopup() {
  var btn = document.getElementById("dictBtn");
  if (btn) btn.addEventListener("click", openUnifiedPopup);
  fetchDictSources();
}

function fetchDictSources() {
  fetch("/api/v1/annotations/dictionary-sources")
    .then(function(r) { return r.json(); })
    .then(function(d) {
      unifiedDictSources = d.sources || [];
    }).catch(function(e) { console.error("Dict sources:", e); });
}

function openUnifiedPopup(tab, query) {
  if (tab) unifiedTab = tab;
  if (query) unifiedQuery = query;
  unifiedDictResults = [];

  document.getElementById("strongsOverlay").style.display = "flex";
  document.getElementById("strongsPopupTitle").textContent = '\uD83D\uDCD6 ' + t("dictTitle");

  // Build tab bar + content area
  var body = document.getElementById("strongsPopupBody");
  body.innerHTML = 
    '<div class="unified-tabs">' +
      '<button class="unified-tab' + (unifiedTab === "strongs" ? ' active' : '') + '" data-tab="strongs">Strong\'s</button>' +
      unifiedDictSources.map(function(s) {
        return '<button class="unified-tab' + (unifiedTab === s.id ? ' active' : '') + '" data-tab="' + escHtml(s.id) + '">' + escHtml(dictName(s.id) || s.name) + '</button>';
      }).join('') +
    '</div>' +
    '<div class="unified-search-row">' +
      '<input type="text" id="unifiedSearchInput" placeholder="' + (unifiedTab === "strongs" ? 'Strong\'s # (e.g. H0430, G2316) or keyword' : 'Search ' + (dictName(unifiedTab) || unifiedTab)) + '"' +
      ' value="' + escHtml(unifiedQuery) + '" onkeydown="if(event.key===\'Enter\')unifiedSearch()">' +
      '<button onclick="unifiedSearch()">\uD83D\uDD0D</button>' +
    '</div>' +
    '<div id="unifiedContent"><div class="unified-placeholder">' + t("dictSearch") + '</div></div>';

  // Bind tab clicks
  body.querySelectorAll(".unified-tab").forEach(function(el) {
    el.addEventListener("click", function() {
      var newTab = el.dataset.tab;
      if (newTab !== unifiedTab) {
        unifiedTab = newTab;
        unifiedDictResults = [];
        unifiedQuery = "";
        // If switching to strongs from query context, keep query
        var inp = document.getElementById("unifiedSearchInput");
        if (inp && inp.value.trim()) unifiedQuery = inp.value.trim();
        openUnifiedPopup(newTab, inp ? inp.value.trim() : "");
        if (inp && inp.value.trim()) {
          setTimeout(function() { unifiedSearch(); }, 100);
        }
      }
    });
  });

  // Focus search
  setTimeout(function() {
    var inp = document.getElementById("unifiedSearchInput");
    if (inp) inp.focus();
  }, 50);

  // Auto-search if query was provided
  if (unifiedQuery) {
    setTimeout(function() { unifiedSearch(); }, 100);
  }
}

function unifiedSearch() {
  var inp = document.getElementById("unifiedSearchInput");
  if (!inp) return;
  var query = inp.value.trim();
  unifiedQuery = query;
  if (!query || query.length < 2) return;

  var content = document.getElementById("unifiedContent");
  if (!content) return;
  content.innerHTML = '<div class="loading">' + t("searching") + '</div>';

  if (unifiedTab === "strongs") {
    // Strong's search
    var upper = query.toUpperCase();
    var prefix = upper.charAt(0);
    if ((prefix === "G" || prefix === "H") && /^\d+$/.test(query.substring(1))) {
      BibleAPI.strongsLookup(query).then(function(data) {
        if (data.error) { strongsKeywordSearch(query); }
        else { renderStrongsResults(query, [data], 1); }
      }).catch(function() { strongsKeywordSearch(query); });
    } else {
      strongsKeywordSearch(query);
    }
  } else {
    // Dictionary search
    dictSearch(query);
  }
}

function strongsKeywordSearch(query) {
  // If query looks like a Strong's ID (H/G + digits), do direct ID lookup
  var idMatch = query.match(/^([HG])(\d+)$/i);
  if (idMatch) {
    var id = idMatch[1].toUpperCase() + idMatch[2];
    BibleAPI.strongsLookup(id).then(function(entry) {
      renderStrongsResults(query, [entry], 1);
    }).catch(function() {
      document.getElementById("unifiedContent").innerHTML = '<div class="empty-state">' + t("strongsNoResult") + ' &quot;' + escHtml(query) + '&quot;</div>';
    });
    return;
  }

  BibleAPI.strongsSearch(query).then(function(data) {
    var matches = data.matches || [];
    renderStrongsResults(query, matches, data.count || matches.length);
  }).catch(function() {
    document.getElementById("unifiedContent").innerHTML = '<div class="loading">' + t("searchFailed") + '</div>';
  });
}

function dictSearch(query) {
  var url = "/api/v1/annotations/dictionaries/" + unifiedTab + "?search=" + encodeURIComponent(query);
  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(d) {
      unifiedDictResults = d.entries || [];
      renderUnifiedDictResults(query);
    }).catch(function(e) {
      document.getElementById("unifiedContent").innerHTML =
        '<div class="error">Error: ' + escHtml(String(e)) + '</div>';
    });
}

function renderUnifiedDictResults(query) {
  var content = document.getElementById("unifiedContent");
  if (!content) return;
  if (!unifiedDictResults.length) {
    content.innerHTML = '<div class="unified-placeholder">' + t("strongsNoResult") + ' "' + escHtml(query) + '"</div>';
    return;
  }
  var html = '<div class="strongs-count">' + unifiedDictResults.length + ' ' + t("results") + ' for "' + escHtml(query) + '"</div>';
  unifiedDictResults.forEach(function(e, i) {
    var preview = (e.definition || "").replace(/<[^>]+>/g, '').substring(0, 150);
    if (preview.length === 150) preview += '...';
    html += '<div class="dict-entry-row" onclick="showUnifiedDictEntry(' + i + ')">';
    html += '<div class="key">' + escHtml(e.entryId || '') + '</div>';
    html += '<div class="preview">' + escHtml(preview) + '</div>';
    html += '</div>';
  });
  content.innerHTML = html;
}

function showUnifiedDictEntry(idx) {
  var e = unifiedDictResults[idx];
  var content = document.getElementById("unifiedContent");
  if (!content) return;
  var html = '<div class="dict-detail-header">';
  html += '<button onclick="renderUnifiedDictResultsBack()">&#8592; Back</button>';
  html += '<span class="key">' + escHtml(e.entryId || '') + '</span>';
  html += '</div>';
  html += '<div class="dict-detail-content">';
  html += (e.definition || '').replace(/\n/g, '<br>').replace(/→/g, '<br>→ ');
  html += '</div>';
  content.innerHTML = html;
  content.scrollTop = 0;
}

function renderUnifiedDictResultsBack() {
  renderUnifiedDictResults(unifiedQuery);
}

function closeStrongsPopup() {
  document.getElementById("strongsOverlay").style.display = "none";
}

// Backward compat: openDictPopup / closeDictPopup redirect to unified
function openDictPopup() { openUnifiedPopup(null, null); }
function closeDictPopup() { closeStrongsPopup(); }

function handleWordClick(e) {
  var selection = window.getSelection();
  var word = selection.toString().trim();
  if (!word) {
    var range = document.caretRangeFromPoint ? document.caretRangeFromPoint(e.clientX, e.clientY) : null;
    if (!range) return;
    var textNode = range.startContainer;
    if (textNode.nodeType !== 3) return;
    var text = textNode.textContent;
    var idx = range.startOffset;
    var start = idx, end = idx;
    while (start > 0 && /[a-zA-Z]/.test(text[start-1])) start--;
    while (end < text.length && /[a-zA-Z]/.test(text[end])) end++;
    word = text.substring(start, end).trim();
  }
  if (word && word.length >= 3 && /^[a-zA-Z]+$/.test(word)) {
    var STOP = ["the","and","for","was","you","that","with","have","not","but","his","her","from","this","will","they","them","all","are","were"];
    if (STOP.indexOf(word.toLowerCase()) >= 0) return;
    searchStrongs(word);
  }
}

function escHtml(str) {
  return (str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── Morph Help Popup ──
var MORPH_TABLE = [
  { code: "N-NSF", desc: "名词·主格·单数·阴性 (Nominative Singular Feminine)" },
  { code: "N-GSF", desc: "名词·属格·单数·阴性 (Genitive Singular Feminine)" },
  { code: "N-DSF", desc: "名词·与格·单数·阴性 (Dative Singular Feminine)" },
  { code: "N-ASF", desc: "名词·宾格·单数·阴性 (Accusative Singular Feminine)" },
  { code: "N-VSF", desc: "名词·呼格·单数·阴性 (Vocative Singular Feminine)" },
  { code: "N-NSM", desc: "名词·主格·单数·阳性 (Nominative Singular Masculine)" },
  { code: "N-GSM", desc: "名词·属格·单数·阳性 (Genitive Singular Masculine)" },
  { code: "N-DSM", desc: "名词·与格·单数·阳性 (Dative Singular Masculine)" },
  { code: "N-ASM", desc: "名词·宾格·单数·阳性 (Accusative Singular Masculine)" },
  { code: "N-VSM", desc: "名词·呼格·单数·阳性 (Vocative Singular Masculine)" },
  { code: "N-NSN", desc: "名词·主格·单数·中性 (Nominative Singular Neuter)" },
  { code: "N-GSN", desc: "名词·属格·单数·中性 (Genitive Singular Neuter)" },
  { code: "N-DSN", desc: "名词·与格·单数·中性 (Dative Singular Neuter)" },
  { code: "N-ASN", desc: "名词·宾格·单数·中性 (Accusative Singular Neuter)" },
  { code: "N-VSN", desc: "名词·呼格·单数·中性 (Vocative Singular Neuter)" },
  { code: "N-NPM", desc: "名词·主格·复数·阳性 (Nominative Plural Masculine)" },
  { code: "N-GPM", desc: "名词·属格·复数·阳性 (Genitive Plural Masculine)" },
  { code: "N-DPM", desc: "名词·与格·复数·阳性 (Dative Plural Masculine)" },
  { code: "N-APM", desc: "名词·宾格·复数·阳性 (Accusative Plural Masculine)" },
  { code: "N-NPF", desc: "名词·主格·复数·阴性 (Nominative Plural Feminine)" },
  { code: "N-NPN", desc: "名词·主格·复数·中性 (Nominative Plural Neuter)" },
  { code: "V-PAI-1S", desc: "动词·现在·主动·陈述·第一人称·单数" },
  { code: "V-PAI-3S", desc: "动词·现在·主动·陈述·第三人称·单数" },
  { code: "V-PAI-3P", desc: "动词·现在·主动·陈述·第三人称·复数" },
  { code: "V-AAS-1S", desc: "动词·不定过去·主动·假设·第一人称·单数" },
  { code: "V-AAS-3S", desc: "动词·不定过去·主动·假设·第三人称·单数" },
  { code: "V-APP-NSM", desc: "动词·不定过去·被动·分词·主格·单数·阳性" },
  { code: "V-APP-GSM", desc: "动词·不定过去·被动·分词·属格·单数·阳性" },
  { code: "V-PAP-NPM", desc: "动词·现在·主动·分词·主格·复数·阳性" },
  { code: "V-AMI-3S", desc: "动词·不定过去·关身·陈述·第三人称·单数" },
  { code: "V-FAI-3S", desc: "动词·将来·主动·陈述·第三人称·单数" },
  { code: "V-API-3S", desc: "动词·不定过去·被动·陈述·第三人称·单数" },
  { code: "A-ASF", desc: "形容词·宾格·单数·阴性" },
  { code: "A-ASM", desc: "形容词·宾格·单数·阳性" },
  { code: "A-GSM", desc: "形容词·属格·单数·阳性" },
  { code: "A-DSM", desc: "形容词·与格·单数·阳性" },
  { code: "A-NSM", desc: "形容词·主格·单数·阳性" },
  { code: "A-NSF", desc: "形容词·主格·单数·阴性" },
  { code: "A-NPM", desc: "形容词·主格·复数·阳性" },
  { code: "P-GSM", desc: "代词·属格·单数·阳性 (e.g. 他的)" },
  { code: "P-ASM", desc: "代词·宾格·单数·阳性" },
  { code: "P-GS", desc: "代词·属格·单数" },
  { code: "P-DSM", desc: "代词·与格·单数·阳性" },
  { code: "P-NSM", desc: "代词·主格·单数·阳性" },
  { code: "P-NPM", desc: "代词·主格·复数·阳性" },
  { code: "P-NSF", desc: "代词·主格·单数·阴性" },
  { code: "CONJ", desc: "连词 (Conjunction, e.g. and, but)" },
  { code: "PREP", desc: "介词 (Preposition, e.g. in, to)" },
  { code: "ADV", desc: "副词 (Adverb)" },
  { code: "PRT", desc: "小品词 (Particle)" },
  { code: "INJ", desc: "感叹词 (Interjection)" },
  { code: "ARAM", desc: "亚兰文转写 (Aramaic)" },
  { code: "T-NSF", desc: "冠词·主格·单数·阴性" },
  { code: "T-GSM", desc: "冠词·属格·单数·阳性" },
  { code: "T-DSM", desc: "冠词·与格·单数·阳性" },
  { code: "T-ASF", desc: "冠词·宾格·单数·阴性" },
  { code: "T-NPM", desc: "冠词·主格·复数·阳性" },

  // ── Hebrew morphology codes ──
  { code: "H8804", desc: "Qal 完成式 (Qal Perfect)" },
  { code: "H8799", desc: "Qal 未完成式 (Qal Imperfect)" },
  { code: "H8802", desc: "Qal 主动分词 (Qal Active Participle)" },
  { code: "H8803", desc: "Qal 被动分词 (Qal Passive Participle)" },
  { code: "H8685", desc: "Qal 命令式 (Qal Imperative)" },
  { code: "H8800", desc: "Qal 不定式独立形 (Qal Infinitive Absolute)" },
  { code: "H8801", desc: "Qal 不定式附属形 (Qal Infinitive Construct)" },
  { code: "H8735", desc: "Niphal 未完成式 (Niphal Imperfect)" },
  { code: "H8738", desc: "Niphal 完成式 (Niphal Perfect)" },
  { code: "H8737", desc: "Niphal 分词 (Niphal Participle)" },
  { code: "H8848", desc: "Piel 完成式 (Piel Perfect)" },
  { code: "H8845", desc: "Piel 未完成式 (Piel Imperfect)" },
  { code: "H8689", desc: "Hiphil 完成式 (Hiphil Perfect)" },
  { code: "H8686", desc: "Hiphil 未完成式 (Hiphil Imperfect)" },
  { code: "H8692", desc: "Hiphil 分词 (Hiphil Participle)" },
  { code: "H8691", desc: "Hiphil 命令式 (Hiphil Imperative)" },
  { code: "H8827", desc: "Hithpael 未完成式 (Hithpael Imperfect)" },
  { code: "H8819", desc: "Hithpael 完成式 (Hithpael Perfect)" }
];

function showMorphHelp(morph) {
  // Strip Robinson prefix: "robinson:" or single-letter (T/V/P/M)
  var code = (morph || "").replace(/^robinson:/i, "").replace(/^[TVPM]/, "").trim();
  var match = MORPH_TABLE.find(function(m) { return m.code === code; });
  var body = document.getElementById("morphHelpBody");
  var title = document.getElementById("morphHelpTitle");
  if (!body || !title) return;
  title.textContent = '&#128214; Morphology: ' + code;
  if (match) {
    body.innerHTML = '<div class="morph-detail-main">' + escHtml(match.desc) + '</div>' +
      '<div class="morph-detail-code">Code: ' + escHtml(code) + '</div>';
  } else {
    body.innerHTML = '<div class="morph-detail-main">' + t("morphUnknown") + '</div>' +
      '<div class="morph-detail-code">Code: ' + escHtml(code) + '</div>';
  }
  document.getElementById("morphHelpOverlay").style.display = "flex";
}

function closeMorphHelp() {
  document.getElementById("morphHelpOverlay").style.display = "none";
}

// ═══════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════
document.addEventListener("DOMContentLoaded", function() {
  console.log('[DEBUG] DOMContentLoaded fired');
  setupLanguage();
  refreshLabels();
  setupDictPopup();
  initTTS();
  updateLoginButton();
  console.log('[DEBUG] calling loadTranslations...');
  loadTranslations().then(function() {
    console.log('[DEBUG] loadTranslations OK');
    return loadBooks();
  }).then(function() {
    console.log('[DEBUG] loadBooks OK');
    renderBookList();
    renderChapterGrid();
    renderCommentaryTabs();
    loadChapter();
    setupSearch();
  });
});

// ── Module Manager ──
function escAttr(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&#39;'); }

var modulesState = { tab:'installed', source:'crosswire', installed:[], available:[] };
var MCT = { BIBLE:'圣经', COMMENTARY:'注释', DICTIONARY:'词典', GENERAL_BOOK:'通用', DAILY_DEVOTION:'灵修', CULT:'异教' };
function mcCatLabel(cat) {
  var zh=MCT[cat]||cat||''; var en=(cat||'').replace(/_/g,' ').toLowerCase().replace(/\b\w/g,function(c){return c.toUpperCase()});
  if(state.lang==='zh')return zh; if(state.lang==='bilingual')return zh+' / '+en; return en;
}
function openModulesPanel(){
  document.getElementById('modulesOverlay').style.display='flex'; modulesState.tab='installed';
  document.querySelectorAll('#modulesOverlay .modules-tab').forEach(function(t){t.classList.toggle('active',t.dataset.tab==='installed')});
  loadRepoSources().then(function(){loadInstalledModules()});
}
function closeModulesPanel(){ document.getElementById('modulesOverlay').style.display='none'; }
function switchModulesTab(tab){
  modulesState.tab=tab;
  document.querySelectorAll('#modulesOverlay .modules-tab').forEach(function(t){t.classList.toggle('active',t.dataset.tab===tab)});
  if(tab==='installed')loadInstalledModules(); else loadAvailableModules();
}
var _repoSources = [];
var _repoSourcesLoaded = false;

function loadRepoSources() {
  // Load built-in repos from server + custom repos from repos.json
  return Promise.all([
    fetch('/api/v1/sword/install/sources').then(function(r){return r.json()}).catch(function(){return []}),
    fetch('/repos.json').then(function(r){return r.json()}).catch(function(){return {customRepositories:[]}})
  ]).then(function(arr){
    var builtin = arr[0] || [];
    var customRaw = (arr[1] || {}).customRepositories || [];
    // Parse custom repo baseUrl → host + path; system auto-derives catalogDir/packageDir
    var custom = customRaw.map(function(r){
      var u;
      try { u = new URL(r.baseUrl); } catch(e) { return null; }
      var id = r.id || r.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
      return {
        id: id, name: r.name, type: 'sword-https',
        host: u.host,
        catalogDir: u.pathname.replace(/\/+$/,''),        // → mods.d.tar.gz
        packageDir: u.pathname.replace(/\/+$/,'') + '/packages/rawzip',  // → .zip files
        _source: 'custom', _original: r
      };
    }).filter(function(x){return x});
    _repoSources = builtin.map(function(s){s._source='builtin';return s}).concat(custom);
    _repoSourcesLoaded = true;
    renderSourceSelector();
    return _repoSources;
  });
}

function renderSourceSelector() {
  var sel = document.getElementById('modulesSourceSelect');
  if (!sel) return;
  if (!_repoSourcesLoaded) { return; }
  var currentId = modulesState.source;
  sel.innerHTML = _repoSources.filter(function(s){return !s._disabled}).map(function(s){
    var label = (s._source==='custom'?'⭐ ':'') + (s.name||s.id);
    return '<option value="' + escAttr(s.id) + '"' + (s.id===currentId?' selected':'') + '>' + escHtml(label) + '</option>';
  }).join('');
}

function switchSource(sourceId){modulesState.source=sourceId;loadAvailableModules();}

function setModuleStatus(msg,cls){
  var e=document.getElementById('modulesStatus'); e.textContent=msg; e.className=cls||'';
  setTimeout(function(){e.textContent='';e.className=''},5000);
}
function loadInstalledModules(){
  var c=document.getElementById('modulesListContainer'); c.innerHTML='<div class="loading">'+t('loading')+'</div>';
  fetch('/api/v1/sword/modules').then(function(r){return r.json()}).then(function(data){
    modulesState.installed=(data.modules||[]).map(function(m){m.name=m.name||m.initials||m.id||'';m.initials=m.name;return m});
    renderModuleList(modulesState.installed,'installed');
  }).catch(function(e){c.innerHTML='<div class="loading" style="color:#e05555">Load failed: '+escHtml(String(e))+'</div>'});
}
function loadAvailableModules(){
  var c=document.getElementById('modulesListContainer'); c.innerHTML='<div class="loading">'+t('loading')+'</div>';
  var src=modulesState.source||'crosswire';
  fetch('/api/v1/sword/install/available?source='+encodeURIComponent(src)).then(function(r){return r.json()}).then(function(data){
    modulesState.available=(data.modules||[]).map(function(m){m.name=m.name||m.initials||m.id||'';return m});
    filterModuleList();
  }).catch(function(e){c.innerHTML='<div class="loading" style="color:#e05555">Load failed: '+escHtml(String(e))+'</div>'});
}
function filterModuleList(){
  modulesState.search=(document.getElementById('modulesSearchInput')||{}).value||'';
  modulesState.category=(document.getElementById('modulesCategoryFilter')||{}).value||'';
  var list=modulesState.tab==='installed'?modulesState.installed:modulesState.available;
  var filtered=list.filter(function(m){
    var n=(m.name||'').toLowerCase(); var d=(m.description||'').toLowerCase(); var s=modulesState.search.toLowerCase();
    if(s&&n.indexOf(s)<0&&d.indexOf(s)<0)return false;
    if(modulesState.category&&m.category!==modulesState.category)return false;
    return true;
  });
  renderModuleList(filtered,modulesState.tab);
}
function renderModuleList(modules,tab){
  var c=document.getElementById('modulesListContainer');
  if(!modules.length){c.innerHTML='<div style="padding:3rem;text-align:center;color:var(--text2)">📭 No modules found</div>';return;}
  var inames=new Set(modulesState.installed.map(function(m){return m.name}));
  var h='';
  modules.forEach(function(m){
    var name=m.name||'';var desc=m.description||'';var cat=m.category||'';var lang=m.language||'';
    var catLabel=mcCatLabel(cat);var catCls=cat.toLowerCase();
    var isInst=inames.has(name);var btn='';
    if(tab==='installed'){
      btn='<button class="mc-btn uninstall" onclick="uninstallModule(\''+escAttr(name)+'\')">'+(state.lang==='zh'?'卸载':state.lang==='bilingual'?'卸载/Uninstall':'Uninstall')+'</button>';
    }else if(isInst){
      btn='<span class="mc-btn installed">'+(state.lang==='zh'?'已安装':state.lang==='bilingual'?'已安装/Installed':'Installed')+'</span>';
    }else{
      btn='<button class="mc-btn install" onclick="installModule(\''+escAttr(name)+'\',this)">'+(state.lang==='zh'?'安装':state.lang==='bilingual'?'安装/Install':'Install')+'</button>';
    }
    h+='<div class="module-card"><div class="mc-icon">📦</div><div class="mc-info"><div class="mc-name">'+escHtml(name)+'</div><div class="mc-desc">'+escHtml(desc)+'</div></div><div class="mc-tags">'+(cat?'<span class="mc-tag '+catCls+'">'+escHtml(catLabel)+'</span>':'')+'</div>'+btn+'</div>';
  });
  c.innerHTML=h;
}
function installModule(name,btn){
  if(btn){btn.disabled=true;btn.className='mc-btn installing';btn.textContent='...';}
  setModuleStatus('Installing '+name+'...','');
  var src=modulesState.source||'crosswire';
  fetch('/api/v1/sword/install',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({source:src,module:name})})
    .then(function(r){return r.json().then(function(d){return {ok:r.ok,data:d}})})
    .then(function(res){
      if(res.ok&&res.data.success){setModuleStatus(name+' installed!','success');loadInstalledModules();setTimeout(loadAvailableModules,2000)}
      else{setModuleStatus('Install failed: '+(res.data.error||'unknown'),'error');if(btn){btn.disabled=false;btn.className='mc-btn install'};loadInstalledModules()}
    }).catch(function(e){setModuleStatus('Install error: '+escHtml(String(e)),'error');if(btn){btn.disabled=false;btn.className='mc-btn install'};loadInstalledModules()});
}
function uninstallModule(name){
  if(!confirm('Uninstall '+name+'?'))return;
  setModuleStatus('Uninstalling '+name+'...','');
  fetch('/api/v1/sword/modules/'+encodeURIComponent(name),{method:'DELETE'})
    .then(function(r){return r.json().then(function(d){return {ok:r.ok,data:d}})})
    .then(function(res){if(res.ok){setModuleStatus(name+' uninstalled','success');loadInstalledModules()}else{setModuleStatus('Uninstall failed','error')}})
    .catch(function(e){setModuleStatus('Uninstall error: '+escHtml(String(e)),'error')});
}

// ── Daily Devotion ──
// AndBible-style: flat key list (MM.DD), click to read, today highlight
var devotionState = {
  module: 'SME',
  keys: [],
  activeKey: '',
  loading: false
};

var LS_READ = 'bible_devotion_read';
var LS_NOTES = 'bible_devotion_notes';

function getDevotionDateKey(date) {
  var m = date.getMonth() + 1;
  var d = date.getDate();
  return (m < 10 ? '0' : '') + m + '.' + (d < 10 ? '0' : '') + d;
}

function getTodayDateKey() { return getDevotionDateKey(new Date()); }

function devotionKeyToMMDD(key) {
  var m = key.match(/(\d+)年(\d+)月(\d+)日/);
  if (m) { var month=m[2]; var day=m[3]; return (month.length===1?'0':'')+month+'.'+(day.length===1?'0':'')+day; }
  return key;
}

function updateDevotionLabels() {
  var sel = document.getElementById('devotionModule');
  if (!sel) return;
  var opts = sel.options;
  for (var i = 0; i < opts.length; i++) {
    var o = opts[i];
    var zh = o.getAttribute('data-zh'); var en = o.getAttribute('data-en');
    if (state.lang === 'zh') o.textContent = zh;
    else if (state.lang === 'bilingual') o.textContent = zh + ' / ' + en;
    else o.textContent = en;
  }
  var btns = document.querySelectorAll('#devotionOverlay .devotion-toolbar button');
  for (var j = 0; j < btns.length; j++) {
    var b = btns[j];
    var zh = b.getAttribute('data-zh'); var en = b.getAttribute('data-en');
    if (!zh) continue;
    if (state.lang === 'zh') b.textContent = zh;
    else if (state.lang === 'bilingual') b.textContent = zh + ' / ' + en;
    else b.textContent = en;
  }
  var cl = document.getElementById('devotionCheckLabel');
  if (cl) cl.textContent = t('devotionRead');
  var nb = document.getElementById('devotionNoteBtn');
  if (nb) nb.textContent = t('devotionNote');
  var ta = document.getElementById('devotionNoteText');
  if (ta) ta.placeholder = t('devotionNote');
}

function openDevotionPanel() {
  updateDevotionLabels();
  document.getElementById('devotionOverlay').style.display = 'flex';
  document.getElementById('devotionTitle').textContent = t('devotionToday');
  devotionState.activeKey = '';
  document.getElementById('devotionContent').innerHTML = '';
  document.getElementById('devotionKeyList').innerHTML = '';
  switchDevotionModule();
}

function closeDevotionPanel() {
  document.getElementById('devotionOverlay').style.display = 'none';
}

function switchDevotionModule() {
  devotionState.module = document.getElementById('devotionModule').value;
  devotionState.activeKey = '';
  document.getElementById('devotionContent').innerHTML = '';
  document.getElementById('devotionCheckBar').style.display = 'none';
  document.getElementById('devotionNoteArea').style.display = 'none';
  loadDevotionKeys();
}

var DEV_CAL_MONTHS_ZH=['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
var DEV_CAL_MONTHS_EN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
var DEV_CAL_DAYS_ZH=['日','一','二','三','四','五','六'];
var DEV_CAL_DAYS_EN=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function devotionMonthLabel(y,m) {
  var mon=state.lang==='zh'?DEV_CAL_MONTHS_ZH[m]:DEV_CAL_MONTHS_EN[m];
  return mon+' '+y;
}
function devotionDayLabel(d) {
  return state.lang==='zh'?DEV_CAL_DAYS_ZH[d]:DEV_CAL_DAYS_EN[d];
}

function loadDevotionKeys() {
  var mod = devotionState.module;
  var listEl = document.getElementById('devotionKeyList');
  listEl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text2)">' + t('loading') + '</div>';
  fetch('/api/v1/sword/genbook/' + mod + '/keys?limit=400')
    .then(function(r) { return r.json(); })
    .then(function(resp) {
      if (!resp.data || !resp.data.keys) {
        listEl.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text2);font-style:italic">No entries</div>';
        return;
      }
      devotionState.keys = resp.data.keys;
      // Build available dates set
      devotionState.availableDates = new Set();
      devotionState.keys.forEach(function(k) {
        var dd = devotionKeyToMMDD(k.name || k.osisRef || '');
        if (dd) devotionState.availableDates.add(dd);
      });
      renderDevotionCalendar();
    }).catch(function(e) {
      listEl.innerHTML = '<div style="padding:16px;text-align:center;color:var(--danger)">Load failed: ' + escHtml(String(e)) + '</div>';
    });
}

function renderDevotionCalendar() {
  var listEl = document.getElementById('devotionKeyList');
  var today = new Date();
  var todayKey = getTodayDateKey();
  var y = devotionState.calYear || today.getFullYear();
  var m = devotionState.calMonth !== undefined ? devotionState.calMonth : today.getMonth();
  devotionState.calYear = y; devotionState.calMonth = m;

  var firstDay = new Date(y, m, 1).getDay(); // 0=Sun
  var daysInMonth = new Date(y, m + 1, 0).getDate();

  var html = '';
  // Month header
  html += '<div class="dev-cal-header">';
  html += '<button class="dev-cal-nav" onclick="devotionPrevMonth()">◀</button>';
  html += '<span class="dev-cal-month">' + devotionMonthLabel(y, m) + '</span>';
  html += '<button class="dev-cal-nav" onclick="devotionNextMonth()">▶</button>';
  html += '<button class="dev-cal-today" onclick="devotionGoToday()">' + (state.lang==='zh'?'今天':'Today') + '</button>';
  html += '</div>';
  // Day-of-week header
  html += '<div class="dev-cal-dow">';
  for (var d = 0; d < 7; d++) {
    html += '<span class="dev-cal-dow-item">' + devotionDayLabel(d) + '</span>';
  }
  html += '</div>';
  // Day grid
  html += '<div class="dev-cal-grid">';
  for (var i = 0; i < firstDay; i++) {
    html += '<span class="dev-cal-day empty"></span>';
  }
  for (var day = 1; day <= daysInMonth; day++) {
    var dd = (m + 1 < 10 ? '0' : '') + (m + 1) + '.' + (day < 10 ? '0' : '') + day;
    var isToday = (dd === todayKey);
    var isActive = (dd === devotionState.activeKey);
    var hasData = devotionState.availableDates && devotionState.availableDates.has(dd);
    var cls = 'dev-cal-day';
    if (isToday) cls += ' today';
    if (isActive) cls += ' active';
    if (hasData) cls += ' has-data';
    html += '<span class="' + cls + '" onclick="selectDevotionKey(\'' + dd + '\')">' + day + '</span>';
  }
  html += '</div>';
  listEl.innerHTML = html;
  // Auto-select today on first load
  if (!devotionState.activeKey) {
    devotionState.activeKey = todayKey;
    selectDevotionKey(todayKey);
  }
}

function devotionPrevMonth() {
  if (devotionState.calMonth === 0) { devotionState.calMonth = 11; devotionState.calYear--; }
  else devotionState.calMonth--;
  renderDevotionCalendar();
}
function devotionNextMonth() {
  if (devotionState.calMonth === 11) { devotionState.calMonth = 0; devotionState.calYear++; }
  else devotionState.calMonth++;
  renderDevotionCalendar();
}
function devotionGoToday() {
  var today = new Date();
  devotionState.calYear = today.getFullYear();
  devotionState.calMonth = today.getMonth();
  renderDevotionCalendar();
  selectDevotionKey(getTodayDateKey());
}

function selectDevotionKey(key) {
  devotionState.activeKey = key;
  var mod = devotionState.module;
  var contentDiv = document.getElementById('devotionContent');
  contentDiv.className = 'devotion-content';
  contentDiv.innerHTML = '<div style="padding:3rem;text-align:center;color:var(--text2)">' + t('loading') + '</div>';

  document.getElementById('devotionTitle').textContent = key + ' · ' + t('devotionModule' + mod);
  document.getElementById('devotionCheckBar').style.display = '';
  updateDevotionCheck();
  loadDevotionNote();

  renderDevotionCalendar();

  fetch(API + '/sword/genbook/' + mod + '/content?key=' + encodeURIComponent(key))
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.success && data.data.found && data.data.content) {
        contentDiv.className = 'devotion-content';
        contentDiv.innerHTML = parseDevotionOSIS(data.data.content);
        bindDevotionRefs();
      } else {
        contentDiv.innerHTML = '<div style="padding:3rem;text-align:center;color:var(--text2)"><p>📭 ' + t('devotionNoContent') + '</p><p style="font-size:13px;margin-top:8px">' + escHtml(key) + '</p></div>';
      }
    }).catch(function(err) {
      contentDiv.innerHTML = '<div style="padding:3rem;text-align:center;color:#e05555">❌ ' + t('devotionError') + ': ' + escHtml(err.message) + '</div>';
    });
}

// Devotion: read tracking (localStorage)
function getDevotionReadSet() {
  try { return new Set(JSON.parse(localStorage.getItem(LS_READ) || '[]')); } catch(e) { return new Set(); }
}

function isDevotionRead(dateKey, mod) { return getDevotionReadSet().has(mod + ':' + dateKey); }

function toggleDevotionRead() {
  var dateKey = devotionState.activeKey;
  var mod = devotionState.module;
  var fullKey = mod + ':' + dateKey;
  var set = getDevotionReadSet();
  if (set.has(fullKey)) set.delete(fullKey); else set.add(fullKey);
  localStorage.setItem(LS_READ, JSON.stringify(Array.from(set)));
}

function updateDevotionCheck() {
  var dateKey = devotionState.activeKey;
  var mod = devotionState.module;
  document.getElementById('devotionReadCheck').checked = isDevotionRead(dateKey, mod);
}

// Devotion: notes (localStorage)
function getDevotionNotes() {
  try { return JSON.parse(localStorage.getItem(LS_NOTES) || '{}'); } catch(e) { return {}; }
}

function loadDevotionNote() {
  var dateKey = devotionState.activeKey;
  var mod = devotionState.module;
  var fullKey = mod + ':' + dateKey;
  var notes = getDevotionNotes();
  var note = notes[fullKey] || '';
  document.getElementById('devotionNoteText').value = note;
  if (note) {
    document.getElementById('devotionNoteArea').style.display = 'block';
    document.getElementById('devotionNoteBtn').classList.add('active');
  } else {
    document.getElementById('devotionNoteArea').style.display = 'none';
    document.getElementById('devotionNoteBtn').classList.remove('active');
  }
}

function saveDevotionNote() {
  var dateKey = devotionState.activeKey;
  var mod = devotionState.module;
  var fullKey = mod + ':' + dateKey;
  var notes = getDevotionNotes();
  var text = document.getElementById('devotionNoteText').value.trim();
  if (text) notes[fullKey] = text; else delete notes[fullKey];
  localStorage.setItem(LS_NOTES, JSON.stringify(notes));
  document.getElementById('devotionNoteBtn').classList.toggle('active', !!text);
}

function toggleDevotionNote() {
  var area = document.getElementById('devotionNoteArea');
  if (area.style.display === 'none' || area.style.display === '') {
    area.style.display = 'block';
    document.getElementById('devotionNoteText').focus();
  } else {
    area.style.display = 'none';
  }
}

// OSIS rendering (shared by devotion & genbook)
function parseDevotionOSIS(xml) {
  var parser = new DOMParser();
  var doc;
  try { doc = parser.parseFromString(xml, 'text/xml'); } catch(e) { return escHtml(xml); }
  var errNode = doc.querySelector('parsererror');
  if (errNode) doc = parser.parseFromString(xml, 'text/html');
  var html = '';
  var root = doc.documentElement;
  var sections = root.querySelectorAll('div[type="section"]');
  if (sections.length > 0) {
    sections.forEach(function(sec) { html += renderDevotionSection(sec); });
  } else {
    html += renderDevotionNodes(root);
  }
  return html || '<p>' + escHtml(xml) + '</p>';
}

function renderDevotionSection(sec) {
  var html = '';
  var title = sec.querySelector(':scope > title');
  if (title) html += '<h4>' + escHtml(title.textContent) + '</h4>';
  html += renderDevotionNodes(sec);
  return html;
}

function renderDevotionNodes(parent) {
  var html = '';
  var children = parent.childNodes;
  var buf = '';
  function flushBuf() { if (buf.trim()) { html += '<p>' + buf.trim() + '</p>'; buf = ''; } }
  for (var i = 0; i < children.length; i++) {
    var n = children[i];
    if (n.nodeType === Node.TEXT_NODE) { buf += escHtml(n.textContent); continue; }
    if (n.nodeType !== Node.ELEMENT_NODE) continue;
    var tag = n.tagName.toLowerCase();
    if (tag === 'p') { flushBuf(); html += '<p>' + renderDevotionInline(n) + '</p>'; }
    else if (tag === 'title') { flushBuf(); html += '<h3>' + escHtml(n.textContent) + '</h3>'; }
    else if (tag === 'lb' || tag === 'br') { buf += '<br>'; }
    else if (tag === 'hi') {
      var type = n.getAttribute('type') || '';
      if (type === 'italic' || type === 'i') buf += '<em>' + escHtml(n.textContent) + '</em>';
      else if (type === 'bold' || type === 'b') buf += '<strong>' + escHtml(n.textContent) + '</strong>';
      else buf += escHtml(n.textContent);
    } else if (tag === 'reference') {
      buf += '<span class="dv-ref" data-ref="' + escAttr(n.getAttribute('osisRef') || '') + '">' + escHtml(n.textContent) + '</span>';
    } else if (tag === 'div') { flushBuf(); html += renderDevotionSection(n); }
    else { buf += renderDevotionInline(n); }
  }
  flushBuf();
  return html;
}

function renderDevotionInline(parent) {
  var html = '';
  var children = parent.childNodes;
  for (var i = 0; i < children.length; i++) {
    var n = children[i];
    if (n.nodeType === Node.TEXT_NODE) { html += escHtml(n.textContent); continue; }
    if (n.nodeType !== Node.ELEMENT_NODE) continue;
    var tag = n.tagName.toLowerCase();
    if (tag === 'hi') {
      var type = n.getAttribute('type') || '';
      if (type === 'italic' || type === 'i') html += '<em>' + escHtml(n.textContent) + '</em>';
      else if (type === 'bold' || type === 'b') html += '<strong>' + escHtml(n.textContent) + '</strong>';
      else html += escHtml(n.textContent);
    } else if (tag === 'reference') {
      html += '<span class="dv-ref" data-ref="' + escAttr(n.getAttribute('osisRef') || '') + '">' + escHtml(n.textContent) + '</span>';
    } else if (tag === 'lb' || tag === 'br') { html += '<br>'; }
    else { html += renderDevotionInline(n); }
  }
  return html;
}

function bindDevotionRefs() {
  var refs = document.querySelectorAll('#devotionContent .dv-ref');
  refs.forEach(function(el) {
    el.addEventListener('click', function() {
      var ref = el.getAttribute('data-ref');
      var m = ref.match(/Bible:(.+)\.(\d+)\.(\d+)/i);
      if (m) {
        var bookName = m[1]; var chapter = parseInt(m[2]);
        var book = state.books.find(function(b) { return b.name && b.name.toLowerCase() === bookName.toLowerCase(); }) ||
          state.books.find(function(b) { return b.id && b.id.toLowerCase() === bookName.toLowerCase(); });
        if (book) {
          state.currentBook = book; state.currentChapter = chapter;
          closeDevotionPanel();
          loadChapter();
          document.getElementById('readerView').scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });
}

// General Book
// AndBible-style: flat key list + search + pagination, click to read
var genbookState = {
  module: 'Pilgrim',
  keys: [],
  keyOffset: 0,
  keyTotal: 0,
  keySearch: '',
  activeKey: ''
};
var _genbookKeySearchTimer = 0;

function updateGenBookLabels() {
  var sel = document.getElementById('genbookModule');
  if (!sel) return;
  var opts = sel.options;
  for (var i = 0; i < opts.length; i++) {
    var o = opts[i];
    var zh = o.getAttribute('data-zh'); var en = o.getAttribute('data-en');
    if (state.lang === 'zh') o.textContent = zh;
    else if (state.lang === 'bilingual') o.textContent = zh + ' / ' + en;
    else o.textContent = en;
  }
  var btns = document.querySelectorAll('#genbookOverlay .book-keys-search button');
  for (var j = 0; j < btns.length; j++) {
    var b = btns[j];
    var zh = b.getAttribute('data-zh'); var en = b.getAttribute('data-en');
    if (!zh) continue;
    if (state.lang === 'zh') b.textContent = zh;
    else if (state.lang === 'bilingual') b.textContent = zh + ' / ' + en;
    else b.textContent = en;
  }
}

function openGenBookPanel() {
  updateGenBookLabels();
  document.getElementById('genbookOverlay').style.display = 'flex';
  var titleEl = document.getElementById('genbookTitle');
  if (state.lang === 'zh') titleEl.textContent = '📖 通用书';
  else if (state.lang === 'bilingual') titleEl.textContent = '📖 通用书 / General Books';
  else titleEl.textContent = '📖 General Books';
  genbookState.activeKey = '';
  document.getElementById('genbookContent').innerHTML = '';
  switchGenBookModule();
}

function closeGenBookPanel() {
  document.getElementById('genbookOverlay').style.display = 'none';
}

function switchGenBookModule() {
  genbookState.module = document.getElementById('genbookModule').value;
  genbookState.activeKey = '';
  genbookState.keyOffset = 0;
  genbookState.keySearch = '';
  document.getElementById('genbookKeySearch').value = '';
  document.getElementById('genbookContent').innerHTML = '';
  loadGenBookKeys();
}

function loadGenBookKeys(dir) {
  var mod = genbookState.module;
  var offset = genbookState.keyOffset;
  if (dir === 'next') offset += 50;
  else if (dir === 'prev') offset = Math.max(0, offset - 50);
  else offset = 0;

  var search = encodeURIComponent(genbookState.keySearch);
  var url = '/api/v1/sword/genbook/' + mod + '/keys?offset=' + offset + '&limit=50';
  if (search) url += '&search=' + search;

  var listEl = document.getElementById('genbookKeyList');
  listEl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text2)">' + t('loading') + '</div>';

  fetch(url).then(function(r) { return r.json(); }).then(function(resp) {
    if (!resp.data) return;
    var keys = resp.data.keys || [];
    genbookState.keyOffset = offset;
    genbookState.keyTotal = resp.data.totalCount || 0;
    var html = '';
    keys.forEach(function(k) {
      var name = k.name || k.osisRef || '';
      var active = name === genbookState.activeKey ? ' active' : '';
      html += '<div class="book-key-item' + active + '" onclick="selectGenBookKey(\'' + escAttr(name) + '\')">' + escHtml(name) + '</div>';
    });
    listEl.innerHTML = html || '<div style="padding:16px;text-align:center;color:var(--text2);font-style:italic">No entries</div>';
    document.getElementById('genbookKeyPrev').disabled = (offset === 0);
    document.getElementById('genbookKeyNext').disabled = (offset + 50 >= genbookState.keyTotal);
    document.getElementById('genbookKeyPage').textContent = Math.floor(offset / 50 + 1) + '/' + Math.ceil(genbookState.keyTotal / 50);
  }).catch(function(e) {
    listEl.innerHTML = '<div style="padding:16px;text-align:center;color:var(--danger)">Load failed: ' + escHtml(String(e)) + '</div>';
  });
}

function searchGenBookKeys() {
  clearTimeout(_genbookKeySearchTimer);
  genbookState.keySearch = document.getElementById('genbookKeySearch').value.trim();
  genbookState.keyOffset = 0;
  loadGenBookKeys();
}

function selectGenBookKey(key) {
  genbookState.activeKey = key;
  var mod = genbookState.module;
  var contentDiv = document.getElementById('genbookContent');
  contentDiv.className = 'devotion-content';
  contentDiv.innerHTML = '<div style="padding:3rem;text-align:center;color:var(--text2)">' + t('loading') + '</div>';

  var items = document.querySelectorAll('#genbookKeyList .book-key-item');
  items.forEach(function(el) { el.classList.toggle('active', el.textContent === key); });
  var activeEl = document.querySelector('#genbookKeyList .book-key-item.active');
  if (activeEl) activeEl.scrollIntoView({ block: 'nearest' });

  fetch('/api/v1/sword/genbook/' + mod + '/content?key=' + encodeURIComponent(key))
    .then(function(r) { return r.json(); })
    .then(function(resp) {
      if (!resp.data || !resp.data.found) {
        contentDiv.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text2);font-style:italic">Content not found</div>';
        contentDiv.className = 'devotion-content';
        return;
      }
      var content = resp.data.content || '';
      if (content.indexOf('<div') >= 0 || content.indexOf('<p') >= 0) {
        content = parseDevotionOSIS(content);
      } else {
        content = parseThMLContent(content);
      }
      contentDiv.innerHTML = content;
      contentDiv.className = 'devotion-content';
    }).catch(function(e) {
      contentDiv.innerHTML = '<div style="padding:16px;text-align:center;color:var(--danger)">Load failed: ' + escHtml(String(e)) + '</div>';
      contentDiv.className = 'devotion-content';
    });
}

function parseThMLContent(raw) {
  if (!raw) return '<p style="color:var(--text2);font-style:italic">No content</p>';
  var text = raw;
  text = text.replace(/<\/?\s*(p|br|hr|b|i|em|strong|h[1-6]|ul|ol|li|blockquote|sup|sub|table|tr|td|th|thead|tbody|div|span|a|img|font|q)(\s[^>]*)?(\/)?\s*>/gi, function(m) { return m; });
  text = text.replace(/<[^>]+>/g, '');
  text = text.replace(/\n\s*\n/g, '</p><p>');
  text = text.replace(/<p>\s*<\/p>/g, '');
  if (!text.match(/<p>/i)) text = '<p>' + text + '</p>';
  return text;
}


// ── Verse Tools: bookmarks, notes, cross-references ──
var verseTools = { bookmarks: {}, notes: {}, xrefEl: null };

function loadBookmarks() {
  fetch('/api/v1/text/bookmarks/' + (state.currentBook ? state.currentBook.id : 'gen') + '.' + state.currentChapter + '.1', { headers: authHeader() })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      verseTools.bookmarks = {};
      (data || []).forEach(function(b) { verseTools.bookmarks[b.verseRef || b.ref] = true; });
      updateVerseToolUI();
    }).catch(function() {});
}

function isBookmarked(ref) { return !!verseTools.bookmarks[ref]; }

function toggleBookmark(ref, btn) {
  if (!isLoggedIn()) { showVerseToast(t('loginRequired') || '请先登录', true); return; }
  var hdrs = Object.assign({ 'Content-Type': 'application/json' }, authHeader());
  if (isBookmarked(ref)) {
    fetch('/api/v1/text/bookmarks/' + encodeURIComponent(ref), { method: 'DELETE', headers: authHeader() })
      .then(function() { delete verseTools.bookmarks[ref]; updateVerseToolUI(); showVerseToast('🔖 书签已移除'); })
      .catch(function() { showVerseToast('删除失败', true); });
  } else {
    fetch('/api/v1/text/bookmarks', {
      method: 'POST',
      headers: hdrs,
      body: JSON.stringify({ verseRef: ref })
    }).then(function() { verseTools.bookmarks[ref] = true; updateVerseToolUI(); showVerseToast('🔖 已添加书签'); })
      .catch(function() { showVerseToast('添加失败', true); });
  }
}

function updateVerseToolUI() {
  document.querySelectorAll('.verse-line').forEach(function(el) {
    var ref = el.getAttribute('data-ref');
    if (!ref) return;
    var bmBtn = el.querySelector('.vt-bookmark');
    if (isBookmarked(ref)) {
      el.classList.add('bookmarked');
      if (bmBtn) bmBtn.classList.add('active');
    } else {
      el.classList.remove('bookmarked');
      if (bmBtn) bmBtn.classList.remove('active');
    }
    if (verseTools.notes[ref]) el.classList.add('has-note');
    else el.classList.remove('has-note');
  });
}

// ── Notes ──

function loadNote(ref) {
  return fetch('/api/v1/text/notes/' + encodeURIComponent(ref), { headers: authHeader() })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data && (Array.isArray(data) ? data.length > 0 : data)) {
        var note = Array.isArray(data) ? data[0] : data;
        verseTools.notes[ref] = note.content || note.text || '';
      } else {
        verseTools.notes[ref] = '';
      }
      return verseTools.notes[ref];
    }).catch(function() { verseTools.notes[ref] = ''; return ''; });
}

function openNoteEditor(ref) {
  loadNote(ref).then(function(content) {
    var existing = document.getElementById('noteEditorOverlay');
    if (existing) existing.remove();
    var overlay = document.createElement('div');
    overlay.id = 'noteEditorOverlay';
    overlay.className = 'note-editor-overlay';
    overlay.onclick = function(e) { if (e.target === overlay) closeNoteEditor(); };
    overlay.innerHTML =
      '<div class="note-editor-panel" onclick="event.stopPropagation()">' +
      '<div class="note-editor-header">' +
      '<h3>📝 ' + (t('note')||'Note') + '</h3>' +
      '<button class="vt-close" onclick="closeNoteEditor()">✕</button>' +
      '</div>' +
      '<div class="note-editor-ref" data-ref="' + escAttr(ref) + '">' + ref + '</div>' +
      '<textarea class="note-editor-textarea" id="noteEditorTextarea" placeholder="' + (t('notePlaceholder')||'Write your note...') + '">' + escHtml(content || '') + '</textarea>' +
      '<div class="note-editor-actions">' +
      (content ? '<button class="ne-delete" onclick="deleteNote(\x27' + ref + '\x27)">' + (t('delete')||'Delete') + '</button>' : '') +
      '<button class="ne-cancel" onclick="closeNoteEditor()">' + (t('cancel')||'Cancel') + '</button>' +
      '<button class="ne-save" onclick="saveNote()">' + (t('save')||'Save') + '</button>' +
      '</div></div>';
    document.body.appendChild(overlay);
    document.getElementById('noteEditorTextarea').focus();
  });
}

function closeNoteEditor() {
  var el = document.getElementById('noteEditorOverlay');
  if (el) el.remove();
}

function saveNote() {
  var ta = document.getElementById('noteEditorTextarea');
  var refEl = document.querySelector('.note-editor-ref');
  if (!ta || !refEl) return;
  var ref = refEl.getAttribute('data-ref');
  var content = ta.value.trim();
  if (!content) { deleteNote(ref); return; }
  fetch('/api/v1/text/notes', {
    method: 'POST',
    headers: Object.assign({ 'Content-Type': 'application/json' }, authHeader()),
    body: JSON.stringify({ verseRef: ref, content: content })
  }).then(function() {
    verseTools.notes[ref] = content;
    updateVerseToolUI();
    closeNoteEditor();
    showVerseToast('📝 笔记已保存');
  }).catch(function() { showVerseToast('保存失败', true); });
}

function deleteNote(ref) {
  fetch('/api/v1/text/notes/' + encodeURIComponent(ref), { method: 'DELETE', headers: authHeader() })
    .then(function() {
      delete verseTools.notes[ref];
      updateVerseToolUI();
      closeNoteEditor();
      showVerseToast('📝 笔记已删除');
    }).catch(function() { showVerseToast('删除失败', true); });
}

// ── Cross References ──

function toggleCrossRefs(ref, btn) {
  var line = btn.closest('.verse-line');
  if (!line) return;
  // Close if already open
  if (verseTools.xrefEl && verseTools.xrefEl.parentNode) {
    verseTools.xrefEl.remove();
    verseTools.xrefEl = null;
    if (verseTools._lastXrefRef === ref) return;
  }
  // Open
  verseTools._lastXrefRef = ref;
  var panel = document.createElement('div');
  panel.className = 'xref-panel';
  panel.innerHTML = '<div class="xref-loading">' + (t('loading')||'Loading...') + '</div>';
  line.after(panel);
  verseTools.xrefEl = panel;
  loadCrossRefs(ref, panel);
}

function loadCrossRefs(ref, panel) {
  fetch('/api/v1/text/crossrefs?ref=' + encodeURIComponent(ref))
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var refs = data.crossRefs || data.refs || [];
      if (!refs.length) {
        panel.innerHTML = '<div class="xref-loading">' + (t('noCrossRefs')||'No cross references') + '</div>';
        return;
      }
      panel.innerHTML = '<div class="xref-title">🔗 ' + (t('crossRefs')||'Cross References') + ' (' + refs.length + ')</div>' +
        '<div class="xref-list">' +
        refs.map(function(r) {
          return '<span class="xref-item" onclick="navigateToRef(\x27' + escAttr(r) + '\x27)">' + escHtml(r.toUpperCase()) + '</span>';
        }).join('') +
        '</div>';
    }).catch(function() {
      panel.innerHTML = '<div class="xref-loading" style="color:#e05555">' + (t('loadFailed')||'Failed to load') + '</div>';
    });
}

function navigateToRef(ref) {
  var parts = (ref || '').split('.');
  if (parts.length < 3) return;
  var book = parts[0].toLowerCase();
  var chapter = parseInt(parts[1]) || 1;
  var books = state.books || [];
  var bk = books.find(function(b) { return b.id === book; });
  if (!bk) { showVerseToast('书卷未找到: ' + book, true); return; }
  state.currentBook = bk;
  state.currentChapter = chapter;
  loadChapter().then(function() {
    // Scroll to verse after render
    setTimeout(function() {
      var el = document.getElementById('v-' + ref);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
  });
}

// ── Toast ──

function showVerseToast(msg, isError) {
  var existing = document.getElementById('verseToast');
  if (existing) existing.remove();
  var toast = document.createElement('div');
  toast.id = 'verseToast';
  toast.style.cssText = 'position:fixed;bottom:1rem;left:50%;transform:translateX(-50%);padding:0.55rem 1.2rem;background:' + (isError ? '#e05555' : 'var(--accent)') + ';color:#fff;border-radius:8px;font-size:0.85rem;z-index:2000;pointer-events:none;transition:opacity 0.3s;';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(function() { toast.style.opacity = '0'; setTimeout(function() { if (toast.parentNode) toast.remove(); }, 300); }, 2000);
}

// Load bookmarks when chapter changes
var _origLoadChapter = loadChapter;
loadChapter = function() {
  var result = _origLoadChapter.apply(this, arguments);
  if (result && result.then) {
    result.then(function() { loadBookmarks(); });
  }
  return result;
};

// ══════════════════════════════════════════════════════════════════
// ── Bookmarks Management Panel ──
// ══════════════════════════════════════════════════════════════════

function openBookmarksPanel() {
  var el = document.getElementById('bookmarksOverlay');
  if (!el) return;
  el.style.display = 'flex';
  loadBookmarkList();
}

function closeBookmarksPanel() {
  var el = document.getElementById('bookmarksOverlay');
  if (el) el.style.display = 'none';
}

function loadBookmarkList() {
  var list = document.getElementById('bookmarkList');
  if (!list) return;
  list.innerHTML = '<div class="bm-empty">' + (t('loading')||'Loading...') + '</div>';
  fetch('/api/v1/text/bookmarks')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data || !data.length) {
        list.innerHTML = '<div class="bm-empty">📭 ' + (t('noBookmarks')||'No bookmarks yet') + '</div>';
        return;
      }
      var countHtml = '<div class="bm-count">' + data.length + ' bookmark(s)</div>';
      var itemsHtml = data.map(function(b) {
        var ref = b.verseRef || '';
        var label = b.note || b.label || ref;
        var date = b.createdAt ? new Date(b.createdAt).toLocaleDateString() : '';
        return '<div class="bm-item">' +
          '<span class="bm-item-ref" onclick="navigateToRef(\x27' + escAttr(ref) + '\x27);closeBookmarksPanel()" title="' + escAttr(t('goTo')||'Go to') + '">' + escHtml(ref) + '</span>' +
          '<span class="bm-item-preview">' + escHtml(label) + '</span>' +
          '<span class="bm-item-date">' + date + '</span>' +
          '<button class="bm-item-del" onclick="deleteBookmarkItem(\x27' + escAttr(ref) + '\x27)" title="' + escAttr(t('delete')||'Delete') + '">✕</button>' +
          '</div>';
      }).join('');
      list.innerHTML = countHtml + itemsHtml;
    }).catch(function() {
      list.innerHTML = '<div class="bm-empty" style="color:#e05555">' + (t('loadFailed')||'Failed to load') + '</div>';
    });
}

function deleteBookmarkItem(ref) {
  fetch('/api/v1/text/bookmarks/' + encodeURIComponent(ref), { method: 'DELETE', headers: authHeader() })
    .then(function() {
      delete verseTools.bookmarks[ref];
      updateVerseToolUI();
      loadBookmarkList();
      showVerseToast('🔖 书签已删除');
    }).catch(function() { showVerseToast('删除失败', true); });
}

// ══════════════════════════════════════════════════════════════════
// ── Notes Management Panel ──
// ══════════════════════════════════════════════════════════════════

function openNotesPanel() {
  var el = document.getElementById('notesOverlay');
  if (!el) return;
  el.style.display = 'flex';
  loadNoteList();
}

function closeNotesPanel() {
  var el = document.getElementById('notesOverlay');
  if (el) el.style.display = 'none';
}

function loadNoteList() {
  var list = document.getElementById('noteList');
  if (!list) return;
  list.innerHTML = '<div class="bm-empty">' + (t('loading')||'Loading...') + '</div>';
  fetch('/api/v1/text/notes')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data || !data.length) {
        list.innerHTML = '<div class="bm-empty">📭 ' + (t('noNotes')||'No notes yet') + '</div>';
        return;
      }
      var countHtml = '<div class="bm-count">' + data.length + ' note(s)</div>';
      var itemsHtml = data.map(function(n) {
        var ref = n.verseRef || '';
        var preview = (n.content || '').substring(0, 80);
        if ((n.content || '').length > 80) preview += '...';
        var date = n.updatedAt ? new Date(n.updatedAt).toLocaleDateString() : '';
        return '<div class="bm-item">' +
          '<span class="bm-item-ref" onclick="closeNotesPanel();navigateToRef(\x27' + escAttr(ref) + '\x27)" title="' + escAttr(t('goTo')||'Go to') + '">' + escHtml(ref) + '</span>' +
          '<span class="bm-item-preview">' + escHtml(preview) + '</span>' +
          '<span class="bm-item-date">' + date + '</span>' +
          '<button class="bm-item-del" onclick="deleteNoteItem(\x27' + escAttr(ref) + '\x27)" title="' + escAttr(t('delete')||'Delete') + '">✕</button>' +
          '</div>';
      }).join('');
      list.innerHTML = countHtml + itemsHtml;
    }).catch(function() {
      list.innerHTML = '<div class="bm-empty" style="color:#e05555">' + (t('loadFailed')||'Failed to load') + '</div>';
    });
}

function deleteNoteItem(ref) {
  fetch('/api/v1/text/notes/' + encodeURIComponent(ref), { method: 'DELETE', headers: authHeader() })
    .then(function() {
      delete verseTools.notes[ref];
      updateVerseToolUI();
      loadNoteList();
      showVerseToast('📝 笔记已删除');
    }).catch(function() { showVerseToast('删除失败', true); });
}

// ══════════════════════════════════════════════════════════════════
// ── Repository Management Panel ──
// ══════════════════════════════════════════════════════════════════

var customRepos = [];

function loadCustomReposFile() {
  return fetch('/repos.json').then(function(r){return r.json()}).then(function(d){
    customRepos = (d||{}).customRepositories || [];
    return customRepos;
  }).catch(function(){customRepos=[];return customRepos});
}

function saveCustomReposFile() {
  var data = { version: 1, customRepositories: customRepos };
  return fetch('/api/v1/text/repos', {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify(data)
  }).then(function(r){return r.json()});
}

function openReposPanel() {
  var el = document.getElementById('reposOverlay');
  if (!el) return;
  el.style.display = 'flex';
  document.getElementById('repoAddForm').style.display = 'none';
  loadCustomReposFile().then(function(){
    renderRepoList();
  });
}

function closeReposPanel() {
  var el = document.getElementById('reposOverlay');
  if (el) el.style.display = 'none';
}

function renderRepoList() {
  var c = document.getElementById('repoListContainer');
  if (!c) return;
  var all = [];
  if (_repoSources && _repoSources.length) {
    _repoSources.forEach(function(s){
      if (s._source === 'builtin') {
        all.push({ id: s.id, name: s.name||s.id, baseUrl: 'https://' + s.host + (s._path||''), _source: 'builtin' });
      }
    });
  }
  customRepos.forEach(function(r){ all.push({id:r.id||'custom',name:r.name,baseUrl:r.baseUrl,_source:'custom'}) });

  if (!all.length) {
    c.innerHTML = '<div class="bm-empty">Loading repositories...</div>';
    return;
  }
  var html = '<div class="bm-count">' + all.length + ' repository(ies)</div>';
  all.forEach(function(r){
    var badge = r._source==='builtin'
      ? '<span class="repo-badge builtin">Built-in</span>'
      : '<span class="repo-badge custom">Custom</span>';
    var actions = r._source==='custom'
      ? '<button class="bm-item-del" onclick="removeCustomRepo(\x27' + escAttr(r.id) + '\x27)" title="Remove">\u2715</button>'
      : '';
    html += '<div class="bm-item">' +
      '<span class="bm-item-preview" style="flex:1"><strong>' + escHtml(r.name) + '</strong>' +
      '<br><span style="font-size:0.72rem;color:var(--text3);word-break:break-all">' + escHtml(r.baseUrl||'') + '</span></span>' +
      badge + actions +
      '</div>';
  });
  c.innerHTML = html;
}

function showAddRepoForm() {
  document.getElementById('repoAddForm').style.display = 'block';
  document.getElementById('repoAddName').value = '';
  document.getElementById('repoAddUrl').value = '';
}

function cancelAddRepo() {
  document.getElementById('repoAddForm').style.display = 'none';
}

function saveCustomRepo() {
  var name = document.getElementById('repoAddName').value.trim();
  var baseUrl = document.getElementById('repoAddUrl').value.trim();
  if (!name || !baseUrl) {
    alert('请填写名称和地址');
    return;
  }
  // Normalize URL
  if (!/^https?:\/\//.test(baseUrl)) baseUrl = 'https://' + baseUrl;
  baseUrl = baseUrl.replace(/\/+$/, '');
  // Auto-derive id from name
  var id = name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  var repo = { name: name, baseUrl: baseUrl, id: id };
  customRepos = customRepos.filter(function(r){return r.id !== id});
  customRepos.push(repo);
  saveCustomReposFile().then(function(){
    cancelAddRepo();
    loadRepoSources().then(function(){
      renderRepoList();
      closeReposPanel();
      openModulesPanel();
    });
  }).catch(function(e){
    alert('保存失败: ' + e);
  });
}

function removeCustomRepo(id) {
  if (!confirm('删除仓库 "' + id + '"?')) return;
  customRepos = customRepos.filter(function(r){return r.id !== id});
  saveCustomReposFile().then(function(){
    loadRepoSources().then(function(){
      renderRepoList();
    });
  }).catch(function(e){
    alert('保存失败: ' + e);
  });
}


// ==================== Maps ====================
var mapsState = {
  modules: [],
  currentModule: '',
  maps: [],
  currentIndex: 0,
  zoom: 1,
  panX: 0,
  panY: 0,
  dragging: false,
  dragStartX: 0,
  dragStartY: 0,
  panStartX: 0,
  panStartY: 0,
  fullscreen: false
};

function openMapsPanel() {
  var overlay = document.getElementById("mapsOverlay");
  if (!overlay) return;
  fetch(API + "/sword/modules")
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var mapMods = (data.modules || []).filter(function(m) { return m.category === "MAPS"; });
      mapsState.modules = mapMods;
      var sel = document.getElementById("mapsModule");
      if (!sel) return;
      sel.innerHTML = '<option value="">-- 选择地图集 --</option>' +
        mapMods.map(function(m) {
          return '<option value="' + escHtml(m.initials) + '">' + escHtml(m.name) + '</option>';
        }).join('');
      overlay.style.display = 'flex';
      if (mapMods.length > 0) {
        sel.value = mapMods[0].initials;
        switchMapsModule();
      }
    }).catch(function(e) {
      console.error('Failed to load map modules:', e);
    });
}

function closeMapsPanel() {
  var overlay = document.getElementById("mapsOverlay");
  if (overlay) overlay.style.display = 'none';
  closeMapImageViewer();
}

function switchMapsModule() {
  var sel = document.getElementById("mapsModule");
  if (!sel) return;
  var mod = sel.value;
  mapsState.currentModule = mod;
  if (!mod) {
    document.getElementById("mapsThumbnailGrid").innerHTML = '<p style="padding:16px;color:#888;">请选择一个地图集</p>';
    return;
  }
  fetch(API + "/sword/genbook/" + mod + "/keys")
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data.success) { showMapError(data.message || "加载失败"); return; }
      mapsState.maps = data.data.keys || [];
      renderMapThumbnails();
    }).catch(function(e) {
      showMapError("加载地图列表失败: " + e.message);
    });
}

function showMapError(msg) {
  document.getElementById("mapsThumbnailGrid").innerHTML = '<p style="padding:16px;color:#c0392b;">' + escHtml(msg) + '</p>';
}

function renderMapThumbnails() {
  var grid = document.getElementById("mapsThumbnailGrid");
  if (!grid) return;
  if (mapsState.maps.length === 0) {
    grid.innerHTML = '<p style="padding:16px;color:#888;">此地图集没有内容</p>';
    return;
  }
  grid.innerHTML = mapsState.maps.map(function(m, i) {
    var imgUrl = API + "/sword/genbook/" + mapsState.currentModule + "/image?key=" + encodeURIComponent(m.osisRef);
    return '<div class="maps-thumbnail-card" onclick="openMapImage(' + i + ')">' +
      '<img src="' + imgUrl + '" alt="' + escHtml(m.name) + '" loading="lazy">' +
      '<div class="maps-thumb-title">' + escHtml(m.name) + '</div>' +
    '</div>';
  }).join('');
}

function openMapImage(index) {
  mapsState.currentIndex = index;
  var m = mapsState.maps[index];
  if (!m) return;
  var viewer = document.getElementById("mapsImageViewer");
  var img = document.getElementById("mapsFullImage");
  var title = document.getElementById("mapsImageTitle");
  if (!viewer || !img || !title) return;
  img.src = API + "/sword/genbook/" + mapsState.currentModule + "/image?key=" + encodeURIComponent(m.osisRef);
  mapsState.zoom = 1;
  mapsState.panX = 0;
  mapsState.panY = 0;
  title.textContent = m.name;
  viewer.style.display = "flex";
  updateMapNavButtons();
  setTimeout(function() {
    applyMapTransform(1, 0, 0);
    initMapDrag();
  }, 100);
}

function closeMapImageViewer() {
  var viewer = document.getElementById("mapsImageViewer");
  if (viewer) {
    viewer.style.display = "none";
    mapsState.zoom = 1;
    mapsState.panX = 0;
    mapsState.panY = 0;
    mapsState.dragging = false;
  }
  // Exit fullscreen if active
  if (mapsState.fullscreen) {
    toggleMapFullscreen();
  }
}

function navigateMap(delta) {
  var newIdx = mapsState.currentIndex + delta;
  if (newIdx >= 0 && newIdx < mapsState.maps.length) {
    openMapImage(newIdx);
  }
}

function updateMapNavButtons() {
  var prevBtn = document.getElementById("mapsPrevBtn");
  var nextBtn = document.getElementById("mapsNextBtn");
  if (prevBtn) prevBtn.disabled = mapsState.currentIndex <= 0;
  if (nextBtn) nextBtn.disabled = mapsState.currentIndex >= mapsState.maps.length - 1;
}

function mapZoomIn() {
  var newZoom = Math.min(mapsState.zoom * 1.4, 8);
  applyMapTransform(newZoom, mapsState.panX, mapsState.panY);
}
function mapZoomOut() {
  var newZoom = Math.max(mapsState.zoom / 1.4, 0.3);
  applyMapTransform(newZoom, mapsState.panX, mapsState.panY);
}
function mapZoomReset() {
  mapsState.panX = 0;
  mapsState.panY = 0;
  applyMapTransform(1, 0, 0);
}
function applyMapTransform(zoom, panX, panY) {
  mapsState.zoom = zoom;
  mapsState.panX = panX;
  mapsState.panY = panY;
  var img = document.getElementById("mapsFullImage");
  if (img) {
    img.style.transform = "translate(" + panX + "px, " + panY + "px) scale(" + zoom + ")";
  }
}
function toggleMapFullscreen() {
  var panel = document.querySelector(".maps-panel");
  if (!panel) return;
  mapsState.fullscreen = !mapsState.fullscreen;
  panel.classList.toggle("fullscreen", mapsState.fullscreen);
  var btn = document.getElementById("mapsFullscreenBtn");
  if (btn) btn.textContent = mapsState.fullscreen ? "⛶" : "⛶";
}

// Drag-to-pan support
function initMapDrag() {
  var container = document.getElementById("mapsImageContainer");
  if (!container || container._dragInit) return;
  container._dragInit = true;

  function startDrag(e) {
    if (mapsState.zoom <= 1) return;
    e.preventDefault();
    mapsState.dragging = true;
    var pt = e.touches ? e.touches[0] : e;
    mapsState.dragStartX = pt.clientX;
    mapsState.dragStartY = pt.clientY;
    mapsState.panStartX = mapsState.panX;
    mapsState.panStartY = mapsState.panY;
    container.classList.add("grabbing");
  }

  function moveDrag(e) {
    if (!mapsState.dragging) return;
    e.preventDefault();
    var pt = e.touches ? e.touches[0] : e;
    var dx = pt.clientX - mapsState.dragStartX;
    var dy = pt.clientY - mapsState.dragStartY;
    applyMapTransform(mapsState.zoom, mapsState.panStartX + dx, mapsState.panStartY + dy);
  }

  function endDrag(e) {
    mapsState.dragging = false;
    container.classList.remove("grabbing");
  }

  container.addEventListener("mousedown", startDrag);
  container.addEventListener("mousemove", moveDrag);
  container.addEventListener("mouseup", endDrag);
  container.addEventListener("mouseleave", endDrag);
  container.addEventListener("touchstart", startDrag, {passive: false});
  container.addEventListener("touchmove", moveDrag, {passive: false});
  container.addEventListener("touchend", endDrag);

  // Mouse wheel zoom
  container.addEventListener("wheel", function(e) {
    e.preventDefault();
    var delta = e.deltaY > 0 ? 0.9 : 1.1;
    var newZoom = Math.max(0.3, Math.min(8, mapsState.zoom * delta));
    // Zoom toward cursor position
    var rect = container.getBoundingClientRect();
    var cx = e.clientX - rect.left - rect.width / 2;
    var cy = e.clientY - rect.top - rect.height / 2;
    var scale = newZoom / mapsState.zoom;
    var newPanX = cx - scale * (cx - mapsState.panX);
    var newPanY = cy - scale * (cy - mapsState.panY);
    applyMapTransform(newZoom, newPanX, newPanY);
  }, {passive: false});
}

// ============ Auth ============
var AUTH_API = API + "/auth";
var authState = {
  loggedIn: false,
  user: null,
  token: null
};

/** Get auth header object (with Bearer token if logged in, empty otherwise) */
function authHeader() {
  if (authState.token) return { "Authorization": "Bearer " + authState.token };
  return {};
}

/** Check if user is authenticated */
function isLoggedIn() {
  return authState.loggedIn && !!authState.token;
}

// Load token on startup
(function() {
  try {
    var saved = localStorage.getItem("bible_auth");
    if (saved) {
      var parsed = JSON.parse(saved);
      authState.token = parsed.token;
      authState.user = parsed.user;
      fetch(AUTH_API + "/me", {
        headers: { "Authorization": "Bearer " + authState.token }
      }).then(function(r) { return r.json(); }).then(function(d) {
        if (d.success) {
          authState.loggedIn = true;
          authState.user = d.user;
          updateLoginButton();
          if (d.user.role === "ADMIN") showAdminFeatures();
        } else {
          authState.token = null;
          authState.user = null;
          localStorage.removeItem("bible_auth");
        }
      }).catch(function() {});
    }
  } catch(e) {}
})();

function openAuthPanel() {
  document.getElementById("authOverlay").style.display = "flex";
  if (authState.loggedIn) {
    showProfileView();
  } else {
    switchAuthTab("login");
    document.getElementById("authError").style.display = "none";
    document.getElementById("regError").style.display = "none";
  }
}

function closeAuthPanel() {
  document.getElementById("authOverlay").style.display = "none";
}

function switchAuthTab(tab) {
  // Hide all auth sub-views
  var views = ["authLoginForm", "authRegisterForm", "authProfileView", "authProfileForm", "authPwdForm", "authForgotForm", "adminUserPanel"];
  views.forEach(function(id) { var el = document.getElementById(id); if (el) el.style.display = "none"; });
  
  var tabs = document.querySelectorAll(".auth-tab");
  tabs.forEach(function(t) { t.classList.remove("active"); });
  
  if (tab === "login") {
    tabs[0].classList.add("active");
    document.getElementById("authLoginForm").style.display = "block";
    document.getElementById("authTabs").style.display = "";
    document.getElementById("authTitle").textContent = state.lang === "zh" ? "👤 登录" : "👤 Login";
  } else if (tab === "register") {
    tabs[1].classList.add("active");
    document.getElementById("authRegisterForm").style.display = "block";
    document.getElementById("authTabs").style.display = "";
    document.getElementById("authTitle").textContent = state.lang === "zh" ? "📝 注册" : "📝 Register";
    loadCaptcha();
  } else if (tab === "forgot") {
    document.getElementById("authForgotForm").style.display = "block";
    document.getElementById("authTabs").style.display = "none";
    document.getElementById("authTitle").textContent = state.lang === "zh" ? "🔑 忘记密码" : "🔑 Forgot Password";
    document.getElementById("forgotMsg").style.display = "none";
    document.getElementById("forgotResult").style.display = "none";
    document.getElementById("forgotUsername").value = "";
  }
}

// -- Profile view (when logged in) --
function showProfileView() {
  var views = ["authLoginForm", "authRegisterForm", "authProfileForm", "authPwdForm", "authForgotForm"];
  views.forEach(function(id) { var el = document.getElementById(id); if (el) el.style.display = "none"; });
  document.getElementById("authTabs").style.display = "none";
  document.getElementById("authProfileView").style.display = "block";
  document.getElementById("authTitle").textContent = "👤 " + (state.lang === "zh" ? "个人中心" : "Profile");
  
  if (authState.user) {
    var u = authState.user;
    document.getElementById("profileUsername").textContent = u.username;
    var roleLabel = u.role === "ADMIN" ? (state.lang === "zh" ? "管理员" : "Admin") : (state.lang === "zh" ? "用户" : "User");
    var roleBadge = document.getElementById("profileRoleBadge");
    if (roleBadge) {
      roleBadge.textContent = roleLabel;
      roleBadge.className = u.role === "ADMIN" ? "admin-role-admin" : "admin-role-user";
      roleBadge.style.cssText = "display:inline-block;padding:2px 8px;border-radius:10px;font-size:0.75rem;margin-top:4px";
    }
    var infoEl = document.getElementById("profileInfo");
    if (infoEl) infoEl.textContent = (u.email ? "📧 " + u.email + " " : "") + (u.phone ? "📞 " + u.phone : "");
  }
  
  // Show admin panel toggle if admin
  if (authState.user && authState.user.role === "ADMIN") {
    document.getElementById("adminUserPanel").style.display = "block";
    loadAdminUsers();
  } else {
    document.getElementById("adminUserPanel").style.display = "none";
  }
}

// -- Profile edit --
function showProfileEdit() {
  var views = ["authProfileView", "authPwdForm"];
  views.forEach(function(id) { document.getElementById(id).style.display = "none"; });
  document.getElementById("authProfileForm").style.display = "block";
  document.getElementById("authTitle").textContent = state.lang === "zh" ? "✏️ 编辑资料" : "✏️ Edit Profile";
  document.getElementById("profileEditError").style.display = "none";
  
  if (authState.user) {
    var u = authState.user;
    document.getElementById("profileEmail").value = u.email || "";
    document.getElementById("profilePhone").value = u.phone || "";
    document.getElementById("profileAddress").value = u.address || "";
    document.getElementById("profileAge").value = u.age || "";
    document.getElementById("profileGender").value = u.gender || "";
    document.getElementById("profileCountry").value = u.country || "";
    document.getElementById("profileCity").value = u.city || "";
  }
}

function doUpdateProfile() {
  var data = {
    email: document.getElementById("profileEmail").value.trim(),
    phone: document.getElementById("profilePhone").value.trim(),
    address: document.getElementById("profileAddress").value.trim(),
    age: parseInt(document.getElementById("profileAge").value) || null,
    gender: document.getElementById("profileGender").value,
    country: document.getElementById("profileCountry").value.trim(),
    city: document.getElementById("profileCity").value.trim()
  };
  fetch(AUTH_API + "/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + authState.token },
    body: JSON.stringify(data)
  }).then(function(r) { return r.json(); }).then(function(d) {
    if (d.success) {
      authState.user = d.user;
      localStorage.setItem("bible_auth", JSON.stringify({ token: authState.token, user: d.user }));
      showProfileView();
    } else {
      document.getElementById("profileEditError").style.display = "block";
      document.getElementById("profileEditError").textContent = d.message || "更新失败";
    }
  }).catch(function() {
    document.getElementById("profileEditError").style.display = "block";
    document.getElementById("profileEditError").textContent = "网络错误";
  });
}

// -- Password change --
function showPasswordChange() {
  var views = ["authProfileView", "authProfileForm"];
  views.forEach(function(id) { document.getElementById(id).style.display = "none"; });
  document.getElementById("authPwdForm").style.display = "block";
  document.getElementById("authTitle").textContent = state.lang === "zh" ? "🔒 修改密码" : "🔒 Change Password";
  document.getElementById("pwdError").style.display = "none";
  document.getElementById("pwdOld").value = "";
  document.getElementById("pwdNew").value = "";
  document.getElementById("pwdConfirm").value = "";
}

function doChangePassword() {
  var oldPwd = document.getElementById("pwdOld").value;
  var newPwd = document.getElementById("pwdNew").value;
  var confirm = document.getElementById("pwdConfirm").value;
  if (!oldPwd || !newPwd) {
    document.getElementById("pwdError").style.display = "block";
    document.getElementById("pwdError").textContent = "请填写所有密码字段";
    return;
  }
  if (newPwd.length < 3) {
    document.getElementById("pwdError").style.display = "block";
    document.getElementById("pwdError").textContent = "新密码至少3字符";
    return;
  }
  if (newPwd !== confirm) {
    document.getElementById("pwdError").style.display = "block";
    document.getElementById("pwdError").textContent = "两次输入的新密码不一致";
    return;
  }
  fetch(AUTH_API + "/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + authState.token },
    body: JSON.stringify({ oldPassword: oldPwd, newPassword: newPwd })
  }).then(function(r) { return r.json(); }).then(function(d) {
    if (d.success) {
      showProfileView();
      alert(state.lang === "zh" ? "密码修改成功" : "Password changed successfully");
    } else {
      document.getElementById("pwdError").style.display = "block";
      document.getElementById("pwdError").textContent = d.message || "修改失败";
    }
  }).catch(function() {
    document.getElementById("pwdError").style.display = "block";
    document.getElementById("pwdError").textContent = "网络错误";
  });
}

// -- Forgot password --
function doForgotPassword() {
  var username = document.getElementById("forgotUsername").value.trim();
  if (!username) {
    document.getElementById("forgotMsg").style.display = "block";
    document.getElementById("forgotMsg").textContent = "请输入用户名";
    return;
  }
  fetch(AUTH_API + "/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: username })
  }).then(function(r) { return r.json(); }).then(function(d) {
    if (d.success) {
      document.getElementById("forgotResult").style.display = "block";
      document.getElementById("forgotResult").innerHTML = 
        (state.lang === "zh" ? "密码已重置<br>新密码: <strong>" : "Password reset<br>New password: <strong>") 
        + d.newPassword + "</strong><br><small>" + (state.lang === "zh" ? "请登录后修改密码" : "Please login and change it") + "</small>";
      document.getElementById("forgotMsg").style.display = "none";
    } else {
      document.getElementById("forgotMsg").style.display = "block";
      document.getElementById("forgotMsg").textContent = d.message || "重置失败";
    }
  }).catch(function() {
    document.getElementById("forgotMsg").style.display = "block";
    document.getElementById("forgotMsg").textContent = "网络错误";
  });
}

function doLogin() {
  var username = document.getElementById("loginUsername").value.trim();
  var password = document.getElementById("loginPassword").value;
  if (!username || !password) {
    document.getElementById("authError").style.display = "block";
    document.getElementById("authError").textContent = state.lang === "zh" ? "请填写用户名和密码" : "Please enter username and password";
    return;
  }
  fetch(AUTH_API + "/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: username, password: password })
  }).then(function(r) { return r.json(); }).then(function(d) {
    if (d.success) {
      authState.loggedIn = true;
      authState.user = d.user;
      authState.token = d.token;
      localStorage.setItem("bible_auth", JSON.stringify({ token: d.token, user: d.user }));
      updateLoginButton();
      closeAuthPanel();
      if (d.user.role === "ADMIN") showAdminFeatures();
    } else {
      document.getElementById("authError").style.display = "block";
      document.getElementById("authError").textContent = d.message || (state.lang === "zh" ? "登录失败" : "Login failed");
    }
  }).catch(function() {
    document.getElementById("authError").style.display = "block";
    document.getElementById("authError").textContent = state.lang === "zh" ? "网络错误，请检查服务是否运行" : "Network error, check services";
  });
}

// -- Captcha
function loadCaptcha() {
  fetch(AUTH_API + "/captcha")
    .then(function(r) { return r.json(); })
    .then(function(d) {
      if (d.success) {
        document.getElementById("captchaQuestion").textContent = d.question;
        document.getElementById("regCaptchaToken").value = d.token;
        document.getElementById("regCaptchaAnswer").value = "";
      }
    }).catch(function() {
      document.getElementById("captchaQuestion").textContent = "加载失败";
    });
}

function doRegister() {
  var username = document.getElementById("regUsername").value.trim();
  var password = document.getElementById("regPassword").value;
  var captchaToken = document.getElementById("regCaptchaToken").value;
  var captchaAnswer = parseInt(document.getElementById("regCaptchaAnswer").value) || 0;
  if (!username || !password) {
    document.getElementById("regError").style.display = "block";
    document.getElementById("regError").textContent = state.lang === "zh" ? "请填写用户名和密码" : "Please enter username and password";
    return;
  }
  if (!captchaToken || !captchaAnswer) {
    document.getElementById("regError").style.display = "block";
    document.getElementById("regError").textContent = state.lang === "zh" ? "请先加载并填写验证码" : "Please load and enter the captcha";
    return;
  }
  if (username.length < 2 || password.length < 3) {
    document.getElementById("regError").style.display = "block";
    document.getElementById("regError").textContent = state.lang === "zh" ? "用户名至少2字符，密码至少3字符" : "Username min 2 chars, password min 3 chars";
    return;
  }
  fetch(AUTH_API + "/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: username, password: password, captchaToken: captchaToken, captchaAnswer: captchaAnswer })
  }).then(function(r) { return r.json(); }).then(function(d) {
    if (d.success) {
      authState.loggedIn = true;
      authState.user = d.user;
      authState.token = d.token;
      localStorage.setItem("bible_auth", JSON.stringify({ token: d.token, user: d.user }));
      updateLoginButton();
      closeAuthPanel();
    } else {
      document.getElementById("regError").style.display = "block";
      document.getElementById("regError").textContent = d.message || (state.lang === "zh" ? "注册失败" : "Registration failed");
      loadCaptcha();
    }
  }).catch(function() {
    document.getElementById("regError").style.display = "block";
    document.getElementById("regError").textContent = state.lang === "zh" ? "网络错误，请检查服务是否运行" : "Network error, check services";
  });
}

function doLogout() {
  authState.loggedIn = false;
  authState.user = null;
  authState.token = null;
  localStorage.removeItem("bible_auth");
  updateLoginButton();
  hideAdminFeatures();
  closeAuthPanel();
}

// Auto-check admin on successful login
function showAdminFeatures() {}
function hideAdminFeatures() {}
function updateLoginButton() {
  var btn = document.getElementById("topbarLoginBtn");
  if (!btn) return;
  var loggedIn = authState.loggedIn && authState.user;
  var isAdmin = loggedIn && authState.user.role === "ADMIN";
  if (loggedIn) {
    btn.textContent = "👤 " + authState.user.username;
    btn.className = "logged-in";
  } else {
    var zh = "👤 登录", en = "👤 Login";
    if (state.lang === 'zh') btn.textContent = zh;
    else if (state.lang === 'bilingual') btn.textContent = zh + ' / ' + en;
    else btn.textContent = en;
    btn.className = "";
  }
  // Toggle bookmark/note topbar buttons
  var bmBtn = document.getElementById("bookmarksBtn");
  var ntBtn = document.getElementById("notesBtn");
  if (bmBtn) bmBtn.style.display = loggedIn ? "inline-block" : "none";
  if (ntBtn) ntBtn.style.display = loggedIn ? "inline-block" : "none";
  // Module + admin buttons: admin-only
  var modBtn = document.getElementById("topbarModulesBtn");
  var adBtn = document.getElementById("topbarAdminBtn");
  if (modBtn) modBtn.style.display = isAdmin ? "inline-block" : "none";
  if (adBtn) adBtn.style.display = isAdmin ? "inline-block" : "none";
}

// -- Admin user management --
function loadAdminUsers() {
  fetch(AUTH_API + "/admin/users", {
    headers: { "Authorization": "Bearer " + authState.token }
  }).then(function(r) { return r.json(); }).then(function(d) {
    if (d.success) {
      renderAdminUsers(d.users || []);
    }
  }).catch(function() {});
}

function renderAdminUsers(users) {
  var container = document.getElementById("adminUserList");
  if (!container) return;
  var h = "";
  users.forEach(function(u) {
    var roleLabel = u.role === "ADMIN" ? (state.lang === "zh" ? "管理员" : "Admin") : (state.lang === "zh" ? "用户" : "User");
    var roleBadgeClass = u.role === "ADMIN" ? "admin-role-admin" : "admin-role-user";
    var enabledClass = u.enabled === false ? " style=\"opacity:0.5\"" : "";
    h += "<div class=\"admin-user-row\"" + enabledClass + ">";
    h += "<div class=\"admin-user-info\">";
    h += "<span class=\"admin-user-name\">" + u.username + "</span>";
    h += "<span class=\"admin-role-badge " + roleBadgeClass + "\">" + roleLabel + "</span>";
    if (u.enabled === false) h += "<span style=\"color:red;font-size:0.7rem;margin-left:4px\">" + (state.lang === "zh" ? "已禁用" : "Disabled") + "</span>";
    h += "</div>";
    if (u.id !== authState.user.id) {
      h += "<div class=\"admin-user-actions\">";
      h += "<button onclick=\"doChangeRole(" + u.id + ", '" + u.role + "')\" class=\"admin-role-toggle\">" + (u.role === "ADMIN" ? (state.lang === "zh" ? "↓ 降为普通用户" : "↓ Demote") : (state.lang === "zh" ? "↑ 提升为管理员" : "↑ Promote")) + "</button>";
      h += "<button onclick=\"doToggleUser(" + u.id + ")\" class=\"admin-role-toggle\">" + (u.enabled !== false ? (state.lang === "zh" ? "禁用" : "Disable") : (state.lang === "zh" ? "启用" : "Enable")) + "</button>";
      h += "<button onclick=\"doAdminResetPwd(" + u.id + ", '" + u.username.replace(/'/g, "\\'") + "')\" class=\"admin-role-toggle\">" + (state.lang === "zh" ? "重置密码" : "Reset Pwd") + "</button>";
      h += "</div>";
    }
    h += "</div>";
  });
  container.innerHTML = h || ("<div style=\"padding:12px;color:var(--muted)\">" + (state.lang === "zh" ? "暂无用户" : "No users") + "</div>");
}

function doCreateUser() {
  var username = document.getElementById("adminNewUsername").value.trim();
  var password = document.getElementById("adminNewPassword").value;
  if (!username || !password) {
    document.getElementById("adminCreateError").style.display = "block";
    document.getElementById("adminCreateError").textContent = state.lang === "zh" ? "请填写用户名和密码" : "Enter username and password";
    return;
  }
  fetch(AUTH_API + "/admin/users", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + authState.token },
    body: JSON.stringify({ username: username, password: password, role: document.getElementById("adminNewRole").value })
  }).then(function(r) { return r.json(); }).then(function(d) {
    if (d.success) {
      document.getElementById("adminNewUsername").value = "";
      document.getElementById("adminNewPassword").value = "";
      document.getElementById("adminCreateError").style.display = "none";
      loadAdminUsers();
    } else {
      document.getElementById("adminCreateError").style.display = "block";
      document.getElementById("adminCreateError").textContent = d.message || (state.lang === "zh" ? "创建失败" : "Failed");
    }
  }).catch(function() {
    document.getElementById("adminCreateError").style.display = "block";
    document.getElementById("adminCreateError").textContent = state.lang === "zh" ? "网络错误" : "Network error";
  });
}

function doChangeRole(id, currentRole) {
  var newRole = currentRole === "ADMIN" ? "USER" : "ADMIN";
  fetch(AUTH_API + "/admin/users/" + id + "/role", {
    method: "PUT",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + authState.token },
    body: JSON.stringify({ role: newRole })
  }).then(function(r) { return r.json(); }).then(function(d) {
    if (d.success) loadAdminUsers();
    else alert(d.message || "Failed");
  }).catch(function() {});
}

function doToggleUser(id) {
  fetch(AUTH_API + "/admin/users/" + id + "/toggle", {
    method: "POST",
    headers: { "Authorization": "Bearer " + authState.token }
  }).then(function(r) { return r.json(); }).then(function(d) {
    if (d.success) loadAdminUsers();
    else alert(d.message || "Failed");
  }).catch(function() {});
}

function doAdminResetPwd(id, username) {
  if (!confirm((state.lang === "zh" ? "确定重置用户 " : "Reset password for ") + username + "?")) return;
  fetch(AUTH_API + "/admin/users/" + id + "/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + authState.token },
    body: JSON.stringify({ newPassword: "reset123" })
  }).then(function(r) { return r.json(); }).then(function(d) {
    if (d.success) alert((state.lang === "zh" ? "新密码: " : "New password: ") + d.newPassword);
    else alert(d.message || "Failed");
  }).catch(function() {});
}



// ═══════════════════════════════════════════
//  Reading Plan (读经计划) - Desktop
// ═══════════════════════════════════════════
var dplanState = {
  plans: [],
  currentPlan: null,
  currentDay: 1,
  selectedDay: 1,
  todayReading: null,
  progress: {}
};

var DPLAN_NAMES_ZH = {
  mcheyne: "麦切恩一年读经计划",
  nt90: "90天新约读经计划",
  proverbs30: "30天箴言计划"
};

// Translate reading plan label to bilingual
function translatePlanLabelD(r) {
  var book = findBookByOsis(r.bookId);
  if (!book) return r.label;
  var chPart = r.chapterStart === r.chapterEnd ? String(r.chapterStart) : r.chapterStart + '-' + r.chapterEnd;
  var zh = book.nameZh + ' ' + chPart;
  var en = book.name + ' ' + chPart;
  if (state.lang === 'zh') return zh;
  if (state.lang === 'bilingual') return zh + ' / ' + en;
  return en;
}

function openPlanPanel() {
  document.getElementById("planOverlay").style.display = "flex";
  if (!dplanState.plans.length) {
    fetch("/api/v1/reading-plans").then(r => r.json()).then(data => {
      dplanState.plans = data;
      var saved = localStorage.getItem("dplan_code");
      if (saved && data.some(p => p.planCode === saved)) {
        dplanState.currentPlan = saved;
      } else {
        dplanState.currentPlan = data[0].planCode;
      }
      renderPlanSelector();
      loadDesktopPlanProgress();
    }).catch(() => {
      document.getElementById("planTodayCard").innerHTML = "<p>" + (t('planFailedLoad')||'Failed to load plans') + "</p>";
    });
  } else {
    renderPlanSelector();
    renderDesktopPlanView();
  }
}

function closePlanPanel() {
  document.getElementById("planOverlay").style.display = "none";
}

function renderPlanSelector() {
  var sel = document.getElementById("planSelect");
  sel.innerHTML = dplanState.plans.map(p => {
    var name = state.lang === "zh" ? (DPLAN_NAMES_ZH[p.planCode] || p.planName) : p.planName;
    return '<option value="' + p.planCode + '"' + (p.planCode === dplanState.currentPlan ? " selected" : "") + ">" + name + " (" + p.numberOfDays + " days)</option>";
  }).join("");
}

function switchDesktopPlan(code) {
  dplanState.currentPlan = code;
  dplanState.selectedDay = 1;
  localStorage.setItem("dplan_code", code);
  loadDesktopPlanProgress();
}

function loadDesktopPlanProgress() {
  var token = authState.token;
  if (token) {
    fetch("/api/v1/reading-plans/" + dplanState.currentPlan + "/progress", {
      headers: { "Authorization": "Bearer " + token }
    }).then(r => { if (r.ok) return r.json(); throw 0; }).then(data => {
      dplanState.progress = {};
      (data.progress || []).forEach(p => {
        dplanState.progress[p.day] = { readCount: p.readCount, completed: p.completed };
      });
      dplanState.currentDay = data.currentDay || 1;
      dplanState.selectedDay = dplanState.currentDay;
      renderDesktopPlanView();
    }).catch(() => loadDesktopPlanLocal());
  } else {
    loadDesktopPlanLocal();
  }
}

function loadDesktopPlanLocal() {
  var saved = localStorage.getItem("dplan_progress_" + dplanState.currentPlan);
  dplanState.progress = saved ? JSON.parse(saved) : {};
  fetch("/api/v1/reading-plans/" + dplanState.currentPlan + "/today").then(r => r.json()).then(data => {
    dplanState.currentDay = data.day || 1;
    dplanState.selectedDay = dplanState.currentDay;
    renderDesktopPlanView();
  }).catch(() => renderDesktopPlanView());
}

function renderDesktopPlanView() {
  loadDesktopPlanDay(dplanState.selectedDay);
  renderDesktopCalendar();
}

function loadDesktopPlanDay(day) {
  dplanState.selectedDay = day;
  document.getElementById("planDayDisplay").textContent = (state.lang === "zh" ? "第 " + day + " 天" : (state.lang === "bilingual" ? "第 " + day + " 天 / Day " + day : "Day " + day));
  fetch("/api/v1/reading-plans/" + dplanState.currentPlan + "/day/" + day).then(r => r.json()).then(data => {
    dplanState.todayReading = data;
    var isDone = dplanState.progress[day] && dplanState.progress[day].completed;
    var dayLabel = (state.lang === "zh" ? "第 " + day + " 天" : (state.lang === "bilingual" ? "第 " + day + " 天 / Day " + day : "Day " + day));
    var html = '<div style="margin-bottom:8px;font-size:1.1em;font-weight:600">' + dayLabel + '</div>';
    data.readings.forEach((r, i) => {
      var done = dplanState.progress[day] && dplanState.progress[day].readCount > i;
      var label = translatePlanLabelD(r);
      html += '<div class="plan-reading-item-d' + (done ? " done" : "") + '" onclick="goToDesktopReading(\'' + r.bookId + '\',' + r.chapterStart + ',' + i + ',' + day + ')" style="display:flex;align-items:center;gap:8px;padding:8px 12px;cursor:pointer;border-radius:6px;margin-bottom:4px;background:var(--bg-input,#14161e)">';
      html += '<span style="font-size:1.2em;color:var(--accent,#4a9eff)">' + (done ? "✓" : "○") + "</span>";
      html += '<span style="flex:1">' + label + "</span>";
      html += '<span style="font-size:0.85em;color:var(--muted,#888)">📖 →</span>';
      html += "</div>";
    });
    var markText = isDone ? (state.lang === "zh" ? "✓ 已完成" : (state.lang === "bilingual" ? "✓ 已完成 / Completed" : "✓ Completed")) : (state.lang === "zh" ? "✓ 标记完成" : (state.lang === "bilingual" ? "✓ 标记完成 / Mark Complete" : "✓ Mark Complete"));
    html += '<div style="text-align:center;margin-top:12px"><button onclick="toggleDesktopPlanComplete()" style="padding:8px 20px;font-weight:600;background:' + (isDone ? "#2d8a4e" : "#4a9eff") + ';color:#fff;border:none;border-radius:6px;cursor:pointer">' + markText + "</button></div>";
    document.getElementById("planTodayCard").innerHTML = html;
    
    // Progress bar
    var completed = 0, total = 0;
    var plan = dplanState.plans.find(p => p.planCode === dplanState.currentPlan);
    if (plan) {
      total = plan.numberOfDays;
      for (var d = 1; d <= total; d++) if (dplanState.progress[d] && dplanState.progress[d].completed) completed++;
    }
    var pct = total > 0 ? Math.round(completed / total * 100) : 0;
    document.getElementById("planProgressBar").innerHTML = 
      '<div style="position:relative;height:28px;background:var(--bg-card,#1a1d28);border-radius:14px;overflow:hidden;border:1px solid var(--border,#2a2d3a)">' +
      '<div style="position:absolute;left:0;top:0;height:100%;width:' + pct + '%;background:linear-gradient(90deg,#4a9eff,#6ab4ff);transition:width .3s"></div>' +
      '<span style="position:absolute;width:100%;text-align:center;line-height:28px;font-size:13px;font-weight:600;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.5)">' + completed + "/" + total + " (" + pct + "%)</span>" +
      "</div>";
  });
}

// OSIS short name -> BOOK_ORDER id mapping (for reading plan links)
var OSIS_TO_ID = {
  'Gen':'GEN','Exod':'EXO','Lev':'LEV','Num':'NUM','Deut':'DEU',
  'Josh':'JOS','Judg':'JDG','Ruth':'RUT',
  '1Sam':'1SA','2Sam':'2SA','1Kgs':'1KI','2Kgs':'2KI',
  '1Chr':'1CH','2Chr':'2CH','Ezra':'EZR','Neh':'NEH','Est':'EST',
  'Job':'JOB','Psa':'PSA','Prov':'PRO','Eccl':'ECC','Song':'SNG',
  'Isa':'ISA','Jer':'JER','Lam':'LAM','Ezek':'EZK','Dan':'DAN',
  'Hos':'HOS','Joel':'JOL','Amos':'AMO','Obad':'OBA','Jonah':'JON',
  'Mic':'MIC','Nah':'NAM','Hab':'HAB','Zeph':'ZEP','Hag':'HAG','Zech':'ZEC','Mal':'MAL',
  'Matt':'MAT','Mat':'MAT','Mark':'MRK','Luke':'LUK','John':'JHN',
  'Acts':'ACT','Rom':'ROM',
  '1Cor':'1CO','2Cor':'2CO','Gal':'GAL','Eph':'EPH',
  'Phil':'PHP','Col':'COL',
  '1Thes':'1TH','2Thes':'2TH','1Tim':'1TI','2Tim':'2TI',
  'Titus':'TIT','Phlm':'PHM','Heb':'HEB','Jas':'JAS',
  '1Pet':'1PE','2Pet':'2PE','1John':'1JN','2John':'2JN','3John':'3JN','Jude':'JUD',
  'Rev':'REV'
};

function findBookByOsis(osisId) {
  var mappedId = OSIS_TO_ID[osisId];
  if (mappedId) return BOOK_ORDER.find(b => b.id === mappedId);
  return BOOK_ORDER.find(b => b.id === osisId || b.id === osisId.toUpperCase());
}

function goToDesktopReading(bookId, chStart, readingIdx, day) {
  if (!dplanState.progress[day]) dplanState.progress[day] = { readCount: 0, completed: false };
  if (dplanState.progress[day].readCount <= readingIdx) dplanState.progress[day].readCount = readingIdx + 1;
  saveDesktopPlanProgress();
  // Navigate to chapter
  var book = findBookByOsis(bookId);
  if (book) {
    state.currentBook = book;
    state.currentChapter = chStart;
    loadChapter();
    closePlanPanel();
  }
  loadDesktopPlanDay(day);
}

function toggleDesktopPlanComplete() {
  var day = dplanState.selectedDay;
  if (!dplanState.progress[day]) dplanState.progress[day] = { readCount: 0, completed: false };
  dplanState.progress[day].completed = !dplanState.progress[day].completed;
  if (dplanState.progress[day].completed && dplanState.todayReading) {
    dplanState.progress[day].readCount = dplanState.todayReading.readings.length;
  }
  saveDesktopPlanProgress();
  loadDesktopPlanDay(day);
  renderDesktopCalendar();
}

function changeDesktopPlanDay(delta) {
  var plan = dplanState.plans.find(p => p.planCode === dplanState.currentPlan);
  if (!plan) return;
  var newDay = dplanState.selectedDay + delta;
  if (newDay < 1) newDay = 1;
  if (newDay > plan.numberOfDays) newDay = plan.numberOfDays;
  loadDesktopPlanDay(newDay);
  renderDesktopCalendar();
}

function goToDesktopToday() {
  loadDesktopPlanDay(dplanState.currentDay);
  renderDesktopCalendar();
}

function renderDesktopCalendar() {
  var plan = dplanState.plans.find(p => p.planCode === dplanState.currentPlan);
  if (!plan) return;
  var cols = plan.numberOfDays > 100 ? 15 : (plan.numberOfDays > 30 ? 10 : 7);
  var html = '<div style="display:grid;gap:3px;grid-template-columns:repeat(' + cols + ',1fr)">';
  for (var d = 1; d <= plan.numberOfDays; d++) {
    var isDone = dplanState.progress[d] && dplanState.progress[d].completed;
    var isToday = d === dplanState.currentDay;
    var isSelected = d === dplanState.selectedDay;
    var bg = "var(--bg-card,#1a1d28)", color = "var(--muted,#888)", border = "none";
    if (isDone) { bg = "#2d8a4e"; color = "#fff"; }
    if (isToday) border = "2px solid #4a9eff";
    if (isSelected && !isDone) { bg = "#4a9eff"; color = "#fff"; }
    html += '<div onclick="loadDesktopPlanDay(' + d + ');renderDesktopCalendar()" style="aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-size:11px;cursor:pointer;border-radius:4px;background:' + bg + ";color:" + color + ";border:" + border + '">' + d + "</div>";
  }
  html += "</div>";
  document.getElementById("planCalendarDesktop").innerHTML = html;
}

function saveDesktopPlanProgress() {
  if (authState.token) {
    var day = dplanState.selectedDay;
    var p = dplanState.progress[day] || { readCount: 0, completed: false };
    fetch("/api/v1/reading-plans/" + dplanState.currentPlan + "/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + authState.token },
      body: JSON.stringify({ planCode: dplanState.currentPlan, day: day, readCount: p.readCount, completed: p.completed })
    }).catch(() => {});
  } else {
    localStorage.setItem("dplan_progress_" + dplanState.currentPlan, JSON.stringify(dplanState.progress));
  }
}

// ── Topbar Dropdown ──
function closeTopbarDropdown() {
  var dd = document.getElementById('moreDropdown');
  if (dd) dd.style.display = 'none';
}
(function initTopbarDropdown() {
  document.addEventListener('DOMContentLoaded', function() {
    var btn = document.getElementById('moreMenuBtn');
    var dd = document.getElementById('moreDropdown');
    if (!btn || !dd) return;
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
    });
    document.addEventListener('click', function(e) {
      if (!dd.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
        dd.style.display = 'none';
      }
    });
  });
})();
