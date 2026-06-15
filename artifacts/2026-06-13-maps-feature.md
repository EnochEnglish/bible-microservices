# Bible Maps Feature Implementation — 2026-06-13

## Objective
Implement Bible Maps functionality in the Bible Microservices system, following JSword/AndBible architecture where maps are a standalone `BookCategory.MAPS` (separate from Bibles, Commentaries, Dictionaries, Devotionals, and General Books).

## Key Decisions

### Architecture
- **Maps = standalone category**: JSword treats maps as `BookCategory.MAPS`, using the same `BookData`/`Book` API as other module types
- **Backend**: Extended `GenBookService` and `GenBookController` to handle MAPS category
- **Image serving**: Filesystem-based direct read (not JSword BookData API, which lacks raw binary access)
- **Module driver**: `RawGenBook` — same as General Books/Devotionals, but entries contain image files instead of OSIS XML

### CrossWire Catalog Reality
- **No maps in CrossWire main catalog** (425 modules): `mapm` is classified as BIBLE, no module has `MAPS` category
- **No maps in CrossWire beta catalog** (14 modules)
- **AndBible map modules**: historically bundled in APK, not downloadable
- **Solution**: Create test module locally, document the format for user/custom creation

## Backend Changes

### GenBookService.kt
- `listKeys()`: Added `BookCategory.MAPS` to accepted categories
- `getContent()`: Added MAPS guard (maps don't use OSIS XML path)
- `getMapImageFile()`: New method — walks filesystem to find image in `modules/genbook/rawgenbook/{module}/{module}/{key}/image`
- `detectImageMime()`: Enhanced to detect SVG (`<svg` prefix) in addition to JPEG/PNG/GIF/WebP magic bytes
- `listMapKeys()`: Private helper — enumerates numbered subdirectories, reads `title` files for map names
- Injected `@Value("${sword.modules-path}")` for resolving module directories

### GenBookController.kt
- `GET /api/v1/sword/genbook/{module}/image?key=N`: New endpoint
- Returns image binary with correct Content-Type (image/svg+xml, image/png, image/jpeg, etc.)
- Cache-Control: max-age=86400
- 404 if module not found or not a MAPS module

## Test Module: BibleMap

Created locally at `data/sword-mods/BibleMap/` with 2 SVG maps:

### Module Structure
```
BibleMap/
├── mods.d/
│   └── biblemap.conf          # Category=Maps, ModDrv=RawGenBook
└── modules/genbook/rawgenbook/biblemap/biblemap/
    ├── 1/
    │   ├── title              # "World of the Patriarchs"
    │   └── image              # SVG: Egypt+Canaan+Mesopotamia with Abraham's route
    └── 2/
        ├── title              # "Paul's Missionary Journeys"
        └── image              # SVG: Mediterranean with 1st+2nd journey routes
```

### Lessons Learned
1. `.conf` file must be directly in `mods.d/`, NOT nested in a subdirectory
2. Module directories must be numbered (1, 2, 3...) — JSword RawGenBook expects integer keys
3. `title` files contain the display name (no extension, UTF-8 text)
4. `image` files contain binary (JPEG/PNG) or text (SVG) with no extension

## Frontend Changes

### HTML (index.html)
- Added `🗺️ 地图` button in toolbar (after GenBook button)
- Added `#mapsOverlay` panel with:
  - Module selector dropdown
  - Thumbnail grid container
  - Full-size image viewer (prev/next navigation, zoom toggle)

### CSS (style.css)
- `.maps-panel`, `.maps-thumbnail-grid`, `.maps-thumbnail-card` — thumbnail grid styles
- `.maps-image-viewer`, `.maps-image-nav`, `.maps-image-container` — fullscreen viewer
- `.zoomed` class for click-to-zoom (transform: scale(2))
- Hover effects on thumbnails

### JS (app.js, ~90 lines)
- `mapsState` module-level state (modules, currentModule, maps, currentIndex)
- `openMapsPanel()` → fetches sword-service modules, filters MAPS, populates dropdown
- `switchMapsModule()` → fetches keys list, populates thumbnails
- `renderMapThumbnails()` → grid of `<img>` cards with lazy loading
- `openMapImage(index)` → fullscreen viewer
- `navigateMap(delta)` → prev/next map
- `toggleMapZoom()` → CSS class toggle for zoom

## API Verification

All endpoints tested and working:

```
GET  /api/v1/sword/genbook/BibleMap/keys
→ {"success":true,"data":{"module":"BibleMap","totalCount":2,"keys":[...]}}

GET  /api/v1/sword/genbook/BibleMap/image?key=1
→ 200 image/svg+xml (1566 bytes) — "World of the Patriarchs"

GET  /api/v1/sword/genbook/BibleMap/image?key=2
→ 200 image/svg+xml (2156 bytes) — "Paul's Missionary Journeys"
```

## Status

- ✅ Backend MAPS support: done
- ✅ Image serving endpoint: done
- ✅ Test map module: done  
- ✅ Frontend map viewer: done
- ✅ Git commit + push: done (ff7f94e, 04b7aca)
- ⬜ Real map data: depends on finding/bundling map modules (none in CrossWire catalog)
