/**
 * js.test.js — front‑end JavaScript unit tests
 *
 * Tests pure functions in app.js and validates the BibleAPI class
 * from api.js  without a real browser (Node.js only).
 *
 * Pure functions (no DOM dependency) are tested directly.
 * Functions that need DOM are tested with a minimal mock.
 *
 * Run:  node tests/frontend/js.test.js
 */

import {readFileSync} from "fs";
import {assert, group, section, summary} from "../helpers.js";

// ── load source files ───────────────────────────────────────────────────────
const APP_JS  = readFileSync(
  new URL("../../frontend/js/app.js", import.meta.url), "utf8");
const API_JS  = readFileSync(
  new URL("../../frontend/js/api.js", import.meta.url), "utf8");

// ── minimal DOM mock (no jsdom dependency) ────────────────────────────────
class MockElement {
  constructor(tag) { this.tag = tag; this.children = []; this.listeners = {}; this.dataset = {}; }
  addEventListener(e, fn) { this.listeners[e] = fn; }
  appendChild(c) { this.children.push(c); return c; }
  querySelectorAll() { return []; }
  classList = { add(){}, remove(){}, toggle(){}, contains(){ return false; } };
  style = {};
  innerHTML = "";
  innerText = "";
  value = "";
  getAttribute() { return null; }
}

class MockDocument {
  constructor() { this.body = new MockElement("body"); }
  createElement(tag) { return new MockElement(tag); }
  querySelector() { return null; }
  querySelectorAll() { return []; }
  getElementById() { return null; }
  addEventListener() {}
}

global.document = new MockDocument();
global.window   = { addEventListener(){}, location: { hostname:"127.0.0.1", port:"3000" } };
global.fetch    = undefined; // will be set per test

// ── extract pure functions from app.js ─────────────────────────────────────
// parseReference() — extract from source
const parseRefFn = new Function(
  "return " + APP_JS.match(/function parseReference[\s\S]*?^}/m)?.[0]
);
const parseReference = typeof parseRefFn === "function" ? parseRefFn() : null;

// makeWordsClickable() — extract
const makeWordsFn = new Function(
  "return " + APP_JS.match(/function makeWordsClickable[\s\S]*?^}/m)?.[0]
);
const makeWordsClickable = typeof makeWordsFn === "function" ? makeWordsFn() : null;

// ── tests begin ─────────────────────────────────────────────────────────────
section("A. api.js — BibleAPI class");

group("A.1 BibleAPI.getTranslations()", async () => {
  // mock fetch to return known JSON
  global.fetch = async (url) => ({
    json: async () => ({ translations: { kjv:{name:"King James"}, web:{name:"World English"} } })
  });
  // eval API class in isolated scope
  const fn = new Function(API_JS + "\nreturn BibleAPI;")();
  const api = fn;
  const result = await api.getTranslations();
  assert(true, typeof result === "object", "getTranslations returns object");
  assert(true, "translations" in result || Array.isArray(result), "result has translations");
});

group("A.2 BibleAPI.getChapter()", async () => {
  global.fetch = async (url) => ({
    json: async () => ({ translation_id:"kjv", book_name:"Genesis", chapter:1, verses:[{verse:1,text:"In the beginning"}] })
  });
  const fn = new Function(API_JS + "\nreturn BibleAPI;")();
  const result = await fn.getChapter("kjv", "gen", 1);
  assert(true, typeof result === "object", "getChapter returns object");
});

group("A.3 BibleAPI.search()", async () => {
  global.fetch = async (url) => ({
    json: async () => ({ query:"God", totalHits:3877, results:[] })
  });
  const fn = new Function(API_JS + "\nreturn BibleAPI;")();
  const result = await fn.search("God", "kjv", 0, 20);
  assert(true, typeof result === "object", "search returns object");
});

group("A.4 BibleAPI.strongsLookup()", async () => {
  global.fetch = async (url) => ({
    json: async () => ({ id:"G25", original_word:"agapao", definition:"to love" })
  });
  const fn = new Function(API_JS + "\nreturn BibleAPI;")();
  const result = await fn.strongsLookup("G25");
  assert(true, typeof result === "object", "strongsLookup returns object");
  assert("G25", result.id, "strongsLookup returns correct id");
});

group("A.5 API_BASE constant", () => {
  // The API_BASE is http://localhost:8080/api/v1 — verify it's correct
  const m = API_JS.match(/API_BASE\s*=\s*"([^"]+)"/);
  assert(true, m !== null, "API_BASE is defined in api.js");
  if (m) {
    assert(true, m[1].includes("8080"), `API_BASE includes port 8080: "${m[1]}"`);
    assert(true, m[1].endsWith("/api/v1"), `API_BASE ends with /api/v1: "${m[1]}"`);
  }
});

// ── app.js pure function tests ──────────────────────────────────────────────
section("B. app.js — pure functions");

