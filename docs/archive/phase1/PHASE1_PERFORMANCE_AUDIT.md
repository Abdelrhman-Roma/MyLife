# PHASE 1 — PERFORMANCE AUDIT

Date: 2026-08-17
Scope: Legacy multi-page app (`/js/`, `/services/`, `/repositories/`) + React rewrite (`MyLife-React/src/`)

---

## Résumé — Top Bottlenecks Ranked by Impact

| Rank | Area | Issue | Impact |
|------|------|-------|--------|
| 1 | Legacy runtime | `shared.js` (105 KB, 1,969 lines) fully parsed and executed on every single page load — no bundling, no code splitting, no tree-shaking | Every page pays the full cost of 90+ functions it may not use |
| 2 | Data layer | Full page `innerHTML` re-render triggered by every Firestore snapshot in todo, nutrition, study, habits — no partial DOM update | Any background write causes a visible repaint of the entire page |
| 3 | Firestore listeners | Up to 8 simultaneous realtime subscriptions per page (study, prayer); subscriptions from disposed pages are not always torn down (workout timer leak, weather interval leak) | Growing listener count on SPA-style navigation; Firestore read bill scales with page visits |
| 4 | Startup | No module bundler on legacy project: every page script-tag-loads shared.js + feature module + firebase SDK + locale files sequentially over HTTP — 6–10 round trips before first paint | First Contentful Paint blocked by serial script loading |
| 5 | Legacy data blob | `LegacyDataSync` persists the entire `window.currentData` object to Firestore on every 80 ms debounce tick, even when only one field changed | Unnecessary write amplification; large document payload on every user interaction |
| 6 | Dashboard widgets | 17 widgets, 11 reading from `window.currentData` snapshots without a staleness indicator; live widgets (Todo, Notifications) each open their own Firestore subscription on top of the page's existing ones | Cold-load dashboard opens up to 13 simultaneous Firestore listeners |
| 7 | React bundle | `enableIndexedDbPersistence` (deprecated Firebase v9+ API) silently fails in multi-tab scenarios; no offline queue fallback | Data writes lost when two tabs are open |
| 8 | Images | Profile/cover photos stored as base64 data URLs in localStorage (`mylife.image.{uid}_{kind}`) — localStorage has a ~5 MB quota and is synchronous | Large avatars block the main thread on read/write; quota exhaustion crashes the app silently |
| 9 | Weather | 30-minute dashboard weather `setInterval` stored on `window.__dashboardWeatherRefresh`, never cleared — survives page navigation | One leaked interval per navigation; eventual heap pressure and unnecessary network calls |
| 10 | Workout timers | `sessionClockInterval` and all `sessionTimers` entries not cleared in `disposeWorkoutPage` | Timer callbacks fire against a detached DOM after leaving the workout page |

---

## Legacy Project Performance Issues

### Startup / Load

**No bundler or code splitting.**
The legacy project is served as a collection of plain HTML files each loading scripts with `<script src="...">` tags. There is no Vite/Webpack/Rollup build step for the legacy tree. Every page load triggers independent HTTP requests for:
- `shared.js` (~105 KB)
- The page-specific feature module (e.g. `calendar.js` at 65 KB, `workout.js` at 95 KB, `study.js` at 78 KB)
- Firebase SDK (loaded as a CDN script or inline module)
- Locale files (`locales/en.js`, `locales/ar.js`, etc.) as plain `<script>` tags
- Individual service files (`WeatherService.js`, `DataService.js`, etc.) each as separate requests

Total cold-start script payload per page: estimated 300–450 KB uncompressed across 8–12 network requests before any page logic executes.

**Font and CSS order.**
`initI18n()` runs at parse time (called immediately in `i18n.js`) and applies theme/palette before first paint by setting `data-theme` on `<html>`. This is the one intentional anti-flash optimization. However, CSS files are not split; every page loads the full stylesheet regardless of the subset of components it uses.

