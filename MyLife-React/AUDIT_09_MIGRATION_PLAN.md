# AUDIT 09 — MIGRATION PLAN
> Prioritized implementation roadmap with dependencies and effort estimates

## Principles

1. Fix the foundation before building on top of it — token corrections first, then layout, then components, then pages.
2. Never break existing passing tests. Each step must keep the 17 Playwright tests green.
3. Follow the original visual source of truth exactly. If in doubt, read the original CSS.
4. Implement in this project (MyLife-React) only. Never touch the original MyLife project.

---

## Phase A — Token & CSS Foundation Fixes
*Prerequisite for everything. No visible UI changes until this is done correctly.*

| Step | File | Change | Effort |
|---|---|---|---|
| A1 | `styles/tokens.css` | Fix `--blue` in `:root` default theme: `#22d3ee` (was `#78b8ff`) | XS |
| A2 | `styles/tokens.css` | Add missing `--on-nav` to all 8 themes | S |
| A3 | `styles/tokens.css` | Add missing `--danger-bg` to all 8 themes | S |
| A4 | `styles/tokens.css` | Add missing `--focus-ring` to all 8 themes | S |
| A5 | `styles/tokens.css` | Fix `--space-5` to `20px` (was `24px`) and `--space-6` to `28px` (was `32px`) | XS |
| A6 | `styles/tokens.css` | Fix `--tap` to `48px` (was `44px`) | XS |
| A7 | `styles/tokens.css` | Add `--app-gap` and `--card-pad` fluid tokens | XS |
| A8 | `styles/tokens.css` | Add `--radius-xs: 10px` | XS |
| A9 | `styles/tokens.css` | Fix motion token names: rename `--transition-fast/standard/slow` to `--dur-fast/base/slow` (keep both for compat) | S |
| A10 | `styles/tokens.css` | Fix font stack: `--font-family: 'IBM Plex Sans', system-ui, sans-serif` (remove Inter) | XS |
| A11 | `styles/tokens.css` | Fix `--font-mono: 'JetBrains Mono', monospace` | XS |
| A12 | `styles/tokens.css` | Add `--font-arabic: 'Noto Sans Arabic', sans-serif` | XS |
| A13 | `styles/tokens.css` | Add `[data-font-size='sm/md/lg/xl']` preference rules | S |
| A14 | `styles/tokens.css` | Add `[data-radius='sharp/md/round']` preference rules | S |
| A15 | `styles/tokens.css` | Add `[data-compact='on']` spacing reductions | S |
| A16 | `styles/tokens.css` | Fix Mars theme — restore `--blue: #7fb8e8` (cool steel) and `--orange: #f97316` | XS |
| A17 | `styles/tokens.css` | Fix Saturn theme — restore `--blue: #7ea6d6` and correct accent roles | XS |
| A18 | `styles/tokens.css` | Fix Solar-light surfaces to be opaque: `--surface: #ffffff`, `--surface-2: #eef4ff` | XS |
| A19 | `styles/tokens.css` | Fix `[data-theme]` attribute name to remain `[data-theme]` **or** alias `[data-palette]` — decide and document | M |
| A20 | `index.html` | Load Google Fonts: IBM Plex Sans (200-700), JetBrains Mono (400-700), Noto Sans Arabic (400-700) | XS |

**Phase A effort: ~2–3 hours**

---

## Phase B — Auth Page Completion
*Depends on Phase A. Auth is the entry point — must reach full parity first.*

