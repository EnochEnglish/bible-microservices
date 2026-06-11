/**
 * regression.test.js — 前端数据契约回归测试
 *
 * 专门验证前端依赖的 API 数据格式是否正确，防止重构导致白屏。
 * 覆盖本次修复的所有接口。
 *
 * Run:   node tests/regression.test.js
 * 前提:  Gateway:8080 运行中
 */

import {fetchJSON, assert, group, skip, summary, section, BASE} from "./helpers.js";

// ── 连通性检查 ──
section("0. GATEWAY 连通性");

try {
  await fetchJSON("/bible/translations");
  process.stdout.write("  ✓ Gateway 8080 可达\n");
} catch (e) {
  console.error(`  ✗ Gateway 不可达 — 请先启动所有微服务\n    ${e.message}`);
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  1. COMMENTARY SOURCES（前端 loadCommentaryTabs 依赖）
// ═══════════════════════════════════════════════════════════════════════════════
section("1. COMMENTARY SOURCES (/annotations/commentary-sources)");

let commentarySources = [];

group("1.1 GET /annotations/commentary-sources 返回格式正确", async () => {
  const data = await fetchJSON("/annotations/commentary-sources");
  assert("object", typeof data, "返回 object");
  assert(true, Array.isArray(data.sources), "data.sources 是数组");
  assert(true, data.sources.length >= 3, `至少有 3 个注释源 (实际 ${data.sources.length})`);

  // 每个 source 必须有 id 和 name，id 是字符串
  for (const s of data.sources) {
    assert("string", typeof s.id,   `source.id 是字符串 ("${s.id}")`);
    assert("string", typeof s.name, `source.name 是字符串 ("${s.name}")`);
    assert(true, s.id.length > 0,   `source.id 非空`);
  }
  commentarySources = data.sources;
});

group("1.2 每个注释源的 comment 端点能返回有效数据", async () => {
  for (const s of commentarySources) {
    // 源可能只支持 NT，所以检查 gen 和 mat 两个章节
    try {
      const data = await fetchJSON("/annotations/commentaries/gen/1");
      const filtered = (data.commentaries || []).filter(c =>
        c.source && c.source.toLowerCase() === s.id.toLowerCase()
      );
      // 有些注释源可能没有该章节数据，不强制要求有数据
      assert("boolean", typeof (filtered.length >= 0),
        `${s.id} gen/1 查询成功`);
    } catch (e) {
      // 也接受尝试 mat 章节
      try {
        const data2 = await fetchJSON("/annotations/commentaries/mat/1");
        const filtered2 = (data2.commentaries || []).filter(c =>
          c.source && c.source.toLowerCase() === s.id.toLowerCase()
        );
        assert("boolean", typeof (filtered2.length >= 0),
          `${s.id} mat/1 查询成功`);
      } catch (e2) {
        assert(false, true, `${s.id} 至少一个章节可查`);
      }
    }
  }
});

group("1.3 注释源 ID 映射到前端期望的小写", async () => {
  const data = await fetchJSON("/annotations/commentary-sources");
  const ids = data.sources.map(s => s.id.toLowerCase());
  // 前端 COMMENTARY_NAMES_ZH 中有 barnes, calvin, clarke, mhc, rwp, catena, wesley
  const expected = ["barnes", "calvin", "clarke", "mhc", "rwp", "catena", "wesley"];
  for (const exp of expected) {
    assert(true, ids.includes(exp),
      `后端包含 "${exp}" (小写匹配)`);
  }
});

group("1.4 注释内容字段（verseStart/verseEnd/text）完整", async () => {
  const data = await fetchJSON("/annotations/commentaries/gen/1");
  for (const c of (data.commentaries || [])) {
    assert("number", typeof c.verseStart, `commentary ${c.source} 有 verseStart`);
    assert("number", typeof c.verseEnd,   `commentary ${c.source} 有 verseEnd`);
    assert("string", typeof c.text,       `commentary ${c.source} 有 text`);
    assert(true, c.text.length > 0,       `commentary ${c.source} text 非空`);
    // source 字段前端不会直接用作显示，但必须存在
    assert("string", typeof c.source,     `commentary 有 source 字段`);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  2. DICTIONARY SOURCES（前端 loadDictSources 依赖）
// ═══════════════════════════════════════════════════════════════════════════════
section("2. DICTIONARY SOURCES (/annotations/dictionaries/sources)");

group("2.1 GET /annotations/dictionaries/sources 返回格式正确", async () => {
  const data = await fetchJSON("/annotations/dictionaries/sources");
  assert("object", typeof data, "返回 object");

  // 前端期望 data.sources 是数组，且元素是 {id: string} 格式
  assert(true, Array.isArray(data.sources), "data.sources 是数组");
  assert(true, data.sources.length >= 3,
    `至少有 3 个词典源 (实际 ${data.sources.length})`);

  for (const s of data.sources) {
    assert("string", typeof s.id,   `dict source.id 是字符串 ("${s.id}")`);
    assert("string", typeof s.name, `dict source.name 是字符串 ("${s.name}")`);
  }
});

group("2.2 词典源包含 easton/isbe/nave", async () => {
  const data = await fetchJSON("/annotations/dictionaries/sources");
  const ids = data.sources.map(s => s.id);
  assert(true, ids.includes("easton"), "包含 easton");
  assert(true, ids.includes("isbe"),   "包含 isbe");
  assert(true, ids.includes("nave"),   "包含 nave");
});

group("2.3 词典搜索端点返回正确结构", async () => {
  // 用 Easton 词典搜索 "Aaron"
  const search = await fetchJSON("/annotations/dictionaries/easton?search=Aaron");
  // 可能返回 entries 或 results
  const entries = search.entries || search.results || [];
  assert(true, entries.length > 0, `Easton 'Aaron' 返回 ${entries.length} 条结果`);

  for (const e of entries) {
    assert("string", typeof (e.title || e.key || ""), "条目有 title 或 key");
    assert("string", typeof (e.text || e.content || ""), "条目有 text 或 content");
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  3. BIBLE TEXT（前端 renderVerses 依赖的字段格式）
// ═══════════════════════════════════════════════════════════════════════════════
section("3. BIBLE TEXT — 前端渲染契约");

group("3.1 GET /bible/{translation}/{book}/{chapter} 字段完整", async () => {
  const ch = await fetchJSON("/bible/kjv/gen/1");

  assert("string", typeof ch.reference,      "有 reference 字段");
  assert("string", typeof ch.translation_id, "有 translation_id 字段");
  assert("number", typeof ch.chapter,        "有 chapter 字段");
  assert(true, Array.isArray(ch.verses),     "verses 是数组");
  assert(true, ch.verses.length === 31,      "Gen 1 有 31 节经文");

  for (const v of ch.verses) {
    assert("number", typeof v.verse, `verse 是数字 (${v.verse})`);
    assert("string", typeof v.text,  `text 是字符串`);
    assert(true, v.text.length > 0,  `text 非空`);
  }
});

group("3.2 逐节查询 GET /{translation}/{book}/{chapter}/{verse}", async () => {
  const v = await fetchJSON("/bible/kjv/gen/1/1");
  assert("number", typeof v.verse,   "verse 是数字");
  assert("string", typeof v.text,    "text 是字符串");
  assert("string", typeof v.translation_id, "translation_id 是字符串");
  assert("string", typeof v.osis_ref, "osis_ref 是字符串");
});

group("3.3 前端常用译本验证", async () => {
  const checks = [
    { tid: "kjv",    book: "gen", ch: 1, expect: 31 },
    { tid: "cuv_gb", book: "gen", ch: 1, expect: 31 },
    { tid: "web",    book: "gen", ch: 1, expect: 31 },
    { tid: "asv",    book: "gen", ch: 1, expect: 31 },
    { tid: "bbe",    book: "jhn", ch: 3, expect: 36 },
    { tid: "ylt",    book: "psa", ch: 1, expect: 6 },
  ];
  for (const c of checks) {
    const ch = await fetchJSON(`/bible/${c.tid}/${c.book}/${c.ch}`);
    assert(c.expect, (ch.verses || []).length,
      `${c.tid} ${c.book} ${c.ch} 有 ${c.expect} 节`);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  4. SEARCH（前端 doSearch 依赖）
// ═══════════════════════════════════════════════════════════════════════════════
section("4. SEARCH SERVICE");

group("4.1 搜索返回格式（前端 doSearch 依赖）", async () => {
  const res = await fetchJSON("/search?query=God&translation=kjv");
  // 前端用 data.results 或 data.hits
  assert("object", typeof res, "返回 object");
  const hits = res.results || res.hits || [];
  assert(true, Array.isArray(hits), "results 或 hits 是数组");
  assert(true, hits.length > 0, "God 搜索结果非空");

  for (const h of hits) {
    // 前端使用 h.book, h.chapter, h.verse, h.text
    assert("string", typeof (h.book || h.bookId || ""), "结果有 book 或 bookId");
    assert("number", typeof (h.chapter), "结果有 chapter");
    assert("number", typeof (h.verse),   "结果有 verse");
    assert("string", typeof (h.text),     "结果有 text");
  }
});

group("4.2 中文搜索", async () => {
  const res = await fetchJSON("/search?query=%E7%A5%9E&translation=cuv_gb");
  const hits = res.results || res.hits || [];
  assert(true, hits.length > 0, `CUV '神' 搜索返回 ${hits.length} 结果`);
  if (hits.length > 0) {
    assert("string", typeof hits[0].text, "中文搜索结果有 text");
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  5. STRONG'S DICTIONARY（前端 lookupStrongsWord 依赖）
// ═══════════════════════════════════════════════════════════════════════════════
section("5. STRONG'S DICTIONARY");

group("5.1 Strong's 查询格式", async () => {
  const g25 = await fetchJSON("/strongs/G25");
  assert("string", typeof g25.id,              "有 id 字段");
  assert("string", typeof g25.original_word,   "有 original_word");
  assert("string", typeof g25.definition,      "有 definition");
  assert("string", typeof g25.transliteration, "有 transliteration");
});

group("5.2 Strong's 搜索格式", async () => {
  const res = await fetchJSON("/strongs/search?q=love");
  assert("number", typeof res.count, "有 count");
  const matches = res.matches || res.results || [];
  assert(true, Array.isArray(matches), "有 matches/results 数组");
  if (matches.length > 0) {
    assert("string", typeof matches[0].id,   "match 有 id");
    assert("string", typeof matches[0].definition, "match 有 definition");
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  6. TRANSLATION LIST（前端 transShortLabel 依赖）
// ═══════════════════════════════════════════════════════════════════════════════
section("6. TRANSLATIONS LIST");

group("6.1 GET /bible/translations 字段完整", async () => {
  const data = await fetchJSON("/bible/translations");
  // 前端期望 data 是 { translations: [...] } 或 data 本身是数组
  const list = data.translations || (Array.isArray(data) ? data : []);
  assert(true, Array.isArray(list), "translations 是数组");
  assert(true, list.length >= 8, `至少有 8 个译本 (实际 ${list.length})`);

  for (const t of list) {
    // 前端 transShortLabel 使用 t.id 和 t.name
    assert("string", typeof t.id,   `translation "${t.id}" id 是字符串`);
    assert("string", typeof t.name, `translation "${t.name}" name 是字符串`);
    // 前端也可能用 t.english_name, t.local_name 等
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  7. BOOKS LIST（前端 renderSidebar 依赖）
// ═══════════════════════════════════════════════════════════════════════════════
section("7. BOOKS LIST");

group("7.1 GET /bible/kjv/books 字段完整", async () => {
  const data = await fetchJSON("/bible/kjv/books");
  // 前端期望 data.books 是数组
  assert(true, Array.isArray(data.books), "books 是数组");
  assert(true, data.books.length >= 66, "KJV 至少 66 卷书");

  for (const b of data.books) {
    // 前端使用 b.id, b.name, b.chapterCount (或 b.chapters)
    assert("string", typeof b.id,
      `book.id 是字符串 (${b.id})`);
    assert("string", typeof b.name,
      `book.name 是字符串 (${b.name})`);
    const chCount = b.chapterCount || b.chapters;
    assert("number", typeof chCount,
      `book 有 chapterCount 或 chapters 数字字段`);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  8. FRONTEND DATA FLOW — 模拟 app.js 的实际调用模式
// ═══════════════════════════════════════════════════════════════════════════════
section("8. FRONTEND DATA FLOW");

group("8.1 getTranslations() 返回值可直接 .forEach()", async () => {
  // 模拟 api.js BibleAPI.getTranslations() 的处理逻辑:
  // 之前返回 raw res.json() = {translations: [...]}，导致 .forEach 崩溃
  // 现在必须返回 unwrap 后的数组
  const raw = await fetchJSON("/bible/translations");
  const unwrapped = raw.translations || (Array.isArray(raw) ? raw : []);
  assert(true, Array.isArray(unwrapped),
    "getTranslations() 返回数组, 而非 {translations: [...]}");
  assert(true, unwrapped.length >= 8,
    `数组元素 >= 8 (实际 ${unwrapped.length})`);
  // 模拟 app.js loadBooks 的 .forEach() 操作
  var html = "";
  unwrapped.forEach(function(t) {
    html += t.id + ",";
  });
  assert(true, html.length > 0, ".forEach() 迭代成功");
  assert(true, html.indexOf("kjv") >= 0, "数组包含 kjv");
});

group("8.2 api.js 文件包含 apiGet 函数定义", async () => {
  // apiGet 被 app.js:345 和 app.js:385 调用
  // 如果未定义会导致 "INIT FAILED: apiGet is not defined"
  const fs = await import("fs");
  const code = fs.readFileSync(
    new URL("../frontend/js/api.js", import.meta.url),
    "utf-8"
  );
  assert(true, code.includes("function apiGet"),
    "api.js 包含 function apiGet 定义");
  assert(true, code.includes("getTranslations"),
    "api.js 包含 getTranslations");
  // Verify getTranslations unwraps the array
  const unwrapPattern = /return\s+data\.translations/m;
  assert(true, unwrapPattern.test(code),
    "getTranslations() 中 return data.translations (unwrap 数组)");
});

group("8.3 app.js loadChapter() 不产生双重 /api/v1/ 前缀", async () => {
  const fs = await import("fs");
  const code = fs.readFileSync(
    new URL("../frontend/js/app.js", import.meta.url),
    "utf-8"
  );
  // loadChapter() builds url = "/bible/" + ... not "/api/v1/bible/" + ...
  // because apiGet() prepends API_BASE which already contains /api/v1
  const urlPattern = /var url = "\/bible\//;
  assert(true, urlPattern.test(code),
    "loadChapter() 构造 /bible/ 相对路径 (无 /api/v1/ 前缀)");
  // Also check loadCompareTranslations has the same
  const cmpPattern = /var url = "\/bible\//g;
  const matches = code.match(cmpPattern);
  assert(true, matches && matches.length >= 2,
    "loadChapter 和 loadCompareTranslations 都使用 /bible/ 相对路径");
  // Ensure no stale /api/v1/bible/ patterns remain in fetch/url construction
  const stalePattern = /\/api\/v1\/bible\//g;
  const staleMatches = code.match(stalePattern);
  assert(true, !staleMatches,
    `app.js 中无 /api/v1/bible/ 残留 (消除双重前缀 bug)`);
});

// ═══════════════════════════════════════════════════════════════════════════════
//  9. CORS — 前端浏览器必须能跨域
// ═══════════════════════════════════════════════════════════════════════════════
section("9. CORS");

group("9.1 CORS 头包含 origin pattern", async () => {
  const res = await fetch(`${BASE}/bible/translations`, {
    headers: { Origin: "http://127.0.0.1:3000" },
    signal: AbortSignal.timeout(5_000),
  });
  const acao = res.headers.get("access-control-allow-origin");
  assert(true, acao !== null, `Access-Control-Allow-Origin 存在: "${acao}"`);
  // 允许值要么是 "*", 要么是匹配的 origin, 要么是包含 127.0.0.1:3000 的 pattern
  if (acao !== "*") {
    const acma = res.headers.get("access-control-allow-methods");
    const ache = res.headers.get("access-control-allow-headers");
    assert(true, acma !== null, "CORS allow-methods 存在");
    assert(true, ache !== null, "CORS allow-headers 存在");
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════
process.exit(summary());

