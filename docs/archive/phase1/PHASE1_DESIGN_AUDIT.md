# PHASE 1 — DESIGN AUDIT

## Executive Summary

The legacy MyLife application has a well-defined, intentional design system built around a glassmorphism aesthetic, an aurora mesh gradient background, and an 8-palette theme engine. The system is documented primarily in `css/variables.css` (source of truth) and partially implemented in `css/shared.css`.

The React project (`MyLife-React/src/styles/tokens.css`) has diverged from the legacy source of truth with **9 confirmed token value errors**, a wrong theme attribute name (`data-theme` instead of `data-palette`), and a `ThemeProvider` that only supports 3 modes (`light/dark/system`) instead of the 8 design palettes.

**Audit verdict:**
- Legacy design system: production-quality, complete, RTL-aware, responsive
- React design system: structurally sound but with critical token bugs and missing palette support
- Migration priority: fix tokens.css, rewrite ThemeProvider, port all `variables.css` palette definitions

---

## 1. Color System

### 1.1 Semantic Colors (Deep-Space palette defaults)

All colors are CSS custom properties defined on `:root` and overridden per `[data-palette]` selector.

| Token | Legacy value (`variables.css`) | React value (`tokens.css`) | Status |
|---|---|---|---|
| `--blue` | `#22d3ee` | `#78b8ff` | ❌ Wrong |
| `--green` | `#4ade80` | `#4ade80` | ✅ Correct |
| `--purple` | `#c084fc` | `#c084fc` | ✅ Correct |
| `--pink` | `#f472b6` | `#f472b6` | ✅ Correct |
| `--orange` | `#fb923c` | `#fb923c` | ✅ Correct |
| `--yellow` | `#facc15` | `#facc15` | ✅ Correct |
| `--red` | `#f87171` | `#f87171` | ✅ Correct |
| `--cyan` | `#67e8f9` | `#67e8f9` | ✅ Correct |

### 1.2 Surface Colors (Deep-Space palette)

| Token | Value | Description |
|---|---|---|
| `--bg` | `#0a0f1e` | Page background |
| `--surface` | `rgba(255,255,255,.04)` | Card base (glassmorphism) |
| `--surface-2` | `rgba(255,255,255,.07)` | Elevated surface |
| `--surface-3` | `rgba(255,255,255,.11)` | Topmost surface |
| `--border` | `rgba(255,255,255,.09)` | Subtle border |
| `--text` | `#f7f9ff` | Primary text |
| `--text-2` | `rgba(247,249,255,.65)` | Secondary text |
| `--text-3` | `rgba(247,249,255,.4)` | Tertiary / placeholder |
| `--on-nav` | `#f7f9ff` | Text on sidebar/nav — **MISSING in React tokens.css** ❌ |
| `--danger` | `#ff8fa3` | Danger text/icon |
| `--danger-bg` | `rgba(255,143,163,.14)` | Danger background — **MISSING in React tokens.css** ❌ |

### 1.3 The 8 Palettes

Palettes are applied via `[data-palette='name']` on `<html>` or `<body>`. Each palette redefines the color tokens above.

| Palette | Key Identity | `--bg` | `--blue` override |
|---|---|---|---|
| `deep-space` (default) | Dark navy/space | `#0a0f1e` | `#22d3ee` |
| `solar-light` | Bright white/yellow | `#fffdf5` | `#0ea5e9` |
| `earth` | Dark forest/green | `#0d1f14` | `#34d399` |
| `mars` | Dark red/rust | `#1a0a06` | `#fb923c` |
| `saturn` | Dark gold/brown | `#1a1408` | `#fbbf24` |
| `neptune` | Deep blue/teal | `#060d1f` | `#38bdf8` |
| `nebula` | Purple/violet | `#0f0a1a` | `#a78bfa` |
| `galaxy` | Black/rainbow | `#070710` | `#f0abfc` |

**Critical gap in React:** `ThemeProvider.tsx` applies `data-theme` (not `data-palette`) and only supports `'light' | 'dark' | 'system'`. None of the 8 palettes are wired. The entire palette system is non-functional in the current React build.

---

## 2. Typography System

### 2.1 Font Stack

| Role | Legacy value (`variables.css`) | React value (`tokens.css`) | Status |
|---|---|---|---|
| `--font-family` | `'IBM Plex Sans', system-ui, sans-serif` | `Inter, 'IBM Plex Sans', system-ui, sans-serif` | ❌ Wrong (Inter listed first) |
| `--font-mono` | `'JetBrains Mono', monospace` | `'IBM Plex Mono', monospace` | ❌ Wrong font |
| Arabic override | `'Noto Sans Arabic', 'IBM Plex Sans', sans-serif` on `[lang='ar']` | Not defined | ❌ Missing |

