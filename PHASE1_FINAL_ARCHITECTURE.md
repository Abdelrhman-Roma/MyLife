# PHASE 1 — FINAL ARCHITECTURE

> Target: one consolidated React 18 + Vite + TypeScript + React Router 6 + Firebase 10 project
> living at `MyLife/MyLife-React/` (the vanilla-JS tree at `MyLife/` is the legacy source).

---

## Architecture Principles

1. **Firestore is the single source of truth.** No dual-write to localStorage for domain data.
   localStorage is reserved for UI preferences (theme, language, palette) and read-only caches
   (weather, Quran JSON).

2. **One repository per Firestore collection.** Every repository is a typed TypeScript class
   implementing a shared `IRepository<T>` interface. No raw Firestore calls outside repositories.

3. **One custom hook per feature.** Each domain exposes a `use{Domain}` hook that owns the
   `onSnapshot` subscription, loading/error state, and all write helpers. Pages are pure rendering.

4. **Code splitting at the route level.** Every page is `React.lazy`. The auth bundle, firebase
   SDK, and each feature chunk load independently. The initial JS payload stays below 80 KB.

5. **No globals.** Zero `window.*` assignments. Every service is a singleton class imported as an
   ES module. No script-tag service loading.

6. **Strict TypeScript.** `strict: true`, `noUnusedLocals`, `noUnusedParameters`,
   `noImplicitReturns`. All Firestore document shapes are typed via interfaces in `types/`.

7. **RTL-first layout.** All spacing, flex direction, and icon placement use logical CSS properties
   (`margin-inline-start`, `padding-inline-end`, etc.) so Arabic layout requires no overrides.

8. **Lifecycle discipline.** Every `onSnapshot` unsubscribes in the hook's cleanup. Every
   `setInterval` / `setTimeout` clears on unmount. No timer leaks across navigations.

9. **Atomic optimistic updates.** Write helpers apply the change to local state immediately, then
   call the repository. On Firestore error the hook rolls back. Users see instant feedback.

10. **Feature flags via a single `features.ts` constant map.** Unimplemented sections (Hadith,
    live prayer times) are hidden behind flags rather than rendered as dead UI.

---

## Complete Directory Structure

