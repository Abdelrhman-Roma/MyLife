# PHASE 1 — DATA MIGRATION AUDIT

**Principle: No User Data May Be Lost**

This document is the authoritative migration reference for porting the MyLife legacy multi-page app (vanilla JS + Firestore blob) into MyLife-React (React 18 + modular Firestore). Every data source, schema, and migration risk is catalogued here.

---

## 1. Firebase Authentication

### Providers

| Provider | ID | Status |
|---|---|---|
| Email / Password | `password` | Active — primary auth method |
| Google OAuth | `google.com` | Active — via `AuthService.signInWithProvider` |
| GitHub OAuth | `github.com` | Active — via `AuthService.signInWithProvider` |

### User Profile Fields (Firestore `users/{uid}`)

| Field | Type | Source | Notes |
|---|---|---|---|
| `email` | string | Firebase Auth | Synced on every login |
| `displayName` | string | Firebase Auth | Set via `updateProfile` on register |
| `photoURL` | string | Firebase Auth / ProfileRepository | Avatar URL |
| `emailVerified` | boolean | Firebase Auth | Not currently enforced |
| `xp` | number | GamificationEngine | Total accumulated XP |
| `level` | number | GamificationEngine | Derived from XP at 500 XP/level |
| `workspace` | object `{ id, name, createdAt }` | UserService.createProfile | Created at registration |
| `createdAt` | Timestamp | UserService | Set once at registration |
| `updatedAt` | Timestamp | UserService | Updated on every login |
| `lastLoginAt` | Timestamp | AuthService | Updated on every sign-in |
| `lastProvider` | string | AuthService | Last sign-in provider ID |

### UID Usage

- All per-user Firestore paths use the Firebase Auth UID as the path segment: `{collection}/{uid}/items/{itemId}` or `{collection}/{uid}` for singletons.
- The legacy localStorage session gate (`mylife.session`) stores the user **email**, not the UID. This creates a dual-identity system that must be resolved: React must always use the Firebase Auth UID.
- `auth-firebase.js` bridges Firebase Auth UID into the legacy session by writing the user's email to localStorage after Firebase sign-in succeeds.

---

## 2. Firestore Collections Schema

### 2.1 User Top-Level Document

**Path:** `users/{uid}`

| Field | Type | Description |
|---|---|---|
| `email` | string | User email address |
| `displayName` | string | Full display name |
| `photoURL` | string | Avatar image URL |
| `emailVerified` | boolean | Firebase verification status |
| `xp` | number | Total XP points |
| `level` | number | Current level (derived) |
| `workspace` | `{ id: string, name: string, createdAt: Timestamp }` | User workspace metadata |
| `createdAt` | Timestamp | Account creation time |
| `updatedAt` | Timestamp | Last profile update |
| `lastLoginAt` | Timestamp | Last sign-in time |
| `lastProvider` | string | Auth provider used last |
| `appData` | object | Legacy blob (LegacyDataSync — to be deprecated) |
| `appDataUpdatedAt` | Timestamp | Last appData write time |

**Read patterns:** AuthService reads on login; UserService.subscribeProfile subscribes for real-time updates.
**Write patterns:** AuthService writes on every sign-in; UserService writes on profile updates.
**Security:** Only the authenticated user (`request.auth.uid == uid`) may read/write their own document.

---

### 2.2 Dashboard Layout

**Path:** `users/{uid}/dashboard/layout`

| Field | Type | Description |
|---|---|---|
| `widgets` | `WidgetPlacement[]` | Ordered widget placements |
| `widgets[].widgetId` | string | Widget identifier |
| `widgets[].order` | number | Display order |
| `widgets[].size` | `'sm' \| 'md' \| 'lg'` | Widget size |
| `widgets[].hidden` | boolean | Visibility flag |
| `widgets[].pinned` | boolean | Pin to top flag |
| `widgets[].collapsed` | boolean | Collapsed state |
| `personalization.accentColor` | string | Theme accent colour |
| `personalization.cornerRadius` | `'sharp' \| 'md' \| 'round'` | Border radius setting |
| `personalization.transparency` | number (0–100) | Transparency level |
| `personalization.compactMode` | boolean | Compact layout toggle |
| `personalization.animations` | boolean | Animations enabled |

**Default widgets:** `todo` (pinned, md), `habits` (sm), `weather` (sm), `quote` (sm).
**Read patterns:** DashboardLayoutService.subscribeLayout for real-time sync.
**Write patterns:** DashboardLayoutService.saveLayout on any layout change.

---

### 2.3 Todos

**Path:** `todos/{uid}/items/{id}`

