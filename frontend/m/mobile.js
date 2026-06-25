// ═══════════════════════════════════════════
//  Mobile Bible Reader v3 — Full Rewrite
//  Features: reader, compare, search, dict,
//  commentary, devotion, maps, strongs, morph
// ═══════════════════════════════════════════
'use strict';

// ── State ──
var state = {
  translations: [],
  currentTranslation: 'kjv',
  currentBook: { id: 'GEN', name: 'Genesis', nameZh: '创世记', chapters: 50 },
  currentChapter: 1,
  verses: null,
  commentaries: null,
  activeCommentary: null,
  lang: 'bilingual',
  interlinear: false,
  interlinearData: null,
  hasStrongs: false,
  view: 'reader',
  fontSize: 16,
  searchQuery: '',
  searchResults: null,
  tts: { playing: false, currentVerse: -1 },
  compareTranslations: [],
  compareData: {},
  compareMode: false
};

var TRANSLATION_NAMES = {
  kjv:'KJV 英王钦定本', web:'WEB 英文世界版', asv:'ASV 美国标准版',
  bbe:'BBE 基础英文', dby:'Darby 达秘译本', wbt:'Webster 韦氏译本',
  ylt:'YLT 杨氏直译本', cuv_gb:'和合本 (简体)', cuv_tw:'和合本 (繁体)',
  lxx:'七十士译本', byz:'拜占庭希腊文新约', vulgate:'武加大译本',
  oshb:'希伯来原文圣经', tr:'TR 公认经文', sblgnt:'SBL 希腊文新约',
  morphgnt:'MorphGNT 词形分析', sp:'撒玛利亚五经', bsb:'BSB 庇哩亚标准',
  geneva1599:'日内瓦圣经', drc:'杜埃-兰斯译本', chincvs:'中文新译本',
  russynodal:'俄文译本', chiuns:'和合本 (简体字)', chiun:'和合本 (繁體字)'
};

var SWORD_MODULE_MAP = { kjv:'KJV', chiuns:'ChiUns', chiun:'ChiUn', bsb:'BSB', sblgnt:'SBLGNT', morphgnt:'MorphGNT', oshb:'OSHB', sp:'SP', tr:'TR', lxx:'LXX', byz:'Byz', vulgate:'Vulgate', geneva1599:'Geneva1599', drc:'DRC', russynodal:'Russynodal', chincvs:'ChiNCVs' };

// Translations that need SWORD API fallback
var SWORD_FALLBACK = { byz:'Byz', osheb:'OSHB', tr:'TR', sblgnt:'SBLGNT', morphgnt:'MorphGNT' };

var BOOK_ORDER = [
  {id:'GEN',name:'Genesis',nameZh:'创世记',chapters:50},{id:'EXO',name:'Exodus',nameZh:'出埃及记',chapters:40},
  {id:'LEV',name:'Leviticus',nameZh:'利未记',chapters:27},{id:'NUM',name:'Numbers',nameZh:'民数记',chapters:36},
  {id:'DEU',name:'Deuteronomy',nameZh:'申命记',chapters:34},{id:'JOS',name:'Joshua',nameZh:'约书亚记',chapters:24},
  {id:'JDG',name:'Judges',nameZh:'士师记',chapters:21},{id:'RUT',name:'Ruth',nameZh:'路得记',chapters:4},
  {id:'1SA',name:'1 Samuel',nameZh:'撒母耳记上',chapters:31},{id:'2SA',name:'2 Samuel',nameZh:'撒母耳记下',chapters:24},
  {id:'1KI',name:'1 Kings',nameZh:'列王纪上',chapters:22},{id:'2KI',name:'2 Kings',nameZh:'列王纪下',chapters:25},
  {id:'1CH',name:'1 Chronicles',nameZh:'历代志上',chapters:29},{id:'2CH',name:'2 Chronicles',nameZh:'历代志下',chapters:36},
  {id:'EZR',name:'Ezra',nameZh:'以斯拉记',chapters:10},{id:'NEH',name:'Nehemiah',nameZh:'尼希米记',chapters:13},
  {id:'EST',name:'Esther',nameZh:'以斯帖记',chapters:10},{id:'JOB',name:'Job',nameZh:'约伯记',chapters:42},
  {id:'PSA',name:'Psalms',nameZh:'诗篇',chapters:150},{id:'PRO',name:'Proverbs',nameZh:'箴言',chapters:31},
  {id:'ECC',name:'Ecclesiastes',nameZh:'传道书',chapters:12},{id:'SNG',name:'Song of Solomon',nameZh:'雅歌',chapters:8},
  {id:'ISA',name:'Isaiah',nameZh:'以赛亚书',chapters:66},{id:'JER',name:'Jeremiah',nameZh:'耶利米书',chapters:52},
  {id:'LAM',name:'Lamentations',nameZh:'耶利米哀歌',chapters:5},{id:'EZK',name:'Ezekiel',nameZh:'以西结书',chapters:48},
  {id:'DAN',name:'Daniel',nameZh:'但以理书',chapters:12},{id:'HOS',name:'Hosea',nameZh:'何西阿书',chapters:14},
  {id:'JOL',name:'Joel',nameZh:'约珥书',chapters:3},{id:'AMO',name:'Amos',nameZh:'阿摩司书',chapters:9},
  {id:'OBA',name:'Obadiah',nameZh:'俄巴底亚书',chapters:1},{id:'JON',name:'Jonah',nameZh:'约拿书',chapters:4},
  {id:'MIC',name:'Micah',nameZh:'弥迦书',chapters:7},{id:'NAM',name:'Nahum',nameZh:'那鸿书',chapters:3},
  {id:'HAB',name:'Habakkuk',nameZh:'哈巴谷书',chapters:3},{id:'ZEP',name:'Zephaniah',nameZh:'西番雅书',chapters:3},
  {id:'HAG',name:'Haggai',nameZh:'哈该书',chapters:2},{id:'ZEC',name:'Zechariah',nameZh:'撒迦利亚书',chapters:14},
  {id:'MAL',name:'Malachi',nameZh:'玛拉基书',chapters:4},
  {id:'MAT',name:'Matthew',nameZh:'马太福音',chapters:28},{id:'MRK',name:'Mark',nameZh:'马可福音',chapters:16},
  {id:'LUK',name:'Luke',nameZh:'路加福音',chapters:24},{id:'JHN',name:'John',nameZh:'约翰福音',chapters:21},
  {id:'ACT',name:'Acts',nameZh:'使徒行传',chapters:28},{id:'ROM',name:'Romans',nameZh:'罗马书',chapters:16},
  {id:'1CO',name:'1 Corinthians',nameZh:'哥林多前书',chapters:16},{id:'2CO',name:'2 Corinthians',nameZh:'哥林多后书',chapters:13},
  {id:'GAL',name:'Galatians',nameZh:'加拉太书',chapters:6},{id:'EPH',name:'Ephesians',nameZh:'以弗所书',chapters:6},
  {id:'PHP',name:'Philippians',nameZh:'腓立比书',chapters:4},{id:'COL',name:'Colossians',nameZh:'歌罗西书',chapters:4},
  {id:'1TH',name:'1 Thessalonians',nameZh:'帖撒罗尼迦前书',chapters:5},{id:'2TH',name:'2 Thessalonians',nameZh:'帖撒罗尼迦后书',chapters:3},
  {id:'1TI',name:'1 Timothy',nameZh:'提摩太前书',chapters:6},{id:'2TI',name:'2 Timothy',nameZh:'提摩太后书',chapters:4},
  {id:'TIT',name:'Titus',nameZh:'提多书',chapters:3},{id:'PHM',name:'Philemon',nameZh:'腓利门书',chapters:1},
  {id:'HEB',name:'Hebrews',nameZh:'希伯来书',chapters:13},{id:'JAS',name:'James',nameZh:'雅各书',chapters:5},
  {id:'1PE',name:'1 Peter',nameZh:'彼得前书',chapters:5},{id:'2PE',name:'2 Peter',nameZh:'彼得后书',chapters:3},
  {id:'1JN',name:'1 John',nameZh:'约翰一书',chapters:5},{id:'2JN',name:'2 John',nameZh:'约翰二书',chapters:1},
  {id:'3JN',name:'3 John',nameZh:'约翰三书',chapters:1},{id:'JUD',name:'Jude',nameZh:'犹大书',chapters:1},
  {id:'REV',name:'Revelation',nameZh:'启示录',chapters:22}
];

var COMMENTARY_LABELS = {
  'TSK':'TSK', 'JFB':'JFB', 'MHCC':'MH Concise', 'MHC':'MH Complete',
  'Clarke':'Clarke', 'Calvin':'Calvin', 'Barnes':'Barnes',
  'RWP':'Robertson', 'Catena':'Catena', 'Wesley':'Wesley',
  'Pentateuch':'Pentateuch', 'GenesisIntro':'Genesis Intro'
};

var DICT_NAMES = { easton:"Easton", isbe:"ISBE", nave:"Nave" };

// ── I18N ──
var I18N = {
  en: {
    loading:'Loading...', failed:'Failed to load', searching:'Searching...',
    noResults:'No results found', results:'results',
    oldTestament:'Old Testament', newTestament:'New Testament',
    prevChapter:'Prev', nextChapter:'Next',
    commentary:'Commentary', noCommentary:'No commentary for this chapter',
    search:'Search the Bible...', readAloud:'Read Aloud', stopReading:'Stop',
    font:'Font Size', interlinear:'Interlinear',
    desktopVersion:'Desktop Version', today:'Today',
    devotionLoading:'Loading devotion...', devotionError:'Failed to load devotion',
    devotionNoContent:'No devotion for this date',
    dictionary:'Dictionary', dictSearch:'Search dictionary...',
    login:'Login', register:'Register', logout:'Logout',
    username:'Username', password:'Password',
    loginSuccess:'Login successful', loginFailed:'Login failed',
    registerSuccess:'Registration successful', registerFailed:'Registration failed',
    selectBook:'Select Book', selectChapter:'Select Chapter',
    compare:'Compare', compareOff:'Close Compare', selectVersion:'Add version...',
    maps:'Maps', selectMapModule:'Select map set', noMaps:'No maps available'
  },
  zh: {
    loading:'加载中...', failed:'加载失败', searching:'搜索中...',
    noResults:'未找到结果', results:'条结果',
    oldTestament:'旧约', newTestament:'新约',
    prevChapter:'上一章', nextChapter:'下一章',
    commentary:'注释', noCommentary:'本章暂无注释',
    search:'搜索经文...', readAloud:'朗读', stopReading:'停止',
    font:'字体大小', interlinear:'逐词对照',
    desktopVersion:'桌面版', today:'今天',
    devotionLoading:'灵修加载中...', devotionError:'灵修加载失败',
    devotionNoContent:'此日期暂无灵修内容',
    dictionary:'词典', dictSearch:'搜索词典...',
    login:'登录', register:'注册', logout:'退出',
    username:'用户名', password:'密码',
    loginSuccess:'登录成功', loginFailed:'登录失败',
    registerSuccess:'注册成功', registerFailed:'注册失败',
    selectBook:'选择书卷', selectChapter:'选择章节',
    compare:'多版本对照', compareOff:'关闭对照', selectVersion:'添加版本...',
    maps:'圣经地图', selectMapModule:'选择地图集', noMaps:'暂无地图'
  }
};

