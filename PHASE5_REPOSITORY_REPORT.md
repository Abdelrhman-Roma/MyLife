# PHASE5_REPOSITORY_REPORT.md

## What this phase did

Completed the entire **Prayer page** (Tasbeeh, Quran progress/bookmarks/favorites/reading log, Hadith favorites) and the entire **Study page** (Subjects, Assignments, Exams, Projects, Notes, Resources, Pomodoro) — two of the largest remaining domain groups from REMAINING_DOMAINS.md. Both pages now have **zero** remaining `persist()` calls, confirmed by grep, not assumed.

## New infrastructure: `SingletonDocRepository`

Several remaining domains (Tasbeeh's counter, Quran's reading progress, Pomodoro's settings) are a single object per user, not a list of items — `BaseRepository`'s `items/{id}` shape doesn't fit them. Rather than force a fake one-item collection or duplicate CRUD logic a second time, I built one new, small sibling class (`repositories/SingletonDocRepository.js`) that applies the same principles (one Firestore doc per user, realtime via `onSnapshot`, same auth handling) to the single-object case. It is deliberately **not** a `BaseRepository` subclass — its contract (get/set/update on one object) is genuinely different from create/get/update/delete/subscribe-on-many, and subclassing something whose contract doesn't apply would be more confusing, not less. This is the one piece of new architecture this phase introduced, and it's a direct, minimal generalization of the existing pattern, not a new one.

## Repositories created (13 new this phase)

| Repository | Base | Collection/doc path |
|---|---|---|
| `TasbeehRepository` | `SingletonDocRepository` | `tasbeeh/{uid}` |
| `QuranProgressRepository` | `SingletonDocRepository` | `quranProgress/{uid}` |
| `QuranBookmarkRepository` | `BaseRepository` | `quranBookmarks/{uid}/items/{id}` |
| `QuranFavoriteRepository` | `BaseRepository` | `quranFavorites/{uid}/items/{id}` |
| `QuranLogRepository` | `BaseRepository` | `quranLog/{uid}/items/{id}` |
| `HadithFavoriteRepository` | `BaseRepository` | `hadithFavorites/{uid}/items/{id}` |
| `SubjectRepository` | `BaseRepository` | `subjects/{uid}/items/{id}` |
| `AssignmentRepository` | `BaseRepository` | `assignments/{uid}/items/{id}` |
| `ExamRepository` | `BaseRepository` | `exams/{uid}/items/{id}` |
| `ProjectRepository` | `BaseRepository` | `projects/{uid}/items/{id}` |
| `StudyNoteRepository` | `BaseRepository` | `studyNotes/{uid}/items/{id}` |
| `ResourceRepository` | `BaseRepository` | `resources/{uid}/items/{id}` |
| `PomodoroRepository` | `SingletonDocRepository` | `pomodoro/{uid}` |

No duplicates created — every one of these searched for first (see Phase 4's repository audit and this phase's own grep sweep); none existed before.

## Pages migrated

### Prayer (`js/prayer.js`) — complete
Every write site now routes through a repository: Tasbeeh increment/reset, Quran goal set/cancel, reading-progress tracking (lastSurah/lastAyah/readLog updates on each chapter read), all reading-settings toggles (font size, mode, line height, font family, focus, **and auto-scroll**, which I found still calling the old `persist()` directly while every setting next to it had already been migrated — fixed for consistency), bookmark/favorite toggle-while-reading and remove-from-list, Quran log create/delete, Hadith favorite create/delete.

### Study (`js/study.js`) — complete
Extended the existing `ENTITY_META` generic dispatch (already proven for the `session` type in an earlier phase) to all six remaining entity types via a new `repoForType(type)` helper and an `entityRepos` map populated in `startStudySync()`. This covers `saveEntity`/`deleteEntityById` for Subjects/Assignments/Exams/Projects/Notes/Resources uniformly. Beyond the generic path, also migrated: assignment completion toggle, project task checklist toggle/add (with recomputed progress), note pin/archive, and all Pomodoro settings (mode presets, custom work/break minutes, daily session-count rollover, phase-end session increment).

**One timing fix worth noting:** `resetPomodoroIfNewDay()` used to run synchronously in `initStudyPage()`, before any repository could possibly have resolved (repositories need an async `AuthService.waitUntilReady()` round-trip first). Moved it into the Pomodoro subscription's callback instead — the same fix pattern already used for Prayer's daily rollover in an earlier phase — so the day-reset logic runs against real synced data instead of whatever was in the pre-Firestore render cache.

**Dead code removed as a direct result:** `refreshStudy()`'s `opts.persistData` branch is now unreachable (nothing calls it with that flag anymore, confirmed by grep) — simplified the function signature to remove it rather than leave a dead parameter sitting in working code.

## Files modified

`js/prayer.js`, `js/study.js`, `js/shared.js` (extended `REPO_SYNCED_COLLECTIONS` and fixed its preservation check — see below), `firestore.rules` (13 new `match` blocks).

## A bug the extension work caught: object-shaped fields weren't protected from clobbering

`REPO_SYNCED_COLLECTIONS`'s preservation check in `applyRemoteData()` only protected **array**-shaped fields (`Array.isArray(currentData[key])`) from being overwritten by a stale legacy-blob refresh. Tasbeeh, Quran progress, and Pomodoro are all **objects**, not arrays — under the old check, none of them would have been protected, meaning any unrelated legacy blob update (e.g. editing Settings on another device) while the Prayer or Study page was open would have silently reverted these three back to stale values. Fixed the check to cover both arrays and objects, not just added the new domain names to the list.

## Files NOT modified this phase (still legacy, as expected)

Profile, Settings, Security, Achievements/XP display, Workout Plan/Schedule, Progress Photos, Weather Preferences — unchanged, per REMAINING_DOMAINS.md's own risk assessment. See FINAL_MIGRATION_STATUS.md for the complete current state.
