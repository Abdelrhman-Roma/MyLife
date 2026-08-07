# SYNC_DEBUG_REPORT.md

**Read this first, honestly:** I do not have a browser, a live Firebase project, or a second device in this environment. Everything in this report is a code-level trace, not a runtime observation. Where I found and fixed a concrete, provable bug, I say so plainly. Where I could not find a NEW code bug despite looking hard, I say that too, rather than inventing one — and Part 5 lays out exactly what I need from you to close the loop.

---

## PART 1 — Root Cause Trace, Per Page

For each page: where written, where read, Firestore?, localStorage?, currentData?, onSnapshot?, read path == write path?, correct UID?

| Page | Written at | Read at | Firestore? | localStorage? | `currentData`? | `onSnapshot`? | Read path == write path? | Correct `auth.currentUser.uid`? |
|---|---|---|---|---|---|---|---|---|
| **Todo** | `TodoRepository.create/update/delete` → `todos/{uid}/items/{id}` | Same repo's `subscribe()` → `localTasks` (own module variable, not `currentData`) | Yes | No | No (deliberately its own local array, not `currentData`) | Yes | Yes, identical | Yes — `AuthService.waitUntilReady().uid` |
| **Habits** | `HabitRepository.create/update/delete` → `habits/{uid}/items/{id}` | Same repo's `subscribe()` → `window.currentData.habits` | Yes | No | Yes (render-cache only) | Yes | Yes, identical | Yes |
| **Goals** | `GoalRepository` via `window.__goalsRepo`, called from `shared.js`'s generic `addEntry`/`toggleComplete`/`deleteEntry` | Same repo's `subscribe()` → `window.currentData.goals` | Yes | No | Yes (render-cache only) | Yes | Yes, identical | Yes |
| **Calendar** | `CalendarRepository.create/update/delete` → `calendar/{uid}/items/{id}`, plus 5 cross-writes into Todo/Habit/Goal/Prayer/Study repos when a linked event's completion is toggled | Same repo's `subscribe()` → `window.currentData.events` | Yes | No | Yes (render-cache only) | Yes | Yes, identical | Yes |
| **Workout** | `WorkoutRepository.create` → `workout/{uid}/items/{id}` (finished-session log entries only — the plan/schedule is still legacy) | Same repo's `subscribe()` → `window.currentData.workouts` | Yes (log) / No (plan) | No | Yes (render-cache only) | Yes | Yes, identical (for the log) | Yes |
| **Prayer** | `PrayerRepository.create/update` → `prayer/{uid}/items/{id}` (deterministic `${date}_${prayer}` ids) | Same repo's `subscribe()` → `window.currentData.prayers` | Yes | No | Yes (render-cache only) | Yes | Yes, identical | Yes |
| **Nutrition** | `NutritionRepository.create/update/delete` → `nutrition/{uid}/items/{id}` (meals only) | Same repo's `subscribe()` → `window.currentData.meals` | Yes | No | Yes (render-cache only) | Yes | Yes, identical | Yes |
| **Study** | `StudyRepository.create/update/delete` → `study/{uid}/items/{id}` (session entity only) | Same repo's `subscribe()` → `window.currentData.study` | Yes | No | Yes (render-cache only) | Yes | Yes, identical | Yes |

**All 8 pass on every question.** Every write path and read path for these 8 features goes through the exact same repository instance, the exact same collection, `onSnapshot`, and the exact same `AuthService.waitUntilReady().uid`. I re-verified this by grep, not by memory of earlier sessions — see the raw grep output below, which is what I actually checked against:

```
js/calendar.js:412:  const user = await AuthService.waitUntilReady();
js/calendar.js:414:  calendarRepo = new CalendarRepository(user.uid);
js/goals.js:16:  const user = await AuthService.waitUntilReady();
js/goals.js:18:  const repo = new GoalRepository(user.uid);
js/habits.js:97:  const user = await AuthService.waitUntilReady();
js/habits.js:99:  habitRepo = new HabitRepository(user.uid);
js/nutrition.js:30:  const user = await AuthService.waitUntilReady();
js/nutrition.js:32:  nutritionRepo = new NutritionRepository(user.uid);
js/prayer.js:148:  const user = await AuthService.waitUntilReady();
js/prayer.js:150:  prayerRepo = new PrayerRepository(user.uid);
js/study.js:182:  const user = await AuthService.waitUntilReady();
js/study.js:184:  studyRepo = new StudyRepository(user.uid);
js/workout.js:162:  const user = await AuthService.waitUntilReady();
js/workout.js:164:  workoutRepo = new WorkoutRepository(user.uid);
```

I could not find a code-level bug in these 8 pages' data flow that would explain "created on laptop, never appears on phone" for these specific features. I looked in five separate places for one, specifically because I didn't want to just repeat the previous audit's conclusion without re-checking it:

