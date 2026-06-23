# bible-microservices — Bible Study System

**Last updated**: 2026-06-24 | **Branch**: `monolith-clean`

Full-stack Bible study system inspired by AndBible. Single-JVM monolith backend + dual frontend (desktop + mobile).
Self-hosted SWORD module engine, Strong's interlinear, devotional reading, Bible maps, bilingual UI.

---

## 📋 Table of Contents

- [Architecture](#architecture)
- [Frontend](#frontend)
  - [Desktop Version](#desktop-version)
  - [Mobile Version](#mobile-version)
- [Data Overview](#data-overview)
- [Features](#features)
- [Quick Start](#quick-start)
- [Server Deployment](#server-deployment)
- [Key APIs](#key-apis)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Environment](#environment)

---

## Architecture

Single JVM monolith backend + Node.js frontend server. All 6 original microservices (gateway, text, search, module, auth, sword) are merged into one Spring Boot application.

```
┌─────────────────────────────────────────────┐
│              bible-monolith (:8080)          │
│  Text · Search · Sword · Module · Auth       │
│  H2 Database · Lucene · JSword               │
└─────────────────────────────────────────────┘
                    ▲
                    │ /api/*
                    ▼
┌─────────────────────────────────────────────┐
│         Frontend Server (:3000)              │
│  Node.js static + API proxy                  │
│  ├── /  → Desktop UI (3-column grid)         │
│  └── /m/ → Mobile UI (PWA, touch-first)      │
└─────────────────────────────────────────────┘
```

| Component | Port | Role |
|-----------|------|------|
| **bible-monolith** | 8080 | All backend: Bible verses, search, SWORD engine, auth, commentary, dictionary, Strong's |
| **Frontend** | 3000 | Node.js static server + `/api/*` proxy to monolith |

> The original 6-service microservices code is preserved in the repository
> (`bible-gateway/`, `bible-text-service/`, etc.) for reference. The monolith
> is the only supported deployment mode.

---

## Frontend

### Desktop Version

The desktop frontend is a pure HTML/CSS/JS SPA optimized for ≥900px screens. It uses a 3-column CSS Grid layout: book/chapter sidebar + verse reader + commentary panel.

- **URL**: `http://localhost:3000/`
- **Layout**: 3-column grid (200px sidebar + flexible reader + 280px commentary)
- **Theme**: Dark mode, optimized for long-form reading
- **Files**: `index.html`, `css/style.css` (1561 lines), `js/app.js` (3704 lines)

### Mobile Version

A dedicated mobile PWA designed for phones (320px–768px). Lives in `frontend/m/` — does not modify the desktop frontend.

- **URL**: `http://localhost:3000/m/`
- **Layout**: Single-column, sticky top bar, bottom navigation, swipeable chapter nav
- **Theme**: Matches desktop dark mode, ≥44px touch targets
- **PWA**: Installable, offline shell caching via Service Worker
- **Files**: `m/index.html`, `m/mobile.css`, `m/mobile.js` (~900 lines)

#### Mobile UI

```
┌─────────────────────────────┐
│  ☰  [Translation ▼]  🔍 ⚙️ │ ← Top bar (52px, sticky)
├─────────────────────────────┤
│  Genesis 1                   │ ← Chapter header
│  KJV 英王钦定本              │
├─────────────────────────────┤
│                             │
│  ¹ In the beginning, God    │ ← Verse content
│    created the heavens and  │    (tap word → Strong's)
│    the earth.               │
│  ² The earth was without    │
│    form and void...         │
│                             │
│  ← Swipe for prev/next →    │
├─────────────────────────────┤
│  ◀  1 / 50  ▶               │ ← Chapter nav
├─────────────────────────────┤
│  📖 Read  🔍 Search  📝 🔥  │ ← Bottom nav (56px)
└─────────────────────────────┘
```

#### Mobile Feature Matrix

| Feature | Desktop | Mobile |
|---------|---------|--------|
| Bible reading + chapter nav | ✅ click | ✅ swipe + buttons |
| Translation switch | ✅ | ✅ |
| Strong's dictionary | ✅ hover | ✅ tap word → popup |
| Interlinear (word-by-word) | ✅ | ✅ toggle in More menu |
| Search | ✅ | ✅ |
| Commentary | ✅ sidebar | ✅ slide-up drawer |
| Devotion (Spurgeon) | ✅ | ✅ |
| Bilingual UI (中/EN) | ✅ | ✅ |
| TTS (read aloud) | ✅ | ✅ |
| Font size | ✅ | ✅ pinch + A-/A+ |
| Bookmarks & Notes | ✅ | Phase 2 |
| Maps | ✅ | Phase 2 |
| Module manager | ✅ | — (use desktop) |
| Admin panel | ✅ | — (use desktop) |
| Multi-version compare | ✅ | Phase 2 |
| PWA install | — | ✅ |
| Offline reading | — | ✅ (Service Worker) |

---

## Data Overview

| Category | Count | Details |
|----------|-------|---------|
| Bibles (H2 database) | 13 | EN(7) + CN(2) + GR(2) + HE(1) + LA(1) |
| SWORD Bibles | 16 | LXX, SBLGNT, MorphGNT, Byz, TR, SP, OSHB, ChiUns, ChiUn, etc. |
| Total translations | 29 | Via `/api/v1/bible/translations` + `/api/v1/sword/modules` |
| Dictionaries | 5 SWORD + 3 local | Easton 3,961 + ISBE 9,349 + Nave 5,319 = 18,629 entries |
| Commentaries | 10 | TSK, MHCC, MHC, JFB, Clarke, Calvin, Barnes, RWP, Catena, Wesley |
| Strong's | 14,341 | Greek 5,667 + Hebrew 8,674 |
| GenBooks | 3 | Pilgrim's Progress, Daily Bread, Spurgeon Morning & Evening |
| Maps | 3 modules | BibleAtlas (8), BibleMap (2), ABSMaps (8) |
| Search indices | 22 | Lucene per translation |

---

## Features

- **Bible reader**: 29 translations, chapter navigation, verse-by-verse rendering
- **Interlinear view**: ChiUns/ChiUn Chinese + Strong's/Morph word-level display
- **Strong's hover/tap tooltip**: session cache, divineName tag stripping
- **Morphology popup**: Greek Robinson parser + full Hebrew OSHB table (406+ codes)
- **Commentary system**: tab-based switching, 10 commentaries
- **Dictionary popup**: search across Easton/ISBE/Nave
- **Devotional panel**: daily reading (SME 366 entries), calendar picker
- **General Book panel**: Pilgrim's Progress, paginated key list
- **Bible Maps panel**: module selector, thumbnail grid, full-screen viewer
- **Module manager**: install/uninstall SWORD modules, CrossWire repos
- **Bookmarks & Notes**: localStorage persistence
- **TTS reading**: per-verse + full chapter, auto-language detection
- **Bilingual UI**: Chinese/English/Bilingual modes
- **Multi-version comparison**: up to 3 translations side-by-side (desktop)
- **Mobile PWA**: installable, offline caching, swipe gestures

---

## Quick Start

```powershell
# Prerequisites: JDK 17+, Node.js 22+
$env:JAVA_HOME = "C:\Users\PC\scoop\apps\openjdk17\current"

# 1. Build monolith JAR
cd bible-monolith
.\gradlew.bat bootJar
# Output: build/libs/bible-monolith-1.0.0.jar (~75MB)

# 2. Start monolith (⚠️ from project root, so H2 ./data/text-db resolves)
cd ..
java -Xms48m -Xmx256m -XX:+UseG1GC `
  -Dsword.modules-path=./data/sword-mods `
  -jar bible-monolith/build/libs/bible-monolith-1.0.0.jar

# 3. Start frontend
cd frontend
node server.js

# 4. Open
#    Desktop: http://localhost:3000/
#    Mobile:  http://localhost:3000/m/
```

> **⚠️ Critical**: Always start the monolith from the **project root directory**
> (where `data/` lives). Starting from `build/libs/` will create an empty H2
> database at `build/libs/data/text-db.mv.db` (49KB) instead of using the real
> one (231MB).

> **H2 Database**: The `data/text-db.mv.db` file (~231MB) is excluded from git.
> To rebuild, run import scripts in `scripts/` or download from GitHub Releases.

---

## Server Deployment

### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend (desktop + mobile)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # API
    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # H2 Console (restrict in production!)
    location /h2-console {
        deny all;
    }
}
```

### Linux VPS

```bash
# 1. Install JDK 17
sudo apt install openjdk-17-jdk-headless

# 2. Upload files to /opt/bible-microservices/

# 3. Start monolith (from project root!)
cd /opt/bible-microservices
nohup java -Xms48m -Xmx160m -XX:+UseG1GC \
  -Dsword.modules-path=./data/sword-mods \
  -jar bible-monolith/build/libs/bible-monolith-1.0.0.jar \
  > monolith.log 2>&1 &

# 4. Start frontend
cd frontend
pm2 start server.js --name bible-frontend

# 5. Configure nginx
sudo nginx -t && sudo systemctl reload nginx
```

<details>
<summary>🔧 Auto-restart on boot (systemd)</summary>

```ini
# /etc/systemd/system/bible-monolith.service
[Unit]
Description=Bible Monolith
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/bible-microservices
ExecStart=/usr/bin/java -Xms48m -Xmx160m -XX:+UseG1GC -Dsword.modules-path=./data/sword-mods -jar bible-monolith/build/libs/bible-monolith-1.0.0.jar
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable bible-monolith
sudo systemctl start bible-monolith
```

</details>

<details>
<summary>🔧 Swap for 1GB VPS</summary>

```bash
sudo fallocate -l 512M /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
sudo sysctl vm.swappiness=10
```

</details>

### JVM Tuning

| Scenario | JVM Flags | Est. RAM |
|----------|-----------|----------|
| **1 GiB VPS** | `-Xms48m -Xmx160m -XX:+UseG1GC` | ~250MB |
| **2 GiB VPS** | `-Xms128m -Xmx384m -XX:+UseG1GC` | ~450MB |
| **Local dev** | `-Xms256m -Xmx512m -XX:+UseG1GC` | ~650MB |

---

## Key APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/bible/translations` | GET | List all translations |
| `/api/v1/bible/{tr}/{book}/{ch}` | GET | Get chapter verses |
| `/api/v1/search?query=...&translation=...` | GET | Full-text search |
| `/api/v1/strongs/{id}` | GET | Strong's dictionary lookup |
| `/api/v1/strongs/search?q=...` | GET | Strong's word search |
| `/api/v1/annotations/commentaries/{book}/{ch}` | GET | Commentaries for chapter |
| `/api/v1/sword/modules` | GET | List SWORD modules |
| `/api/v1/sword/install/{module}` | POST | Install SWORD module |
| `/api/v1/sword/{mod}/passage/{ref}` | GET | SWORD passage (with `?strongs=true` for interlinear) |
| `/api/v1/sword/genbook/{mod}/keys` | GET | List genbook keys |
| `/api/v1/sword/genbook/{mod}/content?key=...` | GET | Get genbook content |
| `/api/v1/sword/{mod}/dict/{id}` | GET | SWORD dictionary lookup |
| `/api/v1/auth/register` | POST | User registration |
| `/api/v1/auth/login` | POST | Login (returns JWT) |

---

## Project Structure

```
bible-microservices/
├── bible-monolith/             # ★ Monolith — single JVM, all services
│   └── src/main/kotlin/        # 48 Kotlin source files
├── bible-gateway/              # Original microservice (preserved, not used)
├── bible-text-service/         # Original microservice (preserved, not used)
├── bible-search-service/       # Original microservice (preserved, not used)
├── bible-module-service/       # Original microservice (preserved, not used)
├── bible-auth-service/         # Original microservice (preserved, not used)
├── bible-sword-service/        # Original microservice (preserved, not used)
├── bible-sword-reader/         # JSword library + stubs (shared dependency)
├── frontend/                   # Frontend (:3000)
│   ├── index.html              # Desktop UI
│   ├── css/style.css           # Desktop styles (1561 lines)
│   ├── js/
│   │   ├── app.js              # Desktop logic (3704 lines)
│   │   ├── morphology.js       # Greek Robinson + Hebrew OSHB parser (shared)
│   │   ├── api.js              # API helper class
│   │   └── config.js           # Configuration
│   ├── server.js               # Node.js static + proxy server
│   ├── m/                      # ★ Mobile frontend (NEW)
│   │   ├── index.html          # Mobile UI shell
│   │   ├── mobile.css          # Mobile-optimized styles
│   │   ├── mobile.js           # Mobile app logic (~900 lines)
│   │   ├── manifest.json       # PWA manifest
│   │   └── icon.svg            # App icon
│   ├── admin.html              # Admin panel
│   ├── modules.html            # Module manager
│   └── regression-test.ps1     # Pre-deploy check
├── data/
│   ├── text-db.mv.db           # H2 database (~231MB, not in git)
│   ├── sword-mods/             # 25+ SWORD modules
│   └── sword-dicts/            # Strong's JSON dictionaries
├── scripts/                    # Import scripts + tools
├── docs/                       # Architecture docs
├── build.gradle.kts            # Root Gradle config
└── README.md                   # This file
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Spring Boot 3.2 + Kotlin + Gradle |
| Database | H2 File (embedded, ~231MB) |
| Search | Apache Lucene 9.x |
| SWORD Engine | JSword (CrossWire) |
| Frontend (Desktop) | Vanilla JS + CSS3 + HTML5 |
| Frontend (Mobile) | Vanilla JS PWA, shared morphology.js |
| Frontend Server | Node.js (static + API proxy) |
| TTS | Web Speech API |

---

## Environment

| Dependency | Version | Purpose |
|------------|---------|---------|
| JDK | 17+ | Backend (Spring Boot 3.x) |
| Node.js | 22+ | Frontend server |
| Gradle | 8.x | Build (wrapper included) |

---

## License

See [LICENSE](LICENSE) and [COPYRIGHTS.md](COPYRIGHTS.md). Bible translations and SWORD modules
are copyrighted by their respective owners and distributed under their own licenses.
