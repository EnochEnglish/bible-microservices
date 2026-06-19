# bible-microservices — Bible Study Microsystems

**Last updated**: 2026-06-20 | **Branch**: `frontend-fixes-20260620` | **Commit**: `c0e7d64`

Full-stack Bible study system inspired by AndBible. Merged monolith JVM app + pure HTML/CSS/JS frontend.
Self-hosted SWORD module engine, Strong's interlinear, devotional reading, Bible maps.

---

## Architecture (Monolith)

> As of 2026-06-20, 6 services merged into **bible-monolith** (single JVM) to reduce memory footprint from ~2GB to ~350MB.

| Component | Port | Role |
|-----------|------|------|
| **bible-monolith** | 8080 | All backend: Bible verses, search, modules, SWORD engine, auth, commentary, dictionary, Strong's |
| **Frontend** | 3000 | Node.js static server + `/api/*` proxy to monolith (bilingual UI) |

## Data Overview

| Category | Count | Details |
|----------|-------|---------|
| Bibles (Text service) | 13 | EN(7) + CN(2) + GR(2) + HE(1) + LA(1) |
| SWORD Bibles | 16 | LXX, SBLGNT, MorphGNT, Byz, TR, SP, OSHB, ChiUns, ChiUn, etc. |
| Dictionaries | 5 SWORD + 3 local | Easton 3,961 + ISBE 9,349 + Nave 5,319 = 18,629 local entries |
| Commentaries | 10 | TSK, MHCC, MHC, JFB, Clarke, Calvin, Barnes, RWP, Catena, Wesley |
| Strong's | 14,341 | Greek 5,667 + Hebrew 8,674 |
| GenBooks | 3 | Pilgrim, Daily, SME (Spurgeon Morning & Evening) |
| Maps | 1 test module | BibleMap (2 SVG maps, extensible) |
| Search indices | 22 | Lucene per translation |

## Frontend Features

- **Bible reader**: 29 translations, chapter navigation, verse-by-verse rendering
- **Interlinear view**: ChiUns/ChiUn Chinese + Strong's/Morph word-level display
- **Strong's hover tooltip**: 300ms debounce + session cache, divineName tag stripping
- **Morphology popup**: Greek Robinson parser (V-AAI-3S→"Aorist Active Indicative") + full Hebrew OSHB table (7 stems × all tenses), covers 406+ codes
- **Commentary system**: tab-based switching, fallback from text-service to SWORD
- **Dictionary popup**: search across Easton/ISBE/Nave
- **Devotional panel**: daily reading (SME 366 entries, Daily), calendar picker, reading check
- **General Book panel**: Pilgrim's Progress, paginated key list, search
- **Bible Maps panel**: module selector, thumbnail grid, full-screen viewer with zoom
- **Module manager**: install/uninstall SWORD modules, 5 CrossWire repository sources
- **Bookmarks & Notes**: localStorage persistence
- **TTS reading**: per-verse + full chapter, auto-language detection
- **Bilingual UI**: Chinese/English/Bilingual modes
- **Multi-version comparison**: up to 3 translations side-by-side
- **Regression test**: pre-deploy encoding+BOM+syntax check (`regression-test.ps1`)

## Quick Start

```powershell
# Prerequisites: JDK 17+, Node.js
$env:JAVA_HOME = "C:\Users\PC\scoop\apps\openjdk17\current"

# 1. Build monolith
cd D:\dev\github\bible-microservices\bible-monolith
.\gradlew.bat bootJar

# 2. Start monolith (includes all 6 services)
java -Xms48m -Xmx160m -jar build/libs/bible-monolith.jar --server.port=8080

# 3. Frontend
cd D:\dev\github\bible-microservices\frontend
node server.js
```

## Branches

| Branch | Purpose |
|--------|---------|
| `main` | Stable releases |
| `merged-monolith` | 6→1 service merge, reduced memory footprint |
| `frontend-fixes-20260620` | Morphology parser, regression test, encoding guards |

## Key APIs

