# AUDIT 03 — DESIGN SYSTEM AUDIT
> Full comparison of CSS design tokens, typography, spacing, radius, and shadow systems

## Typography

| Token | Original (`variables.css`) | React (`tokens.css`) | Match? |
|---|---|---|---|
| Body font family | `--font-body: 'IBM Plex Sans', sans-serif` (shared.css) | `--font-family: Inter, 'IBM Plex Sans', system-ui` | ⚠️ Wrong — Inter is first, IBM Plex Sans is secondary |
| Mono font family | `--font-mono: 'JetBrains Mono', monospace` (shared.css) | `--font-mono: 'IBM Plex Mono', monospace` | ❌ Wrong font entirely |
| Arabic font | `--font-arabic: 'Noto Sans Arabic', sans-serif` (shared.css) | Not defined | ❌ Missing |
| H1 fluid size | `--fs-h1: clamp(1.32rem, 1.05rem + 1.4vw, 1.7rem)` | `h1 { font-size: clamp(1.6rem, 2vw, 2.25rem) }` | ❌ Different scale, not tokenized |
| H2 fluid size | `--fs-h2: clamp(1.08rem, 0.95rem + 0.7vw, 1.3rem)` | `h2 { font-size: clamp(1.4rem, 1.8vw, 2rem) }` | ❌ Different scale |
| Body fluid size | `--fs-body: clamp(0.88rem, 0.84rem + 0.2vw, 0.95rem)` | not tokenized | ❌ Missing |
| Font scale root | `--font-scale: 1; html { font-size: calc(16px * var(--font-scale)) }` | `font-size: 16px` fixed | ❌ Dynamic scale not wired up |
| Font size preference | `[data-font-size='sm/md/lg/xl']` rules | defined in tokens.css via `@media` only | ❌ `data-font-size` attribute rules missing |

## Spacing Scale

| Token | Original | React | Match? |
|---|---|---|---|
| `--space-1` | `4px` | `4px` | ✅ |
| `--space-2` | `8px` | `8px` | ✅ |
| `--space-3` | `12px` | `12px` | ✅ |
| `--space-4` | `16px` | `16px` | ✅ |
| `--space-5` | `20px` | `24px` | ❌ Off by 4px |
| `--space-6` | `28px` | `32px` | ❌ Off by 4px |
| `--app-gap` | `clamp(10px, 3vw, 18px)` | not defined | ❌ Missing |
| `--card-pad` | `clamp(14px, 4vw, 18px)` | not defined | ❌ Missing |
| `--tap` | `48px` | `44px` | ❌ Off — should be 48px per Apple HIG |

## Border Radius

| Token | Original (variables.css) | Original (momentum.css) | React | Match? |
|---|---|---|---|---|
| `--radius-sm` | `8px` | `12px` | `12px` | ⚠️ React uses momentum.css value |
| `--radius-md` | `10px` | `18px` | `18px` | ⚠️ React uses momentum.css value |
| `--radius-lg` | `16px` | `24px` | `24px` | ⚠️ React uses momentum.css value |
| `--radius-xs` | `10px` (shared.css v2) | n/a | not defined | ❌ Missing |
| `--radius-xl` | `24px` (shared.css v2) | n/a | `24px` | ✅ (same value but different source) |

Note: React uses momentum.css radius values which are correct for the app shell but does not define `--radius-xs`.

## Color Tokens — Default (Deep-Space) Theme

