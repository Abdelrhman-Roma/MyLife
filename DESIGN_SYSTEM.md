# MyLife Design System (Phase 3 documentation)

This documents the design tokens and shared components that already exist in
the codebase (`css/variables.css`, `css/shared.css`), plus what Phase 3 added
or fixed on top of them. It is written from the real, current CSS — not an
aspirational spec — so it stays accurate as a reference.

## Honest scope statement

Phase 3's brief asks for a full redesign of every page and component into a
Notion/Linear/Arc-tier premium UI. That is not something that can be done
with real fidelity, file by file, in one pass on top of an existing
~7,100-line CSS codebase. What this phase actually did:

1. **Fixed the specific, previously-audited defects** that were blocking the
   existing design system from being trustworthy (contrast failures, weak
   focus indicators, an under-sized touch target) — see "Fixes applied,"
   below.
2. **Filled in two whole categories the brief asks for that were structurally
   missing**: a reusable error-state component (the app had empty states,
   but no consistent error-state component), and a real loading-vs-empty
   distinction for at least one page (Todo).
3. **Documented the existing token system** so future redesign work (Phase
   3b, or someone picking this up) has one accurate reference instead of
   reverse-engineering tokens from 19 separate CSS files.
4. Did **not** redesign Habits, Goals, Calendar, Study, Workout, Nutrition,
   Prayer, Quran, Statistics, Weather, Settings, or Auth — those pages are
   visually unchanged this phase.

## Design tokens (`css/variables.css`)

**Color** — 9 themes (`data-palette="deep-space|solar-light|earth|mars|saturn|neptune|nebula|galaxy"` +
a light-mode override), each defining the same semantic set:
`--bg`, `--surface`, `--surface-2/3`, `--ink`, `--muted`, `--line`, `--nav`,
`--nav-muted`, `--on-nav`, `--blue`, `--green`, `--purple`, `--orange`,
`--red`, `--danger-bg`, `--focus-ring`, `--shadow`. Always reference the
semantic token (`var(--green)`), never a literal hex value, so a page
automatically works in all 9 themes.

**Spacing** — `--space-1` through `--space-6` (4/8/12/16/20/28px). Use these
instead of ad-hoc pixel values in new CSS.

**Radius** — `--radius-sm/md/lg/xl`, and the whole scale re-maps based on the
user's `data-radius` setting (`sharp`/`md`/`round`) — never hardcode a
border-radius value where a token fits, or the user's radius preference
silently stops applying to that element.