1. **`firestore.rules`** — re-read line by line. All 8 collections plus `users/{uid}` correctly scope to `request.auth.uid == uid`. No bug found.
2. **`AuthService.waitUntilReady()`** — checked for the classic "missed the auth event because the listener attached too late" race condition. It doesn't have one: `this.ready` is a promise created once in the constructor, resolved exactly once by the first `onAuthStateChanged` callback, and — critically — Promises are permanently settled once resolved, so any code calling `.waitUntilReady()` after that point still gets the correct, cached value immediately. No bug found.
3. **Firestore persistence config** (`firebase/firebase.js`) — uses `persistentLocalCache` with `persistentMultipleTabManager`, the correct modern API for multi-tab-safe persistence. This does NOT cause a cross-**device** problem (each device has its own separate IndexedDB store; the multi-tab manager only matters for multiple tabs on the *same* device). No bug found for the cross-device case specifically — **but see Part 3: this exact configuration is what causes the flicker bug**, which is a related but different symptom.
4. **The build pipeline** (`vite.config.js`) — checked whether the custom `copyRuntimeReferencedAssets()` plugin (which verbatim-copies `js/`, `css/`, etc. into `dist/` for the classic scripts) could cause a stale-code problem, e.g. an old raw copy of `js/habits.js` being served instead of the properly bundled one. Built the project and inspected the actual output: `dist/pages/habits.html` references only the correctly-bundled, hashed `/assets/habits-[hash].js` — the verbatim-copied `dist/js/habits.js` sits alongside it, completely unreferenced by anything. Confirmed harmless dead weight, not a bug.
5. **The service worker** (`sw.js`) — re-read the caching strategy. Navigations (HTML pages) are network-first; Firebase/Firestore requests are never intercepted (explicitly, deliberately, by design); only same-origin static assets get cached, and the fingerprinted (`/assets/*-hash.*`) ones are safe from staleness because a content change means a different hash means a different URL means a guaranteed cache miss on the next deploy. No bug found.

### What this means, and what I need from you

Given all of the above, my honest assessment is: **I cannot find a remaining code bug in the 8 migrated features' data flow.** The most likely explanations left, in order of probability, are things I cannot check from here:

1. **The phone (or laptop) is running an older cached build** that predates one of the earlier fixes in this project's history (before the repositories existed, or before `window.currentData` mirroring was added, etc.). A hard refresh (clear site data, or an actual reinstall of the PWA if installed) on both devices would rule this out.
2. **The bug is on a feature NOT in this list of 8** — e.g. Settings/Notifications/Achievements/Profile, which I've already separately confirmed in earlier audits are still on the legacy `appData` blob or, worse, have confirmed split-brain bugs (Settings' notification toggles and the Profile page's XP/Achievements display both write/read fields nothing else uses — documented in the prior `FINAL_RELEASE_REPORT.md`). If the "doesn't sync" report is actually about one of THESE, the root cause is already known and documented, just not yet fixed.
3. **A deployment/config issue** — e.g. the live Firebase Hosting deployment wasn't rebuilt with the latest code, or the live project's environment variables differ from this repo's `.env.local`. I can't verify either from here.

**To find out which of these it is, turn on the diagnostics I just added (Part 4) on both devices and compare the console output.** That will show definitively whether both devices are even reaching the same UID/collection, whether writes succeed, and whether snapshots arrive — which narrows this to one of the three above within minutes, without more guessing from me.

---

## PART 2 — Cross-Device Verification

