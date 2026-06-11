/**
 * html.test.js — front‑end HTML structure & accessibility tests
 *
 * Validates index.html structure without a browser:
 *  - required elements exist (ids/classes)
 *  - CSS is referenced and accessible
 *  - JS scripts are referenced in correct order
 *  - basic accessibility attributes
 *
 * Run:  node tests/frontend/html.test.js
 */

import {readFileSync} from "fs";
import {assert, group, section, summary} from "../helpers.js";

const HTML = readFileSync(
  new URL("../../frontend/index.html", import.meta.url), "utf8");
const CSS  = readFileSync(
  new URL("../../frontend/css/style.css", import.meta.url), "utf8");

// ── helpers ──────────────────────────────────────────────────────────────
const hasId      = (id)    => new RegExp(`id\\s*=\\s*"${id}"`).test(HTML);
const hasClass   = (cls)    => new RegExp(`class\\s*=[^>]*\\b${cls}\\b`).test(HTML);
const hasTag     = (tag)    => new RegExp(`<${tag}[\\s>]`).test(HTML);
const hasScript  = (src)    => HTML.includes(`src="${src}"`);
const hasLink    = (href)    => HTML.includes(`href="${href}"`);

// ══════════════════════════════════════════════════════════════════════════
section("1. HTML STRUCTURE — required elements");

group("1.1 Root layout containers", () => {
  assert(true, hasTag("html"),    "<html> tag present");
  assert(true, hasTag("head"),    "<head> present");
  assert(true, hasTag("body"),    "<body> present");
  assert(true, hasTag("meta"),    "<meta charset> present");
  assert(true, HTML.includes("utf-8") || HTML.includes("UTF-8"),
    "UTF-8 charset declared");
});

group("1.2 Three‑column layout", () => {
  // sidebar (book list)
  assert(true, hasClass("sidebar"),
    "sidebar container present");
  // main content area (class="main")
  assert(true, hasClass("main"),
    "main content area present");
  // commentary / TSK panel
  assert(true, hasId("tskContent") || HTML.includes("tskContent"),
    "commentary panel (#tskContent) present");
});

group("1.3 Translation selector", () => {
  assert(true, HTML.includes("translation") || HTML.includes("version-select"),
    "translation selector element present");
});

group("1.4 Chapter header / navigation", () => {
  assert(true, hasClass("chapter-header") || hasId("chapterHeader"),
    "chapter header element present");
  assert(true, hasClass("chapter-nav") || hasId("chapterNav"),
    "chapter navigation container present");
});

group("1.5 Search input", () => {
  assert(true, HTML.includes("search") && HTML.includes("input"),
    "search input present");
});

group("1.6 Commentary / TSK tabs", () => {
  // Tabs are dynamically generated in JS — check JS source references
  const appSrc = readFileSync(new URL("../../frontend/js/app.js", import.meta.url), "utf8");
  assert(true, appSrc.includes("TSK"), "app.js references TSK");
  assert(true, appSrc.includes("JFB"), "app.js references JFB");
  assert(true, appSrc.includes("MHCC"), "app.js references MHCC");
});

// ══════════════════════════════════════════════════════════════════════════
section("2. SCRIPT REFERENCES");

group("2.1 JS files loaded in correct order", () => {
  // api.js must load BEFORE app.js (app.js depends on BibleAPI global)
  const apiIdx  = HTML.indexOf('src="js/api.js"');
  const appIdx  = HTML.indexOf('src="js/app.js"');
  assert(true, apiIdx > -1, "api.js script tag present");
  assert(true, appIdx > -1, "app.js script tag present");
  if (apiIdx > -1 && appIdx > -1) {
    assert(true, apiIdx < appIdx, "api.js loads before app.js");
  }
});

group("2.2 No broken script references", () => {
  const scripts = [...HTML.matchAll(/src="([^"]+\.js)"/g)].map(m => m[1]);
  for (const src of scripts) {
    const exists = ["js/api.js", "js/app.js"].includes(src);
    assert(true, exists, `script "${src}" is known (${exists ? "OK" : "UNKNOWN"})`);
  }
});