| Field | Type | Description |
|---|---|---|
| `id` | string | UUID (makeId) |
| `title` | string | Task title |
| `notes` | string | Optional notes |
| `priority` | `'Low' \| 'Medium' \| 'High'` | Priority level |
| `tags` | string[] | User-defined tags |
| `dueDate` | string (ISO date) | Due date |
| `time` | string | Time of day |
| `recurring` | `{ freq: string }` | Recurrence rule |
| `reminder` | string | Reminder setting |
| `reminderFired` | boolean | Whether reminder has fired |
| `dependsOn` | string[] | IDs of blocking tasks |
| `subtasks` | object[] | Sub-task list |
| `attachments` | object[] | Attachment references |
| `completed` | boolean | Completion state |
| `completedAt` | string (ISO) | Completion timestamp |
| `createdAt` | Timestamp | Creation time |
| `order` | number | Manual sort order |
| `completionLog` | object[] | Completion history |
| `ownerId` | string | Firebase Auth UID |
| `updatedAt` | Timestamp | Last update (BaseRepository) |

**Read patterns:** TodoRepository.subscribe (real-time); RepoAggregatorSync mirrors to `window.currentData.tasks`.
**Write patterns:** addEntry (shared.js) → toggleComplete → deleteEntry; optimistic update via transaction on toggle.
**Relationships:** CalendarRepository cross-writes on event completion toggle.

---

### 2.4 Habits

**Path:** `habits/{uid}/items/{id}`

| Field | Type | Description |
|---|---|---|
| `id` | string | UUID |
| `title` | string | Habit name |
| `category` | string | User-defined category |
| `difficulty` | `'Easy' \| 'Medium' \| 'Hard'` | Difficulty rating |
| `weeklyTarget` | number (1–7) | Target completions per week |
| `completions` | string[] | ISO date strings of completions |
| `completed` | boolean | Derived: completed today |
| `createdAt` | Timestamp | Creation time |
| `ownerId` | string | Firebase Auth UID |
| `updatedAt` | Timestamp | Last update |

**Read patterns:** HabitRepository.subscribe; CalendarRepository cross-reads for completion write-back.
**Write patterns:** HabitRepository.update on checkbox toggle; heatmap cell click for retroactive date toggle.

---

### 2.5 Goals

**Path:** `goals/{uid}/items/{id}`

| Field | Type | Description |
|---|---|---|
| `id` | string | UUID |
| `title` | string | Goal description |
| `period` | `'Daily' \| 'Weekly' \| 'Monthly' \| 'Yearly'` | Goal period |
| `completed` | boolean | Completion state |
| `completedAt` | string (ISO) | Completion timestamp |
| `createdAt` | Timestamp | Creation time |
| `ownerId` | string | Firebase Auth UID |
| `updatedAt` | Timestamp | Last update |

**Read patterns:** GoalRepository.subscribe (via goals.js); window.__goalsRepo used by shared.js.
**Write patterns:** shared.js addEntry/toggleComplete/deleteEntry via window.__goalsRepo.

---

### 2.6 Calendar Events

**Path:** `events/{uid}/items/{id}`

| Field | Type | Description |
|---|---|---|
| `id` | string | UUID |
| `title` | string | Event title |
| `description` | string | Event description |
| `category` | string | One of 12 values: workout/study/habit/water/sleep/nutrition/prayer/todo/goal/event/meeting/reminder/custom |
| `date` | string (ISO date) | Event date |
| `startTime` | string | Start time |
| `endTime` | string | End time |
| `allDay` | boolean | All-day flag |
| `priority` | `'Low' \| 'Medium' \| 'High'` | Priority |
| `repeatRule` | `'None' \| 'Daily' \| 'Weekly' \| 'Monthly' \| 'Yearly'` | Recurrence |
| `reminder` | string | Reminder setting |
| `color` | string | Display colour |
| `icon` | string | Display icon |
| `notes` | string | Additional notes |
| `completed` | boolean | Completion state |
| `completedAt` | Timestamp | Completion timestamp |
| `createdAt` | Timestamp | Creation time |
| `updatedAt` | Timestamp | Last update |
| `status` | string | Event status |
| `sourceModule` | string | Originating module (for linked events) |
| `sourceId` | string | ID in originating module |
| `ownerId` | string | Firebase Auth UID |

**Read patterns:** CalendarRepository.subscribe; cross-module repos (Todo, Habit, Goal, Prayer, Study) subscribed for completion write-back.
**Write patterns:** CalendarRepository CRUD; cross-write to source module on completion toggle.
**Relationships:** Bidirectional sync with Todo, Habit, Goal, Prayer, Study collections. Workout cross-write is broken (in-memory only).

---

### 2.7 Workouts