| Step | Component / File | Change | Effort |
|---|---|---|---|
| B1 | `styles/auth.css` | Add cursor glow element CSS | S |
| B2 | `Login.tsx` | Add `<div className="cursor-glow">` and `mousemove` handler | S |
| B3 | `styles/auth.css` | Add remember-me `.check-field` CSS | M |
| B4 | `Login.tsx` | Add remember me checkbox with `.check-field` | S |
| B5 | `Login.tsx` | Add forgot password `.link-btn` | S |
| B6 | `styles/auth.css` | Add `.link-btn` hover underline animation | S |
| B7 | `styles/auth.css` | Add caps lock hint `.capslock-hint` | S |
| B8 | `Login.tsx` | Add caps lock detection via `keydown` | S |
| B9 | `styles/auth.css` | Add form error message `.auth-message` | S |
| B10 | `Login.tsx` | Wire error state display | S |
| B11 | `styles/auth.css` | Fix auth responsive to collapse at `1050px` (not 860px) | XS |
| B12 | `styles/auth.css` | Add 720px narrow breakpoint for auth | XS |
| B13 | `styles/auth.css` | Add OAuth divider CSS | S |
| B14 | `styles/auth.css` | Add `.auth-oauth-btn` CSS (Google + GitHub) | M |
| B15 | `Login.tsx` | Add OAuth buttons (Google + GitHub) with Firebase OAuth wiring | L |
| B16 | `styles/auth.css` | Add `.strength-meter` CSS (4-segment bar, data-score 1-4) | M |
| B17 | `Login.tsx` | Add register panel with password strength logic | L |
| B18 | `styles/auth.css` | Add page veil `.page-veil` CSS | S |
| B19 | `Login.tsx` | Add `<div className="page-veil">` and transition trigger | S |
| B20 | `styles/auth.css` | Add lang switcher `.auth-lang-switch-wrap` CSS | S |
| B21 | `Login.tsx` | Add language switcher UI (EN/AR/FR/DE buttons) | M |
| B22 | `styles/auth.css` | Add all RTL auth inversions (`[dir='rtl']` rules) | M |

**Phase B effort: ~6–8 hours**

---

## Phase C — Core Layout Components
*Depends on Phase A. Sidebar and Header need to reach parity before any domain page can look correct.*

| Step | Component / File | Change | Effort |
|---|---|---|---|
| C1 | `Sidebar.tsx` | Replace `<h2>MyLife</h2>` with proper `.brand` structure | S |
| C2 | `Sidebar.tsx` | Add all 13 domain nav items with icons and routes | M |
| C3 | `Sidebar.tsx` | Wire active state from React Router `useMatch` | S |
| C4 | `Sidebar.tsx` | Add sidebar account section with user email + avatar | M |
| C5 | `Sidebar.tsx` | Add account menu dropdown | M |
| C6 | `Sidebar.tsx` | Add collapse/expand button + collapsed CSS | M |
| C7 | `styles/globals.css` | Add sidebar collapsed styles (84px width, hidden labels) | M |
| C8 | `AppShell.tsx` | Add `data-page` dispatch on route change | S |
| C9 | `styles/tokens.css` | Add `body[data-page='*']` accent variable rules for all 13 domains | M |
| C10 | `Header.tsx` | Move `import React` to top of file (bug fix) | XS |
| C11 | `Header.tsx` | Replace `<select>` theme picker with proper 8-palette picker UI | M |
| C12 | `Header.tsx` | Add eyebrow label above page title | S |
| C13 | `Header.tsx` | Add user avatar in topbar actions | S |

**Phase C effort: ~5–7 hours**

---

## Phase D — Shared Component Library
*Depends on Phase A. These components are needed by all domain pages.*

| Step | Component | File | Effort |
|---|---|---|---|
| D1 | `Badge` | `src/components/ui/Badge.tsx` + CSS | S |
| D2 | `Alert` | `src/components/ui/Alert.tsx` + CSS | S |
| D3 | `Toast` / `ToastRegion` | `src/components/ui/Toast.tsx` + CSS | M |
| D4 | `Skeleton` | `src/components/ui/Skeleton.tsx` + CSS | S |
| D5 | `EmptyState` | `src/components/ui/EmptyState.tsx` + CSS | S |
| D6 | `Modal` | `src/components/ui/Modal.tsx` + CSS | M |
| D7 | `ProgressRing` | `src/components/ui/ProgressRing.tsx` + CSS | M |
| D8 | `MeterBar` | `src/components/ui/MeterBar.tsx` + CSS | S |
| D9 | `StatCard` | `src/components/ui/StatCard.tsx` + CSS | S |
| D10 | `DashCard` | `src/components/ui/DashCard.tsx` + CSS | M |
| D11 | `PageArt` | `src/components/ui/PageArt.tsx` + CSS | M |
| D12 | `FilterChips` | `src/components/ui/FilterChips.tsx` + CSS | S |
| D13 | `styles/components.css` | Move all shared component CSS into one file | M |

