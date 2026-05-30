# Bible Microservices — Test Suite

Comprehensive regression test suite covering back‑end APIs, front‑end JavaScript
logic, HTML structure, and data integrity.

## Quick Start

```powershell
# Make sure all 4 services are running (Gateway:8080 + Text/Search/Module)
# Then run any of:

node tests/smoke.test.js           # 5‑second connectivity check
node tests/run-all.js              # Full regression (all suites)
node tests/backend/api.test.js     # Back‑end API only
node tests/frontend/js.test.js     # Front‑end JS syntax + logic
node tests/frontend/html.test.js   # Front‑end HTML structure + a11y
```

## Test Suites

### 1. Smoke Test (`tests/smoke.test.js`)
- **Purpose**: verify all 4 Gateway‑routed services are reachable.
- **Time**: ~5 seconds.
- **No dependencies**: uses Node 22 built‑in `fetch`.

### 2. Back‑end API Tests (`tests/backend/api.test.js`)
- **Purpose**: full regression of 19 API endpoints with data integrity checks.

| Section | Endpoints Covered | Key Assertions |
|---|---|---|
| 2.1 Translations | `GET /bible/translations` | 8 translations present, valid names |
| 2.2 Books | `GET /{trans}/books` | 66+ books per translation, Genesis/Revelation spot‑checks |
| 2.3 Chapters | `GET /{trans}/{book}/{ch}` | Gen 1 = 31 verses, Ps 119 = 176, John 3 = 36 |
| 2.4 Verses | `GET /{trans}/{book}/{ch}/{v}` | John 3:16 text validation (KJV + CUV 神爱世人) |
| 2.5 Random | `GET /{trans}/random` | Returns valid reference + text |
| 2.6 Range | `GET /{trans}/range` | Gen 1:1‑5 returns 5 verses |
| 2.7 Error | Invalid translation | Returns 4xx or graceful failure |
| 3. Strong's | `GET /strongs/{id}` | G25 = agapao, H1254 has definition |
| 3. Strong's | `GET /strongs/search?q=` | "love" returns results, lang filter works |
| 3. Strong's | `GET /strongs/stats` | total ≥ 14,000 (5,625 Greek + 8,674 Hebrew) |
| 4. Search | `GET /search?query=` | KJV "God" returns thousands, Chinese "神" works |
| 4. Search | Pagination | page/size parameters respected |
| 4. Search | `GET /search/suggest` | Returns suggestions array |
| 5. Annotations | `GET /annotations/commentaries` | Gen 1 has TSK entries, John 3:16 covered |
| 6. Modules | `GET /modules/available/installed` | Returns valid data |
| 7. CORS | All endpoints with Origin header | 127.0.0.1:3000 and localhost:3000 both work |
| 8. Integrity | Verse counts, text content | All 8 translations: 31 verses Gen 1; John 3:16 matches |

### 3. Front‑end JS Tests (`tests/frontend/js.test.js`)
- **Purpose**: catch JavaScript errors before they reach the browser.

| Section | Checks |
|---|---|
| A. BibleAPI class | getTranslations(), getChapter(), search(), strongsLookup() — mock fetch |
| A.5 API_BASE | `API_BASE === "http://localhost:8080/api/v1"` |
| B.1‑2 Syntax | `node --check` passes for both app.js AND api.js |
| B.3‑4 Functions | parseReference(), makeWordsClickable() (if exported) |
| B.5 State | `const state` has `translation`/`book`/`chapter` keys |
| B.6 Events | `DOMContentLoaded` listener present |
| C.1 Integration | app.js uses `BibleAPI.*` methods (not raw fetch) |
| C.2 Regression | No orphan code blocks outside functions (`system` bug) |

### 4. Front‑end HTML Tests (`tests/frontend/html.test.js`)
- **Purpose**: structural validation before deployment.

| Section | Checks |
|---|---|
| 1. Structure | `<html>`, `<head>`, `<body>`, UTF‑8 charset |
| 1.2 Layout | Sidebar, content, commentary‑panel all present |
| 1.3‑5 Navigation | Translation selector, chapter nav, search input |
| 1.6 Tabs | TSK / JFB / MHCC tab labels |
| 2. Scripts | api.js loads BEFORE app.js; no unknown scripts |
| 3. CSS | Non‑trivial, responsive @media rules, warm palette |
| 4. A11y | `lang` attribute, viewport meta, button text |
| 5. Quality | No `console.log`, ≥50% JSDoc coverage, no hardcoded URLs |

## Adding New Tests

1. Import helpers: `import {fetchJSON, assert, group, section, summary, FIXTURES} from "../helpers.js";`
2. Write tests in `section()`/`group()` blocks
3. Call `assert(expected, actual, label)` — tracks pass/fail automatically
4. End with `process.exit(summary());`

### Assertion pattern

```js
assert(expectedValue, actualValue, "descriptive label");
// expected == actual →  ✓ passed
// expected ≠ actual   →  ✗ failed (with diff)
```

## Prerequisites

- **Node.js ≥ 18** (uses built‑in `fetch` — no `node-fetch` needed)
- **All 4 services running**:
  - Gateway:  `http://localhost:8080`
  - Text:     `http://localhost:8081`
  - Search:   `http://localhost:8082`
  - Module:   `http://localhost:8083`

## CI Integration

```yaml
# GitHub Actions example
- name: Start services
  run: |
    $JAVA_HOME/bin/java -jar gateway.jar &
    $JAVA_HOME/bin/java -jar text-service.jar &
    sleep 30
- name: Run tests
  run: node tests/run-all.js
```

## File Layout

```
tests/
├── package.json          # npm scripts for convenience
├── run-all.js            # Master runner (all suites)
├── smoke.test.js         # 5‑second connectivity check
├── helpers.js            # fetchJSON(), assert(), FIXTURES
├── README.md             # ← This file
├── backend/
│   └── api.test.js       # Full API regression (19 endpoints)
└── frontend/
    ├── js.test.js        # JS syntax + logic tests
    └── html.test.js      # HTML structure + accessibility tests
```