```
MyLife/MyLife-React/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── playwright.config.ts
├── .env.local                        (VITE_FIREBASE_* vars — not committed)
├── .env.example                      (template, committed)
│
└── src/
    ├── main.tsx                      (entry — StrictMode > AppProviders)
    │
    ├── app/
    │   ├── router.tsx                (all lazy routes + guards)
    │   └── providers/
    │       ├── AppProviders.tsx      (composes all context providers)
    │       ├── AuthProvider.tsx      (Firebase onAuthStateChanged)
    │       ├── ThemeProvider.tsx     (8 palettes + light/dark/system)
    │       └── I18nProvider.tsx      (i18next + RTL dir attribute)
    │
    ├── assets/
    │   ├── icons/                    (SVG icon components, tree-shaken)
    │   ├── images/                   (space backgrounds — lazy loaded)
    │   └── logo.svg
    │
    ├── components/
    │   ├── layout/
    │   │   ├── AppShell.tsx          (sidebar + header + main slot)
    │   │   ├── Sidebar.tsx           (react-router Link nav, active state)
    │   │   └── Header.tsx            (theme toggle, lang switcher, user menu)
    │   ├── ui/
    │   │   ├── Button.tsx
    │   │   ├── Card.tsx
    │   │   ├── Input.tsx
    │   │   ├── Select.tsx
    │   │   ├── Modal.tsx
    │   │   ├── Badge.tsx
    │   │   ├── Toast.tsx             (imperative toast via context)
    │   │   ├── Spinner.tsx
    │   │   ├── Skeleton.tsx
    │   │   ├── EmptyState.tsx
    │   │   ├── ProgressRing.tsx      (macro rings, streak circles)
    │   │   └── UndoBar.tsx           (8-second undo toast)
    │   ├── feedback/
    │   │   ├── AppLoading.tsx
    │   │   ├── RouteLoading.tsx
    │   │   └── ErrorBoundary.tsx
    │   └── gamification/
    │       ├── XpPopup.tsx
    │       ├── LevelUpBanner.tsx
    │       └── AchievementCard.tsx
    │
    ├── features/
    │   ├── dashboard/
    │   │   ├── DashboardPage.tsx
    │   │   ├── WidgetGrid.tsx
    │   │   ├── WidgetStore.tsx
    │   │   ├── widgets/
    │   │   │   ├── TodoWidget.tsx
    │   │   │   ├── HabitsWidget.tsx
    │   │   │   ├── WeatherWidget.tsx
    │   │   │   ├── QuoteWidget.tsx
    │   │   │   ├── PomodoroWidget.tsx
    │   │   │   ├── GoalsWidget.tsx
    │   │   │   ├── WaterWidget.tsx
    │   │   │   ├── NutritionWidget.tsx
    │   │   │   ├── PrayerWidget.tsx
    │   │   │   ├── WorkoutWidget.tsx
    │   │   │   ├── StatisticsWidget.tsx
    │   │   │   └── NotificationsWidget.tsx
    │   │   ├── hooks/
    │   │   │   └── useDashboardLayout.ts
    │   │   └── types.ts
    │   ├── auth/
    │   │   ├── LoginPage.tsx
    │   │   ├── RegisterPage.tsx
    │   │   ├── ForgotPasswordPage.tsx
    │   │   └── hooks/
    │   │       └── useAuth.ts        (re-exports from AuthProvider)
    │   ├── todo/
    │   │   ├── TodoPage.tsx
    │   │   ├── TodoList.tsx
    │   │   ├── TodoItem.tsx
    │   │   ├── TodoModal.tsx
    │   │   ├── hooks/
    │   │   │   └── useTodos.ts
    │   │   └── types.ts
    │   ├── habits/
    │   │   ├── HabitsPage.tsx
    │   │   ├── HabitCard.tsx
    │   │   ├── HabitHeatmap.tsx
    │   │   ├── HabitModal.tsx
    │   │   ├── hooks/
    │   │   │   └── useHabits.ts
    │   │   └── types.ts
    │   ├── goals/
    │   │   ├── GoalsPage.tsx
    │   │   ├── GoalCard.tsx
    │   │   ├── GoalModal.tsx
    │   │   ├── hooks/
    │   │   │   └── useGoals.ts
    │   │   └── types.ts
    │   ├── calendar/
    │   │   ├── CalendarPage.tsx
    │   │   ├── MonthView.tsx
    │   │   ├── WeekView.tsx
    │   │   ├── DayView.tsx
    │   │   ├── EventModal.tsx
    │   │   ├── hooks/
    │   │   │   └── useCalendar.ts
    │   │   └── types.ts
    │   ├── workout/
    │   │   ├── WorkoutPage.tsx
    │   │   ├── WeeklySchedule.tsx
    │   │   ├── SessionPanel.tsx
    │   │   ├── BodyMetrics.tsx
    │   │   ├── ProgressPhotos.tsx
    │   │   ├── hooks/
    │   │   │   └── useWorkout.ts
    │   │   └── types.ts
    │   ├── nutrition/
    │   │   ├── NutritionPage.tsx
    │   │   ├── MacroRings.tsx
    │   │   ├── MealList.tsx
    │   │   ├── MealPlanner.tsx
    │   │   ├── ShoppingList.tsx
    │   │   ├── hooks/
    │   │   │   └── useNutrition.ts
    │   │   └── types.ts
    │   ├── prayer/
    │   │   ├── PrayerPage.tsx
    │   │   ├── PrayerCards.tsx
    │   │   ├── QuranReader.tsx
    │   │   ├── TasbeehCounter.tsx
    │   │   ├── AzkarModal.tsx
    │   │   ├── hooks/
    │   │   │   └── usePrayer.ts
    │   │   └── types.ts
    │   ├── study/
    │   │   ├── StudyPage.tsx
    │   │   ├── SessionsTab.tsx
    │   │   ├── SubjectsTab.tsx
    │   │   ├── AssignmentsTab.tsx
    │   │   ├── ExamsTab.tsx
    │   │   ├── NotesTab.tsx
    │   │   ├── PomodoroTimer.tsx
    │   │   ├── FocusMode.tsx
    │   │   ├── hooks/
    │   │   │   └── useStudy.ts
    │   │   └── types.ts
    │   ├── weather/
    │   │   ├── WeatherPage.tsx
    │   │   ├── WeatherHero.tsx
    │   │   ├── HourlyForecast.tsx
    │   │   ├── DailyForecast.tsx
    │   │   ├── WeatherDetails.tsx
    │   │   ├── WeatherCharts.tsx
    │   │   ├── hooks/
    │   │   │   └── useWeather.ts
    │   │   └── types.ts
    │   ├── statistics/
    │   │   ├── StatisticsPage.tsx
    │   │   ├── hooks/
    │   │   │   └── useStatistics.ts
    │   │   └── types.ts
    │   ├── notifications/
    │   │   ├── NotificationCenter.tsx
    │   │   ├── NotificationItem.tsx
    │   │   ├── hooks/
    │   │   │   └── useNotifications.ts
    │   │   └── types.ts
    │   └── account/
    │       ├── AccountPage.tsx
    │       ├── ProfileSection.tsx
    │       ├── AppearanceSection.tsx
    │       ├── SecuritySection.tsx
    │       ├── ConnectedAccounts.tsx
    │       ├── hooks/
    │       │   └── useAccount.ts
    │       └── types.ts
    │
    ├── hooks/
    │   ├── useFirestoreSubscription.ts  (generic onSnapshot with cleanup)
    │   ├── useOptimisticUpdate.ts
    │   ├── useUndoManager.ts
    │   ├── useDebounce.ts
    │   ├── useIntersectionObserver.ts
    │   ├── useLocalStorage.ts
    │   └── useGamification.ts           (dispatches XP/badge events)
    │
    ├── repositories/
    │   ├── BaseRepository.ts            (generic CRUD + subscribe)
    │   ├── SingletonDocRepository.ts    (single-doc per user)
    │   ├── TodoRepository.ts
    │   ├── HabitRepository.ts
    │   ├── GoalRepository.ts
    │   ├── CalendarRepository.ts
    │   ├── WorkoutRepository.ts
    │   ├── BodyMeasurementsRepository.ts
    │   ├── ProgressPhotoRepository.ts
    │   ├── NutritionRepository.ts
    │   ├── WaterRepository.ts
    │   ├── SleepRepository.ts
    │   ├── ShoppingRepository.ts
    │   ├── PrayerRepository.ts
    │   ├── QuranProgressRepository.ts
    │   ├── QuranBookmarkRepository.ts
    │   ├── QuranFavoriteRepository.ts
    │   ├── QuranLogRepository.ts
    │   ├── TasbeehRepository.ts
    │   ├── HadithFavoriteRepository.ts
    │   ├── StudyRepository.ts
    │   ├── SubjectRepository.ts
    │   ├── AssignmentRepository.ts
    │   ├── ExamRepository.ts
    │   ├── ProjectRepository.ts
    │   ├── StudyNoteRepository.ts
    │   ├── ResourceRepository.ts
    │   ├── PomodoroRepository.ts
    │   ├── StatisticsRepository.ts
    │   ├── NotificationRepository.ts
    │   ├── XpRepository.ts
    │   ├── BadgeRepository.ts
    │   ├── AchievementRepository.ts
    │   ├── StreakRepository.ts
    │   ├── ProfileRepository.ts
    │   ├── SettingsRepository.ts
    │   ├── SecurityRepository.ts
    │   └── WeatherPreferencesRepository.ts
    │
    ├── services/
    │   ├── firebase/
    │   │   ├── firebase.ts            (initializeApp, db, auth exports)
    │   │   ├── auth.ts                (signIn/register/signOut/OAuth helpers)
    │   │   └── firestore.ts           (db export, persistentLocalCache)
    │   ├── weather/
    │   │   ├── WeatherService.ts      (open-meteo fetch, dedup in-flight)
    │   │   ├── WeatherCacheService.ts (30-min localStorage cache)
    │   │   ├── WeatherLocationService.ts
    │   │   ├── WeatherGeocodingService.ts
    │   │   ├── WeatherRecommendationService.ts
    │   │   ├── WeatherCodes.ts        (WMO code → label/icon map)
    │   │   └── NetworkUtils.ts        (fetch with retry + timeout)
    │   ├── prayer/
    │   │   ├── PrayerTimesService.ts  (AlAdhan API integration)
    │   │   └── HijriDateService.ts    (tabular Hijri calculation)
    │   ├── quran/
    │   │   ├── QuranService.ts
    │   │   ├── AzkarService.ts
    │   │   └── DataService.ts         (fetch + retry + localStorage cache)
    │   ├── AuthService.ts             (singleton, OAuth, provider linking)
    │   ├── UserService.ts             (users/{uid} singleton doc)
    │   ├── DashboardLayoutService.ts  (users/{uid}/dashboard/layout)
    │   ├── ImageService.ts            (facade → LocalImageService)
    │   └── images/
    │       └── LocalImageService.ts   (base64 in localStorage)
    │
    ├── core/
    │   ├── GamificationEngine.ts      (XP formula, level curve, achievements)
    │   ├── WidgetRegistry.ts
    │   ├── ErrorMapper.ts             (tryFirebase wrapper)
    │   └── UndoManager.ts
    │
    ├── providers/
    │   └── (all in app/providers/ — this dir is a symlink alias)
    │
    ├── types/
    │   ├── auth.ts
    │   ├── common.ts
    │   ├── firebase.ts
    │   ├── todo.ts
    │   ├── habit.ts
    │   ├── goal.ts
    │   ├── calendar.ts
    │   ├── workout.ts
    │   ├── nutrition.ts
    │   ├── prayer.ts
    │   ├── study.ts
    │   ├── weather.ts
    │   ├── statistics.ts
    │   ├── gamification.ts
    │   └── settings.ts
    │
    ├── utils/
    │   ├── dates.ts                   (Hijri, date math, format helpers)
    │   ├── validators.ts              (form field validators)
    │   ├── queryUtils.ts              (Firestore query builders)
    │   ├── escapeHtml.ts
    │   ├── formatters.ts              (number, duration, weight formatters)
    │   └── features.ts                (feature flag constants)
    │
    ├── i18n/
    │   ├── index.ts                   (i18next init — resources lazy-loaded)
    │   ├── locales/
    │   │   ├── en.json
    │   │   ├── ar.json
    │   │   └── ... (fr, de)
    │   └── types.ts                   (typed translation keys)
    │
    └── styles/
        ├── tokens.css                 (design tokens: spacing, radius, color)
        ├── globals.css                (reset, typography, layout utilities)
        ├── auth.css                   (login/register page animations)
        └── variables.css              (CSS custom property palette definitions)
```