**Firebase initialization cost.**
`firebase/firebase.js` calls `initializeFirestore` with `persistentLocalCache` and `persistentMultipleTabManager` on every page load. The IndexedDB persistence layer is re-initialized per navigation in the legacy multi-page model — there is no shared app-level singleton across pages.

**No service worker caching for app shell.**
`sw.js` is registered by `initNotificationRuntime()` in `shared.js`, but its scope and caching strategy are not documented in the audited files. There is no evidence of a precache manifest for app-shell assets.

---

### Runtime

**shared.js 105 KB parsed on every page.**
The file contains 90+ functions. Pages like `prayer.html` parse the full `renderDashboard`, `renderStatistics`, `renderNutrition`, and `renderWorkoutArtBoard` implementations even though they are never called. No lazy-loading, no dynamic `import()`, no dead-code elimination.

**Full DOM re-render on every data event.**
The following modules call a single top-level render function in response to every Firestore snapshot, every filter change, and every keypress:
- `todo.js` — full page `innerHTML` reset on snapshot, filter change, search debounce (200 ms)
- `nutrition.js` — `renderNutritionRoot` called by all 6 subscription handlers; a single water-glass log triggers a full nutrition page repaint
- `study.js` — `safeRenderStudyRoot` wraps all rendering; any of the 8 subscription events repaints the entire study page
- `habits.js` — no loading skeleton; user sees the empty-state during the initial Firestore round trip

**No virtual DOM or partial update strategy.**
There is no diffing layer. Every render replaces the full container `innerHTML`. For long lists (todo tasks with subtasks, calendar events, study sessions) this means the browser must parse, layout, and paint an entirely new subtree on every change.

**Duplicate Firestore listener pattern.**
`calendar.js` subscribes to 5 cross-module repositories (tasks, habits, goals, prayers, study) in addition to its own calendar collection. `dashboard-widget-defs.js` opens its own TodoRepository and NotificationRepository subscriptions independent of `todo.js` and `notification-center.js`. On the dashboard page, `RepoAggregatorSync` also subscribes lazily per widget — resulting in potentially overlapping listeners for the same Firestore path if multiple consumers are active.

**Timer and observer leaks on navigation.**

| Source | Leaked resource | Condition |
|--------|----------------|-----------|
| `workout.js` | `sessionClockInterval`, `sessionTimers{}` | Not cleared in `disposeWorkoutPage` |
| `weather-dashboard.js` | `window.__dashboardWeatherRefresh` setInterval (30 min) | Never cleared on any lifecycle event |
| `study.js` | Pomodoro `setInterval` | `startStudyTicker` interval not explicitly cleared in `disposeStudyPage` |

**`reconcileSourceLinkedEvents` write storm.**
`calendar.js` runs `reconcileSourceLinkedEvents` on every Firestore snapshot and issues a Firestore write per changed field across all source collections. On first load when all source data arrives simultaneously this can produce dozens of small writes in a burst.

---

### Data Layer

**Firestore blob write amplification.**
`LegacyDataSync` debounces writes at 80 ms and writes the entire `window.currentData` blob (all domains concatenated) to `users/{uid}.appData` on every call to `persist()`. A user toggling a single habit completion triggers a write of the full blob — potentially hundreds of kilobytes — rather than a targeted field update.

**localStorage read frequency.**
`getSessionUser()` is called on every page boot and calls `getUsers()`, which parses the full `mylife.users` JSON array from localStorage synchronously. If the users array grows large (many local accounts), this blocks the main thread on every page load.

**localStorage image storage.**
Profile and cover photos are stored as base64 data URLs in localStorage under `mylife.image.{uid}_avatar` and `mylife.image.{uid}_cover`. A single high-resolution photo can consume 1–2 MB of the ~5 MB quota. Reading a base64 string from localStorage is synchronous and blocks the main thread.

**No IndexedDB usage in legacy project.**
`shared.js` uses zero IndexedDB calls. All local persistence is synchronous localStorage. There is no background write queue, no structured storage for large binary assets, and no offline mutation log outside of Firestore's own persistence cache.

