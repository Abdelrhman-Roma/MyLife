# MyLife → Firebase Migration — Phase 1 (Foundation)

## 1. Every file added or changed this phase

Nothing in the existing app (`index.html`, `js/`, `css/`, `pages/`, `locales/`, `data/`, `sw.js`) was
modified. Phase 1 added a parallel architecture layer only, exactly as scoped
("focus only on architecture, authentication foundation, database layer and
project structure" / "do not add new features" / "existing pages should
continue working after migration"):

```
package.json                 — declares the `firebase` dependency + a minimal Vite dev/build script
firestore.rules              — Security Rules matching the new UID-rooted data layout

firebase/
  firebase.js                 — single Firebase app/Firestore/Auth initialization point
  auth.js                     — thin wrapper over the Firebase Auth SDK
  firestore.js                — thin wrapper over the Firestore SDK

core/
  ErrorMapper.js               — centralized error → { category, message, retryable } mapping
  LoadingManager.js            — page / background / named-skeleton loading state
  bootstrap.js                 — one-time DI wiring + auth session-restore helper

utils/
  validators.js                — assertUid / assertOwnership / assertId / assertPlainObject
  di.js                        — minimal provide()/resolve() dependency-injection container
  LocalStorageService.js       — the ONLY file now allowed to touch localStorage directly
                                  (theme, language, last page, small temp cache)

services/
  AuthService.js                — sign in / register / sign out / password reset / email
                                   verification / session restore / auth-state observer
  UserService.js                 — users/{uid} profile document (settings, display name, etc.)

repositories/
  BaseRepository.js              — get / getAll / create / update / delete / subscribe /
                                    batch / transaction / optimisticUpdate, implemented once
  TodoRepository.js, HabitRepository.js, GoalRepository.js, CalendarRepository.js,
  WorkoutRepository.js, StudyRepository.js, PrayerRepository.js, NutritionRepository.js
                                  — one thin subclass per module (module-specific query
                                    helpers only — e.g. TodoRepository.getIncomplete(),
                                    CalendarRepository.getInRange())
```

19 new files, 0 files modified, 0 files deleted.

## 2. The new architecture, explained

**Layering, top to bottom:**

```
UI pages (js/*.js — UNCHANGED this phase)
        │  (Phase 2 will rewire these to call the layer below instead of
        │   currentData/localStorage)
        ▼
services/  (AuthService, UserService)        — business-level auth & profile flows
        ▼
repositories/  (BaseRepository + 8 subclasses) — the ONLY code allowed to read/write
        │                                          module data (todos, habits, goals, ...)
        ▼
firebase/  (firebase.js, auth.js, firestore.js) — the ONLY code allowed to import
        │                                           the Firebase SDK directly
        ▼
Firebase Auth + Cloud Firestore
```

Cross-cutting (used by every layer above, not layered themselves):
`core/ErrorMapper.js`, `core/LoadingManager.js`, `utils/validators.js`, `utils/di.js`.

**Why this shape:**
- **Firebase logic never touches a UI page.** Every Firebase SDK import in the
  whole project lives in exactly 3 files (`firebase/firebase.js`, `auth.js`,
  `firestore.js`). If the SDK's API changes, or a second backend is ever added,
  those are the only files that need to change.
- **Repository Pattern.** UI code (once rewired in Phase 2) will only ever
  call methods like `todoRepo.getAll()` / `todoRepo.subscribe(cb)` — never
  Firestore functions directly. `BaseRepository` implements the CRUD/realtime/
  batch/transaction/optimistic-update contract exactly once; the 8 per-module
  repositories are a few lines each.
- **UID-rooted data.** Every module's data lives at
  `{module}/{uid}/items/{itemId}` (see `firestore.rules`). This makes "never
  mix data between users" a single Security Rule per module, not a
  per-document `ownerId` check the client has to get right every time
  (though repositories still stamp `ownerId` as defense-in-depth).
- **Centralized error handling & loading state** so every repository/service
  returns the same `{ ok, data | error }` shape and every page can drive the
  same loading UI, instead of each of the ~19 old pages inventing its own
  try/catch and spinner logic.

**A disclosed architectural trade-off:** the existing app has no build step —
every page loads plain `<script>` tags into one shared global scope. The
Firebase Modular SDK is ES-modules-only. Every file above is a real ES module
(`import`/`export`), which is why `package.json` now declares Vite as a dev
dependency. This is a genuine, non-optional shift: either add the lightweight
Vite build step (recommended — see `package.json`), or swap the `firebase/*`
bare-specifier imports for the CDN ESM build and load these new files via
`<script type="module">` as a stop-gap. Nothing in Phase 1 forces this choice
yet, since the new layer isn't wired into any page — but Phase 2 can't avoid
making it.

## 3. Repository responsibilities

| Repository | Firestore path | Responsibility |
|---|---|---|
| `BaseRepository` | n/a (base class) | `get/getAll/create/update/delete/subscribe/batch/transaction/optimisticUpdate` — implemented once, inherited by all 8 below |
| `TodoRepository` | `todos/{uid}/items` | Tasks; adds `getIncomplete()` / `subscribeIncomplete()` |
| `HabitRepository` | `habits/{uid}/items` | Habits |
| `GoalRepository` | `goals/{uid}/items` | Goals |
| `CalendarRepository` | `calendar/{uid}/items` | Events; adds `getInRange(startIso, endIso)` for Day/Week/Month views |
| `WorkoutRepository` | `workout/{uid}/items` | Workouts/exercises |
| `StudyRepository` | `study/{uid}/items` | Study sessions/subjects |
| `PrayerRepository` | `prayer/{uid}/items` | Prayer tracker entries |
| `NutritionRepository` | `nutrition/{uid}/items` | Meals/water/sleep entries |
| `UserService` (not a Repository subclass — see its file header for why) | `users/{uid}` | Single profile/settings document |

## 4. LocalStorage dependencies — status

**Important, honest scope note:** Phase 1 was scoped as *foundation only*
("do not add new features," "existing pages should continue working after
migration"). No existing page was rewired this phase, so **zero LocalStorage
calls were removed from the running app** — removing them without also
rewiring each page to the new repositories would break the app, which the
brief explicitly forbids. What Phase 1 *does* establish is the destination:
`utils/LocalStorageService.js` is now the only file permitted to call
`localStorage` directly going forward, restricted to theme/language/last-page/
small temp cache, per the brief.

The following existing files currently call `localStorage` directly for
**business data** and are the concrete Phase 2 rewiring targets:

- `js/shared.js` — the biggest one: `currentData` (tasks, habits, goals,
  events, workouts, prayers, meals, settings, notifications, etc.), the
  `users` account list, and session state
- `js/i18n.js` — language preference (this one is in-scope to *keep* in
  LocalStorage per the brief, just needs to move into
  `LocalStorageService.setLanguage()`)
- `js/pages/account.js` — profile-page reads/writes into the same
  `currentData` blob
- `js/services/DataService.js` — Quran/Azkar/Hadith cache (bundled static
  content — reasonable to leave as a LocalStorage cache even post-migration,
  since it isn't per-user business data)
- `js/services/WeatherCacheService.js`, `WeatherLocationService.js` —
  weather cache/last-known-location (candidate for `LocalStorageService`'s
  temporary-cache bucket, or Firestore if cross-device weather-location sync
  is ever wanted)

## 5. Remaining technical debt / open items for Phase 2+

1. **No page has been rewired yet.** `js/shared.js`, `js/todo.js`, `js/habits.js`,
   etc. still read/write `currentData` + `localStorage` exactly as before.
   This is the largest remaining item by far.
2. **No build step exists yet in the actual project** — `package.json`/Vite
   config are added, but `npm install` has not been run in this environment
   (no network access to npm from here), and no page currently loads any of
   the new files.
3. **`firebaseConfig` is a placeholder.** Real project credentials need to be
   filled in (`firebase/firebase.js`) from your own Firebase Console project,
   ideally via environment variables rather than hardcoded.
4. **No "statistics" repository.** The brief's example DB structure lists a
   top-level `statistics/{uid}` collection, but the existing app derives all
   statistics from the other modules' data rather than storing them
   independently — adding a dedicated repository before it's clear whether
   Statistics needs its own writable documents (vs. being a computed view
   over Todo/Habit/Goal/etc.) risked inventing an unused collection. Flagging
   this as a decision for Phase 2 rather than guessing.
5. **Firebase Storage** is intentionally not implemented, per the brief —　
   there is no abstraction file for it yet either; add a `firebase/storage.js`
   + a `StorageService` behind the same DI pattern when that phase arrives.
6. **`firestore.rules` has not been deployed** to any actual Firebase project
   (there is no Firebase project connected to this environment) — it needs a
   `firebase deploy --only firestore:rules` from a machine with the Firebase
   CLI and real project credentials.
7. **Data migration script** (copying each existing user's LocalStorage
   `currentData` into the new Firestore structure) does not exist yet — this
   is a Phase 2/3 concern once pages are actually rewired, so real user data
   isn't lost during the switch-over.
8. **No automated tests** were added for the new layer. `utils/di.js` was
   built specifically to make this straightforward later (repositories can be
   constructed against a fake Firestore double), but no test suite exists in
   this project today regardless.

## 6. Is MyLife ready for Phase 2?

**Yes, with the above debt log carried forward explicitly.** The foundation
requested in Phase 1 — Firebase initialization, the auth layer, the
Repository Pattern with the full get/getAll/create/update/delete/subscribe/
batch/transaction/optimistic-update contract, UID-rooted Firestore structure
and matching Security Rules, centralized error handling, a reusable loading
manager, and a DI container — is in place, is syntactically valid (every new
file passed `node --check`), and does not touch or risk breaking any existing
page. Phase 2 can begin rewiring `js/shared.js` and the per-module pages onto
`services/` and `repositories/` without re-deciding any of the structural
questions above.
