# DEPENDENCY_GRAPH.md — Phase 2

A real dependency map of the current architecture, built from actual `import` statements (not assumed), so it reflects the codebase as it exists after Phases 1–2.

## Page → data layer (the 8 migrated features)

Every one of these follows the identical shape: `js/pages/X.js` (bootstrap) → `js/X.js` (page logic module) → its own repository → Firestore, with `AuthService` supplying the UID and `window.currentData` as the shared render cache.

```mermaid
graph LR
  subgraph Bootstrap
    P1[js/pages/todo.js] --> M1[js/todo.js]
    P2[js/pages/habits.js] --> M2[js/habits.js]
    P3[js/pages/goals.js] --> M3[js/goals.js]
    P4[js/pages/calendar.js] --> M4[js/calendar.js]
    P5[js/pages/workout.js] --> M5[js/workout.js]
    P6[js/pages/prayer.js] --> M6[js/prayer.js]
    P7[js/pages/nutrition.js] --> M7[js/nutrition.js]
    P8[js/pages/study.js] --> M8[js/study.js]
  end
  subgraph Repositories
    M1 --> R1[TodoRepository]
    M2 --> R2[HabitRepository]
    M3 --> R3[GoalRepository]
    M4 --> R4[CalendarRepository]
    M5 --> R5[WorkoutRepository]
    M6 --> R6[PrayerRepository]
    M7 --> R7[NutritionRepository]
    M8 --> R8[StudyRepository]
  end
  R1 & R2 & R3 & R4 & R5 & R6 & R7 & R8 --> BR[BaseRepository]
  BR --> FS[firebase/firestore.js]
  M1 & M2 & M3 & M4 & M5 & M6 & M7 & M8 --> AS[services/AuthService.js]
  AS --> FA[firebase/auth.js]
  M2 & M3 & M4 & M6 & M7 & M8 --> CD[window.currentData — shared render cache]
  M4 -.cross-writes on linked-event toggle.-> R1
  M4 -.cross-writes.-> R2
  M4 -.cross-writes.-> R3
  M4 -.cross-writes.-> R6
  M4 -.cross-writes.-> R8
```

**Calendar (`js/calendar.js`) is the one node with fan-out beyond its own repository** — toggling a linked event's completion also writes into Todo/Habit/Goal/Prayer/Study's own repositories (dotted lines above). This is intentional (keeping the source-of-truth in sync when a mirrored event is checked off from the Calendar view), not a duplication.

## Dashboard & Statistics (read-only aggregation)

```mermaid
graph LR
  D[js/pages/dashboard.js] --> RAS[services/RepoAggregatorSync.js]
  S[js/pages/statistics.js] --> RAS
  RAS --> R1 & R2 & R3 & R4 & R5 & R6 & R7 & R8
  RAS --> CD2[window.currentData]
  CD2 --> RD[shared.js: renderDashboard]
  CD2 --> RS[shared.js: renderStatistics]
  CD2 --> WD[js/dashboard-widget-defs.js: 17 widgets]
```

Both Dashboard and Statistics subscribe to all 8 repositories directly via the same shared module — this is the fix from an earlier session that resolved the "Dashboard shows stale data" bug. One aggregation path, not two.

## Cross-cutting systems

```mermaid
graph LR
  subgraph Gamification
    GE[core/GamificationEngine.js] --> XR[XpRepository]
    GE --> BR2[BadgeRepository]
    GE --> AR[AchievementRepository]
    GE --> SR[StreakRepository]
    T[js/todo.js] -.recordEvent.-> GE
  end
  subgraph Notifications
    NC[js/notification-center.js] --> NR[NotificationRepository]
    NC --> US[services/UserService.js: notification settings]
    SH[js/shared.js: refreshChrome] -.creates DOM shell, patched by.-> NC
  end
  subgraph Legacy blob
    LDS[js/services/LegacyDataSync.js] --> USERSDOC[users/uid.appData]
    SH2[js/shared.js: currentData] --> LDS
  end
```

**Known real gaps in this graph** (documented in earlier sessions, not re-litigated here):
- Account/Profile page (`js/pages/account.js`) reads/writes achievements and XP through the **legacy blob**, not through `GamificationEngine`'s repositories — a confirmed split-brain, not shown as a connection above because there isn't one; that's the bug.
- Settings' notification-preference toggles write to the legacy blob's `notifications` field, which `notification-center.js` never reads (it reads `UserService`'s `notificationSettings` instead) — same situation.

## What still depends on the legacy `appData` blob

Everything NOT in the 8-feature list above: Profile, Settings, Security, Achievements (display only — see gap above), XP (display only), Quran progress/bookmarks/favorites, Tasbeeh, Hadith collection, Water, Sleep, Body measurements, Progress photos, Shopping list, Workout plan/schedule (as opposed to the log, which is migrated), Study's Subjects/Assignments/Exams/Projects/Notes/Resources/Pomodoro.

## Orphaned nodes (confirmed zero inbound edges from any live page)

- `repositories/StatisticsRepository.js` → only referenced by `repositories/DashboardRepository.js`
- `repositories/DashboardRepository.js` → zero inbound edges from anywhere
- `utils/LocalStorageService.js` → zero inbound edges
- `css/space-video.css`, `css/momentum-theme.css`, `css/momentum-layout.css` → zero inbound edges (not JS, but same orphan status)

No circular imports were found in this pass — every dependency arrow above points one direction only.