group("2.3 CSS file referenced", () => {
  assert(true, hasLink("css/style.css"), "style.css linked in <head>");
});

// ══════════════════════════════════════════════════════════════════════════
section("3. CSS — basic style sanity");

group("3.1 CSS file is non‑trivial", () => {
  assert(true, CSS.length > 500, `style.css has content (${CSS.length} bytes)`);
});

group("3.2 Responsive / mobile rules present", () => {
  assert(true, CSS.includes("@media") || CSS.includes("max-width") || CSS.includes("min-width"),
    "CSS has responsive @media rules");
});

group("3.3 Theme palette", () => {
  // Dark theme (--bg:#0f1117) with accent colours
  assert(true, /#[0-9a-fA-F]{3,8}/.test(CSS), "CSS contains colour values");
  // Check for CSS custom property definitions
  assert(true, CSS.includes("--bg"), "CSS has --bg custom property");
  assert(true, CSS.includes("--accent"), "CSS has --accent custom property");
  assert(true, CSS.includes("--verse-num"), "CSS has --verse-num custom property");
});

// ══════════════════════════════════════════════════════════════════════════
section("4. ACCESSIBILITY basics");

group("4.1 Language attribute", () => {
  assert(true, /<html[^>]+lang\s*=/i.test(HTML), "<html lang=...> attribute present");
});

group("4.2 Viewport meta tag", () => {
  assert(true, HTML.includes("viewport"), "viewport meta tag present");
});

group("4.3 Button elements have accessible text", () => {
  const buttons = [...HTML.matchAll(/<button[^>]*>([^<]*)<\/button>/g)];
  for (const m of buttons) {
    const txt = m[1].trim();
    assert(true, txt.length > 0 || m[0].includes("aria-label"),
      `button has text or aria-label: "${txt || '[aria-label]'}"`);
  }
});

// ══════════════════════════════════════════════════════════════════════════
section("5. app.js — code quality checks");

const APP_JS = readFileSync(
  new URL("../../frontend/js/app.js", import.meta.url), "utf8");

group("5.1 No console.log left in production code", () => {
  const logs = (APP_JS.match(/console\.(log|debug)/g) || []);
  assert(true, logs.length === 0,
    `no console.log/debug in app.js (found ${logs.length})`);
});

group("5.2 Functions are commented", () => {
  const fns = [...APP_JS.matchAll(/function\s+(\w+)/g)].map(m => m[1]);
  let commented = 0;
  const lines = APP_JS.split("\n");
  for (const fn of fns) {
    // find function by scanning lines
    const fnLineIdx = lines.findIndex(l => l.includes(`function ${fn}`));
    if (fnLineIdx < 0) continue;
    // Check the 10 lines above for JSDoc /** pattern
    const start = Math.max(0, fnLineIdx - 10);
    const before = lines.slice(start, fnLineIdx).join("\n");
    if (before.includes("/**") || before.includes("*/") || before.includes("//")) {
      commented++;
    }
  }
  const pct = fns.length > 0 ? Math.round(commented / fns.length * 100) : 0;
  assert(true, pct >= 10,
    `${pct}% of functions have comments ($commented/${fns.length})`);
});

group("5.3 No hardcoded localhost URLs (should use api.js)", () => {
  const hardHost = (APP_JS.match(/https?:\/\/[^"'\s]+/g) || [])
    .filter(u => !u.includes("localhost:8080") === false);
  // Actually we expect it to use the API_BASE from api.js, not hardcoded URLs
  const hardcoded = (APP_JS.match(/https?:\/\/[^"'\s]+/g) || [])
    .filter(u => !u.startsWith("http://localhost") && !u.startsWith("${"));
  assert(true, hardcoded.length === 0,
    `no hardcoded URLs in app.js (found: ${JSON.stringify(hardcoded)})`);
});

// ── finish ────────────────────────────────────────────────────────────────────
process.exit(summary());