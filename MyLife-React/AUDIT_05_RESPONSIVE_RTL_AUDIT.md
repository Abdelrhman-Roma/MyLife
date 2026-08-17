# AUDIT 05 — RESPONSIVE & RTL AUDIT
> Breakpoints, mobile layout, Arabic RTL support

## Breakpoints

| Breakpoint | Original | React | Match? |
|---|---|---|---|
| Desktop → tablet | `max-width: 860px` | `max-width: 860px` | ✅ |
| Tablet → mobile | `max-width: 520px` | `max-width: 520px` | ✅ |
| Auth single-col | `max-width: 1050px` (auth.css) | `max-width: 860px` (globals.css) | ❌ Wrong — original collapses auth at 1050px |
| Auth narrow | `max-width: 720px` (auth.css) | `max-width: 520px` | ❌ Wrong breakpoint |

## AppShell Layout at Each Breakpoint

### Desktop (>860px)
| Property | Original | React | Match? |
|---|---|---|---|
| Grid | `272px minmax(0,1fr)` | `272px minmax(0,1fr)` | ✅ |
| Sidebar | sticky, `height: 100vh` | sticky, `height: 100dvh` | ✅ (`dvh` is better) |
| Main scroll | `overflow-y: auto` on main | flex column on `.main` | ⚠️ |

### Tablet (≤860px)
| Property | Original (momentum.css) | React | Match? |
|---|---|---|---|
| AppShell layout | `display: block` (single col) | `display: block` | ✅ |
| Sidebar | becomes top bar or hidden | `height: auto` | ⚠️ Original collapses to mobile drawer; React just changes height |
| Mobile nav | bottom nav bar visible | not implemented | ❌ Missing |
| Sidebar overlay | `position: fixed; transform: translateX(-100%)` | not implemented | ❌ Missing |
| Hamburger trigger | topbar menu button | `sidebar-toggle` btn present in Header | ⚠️ Button exists but behavior not wired |

### Mobile (≤520px)
| Property | Original | React | Match? |
|---|---|---|---|
| Auth visual | `min-height: 200px` | `min-height: 280px` | ⚠️ Close |
| Auth card padding | reduced | reduced | ✅ |
| Topbar wrap | flex-wrap allowed | `flex-wrap` set | ✅ |
| Page content padding | `0 16px 90px` | `0 16px 90px` | ✅ |

## RTL (Right-to-Left) Support

### Architecture
| Concern | Original | React | Match? |
|---|---|---|---|
| Dir attribute | `<html dir="rtl">` or `<body dir="rtl">` | `[dir='rtl']` CSS selectors present | ⚠️ Selectors present but no JS to set `dir` attribute |
| Language detection | `i18n.js` detects AR → sets dir | No i18n layer in React | ❌ Missing |
| Font switching | `[dir='rtl'] { --font-body: 'Noto Sans Arabic' }` | Not defined | ❌ Missing |

### Layout Inversions
| Rule | Original (shared.css) | React (globals.css) | Match? |
|---|---|---|---|
| Sidebar border side | `border-right: none; border-left: 1px solid var(--line)` | ✅ Defined | ✅ |
| Nav item hover shift | `transform: translateX(-2px)` | ✅ Defined | ✅ |
| Nav item active inset | `box-shadow: inset -3px 0 #87bdff` | ✅ Defined | ✅ |
| Error message border side | `border-right: 4px solid var(--red); border-left: none` | ✅ Defined | ✅ |

### Auth RTL Inversions (from auth.css)
| Rule | Original | React (auth.css) | Match? |
|---|---|---|---|
| Field icon position | `[dir='rtl'] .field-icon { left: auto; right: 14px }` | Not defined | ❌ Missing |
| Floating label position | `[dir='rtl'] .field label { left: auto; right: 42px }` | Not defined | ❌ Missing |
| Eye toggle position | `[dir='rtl'] .field-eye { right: auto; left: 12px }` | Not defined | ❌ Missing |
| Link button underline | `[dir='rtl'] .link-btn::after { left: auto; right: 0 }` | Not defined | ❌ Missing (link-btn not defined) |
| Auth card glow | `[dir='rtl']` padding adjustments | Not defined | ❌ Missing |

## i18n Language Support

| Language | Original | React | Match? |
|---|---|---|---|
| English (EN) | `locales/en.js` | Not implemented | ❌ |
| Arabic (AR) | `locales/ar.js` | Not implemented | ❌ |
| French (FR) | `locales/fr.js` | Not implemented | ❌ |
| German (DE) | `locales/de.js` | Not implemented | ❌ |
| Language switcher UI | `div.auth-lang-switch-wrap` fixed top-right | Not implemented | ❌ |
| LocalStorage key | `'lang'` | Not set | ❌ |

## Sidebar Mobile Drawer Behavior

The original has a full mobile drawer pattern:
- Sidebar `position: fixed`, `transform: translateX(-100%)` when closed
- Overlay backdrop `div.sidebar-overlay` fades in
- Body scroll lock when sidebar open
- Swipe-to-close gesture support (via JS)

React current state:
- `sidebarOpen` boolean in AppShell
- Passes `isOpen` to Sidebar component
- Sidebar applies `sidebar-open / sidebar-closed` class
- No CSS for those classes in globals.css
- No overlay, no body scroll lock, no swipe

## Résumé

| Area | Items audited | Correct | Partial | Missing |
|---|---|---|---|---|
| Breakpoints | 4 | 2 | 0 | 2 |
| AppShell responsive | 8 | 4 | 2 | 2 |
| RTL layout | 4 | 4 | 0 | 0 |
| RTL auth | 5 | 0 | 0 | 5 |
| i18n | 6 | 0 | 0 | 6 |
| Mobile drawer | 6 | 0 | 1 | 5 |

**Critical gaps:** No i18n layer, auth RTL inversions missing, mobile drawer incomplete, auth breakpoints wrong.
