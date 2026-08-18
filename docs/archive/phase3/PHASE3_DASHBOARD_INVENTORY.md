# Phase 3 Dashboard Inventory

## Sources

`pages/dashboard.html`, `js/shared.js`, `js/pages/dashboard.js`, `js/pages/custom-dashboard.js`, `js/dashboard-widget-defs.js`, `services/DashboardLayoutService.js`, `services/RepoAggregatorSync.js`, repository files, `css/pages/dashboard.css`, `css/pages/dashboard-widgets.css`, `css/shared.css`, and `css/responsive.css`.

## Fixed Dashboard

| Feature | Legacy behavior and state | Dependencies | React destination |
|---|---|---|---|
| Auth gate | Redirects unauthenticated users; authenticated session supplies UID and profile | Firebase Auth | Existing `ProtectedRoute`, `AuthProvider` |
| Application shell | Sticky sidebar, topbar, user controls, navigation | shared DOM rendering, theme/language state | `AppShell`, `Sidebar`, `Header` |
| Welcome hero | Time greeting, first name, level/XP, daily quote, productivity rings | profile XP plus task/habit/goal completion | `DashboardOverview` |
| Quick actions | Links to task, habit, event, workout and water workflows | navigation | `DashboardOverview` route links |
| Today summary | Tasks, habits, goals, workout, prayer, study, calendar, water and sleep cards | feature repositories | `DashboardOverview` summary grid |
| Upcoming events | Future calendar events sorted by date | `calendar/{uid}/items` | `DashboardOverview` |
| Recent activity | Latest task/habit/goal/workout activity | feature repositories | `DashboardOverview` |
| Export | Downloads user/dashboard state as JSON | in-memory state | `Dashboard` export action |

## Custom Dashboard Foundation

| Feature | DOM/data contract | State and behavior | React destination |
|---|---|---|---|
| Widget toolbar | `data-cdash-*`, `.cdash-toolbar` | Add Widget and Personalize dialogs; quick links | `DashboardGrid` |
| Widget grid | `.cdash-grid`, 4/3/2/1 responsive columns | placement order and size | `DashboardGrid` + dnd-kit |
| Widget card | collapse, resize, pin, hide, drag handle | optimistic React state; 400ms debounced Firestore save | `DashboardWidget`, `useDashboardLayout` |
| Widget store | all registered hidden/uninstalled widgets | restores hidden placements or appends new placement | `AddWidgetDialog` |
| Personalization | accent, corner radius, transparency, compact mode, animations | persisted at `users/{uid}/dashboard/layout` | `PersonalizationDialog` |
| Empty dashboard | onboarding prompt when no visible widgets | opens widget store | `DashboardGrid` empty state |

## Widget Registry

| Widget ID | Data and behavior | Firestore/API | Loading/error/empty |
|---|---|---|---|
| `todo` | incomplete task list; checkbox completes task | `todos/{uid}/items` | empty task message; write errors surface through dashboard state |
| `weather` | current temperature and condition | Open-Meteo API | loading text, unavailable state, abort cleanup |
| `notifications` | latest unread/unarchived messages | `notifications/{uid}/items` | empty state |
| `quick-notes` | debounced synced textarea | `users/{uid}.quickNotes` | profile loading inherited from dashboard |
| `quote` | deterministic wellness copy | none | always available |
| `pomodoro` | 25-minute start/pause/reset countdown | client state | interval cleanup on unmount |
| `habits` | title and today completion | `habits/{uid}/items` | empty state |
| `goals` | title and progress | `goals/{uid}/items` | empty state |
| `workout` | recent session title/type and status | `workouts/{uid}/items` | corrected title field fallback |
| `nutrition` | today's calories and meal count | `nutrition/{uid}/items` | empty state |
| `prayer` | completed prayer documents today | `prayers/{uid}/items` | corrected array/document status shape |
| `study` | total duration/minutes | `study/{uid}/items` | empty state |
| `calendar` | today's events | `calendar/{uid}/items` | empty state |
| `statistics` | completed tasks and tracked habits | shared collections | guarded empty arrays |
| `achievements` | unlocked achievement count | `achievements/{uid}/items` | empty state |
| `water` | today's glasses | `water/{uid}/items` | corrected `glasses` field |
| `sleep` | recent duration records | `sleep/{uid}/items` | empty state |

## Cross-Cutting Behavior

- Themes use shared semantic CSS variables; no dashboard-specific theme fork.
- RTL uses document direction and logical CSS; active navigation inset flips.
- Responsive breakpoints preserve legacy grid behavior at 1280, 1024, 768, and mobile shell behavior at 860/520.
- Firestore listeners are centralized in `useDashboardData`; widgets do not create duplicate listeners.
- Layout subscription and writes use the unchanged `users/{uid}/dashboard/layout` schema.
- No legacy `localStorage` database is copied. Language/theme preferences remain local preferences only.