---

## Key Architecture Decisions

### Routing

**Provider:** `react-router-dom` v6 `BrowserRouter` with `React.lazy` for every page component.

**Route guards:** `ProtectedRoute` redirects unauthenticated users to `/login`.
`PublicRoute` redirects authenticated users to `/dashboard`.
Both show `<RouteLoading />` while `AuthProvider.loading` is true.

**Full route list:**

| URL | Component | Guard | Notes |
|---|---|---|---|
| `/` | — | — | Navigate to `/dashboard` |
| `/login` | `LoginPage` | PublicRoute | |
| `/register` | `RegisterPage` | PublicRoute | |
| `/forgot-password` | `ForgotPasswordPage` | PublicRoute | |
| `/dashboard` | `DashboardPage` | ProtectedRoute | lazy |
| `/todo` | `TodoPage` | ProtectedRoute | lazy |
| `/habits` | `HabitsPage` | ProtectedRoute | lazy |
| `/goals` | `GoalsPage` | ProtectedRoute | lazy |
| `/calendar` | `CalendarPage` | ProtectedRoute | lazy |
| `/workout` | `WorkoutPage` | ProtectedRoute | lazy |
| `/nutrition` | `NutritionPage` | ProtectedRoute | lazy |
| `/prayer` | `PrayerPage` | ProtectedRoute | lazy |
| `/study` | `StudyPage` | ProtectedRoute | lazy |
| `/weather` | `WeatherPage` | ProtectedRoute | lazy |
| `/statistics` | `StatisticsPage` | ProtectedRoute | lazy |
| `/notifications` | `NotificationCenter` | ProtectedRoute | lazy |
| `/account` | `AccountPage` | ProtectedRoute | lazy |
| `*` | — | — | Navigate to `/dashboard` |

