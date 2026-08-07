# FIRESTORE_STATUS.md — Phase 4

## Collections now live

| Collection | Repository | Rules present? |
|---|---|---|
| `todos/{uid}/items/{id}` | `TodoRepository` | Yes (pre-existing) |
| `habits/{uid}/items/{id}` | `HabitRepository` | Yes (pre-existing) |
| `goals/{uid}/items/{id}` | `GoalRepository` | Yes (pre-existing) |
| `calendar/{uid}/items/{id}` | `CalendarRepository` | Yes (pre-existing) |
| `workout/{uid}/items/{id}` | `WorkoutRepository` | Yes (pre-existing) |
| `prayer/{uid}/items/{id}` | `PrayerRepository` | Yes (pre-existing) |
| `nutrition/{uid}/items/{id}` | `NutritionRepository` | Yes (pre-existing) |
| `study/{uid}/items/{id}` | `StudyRepository` | Yes (pre-existing) |
| `users/{uid}` (achievements/badges/streaks/xp subcollections) | `AchievementRepository`, `BadgeRepository`, `StreakRepository`, `XpRepository` | Yes (pre-existing) |
| `notifications/{uid}/items/{id}` | `NotificationRepository` | Yes (pre-existing) |
| **`water/{uid}/items/{id}`** | **`WaterRepository`** | **Added this phase** |
| **`sleep/{uid}/items/{id}`** | **`SleepRepository`** | **Added this phase** |
| **`bodyMeasurements/{uid}/items/{id}`** | **`BodyMeasurementsRepository`** | **Added this phase** |
| **`shopping/{uid}/items/{id}`** | **`ShoppingRepository`** | **Added this phase** |

All new rules follow the identical pattern already used by every other collection: `allow read, write: if isOwner(uid);`, scoped to the authenticated user's own UID. No rule changes were needed for any pre-existing collection.

## Firestore rules integrity check

`firestore.rules` brace count verified balanced (70 open / 70 close) after edits. 22 `match` blocks total (18 before this phase + 4 added). I don't have the Firebase CLI/emulator available in this environment to run `firebase deploy --only firestore:rules --dry-run` or the rules test suite, so this is a structural check, not a deployed-and-verified one — worth a real `firebase deploy` (or at minimum the Firebase Console's rules simulator) before relying on it in production.

## Realtime listeners

Every one of the 4 new repositories uses the exact same `subscribe()` implementation in `BaseRepository` — including the cache/server-duplicate-snapshot dedupe fix from an earlier session. No new listener code was written; nothing to independently re-verify for correctness beyond what was already proven for the other 12 collections using the same method.

## Still entirely on the legacy `appData` blob (no Firestore collection yet)

Profile (partial), Settings, Security, Achievements-display, XP-display, Quran progress/bookmarks/favorites/log, Tasbeeh, Hadith collection, Workout plan/schedule, Progress photos, Study's Subjects/Assignments/Exams/Projects/Notes/Resources, Pomodoro, Weather preferences. Full detail and reasoning per domain in REMAINING_DOMAINS.md.