**Touch targets** — `--tap: 48px` (Apple HIG / Material's shared ~48px
guidance). Any tappable icon-only control should meet this, even if its
*visual* size is smaller (see `.std-icon-btn`'s hit-area technique, below).

**Motion** — `--ease-out`, `--ease-in-out`, `--dur-fast` (140ms), `--dur-base`
(220ms), `--dur-slow` (420ms). Use these instead of inventing new timing
values, so every animation in the app feels like it belongs to the same
system — and because `prefers-reduced-motion` is handled globally by
overriding these (see shared.css's universal `*` rule), any animation built
from these tokens is automatically silenced for users who need that.

## Shared components (`css/shared.css`, reused across pages)

- **`.empty-state`** — icon (from the `EMPTY_ICONS` set in `js/shared.js`) +
  message + optional CTA button. Used when a list is genuinely empty.
- **`.empty-state-error` (new, Phase 3)** — same shape as `.empty-state`,
  warmer icon tint, used by the new `errorStateHtml()` helper (see below).
  Deliberately not a separate component — an error and an empty list should
  still feel like the same design system.
- **`.skeleton`** (already existed, used by Prayer/Weather; Phase 3 wires it
  into Todo too) — a shimmering placeholder block for content that's still
  loading, distinct from "genuinely empty."
- **`.toast` / `showToast()`** — now supports an optional `onUndo` callback
  (Phase 2) that renders a `.toast-undo-btn` action button (Phase 3 styled
  it to match the button system).
- **`.std-icon-btn`** — the shared icon-only button (edit/delete/pin/
  archive actions). Phase 3 fixed its touch target (see below).

## Fixes applied this phase (with evidence)

| Fix | File(s) | What changed |
|---|---|---|
| Contrast failure, Solar Light green text | `css/variables.css` | `--green` (Solar Light) darkened `#0ea5a0` → `#0b7a76`, raising contrast against white from 3.04:1 to 5.17:1 (WCAG AA needs 4.5:1) |
| Contrast failure, Solar Light red text | `css/variables.css` | `--red` (Solar Light) darkened `#dc4a4a` → `#c93f3f`, raising contrast from 4.10:1 to 4.92:1 |
| Weak focus indicator, account menu | `css/shared.css` | `.account-menu a/button:focus-visible` now gets a real `outline: 2px solid var(--focus-ring)` (previously `outline: none` with only a faint background tint, indistinguishable from `:hover`) |
| Weak focus indicator, workout set-row inputs | `css/pages/workout.css` | Same `--focus-ring` outline convention added, replacing a border-color-only change |
| Icon buttons below the app's own 48px tap standard | `css/shared.css` | `.std-icon-btn` keeps its compact 30px visual size (dense card actions still want a small icon) but its actual clickable hit-area is expanded to 48px via a `::after` overlay — see the code comment for the technique and its one caveat (very tightly-packed adjacent icon buttons can have slightly overlapping hit areas; acceptable in every place this class is currently used, but worth checking if used somewhere new and cramped) |

## New components this phase

- **`errorStateHtml(mappedError, options)` + `bindErrorStateEvents()`**
  (`js/shared.js`) — a single, consistent error-state component driven by
  `core/ErrorMapper.js`'s `category` field, covering exactly the cases the
  brief lists (no internet → `network`, permission denied → `permission`,
  no data → `not-found`, unexpected error → `unknown`, server unavailable →
  `unavailable`). Renders a "Try again" button automatically when
  `mappedError.retryable` is true. Wired into Todo's realtime-subscription
  failure path as the reference implementation; every other migrated module
  should use the same helper rather than inventing its own error markup.
- **Todo's loading/empty/error three-way split** (`js/todo.js`) — previously
  (Phase 2), a Todo page whose Firestore subscription hadn't delivered its
  first snapshot yet would render the *same* "No tasks here" empty state as
  a genuinely empty list — a real, latent bug this phase caught and fixed.
  Now: skeleton cards while loading, the error state above if the
  subscription itself fails, and the empty state only once real data
  confirms there's nothing there.
- **Task-completion success micro-interaction** (`css/pages/todo.css`,
  `js/todo.js`) — a fast (`--dur-base`, 220ms), `--ease-out` scale+glow pop
  on the exact "just marked complete" transition (not on un-checking, not on
  a recurring task's silent rollover). Automatically silenced by the
  existing global reduced-motion override.

## Responsive breakpoints — documented, not yet consolidated

The Phase 2 UI/UX audit found 15 inconsistent `@media` breakpoint values
across the CSS (360–1200px, no shared system). This phase did **not** do the
file-by-file migration that would fix that (a large, cross-cutting change
better done deliberately rather than folded into this pass) — but for
whoever does it, the recommended standard scale, matching the brief's own
device-testing list, is:

```
480px   — small phones
768px   — tablets / large phones landscape
1024px  — small laptops
1280px  — desktop
```

New CSS written from now on should snap to these four values rather than
picking a new one-off number.

## Remaining UI technical debt

1. **12 of 13 modules are visually unchanged.** Only Todo received the full
   loading/error/success treatment described above.
2. **Breakpoint consolidation is documented, not implemented** (see above).
3. **The `.std-icon-btn` hit-area overlap caveat** (see the fixes table)
   should be checked if the class is used in a new, tightly-packed layout.
4. **No dedicated component library/docs site** — this Markdown file is the
   full extent of "design system documentation" for now; a living
   Storybook-style catalog is a reasonable future investment once more
   pages share the same redesigned components.
5. **Color-mix()/backdrop-filter browser-compatibility risk** (Phase 3 of
   the earlier technical audit) is unchanged — still no `@supports`
   fallback anywhere in the CSS.

## Is MyLife ready for Phase 4?

**Only for the specific surface this phase touched.** The token-level fixes
(contrast, focus, touch target) apply app-wide immediately, since they're
CSS variable/shared-component changes. The new loading/error/success pattern
is proven end-to-end on Todo and ready to be repeated on every other
migrated module — but most modules haven't been migrated to Firestore yet
(Phase 2) or redesigned (this phase), so a Phase 4 that assumes a
fully-modernized UI across the whole app would be building on an inaccurate
premise. Recommend: either scope Phase 4 to backend/production-release
concerns that don't depend on every page being redesigned, or treat
"redesign the remaining 12 modules using this phase's Todo as the reference
pattern" as explicit, still-open work first.