**JetBrains Mono** is used for headings, buttons, and code throughout the legacy design. `IBM Plex Mono` is a different visual identity. This must be corrected.

**Inter** is not used anywhere in the legacy design. Adding it as the first font changes the rendered type on systems where Inter is installed (most macOS/Windows machines).

### 2.2 Type Scale

The legacy design uses a fluid type scale with `clamp()`. Defined in `variables.css` with `[data-font-size]` overrides:

```css
--text-xs:   clamp(.6875rem, .65rem + .15vw, .75rem)   /* 11–12px */
--text-sm:   clamp(.75rem,   .72rem + .15vw, .875rem)  /* 12–14px */
--text-base: clamp(.875rem,  .84rem + .18vw, 1rem)     /* 14–16px */
--text-md:   clamp(1rem,     .96rem + .2vw,  1.125rem) /* 16–18px */
--text-lg:   clamp(1.125rem, 1.08rem + .23vw,1.25rem)  /* 18–20px */
--text-xl:   clamp(1.25rem,  1.19rem + .3vw, 1.5rem)   /* 20–24px */
--text-2xl:  clamp(1.5rem,   1.4rem + .5vw,  1.875rem) /* 24–30px */
--text-3xl:  clamp(1.875rem, 1.7rem + .88vw, 2.5rem)   /* 30–40px */
```

**User font-size preference** via `[data-font-size='sm|md|lg|xl']` → overrides `--font-scale` multiplier applied to the scale.

**React gap:** `tokens.css` defines static rem values instead of `clamp()` ranges. The fluid scale needs to be ported.

---

## 3. Spacing System

### 3.1 Spacing Tokens

| Token | Legacy value | React value | Status |
|---|---|---|---|
| `--space-1` | `4px` | `4px` | ✅ |
| `--space-2` | `8px` | `8px` | ✅ |
| `--space-3` | `12px` | `12px` | ✅ |
| `--space-4` | `16px` | `16px` | ✅ |
| `--space-5` | `20px` | `24px` | ❌ Wrong |
| `--space-6` | `28px` | `32px` | ❌ Wrong |
| `--space-7` | `40px` | `40px` | ✅ |
| `--space-8` | `56px` | `56px` | ✅ |

### 3.2 Tap Target

| Token | Legacy value | React value | Status |
|---|---|---|---|
| `--tap` | `48px` | `44px` | ❌ Wrong (WCAG minimum is 44px but legacy targets 48px) |

---

## 4. Border Radius System

| Token | Legacy value | React value | Status |
|---|---|---|---|
| `--radius-sm` | `8px` | `12px` | ❌ Wrong |
| `--radius-md` | `10px` | `18px` | ❌ Wrong |
| `--radius-lg` | `16px` | `24px` | ❌ Wrong |
| `--radius-xl` | `24px` | `24px` | ✅ |
| `--radius-full` | `9999px` | `9999px` | ✅ |

**Impact:** The React wrong values make every card and button appear significantly rounder than the legacy design — a visible and significant visual divergence.

**User radius preference** via `[data-radius='sharp|md|round']` adjusts the radius tokens:
- `sharp`: `--radius-sm: 4px`, `--radius-md: 6px`, `--radius-lg: 10px`
- `md` (default): values as above
- `round`: `--radius-sm: 14px`, `--radius-md: 20px`, `--radius-lg: 28px`

---

## 5. Shadow / Elevation System

