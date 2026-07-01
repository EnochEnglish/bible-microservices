// Library Page — Christian Classics Reader
// Uses existing SWORD GenBook API: /api/v1/sword/genbook/{module}/keys and /content

var API = (typeof API_BASE !== 'undefined') ? API_BASE : '';
var libState = {
  lang: 'bilingual',
  books: [],
  currentBook: null,
  currentKeys: [],
  currentKeyIndex: -1,
  filter: 'all',
  searchQuery: '',
  fontSize: 18,
  theme: 'dark'
};

// ─── Book metadata (Chinese names + descriptions) ───
var BOOK_META_ZH = {
  'Imitation': { name: '效法基督', author: '托马斯·肯培' },
  'Institutes': { name: '基督教要义', author: '加尔文' },
  'Pilgrim': { name: '天路历程', author: '约翰·班扬' },
  'DarkNightOfTheSoul': { name: '灵魂黑夜', author: '十架约翰' },
  'Practice': { name: '与神同在', author: '劳伦斯弟兄' },
  'JEAffections': { name: '宗教情感', author: '爱德华兹' },
  'JESermons': { name: '爱德华兹讲道集', author: '爱德华兹' },
  'JOChrist': { name: '基督论', author: '约翰·欧文' },
  'JOCommGod': { name: '与神交通', author: '约翰·欧文' },
  'JOGlory': { name: '基督的荣耀', author: '约翰·欧文' },
  'JOMortSin': { name: '治死罪', author: '约翰·欧文' },
  'EMBReality': { name: '祷告的真实', author: '邦兹' },
  'Finney': { name: '芬尼讲道集', author: '芬尼' },
  'Heretics': { name: '异端', author: '切斯特顿' },
  'Orthodoxy': { name: '正统', author: '切斯特顿' },
  'Josephus': { name: '约瑟夫全集', author: '约瑟夫' },
  'Summa': { name: '神学大全', author: '阿奎那' },
  'Enoch': { name: '以诺书', author: '佚名' },
  'Jubilees': { name: '禧年书', author: '佚名' },
  'Passion': { name: '主的受难', author: '艾默里克' },
  'Didache': { name: '十二使徒遗训', author: '佚名' },
  'Concord': { name: '协和书', author: '路德宗' },
  'Westminster': { name: '威斯敏斯特信条', author: '威斯敏斯特会议' },
  'Westminster21': { name: '威斯敏斯特信条(现代版)', author: '威斯敏斯特会议' },
  'BaptistConfession1646': { name: '浸信会信条(1646)', author: '伦敦浸信会' },
  'BaptistConfession1689': { name: '浸信会信条(1689)', author: '伦敦浸信会' },
  'LawGospel': { name: '律法与福音', author: '华尔瑟' },
  'JCRHoliness': { name: '圣洁', author: '莱尔' },
  'MollColossians': { name: '歌罗西书灵修', author: '莫尔牧师' },
  'Phaistos': { name: '费斯托斯圆盘', author: '佚名' },
  'alzat': { name: '阿拉伯语灵修', author: '佚名' },
  'SME': { name: '清晨甘露·静夜亮光', author: '司布真' },
  'Daily': { name: '每日灵粮', author: '巴格斯特' },
  'DBD': { name: '恩典日日新', author: '霍克斯特拉' }
};

