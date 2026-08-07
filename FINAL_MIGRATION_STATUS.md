# FINAL_MIGRATION_STATUS.md

## Domains with a complete repository, wired, zero legacy dependency (29 total)

Todo, Habits, Goals, Calendar (events), Workout (finished-session log only), Prayer (5-daily log), Nutrition (meals), Study (sessions), Notifications, XP-awarding, Badge-awarding, Achievement-awarding, Streaks, Water, Sleep, Body Measurements, Shopping List, **Tasbeeh, Quran Progress, Quran Bookmarks, Quran Favorites, Quran Reading Log, Hadith Favorites, Study Subjects, Study Assignments, Study Exams, Study Projects, Study Notes, Study Resources, Pomodoro**.

(Bold = new this phase.)

## Domains still on the legacy `appData` blob

| Domain | Why still pending |
|---|---|
| Profile | Grouped with Settings — see below |
| Settings (theme, language, notification toggles, macro targets) | Theme is read **synchronously** by `bootShell()`/`applyTheme()` on every page load, before any repository could possibly resolve (repositories require an async round-trip). Migrating this safely means deciding whether to accept a flash-of-default-theme or keep a synchronous local fallback — a design decision, not a data-source swap. Not attempted without that decision. |
| Security | Needs confirming whether the 2FA flag/password-change timestamp are decorative or tied to a real Firebase Auth security feature — not confirmed either way yet. |
| Achievements & XP *display* | **Blocked on a product decision, not a technical one** (unchanged from Phase 4's finding): `js/pages/account.js` runs its own, separate achievement system with a different list of achievements than `core/GamificationEngine.js`'s real one. Silently switching the display to the real repository would change which achievements exist from the user's perspective. Flagged, not decided by me. |
| Workout Plan/Schedule | More render logic entangled than the simple log entries were (weekly view, "today's workout" card, plan-specific streak calculations) |
| Progress Photos | Stores images as base64 `dataUrl` directly in the legacy blob. Migrating as-is into a Firestore document risks hitting Firestore's 1MB document-size limit for larger photos — this is arguably a Firebase Storage use case, not a Firestore one, and your "do not change Firestore collections unless absolutely necessary" instruction doesn't clearly cover "use a different Firebase product instead." Flagged for an explicit decision rather than guessed at. |
| Weather Preferences | `WeatherRecommendationService.js` reads/writes `currentData.settings.waterGoal` directly — entangled with Settings, not a clean standalone domain; likely needs to move together with the Settings work above. |

## Numbers

- **Repositories in the project: 35** (22 before this phase, 13 new)
- **Domains with complete Firestore migration: 29**
- **Domains still on the legacy blob: 7** (Profile, Settings, Security, Achievements/XP-display, Workout Plan/Schedule, Progress Photos, Weather Preferences)
- **Pages that are 100% repository-driven with zero `persist()` calls: 10** (Todo, Habits, Goals, Calendar, Nutrition, Notifications, Prayer, Study — plus Dashboard/Statistics, which never held data of their own)
- **Pages with partial legacy dependency remaining: 3** (Workout — plan/schedule/photos; Account — Profile/Settings/Security/Achievements/XP; Weather)

## Can `LegacyDataSync`/`appData`/`currentData`/`persist()` be deleted yet?

**No.** The 7 domains above are real, currently-working features with no replacement built. Deleting the legacy system now would break the Account page substantially (Profile, Settings, Security, Achievements, XP all live there), part of the Workout page (plan/schedule/photos), and Weather's recommendation engine. This is the same "prove it before you delete it" conclusion as every prior phase — the list of what's blocking it is just seven items shorter than it was at the start of Phase 4.
