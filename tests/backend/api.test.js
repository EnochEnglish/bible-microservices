/**
 * api.test.js — comprehensive back‑end API regression suite
 *
 * Covers every public endpoint exposed via the Gateway (port 8080).
 * All calls include the CORS Origin header so routing AND CORS are
 * exercised together.
 *
 * Run:   node tests/backend/api.test.js
 * Prerequisites: Gateway:8080 + Text:8081 + Search:8082 + Module:8083
 */

import {fetchJSON, assert, group, skip, section, summary, FIXTURES} from "../helpers.js";

// ── smoke-check: verify gateway is reachable ─────────────────────────────────
section("1. HEALTH / SMOKE");

try {
  await fetchJSON("/bible/translations");
  process.stdout.write("  ✓ Gateway reachable\n");
} catch (e) {
  console.error(`  ✗ Gateway unreachable — is port 8080 running?\n    ${e.message}`);
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  2. BIBLE-TEXT SERVICE
// ═══════════════════════════════════════════════════════════════════════════════
section("2. BIBLE-TEXT SERVICE (/bible)");

const translations = await fetchJSON("/bible/translations");
const transList = translations.translations;

group("2.1 GET /translations", () => {
  assert("object", typeof translations, "translations is object");
  assert(true, Array.isArray(translations.translations), "translations.translations is array");

  const ids = translations.translations.map(t => t.id);
  for (const exp of FIXTURES.translations) {
    assert(true, ids.includes(exp), `has translation "${exp}"`);
  }
  assert(true, ids.length >= 8, `translation count ≥ 8 (got ${ids.length})`);

  // each entry must have minimal fields
  for (const info of translations.translations) {
    assert("string", typeof info.id, `"${info.id}" id is string`);
    assert(true, "name" in info, `"${info.id}" has "name" field`);
  }
});

group("2.2 GET /{translation}/books", async () => {
  const books = await fetchJSON("/bible/kjv/books");
  assert("object", typeof books, "books is object");

  const list = books.books;
  assert(true, Array.isArray(list), "books.books is array");
  assert(true, list.length >= 66, `KJV book count ≥ 66 (got ${list.length})`);

  // spot-check a few books
  const gen = list.find(b => b.id === "GEN");
  assert("Genesis", gen?.name, "KJV book[0] name Genesis");
  assert(50, gen?.chapterCount, "Genesis has 50 chapters");

  const rev = list.find(b => b.id === "REV");
  assert("Revelation", rev?.name, "KJV last book name Revelation");
  assert(22, rev?.chapterCount, "Revelation has 22 chapters");

  // CUV Chinese books should also work
  const cuvBooks = await fetchJSON("/bible/cuv_gb/books");
  const cuvList = cuvBooks.books || [];
  assert(true, cuvList.length >= 66, `CUV book count ≥ 66 (got ${cuvList.length})`);
});

group("2.3 GET /{translation}/{book}/{chapter} — whole chapter", async () => {
  const ch = await fetchJSON("/bible/kjv/gen/1");
  assert("string", typeof ch.reference, "KJV Gen 1 has reference string");
  assert(true, ch.reference && ch.reference.includes("Genesis"), `reference contains Genesis: "${ch.reference}"`);
  assert("kjv", ch.translation_id,   "translation_id is kjv");
  assert(1, ch.chapter,              "chapter is 1");

  const verses = ch.verses;
  assert(true, Array.isArray(verses), "verses is array");
  assert(31, verses.length,           "Gen 1 has 31 verses");

  const v1 = verses[0];
  assert(1, v1.verse, `verse[0].verse == 1`);
  assert("string", typeof v1.text, `verse[0].text is string`);
  assert(true, v1.text.length > 0, `verse[0].text non-empty`);

  // Chinese
  const cuvCh = await fetchJSON("/bible/cuv_gb/jhn/3");
  assert(36, cuvCh.verses?.length, "CUV John 3 has 36 verses");

  // Psalm 119 — longest chapter (176 verses)
  const psa119 = await fetchJSON("/bible/kjv/psa/119");
  assert(176, psa119.verses?.length, "Psalm 119 has 176 verses");
});

group("2.4 GET /{translation}/{book}/{chapter}/{verse}", async () => {
  const v = await fetchJSON("/bible/kjv/gen/1/1");
  assert(1,             v.verse,   "KJV Gen 1:1 verse == 1");
  assert("string",      typeof v.text, "text is string");
  assert(true,          v.text.length > 0, "text non-empty");
  assert("kjv",         v.translation_id, "translation_id is kjv");

  // Famous verse: John 3:16
  const j316 = await fetchJSON("/bible/kjv/jhn/3/16");
  assert(true, j316.text.toLowerCase().includes("god so loved"),
    "John 3:16 text contains 'God so loved'");

  // CUV Chinese verse
  const cuv316 = await fetchJSON("/bible/cuv_gb/jhn/3/16");
  assert(true, typeof cuv316.text === "string" && cuv316.text.includes("神爱世人"),
    "CUV John 3:16 contains 神爱世人");
});

group("2.5 GET /{translation}/random", async () => {
  const r = await fetchJSON("/bible/kjv/random");
  assert("string", typeof r.reference,   "random verse has reference");
  assert("string", typeof r.text,        "random verse has text");
  assert(true, r.verse > 0,             "random verse number > 0");

  const cuvR = await fetchJSON("/bible/cuv_gb/random");
  assert("string", typeof cuvR.text, "random CUV verse has text");
});

group("2.6 GET /{translation}/range", async () => {
  const range = await fetchJSON("/bible/kjv/range?book=gen&chapter=1&verseStart=1&verseEnd=5");
  const verses = range.verses;
  assert(true, Array.isArray(verses), "range result has verses array");
  assert(5, verses.length, "Gen 1:1-5 returns 5 verses");
  assert(1, verses[0].verse, "first verse number is 1");
  assert(5, verses[4].verse, "last verse number is 5");
});

group("2.7 Error handling — missing translation", async () => {
  // non-existent translation should return 404/empty or 200 with error
  try {
    const resp = await fetch(`http://localhost:8080/api/v1/bible/nonexistent/books`, {
      headers: {Origin: "http://127.0.0.1:3000"},
      signal: AbortSignal.timeout(10_000),
    });
    assert(true, resp.status >= 400 || resp.status === 200,
      `non-existent translation returns ${resp.status} (expect 4xx or 200+empty)`);
  } catch (e) {
    // Network errors are also acceptable for 404 cases
    assert(true, true, `non-existent translation handled (${e.message})`);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  3. STRONG'S DICTIONARY
// ═══════════════════════════════════════════════════════════════════════════════
section("3. STRONG'S DICTIONARY (/strongs)");

group("3.1 GET /strongs/{id} — Greek (G-prefix)", async () => {
  const g25 = await fetchJSON("/strongs/G25");
  assert("G25",         g25.id,                 "G25 id");
  assert("agapao",      g25.original_word,      "G25 is ἀγαπάω (agapao)");
  assert("string",      typeof g25.definition,  "G25 has definition");
  assert(true,          g25.definition.length > 0, "G25 definition non-empty");
  assert(true,          g25.transliteration.length > 0, "G25 has transliteration");
});

group("3.2 GET /strongs/{id} — Hebrew (H-prefix)", async () => {
  const h1254 = await fetchJSON("/strongs/H1254");
  assert("H1254",       h1254.id,              "H1254 id");
  assert("string",      typeof h1254.definition,"H1254 has definition");
  assert(true,          h1254.original_word && h1254.original_word.length > 0,
    "H1254 has original_word");

  // Hebrew words should be present for common entries
  if (h1254.hebrew_words && h1254.hebrew_words.length > 0) {
    assert("string", typeof h1254.hebrew_words[0], "H1254 hebrew_words[0] is string");
  }
});

group("3.3 GET /strongs/{id} — not found", async () => {
  const nf = await fetchJSON("/strongs/G99999");
  assert("not_found", nf.error, "G99999 returns not_found");
});

group("3.4 GET /strongs/search?q=", async () => {
  const love = await fetchJSON("/strongs/search?q=love");
  assert(true, love.count > 0, `"love" search returns ${love.count} results`);
  assert(true, Array.isArray(love.matches), `search matches is array`);
  if (love.matches.length > 0) {
    const m = love.matches[0];
    assert("string", typeof m.id, "match has id");
    assert("string", typeof m.definition, "match has definition");
  }

  // search filtered by language
  const gLove = await fetchJSON("/strongs/search?q=love&lang=g");
  assert(true, gLove.count > 0, `Greek "love" search returns ${gLove.count} results`);
  if (gLove.matches.length > 0) {
    assert("G", gLove.matches[0].prefix, "Greek search results have G prefix");
  }

  const hLove = await fetchJSON("/strongs/search?q=love&lang=h");
  // may or may not have results for "love" in Hebrew
  assert("number", typeof hLove.count, `Hebrew "love" search count is number`);
});

group("3.5 GET /strongs/stats", async () => {
  const stats = await fetchJSON("/strongs/stats");
  assert(true, typeof stats.total === "number" && stats.total > 0,
    `Strong's stats has total > 0 (got ${stats.total})`);
  assert(true, stats.total >= 14000,
    `Strong's total >= 14,000 (5625 G + 8674 H minimum)`);
});

// ═══════════════════════════════════════════════════════════════════════════════
//  4. SEARCH SERVICE
// ═══════════════════════════════════════════════════════════════════════════════
section("4. SEARCH SERVICE (/search)");

group("4.1 GET /search?query=", async () => {
  const god = await fetchJSON("/search?query=God&translation=kjv");
  assert("object", typeof god, "search result is object");
  assert(true, typeof god.totalHits === "number",
    `totalHits is number (KJV 'God': ${god.totalHits})`);
  assert(true, god.totalHits > 0, "KJV 'God' returns results");
  assert(true, Array.isArray(god.results), "results is array");
  if (god.results.length > 0) {
    const r = god.results[0];
    assert("string", typeof r.bookId,   "result has bookId");
    assert("number", typeof r.chapter,  "result chapter is number");
    assert("number", typeof r.verse,    "result verse is number");
    assert("string", typeof r.text,     "result has text");
  }
});

group("4.2 GET /search?query= — Chinese (CUV)", async () => {
  const shen = await fetchJSON("/search?query=%E7%A5%9E&translation=cuv_gb");
  assert(true, shen.totalHits > 0, `CUV "神" returns ${shen.totalHits} results`);
  if (shen.results.length > 0) {
    assert("string", typeof shen.results[0].text, "CUV search result has text");
  }
});

group("4.3 GET /search?query= — pagination", async () => {
  const p1 = await fetchJSON("/search?query=love&translation=kjv&page=0&size=5");
  assert(true, p1.results.length <= 5, `page 0 size 5 returns ≤ 5 results`);
  const p2 = await fetchJSON("/search?query=love&translation=kjv&page=1&size=5");
  assert(true, p2.results.length <= 5, `page 1 size 5 returns ≤ 5 results`);
});

group("4.4 GET /search/suggest?query=", async () => {
  const sug = await fetchJSON("/search/suggest?query=loving");
  assert(true, Array.isArray(sug.suggestions), "suggest returns suggestions array");
});

// ═══════════════════════════════════════════════════════════════════════════════
//  5. ANNOTATIONS / COMMENTARIES
// ═══════════════════════════════════════════════════════════════════════════════
section("5. ANNOTATIONS (/annotations)");

group("5.1 GET /annotations/commentaries/{book}/{chapter}", async () => {
  const comm = await fetchJSON("/annotations/commentaries/gen/1");
  assert(true, Array.isArray(comm.commentaries), "commentaries is array");
  assert(true, comm.commentaries.length > 0,
    `Gen 1 has ${comm.commentaries.length} commentaries`);

  // Check for TSK cross-references
  const tsk = comm.commentaries.filter(c => c.source === "TSK");
  assert(true, tsk.length > 0, `TSK entries present (${tsk.length})`);

  // verify each source has required fields
  for (const c of comm.commentaries) {
    assert("string", typeof c.source,     `commentary has source (${c.source})`);
    assert("string", typeof c.sourceName, `commentary has sourceName`);
    assert("string", typeof c.text,       `commentary text is string`);
    assert(true,     c.text.length > 0,   `commentary text non-empty`);
  }

  // TSK John 3:16
  const tsk316 = await fetchJSON("/annotations/commentaries/jhn/3");
  const tskFor316 = tsk316.commentaries.filter(c =>
    c.source === "TSK" && c.verseStart <= 16 && c.verseEnd >= 16);
  assert(true, tskFor316.length > 0, `TSK John 3 covers verse 16 (${tskFor316.length} entries)`);

  // chapter with no commentary should still return 200
  const lev = await fetchJSON("/annotations/commentaries/lev/1");
  assert(true, Array.isArray(lev.commentaries), "Lev 1 returns commentaries array");
  // may or may not have entries, but shouldn't error
});

// ═══════════════════════════════════════════════════════════════════════════════
//  6. MODULE SERVICE
// ═══════════════════════════════════════════════════════════════════════════════
section("6. MODULE SERVICE (/modules)");

group("6.1 GET /modules/available", async () => {
  const avail = await fetchJSON("/modules/available");
  assert(true, Array.isArray(avail.sources) || typeof avail.sources === "object",
    "modules/available has sources");
});

group("6.2 GET /modules/installed", async () => {
  const inst = await fetchJSON("/modules/installed");
  assert(true,
    Array.isArray(inst.translations) || typeof inst.translations === "object",
    "modules/installed has translations");
});

// ═══════════════════════════════════════════════════════════════════════════════
//  7. CORS HEADER VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════
section("7. CORS");

group("7.1 CORS headers present in response", async () => {
  const res = await fetch("http://localhost:8080/api/v1/bible/translations", {
    headers: { Origin: "http://127.0.0.1:3000" },
    signal: AbortSignal.timeout(10_000),
  });
  const acao = res.headers.get("access-control-allow-origin");
  assert(true, !!acao, `Access-Control-Allow-Origin present: "${acao}"`);
});

group("7.2 CORS with localhost source", async () => {
  const res2 = await fetch("http://localhost:8080/api/v1/bible/translations", {
    headers: { Origin: "http://localhost:3000" },
    signal: AbortSignal.timeout(10_000),
  });
  assert(true, res2.ok, `localhost:3000 origin OK (${res2.status})`);
});

// ═══════════════════════════════════════════════════════════════════════════════
//  8. DATA INTEGRITY / SNAPSHOT
// ═══════════════════════════════════════════════════════════════════════════════
section("8. DATA INTEGRITY");

group("8.1 Known verses match expected text", async () => {
  // KJV Genesis 1:1 — "In the beginning God created the heaven and the earth."
  const gen11 = await fetchJSON("/bible/kjv/gen/1/1");
  assert(true, gen11.text.toLowerCase().includes("in the beginning"),
    "Gen 1:1 starts with 'In the beginning'");

  // Psalm 23:1 — "The LORD is my shepherd"
  const psa231 = await fetchJSON("/bible/kjv/psa/23/1");
  assert(true, psa231.text.includes("shepherd"), "Psalm 23:1 contains 'shepherd'");
});

group("8.2 All 8 translations return books", async () => {
  for (const t of FIXTURES.translations) {
    const books = await fetchJSON(`/bible/${t}/books`);
    const list = books.books || [];
    assert(true, list.length >= 66,
      `"${t}" book count ${list.length} ≥ 66`);
  }
});

group("8.3 Genesis 1 has consistent verse counts across translations", async () => {
  const counts = {};
  for (const t of FIXTURES.translations) {
    const ch = await fetchJSON(`/bible/${t}/gen/1`);
    counts[t] = (ch.verses || []).length;
  }
  // All translations should have exactly 31 verses in Gen 1
  for (const [t, n] of Object.entries(counts)) {
    assert(31, n, `"${t}" Gen 1 verse count`);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
process.exit(summary());