| Token | Value | Usage |
|---|---|---|
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,.25)` | Subtle card lift |
| `--shadow-md` | `0 4px 16px rgba(0,0,0,.35)` | Card default elevation |
| `--shadow-lg` | `0 8px 32px rgba(0,0,0,.45)` | Modal, elevated panels |
| `--shadow-xl` | `0 16px 56px rgba(0,0,0,.55)` | Floating overlays |
| `--glow` | `0 0 24px var(--accent)` | Accent glow on interactive elements |

---

## 6. Glassmorphism Implementation

The core card style used throughout the app:

```css
.card, [class*='glass'] {
  background: var(--surface);           /* rgba(255,255,255,.04) */
  border: 1px solid var(--border);      /* rgba(255,255,255,.09) */
  backdrop-filter: blur(22px) saturate(160%);
  -webkit-backdrop-filter: blur(22px) saturate(160%);
  border-radius: var(--radius-lg);      /* 16px */
  box-shadow: var(--shadow-md);
}
```

**Key glassmorphism values:**
- `blur(22px)` — must match exactly for correct visual density
- `saturate(160%)` — gives the slight color amplification characteristic of the design
- `--surface: rgba(255,255,255,.04)` — extremely subtle glass tint
- `--border: rgba(255,255,255,.09)` — thin luminous border

Elevated variants: `--surface-2` for modals, `--surface-3` for tooltips/popovers.

---

## 7. Aurora / Mesh Gradient Background System

The animated background consists of 3 SVG blobs rendered behind the main content:

```html
<div class="aurora-bg" aria-hidden="true">
  <div class="blob blob-a"></div>  <!-- driftA: 26s -->
  <div class="blob blob-b"></div>  <!-- driftB: 32s -->
  <div class="blob blob-c"></div>  <!-- driftC: 38s -->
</div>
```

**Blob styles:**
- Position: `position: fixed`, full-screen coverage, `z-index: -1`
- Size: `blob-a: 70vmax` circle, `blob-b: 55vmax`, `blob-c: 45vmax`
- Colors: Each blob uses a radial-gradient with the palette's accent colors
- Blur: `filter: blur(80px)` — creates the soft mesh gradient effect
- `will-change: transform` for GPU compositing

**Animation keyframes:**
```css
@keyframes driftA {
  0%   { transform: translate(0, 0) scale(1); }
  33%  { transform: translate(15vw, -12vh) scale(1.1); }
  66%  { transform: translate(-10vw, 20vh) scale(.95); }
  100% { transform: translate(0, 0) scale(1); }
}
```
Durations: `blob-a: 26s`, `blob-b: 32s`, `blob-c: 38s` (coprime durations prevent synchronization)

**Performance note:** The blobs use `will-change: transform` to ensure GPU compositing. The aurora background is the single most CPU-intensive visual element — users with the "reduce motion" preference or compact mode toggle can disable animations.

---

## 8. Layout System

### 8.1 App Shell Grid

```css
.app-shell {
  display: grid;
  grid-template-columns: 272px 1fr;  /* sidebar | content */
  grid-template-rows: auto 1fr;      /* topbar | main */
  min-height: 100dvh;
}
```

| Region | Width / Height | Token |
|---|---|---|
| Sidebar | `272px` | hardcoded in layout; not a CSS var |
| Topbar | `64px` height | `--topbar-h: 64px` |
| Main content area | `100% - 272px` | flex/grid remainder |
| Content max-width | `1440px` on large screens | `--content-max: 1440px` |
| Content padding | `var(--space-6)` = 28px | applied as `padding-inline` |

### 8.2 Sidebar

```css
.sidebar {
  width: 272px;
  height: 100dvh;
  position: sticky;
  top: 0;
  background: var(--surface);
  backdrop-filter: blur(22px) saturate(160%);
  border-inline-end: 1px solid var(--border);
  overflow-y: auto;
  z-index: 100;
}
```

Sidebar contains:
1. App logo + workspace name (header section)
2. Navigation items (icon + label, 12 items)
3. User avatar + name + "Account" link (footer section)

### 8.3 Topbar

```css
.topbar {
  position: sticky;
  top: 0;
  height: 64px;
  z-index: 200;
  background: transparent;
  backdrop-filter: blur(14px) saturate(140%);
  border-block-end: 1px solid var(--border);
}
```

Less blur than sidebar (14px vs. 22px) — creates visual separation while remaining transparent.

### 8.4 Responsive Breakpoints

| Breakpoint | Value | Behavior change |
|---|---|---|
| Mobile | `< 768px` | Sidebar hidden by default; hamburger in topbar toggles it as overlay. Content fills full width. |
| Tablet | `768px – 1024px` | Sidebar may be collapsed (icon-only mode at 64px) or hidden depending on page. |
| Desktop | `> 1024px` | Full sidebar 272px always visible. |

Breakpoints are not CSS custom properties — they're hardcoded `@media` values in `shared.css`. React target should define them as Sass/CSS variables.

---

## 9. Component Visual Patterns

### 9.1 Cards

All domain cards (habit cards, todo cards, goal cards) follow the glassmorphism pattern with additional:
- `padding: var(--space-5) var(--space-6)` = `20px 28px` (note: React has wrong spacing tokens)
- `border-radius: var(--radius-lg)` = 16px
- Hover: `transform: translateY(-2px)` + `box-shadow: var(--shadow-lg)`
- Transition: `all 200ms cubic-bezier(.4, 0, .2, 1)`

### 9.2 Buttons

Button variants:
- **Primary:** `background: var(--accent)`, `color: #000` (dark text on colored bg), `border-radius: var(--radius-md)`
- **Secondary:** `background: var(--surface-2)`, `border: 1px solid var(--border)`
- **Ghost:** transparent background, border only
- **Danger:** `background: var(--danger-bg)`, `color: var(--danger)`
- **Icon:** square, `width: var(--tap)` = 48px, `border-radius: var(--radius-sm)`
- Font: `'JetBrains Mono'` (note: React has wrong `--font-mono`)
- Minimum height: `var(--tap)` = 48px (note: React has 44px)

