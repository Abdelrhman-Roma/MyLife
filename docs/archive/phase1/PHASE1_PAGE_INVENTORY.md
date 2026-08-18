# PHASE 1 — PAGE INVENTORY

## Overview

The legacy MyLife application is a multi-page static web app with 13 HTML files. Every inner page loads `shared.js` (~105 KB) synchronously, which provides the auth gate, sidebar/topbar shell, `window.currentData` global, i18n, theming, and cross-domain event wiring. Each page then loads 1–3 domain-specific JS files.

**Total pages:** 13 legacy HTML pages → 15 React SPA routes (adds `/register` and `/forgot-password`)

**Universal dependencies (loaded on every inner page):**
- `css/variables.css` — design tokens + palette definitions
- `css/shared.css` — app shell layout (sidebar, topbar, cards, typography utilities)
- `js/firebase-config.js` — Firebase app + Firestore init
- `js/shared.js` — auth gate, sidebar, topbar, i18n, `window.currentData`, LegacyDataSync bootstrap

---

## Page Index

| # | Legacy path | React route | Page title | Domain | Auth gate |
|---|---|---|---|---|---|
| 1 | `index.html` | `/login` | Sign In — MyLife | AUTH | Redirect to `/dashboard` if authenticated |
| 2 | `pages/dashboard.html` | `/dashboard` | Dashboard — MyLife | DASHBOARD | Redirect to `/login` if unauthenticated |
| 3 | `pages/todo.html` | `/todo` | Tasks — MyLife | TODO | Yes |
| 4 | `pages/habits.html` | `/habits` | Habits — MyLife | HABITS | Yes |
| 5 | `pages/goals.html` | `/goals` | Goals — MyLife | GOALS | Yes |
| 6 | `pages/calendar.html` | `/calendar` | Calendar — MyLife | CALENDAR | Yes |
| 7 | `pages/workout.html` | `/workout` | Workout — MyLife | WORKOUT | Yes |
| 8 | `pages/nutrition.html` | `/nutrition` | Nutrition — MyLife | NUTRITION | Yes |
| 9 | `pages/prayer.html` | `/prayer` | Prayer & Quran — MyLife | PRAYER | Yes |
| 10 | `pages/study.html` | `/study` | Study — MyLife | STUDY | Yes |
| 11 | `pages/weather.html` | `/weather` | Weather — MyLife | WEATHER | Yes |
| 12 | `pages/statistics.html` | `/statistics` | Statistics — MyLife | STATISTICS | Yes |
| 13 | `pages/account.html` | `/account` | Account — MyLife | ACCOUNT | Yes |
| 14 | *(none)* | `/register` | Create Account | AUTH | Redirect to `/dashboard` if authenticated |
| 15 | *(none)* | `/forgot-password` | Reset Password | AUTH | Redirect to `/dashboard` if authenticated |

---

## Detailed Page Profiles

---

### Page 1 — Login / Auth (`index.html` → `/login`)

**Body `data-page`:** `login`  
**Accent color:** none (auth pages have no domain accent — aurora background only)  
**Sidebar:** not shown (auth pages render no shell)  
**Topbar:** not shown

**JS files loaded:**
- `js/firebase-config.js`
- `js/shared.js` (auth gate only — shell not rendered on auth pages)
- `js/pages/auth.js` (login/register form logic)

**CSS files loaded:**
- `css/variables.css`
- `css/auth.css` (two-panel layout, aurora blobs, form styles)

**Page sections:**

| Section | Description |
|---|---|
| Left visual panel | Brand logo, app name, feature bullet list ("Track your habits", "Plan your meals", etc.). Hidden on mobile. |
| Auth card | Login form: email + password inputs, "Remember me" checkbox, "Forgot password?" link, submit button, OAuth buttons (Google, GitHub), "Sign up" link |
| Aurora background | 3 animated SVG blobs (driftA/B/C keyframes) behind the auth card |