| Endpoint | Service |
|----------|---------|
| `GET /api/v1/bible/{tr}/{book}/{ch}` | Text |
| `GET /api/v1/search?query=...&translation=...` | Search |
| `GET /api/v1/strongs/{id}` | Text |
| `GET /api/v1/annotations/commentaries/{book}/{ch}` | Text |
| `GET /api/v1/sword/modules` | Sword |
| `POST /api/v1/sword/install/{module}` | Sword |
| `GET /api/v1/sword/genbook/{mod}/keys` | Sword |
| `GET /api/v1/sword/genbook/{mod}/content?key=...` | Sword |
| `GET /api/v1/sword/genbook/{mod}/image?key=N` | Sword (MAPS) |
| `GET /api/v1/text/bookmarks` | Text |
| `POST /api/v1/text/notes` | Text |

## Project Structure

```
bible-microservices/
├── bible-monolith/             # Merged monolith (:8080) — all 6 services
│   └── src/main/kotlin/        # 48 Kotlin source files
├── bible-sword-reader/         # JSword library + stubs
├── frontend/                   # SPA (:3000)
│   ├── index.html
│   ├── server.js               # Monolith proxy + Cache-Control headers
│   ├── js/
│   │   ├── app.js              # ~3000 lines
│   │   ├── morphology.js       # Greek Robinson + Hebrew OSHB parser
│   │   ├── api.js
│   │   └── config.js
│   ├── css/style.css
│   └── regression-test.ps1     # Encoding + syntax pre-deploy check
├── data/
│   ├── text-db.mv.db           # H2 database (~231MB)
│   ├── auth-db.mv.db           # Auth H2 database
│   ├── lucene-index/
│   └── sword-mods/             # 25+ installed SWORD modules
├── dist/                       # Built JARs
├── scripts/                    # Import scripts + tools
├── tests/                      # Test suites
├── docs/                       # Architecture docs + guides
└── artifacts/                  # Task documentation
```

## Map Module Format

Create map modules for SWORD (RawGenBook driver):

```
MyAtlas/
├── mods.d/
│   └── myatlas.conf            # [MyAtlas] / Category=Maps / ModDrv=RawGenBook
└── modules/
    └── genbook/
        └── rawgenbook/
            └── myatlas/
                └── myatlas/
                    ├── 1/
                    │   ├── title      # "Map of the Exodus"
                    │   └── image      # JPEG/PNG/SVG
                    └── 2/
                        ├── title
                        └── image
```

Copy to `data/sword-mods/MyAtlas/`, then `POST /api/v1/sword/reload`.

## Timeline (Recent)

- **2026-06-20**: Monolith merge (6→1, -85% RAM), morphology.js (Greek Robinson parser + full Hebrew OSHB table — 406 codes), regression test, autocomplete fix, encoding safeguards
- **2026-06-16**: Captcha + admin panel, DictionaryController rebuild, ECS deployment package v2.0, 7 commits pushed
- **2026-06-10**: Module install subsystem (CrossWire mirrors), GenBook reader, devotional panel, UI refactoring
- **2026-06-11**: Morph tooltips, calendar controls, bookmark/note controllers, repository manager
- **2026-06-12**: TSK integration, verse hover toolbar, custom repo sources, self-hosting guide
- **2026-06-13**: Bible Maps backend + frontend viewer, Git push

## Tech Stack

- **Backend**: Spring Boot 3.2 + Kotlin + Gradle
- **Database**: H2 File (embedded)
- **Search**: Apache Lucene 9.x
- **SWORD Engine**: JSword (CrossWire) with stub IndexManager
- **Frontend**: Vanilla JS + CSS3 + HTML5, bilingual I18N
- **TTS**: Web Speech API

## Environment

| Dependency | Version | Windows Path |
|------------|---------|--------------|
| JDK | 17+ | `C:\Users\PC\scoop\apps\openjdk17\current` |
| Node.js | 22+ | (system PATH) |
| Python | 3.12+ | (system PATH) |