### 9.3 Inputs

```css
input, textarea, select {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text);
  padding: var(--space-3) var(--space-4);
  min-height: var(--tap);  /* 48px */
  font-family: var(--font-family);
}
input:focus {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-color: var(--accent);
}
```

### 9.4 Modals

```css
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.6);
  backdrop-filter: blur(4px);
  z-index: 500;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal {
  background: var(--surface-2);
  backdrop-filter: blur(40px) saturate(180%);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);  /* 24px */
  padding: var(--space-6);          /* 28px */
  max-width: 560px;
  width: calc(100% - var(--space-8));
}
```

On mobile (`< 768px`): modal becomes a bottom sheet (`position: fixed; bottom: 0; border-radius: var(--radius-xl) var(--radius-xl) 0 0`).

### 9.5 Progress Rings

Radial SVG progress rings used on Dashboard and various pages. Key values:
- Stroke: `var(--accent)` with `strokeLinecap: 'round'`
- Track: `var(--surface-3)` at 30% opacity
- Size variants: 80px (dashboard hero), 48px (inline), 32px (compact)
- Animation: `stroke-dashoffset` transition `600ms ease-out`

### 9.6 Badges / Chips

- Difficulty badges (Easy/Medium/Hard): color-coded `background`, `color`, `border-radius: var(--radius-full)`
- Status chips: same pattern with domain-specific colors
- Tag chips in Todo: `background: var(--surface-2)`, pill shape
- Filter chips: active state uses `background: var(--accent)` + `color: #000`

---

## 10. Domain Accent System

Each page sets `--accent` to the domain's color via `body[data-page='x']`:

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

`--accent` flows into: active sidebar items, progress rings, focus outlines, primary buttons, chart colors, gradient blobs colors.

---

## 11. RTL Support

### Approach in Legacy

A mix of physical and logical CSS properties. Newer components use logical properties; older components use physical + `[dir='rtl']` overrides.

**Logical properties used:**
```css
margin-inline-start, margin-inline-end
padding-inline-start, padding-inline-end
border-inline-start, border-inline-end
inset-inline-start, inset-inline-end
```

**Physical properties with RTL override (older pattern):**
```css
.nav-item { margin-left: var(--space-3); }
[dir='rtl'] .nav-item { margin-left: 0; margin-right: var(--space-3); }
```

**RTL trigger:** `document.documentElement.dir = 'rtl'` set by `I18nService.setLanguage('ar')`.

**Known RTL gaps:**
- Drag handles in Todo Custom sort mode: not tested in RTL
- Calendar grid: column reversal tested for month view but not week/day views
- Chart x-axes: SVG-rendered charts need explicit RTL reversal logic (not all implemented)
- Some modal footers (button order): inconsistent in RTL

### React Migration Requirement

All components must use CSS logical properties exclusively. No `[dir='rtl']` override blocks. This is specified in `PHASE1_FINAL_ARCHITECTURE.md` Architecture Principle 7.

---

## 12. Confirmed Design Bugs in `MyLife-React/src/styles/tokens.css`