**DataService cache uses localStorage.**
`DataService.js` caches fetched Quran/Azkar JSON responses in localStorage under `mylife_data_cache_v1_{url}`. The Quran full JSON (`data/quran/quran.json`) can be several megabytes. Storing it in localStorage compounds the quota pressure from image storage.

**Service worker scope unknown.**
`sw.js` registration happens inside `initNotificationRuntime()` (called lazily, not at app boot), meaning the service worker may not be registered on pages that do not call `initNotificationRuntime` first. Background sync and push notification delivery reliability are therefore page-dependent.

---

### Per-Domain Issues

**Calendar (`calendar.js`, 65 KB)**
- 5 cross-module Firestore subscriptions in addition to the calendar's own listener
- `reconcileSourceLinkedEvents` fires on every snapshot; each call can issue multiple Firestore writes
- Workout `setCompleted` in `SOURCE_MODULE_META` only mutates in-memory state — the Firestore write is missing, making bidirectional workout sync silently broken
- `materializeSourceEvent` calls `addNotification` on every re-sync, including for already-existing events after a page reload — notification storm on cold load

**Workout (`workout.js`, 95.3 KB)**
- Largest feature module; loaded in full on every workout page visit
- `sessionClockInterval` and `sessionTimers` leaked on navigation away
- Workout plan (schedule + exercise definitions) lives in the legacy localStorage blob — different devices show different plans; no Firestore source of truth for plan data
- `applyWorkoutTemplate` calls `window.confirm()` (blocking main-thread dialog) and dual-writes to both localStorage and Firestore
- `MUSCLE_RECOVERY_HOURS = 48` hardcoded constant; recovery overlay can mislead and fires on every render

**Dashboard (17 widgets via `dashboard-widget-defs.js`)**
- 11 snapshot widgets read from `window.currentData` at render time; if `RepoAggregatorSync` has not yet received a snapshot, accessing `.filter` on an undefined collection throws (confirmed: Statistics widget `d.tasks` undefined path)
- Prayer widget shape mismatch: reads `today.completed` as an object; `prayer.js` stores an array — prayer widget always shows 0/5
- Workout widget reads `w.name || w.title` from log entries that have neither field — always renders "undefined"
- Water widget reads `w.amount || w.cups`; actual shape uses `glasses` — always sums to 0
- Live widgets (Todo, Notifications) open their own Firestore subscriptions independent of the page's existing ones — up to 13 total listeners on cold dashboard load

**Weather (`weather-dashboard.js`, `WeatherService.js`)**
- 30-minute setInterval on `window.__dashboardWeatherRefresh` never cleared — leaks across navigations
- `WeatherRecommendationService.apply(weather)` silently mutates `window.currentData.settings.waterGoal` as a side effect on every weather fetch with no UI indication
- `location.href` used as bare implicit global instead of `window.location`

**Study (`study.js`, 77.9 KB)**
- 8 Firestore realtime subscriptions; Pomodoro setInterval potentially leaked on dispose
- `safeRenderStudyRoot` catch-all swallows all rendering errors — bugs are invisible without the console open
- `computeAchievements` recalculates all 9 achievement badges on every render; results are ephemeral (not persisted, not synced across devices)
- `focusScore` and `productivityScore` are heuristic composites with no external model backing

**Prayer (`prayer.js`, 65.9 KB)**
- `PRAYER_TIMES` is hardcoded (`Fajr: '05:10'`, etc.) — correct for no location, no season; every user sees wrong prayer times
- `api-1.json` is the AlAdhan OpenAPI spec, not actual prayer time data — no real prayer time calculation exists
- `initPrayerPage` dereferences `window.currentData.quranProgress.readingSettings.fontSize` before Firestore data has arrived — throws if `quranProgress` or its sub-objects are undefined

---

## React Project Performance Baseline