**Data dependencies:** `mylife.session` (localStorage), `mylife.users` (legacy local accounts array), Firebase Auth, `users/{uid}` (Firestore profile on login)

**Known issues:** No separate register HTML page — the "Sign up" link in legacy opens the same `index.html` with a JS toggle to show the register form. React target gives it a distinct route `/register`.

**Mobile behavior:** Left visual panel hidden; auth card fills viewport width. OAuth buttons stack vertically.

**Data dependencies:** `mylife.session` (localStorage), `mylife.users` (legacy local accounts array), Firebase Auth, `users/{uid}` (Firestore profile on login)

**Known issues:** No separate register HTML page — the "Sign up" link in legacy opens the same `index.html` with a JS toggle to show the register form. React target gives it a distinct route `/register`.

**Mobile behavior:** Left visual panel hidden; auth card fills viewport width. OAuth buttons stack vertically.

**React target changes:** Split into `LoginPage`, `RegisterPage`, `ForgotPasswordPage` — three distinct routes and components instead of one page with JS-toggled panels.

---

### Page 3 — Tasks (`pages/todo.html` → `/todo`)

**Body `data-page`:** `todo`
**Accent color:** `--blue` (`#22d3ee`)
**Sidebar item:** Tasks

**JS files loaded:** `firebase-config.js`, `shared.js`, `js/todo.js`, `js/gamification-ui.js`

**CSS files loaded:** `css/variables.css`, `css/shared.css`, `css/todo.css`

**Page sections:**

| Section | Description |
|---|---|
| Page header | Title "Tasks", quick-add input (title + optional due date), submit button |
| Filter/sort bar | Filter chips (All/Today/Upcoming/Overdue/Completed), tag filter dropdown, sort dropdown (Smart/Due/Priority/A-Z/Custom), search input |
| Task list | Scrollable list of task cards; in Custom sort mode, drag handles appear |
| Empty state | Icon + "No tasks yet" message when filtered list is empty |

**Data subscriptions:** `todos/{uid}/items` (realtime `onSnapshot`)

**Mobile behavior:** Filter chips wrap to 2 rows; sort/search stacks above the list. Add form remains inline at top. No drag-to-reorder on mobile (touch conflict).

**React target notes:** `TodoPage.tsx` is the target component. Reminder polling interval must be replaced with Firestore `onSnapshot`-driven approach.

---

### Page 4 — Habits (`pages/habits.html` → `/habits`)

**Body `data-page`:** `habits`
**Accent color:** `--green` (emerald)
**Sidebar item:** Habits

**JS files loaded:** `firebase-config.js`, `shared.js`, `js/habits.js`, `js/gamification-ui.js`

**CSS files loaded:** `css/variables.css`, `css/shared.css`, `css/habits.css`

**Page sections:**

| Section | Description |
|---|---|
| Page header | Title "Habits", stats strip (total active, done today, best streak) |
| Filter bar | Filter chips (All / Due Today / Done Today), category filter dropdown |
| Habit list | Habit cards with today checkbox, category/difficulty badges, weekly bar, streak, 30-day heatmap |
| Add habit inline form | Name, category, difficulty, weekly target inputs at bottom of list |
| Empty state | "No habits yet" when list is empty |

**Data subscriptions:** `habits/{uid}/items` (via legacy appData blob)

**Known issues:** No loading skeleton shown during initial data load — empty state appears immediately and is indistinguishable from "no habits". Category list in add form reads stale data from `window.currentData` rather than the live hook.

---

### Page 5 — Goals (`pages/goals.html` → `/goals`)

**Body `data-page`:** `goals`
**Accent color:** `--purple`
**Sidebar item:** Goals

**JS files loaded:** `firebase-config.js`, `shared.js`, `js/goals.js`, `js/gamification-ui.js`

**CSS files loaded:** `css/variables.css`, `css/shared.css`, `css/goals.css`

**Page sections:**

