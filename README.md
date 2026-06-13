# bible-microservices — Bible Study Microservices

**Last updated**: 2026-06-13 | **Commit**: ff7f94e

Full-stack Bible study system inspired by AndBible. 6 Spring Boot microservices + pure HTML/CSS/JS frontend.
Self-hosted SWORD module engine, Strong's interlinear, devotional reading, Bible maps.

---

## Architecture (6 Services)

| Service | Port | Role |
|---------|------|------|
| **Gateway** | 8080 | API routing, CORS |
| **Text** | 8081 | Bible verses, commentaries, Strong's, dictionaries, bookmarks/notes |
| **Search** | 8082 | Lucene full-text search (22 indices) |
| **Module** | 8083 | Module import, format parsing |
| **Sword** | 8086 | JSword-native SWORD module engine (16 Bibles, 5 dictionaries, 2 commentaries, 3 GenBooks + Maps) |
| **Frontend** | 3000 | SPA with Node.js API proxy (bilingual UI) |

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
- **Strong's hover tooltip**: 300ms debounce + session cache
- **Morphology panel**: 16 common Hebrew codes, per-code popup
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

## Quick Start

```powershell
# Prerequisites: JDK 17+, Node.js
$env:JAVA_HOME = "C:\Users\PC\scoop\apps\openjdk17\current"

# 1. Build & start all services
cd D:\dev\github\bible-microservices
.\start.ps1

# 2. Frontend (auto-starts with start.ps1)
cd frontend && node server.js
```

### Manual service start
```powershell
Start-Process -WindowStyle Hidden java -jar dist/bible-sword-service.jar --server.port=8086 --sword.modules-path=D:/dev/github/bible-microservices/data/sword-mods
# Wait 15s, verify: curl http://localhost:8086/api/v1/sword/modules
```

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
├── bible-gateway/              # Gateway (:8080)
├── bible-text-service/         # Text (:8081) — core data layer
├── bible-search-service/       # Search (:8082)
├── bible-module-service/       # Module (:8083)
├── bible-sword-service/        # Sword (:8086) — JSword engine
├── bible-sword-reader/         # JSword library + stubs
├── frontend/                   # SPA (:3000)
│   ├── index.html
│   ├── server.js               # API proxy + static serve
│   ├── js/app.js               # ~3000 lines
│   └── css/style.css
├── data/
│   ├── text-db.mv.db           # H2 database (~231MB)
│   ├── lucene-index/
│   └── sword-mods/              # SWORD module installation dir
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