**Not run — no second device or live Firebase project available.** I traced create → update → delete for all 8 features at the code level (Part 1's table); every write and every read goes through the same repository/collection/UID. I am not going to claim I "verified" the sequence works by watching it happen, because I didn't. What I can say: nothing in the code stops it from working, based on everything traced in Part 1.

---

## PART 3 — Workout Flickering

**Root cause found and fixed. Two separate, real, and quite different causes, both confirmed by reading the code, not guessed:**

### Cause 1: `onSnapshot` firing twice (or more) with identical data on load

`repositories/BaseRepository.js`, `subscribe()`. Firestore's persistent local cache (configured in `firebase/firebase.js`) means `onSnapshot` commonly delivers **two** snapshots on initial subscribe: one instantly from the local IndexedDB cache (if this device has seen the collection before), and a second one shortly after from the server. This is normal, documented Firestore SDK behavior — but the callback was firing the page's full render function for **both**, even when they contained byte-identical data (the common case: nothing changed remotely since the last time this device synced). Every one of the 8 migrated pages has this exposure, since they all call the same `subscribe()` method — Workout is simply the heaviest page (2000+ lines, the most DOM to rebuild), so it's where the redundant re-render was most visually obvious.

**Fix:** `subscribe()` now serializes each incoming snapshot and compares it to the last one delivered; if identical, the callback is skipped. The first snapshot (cache or server, whichever arrives first) still fires immediately — no loss of the "instant render from cache" benefit — and a genuinely different server snapshot still fires correctly. File: `repositories/BaseRepository.js`.

### Cause 2: A redundant `renderArt()` call on page load

`bootShell()` (`js/shared.js`) already renders the page's hero/illustration block (`#page-art`, which includes replacing an `<img>` via `innerHTML`) as part of every page's boot sequence. But `initHabitsPage()`, `initPrayerPage()`, `initNutritionPage()`, and `initWorkoutPage()` were **each calling `renderArt()` a second time**, immediately afterward, with the same page key — a literal duplicate `innerHTML` replacement of a block containing an image, which is exactly the kind of thing that causes a visible flash/redraw. This one wasn't Firestore-related at all — it would have caused the identical flicker even before this migration existed.

**Fix:** removed the redundant call from all four files. `bootShell()`'s own call is suffficient; nothing was lost.

### Cause 3 (found while checking "RepoAggregatorSync loops," which you specifically asked me to check): Dashboard/Statistics render-storm

`services/RepoAggregatorSync.js` (added in the previous session, to fix the Dashboard/Statistics discrepancy bug) subscribes to **8 separate repositories**, and was calling a full page re-render (`window.__pageContentReinit()`) independently, synchronously, for **each one** as its snapshot arrived — meaning Dashboard and Statistics could re-render up to 8 times (or more, compounded by Cause 1 above, before that fix) in the first second or two after page load. This wasn't asked about directly, but it's the same category of bug and arguably worse than Workout's, so I fixed it in the same pass.

**Fix:** the 8 subscriptions now share a single debounced flush — `window.currentData` is still updated immediately, per-collection, the instant each snapshot arrives (so no data is delayed), but the expensive full-page re-render is batched to fire once, ~30ms after the last of the 8 updates lands, instead of once per collection.

### What I could not literally measure

You asked me to "measure how many renders occur" and confirm "one initial render, one Firestore update, no visible flicker." I can't literally count renders in a running browser from here. What I can say with confidence, from the code: before this pass, Workout's realistic worst case on a fresh page load was up to **4 full re-renders of the page body** (initial render with local/legacy plan data → duplicate art re-render → cache snapshot → server snapshot), and Dashboard/Statistics's worst case was up to **~17 full re-renders** (1 initial + up to 8 collections × up to 2 snapshots each). After this fix, the expected count is **2** for Workout (1 initial + 1 real Firestore update, assuming the cache and server snapshots differ — 1 if they don't) and **2** for Dashboard/Statistics (1 initial + 1 debounced batch of whatever changed). This is a reasoned expectation from the code, not a measurement — please verify with the browser's Performance/Rendering panel on a real device, which will show this precisely in a way I cannot.

---

## PART 4 — Runtime Logging

**Added**, gated so it doesn't affect production by default. In `repositories/BaseRepository.js` — the single choke point every one of the 8 repositories' reads/writes/subscriptions goes through, so this one change covers all 8 pages rather than needing 8 separate edits.

**To enable, on each device you're testing, open the browser console and run:**
```js
localStorage.setItem('mylife.debugSync', '1')
```
then reload the page. Every repository operation will log to the console, prefixed `[sync]`, including:
- **Current UID** and module — logged when a repository is constructed (`repository constructed`)
- **Firestore collection path** — included in the same log line
- **Document ID** — included in every create/update/delete log
- **Snapshot received** — logged on every `onSnapshot` firing, including whether it came from cache or the server (`fromCache`), whether it has unconfirmed local writes (`hasPendingWrites`), and whether it was a duplicate of the last one (and therefore skipped — see Part 3)
- **Write succeeded** — logged after every successful create/update/delete
- **Read succeeded** — logged after every successful `get()`

To disable: `localStorage.removeItem('mylife.debugSync')`, or just leave it — it's off by default for every user who hasn't explicitly turned it on.

**This is the fastest way to actually answer Part 1's open question.** Put both devices side by side, open both consoles with logging enabled, create an item on the laptop, and watch: if the laptop's log shows `write succeeded` but the phone's log never shows a matching `snapshot received`, the problem is confirmed to be on the phone's read/subscribe side (or a stale deployment on that device). If the phone shows `snapshot received` with the new item but the UI doesn't update, the problem is in that page's render function, not sync. If the laptop's UID and the phone's UID (both logged on `repository constructed`) don't match, you've found it immediately — that would mean the two devices aren't actually authenticated as the same account despite appearing to be.

---

## PART 5 — Validation

Honestly, per your instruction not to mark this complete until proven:

| Claim | Status |
|---|---|
| Laptop → Firestore → Phone works | **Not proven.** Traced correct at the code level (Part 1); not run. |
| Phone → Firestore → Laptop works | **Not proven.** Same. |
| Dashboard updates | **Not proven live.** Code-traced correct as of the previous session's fix; not re-broken by this session's changes (rebuilt successfully after the debounce fix). |
| Statistics updates | **Not proven live.** Same. |
| Workout loads without flickering | **Not proven live.** Two concrete, real causes found and fixed at the code level; expected render count reasoned through above; not measured in an actual browser. |

**I am not marking this task complete.** The code is now, to the best of my ability to verify statically, correct and instrumented — but "correct in the code I can read" and "confirmed working across two real devices" are different claims, and only the second one is what you actually asked for. The fastest path to that confirmation is: enable `mylife.debugSync` on both devices (Part 4), redeploy the latest build, and watch the two consoles side by side while creating/editing/deleting on each device in turn. If something still doesn't sync after that, the console output will show exactly which of the three explanations in Part 1 it is, rather than requiring another round of code archaeology.