function t(key) {
  var zh = I18N.zh[key], en = I18N.en[key];
  if (state.lang === 'zh') return zh || en;
  if (state.lang === 'bilingual') return (zh || '') + (zh && en ? ' / ' : '') + (en || '');
  return en || zh;
}

function bookLabel(b) {
  if (state.lang === 'zh') return b.nameZh || b.name;
  if (state.lang === 'bilingual') return b.nameZh + ' / ' + (b.name || '');
  return b.name || b.nameZh;
}

function transLabel(tr) {
  var zh = TRANSLATION_NAMES[tr.id] || tr.name || tr.id;
  var en = tr.name || tr.id;
  if (state.lang === 'zh') return zh;
  if (state.lang === 'bilingual') return en + ' / ' + zh;
  return en;
}

function transShortLabel(tid) {
  var name = TRANSLATION_NAMES[tid] || tid;
  // Shorten: take first 2 Chinese chars or first 4 Latin chars
  if (/[\u4e00-\u9fff]/.test(name)) return name.substring(0, 4);
  return tid.toUpperCase();
}

function isSwordOnlyTranslation(tid) { return tid === 'chiuns' || tid === 'chiun'; }
function isSwordTranslation(tid) { return tid in SWORD_MODULE_MAP; }
function needsSwordFallback(tid) { return tid in SWORD_FALLBACK; }

// Translations that support interlinear (Strong's word-by-word)
var INTERLINEAR_TRANSLATIONS = ['kjv', 'chiuns', 'chiun', 'bsb', 'oshb', 'sp', 'lxx'];
function isInterlinearTranslation(tid) { return INTERLINEAR_TRANSLATIONS.indexOf(tid) >= 0; }

// ── API helpers ──
function apiGet(path) {
  return fetch('/api/v1' + path).then(function(r) {
    if (!r.ok) throw new Error(r.status);
    return r.json();
  });
}

function escHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function stripOsisTags(text) {
  if (!text) return text;
  return String(text).replace(/<\/?[a-zA-Z_:][^>]*>/g, '');
}

function makeWordsClickable(text) {
  return stripOsisTags(text).replace(/([a-zA-ZΑ-ω\u0590-\u05ff]{3,})/g, '<span class="verse-word">$1</span>');
}

function isMorphCode(code) {
  if (!code) return false;
  var upper = code.toUpperCase();
  var clean = upper.replace(/^T([HG])/, '$1');
  var m = clean.match(/^([HG])(\d+)$/);
  if (!m) return false;
  var num = parseInt(m[2], 10);
  if (m[1] === 'H' && num >= 8685) return true;
  if (m[1] === 'G' && num >= 5000) return true;
  return false;
}

function normalizeMorph(morph) {
  if (!morph) return morph;
  return morph.replace(/^T([HG])/i, '$1');
}

// ═══════════════════════════════════════════
//  AUTH
// ═══════════════════════════════════════════
var authState = { token: null, user: null };

function loadAuthFromStorage() {
  var token = localStorage.getItem('bible-auth-token');
  var user = localStorage.getItem('bible-auth-user');
  if (token) {
    authState.token = token;
    try { authState.user = JSON.parse(user); } catch(e) {}
  }
}

function isLoggedIn() { return !!authState.token; }

function openAuthPanel() {
  closeMore();
  document.getElementById('authOverlay').style.display = 'flex';
  showAuthForm('login');
}

function closeAuth() { document.getElementById('authOverlay').style.display = 'none'; }

function showAuthForm(form) {
  document.getElementById('authLoginForm').style.display = form === 'login' ? 'block' : 'none';
  document.getElementById('authRegisterForm').style.display = form === 'register' ? 'block' : 'none';
}

function doLogin() {
  var username = document.getElementById('loginUsername').value.trim();
  var password = document.getElementById('loginPassword').value;
  if (!username || !password) return;
  fetch('/api/v1/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: username, password: password })
  }).then(function(r) { return r.json(); }).then(function(data) {
    if (data.token) {
      authState.token = data.token; authState.user = { username: username };
      localStorage.setItem('bible-auth-token', data.token);
      localStorage.setItem('bible-auth-user', JSON.stringify(authState.user));
      updateAuthUI(); closeAuth();
    } else { alert(t('loginFailed') + ': ' + (data.error || '')); }
  }).catch(function() { alert(t('loginFailed')); });
}

function doRegister() {
  var username = document.getElementById('regUsername').value.trim();
  var password = document.getElementById('regPassword').value;
  if (!username || !password) return;
  fetch('/api/v1/auth/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: username, password: password })
  }).then(function(r) { return r.json(); }).then(function(data) {
    if (data.token) {
      authState.token = data.token; authState.user = { username: username };
      localStorage.setItem('bible-auth-token', data.token);
      localStorage.setItem('bible-auth-user', JSON.stringify(authState.user));
      updateAuthUI(); closeAuth(); alert(t('registerSuccess'));
    } else { alert(t('registerFailed') + ': ' + (data.error || '')); }
  }).catch(function() { alert(t('registerFailed')); });
}

function doLogout() {
  authState.token = null; authState.user = null;
  localStorage.removeItem('bible-auth-token');
  localStorage.removeItem('bible-auth-user');
  updateAuthUI();
}

function updateAuthUI() {
  var btn = document.getElementById('authBtn');
  if (!btn) return;
  if (isLoggedIn()) {
    btn.innerHTML = '<span>👤</span> <span>' + escHtml(authState.user ? authState.user.username : 'Me') + '</span>';
    btn.onclick = function() { if (confirm('Logout?')) doLogout(); };
  } else {
    btn.innerHTML = '<span>👤</span> <span>' + t('login') + '</span>';
    btn.onclick = openAuthPanel;
  }
}

// ═══════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function() {
  var savedFont = parseInt(localStorage.getItem('bible-font-size'));
  if (savedFont) { state.fontSize = savedFont; }
  applyFontSize();

  var savedLang = localStorage.getItem('bible-lang');
  if (savedLang) { state.lang = savedLang; }

  var lastTr = localStorage.getItem('bible-translation');
  var lastBook = localStorage.getItem('bible-book');
  var lastCh = localStorage.getItem('bible-chapter');
  if (lastTr) state.currentTranslation = lastTr;
  if (lastBook) {
    var b = BOOK_ORDER.find(function(x) { return x.id === lastBook; });
    if (b) state.currentBook = b;
  }
  if (lastCh) state.currentChapter = parseInt(lastCh);

  loadAuthFromStorage();

  // Language selector
  var langSel = document.getElementById('langToggle');
  langSel.value = state.lang;
  langSel.addEventListener('change', function(e) {
    state.lang = e.target.value;
    localStorage.setItem('bible-lang', state.lang);
    renderTranslationSelector(); renderBookList(); renderChapterGrid();
    renderChapterHeader(); renderChapterNav(); renderVerses(); updateLabels();
  });

  // Bottom nav
  document.querySelectorAll('.nav-btn').forEach(function(btn) {
    btn.addEventListener('click', function() { switchView(btn.dataset.view); });
  });

  // Drawer
  document.getElementById('menuBtn').addEventListener('click', openDrawer);
  document.getElementById('drawerClose').addEventListener('click', closeDrawer);
  document.getElementById('drawerOverlay').addEventListener('click', closeDrawer);

  // Commentary drawer
  document.getElementById('commentaryClose').addEventListener('click', closeCommentary);
  document.getElementById('commentaryOverlay').addEventListener('click', closeCommentary);

  // Search
  document.getElementById('searchSubmit').addEventListener('click', doSearch);
  document.getElementById('searchInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') doSearch();
  });

  // Dictionary search
  document.getElementById('dictSearchSubmit').addEventListener('click', doDictSearch);
  document.getElementById('dictSearchInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') doDictSearch();
  });

  // More menu
  document.getElementById('moreBtn').addEventListener('click', function() {
    document.getElementById('moreOverlay').style.display = 'flex';
  });

  // Devotion navigation
  document.getElementById('devPrevDay').addEventListener('click', function() { changeDevDay(-1); });
  document.getElementById('devNextDay').addEventListener('click', function() { changeDevDay(1); });

  // Auth toggle links
  document.getElementById('showLogin').addEventListener('click', function(e) { e.preventDefault(); showAuthForm('login'); });
  document.getElementById('showRegister').addEventListener('click', function(e) { e.preventDefault(); showAuthForm('register'); });

  // Swipe gesture
  setupSwipeNav();

  initTTS();
  updateAuthUI();
  loadTranslations();
});

function updateLabels() {
  document.getElementById('searchInput').placeholder = t('search');
  document.getElementById('dictSearchInput').placeholder = t('dictSearch');
  document.getElementById('otLabel').textContent = t('oldTestament');
  document.getElementById('ntLabel').textContent = t('newTestament');
  document.getElementById('chapterLabel').textContent = t('selectChapter');
  document.getElementById('interlinearLabel').textContent = t('interlinear');
  document.getElementById('ttsLabel').textContent = state.tts.playing ? t('stopReading') : t('readAloud');
  document.getElementById('compareLabel').textContent = state.compareMode ? t('compareOff') : t('compare');
  document.getElementById('commentaryTitle').textContent = '📝 ' + t('commentary');
  var dt = document.getElementById('dictTitle');
  if (dt) dt.textContent = '📚 ' + t('dictionary');
  // Show/hide interlinear menu item based on translation support
  var ilItem = document.getElementById('interlinearMenuItem');
  if (ilItem) ilItem.style.display = isInterlinearTranslation(state.currentTranslation) ? '' : 'none';
  updateAuthUI();
}