**Path:** `workouts/{uid}/items/{id}`

| Field | Type | Description |
|---|---|---|
| `id` | string | UUID |
| `dayFull` | string | Day name (Monday, etc.) |
| `type` | string | Push Day / Pull Day / Leg Day / Upper Body / Lower Body / Full Body / Cardio / Rest Day |
| `exercises` | object[] | `{ name, log[], exStatus, performance }` |
| `status` | string | Not Started / In Progress / Done / Skipped / Rest Day |
| `statusLocked` | boolean | Lock flag |
| `durationMin` | number | Session duration in minutes |
| `calories` | number | Estimated calories burned |
| `completionDate` | string (ISO) | Date completed |
| `lastCompletedDate` | string (ISO) | Previous completion date |
| `ownerId` | string | Firebase Auth UID |
| `createdAt` | Timestamp | Creation time |
| `updatedAt` | Timestamp | Last update |

**CRITICAL:** Workout PLAN (schedule + exercise definitions) remains in `localStorage/appData` (legacy blob). This is a split-brain: Firestore holds session logs, localStorage holds the plan template. Multi-device users see different plans on different devices.

---

### 2.8 Prayers

**Path:** `prayers/{uid}/items/{id}`

| Field | Type | Description |
|---|---|---|
| `id` | string | Deterministic: `${date}_${prayerName}` |
| `date` | string (ISO date) | Prayer date |
| `prayer` | `'Fajr' \| 'Dhuhr' \| 'Asr' \| 'Maghrib' \| 'Isha'` | Prayer name |
| `time` | string | Scheduled time (hardcoded, not location-based) |
| `status` | `'Pending' \| 'Completed' \| 'Missed'` | Prayer status |
| `completedAt` | Timestamp | Completion timestamp |
| `ownerId` | string | Firebase Auth UID |
| `createdAt` | Timestamp | Creation time |
| `updatedAt` | Timestamp | Last update |

**Note:** Prayer times are hardcoded static strings, not computed from user location or date.

---

### 2.9 Nutrition (Meals)

**Path:** `meals/{uid}/items/{id}`

| Field | Type | Description |
|---|---|---|
| `id` | string | UUID |
| `title` | string | Meal name |
| `type` | `'Breakfast' \| 'Lunch' \| 'Dinner' \| 'Snack'` | Meal type |
| `date` | string (ISO date) | Meal date |
| `calories` | number | Calorie count |
| `protein` | number | Protein (g) |
| `carbs` | number | Carbohydrates (g) |
| `fat` | number | Fat (g) |
| `ingredients` | string | Comma-separated ingredient list |
| `ownerId` | string | Firebase Auth UID |
| `createdAt` | Timestamp | Creation time |
| `updatedAt` | Timestamp | Last update |

---

### 2.10 Water

**Path:** `water/{uid}/items/{id}`

| Field | Type | Description |
|---|---|---|
| `id` | string | UUID |
| `glasses` | number | Number of glasses logged |
| `date` | string (ISO date) | Log date |
| `ownerId` | string | Firebase Auth UID |
| `createdAt` | Timestamp | Creation time |
| `updatedAt` | Timestamp | Last update |

**Note:** Dashboard widget reads `w.amount || w.cups` — both wrong. Field is `glasses`. Widget will show 0 until fixed.

---

### 2.11 Sleep

**Path:** `sleep/{uid}/items/{id}`

| Field | Type | Description |
|---|---|---|
| `id` | string | UUID |
| `hours` | number | Hours slept |
| `quality` | `'Good' \| 'Great' \| 'Low'` | Sleep quality |
| `date` | string (ISO date) | Sleep date |
| `ownerId` | string | Firebase Auth UID |
| `createdAt` | Timestamp | Creation time |
| `updatedAt` | Timestamp | Last update |

---

### 2.12 Study Sessions

**Path:** `study/{uid}/items/{id}`

| Field | Type | Description |
|---|---|---|
| `id` | string | UUID |
| `date` | string (ISO date) | Session date |
| `duration` | number | Duration in minutes |
| `completed` | boolean | Completion flag |
| `elapsedSeconds` | number | Actual elapsed time |
| `startTime` | string | Start time |
| `subjectId` | string | Foreign key to subjects |
| `status` | `'Planned' \| 'In Progress' \| 'Paused' \| 'Completed'` | Session status |
| `ownerId` | string | Firebase Auth UID |
| `createdAt` | Timestamp | Creation time |
| `updatedAt` | Timestamp | Last update |

**Related collections:**

