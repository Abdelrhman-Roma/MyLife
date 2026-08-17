# Phase 2.3 — Visual Parity Audit Report

**Date:** August 16, 2026  
**Status:** AUDIT COMPLETE  
**Task:** Extract Momentum/MyLife design system for React migration

---

## Executive Summary

The original MyLife/Momentum application has a sophisticated celestial-themed design system built on:
- **Glassmorphism** (backdrop blur, semi-transparent surfaces)
- **Radial gradients** (aurora/mesh backgrounds)
- **Space imagery** (animated blobs, floating elements)
- **Multiple color themes** (deep-space, earth, mars, saturn, neptune, nebula, galaxy)
- **Premium micro-interactions** (staggered animations, cursor effects, field validation)

The React implementation must replicate this visual identity while maintaining:
- ✅ Responsive design (320px → 1920px)
- ✅ Dark/Light mode support
- ✅ RTL/LTR support
- ✅ Performance (lazy routes, code splitting)
- ✅ Accessibility (keyboard, screen readers)

---

## 1. Design System Tokens

### 1.1 Color Palette

#### Root Variables (Deep Space Theme)
```css
--space-1: 4px
--space-2: 8px
--space-3: 12px
--space-4: 16px
--space-5: 24px
--space-6: 32px

/* Backgrounds */
--bg: #060914
--surface: rgba(14, 21, 42, 0.78)
--surface-2: rgba(24, 34, 63, 0.72)
--surface-3: #101a33
--nav: rgba(7, 11, 25, 0.9)

/* Text */
--ink: #f5f7ff
--muted: #aab6d2
--nav-muted: #98a7c9

/* Accents */
--blue: #78b8ff
--green: #71ddbd
--purple: #bda5ff
--orange: #ffd078
--red: #ff909c

/* UI */
--line: rgba(185, 204, 255, 0.16)
--focus-ring: rgba(120, 184, 255, 0.55)
--shadow: 0 24px 70px rgba(0, 0, 0, 0.42)

/* Radius */
--radius-sm: 12px
--radius-md: 18px
--radius-lg: 24px
--tap: 44px
```

### 1.2 Multiple Themes

| Theme | Background | Primary | Secondary | Tertiary |
|-------|-----------|---------|-----------|----------|
| **deep-space** | #060914 | #6fb8ff | #aa8cff | #6ee7b7 |
| **solar-light** | #f4f8ff | #2563eb | #0ea5a0 | #7c6ee0 |
| **earth** | #041219 | #38bdf8 | #34d399 | #7dd3c0 |
| **mars** | #180705 | #f97316 | #ef4444 | #dba896 |
| **saturn** | #120e04 | #facc15 | #e8846a | #7ea6d6 |
| **neptune** | #050e1c | #2dd4bf | #93a9f5 | #5eead4 |
| **nebula** | #100819 | #c084fc | #f0abfc | #a78bfa |
| **galaxy** | #070a1c | #60a5fa | #a78bfa | #6ee7b7 |

### 1.3 Typography

- **Font Family:** Inter, IBM Plex Sans, system-ui, sans-serif
- **Font Weight:** 400 (regular), 600 (semi-bold), 700 (bold), 800 (extra-bold)
- **Line Height:** 1.5 (body), 1.06 (headlines)
- **Letter Spacing:** -0.02em to 0.12em (varies by use)

### 1.4 Spacing Scale

```
4px → 8px → 12px → 16px → 24px → 32px
```

### 1.5 Border Radius

```
12px (buttons, inputs, small cards)
18px (panels, data cards)
24px (large sections, page art)
```

### 1.6 Shadows

```
Standard: 0 24px 70px rgba(0, 0, 0, 0.42)
Card Hover: 0 12px 35px rgba(0, 0, 0, 0.16)
Inset: 0 1px 0 0 rgba(255, 255, 255, 0.4) inset (light edge)
Focus: 0 0 0 4px rgba(120, 184, 255, 0.55) (blue focus ring)
```

---

## 2. Layout Architecture

### 2.1 App Shell Layout