// ═══════════════════════════════════════════
//  TRANSLATIONS
// ═══════════════════════════════════════════
function loadTranslations() {
  apiGet('/bible/translations').then(function(data) {
    state.translations = data.translations || [];
    // Inject sword-only translations not in H2
    var swordOnly = [
      {id:'chiuns', name:'和合本 (简体字)', language:'chinese'},
      {id:'chiun', name:'和合本 (繁體字)', language:'chinese'}
    ];
    swordOnly.forEach(function(st) {
      if (!state.translations.find(function(t) { return t.id === st.id; })) {
        state.translations.push(st);
      }
    });
    renderTranslationSelector();
    renderCompareSelector();
    updateLabels();
    loadBooks().then(loadChapter);
  }).catch(function() { setTimeout(loadTranslations, 3000); });
}

function renderTranslationSelector() {
  var sel = document.getElementById('translationSelect');
  // Sort: interlinear-capable versions first
  var sorted = state.translations.slice().sort(function(a, b) {
    var aIl = isSwordTranslation(a.id) ? 0 : 1;
    var bIl = isSwordTranslation(b.id) ? 0 : 1;
    return aIl - bIl;
  });
  var html = '';
  sorted.forEach(function(tr) {
    var label = transLabel(tr);
    var ilBadge = isSwordTranslation(tr.id) ? ' 🔖' : '';
    html += '<option value="' + tr.id + '"' + (tr.id === state.currentTranslation ? ' selected' : '') + '>' + label + ilBadge + '</option>';
  });
  sel.innerHTML = html;
  sel.onchange = function(e) {
    state.currentTranslation = e.target.value;
    // Turn off interlinear if new translation doesn't support it
    if (!isInterlinearTranslation(state.currentTranslation)) {
      state.interlinear = false; state.interlinearData = null;
    }
    // Keep compare mode: reload compare data for new chapter context
    if (state.compareMode && state.compareTranslations.length) {
      state.compareData = {};
      loadAllCompare();
    }
    localStorage.setItem('bible-translation', state.currentTranslation);
    updateLabels();
    loadBooks().then(loadChapter);
  };
}

// ═══════════════════════════════════════════
//  BOOKS & CHAPTERS
// ═══════════════════════════════════════════
function loadBooks() {
  if (isSwordOnlyTranslation(state.currentTranslation)) {
    var mod = SWORD_MODULE_MAP[state.currentTranslation];
    return fetch('/api/v1/sword/modules/' + mod + '/books')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        state.books = (data.books || []).map(function(sb) {
          var osisId = sb.osisId.toUpperCase();
          var b = BOOK_ORDER.find(function(x) { return x.id === osisId; });
          return { id:osisId, name:b?b.name:osisId, nameZh:b?b.nameZh:osisId, chapters:sb.chapterCount };
        });
        renderBookList();
      }).catch(function() { renderBookList(); });
  }
  return apiGet('/bible/' + state.currentTranslation + '/books').then(function(data) {
    if (data.books) state.books = data.books.map(function(b) {
      b.id = b.book_id; b.chapters = b.chapter_count; return b;
    });
    renderBookList();
  }).catch(function() { renderBookList(); });
}

function renderBookList() {
  var map = {};
  (state.books || []).forEach(function(b) { map[b.id] = b; });
  function renderList(books, containerId) {
    var html = '';
    books.forEach(function(b) {
      var m = map[b.id] || {};
      var ch = m.chapters || b.chapters;
      var active = state.currentBook.id === b.id ? ' active' : '';
      html += '<div class="book-item' + active + '" data-book="' + b.id + '" data-chapters="' + ch + '">' +
        '<span>' + bookLabel(b) + '</span></div>';
    });
    var c = document.getElementById(containerId);
    c.innerHTML = html;
    c.querySelectorAll('.book-item').forEach(function(el) {
      el.addEventListener('click', function() {
        var id = el.dataset.book;
        var b = BOOK_ORDER.find(function(x) { return x.id === id; });
        if (b) {
          var chCount = parseInt(el.dataset.chapters) || b.chapters;
          state.currentBook = { id:b.id, name:b.name, nameZh:b.nameZh, chapters:chCount };
          state.currentChapter = 1;
          localStorage.setItem('bible-book', b.id);
          localStorage.setItem('bible-chapter', '1');
          renderBookList(); renderChapterGrid(); renderChapterHeader(); loadChapter();
          closeDrawer();
        }
      });
    });
  }
  renderList(BOOK_ORDER.slice(0, 39), 'otBooks');
  renderList(BOOK_ORDER.slice(39), 'ntBooks');
  renderChapterGrid();
}

function renderChapterGrid() {
  var ch = state.currentBook.chapters;
  var html = '';
  for (var i = 1; i <= ch; i++) {
    html += '<div class="ch-item' + (i === state.currentChapter ? ' active' : '') + '" data-ch="' + i + '">' + i + '</div>';
  }
  var c = document.getElementById('chapterGrid');
  c.innerHTML = html;
  c.querySelectorAll('.ch-item').forEach(function(el) {
    el.addEventListener('click', function() {
      state.currentChapter = parseInt(el.dataset.ch);
      localStorage.setItem('bible-chapter', String(state.currentChapter));
      renderChapterGrid(); renderChapterHeader(); loadChapter(); closeDrawer();
    });
  });
}

// ═══════════════════════════════════════════
//  CHAPTER LOADING (with SWORD fallback)
// ═══════════════════════════════════════════
function loadChapter() {
  stopTTS();
  state.view = 'reader';
  // Clear stale compare data when chapter changes
  state.compareData = {};
  document.getElementById('verseContent').innerHTML = '<div class="loading">' + t('loading') + '</div>';
  switchView('reader');

  var bookId = state.currentBook.id.toLowerCase();
  var tid = state.currentTranslation;

  // Sword-only translations (chiuns, chiun)
  if (isSwordOnlyTranslation(tid)) {
    loadChapterSword(tid, bookId);
    loadCommentaries();
    return;
  }

  // Normal text API
  var url = '/bible/' + tid + '/' + bookId + '/' + state.currentChapter;
  apiGet(url).then(function(data) {
    var verses = data.verses || [];
    // If empty or all zero-text, try SWORD fallback
    if (verses.length === 0 || (verses.length > 0 && verses.every(function(v) { return !v.text || v.text.trim() === ''; }))) {
      if (needsSwordFallback(tid) || isSwordTranslation(tid)) {
        loadChapterSword(tid, bookId);
      } else {
        state.verses = data;
        renderChapterHeader(); renderChapterNav(); renderVerses();
      }
    } else {
      state.verses = data;
      state.hasStrongs = (verses[0] && verses[0].strongsAnnotation != null);
      renderChapterHeader(); renderChapterNav();
      if (state.interlinear && isInterlinearTranslation(tid)) { loadInterlinear(); }
      else { renderVerses(); }
      // Load compare data if in compare mode
      if (state.compareMode && state.compareTranslations.length) loadAllCompare();
    }
  }).catch(function() {
    // Try SWORD fallback
    if (needsSwordFallback(tid) || isSwordTranslation(tid)) {
      loadChapterSword(tid, bookId);
    } else {
      document.getElementById('verseContent').innerHTML = '<div class="loading">' + t('failed') + '</div>';
    }
  });

  loadCommentaries();
}

function loadChapterSword(tid, bookId) {
  var mod = SWORD_MODULE_MAP[tid] || SWORD_FALLBACK[tid];
  if (!mod) {
    document.getElementById('verseContent').innerHTML = '<div class="loading">' + t('failed') + '</div>';
    return;
  }
  var ref = bookId + '.' + state.currentChapter;
  var swordUrl = '/api/v1/sword/' + mod + '/passage/' + ref;
  if (state.interlinear) swordUrl += '?strongs=true';
  // Note: interlinear only enabled for interlinear-capable translations

  fetch(swordUrl).then(function(r) { return r.json(); }).then(function(data) {
    var verses = (data.verses || []).map(function(v) {
      return { chapter:v.chapter, verse:v.verse, text:stripOsisTags(v.text) };
    });
    state.verses = { verses:verses };
    state.hasStrongs = !!(data.verses && data.verses.length > 0 && data.verses[0].words);
    if (state.interlinear && data.verses && data.verses[0].words) {
      state.interlinearData = data;
    }
    renderChapterHeader(); renderChapterNav(); renderVerses();
    if (state.compareMode && state.compareTranslations.length) loadAllCompare();
  }).catch(function() {
    document.getElementById('verseContent').innerHTML = '<div class="loading">' + t('failed') + '</div>';
  });
}

function renderChapterHeader() {
  var b = state.currentBook;
  var label = bookLabel(b);
  var trLabel = TRANSLATION_NAMES[state.currentTranslation] || state.currentTranslation.toUpperCase();
  var totalCh = state.currentBook.chapters;
  // Chapter quick-select dropdown
  var chOpts = '';
  for (var i = 1; i <= totalCh; i++) {
    chOpts += '<option value="' + i + '"' + (i === state.currentChapter ? ' selected' : '') + '>' + i + '</option>';
  }
  document.getElementById('chapterHeader').innerHTML =
    '<div class="ch-header-row">' +
      '<button class="ch-nav-btn" onclick="prevChapter()"' + (state.currentChapter <= 1 ? ' disabled' : '') + '>←</button>' +
      '<div class="ch-title">' + label + '</div>' +
      '<select class="ch-select" id="chQuickSelect">' + chOpts + '</select>' +
      '<button class="ch-nav-btn" onclick="nextChapter()"' + (state.currentChapter >= totalCh ? ' disabled' : '') + '>→</button>' +
    '</div>' +
    '<div class="ch-sub">' + trLabel + '</div>';
  var sel = document.getElementById('chQuickSelect');
  if (sel) sel.onchange = function(e) {
    state.currentChapter = parseInt(e.target.value);
    localStorage.setItem('bible-chapter', String(state.currentChapter));
    renderChapterGrid(); loadChapter();
  };
}

