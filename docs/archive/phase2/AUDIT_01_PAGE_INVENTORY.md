# AUDIT 01 — PAGE INVENTORY
> Source of truth: original MyLife/Momentum project

## Original Pages (13 total)

| # | Route / File | Title | CSS Files | JS Module | Status in React |
|---|---|---|---|---|---|
| 1 | `index.html` | Momentum \| Life Tracker | variables, shared, auth, responsive, momentum, momentum-overrides | auth.js, auth-firebase.js, auth-oauth.js | ⚠️ Partially rebuilt |
| 2 | `pages/dashboard.html` | Momentum \| Mission Control | variables, shared, responsive, momentum, dashboard, weather, dashboard-widgets | dashboard.js, custom-dashboard.js | ❌ Placeholder only |
| 3 | `pages/todo.html` | Momentum \| Tasks | variables, shared, responsive, momentum, todo | todo.js | ❌ Missing |
| 4 | `pages/habits.html` | Momentum \| Habits | variables, shared, responsive, momentum, habits | habits.js | ❌ Missing |
| 5 | `pages/goals.html` | Momentum \| Goals | variables, shared, responsive, momentum | goals.js | ❌ Missing |
| 6 | `pages/calendar.html` | Momentum \| Calendar | variables, shared, responsive, momentum, calendar | calendar.js | ❌ Missing |
| 7 | `pages/workout.html` | Momentum \| Workout | variables, shared, responsive, momentum, workout | workout.js | ❌ Missing |
| 8 | `pages/nutrition.html` | Momentum \| Nutrition | variables, shared, responsive, momentum, nutrition | nutrition.js | ❌ Missing |
| 9 | `pages/study.html` | Momentum \| Study | variables, shared, responsive, momentum, study | study.js | ❌ Missing |
| 10 | `pages/prayer.html` | Momentum \| Prayer | variables, shared, responsive, momentum, prayer | prayer.js | ❌ Missing |
| 11 | `pages/statistics.html` | Momentum \| Statistics | variables, shared, responsive, momentum, statistics | statistics.js | ❌ Missing |
| 12 | `pages/weather.html` | Momentum \| Weather | variables, shared, responsive, momentum, weather | weather.js | ❌ Missing |
| 13 | `pages/account.html` | Momentum \| Account | variables, shared, responsive, momentum, account | account.js | ❌ Missing |

## Auth Page — Subviews (2 panels in 1 page)

| Panel | HTML id | Trigger | Description |
|---|---|---|---|
| Login | `#login-panel` | Default / `#show-register` | Email + Password + Remember me + Forgot PW + OAuth |
| Register | `#register-panel` | `#show-register` click | Name + Email + Password + Confirm + Strength meter + OAuth |

## Auth Page — Additional Elements

- `#cursor-glow` — desktop cursor spotlight (fixed overlay, decorative)
- `#auth-lang-switch` — fixed language switcher (top-right, RTL-aware)
- `#page-veil` — full-page transition veil on successful auth
- `#auth-motto` — rotating motivational string (aria-live polite)

## Dashboard Page — Sections

| Section | HTML id/class | Description |
|---|---|---|
| Sidebar | `#sidebar` (aside.sidebar) | JS-rendered navigation |
| Topbar | `#topbar` (header.topbar) | JS-rendered page header |
| Page Art | `#page-art` (section.page-art) | Hero banner with image + copy |
| Data List | `#data-list` (section.dash-page) | Domain cards grid |
| Custom Dashboard | `#custom-dashboard-root` (.cdash-root) | Drag-and-drop widget area |

## Migration Coverage Summary

- **Pages implemented in React:** 2 of 13 (15%)
- **Pages complete with visual parity:** 0 of 13 (0%)
- **Pages missing entirely:** 11 of 13 (85%)