---

### State Management

There is no global state library (no Redux, no Zustand). State is owned at three levels:

**Level 1 — Global context (AppProviders tree):**
- `AuthContext` — current Firebase user, auth methods, loading flag
- `ThemeContext` — active palette, mode, setTheme
- `I18nContext` — current language, t(), setLanguage, isRtl

**Level 2 — Feature hooks (onSnapshot-backed):**
Each feature has a `use{Domain}` hook that:
1. Calls the repository's `subscribe()` (Firestore `onSnapshot`)
2. Holds `items`, `loading`, `error` in `useState`
3. Returns typed write helpers (`add`, `update`, `remove`, `toggle`, etc.)
4. Runs cleanup in `useEffect` return to unsubscribe on unmount

**Level 3 — Component-local state:**
UI state (modal open, filter chip, sort order, search string) lives in `useState` inside the
relevant component. It is never lifted above the feature boundary.

**No `window.currentData`.** The `RepoAggregatorSync` pattern (mirroring all collections onto a
global blob) is replaced by composing multiple feature hooks on the Dashboard page directly.

---

### Data Flow

```
User action
  └─> React component (event handler)
        └─> use{Domain} hook (write helper)
              └─> Repository.create / update / delete (Firestore SDK)
                    └─> Firestore (cloud)
                          └─> onSnapshot callback
                                └─> useState setter
                                      └─> Re-render
```

For reads the flow is identical but initiated by `onSnapshot` arriving from Firestore rather than
a user action. The hook is the single gate; components never call repositories directly.

**Optimistic updates** short-circuit the round-trip: the hook applies the change locally before
awaiting Firestore, then rolls back on error using `useOptimisticUpdate.ts`.

---

### Repository Pattern

All repositories implement `IRepository<T>`:

```typescript
interface IRepository<T extends FirestoreDocument> {
  getAll(options?: QueryOptions): Promise<T[]>
  getById(id: string): Promise<T | null>
  create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'ownerId'>, id?: string): Promise<T>
  update(id: string, patch: Partial<T>): Promise<void>
  delete(id: string): Promise<void>
  subscribe(
    callback: (items: T[]) => void,
    onError?: (e: Error) => void,
    options?: QueryOptions
  ): Unsubscribe
  batchUpdate(ops: Array<{ id: string; patch: Partial<T> }>): Promise<void>
  transaction(id: string, updater: (current: T) => Partial<T>): Promise<void>
  optimisticUpdate(id: string, patch: Partial<T>, handlers: OptimisticHandlers<T>): Promise<void>
}
```

`BaseRepository<T>` provides the concrete implementation. All documents receive
`ownerId: uid`, `createdAt: serverTimestamp()`, `updatedAt: serverTimestamp()` automatically.
The dedup guard from the legacy codebase (serialize + compare to prevent double-render) is
preserved in the `subscribe()` implementation.

`SingletonDocRepository<T>` overrides the collection shape to `{module}/{uid}` (no `/items`
subcollection) for ProfileRepository, SettingsRepository, SecurityRepository, and
WeatherPreferencesRepository.

---

### i18n Architecture

**Library:** `i18next` + `react-i18next`.

**Supported locales:** `en`, `ar`, `fr`, `de`.

**Translation files:** JSON files at `src/i18n/locales/{lang}.json` — migrated from the legacy
`locales/{lang}.js` flat key→value objects. Keys are English source strings (existing convention).

**RTL:** `I18nProvider` sets `document.documentElement.dir` to `'rtl'` for Arabic and `'ltr'`
for all others. All layout uses CSS logical properties — no separate RTL stylesheet needed.

**Persistence:** Language preference stored in `localStorage` under `mylife.lang` (existing key,
preserved for continuity with legacy settings).

**Typed keys:** `src/i18n/types.ts` exports a `TFunction` typed against the English locale shape
so missing translation calls are a compile-time error.

**No XSS surface:** The legacy `data-i18n-html` innerHTML injection is removed. All translation
values are text-only. React's JSX escaping handles the rest.

---

### Theme Architecture

**8 palettes:** `default` (deep space), `light`, `earth`, `mars`, `saturn`, `neptune`, `nebula`,
`galaxy` — defined as CSS custom property sets in `styles/tokens.css` and `styles/variables.css`
and applied via `data-theme` attribute on `document.documentElement`.

**Mode:** `light | dark | system`. `ThemeProvider` listens to `prefers-color-scheme` when mode is
`system`. Mode and palette are persisted to `localStorage` under `mylife.theme` and
`mylife.palette` (existing keys preserved).

**User preferences:** font size, border radius, compact mode, and animation toggle are stored in
`settings/{uid}` via `SettingsRepository` and applied as CSS custom properties on mount.

**Header theme selector** exposes all 8 palettes plus the 3 mode options. The existing
3-option selector in `Header.tsx` is replaced.

---

### Performance Architecture

**Code splitting:** Every route component is `React.lazy(() => import('./features/{feature}/...'))`.
Vite's manual chunk config places `firebase/app`, `firebase/auth`, and `firebase/firestore` in a
single `firebase` chunk that is loaded once and cached.

**Memoization:** Feature list components (`TodoList`, `HabitCard`, etc.) are wrapped in
`React.memo`. Derived values (totals, filter results) use `useMemo` with the items array as
dependency.

**Image lazy loading:** `useIntersectionObserver.ts` drives `loading="lazy"` equivalents for
progress photos and space background images. The legacy `IntersectionObserver` from workout.js
is ported into this hook.

**Subscription cleanup:** The generic `useFirestoreSubscription.ts` hook registers the
`onSnapshot` unsubscribe function as the `useEffect` cleanup. No subscription outlives its
component.

**Timer cleanup:** Every `setInterval` / `setTimeout` (Pomodoro ticker, session clock, rest
timer, dashboard weather refresh, reminder check) is stored in a `useRef` and cleared in
`useEffect` cleanup. The timer leaks identified in `workout.js` and `weather-dashboard.js` are
eliminated by this pattern.

**Firestore persistence:** `initializeFirestore(app, { localCache: persistentLocalCache() })` —
replaces the deprecated `enableIndexedDbPersistence()` call in the current `firestore.ts`.

**Render optimization:** The full-page innerHTML re-render pattern (todo.js, nutrition.js) is
replaced by React reconciliation. Each data item is a component instance; only changed items
re-render.

---

## Migration Layers in Build Order