function renderChapterNav() {
  var totalCh = state.currentBook.chapters;
  var prevDisabled = state.currentChapter <= 1 ? ' disabled' : '';
  var nextDisabled = state.currentChapter >= totalCh ? ' disabled' : '';
  document.getElementById('chapterNav').innerHTML =
    '<button onclick="prevChapter()"' + prevDisabled + '>← ' + t('prevChapter') + '</button>' +
    '<span style="display:flex;align-items:center;font-size:13px;color:var(--text2)">' +
    state.currentChapter + ' / ' + totalCh + '</span>' +
    '<button onclick="nextChapter()"' + nextDisabled + '>' + t('nextChapter') + ' →</button>';
}

function prevChapter() {
  if (state.currentChapter > 1) {
    state.currentChapter--;
    localStorage.setItem('bible-chapter', String(state.currentChapter));
    renderChapterGrid(); renderChapterHeader(); loadChapter();
  }
}

function nextChapter() {
  if (state.currentChapter < state.currentBook.chapters) {
    state.currentChapter++;
    localStorage.setItem('bible-chapter', String(state.currentChapter));
    renderChapterGrid(); renderChapterHeader(); loadChapter();
  }
}

// ═══════════════════════════════════════════
//  VERSE RENDERING
// ═══════════════════════════════════════════
function renderVerses() {
  var container = document.getElementById('verseContent');

  // Interlinear
  if (state.interlinear && state.interlinearData && isInterlinearTranslation(state.currentTranslation)) {
    renderInterlinear(); return;
  }
  if (state.interlinear && isInterlinearTranslation(state.currentTranslation) && !state.interlinearData) {
    container.innerHTML = '<div class="loading">' + t('loading') + '</div>'; return;
  }

  // Compare mode
  if (state.compareMode && state.compareTranslations.length && Object.keys(state.compareData).length) {
    renderCompareVerses(); return;
  }

  var verses = state.verses ? (state.verses.verses || []) : [];
  var html = '';
  verses.forEach(function(v) {
    if (v.verse === 0 && verses.length > 1) return;
    var speaking = (state.tts.currentVerse === v.verse) ? ' speaking' : '';
    html += '<div class="verse-line' + speaking + '" data-verse="' + v.verse + '">' +
      '<span class="verse-num tts-btn" onclick="speakVerse(' + v.verse + ')" title="' + t('readAloud') + '">' + v.verse + '</span>' +
      '<span class="verse-text">' + makeWordsClickable(v.text || '') + '</span>' +
      '</div>';
  });
  container.innerHTML = html || '<div class="loading">' + t('failed') + '</div>';

  // Click word → Strong's popup
  container.querySelectorAll('.verse-word').forEach(function(el) {
    el.addEventListener('click', function() {
      var word = el.textContent.trim();
      if (word) searchStrongsPopup(word);
    });
  });
}

// ═══════════════════════════════════════════
//  MULTI-VERSION COMPARE
// ═══════════════════════════════════════════
function renderCompareSelector() {
  var sel = document.getElementById('compareSelect');
  if (!sel) return;
  var html = '<option value="">' + t('selectVersion') + '</option>';
  state.translations.forEach(function(tr) {
    if (tr.id === state.currentTranslation) return;
    if (state.compareTranslations.indexOf(tr.id) >= 0) return;
    html += '<option value="' + tr.id + '">' + transLabel(tr) + '</option>';
  });
  sel.innerHTML = html;
}

function toggleCompareMode() {
  closeMore();
  state.compareMode = !state.compareMode;
  if (state.compareMode) {
    state.compareTranslations = state.compareTranslations || [];
    renderCompareSelector();
    renderCompareBar();
  } else {
    state.compareTranslations = [];
    state.compareData = {};
    renderCompareBar();
  }
  renderVerses();
  updateLabels();
}

function addCompareTranslation(tid) {
  if (!tid || state.compareTranslations.indexOf(tid) >= 0) return;
  state.compareTranslations.push(tid);
  renderCompareSelector();
  loadCompareData(tid);
  renderCompareBar();
}

function removeCompareTranslation(tid) {
  state.compareTranslations = state.compareTranslations.filter(function(x) { return x !== tid; });
  delete state.compareData[tid];
  renderCompareSelector();
  renderCompareBar();
  renderVerses();
}

function loadCompareData(tid) {
  var bookId = state.currentBook.id.toLowerCase();
  if (isSwordOnlyTranslation(tid)) {
    var mod = SWORD_MODULE_MAP[tid];
    fetch('/api/v1/sword/' + mod + '/passage/' + bookId + '.' + state.currentChapter)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        state.compareData[tid] = { verses: (data.verses || []).map(function(v) {
          return { verse:v.verse, text:stripOsisTags(v.text) };
        }) };
        renderVerses();
      }).catch(function() {});
    return;
  }
  apiGet('/bible/' + tid + '/' + bookId + '/' + state.currentChapter).then(function(data) {
    state.compareData[tid] = data;
    renderVerses();
  }).catch(function() {
    // Try SWORD fallback
    if (needsSwordFallback(tid) || isSwordTranslation(tid)) {
      var mod = SWORD_MODULE_MAP[tid] || SWORD_FALLBACK[tid];
      fetch('/api/v1/sword/' + mod + '/passage/' + bookId + '.' + state.currentChapter)
        .then(function(r) { return r.json(); })
        .then(function(data) {
          state.compareData[tid] = { verses: (data.verses || []).map(function(v) {
            return { verse:v.verse, text:stripOsisTags(v.text) };
          }) };
          renderVerses();
        }).catch(function() {});
    }
  });
}

function loadAllCompare() {
  state.compareTranslations.forEach(function(tid) {
    if (!state.compareData[tid]) loadCompareData(tid);
  });
}

function renderCompareBar() {
  var bar = document.getElementById('compareBar');
  if (!bar) return;
  // Hide bar only when compare mode is off entirely
  if (!state.compareMode) {
    bar.style.display = 'none';
    bar.innerHTML = '';
    return;
  }
  bar.style.display = 'flex';
  var html = '';
  state.compareTranslations.forEach(function(tid) {
    var name = transShortLabel(tid);
    html += '<div class="compare-chip">' + escHtml(name) +
      ' <span class="compare-x" data-tid="' + escHtml(tid) + '">✕</span></div>';
  });
  html += '<select id="compareSelect" class="compare-select"><option value="">' + t('selectVersion') + '</option></select>';
  bar.innerHTML = html;

  // Re-populate select
  renderCompareSelector();
  var sel = document.getElementById('compareSelect');
  if (sel) {
    sel.onchange = function(e) {
      if (e.target.value) {
        addCompareTranslation(e.target.value);
        // Reset select to placeholder after adding
        e.target.value = '';
      }
    };
  }
  bar.querySelectorAll('.compare-x').forEach(function(el) {
    el.addEventListener('click', function() {
      removeCompareTranslation(el.dataset.tid);
    });
  });
}

function renderCompareVerses() {
  var container = document.getElementById('verseContent');
  var primaryVerses = state.verses ? (state.verses.verses || []) : [];
  var allData = [{ id: state.currentTranslation, label: transShortLabel(state.currentTranslation), data: primaryVerses }];
  state.compareTranslations.forEach(function(tid) {
    var cd = state.compareData[tid];
    allData.push({ id: tid, label: transShortLabel(tid), data: cd ? (cd.verses || []) : [] });
  });

  var maxN = primaryVerses.length;
  allData.forEach(function(d) { if (d.data.length > maxN) maxN = d.data.length; });

  var html = '';
  for (var i = 0; i < maxN; i++) {
    var vn = null;
    allData.forEach(function(d) { if (vn === null && d.data[i]) vn = d.data[i].verse; });
    if (vn === null) vn = i + 1;
    if (vn === 0 && maxN > 1) continue;

    html += '<div class="cmp-row">';
    html += '<div class="cmp-vn">' + vn + '</div>';
    html += '<div class="cmp-cols">';
    allData.forEach(function(d) {
      var v = d.data[i];
      var text = v ? stripOsisTags(v.text || '') : '';
      html += '<div class="cmp-col">';
      html += '<div class="cmp-label">' + escHtml(d.label) + '</div>';
      html += '<div class="cmp-text">' + escHtml(text) + '</div>';
      html += '</div>';
    });
    html += '</div></div>';
  }
  container.innerHTML = html || '<div class="loading">' + t('failed') + '</div>';
}

