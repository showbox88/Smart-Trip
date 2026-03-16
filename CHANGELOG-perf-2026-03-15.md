# Performance Optimization Changelog — 2026-03-15

> **scope**: pure performance optimization, zero functional / UI changes
> **branch**: `v2-cloud`
> **files changed**: 6 files, +116 / -56 lines

---

## 1. `js/maps.js` — Map module

### 1.1 Search input debounce (line ~794)

**Before**: `handleInput()` fires on every keystroke, sending a Google Places Autocomplete API call per character.
**After**: Added 300ms debounce timer. `clearBtn` visibility still updates instantly; only the API call is debounced.

```javascript
// before
searchInput.addEventListener('input', () => {
    clearBtn.style.display = searchInput.value ? 'flex' : 'none';
    handleInput();
});

// after
let _searchDebounceTimer;
searchInput.addEventListener('input', () => {
    clearBtn.style.display = searchInput.value ? 'flex' : 'none';
    clearTimeout(_searchDebounceTimer);
    _searchDebounceTimer = setTimeout(handleInput, 300);
});
```

### 1.2 Hotel staysMap hoisted out of `trip.days.forEach` (line ~402)

**Before**: Inside `initRealMap()`, the hotel stays mapping logic (`allStopsWithDays`, `staysMap`) was computed inside `trip.days.forEach()` — identical result recalculated N times (once per day).
**After**: Moved outside the loop, computed once. Also introduced `dayIndexMap` (Map<dayId, index>) to replace all `findIndex()` calls inside the loop with O(1) lookups. `allStopsWithDays` now only copies needed fields (`stayId, type, dayId, lat, lng`) instead of spreading the entire stop object.

### 1.3 Map instance reset also clears markers/cache (line ~321)

**Bug fix**: When `googleMapInstance` is reset due to DOM recreation (e.g. after language switch), `googleMapMarkers` array still held old objects, causing the stateKey cache check to return early and skip redrawing routes on the new map instance.
**After**: `googleMapMarkers`, `_mapRouteRenderers`, and `_lastMapStateKey` are all cleared together with `googleMapInstance`.

### 1.4 `showMarkerHoverInfo` hotel data lookup (line ~152)

**Before**: `trip.days.flatMap(d => d.stops.map(s => ({ ...s, day: d })))` on every marker hover — creates a full copy of all stops, then `.find()` twice.
**After**: Targeted early-break double loop that stops as soon as both check-in and check-out are found. No array allocation, no object spreading.

---

## 2. `js/ui/handlers/ux.js` — UX event handlers

### 2.1 Time wheel scroll throttle (line ~990)

**Before**: `scroll` event handler fires dozens of times per second. Each invocation runs `items.forEach(it => it.classList.remove('active'))` on ALL items.
**After**: Wrapped in `requestAnimationFrame`. Tracks `_lastWheelIndex` — only removes `active` from the previous item and adds to the new one. Skips entirely if index hasn't changed.

```javascript
// before
wheel.addEventListener('scroll', updateSelection);

// after
wheel.addEventListener('scroll', () => {
    if (!_wheelRaf) _wheelRaf = requestAnimationFrame(updateSelection);
});
```

### 2.2 mousemove / pointermove CSS variable update (line ~1635)

**Before**: `syncPointer()` immediately sets 3 CSS custom properties (`--x`, `--y`, `--xp`) on `document.documentElement` on every mouse event (~60+/sec), then separately schedules `applyGlow()` via RAF.
**After**: CSS variable writes are moved inside the RAF callback, batched with `applyGlow()`. Only one style recalc per frame.

### 2.3 dragover auto-scroll throttle (line ~564)

**Before**: `_startAutoScroll(ev.clientY)` called directly on every `dragover` event (hundreds/sec during drag).
**After**: Wrapped in RAF — at most one `_startAutoScroll` call per frame.

---

## 3. `js/ui/render.js` — App renderer

### 3.1 `setTimeout(50)` → `requestAnimationFrame` (line ~121)

**Before**: After `container.innerHTML = getTripHTML(trip)`, map init and sidebar glow were deferred with `setTimeout(50)`.
**After**: Uses `requestAnimationFrame` for precise frame-aligned scheduling.

### 3.2 Stay-hover event delegation (appended at end of file)

**Before**: Each timeline item and day header had inline `onmouseover` / `onmouseout` handlers that called `document.querySelectorAll('[data-stay-id=...]')` on every hover enter/exit.
**After**: Single delegated listener on `#app-container` using `mouseover` event bubbling. Elements now carry `data-stay-hover="<stayId>"` attribute instead of inline JS. Tracks `_lastHoveredStayId` to avoid redundant DOM queries when hovering within the same stay group.

---

## 4. `js/ui/templates/itinerary.js` — Itinerary HTML generation

### 4.1 `locationIdx` O(n²) → O(n) (line ~473)

**Before**: `day.stops.slice(0, index).filter(s => ...).length` inside `.map()` — for each stop, slices and filters all preceding stops. O(n²) for n stops per day.
**After**: Uses incremental counter `locCount` that increments as the loop progresses. O(n).

```javascript
// before
const locationIdx = day.stops.slice(0, index).filter(s => s.type === 'location' || !s.type).length;

// after
let locCount = 0;
// inside map():
const locationIdx = locCount;
if (stop.type === 'location' || !stop.type) locCount++;
```

