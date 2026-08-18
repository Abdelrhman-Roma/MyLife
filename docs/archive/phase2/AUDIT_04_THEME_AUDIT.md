# AUDIT 04 — THEME AUDIT
> Comparison of the 8 original `[data-palette]` palettes vs React `[data-theme]` implementation

## Attribute Name Mismatch

The original app uses `data-palette` on `<html>` or `<body>` to switch themes.
React uses `data-theme`. This is a breaking divergence — any JS, CSS, or test code targeting `[data-palette]` will not apply in React.

**Original:** `document.documentElement.setAttribute('data-palette', 'deep-space')`  
**React:** `document.documentElement.setAttribute('data-theme', 'deep-space')`

## Theme Coverage

| Theme name | Original key | React key | Defined? |
|---|---|---|---|
| Deep Space | `data-palette='deep-space'` | `:root` (default) | ✅ Implicitly default |
| Solar Light | `data-palette='solar-light'` | `data-theme='light'` | ⚠️ Renamed — loses multi-theme dark+light coexistence |
| Earth | `data-palette='earth'` | `data-theme='earth'` | ⚠️ Defined but color values differ |
| Mars | `data-palette='mars'` | `data-theme='mars'` | ⚠️ Defined but color values differ |
| Saturn | `data-palette='saturn'` | `data-theme='saturn'` | ⚠️ Defined but color values differ |
| Neptune | `data-palette='neptune'` | `data-theme='neptune'` | ⚠️ Defined but color values differ |
| Nebula | `data-palette='nebula'` | `data-theme='nebula'` | ⚠️ Defined but color values differ |
| Galaxy | `data-palette='galaxy'` | `data-theme='galaxy'` | ⚠️ Defined but color values differ |

## Per-Theme Color Delta

### Deep Space (default)

| Token | Original | React | Delta |
|---|---|---|---|
| `--blue` | `#22d3ee` | `#78b8ff` | ❌ Cyan → periwinkle — visually different |
| `--green` | `#6ee7c8` | `#71ddbd` | ⚠️ Close |
| `--purple` | `#b9a6ff` | `#bda5ff` | ⚠️ Close |
| `--orange` | `#ffcf7a` | `#ffd078` | ⚠️ Close |
| `--red` | `#ff8fa3` | `#ff909c` | ⚠️ Close |
| `--on-nav` | `#f7f9ff` | ❌ missing | ❌ |

### Solar Light

Original `[data-palette='solar-light']` has its own full token set with **non-transparent surfaces**:
- `--surface: #ffffff` (opaque)
- `--surface-2: #eef4ff`
- `--line: #dde6f5` (opaque)
- `--blue: #2563eb`

React `[data-theme='light']` uses partially overlapping values but:
- `--surface: rgba(220,230,245,0.85)` (semi-transparent — wrong for light theme)
- `--blue: #2563eb` ✅

This means the light theme in React applies a glassmorphism effect that the original explicitly removes for the light palette.

### Earth

| Token | Original | React | Delta |
|---|---|---|---|
| `--surface` | `rgba(10,34,40,.8)` | `rgba(10,35,61,0.78)` | ❌ Wrong hue — original is teal-green tinted |
| `--surface-2` | `rgba(15,48,53,.72)` | `rgba(15,40,70,0.72)` | ❌ Same — wrong hue |
| `--ink` | `#eafdf6` | `#e0f2f7` | ⚠️ Close |
| `--muted` | `#9fc9bf` | `#8db5d0` | ⚠️ Slightly off |
| `--blue` | `#38bdf8` | `#38bdf8` | ✅ |
| `--focus-ring` | `rgba(52,211,153,.42)` | not defined | ❌ Missing |
| `--danger-bg` | `rgba(248,113,113,.14)` | not defined | ❌ Missing |

### Mars