**Bundle composition (from `vite.config.ts`).**
- Manual chunk: firebase (`firebase/app`, `firebase/auth`, `firebase/firestore`) split into its own chunk — correct
- No other manual chunks defined; all app code lands in a single chunk
- TypeScript strict mode enabled — dead code paths will be caught at build time
- Source maps enabled in production (`sourcemap: true`) — adds ~2x bundle size on the CDN unless source maps are served separately

**Lazy loading status.**
- `/dashboard` route uses React `lazy()` — one lazy boundary in the router
- `/login` is eagerly loaded (not lazy) — acceptable since it is the entry point
- No other lazy boundaries; as features are added to `src/features/` they will default to eager unless explicitly lazy-wrapped

**Firebase initialization.**
- `services/firebase/firestore.ts` calls `enableIndexedDbPersistence(db)` — this API is deprecated in Firebase JS SDK v9+ (modular). The correct replacement is `initializeFirestore(app, { localCache: persistentLocalCache() })`. The current call will throw `failed-precondition` when two tabs are open and silently disable persistence
- `storageBucket` is absent from the Firebase config object — Firebase Storage will not initialize without a code change
- No `.env` file is committed; the build will silently use `undefined` values for all `VITE_FIREBASE_*` variables on a fresh clone

**Existing bugs that affect runtime performance.**
- `Header.tsx`: `import React from 'react'` is at line 70; `React.useState` is called at line 18 — works in Vite's ESM hoisting but is fragile and will fail in other tooling contexts
- `AppShell.tsx`: JSX uses `app-shell-main` and `app-shell-content` class names; `globals.css` defines `.main` and `.page-content` — layout styles never apply; content column has no dimensions
- `AppLoading.tsx`: uses `.app-loading-container` which has no CSS rule — spinner renders without layout
- `Sidebar.tsx`: plain `<a href="#...">` tags instead of React Router `<Link>` — every nav click forces a full page reload, defeating SPA routing
- `Login.tsx`: `cursor-glow` spotlight requires JS to set `--mx`/`--my` CSS custom properties; no `mousemove` listener exists — spotlight animation is permanently broken

**Theme system gap.**
`tokens.css` defines 8 themes (deep-space default, light, system, earth, mars, saturn, neptune, nebula, galaxy). `Header.tsx` only exposes 3 options (light/dark/system) in the theme selector — 5 themes are defined but inaccessible.

---

## Migration Performance Goals

**Target metrics (post-migration React build).**

| Metric | Current legacy estimate | Target (React + Vite) |
|--------|------------------------|-----------------------|
| JS parsed per page | 300–450 KB (uncompressed, serial) | < 150 KB initial chunk (compressed) |
| Firestore listeners on dashboard | Up to 13 simultaneous | 4–6 (widget-scoped, shared subscriptions) |
| Time to interactive (dashboard) | Unmetered; blocked by serial script load | < 3 s on 4G throttle |
| Full page re-renders per interaction | 1 (entire innerHTML) | 0 (React reconciliation, component-scoped updates) |
| localStorage writes per interaction | 1 full blob via LegacyDataSync | 0 (Firestore only, targeted field updates) |

**Key optimizations required during migration.**

1. Replace `enableIndexedDbPersistence` with `initializeFirestore` + `persistentLocalCache` in `firestore.ts` before any feature work begins.

2. Fix the `AppShell` / `globals.css` class name mismatch (`app-shell-main` → `main`, `app-shell-content` → `page-content`) so layout works from the first feature page added.

3. Move `import React from 'react'` to line 1 of `Header.tsx`; remove unused `sidebarOpen` prop.

4. Replace `<a href="#...">` in `Sidebar.tsx` with React Router `<Link to="...">`.

5. Split Firestore subscriptions by domain: each feature page opens and tears down only its own listeners using a consistent `useEffect` cleanup pattern — no cross-module subscriptions at the shared layer.

6. Implement `useCallback`-memoized subscription callbacks and `useMemo` for derived data (counts, totals, statistics) to prevent unnecessary re-renders on unrelated Firestore snapshots.

