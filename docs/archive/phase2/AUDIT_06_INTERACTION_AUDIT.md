# AUDIT 06 — INTERACTION AUDIT
> Animations, transitions, hover/focus/active/loading/success/error states

## Animation Keyframes

### Original — Defined in auth.css / momentum.css

| Keyframe | Definition | Used on |
|---|---|---|
| `@keyframes driftA` | `0%→33%→66%→100%` translate + scale, 26s | `.blob-a` aurora blob |
| `@keyframes driftB` | Opposite arc, 32s | `.blob-b` aurora blob |
| `@keyframes driftC` | Third arc, 38s | `.blob-c` aurora blob |
| `@keyframes logoIn` | `scale(0.82) rotate(-8deg) blur(12px)` → identity, 900ms ease-out | `.auth-brand` logo on page load |
| `@keyframes revealIn` | `opacity:0; translateY(14px); blur(4px)` → identity, 620ms ease-out | `.reveal` staggered auth fields |
| `@keyframes shimmer` | `transform: translateX(-100%)→+100%` | `.auth-submit::before` loading shimmer |
| `@keyframes checkPop` | `scale(0)→scale(1.3)→scale(1)` | `.auth-submit` success checkmark |
| `@keyframes spin` | `rotate(0→360deg)` | loading spinner |
| `@keyframes momentum-float` | Sinusoidal Y translate, 8s | `.auth-card` floating effect |
| `@keyframes momentum-rotate` | `rotate(0→360deg)` | Aurora blob rotation |
| `@keyframes conic-spin` (via `@property --angle`) | `--angle: 0deg→360deg`, 7s | `.auth-card-glow` rotating border |

### React — Defined in auth.css / globals.css

| Keyframe | Status | Notes |
|---|---|---|
| `driftA/B/C` | ✅ Defined in auth.css | Values need verification |
| `logoIn` | ✅ Defined in auth.css | |
| `revealIn` | ✅ Defined in auth.css | |
| `shimmer` | ⚠️ Unknown | auth.css content not visible in context |
| `checkPop` | ⚠️ Unknown | |
| `spin` | ✅ Defined in globals.css | |
| `momentum-float` | ❌ Not in globals.css | |
| `conic-spin / @property --angle` | ⚠️ Unknown | auth.css content referenced |

## Hover States

| Component | Original behavior | React status |
|---|---|---|
| `.nav-item:hover` | `background: rgba(123,168,255,0.1); color: #fff; translateX(2px)` | ✅ Defined in globals.css |
| `.nav-item.active` | gradient bg, inset-left blue border, white text | ✅ Defined in globals.css |
| `.data-card:hover` | `translateY(-2px); border-color brightens` | ✅ Defined in globals.css |
| `.secondary-btn:hover` | `background brightens; translateY(-1px)` | ✅ Defined in globals.css |
| `.primary-btn:hover` | `translateY(-2px); shadow deepens` | ✅ Defined in globals.css |
| `.auth-oauth-btn:hover` | `background brightens; border lightens` | ❌ auth-oauth-btn not in React |
| `.link-btn:hover` | `::after underline slides in` | ❌ link-btn not in React |
| `.field:focus-within` | `border-color: var(--blue); box-shadow: 0 0 0 4px var(--focus-ring)` | ✅ In auth.css |
| `.field-eye:hover` | Icon opacity 1 | ⚠️ Unknown |

## Focus States

| Component | Original | React | Match? |
|---|---|---|---|
| All interactive elements | `outline: 3px solid var(--focus-ring); outline-offset: 3px` | ✅ Defined in globals.css | ✅ |
| `.field input:focus` | Suppresses default outline (handled by field wrapper) | ⚠️ Partial | |
| RTL nav focus | `[dir='rtl'] .nav-item:focus` mirror | Not defined | ❌ |

## Loading & State Variants

| State | Original implementation | React status |
|---|---|---|
| Submit btn loading | `.auth-submit.loading` → spinner replaces label | ⚠️ Unknown |
| Submit btn success | `.auth-submit.success` → checkmark + green bg | ⚠️ Unknown |
| Submit btn error | form message div role=alert with error text | ❌ Missing |
| Field invalid | `.field.invalid input` → red border + error label | ❌ Missing |
| Field valid | `.field.valid input` → green border check icon | ❌ Missing |
| Password strength 1 | `.strength-meter[data-score='1']` → 1 red segment | ❌ Missing |
| Password strength 2 | `.strength-meter[data-score='2']` → 2 orange segments | ❌ Missing |
| Password strength 3 | `.strength-meter[data-score='3']` → 3 yellow segments | ❌ Missing |
| Password strength 4 | `.strength-meter[data-score='4']` → 4 green segments | ❌ Missing |
| Caps lock warning | `.capslock-hint[hidden]` → shown via JS | ❌ Missing |
| Page veil transition | `div.page-veil` fades in on nav | ❌ Missing |
| OAuth btn loading | `.auth-oauth-btn.loading` spinner | ❌ Missing |

## Reveal Stagger System

Original pattern in auth.css:
```css
.reveal {
  opacity: 0;
  transform: translateY(14px);
  filter: blur(4px);
  animation: revealIn 620ms cubic-bezier(0.16,1,0.3,1) forwards;
  animation-delay: calc(120ms + var(--i) * 70ms);
}
```
Applied to each child with `style="--i:0"`, `style="--i:1"` etc.

React status: ✅ `.reveal` class defined in auth.css. However the React component must set `style={{ '--i': index }}` on each child for the stagger to work. This JS wiring needs verification.

## Cursor Glow Effect

Original: `div.cursor-glow` with `radial-gradient(circle at var(--mx) var(--my), rgba(130,180,255,.18) 0, transparent 35%)`. Mouse position updated via `mousemove` event setting `--mx` and `--my` as inline CSS vars on `.cursor-glow`.

React status: ❌ No cursor glow element or JS mouse tracking.

## Sidebar Interactions

| Interaction | Original | React | Match? |
|---|---|---|---|
| Collapse toggle | Animates sidebar width `272px → 84px`, labels fade, icons center | Boolean toggle only | ❌ |
| Account menu open | Dropdown slides down with `scaleY` transform | Not implemented | ❌ |
| Nav active state | Set via `data-page` attribute on body + CSS | Set via `.active` className in JSX | ⚠️ Approach differs |
| Keyboard shortcuts | `data-shortcut` attr + global keydown listener | Not implemented | ❌ |

## Page-Level Domain Accent System

Original: `body[data-page='health'] { --accent: var(--green) }` and equivalent for each of the 13 domains. Components use `var(--accent)` for colored borders and highlights so each page has a distinct accent.

React status: ❌ `--accent` token not defined, `data-page` not set, no domain-specific coloring.

## Résumé

| Category | Items | Working | Partial | Missing |
|---|---|---|---|---|
| Keyframes | 11 | 5 | 3 | 3 |
| Hover states | 9 | 6 | 1 | 2 |
| Focus states | 3 | 2 | 1 | 0 |
| Loading/state variants | 12 | 0 | 2 | 10 |
| Reveal stagger | 1 | 1 | 0 | 0 |
| Cursor glow | 1 | 0 | 0 | 1 |
| Sidebar interactions | 4 | 0 | 1 | 3 |
| Domain accent system | 1 | 0 | 0 | 1 |

**Critical gaps:** Form validation states, password strength meter, cursor glow, domain accent system, submit button state machine, page veil transition.