| Section | Description |
|---|---|
| Stats grid | 4 cards: Daily / Weekly / Monthly / Yearly goal counts |
| Add goal form | Title, period, target inputs — inline on right panel (not a modal) |
| Goals list | Collapsible groups: Daily / Weekly / Monthly / Yearly; cards with checkbox, title, period badge, progress bar |

**Data subscriptions:** `goals/{uid}/items` (via legacy appData blob)

**Known issues:** No edit modal for goals — once created, title/target cannot be changed. Progress field can only be updated by re-creating the goal. `window.__goalsRepo` global exposes the repository (known anti-pattern).

---

### Page 6 — Calendar (`pages/calendar.html` → `/calendar`)

**Body `data-page`:** `calendar`
**Accent color:** `--cyan`
**Sidebar item:** Calendar

**JS files loaded:** `firebase-config.js`, `shared.js`, `js/calendar.js`

**CSS files loaded:** `css/variables.css`, `css/shared.css`, `css/calendar.css`

**Page sections:**

| Section | Description |
|---|---|
| View switcher | 3 tabs: Month / Week / Day |
| Category filter chips | 12 category toggle chips |
| Search bar | Debounced event search above the calendar grid |
| Calendar grid | Month: 7×6 day cell grid with event pills. Week: 7-column time grid. Day: 24-slot time column |
| Schedule panel | Collapsible panel below month view: today's events listed chronologically |
| Event modal | Add/edit event with all fields (title, date, time, category, repeat, color, icon, notes, reminder) |

**Data subscriptions:** `calendar/{uid}/items` + cross-repo subscriptions for linked events

---

### Page 7 — Workout (`pages/workout.html` → `/workout`)

**Body `data-page`:** `workout`
**Accent color:** `--orange`
**Sidebar item:** Workout

**JS files loaded:** `firebase-config.js`, `shared.js`, `js/workout.js`, `js/gamification-ui.js`

**CSS files loaded:** `css/variables.css`, `css/shared.css`, `css/workout.css`

**Page sections:**

| Section | Description |
|---|---|
| Weekly schedule grid | 7 day-column grid with workout type, status badge, progress bar per day |
| Session panel | Slides in below grid: exercises list, set/rep logging, rest timer, session clock, complete/skip buttons |
| Templates modal | 4 built-in templates to apply to the plan |
| Muscle recovery overlay | Colored overlay on grid cells based on recovery state |
| Body measurements form | Weight + waist input, last 10 entries list |
| Progress photo gallery | Lazy-loaded photo grid, upload button, full-size modal |

**Data subscriptions:** Workout plan from legacy `appData` (localStorage only); session logs from `workouts/{uid}/items`; body measurements from `bodyMeasurements/{uid}/items`; progress photos from `progressPhotos/{uid}/items`

**Known critical issues:** Timer leak (session clock + rest timers not cleared on navigation). Plan is localStorage-only (multi-device split-brain).

---

### Page 8 — Nutrition (`pages/nutrition.html` → `/nutrition`)

**Body `data-page`:** `nutrition`
**Accent color:** `--yellow`
**Sidebar item:** Nutrition

**JS files loaded:** `firebase-config.js`, `shared.js`, `js/nutrition.js`

**CSS files loaded:** `css/variables.css`, `css/shared.css`, `css/nutrition.css`

**Page sections:**

| Section | Description |
|---|---|
| Macro rings | 4 donut rings: Calories / Protein / Carbs / Fat for today |
| Date navigator | Prev/next day arrows + "Today" button |
| Meal list | Cards grouped by Breakfast / Lunch / Dinner / Snack |
| Water tracker | Glass icon row with +/- buttons |
| Sleep tracker | Hours + quality form + 7-day bar chart |
| Meal planner | Weekly 7-column grid with meal slots |
| Shopping list | Auto-generated + manual items with checkboxes |
| Nutrition charts | Weekly calorie bar + macro area chart |

**Data subscriptions:** `meals/{uid}/items`, `water/{uid}/items`, `sleep/{uid}/items` (all via legacy appData); meal planner from legacy appData blob

