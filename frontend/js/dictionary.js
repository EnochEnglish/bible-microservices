// dictionary.js — Standalone Bible Dictionary Page
(function() {
  "use strict";

  // ── State ──
  var state = {
    lang: "bilingual",
    dictionaries: [],
    currentDict: "StrongsGreek",
    entries: [],
    selectedKey: null
  };

  // ── Dictionary Chinese Names ──
  var DICT_NAMES_ZH = {
    '2BabDict': '巴比伦双城记符号词典',
    'AbbottSmith': '阿博特-史密斯希腊语新约词典',
    'AbbottSmithStrongs': '阿博特-史密斯希腊语词典(含Strong)',
    'AmTract': '美国传道会圣经词典',
    'BDBGlosses_Strongs': 'BDB词汇表(含Strong)',
    'Cawdrey': '考德雷字母表(1604)',
    'CBC': '简明圣经百科',
    'ChisStrongsGreek': 'CBOL希腊语Strong词典(简体)',
    'ChitStrongsGreek': 'CBOL希腊语Strong词典(繁体)',
    'ChisStrongsHebrew': 'CBOL希伯来语Strong词典(简体)',
    'ChitStrongsHebrew': 'CBOL希伯来语Strong词典(繁体)',
    'Dodson': '道德森希腊语-英语词典',
    'Easton': '伊斯顿圣经词典',
    'FVDPVietAnh': 'FVDP越英词典',
    'GreekHebrew': '希腊语-希伯来语词典(七十士译本)',
    'HebrewGreek': '希伯来语-希腊语词典(七十士译本)',
    'Hitchcock': '海奇科克圣经人名词典',
    'ISBE': '国际标准圣经百科全书',
    'MLStrong': '中级希腊语-英语词典(含Strong)',
    'Nave': ' nave主题圣经',
    'OSHM': '开放经文希伯来语形态分析',
    'Packard': '帕卡德形态分析代码',
    'Robinson': '罗宾逊形态分析代码',
    'SAOA': '圣经动物字母集',
    'Smith': '史密斯圣经词典',
    'StrongsGreek': 'Strong希腊语圣经词典',
    'StrongsHebrew': 'Strong希伯来语圣经词典',
    'TCR': '汤普森连锁主题',
    'Torrey': '托雷新主题文本',
    'Webster1828': '韦氏词典(1828版)',
    'Webster1806': '韦氏简明词典(1806版)',
    'Webster1913': '韦氏修订版词典(1913版)',
    'ZhEnglish': '英汉词典',
    'ZhHanzi': '汉英词典',
    'ZhPinyin': '拼音汉英词典'
  };

  // ── I18N ──
  var I18N = {
    zh: { searchPlaceholder: "搜索词典条目...", search: "搜索", browseAll: "浏览全部", back: "返回", loading: "加载中...", noMatch: "未找到匹配的条目", dictTitle: "圣经词典", homeLabel: "圣经阅读器" },
    en: { searchPlaceholder: "Search dictionary entries...", search: "Search", browseAll: "Browse All", back: "Back", loading: "Loading...", noMatch: "No matching entries found", dictTitle: "Bible Dictionary", homeLabel: "Bible Reader" }
  };
  function t(key) {
    var zh = I18N.zh[key] || "", en = I18N.en[key] || "";
    if (state.lang === "zh") return zh;
    if (state.lang === "en") return en;
    return zh + " / " + en;
  }

  // ── Init ──
  document.addEventListener("DOMContentLoaded", function() {
    loadDictList();
    setupLang();
    setupSearch();
    handleUrlParams();
  });

  function handleUrlParams() {
    var p = new URLSearchParams(location.search);
    var dict = p.get("dict");
    var key = p.get("key");
    if (dict) {
      // Wait for dict list to load, then select
      var check = setInterval(function() {
        if (state.dictionaries.length > 0) {
          clearInterval(check);
          var found = state.dictionaries.find(function(d) { return d.initials === dict; });
          if (found) {
            // Select dict but skip loading all entries if we have a direct key
            state.currentDict = dict;
            document.getElementById("dictSelector").value = dict;
            var d = state.dictionaries.find(function(x) { return x.initials === dict; });
            document.getElementById("dictInfo").textContent = d ? (d.name || d.initials) : dict;
            if (key) {
              // Direct lookup, don't load all entries first
              lookupEntry(key);
            } else {
              loadAllEntries();
            }
          }
        }
      }, 200);
    }
  }

  // ── Dictionary List ──
  function loadDictList() {
    fetch("/api/v1/sword/modules?category=DICTIONARY")
      .then(function(r) { return r.json(); })
      .then(function(data) {
        state.dictionaries = (data.modules || []).sort(function(a, b) {
          return (a.name || a.initials).localeCompare(b.name || b.initials);
        });
        renderDictSelector();
        if (!state.currentDict && state.dictionaries.length > 0) {
          selectDictionary(state.dictionaries[0].initials);
        }
      })
      .catch(function(e) { console.error("Failed to load dictionaries:", e); });
  }

  function renderDictSelector() {
    var sel = document.getElementById("dictSelector");
    var html = "";
    state.dictionaries.forEach(function(d) {
      html += '<option value="' + d.initials + '"' + (d.initials === state.currentDict ? " selected" : "") + '>' + dictLabel(d) + '</option>';
    });
    sel.innerHTML = html;
    sel.onchange = function() { selectDictionary(this.value); };
  }

  function dictLabel(d) {
    var en = d.name || d.initials;
    var zh = DICT_NAMES_ZH[d.initials] || en;
    if (state.lang === "zh") return d.initials + " — " + zh;
    if (state.lang === "en") return d.initials + " — " + en;
    return d.initials + " — " + zh + " / " + en;
  }

  function selectDictionary(initials) {
    state.currentDict = initials;
    state.entries = [];
    state.selectedKey = null;
    document.getElementById("dictSelector").value = initials;

    var d = state.dictionaries.find(function(x) { return x.initials === initials; });
    var info = d ? (d.name || d.initials) : initials;
    document.getElementById("dictInfo").textContent = info;

    showEntryList();
    loadAllEntries();
  }

  function loadAllEntries() {
    showLoading(true);
    document.getElementById("noResult").style.display = "none";
    // Use search API with empty-ish query to get first N entries
    fetch("/api/v1/sword/" + state.currentDict + "/dict/search?q=&limit=100")
      .then(function(r) { return r.json(); })
      .then(function(data) {
        showLoading(false);
        if (data.results && data.results.length > 0) {
          state.entries = data.results;
          renderEntryList();
        } else {
          // Fallback: try browsing with common letters
          browseCommon();
        }
      })
      .catch(function() { showLoading(false); browseCommon(); });
  }

  function browseCommon() {
    // Try browsing by common starting characters
    var letters = ["a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z",
                   "G","H",
                   "\u4e00","\u4e09","\u4e5d","\u4e8c","\u4e94","\u516d","\u5341","\u516b","\u56db"];
    var idx = 0;
    function next() {
      if (idx >= letters.length) { showLoading(false); renderEntryList(); return; }
      var q = letters[idx++];
      fetch("/api/v1/sword/" + state.currentDict + "/dict/search?q=" + encodeURIComponent(q) + "&limit=20")
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data.results) {
            data.results.forEach(function(r) {
              if (!state.entries.find(function(e) { return e.key === r.key; })) {
                state.entries.push(r);
              }
            });
          }
          next();
        })
        .catch(function() { next(); });
    }
    next();
  }

  function renderEntryList() {
    var el = document.getElementById("entryList");
    el.style.display = "block";
    document.getElementById("entryDetail").style.display = "none";
    document.getElementById("noResult").style.display = state.entries.length === 0 ? "block" : "none";

    if (state.entries.length === 0) return;

    var html = "";
    state.entries.forEach(function(e) {
      html += '<div class="entry-item" data-key="' + escAttr(e.key) + '" onclick="DICT.selectEntry(\'' + escAttr(e.key) + '\')">';
      html += '<div class="entry-key">' + escHtml(e.key) + '</div>';
      html += '<div class="entry-preview">' + escHtml((e.content || "").replace(/<[^>]+>/g, "").replace(/\n/g, " ").substring(0, 120)) + '</div>';
      html += '</div>';
    });
    el.innerHTML = html;
  }

  function showEntryList() {
    document.getElementById("entryList").style.display = "block";
    document.getElementById("entryDetail").style.display = "none";
  }

  // ── Entry Detail ──
  function lookupEntry(key) {
    showLoading(true);
    fetch("/api/v1/sword/" + state.currentDict + "/dict/" + encodeURIComponent(key))
      .then(function(r) { return r.json(); })
      .then(function(data) {
        showLoading(false);
        if (data.found && data.content) {
          state.selectedKey = key;
          showDetail(key, data.content);
        } else {
          alert("Entry not found: " + key);
        }
      })
      .catch(function() { showLoading(false); });
  }

  function showDetail(key, content) {
    var el = document.getElementById("entryList");
    el.style.display = "none";
    document.getElementById("noResult").style.display = "none";
    var detail = document.getElementById("entryDetail");
    detail.style.display = "block";
    document.getElementById("detailTitle").textContent = key;

    // Clean SWORD/OSIS tags and render as safe HTML
    var clean = content
      .replace(/<lb\s*\/?>/g, '<br>')
      .replace(/<hi\s+type="bold"[^>]*>/g, '<b>').replace(/<\/hi>/g, '</b>')
      .replace(/<hi\s+type="italic"[^>]*>/g, '<i>')
      .replace(/<hi\s+[^>]*>/g, '<b>')
      .replace(/<\/hi>/g, '</b>')
      .replace(/<orth[^>]*>/g, '<b>')
      .replace(/<\/orth>/g, '</b>')
      .replace(/<ref[^>]*>/g, '<span class="kb-ref">').replace(/<\/ref>/g, '</span>')
      .replace(/<note[^>]*>[\s\S]*?<\/note>/g, '')
      .replace(/<\/?(entryFree|def|div|p)\b[^>]*>/g, '')
      .replace(/<[^>]+>/g, '')  // strip remaining tags
      .replace(/\n/g, '<br>')
      .replace(/--/g, '\u2014');
    document.getElementById("detailContent").innerHTML = clean;
  }

  function selectEntry(key) {
    lookupEntry(key);
  }

  // ── Search ──
  function setupSearch() {
    document.getElementById("searchBtn").onclick = doSearch;
    document.getElementById("searchInput").onkeydown = function(e) { if (e.key === "Enter") doSearch(); };
    document.getElementById("browseBtn").onclick = function() { selectDictionary(state.currentDict); };
    document.getElementById("backBtn").onclick = showEntryList;
    updateLabels();
  }

  function doSearch() {
    var q = document.getElementById("searchInput").value.trim();
    if (!q) return;
    showLoading(true);
    document.getElementById("noResult").style.display = "none";
    fetch("/api/v1/sword/" + state.currentDict + "/dict/search?q=" + encodeURIComponent(q) + "&limit=50")
      .then(function(r) { return r.json(); })
      .then(function(data) {
        showLoading(false);
        state.entries = data.results || [];
        renderEntryList();
      })
      .catch(function() { showLoading(false); });
  }

  // ── Language ──
  function setupLang() {
    var sel = document.getElementById("langToggle");
    sel.onchange = function() {
      state.lang = this.value;
      updateLabels();
      renderDictSelector();
      // Re-render entry list labels if visible
      if (state.entries.length > 0) renderEntryList();
    };
  }

  function updateLabels() {
    var zh = state.lang === "zh" || state.lang === "bilingual";
    var en = state.lang === "en" || state.lang === "bilingual";
    [].forEach.call(document.querySelectorAll("[data-zh]"), function(el) {
      el.textContent = zh ? el.getAttribute("data-zh") : el.getAttribute("data-en");
    });
    document.getElementById("searchInput").placeholder = t("searchPlaceholder");
    document.title = t("dictTitle");
  }

  function showLoading(show) {
    document.getElementById("loading").style.display = show ? "block" : "none";
  }

  // ── Utils ──
  function escHtml(s) { return (s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
  function escAttr(s) { return (s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;"); }

  // Expose for onclick in HTML
  window.DICT = { selectEntry: selectEntry, doSearch: doSearch };
})();
