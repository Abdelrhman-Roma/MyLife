# LEGACY_REMOVAL_REPORT.md — Phase 3

## Read this first

Your brief authorizes a complete, permanent removal of the legacy system, and states there's no production data to preserve. I want to be precise about what that authorization does and doesn't change: it removes my concern about **data loss**. It does not remove — and cannot remove — the fact that roughly a third of this application's features have **no replacement built yet**. Deleting the only code that reads/writes that data wouldn't just lose old data with nothing to preserve; it would take working pages down to broken or blank *today*, for reasons that have nothing to do with data preservation.

Your brief also includes an explicit safety rule at the bottom: *"If any deletion would break a page, STOP and explain why instead of deleting it. Never delete code based only on assumptions. Only delete code that has been proven to be obsolete."* I've applied that literally. Below is the full scan, then exactly what was proven safe (and removed), and exactly what was proven still load-bearing (and why, page by page, not deleted).

## Full-project scan results

| Term | Files found in | Real dependency, or false positive? |
|---|---|---|
| `currentData` | 19 | Mixed — see breakdown below |
| `LegacyDataSync` | 11 (all `<script>` tags in HTML — my first pass missed these since it only searched `.js` files) | Real — actively loaded on 11 of 12 app pages |
| `getData(` | 2 | 1 real (`shared.js`), 1 false positive (`calendar.js`'s hit is the browser's native `DataTransfer.getData()`, unrelated) |
| `saveData(` | 2 (before removal) | Real, but **proven to be a no-op** — see below |
| `mylife.session` | 1 (`shared.js`) | Real — the auth gate every page depends on |
| `mylife.users` | 1 (`shared.js`) | Real — same |
| `bridgeIntoLegacySession` | 2 (`auth-firebase.js`, `auth-oauth.js`) | Real — same |
| `appData` | 9 | 7 are comments I wrote in earlier sessions documenting what's *not* dependent on it anymore (`calendar.js`, `workout.js`, `nutrition.js`, `habits.js`, `study.js`, `goals.js`, `prayer.js`); 2 are real (`shared.js`, `LegacyDataSync.js`) |
| `persist(` | 10 | Real in `shared.js`, `weather-dashboard.js`, `js/pages/weather.js`, `js/pages/account.js`; a comment-only false positive in `todo.js`; real (necessary, non-legacy-blob-related, per-module) in `habits.js`/`workout.js`/`nutrition.js`/`prayer.js`/`study.js` — those 5 still call `persist()` for the parts of their own pages that are genuinely still legacy (e.g. Workout's plan/schedule, Study's Pomodoro/subjects, Prayer's Tasbeeh/Quran) even though their core migrated data (habits, workout log, meals, prayers, study sessions) does not |
| `localStorage.setItem/getItem`, `sessionStorage` | 9 / 7 / 4 | Mixed — see "localStorage audit" below |

## What was proven safe and removed completely

### `saveData()` — deleted entirely

`js/shared.js`'s own comment above it said it plainly: *"Compatibility shim: old auth code can call this, but business data is never written to localStorage after the Firestore migration."* Reading the function body confirmed it: `function saveData(_email, _data) { }` — a genuine, literal no-op, both parameters unused. A function that does nothing has no behavior to preserve, in any caller, under any condition. This is the one case in this phase where "prove it's obsolete" was possible with total certainty, not judgment.

**Removed:** the function definition, and both call sites (`js/shared.js`'s non-Firebase fallback `register()`, and `js/pages/auth-oauth.js`'s OAuth bridge).

### `getData()` — simplified, not deleted (its cleanup-companion is still needed)

`getData()` read `localStorage.getItem('mylife.data.' + email)` — a per-device cache of the entire legacy data blob. Since `saveData()` (confirmed above) never writes that key anymore, this read can only ever return a non-empty value from a session that predates this compatibility shim's introduction — a vanishingly unlikely, and in any case stale and about-to-be-overwritten-by-real-data, scenario. I simplified `getData()` to always return `emptyData(name)` directly, removing the pointless localStorage read.

**Not removed:** the `DATA_PREFIX` constant. `js/pages/account.js` (loaded as a classic script, confirmed to share `shared.js`'s scope) still calls `localStorage.removeItem(DATA_PREFIX + currentUser.email)` as part of its account-deletion cleanup flow — deleting `DATA_PREFIX` would break that cleanup with a `ReferenceError`. Keeping a constant that's only used to *clean up* old data is not the same violation as reading business data from `localStorage` — I'm calling this out explicitly rather than removing it and hoping it wasn't load-bearing.

## What was proven NOT safe to delete — and precisely why

### `LegacyDataSync.js` / the `appData` blob / `persist()` in `shared.js`

**Still the only data path for:** Profile, Settings, Security, Achievements (display), XP (display), Quran progress/bookmarks/favorites/reading log, Tasbeeh, Hadith collection, Water, Sleep, Body measurements, Progress photos, Shopping list, Workout's plan/schedule (as opposed to the log, which is migrated), Study's Subjects/Assignments/Exams/Projects/Notes/Resources/Pomodoro, and Weather's saved-location-driven recommendation engine (`WeatherRecommendationService.js` reads/writes `currentData.settings.waterGoal` directly).

**Concretely, deleting this today would break:** the entire Account/Settings page, most of the Study page, most of the Workout page, most of the Prayer page (Quran/Tasbeeh/Hadith sections), the Nutrition page's water/sleep tracking, and Weather's recommendation feature. That's not a guess — every one of those reads is a real, traced, currently-executing code path, listed file-by-file in DEPENDENCY_REPORT.md.

**What it would take to actually remove this safely:** a dedicated Firestore repository for each of the ~9 remaining domains above (Profile, Settings, Quran, Water/Sleep, Body measurements/photos, Shopping list, Workout plan, Study's non-session entities, Weather preferences) — the same repository pattern already proven across the 8 migrated features — followed by rewiring each page's read/write calls to that repository instead of `currentData`/`persist()`. That's real, substantial, multi-page work, not a deletion. I did not attempt to build 8–9 new repositories in this single phase; doing that hastily, without being able to verify each one against a live Firestore project, is exactly the kind of unverified change your safety rule is asking me not to make.

### `window.currentData` / `currentData` (the render-cache concept)

Even for the 8 **already-migrated** features, the render functions (`renderHabitsRoot`, `renderCalendarRoot`, the 17 widgets in `dashboard-widget-defs.js`, `renderDashboard`, `renderStatistics`, and `RepoAggregatorSync`) all read their data from `window.currentData.*` — which the migrated pages' own repository subscriptions populate directly (not from the legacy blob). This is genuinely the "new architecture" for those 8 features, not legacy debt — but it's still built around a shared cache object, not a full rewrite of every render function to accept repository data as a direct parameter. Removing `currentData` as a concept entirely would require rewriting all of those render functions — a rendering-layer rewrite across 10+ files that were deliberately built this way in earlier sessions specifically to avoid "rewrite working code" risk. I did not do this rewrite blind, in one phase, with no way to visually verify the result.

### `mylife.session` / `mylife.users` / `bridgeIntoLegacySession()` / `getSessionUser()`

Every one of the 13 pages' `bootShell()` — called synchronously, at the very top of every page's bootstrap, gating whether the page renders at all — depends on this. Converting it to gate on Firebase Auth directly means making `bootShell()` asynchronous and handling the "auth state not yet known" loading window on every single page. This was flagged as real, known technical debt in an earlier session (along with one genuine bug inside it that *was* fixed — a remember-me/session-persistence mismatch). The debt assessment hasn't changed: this is untestable without a live browser and touches all 13 pages' bootstrap sequencing, not a self-contained deletion.

## localStorage audit (per your explicit "theme/language/sidebar/UI-prefs only" rule)

| File | What it stores | Assessment |
|---|---|---|
| `js/i18n.js` | Language preference | Allowed |
| `js/shared.js` | Theme, `mylife.session`/`mylife.users` (auth gate — see above) | Theme allowed; the auth-gate portion is the known debt above, not a new finding |
| `repositories/BaseRepository.js` | `mylife.debugSync` — a dev-only diagnostic flag added during an earlier sync-debugging session | Allowed — a UI/dev toggle, not business data |
| `utils/LocalStorageService.js` | Theme/language/UI-prefs (by design, per its own header comment) | Allowed, though the file itself is unused (flagged in Phase 2) |
| `js/services/WeatherCacheService.js` | Last-fetched weather API response (a TTL'd technical cache) | Judgment call: not "business data" in the tasks/habits sense, more like a re-fetchable HTTP cache. Flagging rather than asserting either way. |
| `js/services/WeatherLocationService.js` | Last searched/granted location + geolocation permission state | Same judgment call — arguably a "remember my location" preference, not explicitly one of your allowed categories either |
| `js/services/DataService.js` | Cached Quran/Azkar/Hadith JSON (public reference content, not user-specific) | Same reasoning as the weather cache |
| `js/pages/auth-firebase.js`, `js/pages/auth-oauth.js` | The legacy session bridge (`mylife.session`) | Known debt, not new |
| `js/pages/account.js` | Writes: none found beyond the session key. Reads: `DATA_PREFIX` cleanup on account deletion (see above) | Not a violation — it's a *removal* of old data, not storage of new business data |

**No new, previously-undocumented localStorage business-data violation was found.** Everything storing real user content (tasks, habits, goals, etc.) already goes through Firestore, as established across the 8 migrated features in earlier sessions.

## Numbers

- **Files fully deleted this phase:** 0 (nothing met the "100% proven safe, whole-file" bar this round — Phase 1 and 2 already removed everything that did)
- **Functions deleted:** 1 (`saveData()`)
- **Functions simplified (behavior-preserving, localStorage dependency removed):** 1 (`getData()`)
- **Call sites removed:** 2
- **Legacy systems fully removed:** 0 — see above for exactly why, per feature
- **Legacy systems partially reduced:** 1 (the localStorage read-path for business data is now fully gone; the Firestore blob write-path remains, because ~9 feature domains still depend on it)

## Production readiness after Phase 3

Not improved by a large margin this phase, and I don't want to claim otherwise — this phase's real contribution was proving, precisely and file-by-file, exactly what *can't* safely move yet and why, which is what makes Phase 3's stated final goal ("Firestore is the ONLY source of truth") an actual, scoped, buildable roadmap now instead of an aspiration. See ARCHITECTURE_AFTER_PHASE3.md for the concrete list of what Phase 4+ would need to build to finish this.