var BOOK_META_EN = {
  'Imitation': { name: 'Imitation of Christ', author: 'Thomas à Kempis' },
  'Institutes': { name: "Calvin's Institutes", author: 'John Calvin' },
  'Pilgrim': { name: "Pilgrim's Progress", author: 'John Bunyan' },
  'DarkNightOfTheSoul': { name: 'Dark Night of the Soul', author: 'St. John of the Cross' },
  'Practice': { name: 'Practice of the Presence of God', author: 'Brother Lawrence' },
  'JEAffections': { name: 'Religious Affections', author: 'Jonathan Edwards' },
  'JESermons': { name: 'Select Sermons', author: 'Jonathan Edwards' },
  'JOChrist': { name: 'Christologia', author: 'John Owen' },
  'JOCommGod': { name: 'Communion with God', author: 'John Owen' },
  'JOGlory': { name: 'The Glory of Christ', author: 'John Owen' },
  'JOMortSin': { name: 'Mortification of Sin', author: 'John Owen' },
  'EMBReality': { name: 'The Reality of Prayer', author: 'E.M. Bounds' },
  'Finney': { name: 'Sermons on Gospel Themes', author: 'Charles Finney' },
  'Heretics': { name: 'Heretics', author: 'G.K. Chesterton' },
  'Orthodoxy': { name: 'Orthodoxy', author: 'G.K. Chesterton' },
  'Josephus': { name: 'Complete Works', author: 'Josephus' },
  'Summa': { name: 'Summa Theologica', author: 'Thomas Aquinas' },
  'Enoch': { name: 'Book of Enoch', author: 'Anonymous' },
  'Jubilees': { name: 'Book of Jubilees', author: 'Anonymous' },
  'Passion': { name: 'Dolorous Passion', author: 'Anne Emmerich' },
  'Didache': { name: 'Didache', author: 'Anonymous' },
  'Concord': { name: 'Book of Concord', author: 'Lutheran Church' },
  'Westminster': { name: 'Westminster Confession', author: 'Westminster Assembly' },
  'Westminster21': { name: 'Westminster (Modern English)', author: 'Westminster Assembly' },
  'BaptistConfession1646': { name: 'Baptist Confession 1646', author: 'London Baptists' },
  'BaptistConfession1689': { name: 'Baptist Confession 1689', author: 'London Baptists' },
  'LawGospel': { name: 'Law and Gospel', author: 'C.F.W. Walther' },
  'JCRHoliness': { name: 'Holiness', author: 'J.C. Ryle' },
  'MollColossians': { name: 'Colossians Devotions', author: 'Pastor Randy Moll' },
  'Phaistos': { name: 'Phaistos Disk', author: 'Anonymous' },
  'alzat': { name: 'Arabic Devotional', author: 'Anonymous' },
  'SME': { name: 'Morning & Evening', author: 'C.H. Spurgeon' },
  'Daily': { name: 'Daily Light', author: 'Jonathan Bagster' },
  'DBD': { name: 'Day by Day by Grace', author: 'Bob Hoekstra' }
};

function libT(zh, en) {
  if (libState.lang === 'zh') return zh;
  if (libState.lang === 'en') return en;
  return zh + ' / ' + en;
}

function getBookMeta(initials) {
  var zh = BOOK_META_ZH[initials] || { name: initials, author: '' };
  var en = BOOK_META_EN[initials] || { name: initials, author: '' };
  if (libState.lang === 'zh') return zh;
  if (libState.lang === 'en') return en;
  return { name: zh.name + ' / ' + en.name, author: zh.author || en.author };
}

// ─── API helpers ───
function fetchJson(url) {
  return fetch(url).then(function(r) { return r.json(); });
}