// ═══════════════════════════════════════════
//  INTERLINEAR
// ═══════════════════════════════════════════
function loadInterlinear() {
  var mod = SWORD_MODULE_MAP[state.currentTranslation];
  if (!mod || !isInterlinearTranslation(state.currentTranslation)) { state.interlinear = false; renderVerses(); return; }
  var key = state.currentBook.id.toLowerCase() + '.' + state.currentChapter;
  state.interlinearData = null;
  return fetch('/api/v1/sword/' + mod + '/passage/' + key + '?strongs=true')
    .then(function(r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function(data) { state.interlinearData = data; renderVerses(); })
    .catch(function() { state.interlinear = false; state.interlinearData = null; renderVerses(); });
}

function renderInterlinear() {
  var ctx = document.getElementById('verseContent');
  if (!state.interlinearData || !state.interlinearData.verses) {
    ctx.innerHTML = '<div class="loading">' + t('loading') + '</div>'; return;
  }
  var html = '';
  try {
    state.interlinearData.verses.forEach(function(v) {
      if (v.verse === 0 && state.interlinearData.verses.length > 1) return;
      if (!v.words || !v.words.length) return;
      html += '<div class="il-verse">';
      html += '<span class="verse-num">' + v.verse + '</span> ';
      v.words.forEach(function(w) {
        var strongsList = (w.strongs || '').split('+').filter(Boolean);
        var realStrongs = [], morphTags = [];
        strongsList.forEach(function(sn) {
          if (isMorphCode(sn)) { morphTags.push(normalizeMorph(sn)); }
          else { realStrongs.push(sn); }
        });
        if (!w.text || !w.text.trim()) {
          html += '<span class="il-word il-word-ghost">';
          if (realStrongs.length > 0) {
            html += '<sub class="il-strongs">';
            realStrongs.forEach(function(sn, si) {
              if (si > 0) html += '+';
              html += '<a class="il-strongs-link" data-strongs="' + escHtml(sn) + '">' + escHtml(sn) + '</a>';
            });
            html += '</sub>';
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
        if (morphTags.length > 0) {
          html += ' <sup class="il-morph" data-morph="' + escHtml(morphTags.join('+')) + '">' + escHtml(morphTags.join('+')) + '</sup>';
        }
        html += '</span> ';
      });
      if (v.footnotes && v.footnotes.length) {
        html += '<div class="il-footnotes">';
        v.footnotes.forEach(function(fn) {
          var fnText = stripOsisTags(fn.text || fn.note || '');
          html += '<span class="il-fn">' + escHtml(fnText) + '</span> ';
        });
        html += '</div>';
      }
      html += '</div>';
    });
  } catch(e) {
    html = '<div class="loading">Error: ' + escHtml(e.message) + '</div>';
  }
  ctx.innerHTML = html;

  // Strong's link handlers
  ctx.querySelectorAll('.il-strongs-link').forEach(function(el) {
    el.addEventListener('click', function(e) {
      e.stopPropagation();
      openStrongsPopup(el.dataset.strongs);
    });
  });
  // Morph tooltip handlers
  ctx.querySelectorAll('.il-morph').forEach(function(el) {
    el.addEventListener('click', function(e) {
      e.stopPropagation();
      var morph = el.dataset.morph;
      if (morph && typeof describeMorph === 'function') {
        var desc = describeMorph(morph, state.lang);
        if (desc) showTooltip(e, desc);
      }
    });
  });
}

function toggleInterlinear() {
  if (!isInterlinearTranslation(state.currentTranslation)) return;
  state.interlinear = !state.interlinear;
  state.interlinearData = null;
  closeMore();
  if (state.interlinear) { loadInterlinear(); }
  else { renderVerses(); }
}

// ═══════════════════════════════════════════
//  STRONG'S DICTIONARY
// ═══════════════════════════════════════════
var strongsCache = {};

function searchStrongs(word) {
  fetch('/api/v1/strongs/search?q=' + encodeURIComponent(word))
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var matches = data.matches || [];
      if (matches.length > 0) {
        var m = matches[0];
        var id = m.id || (m.prefix + m.number);
        openStrongsPopup(id);
      }
    }).catch(function() {});
}

function searchStrongsPopup(word) {
  fetch('/api/v1/strongs/search?q=' + encodeURIComponent(word))
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var matches = data.matches || [];
      if (matches.length > 0) {
        var m = matches[0];
        var id = m.id || (m.prefix + m.number);
        openStrongsPopup(id);
      } else {
        // No Strong's match → open dictionary search
        openDictPopup(word);
      }
    }).catch(function() {});
}

function openDictPopup(word) {
  var overlay = document.getElementById('strongsOverlay');
  var body = document.getElementById('strongsBody');
  var title = document.getElementById('strongsTitle');
  title.textContent = '📚 "' + word + '"';
  body.innerHTML = '<div class="loading">' + t('searching') + '</div>';
  overlay.style.display = 'flex';
  var dicts = ['easton', 'isbe', 'nave'];
  var all = [], pending = dicts.length;
  dicts.forEach(function(d) {
    fetch('/api/v1/annotations/dictionaries/' + d + '?search=' + encodeURIComponent(word))
      .then(function(r) { return r.json(); })
      .then(function(data) {
        (data.entries || []).forEach(function(e) { e.source = DICT_NAMES[d] || d; all.push(e); });
      }).catch(function() {})
      .then(function() {
        pending--;
        if (pending === 0) {
          if (!all.length) { body.innerHTML = '<div class="st-def">' + t('noResults') + '</div>'; return; }
          var html = '';
          all.forEach(function(r) {
            var ew = r.entryId || r.word || r.term || r.title || '';
            var def = stripOsisTags(r.definition || r.text || r.content || '');
            var src = r.source || '';
            html += '<div class="dict-popup-entry"><div class="sr-ref">' + escHtml(ew) + (src ? ' <span style="color:var(--text2);font-size:11px">[' + escHtml(src) + ']</span>' : '') + '</div><div class="sr-text">' + escHtml(def.substring(0, 400)) + (def.length > 400 ? '...' : '') + '</div></div>';
          });
          body.innerHTML = html;
        }
      });
  });
}

function openStrongsPopup(sn) {
  var overlay = document.getElementById('strongsOverlay');
  var body = document.getElementById('strongsBody');
  var title = document.getElementById('strongsTitle');
  sn = sn.replace(/([HG])0+(\d+)/i, '$1$2');
  var isHebrew = sn.charAt(0).toUpperCase() === 'H';
  title.textContent = '🔢 ' + sn + ' (' + (isHebrew ? 'Hebrew' : 'Greek') + ')';
  body.innerHTML = '<div class="loading">' + t('loading') + '</div>';
  overlay.style.display = 'flex';

  if (strongsCache[sn]) { body.innerHTML = strongsCache[sn]; return; }

  var mod = isHebrew ? 'StrongsHebrew' : 'StrongsGreek';
  fetch('/api/v1/sword/' + mod + '/dict/' + sn)
    .then(function(r) { return r.json(); })
    .then(function(d) {
      var content = d.content || (d.data && d.data.content) || '';
      if (d.found || content) {
        var html = parseStrongsContent(content);
        strongsCache[sn] = html;
        body.innerHTML = html;
      } else {
        body.innerHTML = '<div class="st-def">No entry found for ' + escHtml(sn) + '</div>';
      }
    }).catch(function() { body.innerHTML = '<div class="st-def">Failed to load</div>'; });
}

function closeStrongs() { document.getElementById('strongsOverlay').style.display = 'none'; }

function parseStrongsContent(raw) {
  if (!raw) return '<div class="st-def">(no definition)</div>';
  if (raw.indexOf('<entryFree') !== -1 || raw.indexOf('<orth>') !== -1) {
    var m0 = raw.match(/<orth[^>]*>([^<]+)<\/orth>/);
    var mT = raw.match(/<orth[^>]*type="trans"[^>]*>([^<]+)<\/orth>/);
    var mP = raw.match(/<pron[^>]*>([^<]+)<\/pron>/);
    var mD = raw.match(/<def>\s*([\s\S]*?)\s*<\/def>/);
    var h = '';
    if (m0) h += '<div class="st-head">' + escHtml(m0[1]) + (mT ? ' <span style="font-weight:400;color:#9499b3">' + escHtml(mT[1]) + '</span>' : '') + '</div>';
    if (mP) h += '<div class="st-pron">' + escHtml(mP[1]) + '</div>';
    if (mD) h += '<div class="st-def">' + escHtml(mD[1].replace(/<lb\/>/g,'').replace(/--/g,'—').trim()) + '</div>';
    return h || '<div class="st-def">(no definition)</div>';
  }
  var lines = raw.split(/\n/);
  var head = '', i = 0;
  while (i < lines.length && /^\s*\d+/.test(lines[i])) { head += lines[i].trim() + ' '; i++; }
  var def = lines.slice(i).join(' ').replace(/\s+/g,' ').trim();
  head = head.replace(/\\$/,'').trim();
  var h2 = '';
  if (head) h2 += '<div class="st-head">' + escHtml(head) + '</div>';
  if (def) {
    var kj = def.indexOf('--');
    var md = def, kp = '';
    if (kj !== -1) { md = def.substring(0,kj).trim(); kp = def.substring(kj+2).trim(); }
    h2 += '<div class="st-def">' + escHtml(md) + '</div>';
    if (kp) h2 += '<div class="st-kjv">KJV: ' + escHtml(kp) + '</div>';
  }
  return h2 || '<div class="st-def">(no definition)</div>';
}

function showTooltip(event, html) {
  var el = document.getElementById('strongsTooltip');
  el.innerHTML = html;
  el.style.display = 'block';
  var x = event.clientX + 14, y = event.clientY - 8;
  var vw = window.innerWidth, vh = window.innerHeight;
  if (x + 300 > vw) x = Math.max(4, event.clientX - 300);
  if (y + 200 > vh) y = Math.max(4, event.clientY - 200);
  el.style.left = x + 'px'; el.style.top = y + 'px';
  setTimeout(function() { el.style.display = 'none'; }, 5000);
}

// ═══════════════════════════════════════════
//  COMMENTARY
// ═══════════════════════════════════════════
function loadCommentaries() {
  var bookId = state.currentBook.id.toLowerCase();
  var ch = state.currentChapter;
  apiGet('/annotations/commentaries/' + bookId + '/' + ch).then(function(data) {
    state.commentaries = data;
    if (data.commentaries && data.commentaries.length > 0) {
      state.activeCommentary = data.commentaries[0].source || data.commentaries[0].sourceName || '';
    }
    renderCommentaryTabs(); renderCommentaryBody();
  }).catch(function() {
    state.commentaries = null;
    renderCommentaryTabs(); renderCommentaryBody();
  });
}

function renderCommentaryTabs() {
  var c = document.getElementById('commentaryTabs');
  if (!state.commentaries || !state.commentaries.commentaries || !state.commentaries.commentaries.length) {
    c.innerHTML = ''; return;
  }
  var html = '', seen = {};
  state.commentaries.commentaries.forEach(function(cm) {
    var key = cm.source || cm.sourceName || '';
    if (!key || seen[key]) return;
    seen[key] = true;
    var name = COMMENTARY_LABELS[key] || cm.sourceName || key;
    html += '<div class="cmt-tab' + (key === state.activeCommentary ? ' active' : '') + '" data-cmt="' + escHtml(key) + '">' + escHtml(name) + '</div>';
  });
  c.innerHTML = html;
  c.querySelectorAll('.cmt-tab').forEach(function(el) {
    el.addEventListener('click', function() {
      state.activeCommentary = el.dataset.cmt;
      renderCommentaryTabs(); renderCommentaryBody();
    });
  });
}