| Token | Original `[data-palette='deep-space']` | React `:root` | Match? |
|---|---|---|---|
| `--bg` | `#060914` | `#060914` | ✅ |
| `--surface` | `rgba(14,21,42,.78)` | `rgba(14,21,42,0.78)` | ✅ |
| `--surface-2` | `rgba(24,34,63,.72)` | `rgba(24,34,63,0.72)` | ✅ |
| `--surface-3` | `#101a33` | `#101a33` | ✅ |
| `--nav` | `rgba(7,11,25,.9)` | `rgba(7,11,25,0.9)` | ✅ |
| `--nav-muted` | `#98a7c9` | `#98a7c9` | ✅ |
| `--on-nav` | `#f7f9ff` | **not defined** | ❌ Missing token |
| `--ink` | `#f5f7ff` | `#f5f7ff` | ✅ |
| `--muted` | `#aab6d2` | `#aab6d2` | ✅ |
| `--line` | `rgba(185,204,255,.16)` | `rgba(185,204,255,0.16)` | ✅ |
| `--blue` | `#22d3ee` | `#78b8ff` | ❌ **Wrong** — React uses a different blue |
| `--green` | `#6ee7c8` | `#71ddbd` | ⚠️ Close but not exact |
| `--purple` | `#b9a6ff` | `#bda5ff` | ⚠️ Close but not exact |
| `--orange` | `#ffcf7a` | `#ffd078` | ⚠️ Close but not exact |
| `--red` | `#ff8fa3` | `#ff909c` | ⚠️ Close but not exact |
| `--danger-bg` | `rgba(255,143,163,.14)` | not defined | ❌ Missing token |
| `--focus-ring` | `rgba(34,211,238,.45)` | `rgba(120,184,255,0.55)` | ❌ Wrong — matches wrong blue |

## Shadow Tokens

| Token | Original | React | Match? |
|---|---|---|---|
| `--shadow` | `0 24px 70px rgba(0,0,0,.42)` | `0 24px 70px rgba(0,0,0,0.42)` | ✅ |
| `--shadow-card` | not in variables.css | `0 12px 35px rgba(0,0,0,0.16)` | ✅ (defined in React) |
| `--shadow-inset` | not in variables.css | `0 1px 0 0 rgba(255,255,255,0.4) inset` | ✅ (defined in React) |

## Motion Tokens

| Token | Original (shared.css) | React (tokens.css) | Match? |
|---|---|---|---|
| `--ease-out` | `cubic-bezier(0.16,1,0.3,1)` | `cubic-bezier(0.16,1,0.3,1)` | ✅ |
| `--ease-in-out` | not defined | `cubic-bezier(0.4,0,0.2,1)` | N/A |
| `--ease-bounce` | not defined | `cubic-bezier(0.34,1.56,0.64,1)` | N/A |
| `--dur-fast` / `--transition-fast` | `--dur-fast: 140ms` | `--transition-fast: 120ms` | ❌ Wrong name + wrong value |
| `--dur-base` / `--transition-standard` | `--dur-base: 220ms` | `--transition-standard: 200ms` | ❌ Wrong name + wrong value |
| `--dur-slow` / `--transition-slow` | `--dur-slow: 420ms` | `--transition-slow: 400ms` | ❌ Wrong name + wrong value |

## User Preference Attribute System

| Feature | Original | React | Match? |
|---|---|---|---|
| `data-font-size` | `[data-font-size='sm/md/lg/xl']` on `:root` | Not defined | ❌ Missing |
| `data-radius` | `[data-radius='sharp/md/round']` on `:root` | Not defined | ❌ Missing |
| `data-theme='light'` | `[data-theme='light']` light mode override | `[data-theme='light']` | ✅ |
| `data-glass='on'` | `.glass-card` extra blur | Not defined | ❌ Missing |
| `data-compact='on'` | `body[data-compact='on']` spacing reduction | Not defined | ❌ Missing |
| `data-animations='off'` | `body[data-animations='off'] *` duration:0 | `@media prefers-reduced-motion` only | ⚠️ User override not wired up |

## Summary

| Category | Total tokens | Matching | Wrong value | Missing |
|---|---|---|---|---|
| Typography | 8 | 0 | 3 | 5 |
| Spacing | 9 | 4 | 3 | 2 |
| Border radius | 5 | 2 | 1 | 2 |
| Deep-space colors | 18 | 8 | 5 | 5 |
| Motion | 6 | 1 | 5 | 0 |
| User prefs | 6 | 1 | 1 | 4 |

**Critical gaps:** wrong `--blue` in default theme, wrong/missing font families, missing `--on-nav`, missing `--danger-bg`, wrong token names for motion timings, missing user-preference attribute rules.
