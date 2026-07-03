// API_BASE is defined in config.js (APP_CONFIG.apiBase)
// var API_BASE is set by config.js for backward compatibility

class BibleAPI {
  static async getTranslations() {
    const res = await fetch(API_BASE + "/bible/translations");
    return res.json();
  }

  static async getBooks(translation) {
    const res = await fetch(API_BASE + "/bible/" + translation + "/books");
    return res.json();
  }

  static async getChapter(translation, book, chapter) {
    const res = await fetch(API_BASE + "/bible/" + translation + "/" + book + "/" + chapter);
    return res.json();
  }

  static async search(query, translation, page, size) {
    var p = "query=" + encodeURIComponent(query) + "&translation=" + (translation||"kjv") + "&page=" + (page||0) + "&size=" + (size||20);
    var res = await fetch(API_BASE + "/search?" + p);
    return res.json();
  }

  static async getCrossRefs(book, chapter) {
    var res = await fetch(API_BASE + "/annotations/commentaries/" + book + "/" + chapter);
    return res.json();
  }

  // ── Strong's Dictionary ──
  static async strongsLookup(id) {
    var res = await fetch(API_BASE + "/strongs/" + encodeURIComponent(id));
    return res.json();
  }

  static async strongsSearch(query, lang) {
    var p = "q=" + encodeURIComponent(query);
    if (lang) p += "&lang=" + lang;
    var res = await fetch(API_BASE + "/strongs/search?" + p);
    return res.json();
  }

  static async strongsStats() {
    var res = await fetch(API_BASE + "/strongs/stats");
    return res.json();
  }
}