function renderCommentaryBody() {
  var body = document.getElementById('commentaryBody');
  if (!state.commentaries || !state.commentaries.commentaries || !state.commentaries.commentaries.length) {
    body.innerHTML = '<div class="cmt-empty">' + t('noCommentary') + '</div>'; return;
  }
  var entries = state.commentaries.commentaries.filter(function(c) {
    return (c.source || c.sourceName) === state.activeCommentary;
  });
  if (!entries.length) { body.innerHTML = '<div class="cmt-empty">' + t('noCommentary') + '</div>'; return; }
  var html = '';
  entries.forEach(function(c) {
    var text = stripOsisTags(c.text || c.content || '');
    if (text) html += '<div class="cmt-entry">' + escHtml(text) + '</div>';
  });
  body.innerHTML = html || '<div class="cmt-empty">' + t('noCommentary') + '</div>';
}

// ═══════════════════════════════════════════
//  SEARCH
// ═══════════════════════════════════════════
function doSearch() {
  var query = document.getElementById('searchInput').value.trim();
  if (!query) return;
  state.searchQuery = query;
  document.getElementById('searchResults').innerHTML = '<div class="loading">' + t('searching') + '</div>';
  var tr = state.currentTranslation;
  var searchable = ['kjv','web','asv','bbe','dby','wbt','ylt','cuv_gb'];
  if (searchable.indexOf(tr) < 0) tr = 'kjv';
  apiGet('/search?query=' + encodeURIComponent(query) + '&translation=' + tr + '&page=0&size=30')
    .then(function(data) { state.searchResults = data; renderSearchResults(); })
    .catch(function() { document.getElementById('searchResults').innerHTML = '<div class="loading">' + t('failed') + '</div>'; });
}

function renderSearchResults() {
  var el = document.getElementById('searchResults');
  var data = state.searchResults;
  if (!data || !data.results || !data.results.length) {
    el.innerHTML = '<div class="loading">' + t('noResults') + '</div>'; return;
  }
  var html = '<div style="color:var(--text2);font-size:13px;margin-bottom:8px">' + (data.total || data.results.length) + ' ' + t('results') + '</div>';
  data.results.forEach(function(r) {
    var ref = (r.book || r.bookId || '') + ' ' + (r.chapter || '') + ':' + (r.verse || '');
    var text = r.text || '';
    var q = state.searchQuery.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    var highlighted = escHtml(text).replace(new RegExp('(' + q + ')', 'gi'), '<mark>$1</mark>');
    html += '<div class="search-result-item"><div class="sr-ref">' + escHtml(ref) + '</div><div class="sr-text">' + highlighted + '</div></div>';
  });
  el.innerHTML = html;
}

// ═══════════════════════════════════════════
//  DICTIONARY (Easton + ISBE + Nave + Strong's)
// ═══════════════════════════════════════════
function doDictSearch() {
  var query = document.getElementById('dictSearchInput').value.trim();
  if (!query) return;
  var el = document.getElementById('dictResults');
  el.innerHTML = '<div class="loading">' + t('searching') + '</div>';
  var dicts = ['easton', 'isbe', 'nave'];
  var all = [], pending = dicts.length;
  dicts.forEach(function(d) {
    fetch('/api/v1/annotations/dictionaries/' + d + '?search=' + encodeURIComponent(query))
      .then(function(r) { return r.json(); })
      .then(function(data) {
        (data.entries || []).forEach(function(e) { e.source = DICT_NAMES[d] || d; all.push(e); });
      }).catch(function() {})
      .then(function() {
        pending--;
        if (pending === 0) {
          fetch('/api/v1/strongs/search?q=' + encodeURIComponent(query))
            .then(function(r) { return r.json(); })
            .then(function(sd) {
              (sd.matches || []).forEach(function(m) {
                all.push({ source:"Strong's", entryId:(m.prefix+m.number), definition:m.definition||'', word:m.original_word||'' });
              });
              renderDictResults(all);
            }).catch(function() { renderDictResults(all); });
        }
      });
  });
}

function renderDictResults(results) {
  var el = document.getElementById('dictResults');
  if (!results || !results.length) {
    el.innerHTML = '<div class="loading">' + t('noResults') + '</div>'; return;
  }
  var html = '<div style="color:var(--text2);font-size:13px;margin-bottom:8px">' + results.length + ' ' + t('results') + '</div>';
  results.forEach(function(r) {
    var word = r.entryId || r.word || r.term || r.title || '';
    var def = stripOsisTags(r.definition || r.text || r.content || '');
    var src = r.source || '';
    html += '<div class="search-result-item">' +
      '<div class="sr-ref">' + escHtml(word) + (src ? ' <span style="color:var(--text2);font-size:11px">[' + escHtml(src) + ']</span>' : '') + '</div>' +
      '<div class="sr-text">' + escHtml(def.substring(0, 300)) + (def.length > 300 ? '...' : '') + '</div></div>';
  });
  el.innerHTML = html;
}

// ═══════════════════════════════════════════
//  DEVOTION
// ═══════════════════════════════════════════
var devotionState = { module:'SME', currentKey:null, keys:[] };

function loadDevotion() {
  document.getElementById('devotionContent').innerHTML = '<div class="loading">' + t('devotionLoading') + '</div>';
  var now = new Date();
  var mm = String(now.getMonth() + 1).padStart(2, '0');
  var dd = String(now.getDate()).padStart(2, '0');
  devotionState.currentKey = mm + '.' + dd;
  document.getElementById('devDate').textContent = now.getFullYear() + '-' + mm + '-' + dd;
  if (!devotionState.keys.length) {
    fetch('/api/v1/sword/genbook/' + devotionState.module + '/keys?offset=0&limit=366')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var kd = data.data || data;
        devotionState.keys = (kd.keys || []).map(function(k) {
          return typeof k === 'string' ? k : (k.osisRef || k.name || '');
        });
        loadDevotionContent(mm + '.' + dd);
      }).catch(function() { document.getElementById('devotionContent').innerHTML = '<div class="loading">' + t('devotionError') + '</div>'; });
  } else { loadDevotionContent(mm + '.' + dd); }
}

function loadDevotionContent(key) {
  fetch('/api/v1/sword/genbook/' + devotionState.module + '/content?key=' + encodeURIComponent(key))
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var d = data.data || data;
      var text = stripOsisTags(d.content || data.content || '');
      document.getElementById('devotionContent').innerHTML = text || '<div class="loading">' + t('devotionNoContent') + '</div>';
    }).catch(function() { document.getElementById('devotionContent').innerHTML = '<div class="loading">' + t('devotionError') + '</div>'; });
}

function changeDevDay(delta) {
  var now = new Date();
  var target = new Date(now.getTime() + delta * 86400000);
  var mm = String(target.getMonth() + 1).padStart(2, '0');
  var dd = String(target.getDate()).padStart(2, '0');
  devotionState.currentKey = mm + '.' + dd;
  document.getElementById('devDate').textContent = target.getFullYear() + '-' + mm + '-' + dd;
  loadDevotionContent(mm + '.' + dd);
}

// ═══════════════════════════════════════════
//  MAPS
// ═══════════════════════════════════════════
var mapsState = { modules:[], currentModule:'', maps:[], currentIndex:0 };

function loadMaps() {
  var el = document.getElementById('mapsView');
  el.innerHTML = '<div class="loading">' + t('loading') + '</div>';
  fetch('/api/v1/sword/modules')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var mapMods = (data.modules || []).filter(function(m) { return m.category === 'MAPS'; });
      mapsState.modules = mapMods;
      if (!mapMods.length) {
        el.innerHTML = '<div class="loading">' + t('noMaps') + '</div>'; return;
      }
      // Build UI
      var html = '<div class="maps-module-sel">' +
        '<select id="mapsModuleSelect" class="trans-select" style="max-width:100%">';
      mapMods.forEach(function(m) {
        html += '<option value="' + escHtml(m.initials) + '">' + escHtml(m.name) + '</option>';
      });
      html += '</select></div>';
      html += '<div id="mapsGrid" class="maps-grid"></div>';
      el.innerHTML = html;
      var sel = document.getElementById('mapsModuleSelect');
      sel.onchange = function() { switchMapsModule(sel.value); };
      if (mapMods.length > 0) switchMapsModule(mapMods[0].initials);
    }).catch(function() { el.innerHTML = '<div class="loading">' + t('failed') + '</div>'; });
}

function switchMapsModule(mod) {
  mapsState.currentModule = mod;
  var grid = document.getElementById('mapsGrid');
  if (!grid) return;
  grid.innerHTML = '<div class="loading">' + t('loading') + '</div>';
  fetch('/api/v1/sword/genbook/' + encodeURIComponent(mod) + '/keys')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var kd = data.data || data;
      mapsState.maps = kd.keys || [];
      renderMapThumbnails();
    }).catch(function() { grid.innerHTML = '<div class="loading">' + t('failed') + '</div>'; });
}

function renderMapThumbnails() {
  var grid = document.getElementById('mapsGrid');
  if (!grid) return;
  if (!mapsState.maps.length) { grid.innerHTML = '<div class="loading">' + t('noMaps') + '</div>'; return; }
  var html = '';
  mapsState.maps.forEach(function(m, i) {
    var imgUrl = '/api/v1/sword/genbook/' + encodeURIComponent(mapsState.currentModule) + '/image?key=' + encodeURIComponent(m.osisRef);
    html += '<div class="map-thumb" data-idx="' + i + '">' +
      '<img src="' + imgUrl + '" alt="' + escHtml(m.name) + '" loading="lazy">' +
      '<div class="map-thumb-title">' + escHtml(m.name) + '</div></div>';
  });
  grid.innerHTML = html;
  grid.querySelectorAll('.map-thumb').forEach(function(el) {
    el.addEventListener('click', function() { openMapImage(parseInt(el.dataset.idx)); });
  });
}

function openMapImage(index) {
  mapsState.currentIndex = index;
  var m = mapsState.maps[index];
  if (!m) return;
  var url = '/api/v1/sword/genbook/' + encodeURIComponent(mapsState.currentModule) + '/image?key=' + encodeURIComponent(m.osisRef);
  var overlay = document.getElementById('mapImageOverlay');
  overlay.innerHTML = '<div class="map-viewer">' +
    '<div class="map-viewer-header">' +
      '<span class="map-viewer-title">' + escHtml(m.name) + '</span>' +
      '<button class="icon-btn" onclick="closeMapImage()">✕</button>' +
    '</div>' +
    '<div class="map-viewer-body">' +
      '<img src="' + url + '" alt="' + escHtml(m.name) + '">' +
    '</div>' +
    '<div class="map-viewer-nav">' +
      '<button class="icon-btn" onclick="navigateMap(-1)" ' + (index <= 0 ? 'disabled' : '') + '>←</button>' +
      '<span style="color:var(--text2);font-size:13px">' + (index + 1) + ' / ' + mapsState.maps.length + '</span>' +
      '<button class="icon-btn" onclick="navigateMap(1)" ' + (index >= mapsState.maps.length - 1 ? 'disabled' : '') + '>→</button>' +
    '</div></div>';
  overlay.style.display = 'flex';
}

