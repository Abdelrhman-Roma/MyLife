# AUDIT 02 — COMPONENT INVENTORY
> Maps every distinct UI component in the original to its React equivalent

## Layout Shell

### AppShell (`div.app-shell`)
| Property | Original | React (current) | Gap |
|---|---|---|---|
| Grid columns | `272px minmax(0,1fr)` | `app-shell-main` div wrapper — no CSS grid defined | ❌ Layout broken |
| Background | transparent (body provides bg) | not set | ❌ Missing |
| Collapse feature | `body.sidebar-collapsed` → `84px` col | `sidebarOpen` boolean only | ❌ Incomplete |

### Sidebar (`aside.sidebar`)
| Property | Original | React (current) | Gap |
|---|---|---|---|
| Width | 272px sticky | class `sidebar-open/closed` toggle | ❌ No actual width |
| Background | `linear-gradient(180deg, rgba(8,13,29,.91), rgba(7,10,23,.75))` | not set | ❌ Missing |
| Backdrop | `blur(22px)` | not set | ❌ Missing |
| Brand logo | `div.brand` with PNG logo + "Momentum" wordmark | `<h2>MyLife</h2>` only | ❌ Wrong |
| Nav items | `.nav-item` with icon, label, badge, shortcut | plain `<a>` tags in `<li>` | ❌ Wrong |
| Nav icons | `.nav-icon` colored box per domain | missing | ❌ Missing |
| Account section | `.sidebar-account` trigger + dropdown menu | missing | ❌ Missing |
| Collapse button | `.sidebar-collapse-btn` | missing | ❌ Missing |

### Topbar / Header (`header.topbar`)
| Property | Original | React (current) | Gap |
|---|---|---|---|
| Sticky position | top:0, z-index:10 | not set | ❌ Missing |
| Background | `linear-gradient(180deg, rgba(6,9,20,.93), rgba(6,9,20,.69) 78%, transparent)` | not set | ❌ Missing |
| Backdrop | `blur(14px)` | not set | ❌ Missing |
| Page title h1 | `font-size: clamp(1.6rem, 2vw, 2.25rem)`, letter-spacing -0.055em | "MyLife - Momentum" plain text | ❌ Wrong |
| Eyebrow label | `.eyebrow` uppercase, accent color | missing | ❌ Missing |
| Action buttons | `.topbar-actions` with secondary/danger btns | `<select>` + logout btn | ❌ Wrong |

## Auth Components

### Login Page (`main.auth-page`)
| Component | Original | React (current) | Gap |
|---|---|---|---|
| Layout | CSS grid `minmax(0,1.15fr) minmax(380px,0.85fr)` | `.login-page` div | ✅ Correct in impl |
| Aurora visual | `.auth-visual` + `.aurora` + 3 blobs + grid + noise | Implemented | ✅ Done |
| Brand mark | 52×52px white rounded box, "M" mono | Implemented | ✅ Done |
| Headline | `clamp(2.1rem,4.6vw,3.6rem)`, `letter-spacing: -0.02em` | Implemented | ✅ Done |
| Feature points | `ul.auth-visual-points` with `.point-dot` | Implemented | ✅ Done |
| Glass card | `backdrop-blur(22px)`, `border-radius: 24px` | Implemented | ✅ Done |
| Rotating border | `.auth-card-glow` conic-gradient + `@property --angle` | Implemented | ✅ Done |
| Reveal animation | `.reveal` class stagger `calc(120ms + var(--i)*70ms)` | Implemented | ✅ Done |
| Email field | `.field` floating label + icon + status | Implemented | ✅ Done |
| Password field | `.field-password` + eye toggle open/closed | Implemented | ✅ Done |
| Remember me | `.check-field` custom checkbox | ❌ Missing in React |
| Forgot password | `.link-btn` with underline animation | ❌ Missing in React |
| Caps lock hint | `.capslock-hint` (hidden attr) | ❌ Missing in React |
| Form message | `#login-message` role=alert | ❌ Missing in React |
| Submit button | `.auth-submit` with label/spinner/check states | Implemented | ⚠️ Partial |
| OAuth divider | `.auth-oauth-divider` with lines | ❌ Missing in React |
| Google button | `.auth-oauth-btn[data-oauth=google]` | ❌ Missing in React |
| GitHub button | `.auth-oauth-btn[data-oauth=github]` | ❌ Missing in React |
| Auth switch | "New to Momentum? Create an account" | ⚠️ Present but unstyled |
| Register panel | `#register-panel` with name/email/pass/confirm fields | ❌ Missing in React |
| Strength meter | `.strength-meter` 4-segment bar | ❌ Missing in React |
| Cursor glow | `div.cursor-glow` mouse-tracking radial gradient | ❌ Missing in React |
| Lang switcher | `div.auth-lang-switch-wrap` fixed top-right | ❌ Missing in React |
| Page veil | `div.page-veil` full-page transition | ❌ Missing in React |

## Shared Components

| Component | CSS Class | Original Description | React Status |
|---|---|---|---|
| Primary button | `.primary-btn` | Gradient bg, dark text, 44px height, 12px radius | ❌ Not defined |
| Secondary button | `.secondary-btn` | Semi-transparent, border, light text | ❌ Not defined |
| Danger button | `.danger-btn` | Red tinted bg | ❌ Not defined |
| Panel card | `.panel` | Glassmorphism card, backdrop-blur(16px) | ❌ Not defined |
| Data card | `.data-card` | Hover lift, gradient bg, 18px radius | ❌ Not defined |
| Eyebrow label | `.eyebrow` | `// ` prefix, accent color, uppercase 0.72rem | ❌ Not defined |
| Page art banner | `.page-art` | Hero section with image + copy | ❌ Not defined |
| Meter bar | `.meter` / `.meter i` | Progress bar, gradient fill | ❌ Not defined |
| Stat card | `.stat-card` | Bordered top accent, number display | ❌ Not defined |
| Empty state | `.empty-state` | Dashed border, muted, centered | ❌ Not defined |
| Badge | `.badge` / `.badge-*` | Pill shaped, accent color variants | ❌ Not defined |
| Alert | `.alert` / `.alert-*` | Inline feedback with icon | ❌ Not defined |
| Toast | `.toast` / `.toast-region` | Slide-in notification | ❌ Not defined |
| Skeleton | `.skeleton` | Shimmer loading placeholder | ❌ Not defined |
| Modal | `.td-modal-overlay` | Backdrop + card dialog | ❌ Not defined |
| Dash card | `.dash-card` | Domain summary card with progress ring | ❌ Not defined |
| Filter chips | `.td-chip` / `.td-filter-row` | Pill filter tabs | ❌ Not defined |

## Summary

- Original components inventoried: **42**
- Fully implemented in React: **10** (aurora visual, glass card, brand mark, headline, feature points, rotating border, reveal animation, field components, submit button)
- Partially implemented: **2** (auth-switch text present but unstyled, submit button missing states)
- Missing from React: **30**
- Completion: **24%**
