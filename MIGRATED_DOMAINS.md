# MIGRATED_DOMAINS.md — Phase 4

Domains that now have a real repository, fully wired (UI → Repository → Firestore → onSnapshot → UI), with no remaining `currentData`/`persist()` dependency for their own data.

| Domain | Repository | Page(s) | Collection path | CRUD supported |
|---|---|---|---|---|
| Water | `WaterRepository` | Nutrition | `water/{uid}/items/{id}` | Create, Read, Delete (no edit UI exists for a logged entry — same as before migration) |
| Sleep | `SleepRepository` | Nutrition | `sleep/{uid}/items/{id}` | Create, Read |
| Body Measurements | `BodyMeasurementsRepository` | Nutrition **and** Workout (shared) | `bodyMeasurements/{uid}/items/{id}` | Create, Read, Delete |
| Shopping List | `ShoppingRepository` | Nutrition | `shopping/{uid}/items/{id}` | Create, Read, Update (checked toggle), Delete, bulk-delete (clear checked) |

## Already migrated in earlier phases (unchanged this phase, listed for completeness against your brief's "every feature" cross-check)

Todo, Habits, Goals, Calendar (events), Workout (finished-session log — distinct from the plan/schedule, still legacy), Prayer (the 5-daily log — distinct from Tasbeeh/Quran/Hadith, still legacy), Nutrition (meals — distinct from water/sleep/shopping, migrated this phase), Study (sessions — distinct from Subjects/Assignments/Exams/Projects/Notes/Resources/Pomodoro, still legacy), Notifications, XP-awarding, Badge-awarding, Achievement-awarding (the *awarding* logic in `core/GamificationEngine.js` — not the *display*, see REMAINING_DOMAINS.md), Streaks.

**Total domains with a complete repository as of end of Phase 4: 16** (12 from earlier phases + 4 new this phase).