| Path | Fields |
|---|---|
| `subjects/{uid}/items/{id}` | `{ name, icon, color }` |
| `assignments/{uid}/items/{id}` | `{ title, subjectId, dueDate, status: 'Not Started' \| 'In Progress' \| 'Completed' }` |
| `exams/{uid}/items/{id}` | `{ title, subjectId, date, preparation: number }` |
| `projects/{uid}/items/{id}` | `{ title, subjectId, status }` |
| `studyNotes/{uid}/items/{id}` | `{ title, content, color, subjectId, archived: boolean }` |
| `resources/{uid}/items/{id}` | `{ title, type: 'Link \| Article \| Video \| PDF \| Book \| Slides \| Other', url, subjectId }` |
| `pomodoros/{uid}/items/{id}` (singleton pattern) | `{ mode, workMin, sessionsToday, lastResetDate }` |

---

### 2.13 Body Measurements

**Path:** `bodyMeasurements/{uid}/items/{id}`

| Field | Type | Description |
|---|---|---|
| `id` | string | UUID |
| `weight` | number | Weight (unit user-defined) |
| `waist` | number | Waist measurement |
| `date` | string (ISO date) | Measurement date |
| `ownerId` | string | Firebase Auth UID |
| `createdAt` | Timestamp | Creation time |
| `updatedAt` | Timestamp | Last update |

---

### 2.14 Shopping List

**Path:** `shoppingList/{uid}/items/{id}`

| Field | Type | Description |
|---|---|---|
| `id` | string | UUID |
| `item` | string | Item name |
| `checked` | boolean | Checked off flag |
| `ownerId` | string | Firebase Auth UID |
| `createdAt` | Timestamp | Creation time |
| `updatedAt` | Timestamp | Last update |

---

### 2.15 Notifications

**Path:** `notifications/{uid}/items/{id}` (200-item limit, ordered by createdAt desc)

| Field | Type | Description |
|---|---|---|
| `id` | string | UUID |
| `message` | string | Notification text |
| `category` | string | Todo / Habit / Goal / Workout / Nutrition / Study / Prayer / Weather / Achievements / System / Security / Account / Backup |
| `read` | boolean | Read state |
| `archived` | boolean | Archived state |
| `pinned` | boolean | Pinned state |
| `priority` | string | Priority level |
| `deepLink` | string | Navigation URL |
| `action` | `{ label: string, actionId: string }` | Action button data |
| `createdAt` | Timestamp or ISO string | Creation time |
| `metadata` | object | Category-specific metadata |
| `ownerId` | string | Firebase Auth UID |

---

### 2.16 Gamification

| Path | Repository | Fields |
|---|---|---|
| `xp/{uid}/items/{id}` | XpRepository | XP event log entries |
| `badges/{uid}/items/{id}` | BadgeRepository | Unlocked badge records |
| `achievements/{uid}/items/{id}` | AchievementRepository | Unlocked achievement records |
| `streaks/{uid}/items/{id}` | StreakRepository | Streak history |

**XP Awards:**

| Event | XP |
|---|---|
| `todo:completed` | 10 |
| `habit:completed` | 15 |
| `goal:completed` | 50 |
| `prayer:logged` | 5 |
| `workout:completed` | 20 |
| `study:session` | 10 |
| `nutrition:logged` | 5 |
| `water:logged` | 2 |
| `sleep:logged` | 5 |

**Achievement types:** badge, hidden, secret, repeatable, seasonal.
**Custom events dispatched:** `mylife:achievement-unlocked`, `mylife:xp-awarded`, `mylife:level-up`.

---

### 2.17 Quran & Islamic Collections

| Path | Repository | Fields |
|---|---|---|
| `quranProgress/{uid}/items/{id}` | QuranProgressRepository | `{ lastSurah, lastAyah, lastReadAt, readLog{}, dailyGoal, goal, readingSettings: { mode, fontSize, lineHeight, fontFamily, focus, autoScroll } }` |
| `quranBookmarks/{uid}/items/{id}` | QuranBookmarkRepository | Bookmark records |
| `quranFavorites/{uid}/items/{id}` | QuranFavoriteRepository | Favorite ayah records |
| `quranLog/{uid}/items/{id}` | QuranLogRepository | Reading session log |
| `tasbeeh/{uid}/items/{id}` | TasbeehRepository | `{ count, target, updatedAt }` |
| `hadithFavorites/{uid}/items/{id}` | HadithFavoriteRepository | Favorites (no source data — HadithService always returns NO_DATA) |

---

### 2.18 Progress Photos

**Path:** `progressPhotos/{uid}/items/{id}`

| Field | Type | Description |
|---|---|---|
| `id` | string | UUID |
| (additional fields) | mixed | Photo metadata managed by ProgressPhotoRepository |
| `ownerId` | string | Firebase Auth UID |
| `createdAt` | Timestamp | Upload time |
| `updatedAt` | Timestamp | Last update |

