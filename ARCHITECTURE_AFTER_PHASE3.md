# ARCHITECTURE_AFTER_PHASE3.md

## The final-check list from your brief, answered honestly

| Requirement | Status |
|---|---|
| ✓ One Authentication System | **Not yet** — Firebase Auth is the real system; a local session gate (`mylife.session`/`bridgeIntoLegacySession`) still sits in front of every page as a second layer. Known, documented debt (see LEGACY_REMOVAL_REPORT.md). |
| ✓ One Repository Layer | **Yes**, for the 8 migrated features (Todo/Habits/Goals/Calendar/Workout-log/Prayer/Nutrition-meals/Study-sessions) plus Notifications/XP/Badges/Achievements/Streaks. No competing repository implementation exists for any of these. |
| ✓ One Firestore Layer | **Yes** — one `firebase/firestore.js` wrapper, one `BaseRepository`, no duplicate Firebase SDK wrapper found anywhere (Phase 2 confirmed this). |
| ✓ One Dashboard System | **Yes** — `RepoAggregatorSync` is the only Dashboard data path (fixed in an earlier session). |
| ✓ One Statistics System | **Yes** — same aggregator, same page. |
| ✓ One Notification System | **Mostly** — `NotificationRepository` + `notification-center.js` is the real, live system. `shared.js` still renders a DOM *shell* the newer system fills (a dependency, not a duplicate — see Phase 2's DUPLICATE_SYSTEMS.md), and Settings' notification-preference toggles still write to a dead legacy field nothing reads (a bug, documented in an earlier session, not fixed yet). |
| ✓ One Render Pipeline | **Not yet** — the 8 migrated features render through `window.currentData` populated by repositories; everything else renders through the same `currentData` object but populated by the legacy blob. One shared cache object, two different things feeding it. |
| ✓ One Data Source | **Not yet** — Firestore is the source of truth for 8 features + gamification + notifications; the legacy `appData` blob is still the source of truth for roughly 9 more feature domains (full list below). |
| ✓ One Sync Engine | **Not yet** — repository `onSnapshot` for the migrated features; `LegacyDataSync`'s single-document blob sync for everything else. |
| ✓ One Cache Strategy | **Yes** — one Firestore persistent local cache config, one service worker cache strategy (confirmed no duplicates in Phase 2). |
| ✓ One Service Worker | **Yes** — one `sw.js`, confirmed in Phase 2. |
| ✓ One State Management System | **Not yet** — same as "One Data Source" above; `window.currentData` is the single shared object, but it's fed by two different mechanisms depending on which feature you're looking at. |

**Honest summary: 7 of 12 fully met, 1 mostly met, 4 not yet.** This is not a failure of this phase — it's the accurate current state, and the point of doing this audit rigorously is that the remaining 4-and-a-half items now have a precise, named list of exactly what work closes each one, rather than a vague "finish the migration" instruction.

## What Firestore already fully owns (no `currentData`/blob dependency for the actual data — read caches through `currentData` for rendering, but writes go straight to Firestore)

Todo, Habits, Goals, Calendar (events), Workout (log only), Prayer (log only), Nutrition (meals only), Study (sessions only), Notifications, XP, Badges, Achievements (the *awarding* logic — not yet the *display*, see below), Streaks.

## What still depends entirely on the legacy `appData` blob

Profile, Settings, Security, Achievements *display* (Account page shows a locally-computed list, not `AchievementRepository`'s real data — a confirmed split-brain from an earlier session), XP *display* (same situation with `XpRepository`), Quran progress/bookmarks/favorites/reading log, Tasbeeh counter, Hadith collection, Water, Sleep, Body measurements, Progress photos, Shopping list, Workout's plan/schedule, Study's Subjects/Assignments/Exams/Projects/Notes/Resources/Pomodoro, Weather's saved-location-driven recommendations.

## What still depends on `localStorage`/`sessionStorage` for something other than theme/language/UI-prefs

Only the auth-gate bridge (`mylife.session`, `mylife.users`) — everything else storing anything locally is either an allowed UI preference or a re-fetchable technical cache (weather API response, Quran/Azkar JSON), not user business data. Full breakdown in LEGACY_REMOVAL_REPORT.md.

## The concrete path to "Firestore is the only source of truth"

1. Build a repository for each of the ~9 remaining domains listed above (same `BaseRepository`/`UserScopedRepository` pattern already proven 8 times over).
2. Rewire each page's reads/writes to its new repository, the same way the 8 already-migrated features were done.
3. Once every domain has a repository and nothing reads/writes `currentData`/`appData` for real data anymore, retire `LegacyDataSync.js` and the `appData` blob field entirely.
4. Separately, convert `bootShell()`'s auth gate to check Firebase Auth directly (`onAuthStateChanged`) instead of the local session bridge — this one doesn't depend on the repository work above and could happen in parallel, but needs live browser verification across all 13 pages given how central `bootShell()` is.
5. Once both of the above are done, `window.currentData` can be either fully retired in favor of each render function reading its repository directly, or kept purely as an in-memory render cache with no remaining "legacy" meaning attached to it at all.

None of this was attempted in Phase 3 itself — building 9 new repositories and rewiring their pages is substantial, multi-page work that deserves its own dedicated phases (already scheduled as Phases 11 onward in the 50-phase roadmap from Phase 1), not a rush inside a single "removal" phase.