| Token | Original | React | Delta |
|---|---|---|---|
| `--surface` | `rgba(48,18,14,.82)` | `rgba(87,32,20,0.78)` | ❌ Brighter than original |
| `--blue` | `#7fb8e8` | `#f97316` | ❌ Original has a cool steel-blue; React maps the orange accent as --blue |
| `--green` | `#8fce9e` | `#ec4899` | ❌ Completely wrong — React uses hot pink |
| `--orange` | `#f97316` | `#fbbf24` | ❌ Original orange is the primary; React's is gold |

Mars theme is the most divergent. The original intentionally keeps a steel-blue as `--blue` even in the warm mars palette, preserving color-role semantics. React swapped them.

### Saturn

| Token | Original | React | Delta |
|---|---|---|---|
| `--blue` | `#7ea6d6` | `#facc15` | ❌ Same semantic swap as Mars — React uses golden as --blue |
| `--green` | `#a8cf9a` | `#e8846a` | ❌ Wrong |
| `--orange` | `#facc15` | `#f97316` | ❌ Wrong |
| `--red` | `#e8846a` | `#f87171` | ⚠️ Different shade |

### Neptune

| Token | Original | React | Delta |
|---|---|---|---|
| `--surface` | `rgba(12,30,52,.8)` | `rgba(10,31,54,0.78)` | ⚠️ Very close |
| `--blue` | `#2dd4bf` | `#2dd4bf` | ✅ |
| `--orange` | `#f0b860` | `#fbbf24` | ⚠️ Different gold |

Neptune is the most faithful translation (aside from missing tokens).

### Nebula

| Token | Original | React | Delta |
|---|---|---|---|
| `--surface` | `rgba(38,18,52,.82)` | `rgba(40,20,50,0.78)` | ⚠️ Close |
| `--blue` | `#a78bfa` | `#c084fc` | ⚠️ Note: original `--blue` is violet; React swapped `--blue`/`--purple` |
| `--purple` | `#c084fc` | `#a78bfa` | ⚠️ Swapped |

### Galaxy

| Token | Original | React | Delta |
|---|---|---|---|
| `--surface` | `rgba(16,20,48,.8)` | `rgba(15,20,50,0.78)` | ⚠️ Close |
| `--blue` | `#60a5fa` | `#60a5fa` | ✅ |
| `--orange` | `#fbbf7a` | `#fbbf24` | ⚠️ Different shade |

## Missing Per-Theme Tokens

Every theme in the original defines these tokens that are missing from all React themes:

- `--on-nav` — text color used on the dark navigation sidebar; needed for sidebar labels and icons to remain readable across themes
- `--danger-bg` — tinted background for error/danger banners; varies per theme to harmonize with that theme's palette
- `--focus-ring` — custom focus ring color matching that theme's primary accent; React uses a fixed global value

## Theme Switching Architecture

| Concern | Original | React | Gap |
|---|---|---|---|
| Attribute | `data-palette` | `data-theme` | ❌ Name mismatch |
| Target element | `<html>` or `<body>` | `<html>` via `document.documentElement` | ✅ Same element |
| Settings page integration | Appearance panel in Settings page | ThemeContext + `data-theme` | ⚠️ Works but doesn't expose 8 palette choices in UI |
| Persistence | `localStorage.getItem('palette')` | `localStorage.getItem('theme')` | ⚠️ Different keys |
| System theme | Not tracked (manual toggle only) | `data-theme='system'` + `@media prefers-color-scheme` | ⚠️ React added system-follow that original doesn't have |

##    Résumé

- Themes defined: 8/8 ✅
- Themes with correct color values: 2/8 (Neptune, Galaxy are close; all others have significant delta)
- Missing per-theme tokens: 3 tokens × 8 themes = 24 missing token definitions
- Critical: `--on-nav` missing causes sidebar text to be wrong color on all non-default themes
- Critical: Mars and Saturn have semantically swapped accent roles (`--blue` mapped to warm accent instead of cool)
- Architecture: `data-palette` → `data-theme` rename must be consistent across all JS, CSS, and localStorage keys