Photo binary data: stored via `LocalImageService` in localStorage as base64 (see Section 4). Firebase Storage is **not currently used** for photos.

---

### 2.19 Singleton Profile Documents

| Path | Repository | Key Fields |
|---|---|---|
| `profile/{uid}` | ProfileRepository | `{ firstName, lastName, username, phone, birthday, gender, country, city, location, timezone, headline, bio, photo, cover, joinedAt, xp }` |
| `settings/{uid}` | SettingsRepository | `{ theme, palette, studyGoal, workoutGoal, waterGoal, sleepGoal, habitGoal, prayerGoal, calorieTarget, proteinTarget, carbTarget, fatTarget, fontSize, radius, compact, glass, animations }` |
| `security/{uid}` | SecurityRepository | `{ twoFactor, lastPasswordChange }` |
| `weatherPreferences/{uid}` | WeatherPreferencesRepository | `{ location: { latitude, longitude, name, country, timezone, source } }` |

---

## 3. Firebase Storage

Firebase Storage is **not currently active** in the MyLife legacy app.

- `firebase.ts` in the React project omits `storageBucket` from its config object.
- No Firebase Storage SDK calls (`ref()`, `uploadBytes()`, `getDownloadURL()`) appear anywhere in `shared.js` or any feature module.
- Progress photos are stored as base64 data URLs in **localStorage** under `mylife.image.{uid}_{avatar|cover}`.
- The Firebase project `momentum-6bb1d` has a Storage bucket configured (`momentum-6bb1d.firebasestorage.app`) but it is unused.

**Migration requirement for Phase 2+:** When progress photos are migrated away from localStorage, they must move to Firebase Storage (not Firestore — binary blobs in Firestore documents will hit the 1 MB document limit). The React firebase config must be updated to include `storageBucket`.

**Anticipated Storage paths (future):**

| Path | Content |
|---|---|
| `users/{uid}/avatar` | Profile avatar image |
| `users/{uid}/cover` | Profile cover image |
| `users/{uid}/photos/{photoId}` | Progress photos |

---

## 4. LocalStorage Schema

All keys prefixed `mylife.` unless noted.

| Key | Type | Content | Written By | Migration Target |
|---|---|---|---|---|
| `mylife.users` | JSON array | All local user account objects (pre-Firebase migration artefact) | shared.js | None — superseded by Firebase Auth |
| `mylife.session` | string | Logged-in user email (persistent login) | shared.js, auth-firebase.js | None — superseded by Firebase Auth session |
| `mylife.data.{email}` | JSON object | Legacy per-user `currentData` blob | shared.js (pre-Firestore) | No longer written; kept for account-deletion cleanup only |
| `mylife.theme` | string | `'light' \| 'dark' \| 'auto'` | account.js, i18n.js | `settings/{uid}.theme` in Firestore; ThemeProvider localStorage key `mylife-theme-preference` in React |
| `mylife.palette` | string | Palette ID (e.g. `deep-space`) | account.js, i18n.js | `settings/{uid}.palette` in Firestore |
| `mylife.sidebarCollapsed` | string `'1'` | Sidebar collapsed state | shared.js | React UI state (no persistence needed) |
| `mylife.lang` | string | `'en' \| 'ar' \| 'fr' \| 'de'` | i18n.js | `settings/{uid}.language` in Firestore; react-i18n config |
| `mylife.performanceDebug` | string `'1'` | Enable perf trace logging | dev tooling | Dev-only; no migration needed |
| `mylife.weather.location` | JSON object | `{ latitude, longitude, name, country, timezone, source }` | WeatherLocationService | `weatherPreferences/{uid}` in Firestore (already implemented) |
| `mylife.weather.locationPreference` | string | `'granted' \| 'denied' \| 'manual'` | WeatherLocationService | `weatherPreferences/{uid}` in Firestore |
| `mylife.weather.{email}` | JSON + `cachedAt` | Cached weather API response | WeatherCacheService | React in-memory cache (30-min TTL) |
| `mylife_data_cache_v1_{url}` | JSON | Cached Quran/Azkar JSON fetches | DataService | IndexedDB (Cache API or idb-keyval) |
| `mylife.image.{uid}_{avatar\|cover}` | base64 data URL | Avatar and cover images | LocalImageService | Firebase Storage (Phase 2+) |
| `mylife.debugSync` | string `'1'` | Enable sync console logs | dev tooling | Dev-only; no migration needed |
| `mylife-theme-preference` | string | React ThemeProvider theme (React app only) | ThemeProvider.tsx | Harmonise with `mylife.theme` |