```
┌─────────────────────────────────────┐
│          TOPBAR (Header)            │
├──────────┬──────────────────────────┤
│          │                          │
│ SIDEBAR  │    MAIN CONTENT          │
│ (272px)  │                          │
│          │                          │
│          │                          │
└──────────┴──────────────────────────┘
```

**Grid Definition:**
```css
display: grid;
grid-template-columns: 272px minmax(0, 1fr);
```

**Desktop Sidebar:**
- Position: sticky
- Height: 100dvh
- Background: Linear gradient with backdrop blur
- Padding: 20px 14px
- Border-right: 1px solid --line
- Z-index: 20

**Topbar:**
- Position: sticky (z-index: 10)
- Padding: 24px 32px
- Background: Gradient with backdrop blur
- Border: None

**Main Content:**
- Padding: 0 32px 48px

### 2.2 Auth Page Layout

```
┌────────────────────────┬─────────────────┐
│                        │                 │
│   AURORA VISUAL        │  GLASS CARD     │
│   (Left Side)          │  (Right Side)   │
│   - Brand              │  - Form         │
│   - Headline           │  - CTA Button   │
│   - Subline            │  - Links        │
│   - Features List      │                 │
│                        │                 │
└────────────────────────┴─────────────────┘
```

**Grid Definition:**
```css
display: grid;
grid-template-columns: minmax(0, 1.15fr) minmax(380px, 0.85fr);
gap: clamp(12px, 2vw, 22px);
padding: clamp(12px, 2vw, 22px);
```

**Auth Visual (Left):**
- Background: Aurora/mesh gradient with animated blobs
- Overlay: Film grain noise + gradient overlay
- Border-radius: 24px
- Overflow: hidden

**Glass Card (Right):**
- Max-width: 440px
- Padding: clamp(28px, 3.4vw, 40px)
- Background: color-mix(--surface 78%, transparent)
- Backdrop-filter: blur(22px) saturate(160%)
- Border: 1px solid --line (70% opacity)
- Box-shadow: Complex layered shadows
- Border-radius: 24px

---

## 3. Components

### 3.1 Sidebar

**Structure:**
```
├── Brand
│   ├── Logo (36×36px)
│   └── Name + Tagline
├── Navigation List
│   ├── Nav Item (with icon)
│   ├── Nav Item (active state)
│   └── ...
└── Account Section
    ├── Avatar
    └── Username
```