**Known critical issues:** Shopping list auto-generate button broken (malformed CSS selector). Meal planner is localStorage-only.

---

### Page 9 — Prayer & Quran (`pages/prayer.html` → `/prayer`)

**Body `data-page`:** `prayer`
**Accent color:** `--emerald` (deep green)
**Sidebar item:** Prayer

**JS files loaded:** `firebase-config.js`, `shared.js`, `js/prayer.js`, `js/services/DataService.js`, `js/services/PathResolver.js`, `js/services/QuranService.js`, `js/services/AzkarService.js`, `js/services/HadithService.js`

**CSS files loaded:** `css/variables.css`, `css/shared.css`, `css/prayer.css`

**Page sections:**

| Section | Description |
|---|---|
| Page header | "Prayer & Quran" title, today's Gregorian + Hijri date |
| Daily prayer cards | 5 cards (Fajr–Isha): hardcoded times, done checkbox, streak badge |
| Daily prayer completion bar | % of today's prayers completed (0–5 done) |
| Quran reader tab | Chapter list → chapter detail with verse display, font controls, bookmarks |
| Tasbeeh counter tab | Large counter display, preset dhikr buttons, save session |
| Azkar tab | Category tabs (Morning/Evening/Sleep/etc.) with items and tally |
| Hadith tab | Always shows "No hadith available" (stub service) |

**Data subscriptions:** `prayers/{uid}/items`, `quranProgress/{uid}/items`, `quranBookmarks/{uid}/items`, `quranFavorites/{uid}/items`, `quranLog/{uid}/items`, `tasbeeh/{uid}/items` (all via legacy appData)

**Known critical issues:** Prayer times are hardcoded strings — incorrect for any location/time of year. Hadith tab is dead UI.

---

### Page 10 — Study (`pages/study.html` → `/study`)

**Body `data-page`:** `study`
**Accent color:** `--indigo`
**Sidebar item:** Study

**JS files loaded:** `firebase-config.js`, `shared.js`, `js/study.js`, `js/gamification-ui.js`

**CSS files loaded:** `css/variables.css`, `css/shared.css`, `css/study.css`

**Page sections:**

| Section | Description |
|---|---|
| Tab bar | 6 tabs: Sessions / Subjects / Assignments / Exams / Notes / Statistics |
| Pomodoro timer | Circular countdown, phase label, Start/Pause/Reset, session counter |
| Focus mode overlay | Full-screen mode with Pomodoro + ambient sound player |
| Sessions tab | Grouped list of study sessions with stats header |
| Subjects tab | Subject cards grid with progress bars |
| Assignments tab | Filtered list with status chips |
| Exams tab | Color-coded table of past/upcoming exams |
| Notes tab | Searchable note cards per subject |
| Statistics tab | Hours-by-subject chart + daily chart + achievements |

**Data subscriptions:** `study/{uid}/items`, `subjects/{uid}/items`, `assignments/{uid}/items`, `exams/{uid}/items`, `studyNotes/{uid}/items`, `achievements/{uid}/items` (all via legacy appData)

**Known critical issues:** Pomodoro timer interval not cleared on page navigation → timer leak.

---

### Page 11 — Weather (`pages/weather.html` → `/weather`)

**Body `data-page`:** `weather`
**Accent color:** `--sky` (light blue)
**Sidebar item:** Weather

**JS files loaded:** `firebase-config.js`, `shared.js`, `js/services/WeatherService.js`, `js/services/WeatherCacheService.js`, `js/services/WeatherLocationService.js`, `js/services/WeatherGeocodingService.js`, `js/services/WeatherUI.js`, `js/services/WeatherCodes.js`, `js/services/NetworkUtils.js`, `js/services/WeatherCharts.js`, `js/services/WeatherRecommendationService.js`

**CSS files loaded:** `css/variables.css`, `css/shared.css`, `css/weather.css`

**Page sections:**

