# PROJECT_STRUCTURE.md — Phase 2

## Current structure (as of end of Phase 2)

```
MyLife/
├── index.html                  # Login/register page (the one page without app chrome)
├── pages/                      # 12 HTML entry points, one per feature
│   ├── dashboard.html, todo.html, habits.html, goals.html, calendar.html,
│   │   workout.html, prayer.html, nutrition.html, study.html,
│   │   statistics.html, account.html, weather.html
├── js/
│   ├── pages/                  # Thin bootstrap per page (DOMContentLoaded → bootShell → init)
│   ├── services/               # Page-scoped services (Quran/Azkar/Hadith loaders, LegacyDataSync,
│   │                             PathResolver, DataService, notification-center)
│   ├── shared.js               # Classic-script chrome, generic page renderer, legacy blob logic
│   ├── i18n.js                 # Localization
│   ├── {todo,habits,goals,calendar,workout,prayer,nutrition,study}.js
│   │                           # The 8 migrated features' real page logic (ES modules)
│   ├── dashboard-widget-defs.js, weather-dashboard.js, gamification-ui.js
├── repositories/                # One class per Firestore collection, all extending BaseRepository
│   ├── BaseRepository.js, UserScopedRepository.js
│   ├── TodoRepository.js, HabitRepository.js, GoalRepository.js, CalendarRepository.js,
│   │   WorkoutRepository.js, PrayerRepository.js, NutritionRepository.js, StudyRepository.js
│   ├── NotificationRepository.js, XpRepository.js, BadgeRepository.js,
│   │   AchievementRepository.js, StreakRepository.js
│   └── StatisticsRepository.js, DashboardRepository.js   ← orphaned, pending decision
├── services/                    # App-wide services (not page-scoped)
│   ├── AuthService.js, UserService.js, DashboardLayoutService.js
│   └── RepoAggregatorSync.js     ← added in an earlier session, powers Dashboard/Statistics
├── firebase/                     # Low-level Firebase SDK wrappers (auth.js, firestore.js, firebase.js)
├── core/                         # Cross-cutting engines
│   ├── GamificationEngine.js, WidgetRegistry.js, UndoManager.js, ErrorMapper.js
├── utils/
│   ├── validators.js, QueryUtils.js
│   └── LocalStorageService.js    ← orphaned, pending decision
├── css/
│   ├── variables.css, shared.css, responsive.css, momentum.css, gamification.css
│   ├── pages/                    # One stylesheet per feature page
│   └── momentum-theme.css, momentum-layout.css, momentum-overrides.css, space-video.css
│                                  ← 4 files not linked from any page, see DUPLICATE_SYSTEMS.md
├── locales/                      # en/ar/fr/de translation strings
├── data/                         # Bundled Quran (114 chapters + index), Hadith, Azkar JSON
├── assist/
│   ├── icons/                    # PWA icons (192/512, maskable variants)
│   ├── images/                   # Hero illustrations (planet/space imagery per page)
│   └── Videos/                   ← empty folder, likely a placeholder for the unshipped space-video feature
├── design-system/momentum/MASTER.md   # Design spec documentation
├── firestore.rules, firebase.json, vite.config.js, package.json
```

## Why this structure, not the React/TS-shaped one from the original brief

This is a vanilla JavaScript, multi-page Vite application — 12 separate HTML entry points, a mix of classic `<script>` tags and ES modules, no React, no JSX, no TypeScript, no client-side router. Folders like `hooks/`, `stores/`, `components/`, `types/` describe React/TypeScript conventions that don't correspond to anything in this codebase. Flagging this again per the note in Phase 1's response — the restructure phase (39–40) will produce a structure that achieves the same goals (clear layering, one responsibility per folder, no ambiguity about where new code goes) using terminology that actually fits this stack, unless directed otherwise.

## What changed this phase

- Removed: `assist/Momentum Logo.png`, 7 unused images in `assist/images/`, `firebase-debug.log`
- Fixed: `index.html` now links `css/momentum-overrides.css` (was missing, causing the login page's tagline to render unstyled)
- No folders added, removed, or renamed this phase — restructuring is explicitly Phase 39–40's job, after the underlying duplication found in Phase 2 has actually been resolved in the phases in between.