**Phase D effort: ~6–8 hours**

---

## Phase E — Dashboard Page
*Depends on Phases A, C, D.*

| Step | Change | Effort |
|---|---|---|
| E1 | Dashboard.tsx: add `.dash-grid` layout with 13 domain cards | L |
| E2 | Add today's stats summary at top | M |
| E3 | Add page art banner (`.page-art`) | S |
| E4 | Add recent activity list | M |
| E5 | `styles/pages/dashboard.css` | M |

**Phase E effort: ~4–5 hours**

---

## Phase F — Domain Pages (×11)
*Depends on Phases A, C, D, E. Each page follows the same structure.*

Each page requires: route, component, page CSS, data Firestore hook, entry form, data list, stat cards.

Recommended build order based on complexity (simplest first):
1. Mindfulness — simple journal + streak counter
2. Journal — text entries + tags
3. Goals — checklist + progress
4. Learning — study sessions + flashcards
5. Career — tasks + milestones
6. Relationships — contact log + events
7. Home — maintenance + budget
8. Travel — trip planner + map
9. Projects — kanban-style tasks
10. Finance — transactions + charts
11. Health & Fitness — workouts + metrics (most complex)

**Phase F effort: ~25–35 hours total (avg ~3h per page)**

---

## Phase G — i18n & RTL
*Can be done after Phase C. Does not block page development.*

| Step | Change | Effort |
|---|---|---|
| G1 | Create `src/i18n/` with `en.ts`, `ar.ts`, `fr.ts`, `de.ts` | M |
| G2 | Create `useTranslation` hook or use i18next | M |
| G3 | Wire lang switcher to set `document.dir` and `--font-family` | S |
| G4 | Apply translations across all components | L |
| G5 | Add remaining RTL auth CSS | S |
| G6 | Verify RTL layout at all breakpoints | M |

**Phase G effort: ~6–8 hours**

---

## Phase H — Polish & Accessibility
*Final phase before production.*

| Step | Change | Effort |
|---|---|---|
| H1 | Add `data-animations='off'` user preference toggle | S |
| H2 | Add `data-glass='on'` enhanced blur mode | S |
| H3 | Add keyboard shortcuts (`data-shortcut` on nav items) | M |
| H4 | Verify focus ring on all interactive elements | M |
| H5 | Add skip-to-content link | S |
| H6 | ARIA labels audit | M |
| H7 | Run Lighthouse accessibility audit | S |

**Phase H effort: ~3–4 hours**

---

## Total Effort Estimate

| Phase | Description | Effort |
|---|---|---|
| A | Token & CSS foundation | 2–3h |
| B | Auth completion | 6–8h |
| C | Core layout components | 5–7h |
| D | Shared component library | 6–8h |
| E | Dashboard | 4–5h |
| F | 11 domain pages | 25–35h |
| G | i18n & RTL | 6–8h |
| H | Polish & accessibility | 3–4h |
| **Total** | | **57–78h** |

## Dependency Graph

```
A (tokens) ──┬──► B (auth)
             ├──► C (layout)
             └──► D (components) ──► E (dashboard) ──► F (pages)
                                                    └──► G (i18n, parallel)
                                                    └──► H (polish, last)
```

Phase B and Phase C can be developed in parallel after Phase A completes.
Phase G can start as soon as Phase C is done (no dependency on D, E, or F).