### 4.2 `getDayHTML` findIndex → Map lookup (line ~312)

**Before**: `currentDayStay` search calls `trip.days.findIndex()` three times per `.find()` iteration — O(days × stays × days).
**After**: Pre-builds `_dayIdxMap = new Map(trip.days.map((d, i) => [d.id, i]))` — all index lookups are O(1).

### 4.3 `allStops` only copies needed fields (line ~293)

**Before**: `trip.days.flatMap(d => d.stops.map(s => ({ ...s, dayId: d.id })))` — spreads entire stop object.
**After**: Only copies `{ id, stayId, type, location, dayId }`.

### 4.4 Inline hover handlers → `data-stay-hover` attribute (lines ~122, ~337)

**Before**: Long inline `onmouseover="document.querySelectorAll(...).forEach(...)"` strings.
**After**: Simple `data-stay-hover="${stayId}"` attribute, handled by delegated listener in `render.js`.

---

## 5. `js/ui/templates/dashboard.js` — Dashboard HTML

### 5.1 List view image lazy loading (line ~55)

**Before**: `<img src="${trip.thumb}" style="...">` — no lazy loading in list view (grid view already had it).
**After**: Added `loading="lazy"` attribute.

---

## 6. `js/ui/handlers/stops.js` — Stop CRUD handlers

### 6.1 Deep clone method (line ~1130)

**Before**: `JSON.parse(JSON.stringify(stop))` — slowest deep clone method, also fails on undefined/functions.
**After**: `structuredClone(stop)` — native, faster, handles more types correctly.

---

## Quick reference: optimization categories

| Category | Items | Key benefit |
|----------|-------|-------------|
| Debounce / Throttle | #1.1, #2.1, #2.2, #2.3 | Reduce per-frame work, fewer API calls |
| Algorithm complexity | #1.2, #4.1, #4.2 | O(n²) → O(n), O(n) → O(1) lookups |
| Memory allocation | #1.4, #4.3, #6.1 | Avoid unnecessary object copies |
| Event delegation | #3.2, #4.4 | One listener instead of N × querySelectorAll |
| Frame scheduling | #3.1 | RAF instead of arbitrary setTimeout |
| Lazy loading | #5.1 | Defer off-screen image downloads |
| Bug fix | #1.3 | Map routes not redrawing after language switch |

---

## Bug Fixes — 2026-03-15 (post-optimization)

### B1. Map route doesn't update when stops are reordered (`js/maps.js`)

**Before**: `_lastMapStateKey` only included trip ID, pin count, dark mode, and collapsed days. Reordering stops produced the same key → cache hit → routes not redrawn.
**After**: Key now includes `stopOrderKey` (all stop IDs in order) and `colorKey` (all day colors). Any reorder or color change produces a new key → full redraw.

### B2. Map route color doesn't update immediately when day color changes (`js/maps.js`)

Same root cause as B1 — `colorKey` was not included in `_lastMapStateKey`. Fixed in the same change.

### B3. List item circles not aligned with text (`js/ui/templates/itinerary.js`)

**Before**: List item container used default `align-items`, causing the bullet circle to center-align against multi-line text.
**After**: Container set to `align-items: flex-start`; circle gets `margin-top: 3px` and `flex-shrink: 0` to pin it to the first line.

### B4. Street view fallback image for stops without Google Photos (`js/maps.js`, `js/ui/templates/itinerary.js`, `js/ui/handlers/stops.js`)

**Before**: Stops without a saved photo showed a random Unsplash/picsum placeholder.
**After**:
- `getStreetViewThumbUrl(lat, lng, w, h)` — async helper that uses `StreetViewService.getPanorama()` to fetch a panoid, then builds a `streetviewpixels-pa.googleapis.com/v1/thumbnail?panoid=...` URL (same source Google Maps uses).
- `window._lazyLoadStreetViews()` — post-render async scan of `img[data-sv-lat]` elements; fills `src` with street view URL.
- Stop card `<img>` tags carry `data-sv-lat` / `data-sv-lng` when no photo is saved; `_lazyLoadStreetViews()` is called after every render and after `autoAddStop`.
- Info panel also passes `fallbackLat/fallbackLng` so street view works even when `place.location` is null (e.g. subpremise addresses).

### B5. Map search bar arrow key navigation broken (`js/maps.js`)

**Root cause**: Google Maps registers a capture-phase keyboard listener on the map container to handle arrow-key panning. This listener consumed ArrowDown/ArrowUp before the dropdown navigation code could act on them.

**Fix**:
- On `searchInput` focus: `mapInstance.setOptions({ keyboardShortcuts: false })` — disables the map's keyboard handler entirely while the user is typing.
- On `searchInput` blur: `mapInstance.setOptions({ keyboardShortcuts: true })` — restores normal map keyboard panning.
- ArrowDown/ArrowUp handlers also call `e.stopPropagation()` and `clearTimeout(_searchDebounceTimer)` to prevent debounce from resetting `selectedIndex` mid-navigation.
- Navigating with arrow keys updates `searchInput.value` to the highlighted item's label and sets `_lastNavigatedValue` to suppress the `input` event from re-triggering a search.
