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
  commentaries: null,
  activeCommentary: "TSK"
};

// ── Translation Names (Chinese) ──
var TRANSLATION_NAMES = {
  kjv: "英王钦定本", web: "世界英文圣经", asv: "美国标准版",
  bbe: "基础英文圣经", dby: "达秘译本", wbt: "韦氏译本",
  ylt: "杨氏直译本", cuv_gb: "和合本 (简体)", cuv_tw: "和合本 (繁体)",
  lxx: "七十士译本", byz: "拜占庭希腊文新约", vulgate: "武加大译本",
  oshb: "希伯来文圣经"
};

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
    commentary: "注释",
    noCommentary: "No commentary for this chapter",
    oldTestament: "Old Testament",
    newTestament: "New Testament",
    previous: "← Prev",
    next: "Next →",
    compareMode: "多版本对照",
    compareOff: "关闭对照",
    selectVersions: "选择对照版本...",
    strongsPlaceholder: "Strong's...",
    strongsTitle: "Strong's Dictionary",
    strongsSearching: "Searching...",
    strongsNoResult: "No Strong's entry found",
    strongsHebrew: "希伯来文",
    strongsGreek: "希腊文",
    chapterNum: "Chapter",
    searchEmpty: "输入关键词搜索经文"
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
    searchEmpty: "输入关键词搜索经文"
  }
};

function t(key) {
  if (state.lang === "zh") return I18N.zh[key] || I18N.en[key];
  if (state.lang === "bilingual") {
    // For bilingual, prefer Chinese for section labels, English for UI
    var zh = I18N.zh[key];
    var en = I18N.en[key];
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
var API = "http://localhost:8080/api/v1";

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
    renderTranslationSelector();
    renderCompareSelector();
  }).catch(function() {
    setTimeout(loadTranslations, 3000);
  });
}

function renderTranslationSelector() {
  var sel = document.getElementById("translationSelect");
  var html = "";
  state.translations.forEach(function(t) {
    var label = transLabel(t);
    html += '<option value="' + t.id + '"' + (t.id === state.currentTranslation ? " selected" : "") + '>' + label + '</option>';
  });
  sel.innerHTML = html;
  sel.onchange = function(e) {
    state.currentTranslation = e.target.value;
    state.compareTranslations = [];
    state.compareData = {};
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
      renderCompareSelector();
      renderCommentaryTabs();
      renderCommentaryBody();
    }
    if (state.view === "search") {
      renderSearchResults(state._lastQuery || "");
    }
    refreshLabels();
  };
}

function refreshLabels() {
  document.getElementById("searchBox").placeholder = t("search");
  var si = document.getElementById("strongsInput");
  if (si) si.placeholder = t("strongsPlaceholder");
}