7. Migrate image storage from localStorage base64 to Firebase Storage (`storageBucket` must be added to the Firebase config) — use signed URLs for avatar/cover display.

8. Route-based code splitting: add `React.lazy()` wrapping for every feature route (`/todo`, `/habits`, `/goals`, `/calendar`, `/workout`, `/prayer`, `/nutrition`, `/study`, `/statistics`, `/account`).

9. Replace `window.currentData` global blob with React context or Zustand store slices per domain — eliminates shared mutable global and enables selective re-renders.

10. Firestore write optimization: use targeted `updateDoc` with specific field paths instead of rewriting the full document; retire `LegacyDataSync` blob writes entirely once all domains are migrated.

**Image optimization.**
All planet/space background images under `assist/images/` should be converted to WebP and served with responsive `srcset`. Current images are unoptimized PNGs/JPGs. The art panel is rendered on every page — image loading cost is paid on every navigation.

**Quran and Azkar data.**
`data/quran/quran.json` (full Quran) should be served via a CDN with far-future cache headers and loaded lazily only when the prayer/Quran reader page is active. It must not be bundled into the main JS chunk or cached in localStorage (quota risk).

---

## Critical Performance Risks

These issues are likely to cause visible freezing, lag, or data loss if not addressed before or during migration.

**1. Blob write on every persist() call (data loss risk + write amplification).**
`LegacyDataSync` writes the full `window.currentData` blob to Firestore at 80 ms debounce. A user rapidly toggling habits or completing tasks generates a burst of large Firestore writes. At scale, this will hit Firestore write quotas and produce unpredictable merge conflicts when two tabs are open. Any migration work that touches `persist()` must replace this with targeted `updateDoc` calls.

**2. Workout timer leak causing stale state.**
`sessionClockInterval` not cleared on `disposeWorkoutPage` means the clock callback fires against a detached DOM. If the callback references `document.getElementById` nodes that no longer exist, it silently errors every second. If it modifies `window.currentData`, it produces phantom data writes after the user has left the page.

**3. Prayer page crash on cold load.**
`initPrayerPage` reads `window.currentData.quranProgress.readingSettings.fontSize` before Firestore data has arrived. On cold load `quranProgress` is `undefined` (or an empty object from `emptyData`). This throws a TypeError and crashes the prayer page before any UI renders. This must be guarded with optional chaining or default values before any user reaches the prayer page in migration.

**4. Dashboard widget shape mismatches producing silent zero/undefined data.**
Prayer (0/5 always), Workout (undefined label always), and Water (0 always) widgets display incorrect data due to field name mismatches between the widget read code and the actual Firestore document shape. Users will see wrong data with no error indicator. These must be reconciled against actual Firestore document shapes from the repository layer before widgets are ported to React.

**5. enableIndexedDbPersistence multi-tab failure.**
The React project's `firestore.ts` uses the deprecated persistence API, which throws `failed-precondition` when more than one tab is open. When it throws, Firestore falls back to memory-only — meaning any write made in one tab while another is open is not cached locally. A user who opens two browser windows loses all offline resilience. This is a silent data-availability regression.

**6. localStorage image quota exhaustion.**
A user who uploads a profile photo and a cover photo can consume 3–4 MB of the 5 MB localStorage quota in a single action. Any subsequent write to localStorage (theme, session, language, weather cache, DataService cache) that would push usage over 5 MB will throw a `QuotaExceededError`. `shared.js` and all services catch this nowhere — it will crash the app silently and leave the user unable to log in (session key write fails). Migration must move image storage to Firebase Storage before enabling photo uploads.

**7. calendar.js notification storm on first load.**
`materializeSourceEvent` calls `addNotification` for every source-linked event on every re-sync. On first load all source data arrives simultaneously, generating one notification per calendar event. This floods the notification center with duplicates and triggers `addNotification`'s Firestore write per item — a potentially large write burst on every fresh page load.
