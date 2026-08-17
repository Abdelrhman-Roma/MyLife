# AUDIT 07 — REACT GAP ANALYSIS
> Per-component breakdown of what exists in React vs what the original requires

## AppShell

| Feature | Original | React file | Status |
|---|---|---|---|
| CSS grid 272px + 1fr | `momentum.css` | `globals.css` ✅ | ✅ |
| Sidebar collapse to 84px | `shared.css` `.sidebar.collapsed` | Not wired | ❌ |
| `body.sidebar-collapsed` class | JS toggle | No toggle handler | ❌ |
| `data-page` attribute | set by each page JS | Not set in React | ❌ |
| `--accent` per-page variable | `body[data-page='x']` rules | Not defined | ❌ |

**AppShell.tsx gaps:** No collapse logic, no `data-page` dispatch, no `--accent` injection.

## Sidebar.tsx

Current state: renders `<aside>` with `<h2>MyLife</h2>` and 5 plain `<a>` links.

| Missing feature | Original element | Priority |
|---|---|---|
| Momentum brand logo (SVG "M" mark) | `.brand .brand-logo` | HIGH |
| "Momentum" wordmark | `.brand strong` | HIGH |
| All 13 domain nav links | `.nav-item` × 13 | HIGH |
| Nav icons (colored domain emoji/SVG) | `.nav-icon` | HIGH |
| Nav labels with domain name | `.nav-label` | HIGH |
| Active state via route | `.nav-item.active` class | HIGH |
| Sidebar account section | `.sidebar-account` | MEDIUM |
| Account menu dropdown | `.account-menu` | MEDIUM |
| Collapse/expand button | `.sidebar-collapse-btn` | MEDIUM |
| Keyboard shortcuts hints | `[data-shortcut]` attr | LOW |
| Settings link at bottom | `.sidebar-footer .nav-item` | MEDIUM |

**React import bug in Header.tsx:** `import React from 'react'` is at line 70 (end of file). This will cause a hoisting issue in non-bundler contexts but Vite handles it. Still wrong practice and should be fixed.

## Header.tsx (Topbar)

Current state: renders `<header>` with hamburger button, `<h1>` text, theme `<select>`, user email, logout button.

| Missing feature | Original element | Priority |
|---|---|---|
| Topbar glassmorphism background | `.topbar` gradient + blur | HIGH |
| Eyebrow label above h1 | `.eyebrow` span | HIGH |
| Proper page title typography | `h1` with letter-spacing | HIGH |
| Topbar actions area | `.topbar-actions` | HIGH |
| Theme palette picker (8 options) | Settings link or inline picker | MEDIUM |
| Remove inline `<select>` for theme | — | HIGH |
| User avatar display | `.avatar` circle | MEDIUM |
| Notifications button | `.topbar-actions button` | LOW |
| Import React at top of file | Bug fix | HIGH |

## Login.tsx (Auth page)

Implemented in prior session. Gaps remaining:

| Missing feature | Priority |
|---|---|
| Remember me checkbox (`.check-field`) | MEDIUM |
| Forgot password link (`.link-btn`) | HIGH |
| Caps lock hint (`.capslock-hint`) | LOW |
| Form error message display | HIGH |
| Register panel (full form) | HIGH |
| Password strength meter | HIGH |
| OAuth divider | HIGH |
| Google OAuth button | HIGH |
| GitHub OAuth button | HIGH |
| Lang switcher (`div.auth-lang-switch-wrap`) | MEDIUM |
| Page veil element | LOW |
| Cursor glow element + mouse tracking JS | LOW |

## Dashboard.tsx

Current state: renders placeholder text inside AppShell.

| Missing feature | Priority |
|---|---|
| Dashboard grid layout (`.dash-grid`) | HIGH |
| Domain summary cards (`.dash-card` × 13) | HIGH |
| Progress rings per domain | HIGH |
| Page art banner (`.page-art`) | MEDIUM |
| Today's stats summary | HIGH |
| Recent activity list | MEDIUM |
| Quick-add shortcuts | LOW |

## Missing Pages (13 total, 11 missing in React)

| Page | Original HTML | React status |
|---|---|---|
| Health & Fitness | `health.html` | ❌ Not created |
| Finance | `finance.html` | ❌ Not created |
| Learning | `learning.html` | ❌ Not created |
| Projects | `projects.html` | ❌ Not created |
| Relationships | `relationships.html` | ❌ Not created |
| Travel | `travel.html` | ❌ Not created |
| Career | `career.html` | ❌ Not created |
| Mindfulness | `mindfulness.html` | ❌ Not created |
| Home | `home.html` | ❌ Not created |
| Goals | `goals.html` | ❌ Not created |
| Journal | `journal.html` | ❌ Not created |
| Settings | `settings.html` | ❌ Not created |

## Missing Shared Components (no React file exists)

| Component | Used on | Priority |
|---|---|---|
| `<Badge>` | Nav items, data cards | HIGH |
| `<Alert>` | Form feedback, inline messages | HIGH |
| `<Toast>` / `<ToastRegion>` | Actions feedback | MEDIUM |
| `<Skeleton>` | Loading state | MEDIUM |
| `<EmptyState>` | Zero-data views | MEDIUM |
| `<Modal>` | Confirmations, detail views | HIGH |
| `<ProgressRing>` | Domain progress indicators | HIGH |
| `<PageArt>` | Page hero banner | MEDIUM |
| `<FilterChips>` | Data list filters | MEDIUM |
| `<StatCard>` | Dashboard metrics | HIGH |
| `<MeterBar>` | Health/finance progress | MEDIUM |
| `<DashCard>` | Domain summary on dashboard | HIGH |

## CSS Layer Gaps

| CSS file needed | Exists? | Notes |
|---|---|---|
| `styles/tokens.css` | ✅ | Has delta issues (see audit 03) |
| `styles/globals.css` | ✅ | Mostly correct layout layer |
| `styles/auth.css` | ✅ | Partial — missing ~30% |
| `styles/components.css` | ❌ Not created | Should hold all shared components |
| `styles/pages/dashboard.css` | ❌ Not created | |
| `styles/pages/health.css` | ❌ Not created | |
| (11 more page CSS files) | ❌ Not created | |

## Routing

| Route | Original | React | Match? |
|---|---|---|---|
| `/` | `index.html` → auth | `/login` or `/` → Login | ⚠️ Path differs |
| `/dashboard` | `dashboard.html` | `/dashboard` | ✅ |
| `/health` | `pages/health.html` | ❌ Not defined | ❌ |
| (11 more) | various | ❌ Not defined | ❌ |

## Résumé

| Area | Features audited | Done | Partial | Missing |
|---|---|---|---|---|
| AppShell | 5 | 1 | 0 | 4 |
| Sidebar | 11 | 0 | 1 | 10 |
| Header | 8 | 0 | 0 | 8 |
| Login | 14 | 7 | 1 | 6 |
| Dashboard | 6 | 0 | 0 | 6 |
| Missing pages | 11 | 0 | 0 | 11 |
| Shared components | 12 | 0 | 0 | 12 |
| CSS files | 15 | 3 | 0 | 12 |
| Routes | 13 | 1 | 1 | 11 |

**Overall React completion: approximately 12% of original functionality.**