function closeMapImage() { document.getElementById('mapImageOverlay').style.display = 'none'; }

function navigateMap(delta) {
  var newIdx = mapsState.currentIndex + delta;
  if (newIdx >= 0 && newIdx < mapsState.maps.length) openMapImage(newIdx);
}

// ═══════════════════════════════════════════
//  TTS — Single Verse & Chapter Read
// ═══════════════════════════════════════════
function initTTS() {
  if (!window.speechSynthesis) return;
  state.tts.voices = window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = function() {
    state.tts.voices = window.speechSynthesis.getVoices();
  };
}

function getTTSCfg() {
  var voices = state.tts.voices || (window.speechSynthesis ? window.speechSynthesis.getVoices() : []);
  var isZh = state.currentTranslation.startsWith('cuv') || isSwordOnlyTranslation(state.currentTranslation);
  var voice = null;
  if (isZh) {
    voice = voices.find(function(v) { return v.lang.startsWith('zh') || v.lang.startsWith('cmn'); });
  }
  if (!voice) {
    voice = voices.find(function(v) { return v.lang.startsWith('en') && v.name.indexOf('Google') < 0; });
  }
  if (!voice && voices.length) voice = voices[0];
  return { voice: voice, rate: 0.9, pitch: 1.0 };
}

function cleanForTTS(text) {
  return stripOsisTags(text || '').replace(/\s+/g, ' ').trim();
}

function speakVerse(verseNum) {
  if (!state.verses || !state.verses.verses) return;
  // If already speaking this verse, stop
  if (state.tts.currentVerse === verseNum && state.tts.playing) { stopTTS(); return; }
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
    updateLabels();
  };
  utterance.onerror = function() {
    state.tts.playing = false;
    state.tts.currentVerse = -1;
    highlightSpeakingVerse();
    updateLabels();
  };

  window.speechSynthesis.speak(utterance);
  updateLabels();
}

function speakChapter() {
  if (state.tts.playing) { stopTTS(); return; }
  if (!state.verses || !state.verses.verses) return;
  stopTTS();

  var verses = state.verses.verses.slice().filter(function(v) { return v.verse > 0; });
  if (!verses.length) return;

  var cfg = getTTSCfg();
  state.tts.playing = true;
  state.tts.chapterIdx = 0;
  state.tts.chapterVerses = verses;

  function speakNext() {
    if (!state.tts.playing) return;
    var idx = state.tts.chapterIdx;
    if (idx >= verses.length) {
      state.tts.playing = false;
      state.tts.currentVerse = -1;
      highlightSpeakingVerse();
      updateLabels();
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

  updateLabels();
  speakNext();
}

function stopTTS() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  state.tts.playing = false;
  state.tts.currentVerse = -1;
  state.tts.chapterIdx = 0;
  state.tts.chapterVerses = [];
  highlightSpeakingVerse();
  updateLabels();
}

function highlightSpeakingVerse() {
  document.querySelectorAll('.verse-line.speaking').forEach(function(el) {
    el.classList.remove('speaking');
  });
  if (state.tts.currentVerse > 0) {
    document.querySelectorAll('.verse-line').forEach(function(el) {
      if (parseInt(el.dataset.verse) === state.tts.currentVerse) {
        el.classList.add('speaking');
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }
}

// ═══════════════════════════════════════════
//  FONT SIZE
// ═══════════════════════════════════════════
function applyFontSize() { document.documentElement.style.fontSize = state.fontSize + 'px'; }
function adjustFont(delta) {
  state.fontSize = Math.max(12, Math.min(24, state.fontSize + delta));
  localStorage.setItem('bible-font-size', String(state.fontSize));
  applyFontSize();
  document.getElementById('fontSizeDisplay').textContent = state.fontSize + 'px';
}
function openFontSettings() {
  closeMore();
  document.getElementById('fontOverlay').style.display = 'flex';
  document.getElementById('fontSizeDisplay').textContent = state.fontSize + 'px';
}
function closeFont() { document.getElementById('fontOverlay').style.display = 'none'; }

// ═══════════════════════════════════════════
//  UI HELPERS
// ═══════════════════════════════════════════
function switchView(view) {
  state.view = view;
  document.getElementById('verseContent').style.display = view === 'reader' ? 'block' : 'none';
  document.getElementById('chapterHeader').style.display = view === 'reader' ? 'block' : 'none';
  document.getElementById('chapterNav').style.display = view === 'reader' ? 'flex' : 'none';
  document.getElementById('searchView').style.display = view === 'search' ? 'block' : 'none';
  document.getElementById('devotionView').style.display = view === 'devotion' ? 'block' : 'none';
  document.getElementById('dictView').style.display = view === 'dict' ? 'block' : 'none';
  var mapsV = document.getElementById('mapsView');
  if (mapsV) mapsV.style.display = view === 'maps' ? 'block' : 'none';
  var planV = document.getElementById('planView');
  if (planV) planV.style.display = view === 'plan' ? 'block' : 'none';

  // Commentary opens as drawer
  if (view === 'commentary') {
    openCommentary();
    view = 'reader'; state.view = 'reader';
    document.getElementById('verseContent').style.display = 'block';
    document.getElementById('chapterHeader').style.display = 'block';
    document.getElementById('chapterNav').style.display = 'flex';
  }

  document.querySelectorAll('.nav-btn').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.view === view);
  });

  if (view === 'devotion' && !devotionState.keys.length) loadDevotion();
  if (view === 'maps') loadMaps();
  if (view === 'plan') loadReadingPlan();
}

function openDrawer() {
  document.getElementById('drawer').classList.add('open');
  document.getElementById('drawerOverlay').classList.add('open');
}
function closeDrawer() {
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('drawerOverlay').classList.remove('open');
}
function openCommentary() {
  document.getElementById('commentaryDrawer').classList.add('open');
  document.getElementById('commentaryOverlay').classList.add('open');
}
function closeCommentary() {
  document.getElementById('commentaryDrawer').classList.remove('open');
  document.getElementById('commentaryOverlay').classList.remove('open');
}
function closeMore() { document.getElementById('moreOverlay').style.display = 'none'; }

// ═══════════════════════════════════════════
//  SWIPE GESTURE
// ═══════════════════════════════════════════
function setupSwipeNav() {
  var startX = 0, startY = 0, isSwiping = false;
  var content = document.getElementById('verseContent');
  content.addEventListener('touchstart', function(e) {
    startX = e.touches[0].clientX; startY = e.touches[0].clientY; isSwiping = false;
  }, { passive: true });
  content.addEventListener('touchmove', function(e) {
    if (e.touches.length !== 1) return;
    var dx = e.touches[0].clientX - startX, dy = e.touches[0].clientY - startY;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 2) isSwiping = true;
  }, { passive: true });
  content.addEventListener('touchend', function(e) {
    if (!isSwiping) return;
    var dx = e.changedTouches[0].clientX - startX;
    if (dx > 80) prevChapter();
    else if (dx < -80) nextChapter();
  }, { passive: true });

  if (!localStorage.getItem('swipe-hint-shown')) {
    var hint = document.getElementById('swipeHint');
    hint.style.display = 'block';
    setTimeout(function() { hint.style.display = 'none'; }, 4000);
    localStorage.setItem('swipe-hint-shown', '1');
  }
}

// ═══════════════════════════════════════════
//  Reading Plan (读经计划)
// ═══════════════════════════════════════════
var planState = {
  plans: [],
  currentPlan: null,
  currentDay: 1,
  todayReading: null,
  progress: {},  // { dayNum: { readCount, completed } } from localStorage or API
  selectedDay: 1
};

var PLAN_NAMES_ZH = {
  mcheyne: "麦切恩一年读经计划",
  nt90: "90天新约读经计划",
  proverbs30: "30天箴言计划"
};

function loadReadingPlan() {
  if (!planState.plans.length) {
    fetch('/api/v1/reading-plans')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        planState.plans = data;
        // Auto-select from localStorage or first plan
        var saved = localStorage.getItem('rp_plan');
        if (saved && data.some(function(p) { return p.planCode === saved; })) {
          planState.currentPlan = saved;
        } else {
          planState.currentPlan = data[0].planCode;
        }
        loadPlanProgress();
        renderPlanView();
      })
      .catch(function() {
        document.getElementById('planView').innerHTML = '<div class="loading">Failed to load plans</div>';
      });
  } else {
    renderPlanView();
  }
}

function renderPlanView() {
  var html = '';
  
  // Plan selector
  html += '<div class="plan-header">';
  html += '<select id="planSelect" class="plan-select" onchange="switchPlan(this.value)">';
  planState.plans.forEach(function(p) {
    var nameZh = PLAN_NAMES_ZH[p.planCode] || p.planName;
    var sel = p.planCode === planState.currentPlan ? ' selected' : '';
    html += '<option value="' + p.planCode + '"' + sel + '>' + nameZh + '</option>';
  });
  html += '</select>';
  html += '</div>';
  
  // Today's reading card
  html += '<div class="plan-today-card">';
  html += '<div class="plan-today-header">';
  html += '<span class="plan-day-label">Day ' + planState.currentDay + '</span>';
  html += '<span class="plan-date-label" id="planDate"></span>';
  html += '</div>';
  html += '<div id="planReadings" class="plan-readings"><div class="loading">Loading...</div></div>';
  html += '<div class="plan-actions">';
  html += '<button class="plan-check-btn" id="planCheckBtn" onclick="togglePlanComplete()">✓ Mark Complete</button>';
  html += '</div>';
  html += '</div>';
  
  // Progress bar
  var completed = 0;
  var total = 0;
  var plan = planState.plans.find(function(p) { return p.planCode === planState.currentPlan; });
  if (plan) {
    total = plan.numberOfDays;
    for (var d = 1; d <= total; d++) {
      if (planState.progress[d] && planState.progress[d].completed) completed++;
    }
  }
  var pct = total > 0 ? Math.round(completed / total * 100) : 0;
  html += '<div class="plan-progress-bar">';
  html += '<div class="plan-progress-fill" style="width:' + pct + '%"></div>';
  html += '<span class="plan-progress-text">' + completed + '/' + total + ' (' + pct + '%)</span>';
  html += '</div>';
  
  // Day navigator
  html += '<div class="plan-day-nav">';
  html += '<button class="icon-btn" onclick="changePlanDay(-1)">◀</button>';
  html += '<span id="planDayDisplay">Day ' + planState.selectedDay + '</span>';
  html += '<button class="icon-btn" onclick="changePlanDay(1)">▶</button>';
  html += '<button class="plan-today-btn" onclick="goToToday()">Today</button>';
  html += '</div>';
  
  // Calendar grid (mini)
  html += '<div class="plan-calendar" id="planCalendar"></div>';
  
  document.getElementById('planView').innerHTML = html;
  
  // Load today's reading
  loadPlanDay(planState.currentDay);
  renderPlanCalendar();
}

