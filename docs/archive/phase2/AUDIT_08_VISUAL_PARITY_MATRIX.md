# AUDIT 08 — VISUAL PARITY MATRIX
> Scored comparison of every visual surface. Score: 0 = not started, 1 = scaffolded, 2 = partial, 3 = near-complete, 4 = full parity

## Scoring Criteria
- **4 (Full parity):** Pixel-accurate match to original — colors, spacing, typography, animations, states
- **3 (Near-complete):** Visually close, minor differences in exact values or one missing state
- **2 (Partial):** Structure present, significant visual differences or missing interactive states
- **1 (Scaffolded):** Component exists as placeholder but no visual styling applied
- **0 (Not started):** Component or page does not exist in React

---

## Auth / Login Page

| Surface | Score | Notes |
|---|---|---|
| Page background (aurora gradient + dot overlay) | 3/4 | Aurora blobs present; cursor glow missing |
| Auth-visual left panel | 3/4 | Layout, gradient, brand present; background image not applied |
| Aurora blobs (3 animated) | 3/4 | Blobs defined; exact timing values need verification |
| Grid overlay on visual | 2/4 | CSS class present; mix-blend-mode behavior untested |
| Noise texture overlay | 2/4 | SVG filter defined; opacity may differ |
| Brand mark (logo) | 3/4 | SVG inline gradient; original uses PNG from `/img/` |
| Auth headline typography | 3/4 | Clamp values close but not exact to original |
| Feature points list | 3/4 | Present; dot styling needs check |
| Glass card | 3/4 | Blur + shadow correct; rotating border needs verification |
| Card rotating border (`@property --angle`) | 2/4 | Defined in auth.css but `@property` browser support not tested |
| Floating label email field | 3/4 | Label animation present; exact color on focus not verified |
| Floating label password field | 3/4 | Eye toggle present; exact icon color not verified |
| Remember me checkbox | 0/4 | Not implemented |
| Forgot password link | 0/4 | Not implemented |
| Submit button (idle) | 3/4 | Gradient + shadow correct |
| Submit button (loading state) | 1/4 | Spinner exists in globals; wiring unknown |
| Submit button (success state) | 0/4 | Not implemented |
| Form error message | 0/4 | Not implemented |
| OAuth divider | 0/4 | Not implemented |
| Google OAuth button | 0/4 | Not implemented |
| GitHub OAuth button | 0/4 | Not implemented |
| Register panel | 0/4 | Not implemented |
| Password strength meter | 0/4 | Not implemented |
| Caps lock hint | 0/4 | Not implemented |
| Page veil transition | 0/4 | Not implemented |
| Language switcher | 0/4 | Not implemented |
| Cursor glow | 0/4 | Not implemented |
| Auth page responsive (≤1050px) | 1/4 | Collapses at 860px instead of 1050px |
| Auth page responsive (≤720px) | 1/4 | Wrong breakpoint |
| RTL auth inversions | 0/4 | Not implemented |

**Auth page total: 36 / 116 = 31%**

---

## App Shell

| Surface | Score | Notes |
|---|---|---|
| CSS grid layout (272px + 1fr) | 4/4 | Exact match |
| Body background (radial gradients) | 3/4 | React uses 2 gradients; original uses more layered approach |
| Dot overlay pattern | 4/4 | Exact match |
| Scrollbar styling | 4/4 | Exact match |
| Selection highlight | 4/4 | Exact match |
| App shell responsive (≤860px single col) | 3/4 | Collapses correctly; mobile drawer missing |
| Sidebar collapse (84px) | 0/4 | Not implemented |

**App shell total: 22 / 28 = 79%**

---

## Sidebar

| Surface | Score | Notes |
|---|---|---|
| Sidebar background + blur | 4/4 | Linear gradient + backdrop-filter exact |
| Brand logo SVG | 2/4 | Inline SVG differs from original PNG; shape close |
| "Momentum" wordmark | 3/4 | Correct font and size |
| Nav item default state | 4/4 | Color, spacing, radius correct |
| Nav item hover state | 4/4 | Exact match |
| Nav item active state | 4/4 | Gradient + inset border correct |
| Nav icons | 2/4 | Emoji fallback used; original uses custom SVG icons |
| Nav labels (all 13 domains) | 0/4 | Only 5 placeholder links; 8 domains missing |
| Sidebar account section | 0/4 | Not implemented |
| Account menu dropdown | 0/4 | Not implemented |
| Sidebar collapse button | 0/4 | Not implemented |
| RTL sidebar border flip | 4/4 | Correct |
| RTL nav item hover flip | 4/4 | Correct |

**Sidebar total: 31 / 52 = 60%**

---

## Header / Topbar

| Surface | Score | Notes |
|---|---|---|
| Topbar background + blur | 4/4 | Gradient + backdrop-filter exact |
| Topbar sticky position | 4/4 | Correct |
| Eyebrow label | 3/4 | CSS defined; React component doesn't render it |
| Page title h1 typography | 2/4 | CSS correct but Header.tsx renders plain text |
| Topbar actions area | 1/4 | Logout button exists; no avatar, no theme picker |
| Theme palette selector (8 palettes) | 0/4 | Only light/dark/system options |
| User avatar | 0/4 | Not implemented |

**Topbar total: 14 / 28 = 50%**

---

## Dashboard

| Surface | Score | Notes |
|---|---|---|
| Dashboard grid | 0/4 | Placeholder text only |
| Domain cards (13) | 0/4 | Not implemented |
| Progress rings | 0/4 | Not implemented |
| Page art banner | 0/4 | Not implemented |
| Stat cards | 0/4 | Not implemented |

**Dashboard total: 0 / 20 = 0%**

---

## Individual Life Domain Pages (11 missing)

All 11 missing pages score 0/4 across all surfaces.

**Domain pages total: 0 / 44 = 0%**

---

## Design Tokens (Visual Impact)

| Token area | Score | Notes |
|---|---|---|
| Default theme colors | 3/4 | Most colors close; `--blue` wrong in deep-space |
| Solar-light theme | 2/4 | Surface uses semi-transparent instead of opaque |
| Earth theme | 2/4 | Surface hue drifts toward blue instead of teal |
| Mars theme | 1/4 | Accent roles swapped |
| Saturn theme | 1/4 | Accent roles swapped |
| Neptune theme | 3/4 | Close to original |
| Nebula theme | 2/4 | blue/purple swapped |
| Galaxy theme | 3/4 | Close to original |
| Motion timings | 2/4 | Wrong token names + slightly wrong values |
| Font families | 1/4 | Inter before IBM Plex Sans, wrong mono font |
| User preference attrs | 1/4 | Missing `data-font-size`, `data-radius`, `data-compact`, `data-glass` |

**Design tokens total: 21 / 44 = 48%**

---

## Overall Visual Parity Summary

| Area | Score | Parity % |
|---|---|---|
| Auth / Login page | 36/116 | 31% |
| App shell | 22/28 | 79% |
| Sidebar | 31/52 | 60% |
| Header / Topbar | 14/28 | 50% |
| Dashboard | 0/20 | 0% |
| Domain pages (×11) | 0/44 | 0% |
| Design tokens | 21/44 | 48% |
| **TOTAL** | **124/332** | **37%** |

## Highest Priority Gaps by Visual Impact

1. Design token corrections (especially `--blue` in deep-space, font families, motion names)
2. All 11 missing domain pages
3. Dashboard content
4. Auth missing components (register panel, OAuth, strength meter)
5. Header: proper eyebrow + 8-palette picker
6. Sidebar: all 13 nav items + account section