### Layer 1 — Foundation (no feature content)
- Fix `Header.tsx`: move `import React` to line 1; remove unused `sidebarOpen` prop.
- Fix `AppShell.tsx` + `globals.css`: align class names (`app-shell-main` / `app-shell-content`).
- Fix `AppLoading.tsx`: add `.app-loading-container` CSS rule.
- Fix `services/firebase/firestore.ts`: replace `enableIndexedDbPersistence` with
  `initializeFirestore(app, { localCache: persistentLocalCache() })`.
- Add `.env.example` with all `VITE_FIREBASE_*` keys (empty values).
- Configure `vite.config.ts` with firebase manual chunk.

### Layer 2 — Auth
- Add `RegisterPage.tsx` and wire `/register` route.
- Add `ForgotPasswordPage.tsx` and wire `/forgot-password` route.
- Fix `Login.tsx`: wire "Sign up" link to `/register`; add `mousemove` handler to activate
  cursor-glow effect.
- Port `services/firebase/auth.ts`: preserve 9 error-code mappings; add `updateProfile` call
  in `registerUser`.
- Port `AuthService.ts` from legacy: OAuth provider linking, `waitUntilReady`, `getAvatar`.

### Layer 3 — Shell
- Fix `Sidebar.tsx`: replace `<a href="#...">` with `<Link to="...">` from react-router;
  implement `useLocation`-based active state; wire `onToggle` prop.
- Add `I18nProvider.tsx` (i18next init, RTL dir, language persistence).
- Add `ToastProvider.tsx` (imperative toast API used by all write helpers).
- Expand `ThemeProvider.tsx` to support all 8 palettes.

### Layer 4 — Shared UI library
- Build all `components/ui/` primitives: Button, Card, Input, Select, Modal, Badge, Spinner,
  Skeleton, EmptyState, ProgressRing, UndoBar.
- Port `core/UndoManager.ts`, `core/ErrorMapper.ts`.
- Port `useDebounce.ts`, `useLocalStorage.ts`, `useOptimisticUpdate.ts`,
  `useFirestoreSubscription.ts`.

### Layer 5 — Repository layer
- Port all 39 repository classes from `repositories/` to TypeScript.
- Port `BaseRepository.ts` and `SingletonDocRepository.ts` with full typed generics.
- Port `services/UserService.ts`, `services/DashboardLayoutService.ts`.

### Layer 6 — Gamification core
- Port `core/GamificationEngine.ts` to TypeScript.
- Port `components/gamification/` (XpPopup, LevelUpBanner, AchievementCard) from
  `js/gamification-ui.js`; convert CustomEvent listeners to a React context + `useEffect`.
- Port `hooks/useGamification.ts`.

### Layer 7 — Notifications
- Port `NotificationRepository.ts`.
- Build `features/notifications/` with `useNotifications.ts`.
- Integrate NotificationCenter bell into `Header.tsx`.

### Layer 8 — Todo (reference feature — fully migrated in legacy)
- Port `js/todo.js` logic into `features/todo/hooks/useTodos.ts`.
- Fix: remove `reminderFired` double-fire risk (use server-side flag or idempotent check).
- Fix: replace 20-second polling interval with Firestore `onSnapshot` for reminders.

### Layer 9 — Habits
- Port `js/habits.js` into `features/habits/`.
- Fix: load categories from the hook's items array, not `window.currentData.habits`.
- Add loading skeleton (present in todo, missing in legacy habits).
- Fix heatmap off-by-one: use ISO weekday (1–7) not `getDay()` (0–6).

### Layer 10 — Goals
- Port `js/goals.js` into `features/goals/`.
- Remove `window.__goalsRepo` global; expose write helpers from `useGoals` hook only.

### Layer 11 — Calendar
- Port `js/calendar.js` into `features/calendar/`.
- Fix `reconcileSourceLinkedEvents`: batch all writes from one snapshot into a single
  `batchUpdate` call instead of one write per field.
- Fix workout bidirectional sync: add `WorkoutRepository` to cross-repo write-back.

### Layer 12 — Workout
- Port `js/workout.js` into `features/workout/`.
- Fix: migrate workout PLAN data from localStorage/appData to Firestore `workoutPlans/{uid}`
  (new collection) — resolves multi-device split-brain.
- Fix: replace `window.confirm()` with a modal component.
- Fix: clear `sessionClockInterval` and `sessionTimers` in hook cleanup.

### Layer 13 — Nutrition
- Port `js/nutrition.js` into `features/nutrition/`.
- Fix malformed `data-nut-shop-*` attribute selectors in shopping list HTML generation.
- Remove full-page re-render pattern; each subscription updates only its slice of state.

