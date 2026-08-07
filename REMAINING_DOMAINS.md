# REMAINING_DOMAINS.md — Phase 4

Every domain still depending on `currentData`/`LegacyDataSync`/`persist()`/`appData`, with a note on what makes each one easy, medium, or genuinely blocked on a decision I can't make unilaterally.

| Domain | Page(s) | Complexity | Notes |
|---|---|---|---|
| Profile (name/bio/username/birthday/avatar) | Account | Medium | Single-object-per-user shape rather than an array of items — fits `UserScopedRepository`'s pattern (see `XpRepository`) better than `BaseRepository`'s items-collection pattern. Some fields (display name, photo, provider, verification) already sync via `UserService`; the rest doesn't. |
| Settings (theme, language, notification toggles, macro targets, etc.) | Account, and read synchronously by `bootShell()`/`applyTheme()` on every page | **Higher risk than it looks** | Theme is applied synchronously, before any repository could possibly resolve (repositories require an async `AuthService.waitUntilReady()` round-trip). Migrating Settings to Firestore-only means either accepting a flash-of-default-theme on every page load, or keeping a synchronous local fallback for theme specifically while migrating the rest — a design decision, not just a data-source swap. |
| Security (2FA flag, last-password-change) | Account | Low-medium | Needs verification of whether these are purely decorative today or wired to a real Firebase Auth security feature — not confirmed either way yet. |
| **Achievements & XP display** | Account (profile page), Dashboard's Achievements widget | **Blocked on a product decision, not a technical one** | This is the one I want to flag most clearly. `core/GamificationEngine.js` has a real, working `ACHIEVEMENT_DEFS` list (14 achievements: Early Bird, Night Owl, 7/30-Day Streak, 100 Todos, etc.) backed by `AchievementRepository`/`XpRepository`. `js/pages/account.js` has its **own, completely separate** `ACHIEVEMENT_DEFS` list (10 different achievements: First Step, Habit Builder, Hydration Hero, etc.) computed locally from `currentData` and stored in the legacy blob. These are not two views of the same data — they're two different achievement *designs* with no overlapping IDs. "Complete the existing repository" isn't a safe instruction to follow silently here, because doing so changes *which achievements exist* from the user's perspective — that's a product call about which design is canonical, not an architecture fix. Flagged for a decision before any code changes. |
| Quran progress / bookmarks / favorites / reading log | Prayer | Medium | Multiple related sub-collections (progress per chapter, bookmarked verses, favorited verses, a reading-session log) — more like 3–4 small repositories than one. |
| Tasbeeh counter | Prayer | Low | Simple counter + optional history; straightforward `BaseRepository` fit. |
| Hadith collection (saved/favorited hadith) | Prayer | Low | Same shape as Quran favorites. |
| Shopping list | ~~Nutrition~~ | — | **Done this phase.** |
| Workout plan/schedule (as opposed to the log, which is migrated) | Workout | Medium-high | The schedule drives a lot of derived UI (weekly view, "today's workout" card, streak calculations specific to the plan) — migrating it touches more render logic than the simple log entries did. |
| Progress photos | Workout | Low-medium | Simple array of `{id, date, photoUrl/base64}` — the only wrinkle is confirming whether photos are stored as data URIs in the document (fine for Firestore's 1MB doc limit only for small images) or need Firebase Storage instead of Firestore, which the "Do NOT change Firestore collections unless absolutely necessary" instruction doesn't quite cover (Storage isn't Firestore). Worth deciding explicitly before building. |
| Study: Subjects, Assignments, Exams, Projects, Notes, Resources | Study | Medium | Six related entities sharing one generic CRUD helper (`saveEntity`/`deleteEntityById`) in `js/study.js` already, keyed by an `ENTITY_META` map — each would need its own repository, but the page-side wiring can likely reuse the existing generic dispatch pattern (similar to how Goals reuses `shared.js`'s generic CRUD via `window.__goalsRepo`). |
| Pomodoro settings | Study | Low | Small settings object, same shape concern as Settings above (read synchronously on page load) but much lower blast radius (only affects the Study page, not every page's chrome). |
| Weather preferences / recommendations | Weather | Low-medium | `WeatherRecommendationService.js` reads/writes `currentData.settings.waterGoal` directly — tangled with Settings rather than a clean standalone domain; likely needs to move in step with the Settings work above, not independently. |

## What still can't be deleted as a result

Per your own Phase 3 brief's "DO NOT delete... until ALL domains have been migrated" instruction: `LegacyDataSync.js`, `appData`, and `persist()` all remain necessary for the domains above. None were touched this phase beyond what Phase 3 already did (the `saveData()` removal and `getData()` simplification).

## Suggested order for future phases, if useful

1. Tasbeeh, Hadith collection, Progress photos — lowest complexity, no design decisions pending, same pattern as this phase.
2. Quran progress/bookmarks/favorites/log — medium, several small repositories.
3. Study's six entities — medium, but the existing `ENTITY_META` generic-dispatch pattern should make the page-side wiring faster than building six one-off integrations.
4. Workout plan/schedule — medium-high, more render logic entangled.
5. Settings/Profile/Security/Weather-preferences — as a deliberate group, once the synchronous-theme-read design question is answered.
6. Achievements/XP — only after a product decision on which achievement design is canonical.