| # | Token | Legacy value (correct) | React value (wrong) | Impact |
|---|---|---|---|---|
| 1 | `--blue` | `#22d3ee` (cyan-400) | `#78b8ff` (blue-400) | Wrong accent color on all `data-page='todo'` + `data-page='dashboard'` elements |
| 2 | `--font-family` | `'IBM Plex Sans', system-ui` | `Inter, 'IBM Plex Sans', system-ui` | Wrong body font on systems with Inter installed (~most modern machines) |
| 3 | `--font-mono` | `'JetBrains Mono'` | `'IBM Plex Mono'` | Wrong font for all buttons and headings |
| 4 | `--space-5` | `20px` | `24px` | All `gap-5`, `p-5`, `m-5` utilities 20% too large |
| 5 | `--space-6` | `28px` | `32px` | Card padding + layout spacing off throughout |
| 6 | `--tap` | `48px` | `44px` | All tap targets 4px too small |
| 7 | `--radius-sm` | `8px` | `12px` | Buttons 50% rounder than legacy |
| 8 | `--radius-md` | `10px` | `18px` | Cards 80% rounder than legacy |
| 9 | `--radius-lg` | `16px` | `24px` | Modals/panels 50% rounder than legacy |
| 10 | `--on-nav` | `#f7f9ff` | *(missing)* | Sidebar text color undefined |
| 11 | `--danger-bg` | `rgba(255,143,163,.14)` | *(missing)* | Danger button/state background undefined |

---

## 13. `ThemeProvider.tsx` Architecture Gaps

Current implementation (`MyLife-React/src/app/providers/ThemeProvider.tsx`):

```typescript
type Theme = 'light' | 'dark' | 'system'
// Only sets document.documentElement.dataset.theme = 'light' | 'dark'
// Reads prefers-color-scheme for 'system'
// Persists to localStorage key 'mylife-theme-preference'
```

**Required implementation:**

```typescript
type Palette = 'deep-space' | 'solar-light' | 'earth' | 'mars' | 
               'saturn' | 'neptune' | 'nebula' | 'galaxy'
type Mode = 'light' | 'dark' | 'system'

// Should:
// 1. Set document.documentElement.dataset.palette = palette (NOT data-theme)
// 2. Set document.documentElement.dataset.theme = 'light' | 'dark' for mode overlay
// 3. Persist both to localStorage under 'mylife.palette' and 'mylife.mode'
// 4. Sync palette from settings/{uid} via SettingsRepository
// 5. System mode: listen to prefers-color-scheme media query
```

The `data-theme='light'` overlay is used for the `solar-light` palette's light surface colors. Other palettes remain dark regardless of system preference.

---

## 14. Design Debt in Legacy

| Issue | Location | Severity |
|---|---|---|
| `backdrop-filter` lacks `-webkit-` prefix on some elements | `shared.css` | Minor (Safari compat) |
| Physical CSS properties with `[dir='rtl']` overrides (older pattern) | Various domain CSS files | Medium |
| Drag handle RTL behavior untested | `todo.css` | Medium |
| Calendar week/day view RTL untested | `calendar.css` | Medium |
| SVG charts don't reverse x-axis in RTL | `js/services/WeatherCharts.js`, `js/study.js` | Medium |
| `@media` breakpoints hardcoded, not CSS variables | `shared.css` | Low |
| `font-display: swap` not set on all `@font-face` declarations | `variables.css` | Low |
| No `prefers-reduced-motion` media query for aurora blob animations | `variables.css` | Medium (accessibility) |
| `data-i18n-html` innerHTML XSS exposure | `shared.js` | High (security, see PHASE1_SECURITY_AUDIT.md) |

---

## 15. Migration Recommendations

1. **Fix tokens.css immediately (11 bugs)** — these affect every rendered component; fix before any other React development proceeds.

2. **Rewrite ThemeProvider.tsx** — implement all 8 palettes with `data-palette` attribute; separate palette from light/dark mode; sync with `SettingsRepository`.

3. **Port `variables.css` palette definitions verbatim** — do not rederive values; copy the exact CSS custom property blocks from the legacy source of truth.

4. **Use CSS logical properties exclusively** — no `margin-left`/`right`, `padding-left`/`right`, `border-left`/`right` in any new component. This is the only acceptable RTL strategy.

5. **Preserve glassmorphism values exactly** — `blur(22px) saturate(160%)` for cards, `blur(14px)` for topbar, `blur(40px) saturate(180%)` for modals. These are intentional design choices, not arbitrary numbers.

6. **Add `prefers-reduced-motion` support** — wrap all aurora blob animation declarations in `@media (prefers-reduced-motion: no-preference)`.

7. **Port fluid type scale with `clamp()`** — do not use static rem values.

8. **Preserve `body[data-page]` accent mechanism** — each page sets `--accent` on mount/unmount via `useEffect`.

9. **Do not introduce new design tokens** without corresponding legacy precedent — add only what the inventory reveals is genuinely missing.

---

**END OF PHASE 1 DESIGN AUDIT**