### Layer 14 — Prayer
- Port `js/prayer.js` into `features/prayer/`.
- Implement `PrayerTimesService.ts` calling AlAdhan API for calculated prayer times.
- Guard all `readingSettings` accesses with optional chaining to prevent null-deref on cold load.
- Feature-flag Hadith tab (`features.hadith = false`) rather than rendering dead UI.

### Layer 15 — Study
- Port `js/study.js` into `features/study/`.
- Fix: clear Pomodoro `setInterval` in hook cleanup.
- Fix: write computed achievements to `achievements/{uid}/items` instead of recalculating
  ephemerally on every render.

### Layer 16 — Weather + Dashboard widgets
- Port all `js/services/Weather*.ts` files.
- Port `js/weather-dashboard.js`; replace 30-minute `window` interval with a `useEffect`
  cleanup-cleared interval inside `useWeather`.
- Fix all dashboard widget shape mismatches: prayer (array not object), workout (log entry
  shape), water (`glasses` not `cups`/`amount`), statistics (guard against undefined).

### Layer 17 — Account + Settings
- Port `js/pages/account.js` into `features/account/`.
- Port `ConnectedAccounts` OAuth panel.
- Wire `SettingsRepository` for all preference writes (font size, radius, compact, goals).

---

## What to Reuse from MyLife-React (exact files)

These files exist in `MyLife-React/src/` and are correct or need only minor edits:

| File | Status | Action |
|---|---|---|
| `main.tsx` | Keep | No changes |
| `app/router.tsx` | Edit | Add all 17 routes; keep lazy + guard pattern |
| `app/providers/AppProviders.tsx` | Edit | Add I18nProvider, ToastProvider |
| `app/providers/AuthProvider.tsx` | Keep | Correct as-is |
| `app/providers/ThemeProvider.tsx` | Edit | Expand to 8 palettes |
| `app/pages/Login.tsx` | Edit | Fix cursor-glow JS; wire sign-up link |
| `app/pages/Dashboard.tsx` | Replace | Phase 2 placeholder → real widget grid |
| `components/feedback/ErrorBoundary.tsx` | Keep | Correct as-is |
| `components/feedback/RouteLoading.tsx` | Keep | Correct as-is |
| `components/feedback/AppLoading.tsx` | Edit | Add `.app-loading-container` CSS |
| `services/firebase/firebase.ts` | Keep | Correct as-is |
| `services/firebase/auth.ts` | Keep | Correct as-is |
| `services/firebase/firestore.ts` | Edit | Replace deprecated persistence API |
| `styles/tokens.css` | Keep | Well-structured; no changes |
| `styles/globals.css` | Edit | Align class names for AppShell layout |
| `styles/auth.css` | Keep | No changes |
| `types/auth.ts` | Keep | No changes |
| `types/common.ts` | Keep | No changes |
| `types/firebase.ts` | Edit | Remove redundant property re-declarations |
| `playwright.config.ts` | Keep | No changes |
| `vite.config.ts` | Edit | Add firebase manual chunk |

---

## What to Port from MyLife Legacy (exact JS logic to TypeScript)

These files contain production-proven business logic. Port the logic, not the global-script
patterns or innerHTML rendering.