// ─── Init ───
document.addEventListener('DOMContentLoaded', function() {
  // Restore preferences
  var savedLang = localStorage.getItem('lib_lang');
  if (savedLang) { libState.lang = savedLang; document.getElementById('libLangToggle').value = savedLang; }
  var savedFont = localStorage.getItem('lib_fontSize');
  if (savedFont) { libState.fontSize = parseInt(savedFont); }
  var savedTheme = localStorage.getItem('lib_theme');
  if (savedTheme) { libState.theme = savedTheme; applyTheme(); }

  document.documentElement.style.setProperty('--lib-font-size', libState.fontSize + 'px');
  document.getElementById('fontSizeLabel').textContent = libState.fontSize + 'px';

  document.getElementById('libLangToggle').addEventListener('change', function(e) {
    libState.lang = e.target.value;
    localStorage.setItem('lib_lang', libState.lang);
    renderBookshelf();
    if (libState.currentBook) updateReaderLabels();
  });

  // Search
  document.getElementById('bookSearch').addEventListener('input', function(e) {
    libState.searchQuery = e.target.value.toLowerCase();
    renderBookshelf();
  });

  // Filter buttons
  document.querySelectorAll('.lib-filter-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.lib-filter-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      libState.filter = btn.dataset.filter;
      renderBookshelf();
    });
  });

  // Reader controls
  document.getElementById('backToShelf').addEventListener('click', showBookshelf);
  document.getElementById('prevChapter').addEventListener('click', function() { navigateChapter(-1); });
  document.getElementById('nextChapter').addEventListener('click', function() { navigateChapter(1); });
  document.getElementById('chapterSelect').addEventListener('change', function(e) {
    loadChapter(parseInt(e.target.value));
  });

  // Font controls
  document.getElementById('fontDecrease').addEventListener('click', function() { changeFont(-2); });
  document.getElementById('fontIncrease').addEventListener('click', function() { changeFont(2); });
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);

  loadBooks();
});

// ─── Load book list from SWORD API ───
function loadBooks() {
  fetchJson(API + '/sword/modules')
    .then(function(data) {
      libState.books = data.modules.filter(function(m) {
        return ['GENERAL_BOOK', 'DAILY_DEVOTIONS', 'ESSAYS'].indexOf(m.category) !== -1;
      });
      renderBookshelf();
    })
    .catch(function(err) {
      document.getElementById('bookGrid').innerHTML = '<div class="lib-loading">加载失败: ' + err.message + '</div>';
    });
}

// ─── Render Bookshelf ───
function renderBookshelf() {
  var grid = document.getElementById('bookGrid');
  var books = libState.books;

  // Filter
  if (libState.filter !== 'all') {
    books = books.filter(function(b) { return b.category === libState.filter; });
  }

  // Search
  if (libState.searchQuery) {
    books = books.filter(function(b) {
      var meta = getBookMeta(b.initials);
      return (meta.name + ' ' + meta.author + ' ' + b.initials + ' ' + b.name).toLowerCase().indexOf(libState.searchQuery) !== -1;
    });
  }

  if (books.length === 0) {
    grid.innerHTML = '<div class="lib-loading">' + libT('没有找到书籍', 'No books found') + '</div>';
    return;
  }

  var html = '';
  books.forEach(function(book) {
    var meta = getBookMeta(book.initials);
    var icon = book.category === 'DAILY_DEVOTIONS' ? '📖' : (book.category === 'ESSAYS' ? '📝' : '📕');
    html += '<div class="lib-book-card" onclick="openBook(\'' + book.initials + '\')">';
    html += '  <div class="lib-book-icon">' + icon + '</div>';
    html += '  <div class="lib-book-title">' + escHtml(meta.name) + '</div>';
    html += '  <div class="lib-book-author">' + escHtml(meta.author) + '</div>';
    html += '  <div class="lib-book-lang">' + escHtml(book.language || '') + '</div>';
    html += '</div>';
  });
  grid.innerHTML = html;

  // Update shelf title
  document.getElementById('shelfTitle').textContent = libT('书架', 'Bookshelf') + ' (' + books.length + ')';
}

// ─── Open a book ───
function openBook(initials) {
  libState.currentBook = initials;
  libState.currentKeyIndex = 0;
  document.getElementById('bookshelfView').style.display = 'none';
  document.getElementById('readerView').style.display = 'block';

  var meta = getBookMeta(initials);
  document.getElementById('readerTitle').textContent = meta.name;

  // Load table of contents
  fetchJson(API + '/sword/genbook/' + initials + '/keys?limit=500')
    .then(function(data) {
      if (!data.success || !data.data || !data.data.keys) {
        document.getElementById('readerContent').innerHTML = '<div class="lib-loading">' + libT('无法加载目录', 'Failed to load contents') + '</div>';
        return;
      }
      libState.currentKeys = data.data.keys;
      renderChapterSelect();
      if (libState.currentKeys.length > 0) {
        loadChapter(0);
      }
    })
    .catch(function(err) {
      document.getElementById('readerContent').innerHTML = '<div class="lib-loading">Error: ' + escHtml(err.message) + '</div>';
    });
}