function switchPlan(code) {
  planState.currentPlan = code;
  planState.selectedDay = 1;
  localStorage.setItem('rp_plan', code);
  loadPlanProgress();
  renderPlanView();
}

function loadPlanDay(day) {
  planState.selectedDay = day;
  var display = document.getElementById('planDayDisplay');
  if (display) display.textContent = 'Day ' + day;
  
  fetch('/api/v1/reading-plans/' + planState.currentPlan + '/day/' + day)
    .then(function(r) { return r.json(); })
    .then(function(data) {
      planState.todayReading = data;
      var html = '';
      data.readings.forEach(function(r, i) {
        var done = planState.progress[day] && planState.progress[day].readCount > i;
        var cls = done ? ' plan-reading-done' : '';
        html += '<div class="plan-reading-item' + cls + '" onclick="goToReading(\'' + r.bookId + '\',' + r.chapterStart + ',' + r.chapterEnd + ',' + i + ',' + day + ')"';
        html += ' style="display:flex;align-items:center;gap:10px;padding:10px 12px;margin-bottom:6px;background:var(--bg-input,#14161e);border-radius:8px;cursor:pointer;transition:background .15s"';
        html += ' ontouchstart="this.style.background=\'var(--bg-hover,#1f2230)\'" ontouchend="this.style.background=\'var(--bg-input,#14161e)\'"';
        html += '>';
        html += '<span class="plan-reading-check" style="font-size:18px;color:var(--accent,#4a9eff)">' + (done ? '✓' : '○') + '</span>';
        html += '<span class="plan-reading-label" style="flex:1;font-size:15px">' + r.label + '</span>';
        html += '<span style="font-size:14px;color:var(--text-dim,#888)">📖 →</span>';
        html += '</div>';
      });
      document.getElementById('planReadings').innerHTML = html;
      
      // Update date
      var dateEl = document.getElementById('planDate');
      if (dateEl) {
        fetch('/api/v1/reading-plans/' + planState.currentPlan + '/today')
          .then(function(r) { return r.json(); })
          .then(function(d) { if (dateEl) dateEl.textContent = d.date || ''; })
          .catch(function() {});
      }
      
      // Update check button
      updateCheckButton(day);
    })
    .catch(function() {
      document.getElementById('planReadings').innerHTML = '<div class="loading">Failed to load</div>';
    });
}

function goToReading(bookId, chStart, chEnd, readingIdx, day) {
  // Mark this reading as read
  if (!planState.progress[day]) planState.progress[day] = { readCount: 0, completed: false };
  var currentRead = planState.progress[day].readCount;
  if (currentRead <= readingIdx) {
    planState.progress[day].readCount = readingIdx + 1;
  }
  savePlanProgress();
  
  // Navigate to the chapter in reader
  var book = findBookByOsisId(bookId);
  if (book) {
    state.currentBook = book;
    state.currentChapter = chStart;
    loadChapter();
    switchView('reader');
  }
  
  // Re-render to update checkmarks
  loadPlanDay(day);
}

// OSIS short name -> BOOK_ORDER id mapping
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

function findBookByOsisId(osisId) {
  // Try direct match first
  for (var i = 0; i < BOOK_ORDER.length; i++) {
    if (BOOK_ORDER[i].id === osisId) return BOOK_ORDER[i];
  }
  // Try OSIS short name mapping
  var mappedId = OSIS_TO_ID[osisId];
  if (mappedId) {
    for (var i = 0; i < BOOK_ORDER.length; i++) {
      if (BOOK_ORDER[i].id === mappedId) return BOOK_ORDER[i];
    }
  }
  // Try case-insensitive match
  var upper = osisId.toUpperCase();
  for (var i = 0; i < BOOK_ORDER.length; i++) {
    if (BOOK_ORDER[i].id === upper) return BOOK_ORDER[i];
  }
  return null;
}

function togglePlanComplete() {
  var day = planState.selectedDay;
  if (!planState.progress[day]) planState.progress[day] = { readCount: 0, completed: false };
  planState.progress[day].completed = !planState.progress[day].completed;
  if (planState.progress[day].completed) {
    var plan = planState.plans.find(function(p) { return p.planCode === planState.currentPlan; });
    var reading = planState.todayReading;
    if (reading) planState.progress[day].readCount = reading.readings.length;
  }
  savePlanProgress();
  updateCheckButton(day);
  renderPlanView();
}

function updateCheckButton(day) {
  var btn = document.getElementById('planCheckBtn');
  if (!btn) return;
  var isDone = planState.progress[day] && planState.progress[day].completed;
  btn.textContent = isDone ? '✓ Completed' : '✓ Mark Complete';
  btn.classList.toggle('plan-check-done', isDone);
}

function changePlanDay(delta) {
  var plan = planState.plans.find(function(p) { return p.planCode === planState.currentPlan; });
  if (!plan) return;
  var newDay = planState.selectedDay + delta;
  if (newDay < 1) newDay = 1;
  if (newDay > plan.numberOfDays) newDay = plan.numberOfDays;
  loadPlanDay(newDay);
  renderPlanCalendar();
}

function goToToday() {
  loadPlanDay(planState.currentDay);
  renderPlanCalendar();
}

function renderPlanCalendar() {
  var cal = document.getElementById('planCalendar');
  if (!cal) return;
  var plan = planState.plans.find(function(p) { return p.planCode === planState.currentPlan; });
  if (!plan) return;
  
  var html = '';
  var total = plan.numberOfDays;
  var cols = total > 100 ? 15 : (total > 30 ? 10 : 7);
  
  for (var d = 1; d <= total; d++) {
    var isDone = planState.progress[d] && planState.progress[d].completed;
    var isToday = d === planState.currentDay;
    var isSelected = d === planState.selectedDay;
    var cls = 'plan-cal-day';
    if (isDone) cls += ' plan-cal-done';
    if (isToday) cls += ' plan-cal-today';
    if (isSelected) cls += ' plan-cal-selected';
    html += '<div class="' + cls + '" onclick="loadPlanDay(' + d + ');renderPlanCalendar();">' + d + '</div>';
  }
  cal.innerHTML = html;
  cal.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';
}

function loadPlanProgress() {
  // Try loading from API if logged in
  if (isLoggedIn()) {
    fetch('/api/v1/reading-plans/' + planState.currentPlan + '/progress', {
      headers: { 'Authorization': 'Bearer ' + authState.token }
    })
      .then(function(r) { if (r.ok) return r.json(); throw new Error('not logged in'); })
      .then(function(data) {
        planState.progress = {};
        (data.progress || []).forEach(function(p) {
          planState.progress[p.day] = { readCount: p.readCount, completed: p.completed };
        });
        planState.currentDay = data.currentDay || 1;
        planState.selectedDay = planState.currentDay;
        if (document.getElementById('planView')) renderPlanView();
      })
      .catch(function() {
        // Fallback to localStorage
        loadPlanProgressLocal();
      });
  } else {
    loadPlanProgressLocal();
  }
}

function loadPlanProgressLocal() {
  var saved = localStorage.getItem('rp_progress_' + planState.currentPlan);
  if (saved) {
    try { planState.progress = JSON.parse(saved); } catch(e) { planState.progress = {}; }
  } else {
    planState.progress = {};
  }
  // Get current day from API
  fetch('/api/v1/reading-plans/' + planState.currentPlan + '/today')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      planState.currentDay = data.day || 1;
      planState.selectedDay = planState.currentDay;
      if (document.getElementById('planView')) renderPlanView();
    })
    .catch(function() {});
}

function savePlanProgress() {
  if (isLoggedIn()) {
    // Save to API
    var day = planState.selectedDay;
    var p = planState.progress[day] || { readCount: 0, completed: false };
    fetch('/api/v1/reading-plans/' + planState.currentPlan + '/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authState.token },
      body: JSON.stringify({ planCode: planState.currentPlan, day: day, readCount: p.readCount, completed: p.completed })
    }).catch(function() {});
  } else {
    // Save to localStorage
    localStorage.setItem('rp_progress_' + planState.currentPlan, JSON.stringify(planState.progress));
  }
}

// ═══════════════════════════════════════════
//  PWA Service Worker
// ═══════════════════════════════════════════
if ('serviceWorker' in navigator) {
  var swCode = [
    'var CACHE="bible-mobile-v3";',
    'self.addEventListener("install",function(e){self.skipWaiting();});',
    'self.addEventListener("activate",function(e){e.waitUntil(self.clients.claim());});',
    'self.addEventListener("fetch",function(e){',
    '  if(e.request.method!=="GET")return;',
    '  e.respondWith(',
    '    caches.open(CACHE).then(function(cache){',
    '      return cache.match(e.request).then(function(cached){',
    '        var fetchPromise=fetch(e.request).then(function(response){',
    '          if(response.ok&&e.request.url.indexOf("/api/")<0)cache.put(e.request,response.clone());',
    '          return response;',
    '        }).catch(function(){return cached;});',
    '        return cached||fetchPromise;',
    '      });',
    '    })',
    '  );',
    '});'
  ].join('\n');
  try {
    var blob = new Blob([swCode], { type: 'application/javascript' });
    navigator.serviceWorker.register(URL.createObjectURL(blob)).catch(function() {});
  } catch(e) {}
}