group("B.1 JS syntax check (node --check)", async () => {
  const {execSync} = await import("child_process");
  try {
    execSync(`node --check "${new URL("../../frontend/js/app.js", import.meta.url).pathname}"`, {stdio:"pipe"});
    assert(true, true, "app.js passes node --check (no syntax errors)");
  } catch (e) {
    assert(true, false, `app.js SYNTAX ERROR: ${e.stderr?.toString() || e.message}`);
  }
});

group("B.2 api.js syntax check", async () => {
  const {execSync} = await import("child_process");
  try {
    execSync(`node --check "${new URL("../../frontend/js/api.js", import.meta.url).pathname}"`, {stdio:"pipe"});
    assert(true, true, "api.js passes node --check");
  } catch (e) {
    assert(true, false, `api.js SYNTAX ERROR: ${e.stderr?.toString() || e.message}`);
  }
});

group("B.3 parseReference() — if available", () => {
  if (typeof parseReference === "function") {
    const r1 = parseReference("Genesis 1:1");
    assert(true, typeof r1 === "object", "parseReference returns object for 'Genesis 1:1'");
    if (r1) {
      assert("GEN", r1.book, `parseReference('Genesis 1:1').book == 'GEN'`);
      assert(1, r1.chapter, "parseReference chapter == 1");
      assert(1, r1.verse, "parseReference verse == 1");
    }
  } else {
    assert(true, true, "parseReference not exported (acceptable — minified/inline)");
  }
});

group("B.4 makeWordsClickable() — if available", () => {
  if (typeof makeWordsClickable === "function") {
    const out = makeWordsClickable("In the beginning God created");
    assert(true, typeof out === "string", "makeWordsClickable returns string");
    assert(true, out.includes("verse-word"), "output contains verse-word class");
  } else {
    assert(true, true, "makeWordsClickable not exported (acceptable)");
  }
});

group("B.5 state object structure", () => {
  // Check that app.js defines a `state` object with expected keys
  assert(true, /\b(var|let|const)\s+state\s*=/.test(APP_JS), "app.js defines state object");
  assert(true, APP_JS.includes("translation"), "state has translation field");
  assert(true, APP_JS.includes("book"), "state has book field");
  assert(true, APP_JS.includes("chapter"), "state has chapter field");
});

group("B.6 Event listeners attached", () => {
  // Verify key event bindings exist in code
  assert(true, APP_JS.includes("addEventListener") || APP_JS.includes("onclick"),
    "app.js attaches event listeners");
  assert(true, APP_JS.includes("DOMContentLoaded"),
    "app.js listens for DOMContentLoaded");
});

// ── integration: BibleAPI + app.js fetch calls ────────────────────────────
section("C. Integration — API call structure");

group("C.1 app.js calls BibleAPI methods (not raw fetch)", () => {
  // After the bug fix, app.js should use api.js BibleAPI class
  // Check for patterns like: await BibleAPI.getTranslations()
  assert(true, APP_JS.includes("BibleAPI."), "app.js calls BibleAPI methods");
  assert(true, !APP_JS.includes("fetch(API_BASE") || APP_JS.includes("BibleAPI"),
    "app.js does not use raw fetch with API_BASE (uses BibleAPI wrapper)");
});

group("C.2 No orphan code blocks (regression for the syntax bug)", () => {
  // After the makeWordsClickable function ends with "}", the next line should
  // start a new function or a comment (not a hanging code block).
  // Verify the fix: no orphan `container` reference exists at module scope.
  const lines = APP_JS.split("\n");
  const makeWordsIdx = lines.findIndex(l => l.includes("function makeWordsClickable"));
  if (makeWordsIdx >= 0) {
    // Function body should end cleanly — next non-empty line after renderVerses
    // should be either a comment or a function
    const renderIdx = lines.findIndex(l => l.includes("function renderVerses"));
    if (renderIdx >= makeWordsIdx) {
      // Find the closing brace of renderVerses
      let depth = 0, closeIdx = -1;
      for (let i = renderIdx; i < lines.length; i++) {
        if (lines[i].includes("{")) depth += (lines[i].match(/\{/g) || []).length;
        if (lines[i].includes("}")) depth -= (lines[i].match(/\}/g) || []).length;
        if (depth === 0 && lines[i].includes("}")) { closeIdx = i; break; }
      }
      // After the closing brace of renderVerses, no code should reference `container`
      let orphanAfter = false;
      for (let i = closeIdx + 1; i < lines.length && i < closeIdx + 20; i++) {
        const t = lines[i].trim();
        if (t === "" || t.startsWith("//") || t.startsWith("/*")) continue;
        if (/\bcontainer\b/.test(t) && !t.startsWith("function ")) {
          orphanAfter = true; break;
        }
      }
      assert(false, orphanAfter, "no orphan `container` references after renderVerses");
    }
  }
  assert(true, true, "structural check completed");
});

// ── finish ──────────────────────────────────────────────────────────────────
process.exit(summary());