// ─── Render chapter dropdown ───
function renderChapterSelect() {
  var sel = document.getElementById('chapterSelect');
  sel.innerHTML = '';
  libState.currentKeys.forEach(function(key, i) {
    var opt = document.createElement('option');
    opt.value = i;
    // Show key name (truncate if too long)
    var name = key.name || key.key || key.osisRef || ('Chapter ' + (i + 1));
    opt.textContent = (i + 1) + '. ' + name;
    sel.appendChild(opt);
  });
}

// ─── Load a chapter ───
function loadChapter(index) {
  if (index < 0 || index >= libState.currentKeys.length) return;
  libState.currentKeyIndex = index;
  document.getElementById('chapterSelect').value = index;

  var key = libState.currentKeys[index];
  var keyRef = key.key || key.osisRef || key.name;
  if (!keyRef) return;

  document.getElementById('readerContent').innerHTML = '<div class="lib-loading">' + libT('加载中...', 'Loading...') + '</div>';

  // Update nav buttons
  document.getElementById('prevChapter').disabled = (index <= 0);
  document.getElementById('nextChapter').disabled = (index >= libState.currentKeys.length - 1);

  fetchJson(API + '/sword/genbook/' + libState.currentBook + '/content?key=' + encodeURIComponent(keyRef))
    .then(function(data) {
      if (!data.success || !data.data) {
        document.getElementById('readerContent').innerHTML = '<div class="lib-loading">' + libT('内容为空', 'No content available') + '</div>';
        return;
      }
      var content = data.data.content || data.data.html || data.data.text || '';
      // Strip OSIS/XML tags for plain reading
      content = stripTags(content);
      document.getElementById('readerContent').innerHTML = '<h2>' + escHtml(key.name || keyRef) + '</h2>' + content;
    })
    .catch(function(err) {
      document.getElementById('readerContent').innerHTML = '<div class="lib-loading">Error: ' + escHtml(err.message) + '</div>';
    });
}

// ─── Navigate chapters ───
function navigateChapter(dir) {
  loadChapter(libState.currentKeyIndex + dir);
}

// ─── Show bookshelf ───
function showBookshelf() {
  document.getElementById('readerView').style.display = 'none';
  document.getElementById('bookshelfView').style.display = 'block';
  libState.currentBook = null;
}

// ─── Font size ───
function changeFont(delta) {
  libState.fontSize = Math.max(12, Math.min(32, libState.fontSize + delta));
  document.documentElement.style.setProperty('--lib-font-size', libState.fontSize + 'px');
  document.getElementById('fontSizeLabel').textContent = libState.fontSize + 'px';
  localStorage.setItem('lib_fontSize', libState.fontSize);
}

// ─── Theme ───
function applyTheme() {
  var app = document.getElementById('library-app');
  if (libState.theme === 'light') {
    app.classList.add('lib-light-theme');
    document.getElementById('themeToggle').textContent = '☀️';
  } else {
    app.classList.remove('lib-light-theme');
    document.getElementById('themeToggle').textContent = '🌙';
  }
}
function toggleTheme() {
  libState.theme = libState.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('lib_theme', libState.theme);
  applyTheme();
}

// ─── Update reader labels on lang change ───
function updateReaderLabels() {
  if (libState.currentBook) {
    var meta = getBookMeta(libState.currentBook);
    document.getElementById('readerTitle').textContent = meta.name;
  }
  renderChapterSelect();
}

// ─── Helpers ───
function escHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function stripTags(html) {
  // Convert <p>, <div>, <br> to newlines, then strip remaining tags
  return html
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<h[1-6][^>]*>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<scripRef[^>]*>/gi, ' [')
    .replace(/<note[^>]*>[\s\S]*?<\/note>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}