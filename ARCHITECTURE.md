# MyLife — Architecture Documentation

## Folder structure

```
firebase/          Firebase SDK initialization — the ONLY 3 files that import
                    the Firebase SDK directly (firebase.js, auth.js, firestore.js)
services/           AuthService, UserService — business-level auth/profile flows
repositories/        BaseRepository + one thin subclass per module; UI never
                     talks to Firestore directly, only through these
core/                Cross-cutting: ErrorMapper, LoadingManager, UndoManager,
                     Logger, Monitoring, bootstrap (DI wiring)
utils/                Validators, DI container, LocalStorageService (the ONLY
                      file allowed to touch localStorage), QueryUtils
js/                   Existing page logic (todo.js is migrated onto the
                      repositories above; the rest still use the pre-Firebase
                      `currentData`/localStorage model — see Remaining
                      Technical Debt)
js/pages/             Thin per-page bootstrap scripts (call bootShell() + the
                       page's own init function)
js/services/          Page-specific data-loading helpers that predate the
                       repository pattern (DataService for Quran/Azkar/Hadith,
                       WeatherService, WeatherCacheService, NetworkUtils, etc.)
pages/                 One static HTML file per page/module
css/                   variables.css (design tokens) + shared.css (shared
                       components) + css/pages/*.css (per-page styles)
locales/               en/de/ar/fr translation dictionaries
data/                  Bundled static JSON (Quran/Azkar/Hadith content)
```

## Firebase flow

```
Sign-in / register
  UI -> AuthService.signIn()/register() -> firebase/auth.js -> Firebase Auth
       -> on success, UserService.createProfile() writes users/{uid}

Reading/writing module data (e.g. Todo)
  UI -> new TodoRepository(uid) -> BaseRepository methods
       -> firebase/firestore.js -> Cloud Firestore, under todos/{uid}/items/{id}

Realtime updates
  TodoRepository.subscribe(cb) -> Firestore onSnapshot -> cb(items) on every
       change, from this tab, another tab, or another device — never polled.

Offline
  Firestore's own persistent local cache (configured once, in
  firebase/firebase.js, via initializeFirestore + persistentLocalCache +
  persistentMultipleTabManager) queues writes made while offline and
  replays them automatically on reconnect. This is Firestore's built-in
  behavior, not custom code in this project.
```

## Repository Pattern

Every module's data lives at `{module}/{uid}/items/{itemId}` (see
`firestore.rules`). `BaseRepository` implements the full shared contract
once — `get/getById/getAll/create/update/delete/subscribe/batch/batchUpdate/
transaction/paginate/searchByPrefix/optimisticUpdate` — and each of
`TodoRepository`, `HabitRepository`, `GoalRepository`, `CalendarRepository`,
`WorkoutRepository`, `StudyRepository`, `PrayerRepository`,
`NutritionRepository`, `NotificationRepository` is a few lines extending it.
`StatisticsRepository` and `DashboardRepository` are the one deliberate
exception: they have no collection of their own and instead compose the
other repositories' realtime listeners, so dashboard/statistics numbers can
never drift out of sync with the data they describe.

## Build process

This project has no build step of its own before Phase 1 — plain
`<script>` tags loaded into one shared global scope. Introducing the
Firebase Modular SDK (ES-modules-only) required adding Vite:

```bash
npm install          # installs firebase + vite (see package.json)
npm run dev           # local dev server; serves any page, no config needed
npm run build         # production build -> dist/ (see vite.config.js for
                      # the multi-page entry list, minification, and the
                      # firebase-vendor chunk split)
npm run preview       # serve the production build locally to sanity-check it
```

**Important:** only `pages/todo.html` (and `index.html`, which every page
loads `shared.js` from) currently depends on this build step, since Todo is
the only page migrated to the ES-module-based Firestore layer so far. The
other 11 pages are still plain scripts and technically still work if opened
directly — but running the whole app through `npm run dev`/`build` from now
on is the supported path going forward, since more pages will need it as
they're migrated.

## Environment variables

Copy `.env.example` to `.env.local` (already `.gitignore`d) and fill in your
Firebase project's config values from Firebase Console → Project Settings →
General → Your apps. `firebase/firebase.js` reads these via Vite's
`import.meta.env.VITE_*` and fails loudly (a clear console error) rather
than silently if they're missing.

## Deployment

`firebase.json` is configured for Firebase Hosting, serving the `dist/`
folder Vite produces:

```bash
npm run build
firebase deploy --only hosting,firestore:rules
```

Cache headers are deliberately asymmetric: hashed JS/CSS/image assets get a
1-year immutable cache (safe, since Vite content-hashes their filenames —
a new deploy produces new filenames), while `sw.js` and every `*.html` page
get `no-cache`, so the service-worker update mechanism and page content
always reach users promptly instead of getting stuck behind an aggressive
cache.

## Monitoring (prepared, not enabled)

`core/Monitoring.js` defines `trackEvent()`/`recordError()`/`startTrace()`
as documented no-ops. Wiring in real Firebase Analytics/Crashlytics/
Performance Monitoring is a deliberate later decision (see that file's
header) — this phase intentionally does not enable any paid/data-collecting
service automatically.