// ═══════════════════════════════════════════
//  BOOKS
// ═══════════════════════════════════════════
function loadBooks() {
  return apiGet("/bible/" + state.currentTranslation + "/books").then(function(data) {
    if (data.books) state.books = data.books;
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
  state.view = "reader";
  document.getElementById("verseContent").innerHTML = '<div class="loading">' + t("loading") + '</div>';
  document.getElementById("searchResults").style.display = "none";
  document.getElementById("readerView").style.display = "block";
  document.getElementById("searchBox").value = "";

  var bookId = state.currentBook.id.toLowerCase();
  var url = "/bible/" + state.currentTranslation + "/" + bookId + "/" + state.currentChapter;

  apiGet(url).then(function(data) {
    state.verses = data;
    renderChapterHeader();
    renderVerses();
    renderChapterNav();
    // Reload all compare versions
    if (state.compareTranslations.length) loadAllCompare();
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
        '<span class="verse-num">' + v.verse + '</span>' +
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

function renderChapterHeader() {
  var hdrEl = document.getElementById("chapterHeader");
  var label = bookLabel(state.currentBook);
  hdrEl.innerHTML = '<span class="book-name">' + label + '</span>' +
    '<span class="chapter-num">' + t("chapterNum") + ' ' + state.currentChapter + ' 章</span>';
}

function renderChapterNav() {
  var el = document.getElementById("chapterNav");
  var hasPrev = state.currentChapter > 1;
  var hasNext = state.currentChapter < state.currentBook.chapters;

  el.innerHTML =
    (hasPrev ? '<button id="btnPrev">' + t("previous") + '</button>' : '<span></span>') +
    '<span class="nav-info">' + state.currentChapter + ' / ' + state.currentBook.chapters + '</span>' +
    (hasNext ? '<button id="btnNext">' + t("next") + '</button>' : '<span></span>');

  var prev = document.getElementById("btnPrev");
  var next = document.getElementById("btnNext");
  if (prev) prev.addEventListener("click", function() { state.currentChapter--; renderChapterGrid(); loadChapter(); });
  if (next) next.addEventListener("click", function() { state.currentChapter++; renderChapterGrid(); loadChapter(); });
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
var COMMENTARY_NAMES = { TSK: "TSK 交叉引用", JFB: "JFB 注释", MHCC: "Matthew Henry 注释" };

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
        sources.push({ id: c.source, name: COMMENTARY_NAMES[c.source] || c.sourceName || c.source });
      }
    });
  }

  if (!sources.length) {
    sources = [
      { id: "TSK", name: "TSK 交叉引用" },
      { id: "JFB", name: "JFB 注释" },
      { id: "MHCC", name: "Matthew Henry 注释" }
    ];
  }

  var html = "";
  sources.forEach(function(s) {
    html += '<div class="cmt-tab' + (state.activeCommentary === s.id ? " active" : "") +
      '" data-source="' + s.id + '">' + (COMMENTARY_NAMES[s.id] || s.name) + '</div>';
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
      html += '<div class="commentary-item"><div class="cmt-source">' + (COMMENTARY_NAMES[c.source] || c.source) + '</div><div class="cmt-text"><p>' + text + '</p></div></div>';
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

// ═══════════════════════════════════════════
//  STRONG'S DICTIONARY
// ═══════════════════════════════════════════
function setupStrongs() {
  var input = document.getElementById("strongsInput");
  if (!input) return;

  input.addEventListener("keydown", function(e) {
    if (e.key === "Enter") { searchStrongs(input.value.trim()); }
  });

  var strongsTimer = null;
  input.addEventListener("input", function() {
    clearTimeout(strongsTimer);
    var q = input.value.trim();
    if (!q) return;
    strongsTimer = setTimeout(function() { searchStrongs(q); }, 500);
  });
}

function searchStrongs(query) {
  if (!query || query.length < 2) return;

  var body = document.getElementById("strongsPopupBody");
  body.innerHTML = '<div class="loading">' + t("strongsSearching") + '</div>';
  document.getElementById("strongsOverlay").style.display = "flex";
  document.getElementById("strongsPopupTitle").textContent = '📖 ' + t("strongsTitle") + ': ' + query;

  var upper = query.toUpperCase();
  var prefix = upper.charAt(0);
  if ((prefix === "G" || prefix === "H") && /^\d+$/.test(query.substring(1))) {
    BibleAPI.strongsLookup(query).then(function(data) {
      if (data.error) { doWordSearch(query); }
      else { renderStrongsResults(query, [data], 1); }
    }).catch(function() { doWordSearch(query); });
  } else {
    doWordSearch(query);
  }
}

function doWordSearch(query) {
  BibleAPI.strongsSearch(query).then(function(data) {
    var matches = data.matches || [];
    renderStrongsResults(query, matches, data.count || matches.length);
  }).catch(function() {
    document.getElementById("strongsPopupBody").innerHTML = '<div class="loading">' + t("searchFailed") + '</div>';
  });
}

function renderStrongsResults(query, matches, total) {
  var body = document.getElementById("strongsPopupBody");
  if (!matches.length) {
    body.innerHTML = '<div class="empty-state">' + t("strongsNoResult") + ' &quot;' + escHtml(query) + '&quot;</div>';
    return;
  }

  var greek = matches.filter(function(m) { return m.prefix === "G"; });
  var hebrew = matches.filter(function(m) { return m.prefix === "H"; });

  var html = '<div class="strongs-count">' + total + ' ' + t("results") + '</div>';

  if (hebrew.length) {
    html += '<div class="strongs-section-title">' + t("strongsHebrew") + ' (' + hebrew.length + ')</div>';
    hebrew.forEach(function(m) { html += renderStrongsEntry("H" + m.number, m); });
  }
  if (greek.length) {
    html += '<div class="strongs-section-title">' + t("strongsGreek") + ' (' + greek.length + ')</div>';
    greek.forEach(function(m) { html += renderStrongsEntry("G" + m.number, m); });
  }

  body.innerHTML = html;
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

function closeStrongsPopup() {
  document.getElementById("strongsOverlay").style.display = "none";
}

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

// ═══════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════
document.addEventListener("DOMContentLoaded", function() {
  setupLanguage();
  refreshLabels();
  setupStrongs();
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