**sessionStorage keys:**

| Key | Type | Content | Notes |
|---|---|---|---|
| `mylife.session` | string | User email (non-persistent login) | Same key as localStorage; written when "remember me" is unchecked |

---

## 5. IndexedDB Schema

IndexedDB is **not used** in the current legacy app. There are zero `createObjectStore` calls in `shared.js` or any feature module.

The React app's `firestore.ts` calls `enableIndexedDbPersistence(db)` — this is the **deprecated** Firebase SDK v8 API. The correct Firebase 10 replacement is:

```ts
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});
```

This creates Firebase-managed IndexedDB stores (prefixed `firestore/`) — they are internal to the SDK and do not require application-level schema management.

**Recommended Phase 1 action:** Replace `enableIndexedDbPersistence` in `services/firebase/firestore.ts` with `initializeFirestore` + `persistentLocalCache`.

---

## 6. Migration Strategy Per Domain

| Domain | Current Storage | Target in React | Risk | Strategy |
|---|---|---|---|---|
| Authentication | Firebase Auth + localStorage session gate | Firebase Auth + React AuthProvider | Low | AuthProvider already implemented. Remove localStorage session gate entirely. |
| User Profile | `users/{uid}` + localStorage `mylife.users` | `users/{uid}` + ProfileRepository | Low | UserService already migrated. Drop `mylife.users` localStorage reads in React. |
| Settings | `settings/{uid}` (Firestore) + localStorage `mylife.theme`/`mylife.palette`/`mylife.lang` | `settings/{uid}` via SettingsRepository | Medium | Must hydrate ThemeProvider from Firestore on first load. Harmonise `mylife-theme-preference` and `mylife.theme` keys. |
| Dashboard Layout | `users/{uid}/dashboard/layout` | DashboardLayoutService | Low | Already implemented in services layer. Wire into React custom dashboard. |
| Todos | `todos/{uid}/items` (fully migrated) | TodoRepository | Low | Already the primary write path. Wrap in React hook. |
| Habits | `habits/{uid}/items` (blob + repo ready) | HabitRepository | Medium | Repo exists but `window.currentData.habits` is still the write source. Migrate write path before React wiring. |
| Goals | `goals/{uid}/items` (repo ready, global coupling) | GoalRepository | Medium | `window.__goalsRepo` global must be replaced by a proper React context. |
| Calendar Events | `events/{uid}/items` (repo ready) | CalendarRepository | High | Bidirectional cross-module sync is complex. Workout write-back is broken. Must fix before migrating. |
| Workouts (sessions) | `workouts/{uid}/items` (Firestore) | WorkoutRepository | Medium | Session log is migrated; plan template is not. |
| Workout Plan | localStorage `appData` blob | `workoutPlan/{uid}` (new collection needed) | High | Split-brain between devices. Requires new collection or inclusion in `settings/{uid}`. |
| Prayer Logs | `prayers/{uid}/items` (repo ready) | PrayerRepository | Low | Clean schema. Static prayer times must be replaced with a calculated or API-driven source. |
| Nutrition / Meals | `meals/{uid}/items` (repo ready) | NutritionRepository | Medium | Shopping list generation has malformed HTML selectors (bug must be fixed). |
| Water | `water/{uid}/items` (repo ready) | WaterRepository | Low | Field name bug in dashboard widget (`amount`/`cups` vs `glasses`) must be fixed. |
| Sleep | `sleep/{uid}/items` (repo ready) | SleepRepository | Low | Clean schema. |
| Study Sessions | `study/{uid}/items` + 6 sub-repos | StudyRepository + entity repos | Medium | 8 Firestore subscriptions; Pomodoro timer leak must be fixed before migration. |
| Body Measurements | `bodyMeasurements/{uid}/items` | BodyMeasurementsRepository | Low | Shared across Workout and Nutrition pages; single repo source. |
| Shopping List | `shoppingList/{uid}/items` | ShoppingRepository | Medium | Malformed HTML selectors in nutrition.js break generate/clear buttons. Fix before migration. |
| Notifications | `notifications/{uid}/items` | NotificationRepository | Medium | Monkey-patched `window.refreshChrome` must be replaced by React state. |
| Gamification | `xp`, `badges`, `achievements`, `streaks` + GamificationEngine | GamificationEngine + React hooks | Medium | Achievement computation is ephemeral (not stored). Must decide: store in Firestore or recompute. |
| Quran / Tasbeeh / Hadith | Multiple Firestore collections | Same repos | Low | Data layer ready. UI migration only. HadithService is a stub — no content to migrate. |
| Progress Photos | localStorage base64 + ProgressPhotoRepository | Firebase Storage + ProgressPhotoRepository | High | Base64 images in localStorage will hit storage quota. Firebase Storage migration required. |
| Images (avatar/cover) | `mylife.image.{uid}_{kind}` localStorage | Firebase Storage | High | Same as progress photos. Currently entirely local; lost on browser clear. |
| Weather Cache | localStorage `mylife.weather.{email}` | React in-memory cache | Low | Cache is ephemeral by design. No migration; reinitialise on load. |
| Weather Location | localStorage + `weatherPreferences/{uid}` | `weatherPreferences/{uid}` only | Low | Firestore path already implemented. Drop localStorage copy. |
| Quran Data Cache | localStorage `mylife_data_cache_v1_*` | Cache API or idb-keyval | Low | Bundled JSON; re-fetched on first load. Migration optional. |
| i18n | localStorage `mylife.lang` | `settings/{uid}.language` + localStorage fallback | Low | Read Firestore setting on auth; fall back to localStorage for unauthenticated. |
| Legacy Blob (`appData`) | `users/{uid}` field `appData` (LegacyDataSync) | Deprecated — all domains above | High | Must not remove until all domains are confirmed migrated and tested. |

