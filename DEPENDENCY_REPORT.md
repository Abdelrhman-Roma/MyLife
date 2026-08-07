# DEPENDENCY_REPORT.md — Phase 3

Precise, file-level list of what still depends on each piece of the legacy system, so "would this break something" is answered by pointing at a line, not a guess.

## Who depends on `js/services/LegacyDataSync.js`

Loaded via `<script type="module">` on: `pages/dashboard.html`, `pages/todo.html`, `pages/habits.html`, `pages/goals.html`, `pages/calendar.html`, `pages/workout.html`, `pages/prayer.html`, `pages/nutrition.html`, `pages/study.html`, `pages/account.html`, `pages/statistics.html`. (Not loaded on `pages/weather.html` or `index.html`.)

It syncs the single `users/{uid}.appData` document field in realtime. Removing it would stop realtime sync for every domain listed in ARCHITECTURE_AFTER_PHASE3.md's "still depends on the legacy blob" section, on every one of those 11 pages.

## Who depends on `currentData`/`window.currentData` for real (non-comment) reasons

| File | What it reads/writes on `currentData` |
|---|---|
| `js/shared.js` | Owns the variable; `getCounts()`, `renderDashboard()`, `renderStatistics()`, `normalizeData()`, `applyRemoteData()`, generic page CRUD (`addEntry`/`toggleComplete`/`deleteEntry`) all read/write it |
| `js/habits.js`, `js/goals.js`, `js/calendar.js`, `js/workout.js`, `js/prayer.js`, `js/nutrition.js`, `js/study.js` | Populate their own slice (`.habits`, `.goals`, `.events`, `.workouts`, `.prayers`, `.meals`, `.study`) from their own repository's `onSnapshot`; read the same slice for rendering |
| `js/todo.js` | Deliberately does **not** use `currentData` (keeps its own private `localTasks` array) — the one feature that doesn't need this bridge at all |
| `js/dashboard-widget-defs.js` | 11 of 17 widgets read `window.currentData.*` directly (the "local-snapshot" widgets) |
| `core/GamificationEngine.js` | One defensive read (`typeof window.currentData !== 'undefined' && window.currentData`) used as a fallback data source in one XP-calculation path |
| `services/RepoAggregatorSync.js` | Writes `window.currentData.{tasks,habits,goals,events,workouts,prayers,meals,study}` for Dashboard/Statistics's own subscriptions |
| `js/pages/account.js` | Reads/writes Profile, Settings, Security, Achievements-display, XP-display fields — all still legacy-blob-sourced |
| `js/pages/weather.js`, `js/weather-dashboard.js`, `js/services/WeatherRecommendationService.js` | Read/write `currentData.settings` (water goal), call `persist()` |
| `js/notification-center.js`, `core/WidgetRegistry.js`, `js/todo.js` | Comment-only mentions, no real dependency |

## Who depends on `mylife.session` / `mylife.users` / `bridgeIntoLegacySession()` / `getSessionUser()`

Every one of the 13 pages' `js/pages/*.js` bootstrap calls `bootShell(pageKey)` (or the generic `initPage(pageKey)`, which calls `bootShell` internally) as its very first action. `bootShell()` calls `getSessionUser()`, which reads `mylife.session`/`mylife.users`. `bridgeIntoLegacySession()` (in `js/pages/auth-firebase.js` and `js/pages/auth-oauth.js`) is what populates those keys after a real Firebase login. There is no page in the application that doesn't go through this gate.

## Who depends on `DATA_PREFIX` (the constant kept during this phase's `getData()` simplification)

Only `js/pages/account.js`, for its account-deletion cleanup (`localStorage.removeItem(DATA_PREFIX + currentUser.email)`). `getData()` itself no longer reads it.

## Who depends on `saveData()` / the old `getData()` behavior (removed/simplified this phase)

Nothing, after this phase's changes — confirmed by the same full-project scan used to find them in the first place. Rebuilt successfully with both changes in place.

## No circular dependencies found

Re-checked as part of this phase's scan (same method as Phase 2's DEPENDENCY_GRAPH.md) — every arrow above still points one direction only.
