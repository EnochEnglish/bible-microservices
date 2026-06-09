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
  "chiun": "ChiUn"
};
function isSwordTranslation(tid) { return tid in SWORD_MODULE_MAP; }

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
  Wesley: "Wesley 注释"
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
  Wesley: "Wesley's Notes"
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
    morphUnknown: "No description available for this code"
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
    morphUnknown: "此编码暂无中文说明"
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
  if (key === "readChapter" || key === "verseClickHint") return (zh || "") + " / " + (en || "");
  if (key === "commentary" || key === "oldTestament" || key === "newTestament" || key === "compareMode" || key === "compareOff") return zh || en;
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

function apiGet(path) {
  return fetch(API + path).then(function(r) {
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
    // Refresh dictionary popup if open
    if (document.getElementById("dictOverlay").style.display === "flex") {
      document.getElementById("dictPopupTitle").textContent = "📚 " + t("dictTitle");
      loadDictSources();
    }
  };
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
      // Normalize sword response to text-service format
      var verses = (data.verses || []).map(function(v) {
        return { chapter: v.chapter, verse: v.verse, text: v.text };
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
    if (state.interlinear && isSwordTranslation(state.currentTranslation)) {
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
  if (state.interlinear && state.interlinearData && isSwordTranslation(state.currentTranslation)) {
    renderInterlinear();
    return;
  }
  // Interlinear pending: show loading while waiting for sword data
  if (state.interlinear && isSwordTranslation(state.currentTranslation) && !state.interlinearData) {
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
    verses.forEach(function(v) {
      html += '<div class="verse">' +
        '<span class="verse-num tts-btn" onclick="speakVerse(' + v.verse + ')" title="' + t("verseClickHint") + '">' + v.verse + '</span>' +
        '<span class="verse-text">' + makeWordsClickable(v.text || "") + '</span>' +
      '</div>';
    });
    container.innerHTML = html;
    container.classList.remove("loading");
  }

  // Attach click handlers for Strong's
  container.querySelectorAll(".verse-word").forEach(function(el) {
    el.addEventListener("click", function() {
      var word = el.textContent.trim();
      if (word) searchStrongs(word);
    });
  });
}

function makeWordsClickable(text) {
  return text.replace(/([a-zA-ZΑ-ω]{3,})/g, '<span class="verse-word">$1</span>');
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
  return fetch("/api/v1/sword/" + mod + "/passage/" + key)
    .then(function(r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function(data) {
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
  fetch(API_BASE + "/sword/" + mod + "/dict/" + sn)
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
  // Try local MORPH_QUICK table
  if (MORPH_QUICK[morph]) {
    var desc = MORPH_QUICK[morph];
    var html = '<div class="st-head">' + escHtml(morph) + '</div><div class="st-def">' + escHtml(desc) + '</div>';
    morphCache[morph] = html;
    showStrongsTooltip(event, html);
    return;
  }
  // Fetch from sword-service
  var eve = event;
  fetch(API_BASE + "/sword/OSHB/dict/" + morph)
    .then(function(r) { return r.json(); })
    .then(function(d) {
      if (d && d.found && d.content) {
        var h = parseStrongsContent(d.content, 'H');
        morphCache[morph] = h;
        showStrongsTooltip(eve, h);
      } else { morphCache[morph] = null; }
    })
    .catch(function() { morphCache[morph] = null; });
}

// ── Interlinear Rendering (word-by-word with Strong's links) ──
// Check if a strongs-like code is actually a morphology code
function isMorphCode(code) {
  if (!code) return false;
  code = code.toUpperCase();
  var m = code.match(/^([HG])(\d+)$/);
  if (!m) return false;
  var num = parseInt(m[2], 10);
  // Hebrew morphology: H8685-H8999, Greek morphology: G5000-G5999
  if (m[1] === 'H' && num >= 8685) return true;
  if (m[1] === 'G' && num >= 5000) return true;
  return false;
}

function renderInterlinear() {
  var ctx = document.getElementById("verseContent");
  if (!state.interlinearData || !state.interlinearData.verses) {
    ctx.innerHTML = '<div class="loading">' + t("loading") + '</div>';
    return;
  }

  var bookId = state.currentBook.id.toLowerCase();
  var html = "";

  state.interlinearData.verses.forEach(function(v) {
    if (v.verse === 0) return; // skip chapter headings
    if (!v.words || !v.words.length) return;

    html += '<div class="interlinear-verse">';
    html += '<span class="verse-num">' + v.verse + '</span> ';

    // Rebuild word list: separate Strong's numbers from morphology codes
    v.words.forEach(function(w) {
      var strongsList = (w.strongs || "").split("+").filter(Boolean);
      var morph = w.morph || "";
      var morphClean = morph.replace(/^robinson:/i, "").replace(/^[TVPM]/, "").trim();

      // Separate real Strong's numbers from morphology codes mixed in strongs field
      var realStrongs = [];
      var morphTags = [];
      strongsList.forEach(function(sn) {
        if (isMorphCode(sn)) {
          morphTags.push(sn);
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
      html += escHtml(w.text);
      if (realStrongs.length > 0) {
        html += ' <sub class="il-strongs">';
        realStrongs.forEach(function(sn, si) {
          if (si > 0) html += ' ';
          html += '<a class="il-strongs-link" data-strongs="' + escHtml(sn) + '">' + escHtml(sn) + '</a>';
        });
        html += '</sub>';
      }
      // Show morphology codes (from both strongs field and morph field)
      var allMorph = morphTags.concat(morph ? [morph] : []);
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

  // Morph links: click opens morph help; hover shows tooltip (300ms debounce)
  ctx.querySelectorAll(".il-morph").forEach(function(el) {
    el.addEventListener("click", function(e) {
      e.stopPropagation();
      var morph = el.getAttribute("data-morph");
      if (morph) showMorphHelp(morph);
    });
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
}

function renderChapterHeader() {
  var hdrEl = document.getElementById("chapterHeader");
  var label = bookLabel(state.currentBook);
  var isSword = isSwordTranslation(state.currentTranslation);
  var ilBtn = isSword
    ? '<button id="btnInterlinear" class="il-btn' + (state.interlinear ? ' active' : '') + '" title="' + t("interlinearTip") + '">' + t("interlinearBtn") + '</button>'
    : '';
  hdrEl.innerHTML = '<span class="book-name">' + label + '</span>' +
    '<span class="chapter-num">' + t("chapterNum") + ' ' + state.currentChapter + ' 章</span>' + ilBtn;
  if (isSword) {
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
    renderCommentaryTabs();
    renderCommentaryBody();
  }).catch(function() {
    state.commentaries = null;
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

  if (!sources.length) {
    sources = [
      { id: "TSK", name: cmtName("TSK") },
      { id: "JFB", name: cmtName("JFB") },
      { id: "MHCC", name: cmtName("MHCC") }
    ];
  }

  var html = "";
  sources.forEach(function(s) {
    html += '<div class="cmt-tab' + (state.activeCommentary === s.id ? " active" : "") +
      '" data-source="' + s.id + '">' + (cmtName(s.id) || s.name) + '</div>';
  });
  tabsEl.innerHTML = html;

  tabsEl.querySelectorAll(".cmt-tab").forEach(function(tab) {
    tab.addEventListener("click", function() {
      state.activeCommentary = tab.dataset.source;
      renderCommentaryTabs();
      renderCommentaryBody();
    });
  });
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
    var html = "";
    filtered.forEach(function(c) {
      var ref = (c.bookId || "") + " " + (c.chapter || "") + ":" + (c.verseStart || "");
      if (c.verseEnd && c.verseEnd !== c.verseStart) ref += "-" + c.verseEnd;
      html += '<div class="tsk-item"><div class="tsk-ref">📌 ' + ref + '</div><div>' + (c.text || "") + '</div></div>';
    });
    body.innerHTML = html;
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

function doSearch(query) {
  if (!query) return;
  state.view = "search";
  state._lastQuery = query;
  var ctx = document.getElementById("searchResults");
  ctx.style.display = "block";
  document.getElementById("readerView").style.display = "none";
  ctx.innerHTML = '<div class="loading">' + t("searching") + '</div>';

  apiGet("/search?query=" + encodeURIComponent(query) + "&translation=" + state.currentTranslation + "&size=30").then(function(data) {
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
  setupLanguage();
  refreshLabels();
  setupDictPopup();
  initTTS();
  loadTranslations().then(function() {
    return loadBooks();
  }).then(function() {
    renderBookList();
    renderChapterGrid();
    renderCommentaryTabs();
    loadChapter();
    setupSearch();
  });
});