---

## 7. Data Migration Risks

### Risk 1 — Workout Plan Split-Brain (High)
The workout weekly schedule and exercise definitions live in `localStorage/appData`, not in any named Firestore collection. A multi-device user's plan will differ per device. There is no automatic sync. A new `workoutPlan/{uid}` collection or an extension of `settings/{uid}` must be created and a one-time migration from the user's local blob must be performed on first load in the React app.

### Risk 2 — Progress Photo / Image Storage Quota (High)
Avatar, cover, and progress photos are stored as raw base64 strings in localStorage. An average progress photo can exceed 500 KB as base64. Most browsers cap localStorage at 5–10 MB per origin. Users with multiple photos are likely already hitting quota errors silently. These must be migrated to Firebase Storage before the React app ships.

### Risk 3 — Legacy Blob Removal Timing (High)
`LegacyDataSync.js` writes the entire `window.currentData` blob to `users/{uid}.appData` on every save. If this is removed before all domain modules are fully migrated to their individual repositories, data for unmigrated domains will be permanently lost. Removal must be the last step.

### Risk 4 — Calendar Bidirectional Sync Complexity (High)
`reconcileSourceLinkedEvents` issues one Firestore write per changed field on every snapshot. On first load this can generate dozens of writes simultaneously. The workout source module's `setCompleted` only mutates memory with no Firestore write — bidirectional sync for workout events is silently broken. This must be fully audited and fixed before the Calendar module is migrated.

### Risk 5 — Authentication Identity Model Mismatch (Medium)
The legacy app gates every page via `getSessionUser()` reading a user **email** from localStorage and looking it up in `mylife.users`. Firebase Auth sessions use the **UID**. In the React app, the email-based session gate must be completely removed; all user identity must flow from `firebase.auth().currentUser.uid`. Any localStorage `mylife.users` data must not be imported into React.

### Risk 6 — Dashboard Widget Data Shape Bugs (Medium)
Three dashboard widgets read wrong field names: Water widget reads `amount`/`cups` (actual: `glasses`); Workout widget reads `name`/`title` from log entries (no such fields); Prayer widget reads `today.completed` as an object (actual: array of prayer records). All three widgets will show incorrect data until fixed. These must be corrected in the legacy app and in the React widget implementations.

### Risk 7 — Quranprogress Null Dereference (Medium)
`initPrayerPage` reads `window.currentData.quranProgress.readingSettings.fontSize` before any Firestore snapshot has arrived. If `quranProgress` is undefined, this throws and breaks the prayer page on cold load. The React implementation must guard all deep property accesses with optional chaining.

### Risk 8 — Notification Center Global Coupling (Medium)
The notification center monkey-patches `window.refreshChrome`. In React, this pattern must be replaced with a React context or event emitter. If `refreshChrome` is not defined when `notification-center.js` initialises, notifications will not update on Chrome re-renders.

### Risk 9 — Timer Leaks on Navigation (Medium)
`disposeWorkoutPage` does not clear `sessionClockInterval` or `sessionTimers`. `disposeStudyPage` does not clear the Pomodoro ticker. `weather-dashboard.js`'s 30-minute interval is never cleared. All timer leaks will accumulate and cause stale callbacks on navigation in a React SPA. Each `useEffect` cleanup in React must explicitly cancel all intervals.

### Risk 10 — Achievements Are Ephemeral (Low-Medium)
Study achievements are computed locally on every render and never written to the `achievements/{uid}/items` collection. Across devices or after a re-login, all achievement progress is lost. The React implementation must decide whether to persist computed badges to Firestore via AchievementRepository.