| Legacy file | Port target | Key logic to preserve | Bugs to fix |
|---|---|---|---|
| `repositories/BaseRepository.js` | `src/repositories/BaseRepository.ts` | Full CRUD, subscribe, batchUpdate, transaction, optimisticUpdate, dedup guard | None — port directly |
| `repositories/SingletonDocRepository.js` | `src/repositories/SingletonDocRepository.ts` | Single-doc per user pattern | None |
| All 37 other `repositories/*.js` | Corresponding `src/repositories/*.ts` | Collection path strings, field names | None — thin wrappers |
| `services/AuthService.js` | `src/services/AuthService.ts` | OAuth provider linking, waitUntilReady, getAvatar | None |
| `services/UserService.js` | `src/services/UserService.ts` | createProfile data shape, subscribeProfile | None |
| `services/DashboardLayoutService.js` | `src/services/DashboardLayoutService.ts` | Firestore path, layout shape, DEFAULT_LAYOUT | None |
| `services/RepoAggregatorSync.js` | Replaced by composing hooks on Dashboard page | Lazy subscription key list | Pattern is replaced |
| `services/images/LocalImageService.js` | `src/services/images/LocalImageService.ts` | base64 localStorage key format | None |
| `services/images/ImageService.js` | `src/services/ImageService.ts` | Facade pattern | None |
| `core/GamificationEngine.js` | `src/core/GamificationEngine.ts` | XP_AWARDS table, level curve, ACHIEVEMENT_DEFS, updateStreak | None — port directly |
| `core/WidgetRegistry.js` | `src/core/WidgetRegistry.ts` | Registry API | None |
| `core/ErrorMapper.js` | `src/core/ErrorMapper.ts` | tryFirebase wrapper | None |
| `core/UndoManager.js` | `src/core/UndoManager.ts` | Stack logic | None |
| `js/services/DataService.js` | `src/services/quran/DataService.ts` | Retry, timeout, localStorage cache, version key | None |
| `js/services/PathResolver.js` | `src/services/quran/PathResolver.ts` | Data file URL map | Replace `document.currentScript` with `import.meta.url` |
| `js/services/QuranService.js` | `src/services/quran/QuranService.ts` | Chapter list, chapter fetch, validation | None |
| `js/services/AzkarService.js` | `src/services/quran/AzkarService.ts` | Category listing, search | None |
| `js/services/HadithService.js` | `src/services/quran/HadithService.ts` | Stub: isAvailable=false | Keep as-is behind feature flag |
| `js/services/NetworkUtils.js` | `src/services/weather/NetworkUtils.ts` | fetchWithRetry, backoff | None |
| `js/services/WeatherService.js` | `src/services/weather/WeatherService.ts` | open-meteo params, dedup | None |
| `js/services/WeatherCacheService.js` | `src/services/weather/WeatherCacheService.ts` | 30-min cache, user-keyed storage | None |
| `js/services/WeatherLocationService.js` | `src/services/weather/WeatherLocationService.ts` | Saved→geo→reverse fallback chain | None |
| `js/services/WeatherGeocodingService.js` | `src/services/weather/WeatherGeocodingService.ts` | search + reverse endpoints | None |
| `js/services/WeatherRecommendationService.js` | `src/services/weather/WeatherRecommendationService.ts` | Rule-based recommendations | Remove `window.currentData` mutation; return waterGoal suggestion as a value |
| `js/services/WeatherUI.js` | Replaced by `features/weather/` React components | Rendering logic only — migrate section by section | Global innerHTML → JSX |
| `js/services/WeatherCharts.js` | `features/weather/WeatherCharts.tsx` | SVG chart math | None |
| `js/services/WeatherCodes.js` | `src/services/weather/WeatherCodes.ts` | WMO code map | None |
| `js/services/LegacyDataSync.js` | Deleted after Layer 17 | Not ported — replaced by per-module repositories | — |
| `js/todo.js` | `features/todo/hooks/useTodos.ts` + components | Filter logic, reminder check, drag-sort, UndoManager, subtask/attachment shape | Fix reminderFired double-fire; replace polling with onSnapshot |
| `js/habits.js` | `features/habits/hooks/useHabits.ts` + components | Heatmap cell data, streak calc, category list | Fix heatmap off-by-one; fix category source |
| `js/goals.js` | `features/goals/hooks/useGoals.ts` | Subscription, data pipe | Remove window.__goalsRepo |
| `js/calendar.js` | `features/calendar/hooks/useCalendar.ts` + views | Month/week/day math, cross-module write-back, addMonthsClamped fix | Fix reconcile batch; fix workout write-back |
| `js/workout.js` | `features/workout/hooks/useWorkout.ts` + components | Session timers, rest timer, muscle-recovery heuristic, photo lazy-load | Fix timer leak; migrate plan to Firestore; remove window.confirm |
| `js/nutrition.js` | `features/nutrition/hooks/useNutrition.ts` + components | Macro totals, weekly chart data, meal planner, shopping-list generation | Fix malformed attribute selectors; fix full-page re-render |
| `js/prayer.js` | `features/prayer/hooks/usePrayer.ts` + components | Quran reader state, Tasbeeh logic, Azkar modal, streak calc | Add AlAdhan API; guard readingSettings null-deref |
| `js/study.js` | `features/study/hooks/useStudy.ts` + components | Pomodoro phases, focus score heuristic, achievement badge evaluation, export | Fix timer leak; persist achievements to Firestore |
| `js/i18n.js` | `src/i18n/index.ts` (i18next wrapper) | Language list, locale key convention, formatDateLocalized locale map | Remove data-i18n-html innerHTML; use i18next typed t() |
| `locales/*.js` | `src/i18n/locales/*.json` | All translation strings | Convert from window.MOMENTUM_LOCALES assignment to plain JSON |
| `js/gamification-ui.js` | `src/components/gamification/` | Animation timings (4200ms, 5000ms), confetti span count (24) | Convert CustomEvent pattern to React context events |
| `js/notification-center.js` | `features/notifications/` | Tab logic, category filter, undo-on-delete, deepLink navigation | Remove window.refreshChrome monkey-patch; use router navigate |
| `js/dashboard-widget-defs.js` | `features/dashboard/widgets/` | Widget render logic per domain | Fix all shape mismatches (prayer array, water glasses, workout log) |