| Section | Description |
|---|---|
| Current conditions hero | Large temp, condition icon + label, feels-like, location, refresh + search buttons |
| Hourly forecast strip | 24-hour horizontal scroll |
| 7-day daily forecast | 7 row cards |
| Weather detail cards | 6 metric cards (humidity, wind, UV, pressure, visibility, dew point) |
| Temperature/precipitation chart | Dual-axis SVG chart with 24h/7-day toggle |
| Activity recommendations | 3–5 rule-based cards |
| Unit toggle | °C/°F, km/h/mph |
| Location search | Autocomplete input with geocoding |

**Data subscriptions:** `weatherPreferences/{uid}` (Firestore for saved location); Open-Meteo API; localStorage cache `mylife.weather.{email}`

**Known issues:** 30-minute refresh `setInterval` in `weather-dashboard.js` not cleared on navigation → timer leak. `WeatherRecommendationService` mutates `window.currentData` as a side effect.

---

### Page 12 — Statistics (`pages/statistics.html` → `/statistics`)

**Body `data-page`:** `statistics`
**Accent color:** `--violet`
**Sidebar item:** Statistics

**JS files loaded:** `firebase-config.js`, `shared.js`, `js/pages/statistics.js`

**CSS files loaded:** `css/variables.css`, `css/shared.css`, `css/statistics.css`

**Page sections:**

| Section | Description |
|---|---|
| Overview hero | 4 stat cards: XP, Level, Total Actions, Current Streak |
| Level progress bar | XP progress within current level |
| Per-domain chart | Horizontal bar chart: completion rate per domain this week |
| Activity heatmap | Year-view GitHub-style heatmap (52×7 grid) |
| Streak history chart | 30-day line chart of streak length |
| Domain breakdown table | Domain, total completed, this-week, longest streak, current streak, last active |
| Export button | JSON export of all statistics data |

**Data subscriptions:** Reads from all domain collections via `window.currentData` aggregator

**Known issues:** All computed values recalculated on every snapshot — no memoization. Dashboard shape-mismatch bugs affect statistics calculations as well (prayer/workout/water fields).

---

### Page 13 — Account & Settings (`pages/account.html` → `/account`)

**Body `data-page`:** `account`
**Accent color:** `--pink`
**Sidebar item:** Account (last in nav)

**JS files loaded:** `firebase-config.js`, `shared.js`, `js/pages/account.js`, `js/services/AuthService.js`, `js/services/UserService.js`

**CSS files loaded:** `css/variables.css`, `css/shared.css`, `css/account.css`

**Page sections:**

| Section | Description |
|---|---|
| Profile section | Avatar, display name, email — all editable |
| Security section | Change email form, change password form, security log |
| Appearance section | Palette swatches (8), font size chips, radius chips, compact toggle, animation toggle |
| Language section | 4-language dropdown |
| Connected accounts | Google + GitHub link/unlink |
| Goal settings | Calorie target, water goal, sleep goal inputs |
| Notification preferences | Per-category toggles |
| Compact + animation toggles | Binary toggles |
| Workspace settings | Workspace name input |
| Data management | Export JSON button, Delete Account button |

**Data subscriptions:** `users/{uid}` (profile), `security/{uid}`, `settings/{uid}`

---

## Sidebar Navigation Structure

The sidebar (`shared.js` `renderSidebar()`) renders a fixed-position 272px panel. Navigation items in order:

| Order | Label | `href` | `data-page` match | Icon |
|---|---|---|---|---|
| 1 | Dashboard | `pages/dashboard.html` | `dashboard` | grid |
| 2 | Tasks | `pages/todo.html` | `todo` | check-square |
| 3 | Habits | `pages/habits.html` | `habits` | repeat |
| 4 | Goals | `pages/goals.html` | `goals` | target |
| 5 | Calendar | `pages/calendar.html` | `calendar` | calendar |
| 6 | Workout | `pages/workout.html` | `workout` | activity |
| 7 | Nutrition | `pages/nutrition.html` | `nutrition` | leaf |
| 8 | Prayer | `pages/prayer.html` | `prayer` | moon |
| 9 | Study | `pages/study.html` | `study` | book-open |
| 10 | Weather | `pages/weather.html` | `weather` | cloud |
| 11 | Statistics | `pages/statistics.html` | `statistics` | bar-chart |
| 12 | Account | `pages/account.html` | `account` | user |

