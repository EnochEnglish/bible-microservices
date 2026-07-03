// Library Page — Christian Classics Reader + Static Chinese Books
// SWORD books: /api/v1/sword/genbook/{module}/keys and /content
// Static books: /library-data/{bookCode}/meta.json and {id}.json

var API = (typeof API_BASE !== 'undefined') ? API_BASE : '';
var STATIC_BASE = (typeof LIBRARY_DATA_BASE !== 'undefined') ? LIBRARY_DATA_BASE : 'library-data';

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

// ─── Static books — auto-discovered from library-data/index.json at runtime ───
var STATIC_BOOKS = []; // populated by loadBooks()

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

function getStaticBookMeta(book) {
  if (libState.lang === 'zh') return { name: book.title, author: book.author };
  if (libState.lang === 'en') return { name: book.titleEn || book.title, author: book.author };
  return { name: book.title + ' / ' + (book.titleEn || book.title), author: book.author };
}

// ─── API helpers ───
function fetchJson(url) {
  return fetch(url).then(function(r) { return r.json(); });
}

// ─── Init ───
document.addEventListener('DOMContentLoaded', function() {
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

  document.getElementById('bookSearch').addEventListener('input', function(e) {
    libState.searchQuery = e.target.value.toLowerCase();
    renderBookshelf();
  });

  document.querySelectorAll('.lib-filter-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.lib-filter-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      libState.filter = btn.dataset.filter;
      renderBookshelf();
    });
  });

  document.getElementById('backToShelf').addEventListener('click', showBookshelf);
  document.getElementById('prevChapter').addEventListener('click', function() { navigateChapter(-1); });
  document.getElementById('nextChapter').addEventListener('click', function() { navigateChapter(1); });
  document.getElementById('chapterSelect').addEventListener('change', function(e) {
    loadChapter(parseInt(e.target.value));
  });

  document.getElementById('fontDecrease').addEventListener('click', function() { changeFont(-2); });
  document.getElementById('fontIncrease').addEventListener('click', function() { changeFont(2); });
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);

  loadBooks();
});

// ─── Load book list: Static books (from index.json) + SWORD API ───
function loadBooks() {
  // First, fetch static books index (auto-discovered)
  fetchJson(STATIC_BASE + '/index.json')
    .then(function(data) {
      if (data && data.books) {
        STATIC_BOOKS = data.books.map(function(b) {
          return {
            code: b.code,
            title: b.title,
            titleEn: b.titleEn || b.title,
            author: b.author || '',
            category: b.category || '',
            icon: b.icon || '📕',
            language: b.language || 'zh'
          };
        });
      }
    })
    .catch(function(err) {
      // index.json not found — static books will be empty
    })
    .then(function() {
      // Add static books to state
      libState.books = STATIC_BOOKS.map(function(b) {
        return {
          initials: b.code,
          name: b.title,
          category: b.category,
          language: b.language,
          isStatic: true,
          _staticData: b
        };
      });

      // Then fetch SWORD books
      return fetchJson(API + '/sword/modules');
    })
    .then(function(data) {
      var swordBooks = data.modules.filter(function(m) {
        return ['GENERAL_BOOK', 'DAILY_DEVOTIONS', 'ESSAYS'].indexOf(m.category) !== -1;
      });
      swordBooks.forEach(function(b) { b.isStatic = false; });
      libState.books = libState.books.concat(swordBooks);
      renderBookshelf();
    })
    .catch(function(err) {
      // SWORD API failed — still show static books
      renderBookshelf();
    });
}

// ─── Render Bookshelf ───
function renderBookshelf() {
  var grid = document.getElementById('bookGrid');
  var books = libState.books;

  // Filter
  if (libState.filter !== 'all') {
    books = books.filter(function(b) {
      if (libState.filter === 'CHINESE_BOOK') return b.isStatic;
      return b.category === libState.filter;
    });
  }

  // Search
  if (libState.searchQuery) {
    books = books.filter(function(b) {
      var meta = b.isStatic ? getStaticBookMeta(b._staticData) : getBookMeta(b.initials);
      return (meta.name + ' ' + meta.author + ' ' + b.initials + ' ' + b.name).toLowerCase().indexOf(libState.searchQuery) !== -1;
    });
  }

  if (books.length === 0) {
    grid.innerHTML = '<div class="lib-loading">' + libT('没有找到书籍', 'No books found') + '</div>';
    return;
  }

  var html = '';
  books.forEach(function(book) {
    var meta, icon;
    if (book.isStatic) {
      meta = getStaticBookMeta(book._staticData);
      icon = book._staticData.icon || '📕';
    } else {
      meta = getBookMeta(book.initials);
      icon = book.category === 'DAILY_DEVOTIONS' ? '📖' : (book.category === 'ESSAYS' ? '📝' : '📕');
    }
    html += '<div class="lib-book-card" onclick="openBook(\'' + book.initials + '\',' + (book.isStatic ? 'true' : 'false') + ')">';
    html += '  <div class="lib-book-icon">' + icon + '</div>';
    html += '  <div class="lib-book-title">' + escHtml(meta.name) + '</div>';
    html += '  <div class="lib-book-author">' + escHtml(meta.author) + '</div>';
    html += '  <div class="lib-book-lang">' + escHtml(book.language || '') + '</div>';
    html += '</div>';
  });
  grid.innerHTML = html;

  document.getElementById('shelfTitle').textContent = libT('书架', 'Bookshelf') + ' (' + books.length + ')';
}