**Styling:**
- Sticky positioning with 100dvh height
- Background: Gradient with backdrop blur
- Nav items: 44px min-height, hover effect with translateX(2px)
- Active state: Gradient background + left border accent (3px solid #87bdff)
- Transitions: 0.2s ease on background, color, transform

### 3.2 Header/Topbar

**Structure:**
```
├── Title (h1)
└── Actions
    ├── Theme Selector
    ├── Secondary Button
    ├── Profile Menu
    └── Logout Button
```

**Styling:**
- Sticky with z-index: 10
- Gradient background with backdrop blur
- Title: clamp(1.6rem, 2vw, 2.25rem)
- Letter-spacing: -0.055em
- Eyebrow: 0.69rem, 0.12em letter-spacing, uppercase

### 3.3 Buttons

#### Primary Button
```css
background: linear-gradient(135deg, #80c1ff, #8e83ff)
color: #071024
border: 0
border-radius: 12px
min-height: 44px
font-weight: 800
box-shadow: 0 10px 28px rgba(111, 151, 255, 0.25)
transition: transform 0.18s ease, box-shadow 0.18s ease
hover: translateY(-2px), box-shadow: 0 14px 34px rgba(111, 151, 255, 0.35)
```

#### Secondary Button
```css
border: 1px solid --line
background: rgba(255, 255, 255, 0.055)
color: #eaf0ff
border-radius: 12px
min-height: 44px
transition: background 0.18s ease, transform 0.18s ease
hover: background: rgba(123, 168, 255, 0.14), translateY(-1px)
```

#### Danger Button
```css
background: rgba(255, 144, 156, 0.1)
border: 1px solid rgba(255, 144, 156, 0.22)
color: #ffd8dc
border-radius: 12px
```

### 3.4 Input Fields (Auth Page)

**Structure:**
```
<div class="field">
  <icon class="field-icon"></icon>
  <input type="email" placeholder=" ">
  <label>Email</label>
  <span class="field-status">✓</span>
</div>
```

**Styling:**
- Height: 54px
- Border: 1px solid --line
- Background: color-mix(--surface-3 92%, transparent)
- Border-radius: 12px
- Padding: 0 14px
- Transition: border-color 200ms, box-shadow 200ms

**Floating Label:**
- Positioned absolutely, left: 42px (accounting for icon)
- Normal state: top: 50%, translateY(-50%)
- Focus/filled state: top: 0, fontSize: 0.7rem, background: --surface
- Transition: 180ms ease

**Focus State:**
- Border-color: --blue
- Box-shadow: 0 0 0 4px --focus-ring
- Icon color changes to --blue

**Validation States:**
- Valid: border-color: --green, shows checkmark icon
- Invalid: border-color: --red, box-shadow with red tint, fieldShake animation

### 3.5 Cards / Panels

```css
background: linear-gradient(145deg, rgba(25, 35, 65, 0.76), rgba(10, 15, 31, 0.72))
border: 1px solid --line
border-radius: 18px
box-shadow: 0 12px 35px rgba(0, 0, 0, 0.16)
backdrop-filter: blur(16px)
padding: 20px
transition: transform 0.2s ease, border-color 0.2s ease
hover: transform: translateY(-2px), border-color: rgba(142, 183, 255, 0.35)
```

### 3.6 Data Cards

```css
padding: 20px
background: (card gradient)
border: 1px solid --line
border-radius: 18px
```

**Styling:**
- Heading (h3): color: #f7f9ff
- Paragraph/small: color: --muted
- Hover: translateY(-2px)

### 3.7 Page Art Section

```css
position: relative
min-height: 240px
border: 1px solid rgba(185, 204, 255, 0.18)
border-radius: 24px
overflow: hidden
background: linear-gradient(115deg, rgba(19, 35, 71, 0.9), rgba(12, 16, 35, 0.68))
box-shadow: var(--shadow)
```

**Overlay:**
```css
::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(6, 9, 20, 0.2), transparent 65%);
  pointer-events: none;
}
```

**Tiered Art (Mars/Jupiter):**
- mars: orange-tinted background + shadows
- jupiter: gold-tinted background + shadows

---

## 4. Aurora/Mesh Backgrounds

### 4.1 Auth Page Aurora

**Animated Blobs:**
```
Blob A (60vh × 60vh):
- Position: -10% left, -10% top
- Color: Blue radial gradient
- Animation: driftA 26s infinite

Blob B (50vh × 50vh):
- Position: -12% right, 20% top
- Color: Purple radial gradient
- Animation: driftB 32s infinite

Blob C (46vh × 46vh):
- Position: 20% left, -18% bottom
- Color: Green radial gradient
- Animation: driftC 38s infinite
```

**Grid Overlay:**
```css
background-image: radial-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px);
background-size: 26px 26px;
mix-blend-mode: overlay;
```

**Film Grain Noise:**
```css
opacity: 0.05
mix-blend-mode: overlay
background-image: (SVG noise pattern)
```

### 4.2 Body Background

**Radial Gradients:**
```css
background:
  radial-gradient(circle at 72% -10%, #1a386a 0, transparent 34rem),
  radial-gradient(circle at 5% 100%, #231a5a 0, transparent 38rem),
  #060914;
```

**Dot Pattern Overlay:**
```css
::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: -1;
  opacity: 0.42;
  background-image:
    radial-gradient(#fff 0.65px, transparent 0.9px),
    radial-gradient(#b9d5ff 0.55px, transparent 0.9px);
  background-size: 43px 43px, 91px 91px;
  background-position: 0 0, 17px 32px;
}
```

---

## 5. Animations & Transitions

### 5.1 Keyframe Animations

```css
/* Aurora blob drift */
@keyframes driftA {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(6%, 8%) scale(1.08); }
}

/* Logo entrance */
@keyframes logoIn {
  0% { opacity: 0; transform: scale(0.6) rotate(-16deg) blur(6px); }
  60% { transform: scale(1.05) rotate(3deg); }
  100% { opacity: 1; transform: scale(1) rotate(0deg); }
}

/* Field reveal stagger */
@keyframes revealIn {
  0% { opacity: 0; transform: translateY(14px) blur(4px); }
  100% { opacity: 1; transform: translateY(0) blur(0); }
}

/* Floating animation */
@keyframes momentum-float {
  50% { transform: translateY(-10px); }
}

/* Rotating border */
@keyframes rotateBorder {
  to { --angle: 360deg; }
}

/* Field validation shake */
@keyframes fieldShake {
  10%, 90% { transform: translateX(-1px); }
  20%, 80% { transform: translateX(2px); }
  30%, 50%, 70% { transform: translateX(-4px); }
  40%, 60% { transform: translateX(4px); }
}

/* Status pop */
@keyframes statusPop {
  0% { transform: scale(0); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
```

### 5.2 Transition Durations

- Fast: 120ms-180ms (hover effects, label animations)
- Standard: 200ms-260ms (focus states, field transitions)
- Medium: 320ms-400ms (theme switching, card transforms)
- Slow: 600ms+ (page entry animations, aurora drift)

### 5.3 Easing Functions

- `ease` - General transitions
- `cubic-bezier(0.16, 1, 0.3, 1)` - Bouncy/playful (logos, reveals)
- `ease-in-out` - Aurora drift (smooth, continuous)
- `cubic-bezier(0.34, 1.56, 0.64, 1)` - Spring effect (pop animations)

---

## 6. Responsive Design

### 6.1 Breakpoints

| Size | Breakpoint | Usage |
|------|-----------|-------|
| Mobile | ≤ 520px | Narrow screens, single column |
| Tablet | 520px - 860px | Medium screens, adjusted layouts |
| Desktop | ≥ 860px | Full two-column layout |

### 6.2 Auth Page Responsive

**Desktop (≥ 860px):**
- Grid: 1.15fr (visual) + 0.85fr (card)
- Two-column layout with aurora on left

**Tablet (520px - 860px):**
- Display: block (stacked layout)
- Sidebar: height: auto
- Topbar: padding: 18px 20px
- Page-content: padding: 0 16px 90px
- Auth-visual: min-height: 310px

**Mobile (≤ 520px):**
- Topbar: align-items: flex-start
- Page-art: padding: 24px
- Art-board: opacity: 0.35
- Auth-headline: font-size: 2.25rem
- Full-width, single column

### 6.3 Media Queries

```css
@media (max-width: 860px) { /* Tablet & below */ }
@media (max-width: 520px) { /* Mobile */ }
@media (prefers-reduced-motion: reduce) { /* Accessibility */ }
@media (prefers-reduced-transparency: reduce) { /* Accessibility */ }
@media (hover: hover) and (pointer: fine) { /* Desktop */ }
```

---

## 7. RTL / LTR Support

### 7.1 Logical CSS Properties

Instead of:
```css
margin-left: 10px;
padding-right: 20px;
```

Use:
```css
margin-inline-start: 10px;
padding-inline-end: 20px;
```

### 7.2 Direction-Aware Layout

```css
[dir="rtl"] .sidebar {
  border-right: none;
  border-left: 1px solid var(--line);
}

[dir="ltr"] .nav-item:hover {
  transform: translateX(2px);
}

[dir="rtl"] .nav-item:hover {
  transform: translateX(-2px);
}
```

### 7.3 Text Alignment

```css
text-align: start; /* LTR: left, RTL: right */
text-align: end;   /* LTR: right, RTL: left */
```

---

## 8. Dark/Light Theme Implementation

### 8.1 Theme Switching

The original app supports:
- Deep Space (dark, default)
- Solar Light (light)
- System (follows OS preference)

### 8.2 CSS Variable Overrides

```css
:root[data-theme="light"] {
  --bg: #f4f8ff;
  --surface: rgba(220, 230, 245, 0.85);
  --ink: #061027;
  --muted: #556080;
  --line: rgba(100, 120, 160, 0.18);
  /* ... */
}

:root[data-theme="dark"] {
  /* Use root defaults */
}

:root[data-theme="system"] {
  /* Use prefers-color-scheme media query */
}
```

---

## 9. Assets Required

### 9.1 Logo
- **File:** Momentum_Logo-removebg-preview.png
- **Size:** 36×36px (sidebar), 52×52px (auth), 38×38px (brand)
- **Location:** src/assets/brand/

### 9.2 Background Images
- **Space Backgrounds.jpg** - Auth page visual background
- **Earth.jpg** - Auth card animated overlay

### 9.3 Fonts
- **Inter** - Primary font
- **IBM Plex Sans** - Fallback
- **System fonts** - Final fallback

### 9.4 Icons
- Eye icon (password visibility toggle)
- Checkmark icon (field validation)
- Navigation icons (sidebar)

---

## 10. Current React Implementation Issues

### 10.1 Visual Mismatches

| Element | Current | Expected |
|---------|---------|----------|
| Login Background | Purple gradient | Aurora/mesh with animated blobs |
| Login Card | Black, minimal | Glassmorphic with rotating border glow |
| Form Inputs | Basic styling | 54px height, floating labels, validation states |
| Buttons | Generic | Gradient with shadows and hover effects |
| Sidebar | Not implemented | 272px sticky, glassmorphic with nav items |
| Header | Minimal | Gradient background, theme controls |
| Overall Theme | Generic purple | Celestial/space with multiple theme options |

### 10.2 Firebase Auth Error

**Current Error:** "Firebase: Error (auth/invalid-credential)"

**Root Cause:** Likely one of:
- [ ] Environment variables not loaded
- [ ] Firebase project disabled Email/Password auth
- [ ] API key permissions incorrect
- [ ] Test credentials invalid

**Status:** CONFIRMED - .env file was created with legacy project credentials. App now loads.

---

## 11. Migration Plan

### Phase 2.3.1 - Design Tokens & Styling Foundation
1. Create design token CSS (variables.css)
2. Create global styles with aurora background
3. Extract theme system from original
4. Set up CSS variable overrides for themes
5. Test theme switching

### Phase 2.3.2 - Component Library
1. Create Button component
2. Create Input component with floating labels
3. Create Card component
4. Create Avatar component
5. Create Badge component
6. Test all components in Storybook-style page

### Phase 2.3.3 - Layout Components
1. Rebuild Sidebar component
2. Rebuild Header component
3. Rebuild AppShell with proper layout
4. Implement mobile navigation
5. Test responsive behavior

### Phase 2.3.4 - Auth Page Rebuild
1. Implement aurora background with animated blobs
2. Build glass card with rotating border
3. Implement floating label inputs
4. Add validation states
5. Add cursor spotlight effect
6. Test all auth flows

### Phase 2.3.5 - Dashboard Shell
1. Implement dashboard layout
2. Add dashboard cards/panels
3. Add dashboard typography
4. Implement theme-aware dashboard
5. Test responsive dashboard

### Phase 2.3.6 - Testing & Refinement
1. Manual visual comparison (old vs new)
2. Responsive testing (mobile, tablet, desktop)
3. RTL/LTR testing
4. Theme testing (all 8 themes)
5. Accessibility testing (keyboard, screen reader)
6. Performance testing (no regression)

---

## 12. Acceptance Criteria

- [ ] Login page visually matches original
- [ ] All design tokens documented in CSS
- [ ] Sidebar matches original structure and styling
- [ ] Header matches original styling
- [ ] Glassmorphic effects working (blur, transparency)
- [ ] Aurora animations working
- [ ] All 8 themes available and switching correctly
- [ ] Responsive design working (320px - 1920px)
- [ ] RTL/LTR working correctly
- [ ] All buttons, inputs, cards matching original style
- [ ] No console errors
- [ ] No performance regression
- [ ] Firebase auth functional
- [ ] TypeScript passes strict mode
- [ ] Production build succeeds
- [ ] Playwright tests pass (17/17)
- [ ] Manual visual comparison checklist completed

---

## 13. Next Steps

1. ✅ Audit complete
2. → Create design token system
3. → Rebuild component library
4. → Rebuild layout components
5. → Rebuild auth page
6. → Test and refine
7. → Complete manual visual verification
8. → Mark Phase 2.3 complete, ready for Phase 3

---

**Report Generated:** August 16, 2026  
**Status:** Ready for implementation