Active state: sidebar item where `body.dataset.page === navItem.dataPage` gets `.active` class → `background: var(--accent)`.

---

## Topbar Structure

The topbar (`shared.js` `renderTopbar()`) is a sticky `position: sticky; top: 0` bar with `backdrop-filter: blur(14px)`. Contains (left to right):

1. Hamburger menu button (mobile only) — toggles sidebar visibility
2. Page title (from `document.title` minus " — MyLife" suffix)
3. Page art icon (SVG specific to `data-page`)
4. Notification bell with unread count badge
5. User avatar button → account dropdown (Profile link, Logout)
6. (On account page only) the palette/theme switcher is embedded here

---

## React Route Guards

```
PublicRoute  → shows children only if unauthenticated; redirects to /dashboard if logged in
ProtectedRoute → shows children only if authenticated; redirects to /login if not logged in;
                  shows <RouteLoading /> while AuthProvider.loading is true
```

All 12 inner pages use `ProtectedRoute`. All 3 auth pages use `PublicRoute`.

---

## Legacy Page Art System

Each inner page specifies a `data-page` attribute on `<body>`. The topbar `renderPageArt()` function reads this and renders an SVG icon + gradient background strip specific to that domain. The domain also sets the CSS accent variable:

```css
body[data-page='todo']       { --accent: var(--blue); }
body[data-page='habits']     { --accent: var(--green); }
body[data-page='goals']      { --accent: var(--purple); }
body[data-page='calendar']   { --accent: var(--cyan); }
body[data-page='workout']    { --accent: var(--orange); }
body[data-page='nutrition']  { --accent: var(--yellow); }
body[data-page='prayer']     { --accent: var(--emerald); }
body[data-page='study']      { --accent: var(--indigo); }
body[data-page='weather']    { --accent: var(--sky); }
body[data-page='statistics'] { --accent: var(--violet); }
body[data-page='account']    { --accent: var(--pink); }
body[data-page='dashboard']  { --accent: var(--blue); }
```

In the React target, this becomes `body[data-page]` applied by each page component's `useEffect` on mount + cleanup on unmount.

---

**END OF PHASE 1 PAGE INVENTORY**

---

### Page 2 — Dashboard (`pages/dashboard.html` → `/dashboard`)

**Body `data-page`:** `dashboard`  
**Accent color:** `--blue` (`#22d3ee` in deep-space palette)  
**Sidebar item:** Dashboard (first item)

**JS files loaded:**
- `js/firebase-config.js`
- `js/shared.js`
- `js/pages/dashboard.js`
- `js/services/WeatherService.js`, `WeatherCacheService.js`, `WeatherLocationService.js`, `WeatherGeocodingService.js`, `WeatherUI.js`, `WeatherCodes.js`, `NetworkUtils.js`
- `js/dashboard-widget-defs.js`
- `js/gamification-ui.js`
- `js/notification-center.js`

**CSS files loaded:**
- `css/variables.css`
- `css/shared.css`
- `css/dashboard.css`

**Page sections:**

| Section | Description |
|---|---|
| Hero stats strip | 4 radial progress rings (Tasks/Habits/Goals/Actions) + XP/Level badge center |
| Quick actions bar | 5 pill buttons: Add Task, Log Habit, Add Goal, Plan Workout, Check Weather |
| Custom widget grid | Draggable/resizable grid of 17+ widget types (DashboardLayoutService-backed) |
| Today's snapshot | 4 cards: Water, Sleep, Nutrition, Workout for today |
| Weather widget | Current conditions + 3-hour strip |
| Upcoming events | Next 5 calendar events |
| Recent activity feed | Last 10 completed actions across all domains |
| Motivation quote | Daily rotating quote (day-of-year modulo) |