// ─── Open a book (SWORD or Static) ───
function openBook(initials, isStatic) {
  libState.currentBook = initials;
  libState.currentBookIsStatic = isStatic;
  libState.currentKeyIndex = 0;
  document.getElementById('bookshelfView').style.display = 'none';
  document.getElementById('readerView').style.display = 'block';

  if (isStatic) {
    openStaticBook(initials);
  } else {
    openSwordBook(initials);
  }
}

// ─── Open SWORD book ───
function openSwordBook(initials) {
  var meta = getBookMeta(initials);
  document.getElementById('readerTitle').textContent = meta.name;

  fetchJson(API + '/sword/genbook/' + initials + '/keys?limit=500')
    .then(function(data) {
      if (!data.success || !data.data || !data.data.keys) {
        document.getElementById('readerContent').innerHTML = '<div class="lib-loading">' + libT('无法加载目录', 'Failed to load contents') + '</div>';
        return;
      }
      libState.currentKeys = data.data.keys.map(function(k) {
        return { name: k.name || k.osisRef || k.key, key: k.key || k.osisRef || k.name };
      });
      renderChapterSelect();
      if (libState.currentKeys.length > 0) loadChapter(0);
    })
    .catch(function(err) {
      document.getElementById('readerContent').innerHTML = '<div class="lib-loading">Error: ' + escHtml(err.message) + '</div>';
    });
}

// ─── Open Static book (JSON files) ───
function openStaticBook(code) {
  // Find from libState.books (already loaded from index.json)
  var staticBook = libState.books.find(function(b) { return b.initials === code && b.isStatic; });
  var meta = staticBook ? getStaticBookMeta(staticBook._staticData) : { name: code, author: '' };
  document.getElementById('readerTitle').textContent = meta.name;

  fetchJson(STATIC_BASE + '/' + code + '/meta.json')
    .then(function(metaData) {
      libState.currentKeys = metaData.chapters.map(function(ch) {
        return { name: ch.title, key: ch.id, category: ch.category };
      });
      libState._staticMeta = metaData;
      renderChapterSelect();
      if (libState.currentKeys.length > 0) loadChapter(0);
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
    var name = key.name || ('Chapter ' + (i + 1));
    // Add category prefix for static books with categories
    if (key.category) {
      name = '[' + key.category + '] ' + name;
    }
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

  document.getElementById('readerContent').innerHTML = '<div class="lib-loading">' + libT('加载中...', 'Loading...') + '</div>';
  document.getElementById('prevChapter').disabled = (index <= 0);
  document.getElementById('nextChapter').disabled = (index >= libState.currentKeys.length - 1);

  if (libState.currentBookIsStatic) {
    loadStaticChapter(libState.currentBook, key.key);
  } else {
    loadSwordChapter(libState.currentBook, key.key, key);
  }
}

// ─── Load SWORD chapter ───
function loadSwordChapter(book, keyRef, key) {
  fetchJson(API + '/sword/genbook/' + book + '/content?key=' + encodeURIComponent(keyRef))
    .then(function(data) {
      if (!data.success || !data.data) {
        document.getElementById('readerContent').innerHTML = '<div class="lib-loading">' + libT('内容为空', 'No content available') + '</div>';
        return;
      }
      var content = data.data.content || data.data.html || data.data.text || '';
      content = stripTags(content);
      document.getElementById('readerContent').innerHTML = '<h2>' + escHtml(key.name || keyRef) + '</h2>' + content;
    })
    .catch(function(err) {
      document.getElementById('readerContent').innerHTML = '<div class="lib-loading">Error: ' + escHtml(err.message) + '</div>';
    });
}

// ─── Load Static chapter (JSON file) ───
function loadStaticChapter(bookCode, chapterId) {
  fetchJson(STATIC_BASE + '/' + bookCode + '/' + chapterId + '.json')
    .then(function(data) {
      var content = data.content || '';
      var title = data.title || chapterId;
      // Static books already have clean HTML, just render it
      document.getElementById('readerContent').innerHTML = '<h2>' + escHtml(title) + '</h2><div class="lib-static-content">' + content + '</div>';
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
    if (libState.currentBookIsStatic) {
      var staticBook = STATIC_BOOKS.find(function(b) { return b.code === libState.currentBook; });
      if (staticBook) {
        var meta = getStaticBookMeta(staticBook);
        document.getElementById('readerTitle').textContent = meta.name;
      }
    } else {
      var meta = getBookMeta(libState.currentBook);
      document.getElementById('readerTitle').textContent = meta.name;
    }
  }
  renderChapterSelect();
}

// ─── Helpers ───
function escHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function stripTags(html) {
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