### Risk 11 — i18n `data-i18n-html` XSS Vector (Low)
`i18n.js` sets innerHTML from translation strings via `data-i18n-html`. If any locale file is compromised or a translation key ever holds user-controlled text, this is an XSS vector. The React migration should use safe React rendering (`dangerouslySetInnerHTML` with explicit sanitisation, or avoid it entirely).

---

## 8. Migration Order

Phases are sequenced to ensure data integrity: core infrastructure first, then high-value/low-risk domains, then complex or high-risk domains last.

```
Phase 1 (Foundation — this audit)
  1. Fix enableIndexedDbPersistence → initializeFirestore + persistentLocalCache
  2. Harmonise localStorage theme/palette/lang keys with Firestore settings
  3. Remove legacy email-based session gate; use Firebase Auth UID exclusively

Phase 2 (Core User Data)
  4. Migrate Auth UI: Login, Register, Password Reset, OAuth buttons
  5. Migrate Profile (ProfileRepository) and Settings (SettingsRepository)
  6. Migrate Dashboard with DashboardLayoutService
  7. Migrate Todos (already fully migrated in legacy — wrap with React hooks)
  8. Migrate Notifications (replace window.refreshChrome with React context)

Phase 3 (Habits, Goals, Prayer, Water, Sleep)
  9.  Migrate Habits — fix write path from window.currentData to HabitRepository
  10. Migrate Goals — replace window.__goalsRepo global with React context
  11. Migrate Prayer — fix null dereference; add proper prayer time calculation
  12. Migrate Water — fix field name bug (glasses vs amount/cups)
  13. Migrate Sleep

Phase 4 (Nutrition, Study, Workout Sessions)
  14. Migrate Nutrition — fix malformed HTML selectors in shopping list
  15. Migrate Study — fix Pomodoro timer leak; decide achievement persistence
  16. Migrate Workout sessions — fix sessionClockInterval leak
  17. Migrate Body Measurements, Shopping List

Phase 5 (Complex Domains)
  18. Migrate Calendar — fix reconcileSourceLinkedEvents write storm;
      fix workout bidirectional sync; implement correct cross-module pattern
  19. Migrate Workout Plan — create workoutPlan collection; one-time localStorage import

Phase 6 (Media & Cleanup)
  20. Migrate progress photos and avatar/cover to Firebase Storage
  21. Remove LegacyDataSync.js and appData blob writes
  22. Remove all legacy localStorage keys no longer needed
  23. Migrate Gamification: wire GamificationEngine event recording;
      persist achievements to AchievementRepository
  24. Migrate Quran / Islamic collections (data layer ready — UI migration only)
```

---

## 9. Rollback Plan

### Principle
The legacy app and the React app run independently. The React app reads from the same Firebase project (`momentum-6bb1d`). No legacy data is deleted until the React app has been verified in production.

### Per-Domain Rollback

**Auth:** Firebase Auth is shared. No rollback needed — both apps use the same Auth instance. If React Auth breaks, users can sign in via the legacy app.

**Firestore Collections:** All BaseRepository writes include `ownerId`, `createdAt`, and `updatedAt`. If the React app writes malformed data, a Firestore backup (daily export to Cloud Storage) can be used to restore. Before any bulk migration runs, trigger a manual Firestore export.

**Legacy Blob (`appData`):** `LegacyDataSync.js` must remain active and writing until Step 21 in the migration order. This provides a full-data rollback: if any migrated domain in React produces corrupted data, the legacy app can be re-deployed and will re-read from the blob.

**localStorage:** Do not delete legacy localStorage keys during migration. They are read-only references once Firebase is the write source. Clean up only after the React app has been live and verified for 30+ days.

**Progress Photos / Images:** Before migrating images from localStorage to Firebase Storage, export all base64 data to a staging Firestore document or a local backup JSON. Do not delete from localStorage until Firebase Storage upload is confirmed.

**Feature Flag Strategy:** Implement a `settings/{uid}.reactMigrationFlags` map (e.g. `{ todos: true, habits: false }`) to enable React-rendered modules per user. This allows gradual rollout and per-domain rollback without a full deployment revert.

### Emergency Rollback
If a critical data loss bug is discovered after a migration phase:
1. Immediately disable the React app deployment (serve legacy app from the same Firebase Hosting URL).
2. The legacy app will resume reading from the `appData` blob (last written by LegacyDataSync) and from individual Firestore collections.
3. Identify and fix the data integrity issue in a staging environment.
4. Re-apply only the affected writes using a Firestore Admin SDK migration script from the daily backup.
5. Re-enable the React app only after a full integration test pass against production data.
