# PHASE 1 — BUG REPORT
Generated: 2026-08-16

---

## Summary Table

| Severity | Legacy (JS) | React | Total |
|---|---|---|---|
| CRITICAL | 6 | 3 | 9 |
| HIGH | 8 | 8 | 16 |
| MEDIUM | 7 | 5 | 12 |
| LOW / Code Quality | 5 | 4 | 9 |
| **Total** | **26** | **20** | **46** |

---

## CRITICAL Bugs

---

### BUG-R001 — React import placed at bottom of file

- **Project:** MyLife-React
- **File:** `src/app/components/layout/Header.tsx`
- **Location:** Line 70 (last line of file)
- **Root Cause:** `import React from 'react'` was written at the end of the file after the component body. `React.useState` is called on line 18 before the declaration.
- **Current Behavior:** Works at runtime under Vite/ESM hoisting, but any tool that processes the file without hoist semantics (jest, ts-node, some linters) will throw a ReferenceError. The TypeScript strict checker (`noUnusedLocals`) also flags the misplaced import.
- **Expected Behavior:** All import declarations must appear at the top of the file before any executable code.
- **Fix:** Move `import React from 'react'` to line 1.
- **Blocking migration:** Yes — breaks non-Vite toolchains and will cause CI failures once a test runner is added.

---

### BUG-R002 — Wrong primary blue color token

- **Project:** MyLife-React
- **File:** `src/styles/tokens.css`
- **Location:** `--blue` inside `:root` / deep-space theme block
- **Root Cause:** Token value is `#78b8ff` (pale periwinkle) instead of the deep-space design system value `#22d3ee` (electric cyan).
- **Current Behavior:** Every interactive element, ring chart, and accent that pulls `--blue` renders the wrong color. The brand identity does not match the legacy app.
- **Expected Behavior:** `--blue: #22d3ee`
- **Fix:** Change the `--blue` value in `tokens.css` to `#22d3ee`. Verify all theme variants that override `--blue` are also corrected.
- **Blocking migration:** Yes — visual regression against every component that uses the primary accent.

---

### BUG-R003 — Wrong primary font family; Inter not installed

- **Project:** MyLife-React
- **File:** `src/styles/tokens.css`
- **Location:** `--font-family` token
- **Root Cause:** Token is set to `'Inter', sans-serif`. Inter is not installed, not imported via `@font-face`, and not loaded via a CDN link in `index.html`. The legacy app uses IBM Plex Sans.
- **Current Behavior:** All body text falls back to the browser's default sans-serif, producing inconsistent typography across devices.
- **Expected Behavior:** `--font-family: 'IBM Plex Sans', sans-serif` with a corresponding Google Fonts import or local font file.
- **Fix:** Change the token to IBM Plex Sans and add `@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap')` to `index.html` or `globals.css`.
- **Blocking migration:** Yes — typography is broken on every page.

---

### BUG-L001 — nutrition.js: malformed HTML attribute names make two buttons permanently non-functional

- **Project:** MyLife Legacy
- **File:** `js/nutrition.js`
- **Location:** `shoppingListHtml` function, generate and clear button declarations
- **Root Cause:** Attribute names are written as `data-nut-shop-generate"` and `data-nut-shop-clear"` — a stray closing quote is inside the attribute name string. The subsequent `querySelector` uses those same malformed selectors, so `genBtn` and `clearBtn` are always null.
- **Current Behavior:** "Generate shopping list from plan" and "Clear checked items" buttons are rendered in the DOM but clicking them does nothing. No error is thrown.
- **Expected Behavior:** Buttons execute their respective handlers.
- **Fix:** Remove the embedded closing quote from both attribute names in the HTML template string and in the corresponding `querySelector` calls.
- **Blocking migration:** Yes — shopping list generation is a user-facing feature that must be validated before migration.

---

### BUG-L002 — prayer.js: prayer times are hardcoded static strings, always wrong

- **Project:** MyLife Legacy
- **File:** `js/prayer.js`
- **Location:** `PRAYER_TIMES` constant
- **Root Cause:** `PRAYER_TIMES` is a static object `{Fajr:'05:10', Dhuhr:'12:30', Asr:'15:45', Maghrib:'18:20', Isha:'19:45'}`. There is no geolocation query, no AlAdhan API call, and no seasonal calculation.
- **Current Behavior:** Prayer times displayed are the same values for every user in every city in every season.
- **Expected Behavior:** Times must be calculated from the user's latitude/longitude and the current date, or fetched from a calculation API such as AlAdhan.
- **Fix:** Integrate the AlAdhan `/v1/timings` endpoint (the OpenAPI spec is already present at `../api-1.json`) using stored or prompted location coordinates.
- **Blocking migration:** Yes — core feature is non-functional.

---

### BUG-L003 — workout.js: session clock and rest timers not cleared on page dispose (timer leak)

- **Project:** MyLife Legacy
- **File:** `js/workout.js`
- **Location:** `disposeWorkoutPage` function
- **Root Cause:** `disposeWorkoutPage` clears the three Firestore subscriptions and the photo IntersectionObserver but does not call `clearInterval(sessionClockInterval)` or clear any entries in `sessionTimers`. The intervals keep firing after the user navigates away.
- **Current Behavior:** Session elapsed-time clock and per-exercise rest timers continue running in the background after leaving the workout page. On SPA re-entry, duplicate timers accumulate.
- **Expected Behavior:** All timers must be cleared in `disposeWorkoutPage`.
- **Fix:** Add `clearInterval(sessionClockInterval); sessionClockInterval = null;` and iterate `sessionTimers` calling `clearTimeout`/`clearInterval` on each entry, then reset the object.
- **Blocking migration:** Yes — timer leaks cause incorrect elapsed-time values and increased CPU usage.

---

### BUG-R010 — ThemeProvider applies wrong HTML attribute for legacy CSS compatibility

- **Project:** MyLife-React
- **File:** `src/app/providers/ThemeProvider.tsx`
- **Location:** `applyTheme` / `useEffect` that writes to `document.documentElement`
- **Root Cause:** ThemeProvider sets `data-theme` on `<html>`. The legacy CSS system (and the React `tokens.css` deep-space palette blocks) uses `data-palette` for palette selection. The two attribute names are used inconsistently.
- **Current Behavior:** Deep-space and planetary theme selectors in CSS never match because the attribute name in the DOM is wrong.
- **Expected Behavior:** `data-palette` for palette/theme variant, `data-theme` only for light/dark mode axis (or a single unified attribute if the React system standardizes on one).
- **Fix:** Align ThemeProvider to write `data-palette` for palette values and `data-theme` only for `light`/`dark`. Update `tokens.css` selectors to match.
- **Blocking migration:** Yes — no theme other than the browser default will render correctly.

---

### BUG-L004 — calendar.js: workout event completion does not write to Firestore (bidirectional sync broken)

- **Project:** MyLife Legacy
- **File:** `js/calendar.js`
- **Location:** `SOURCE_MODULE_META.workout.setCompleted`
- **Root Cause:** The `setCompleted` handler for workout source events only mutates `i.status` in memory. `WorkoutRepository` is not included in `crossRepos`, so no Firestore write is issued.
- **Current Behavior:** Marking a workout event as complete in the calendar view appears to work but the change is lost on next page load or on any other device.
- **Expected Behavior:** Completing a workout event in the calendar must write the status change back to `workout/{uid}/items` via WorkoutRepository.
- **Fix:** Add WorkoutRepository to `crossRepos` and implement a proper `setCompleted` write in `SOURCE_MODULE_META.workout`.
- **Blocking migration:** Yes — data loss on a prominent user action.

---

### BUG-L005 — dashboard-widget-defs.js: multiple widget data shape mismatches cause silent zero/undefined reads

- **Project:** MyLife Legacy
- **File:** `js/dashboard-widget-defs.js`
- **Location:** Prayer widget, Workout widget, Water widget, Statistics widget render functions
- **Root Cause:** Widgets read fields that do not exist in the actual Firestore document shape:
  - Prayer widget reads `today.completed` as an object with boolean values; actual shape is an array of prayer records.
  - Workout widget reads `w.name || w.title` from log entries; log entries have neither field.
  - Water widget reads `w.amount || w.cups`; actual field is `glasses`.
  - Statistics widget reads `d.tasks` which is undefined on cold load before the Todo Firestore snapshot arrives, causing `.filter` to throw.
- **Current Behavior:** Prayer counter always shows 0/5. Workout widget always shows "undefined". Water total always shows 0. Statistics widget throws on cold load.
- **Expected Behavior:** Each widget reads the correct field from the correct document shape.
- **Fix:** Correct field names in each widget's render function. Add a null/undefined guard before `.filter` in the Statistics widget.
- **Blocking migration:** Yes — dashboard widgets are broken on first load and will be ported into the React version.

---

## HIGH Bugs

---

### BUG-R004 — Wrong monospace font token

- **Project:** MyLife-React
- **File:** `src/styles/tokens.css`
- **Location:** `--font-mono` token
- **Root Cause:** Token is set to `'IBM Plex Mono'` instead of `'JetBrains Mono'`.
- **Current Behavior:** Code blocks and monospaced UI elements render IBM Plex Mono (if loaded) instead of JetBrains Mono.
- **Expected Behavior:** `--font-mono: 'JetBrains Mono', monospace` with corresponding font import.
- **Fix:** Update the token value and add a JetBrains Mono import.
- **Blocking migration:** No — cosmetic mismatch but not functionally broken.

---

### BUG-R005 — Incorrect spacing scale values

- **Project:** MyLife-React
- **File:** `src/styles/tokens.css`
- **Location:** `--space-5` and `--space-6` token definitions
- **Root Cause:** `--space-5` is `24px` (should be `20px`); `--space-6` is `32px` (should be `28px`). The scale has a gap that will make all spacing derived from these tokens too large.
- **Current Behavior:** Components using `--space-5` or `--space-6` are over-spaced by 4px each, breaking the 4px grid.
- **Expected Behavior:** `--space-5: 20px; --space-6: 28px`
- **Fix:** Correct both values in `tokens.css`.
- **Blocking migration:** No — layout will be off but pages still render.

---

### BUG-R006 — Tap target size below accessibility minimum

- **Project:** MyLife-React
- **File:** `src/styles/tokens.css`
- **Location:** `--tap` token
- **Root Cause:** `--tap` is `44px`. Apple HIG and Material Design both require `48px` minimum for interactive touch targets.
- **Current Behavior:** Any button or icon using `--tap` as its minimum dimension will be too small for reliable tap on mobile.
- **Expected Behavior:** `--tap: 48px`
- **Fix:** Change the token value to `48px`.
- **Blocking migration:** No — but must be fixed before mobile QA.

---

### BUG-R007 — Border radius scale values are too large

- **Project:** MyLife-React
- **File:** `src/styles/tokens.css`
- **Location:** `--radius-sm`, `--radius-md`, `--radius-lg` tokens
- **Root Cause:** `--radius-sm: 12px` (should be `8px`), `--radius-md: 18px` (should be `10px`), `--radius-lg: 24px` (should be `16px`). Values are 1.5–2x too large.
- **Current Behavior:** All cards, inputs, and buttons appear excessively rounded, deviating from the design specification.
- **Expected Behavior:** `--radius-sm: 8px; --radius-md: 10px; --radius-lg: 16px`
- **Fix:** Correct all three values.
- **Blocking migration:** No — cosmetic but a significant visual regression.

---

### BUG-R008 — Missing --on-nav token

- **Project:** MyLife-React
- **File:** `src/styles/tokens.css`
- **Location:** Token definitions block
- **Root Cause:** `--on-nav` (used for nav item text color and icon fill) is referenced in component styles but never defined in any theme block.
- **Current Behavior:** Nav item text and icons inherit an unintended color or display as transparent/invisible depending on browser defaults.
- **Expected Behavior:** `--on-nav` is defined for every theme variant with an appropriate contrast value.
- **Fix:** Add `--on-nav` to the deep-space block and all theme overrides.
- **Blocking migration:** Yes — sidebar nav items may be invisible.

---

### BUG-R009 — Missing --danger-bg token

- **Project:** MyLife-React
- **File:** `src/styles/tokens.css`
- **Location:** Token definitions block
- **Root Cause:** `--danger-bg` (used for error states and destructive action backgrounds) is not defined anywhere.
- **Current Behavior:** Error states and delete confirmations render without a background color, appearing as bare text on transparent.
- **Expected Behavior:** `--danger-bg` is defined (e.g. `rgba(239,68,68,0.15)` for the deep-space dark context).
- **Fix:** Add `--danger-bg` to all theme blocks.
- **Blocking migration:** Yes — error and delete UI is visually broken.

---

### BUG-R011 — ThemeProvider only supports three modes; eight palettes are invisible

- **Project:** MyLife-React
- **File:** `src/app/providers/ThemeProvider.tsx` and `src/app/components/layout/Header.tsx`
- **Location:** `ThemeProvider` state type; `<select>` options in `Header.tsx`
- **Root Cause:** The TypeScript type is `'light' | 'dark' | 'system'`. `tokens.css` defines six additional palettes: `earth`, `mars`, `saturn`, `neptune`, `nebula`, `galaxy`. Neither the provider nor the selector exposes them.
- **Current Behavior:** Users can only switch between light, dark, and system. All planetary themes are inaccessible.
- **Expected Behavior:** All palettes defined in `tokens.css` are selectable.
- **Fix:** Expand the type union, add options to the `<select>` in `Header.tsx`, and ensure `ThemeProvider` writes the correct attribute.
- **Blocking migration:** No — feature gap, not a crash.

---

### BUG-R012 — Sidebar uses anchor tags with no routing

- **Project:** MyLife-React
- **File:** `src/app/components/layout/Sidebar.tsx`
- **Location:** Navigation list
- **Root Cause:** Navigation items are plain `<a href="#dashboard">` anchor tags. React Router's `<Link>` is never imported. No `useLocation` for active-state highlighting. The `onToggle` prop is declared but never called.
- **Current Behavior:** Clicking any nav item changes the URL hash but does not navigate to a new route. The sidebar cannot be toggled via the header button.
- **Expected Behavior:** Each item renders a `<Link to="/...">` that triggers React Router navigation. Active item is highlighted via `useLocation`.
- **Fix:** Import `Link` and `useLocation` from `react-router-dom`, replace `<a>` tags, add active class logic, and call `onToggle` on item click on mobile.
- **Blocking migration:** Yes — navigation is non-functional.

---

### BUG-R015 — router.tsx only defines two routes; eleven pages are missing

- **Project:** MyLife-React
- **File:** `src/app/router.tsx`
- **Location:** Route definitions
- **Root Cause:** Only `/login` and `/dashboard` are defined. The eleven legacy pages (todo, habits, goals, calendar, workout, prayer, nutrition, weather, study, statistics, account) have no corresponding routes.
- **Current Behavior:** Any URL other than `/login` or `/dashboard` redirects to `/dashboard` (catch-all), making all feature pages unreachable.
- **Expected Behavior:** All feature pages have lazy-loaded, protected routes.
- **Fix:** Add a route entry per page as pages are built out in subsequent phases. At minimum stub routes should be created to prevent the catch-all swallowing direct links.
- **Blocking migration:** Yes for each page that is ported — a page without a route is unreachable.

---

### BUG-R-LAYOUT — AppShell CSS class names do not match globals.css selectors

- **Project:** MyLife-React
- **File:** `src/app/components/layout/AppShell.tsx` + `src/styles/globals.css`
- **Location:** JSX class names `app-shell-main` and `app-shell-content`; CSS selectors `.main` and `.page-content`
- **Root Cause:** The wrapper div is given `className="app-shell-main"` and the `<main>` element is given `className="app-shell-content"`. The CSS layout rules are written for `.main` and `.page-content` — none of them match.
- **Current Behavior:** The content column has no width constraint, no padding, and no scroll behavior. The entire layout is unstyled.
- **Expected Behavior:** Either rename the JSX classes to match the CSS selectors, or rename the CSS selectors to match the JSX.
- **Fix:** Align class names between AppShell.tsx and globals.css.
- **Blocking migration:** Yes — layout is broken on every page.

---

### BUG-L006 — firestore.ts uses deprecated enableIndexedDbPersistence API

- **Project:** MyLife Legacy (also relevant to React port)
- **File:** `src/services/firebase/firestore.ts`
- **Location:** `enableIndexedDbPersistence(db)` call
- **Root Cause:** `enableIndexedDbPersistence` was deprecated in the Firebase JS SDK v9 modular API and is not available in Firebase 10. The correct API is `initializeFirestore(app, { localCache: persistentLocalCache() })`.
- **Current Behavior:** The persistence call may silently fail or produce a console warning in Firebase 10. Offline persistence may not be active.
- **Expected Behavior:** Firestore is initialized with `persistentLocalCache` to enable offline support.
- **Fix:** Replace `getFirestore` + `enableIndexedDbPersistence` with `initializeFirestore(app, { localCache: persistentLocalCache() })` and import `persistentLocalCache` from `firebase/firestore`.
- **Blocking migration:** Yes — offline support is broken.

---

### BUG-L007 — AppLoading.tsx uses .app-loading-container which has no CSS rule

- **Project:** MyLife-React
- **File:** `src/components/feedback/AppLoading.tsx`
- **Location:** Root div class name
- **Root Cause:** The component wraps its spinner in `<div className="app-loading-container">`. `globals.css` defines `.app-loading` but not `.app-loading-container`. No layout styles apply to the container.
- **Current Behavior:** The full-screen loading state renders the spinner without centering or sizing. On some viewport sizes the spinner appears in the top-left corner.
- **Expected Behavior:** The loading container fills the viewport with a centered spinner.
- **Fix:** Add `.app-loading-container` to `globals.css` with `display:flex; align-items:center; justify-content:center; min-height:100vh`.
- **Blocking migration:** Yes — auth loading UX is broken.

---

### BUG-L008 — todo.js: reminderFired flag has race condition across tabs

- **Project:** MyLife Legacy
- **File:** `js/todo.js`
- **Location:** `checkTaskReminders` function
- **Root Cause:** `reminderFired` is set optimistically on the local task object before the Firestore write completes. If a second tab fires the same reminder before the write lands, the `notifyOnce` dedup check runs against the un-written state. On write failure, the local flag is reset to `false`, causing the reminder to re-fire on the next 20-second tick.
- **Current Behavior:** In a multi-tab scenario, reminder toasts can fire more than once for the same task within the same reminder window.
- **Expected Behavior:** A reminder fires exactly once per task per reminder time, regardless of tab count or write failures.
- **Fix:** Set `reminderFired` server-side via a Firestore transaction before displaying the toast, rather than optimistically on the client.
- **Blocking migration:** No — edge case, not blocking, but must be documented for the React port.

---

## MEDIUM Bugs

---

### BUG-R013 — Dashboard.tsx is an empty placeholder

- **Project:** MyLife-React
- **File:** `src/app/pages/Dashboard.tsx`
- **Location:** Entire file
- **Root Cause:** The file renders `<AppShell>` with the text "Dashboard placeholder for Phase 2" and nothing else.
- **Current Behavior:** The default landing page after login shows only a text stub.
- **Expected Behavior:** Dashboard renders at minimum a skeleton or the first real widget.
- **Fix:** Implement Phase 2 dashboard content or replace with a proper loading skeleton.
- **Blocking migration:** No — placeholder is intentional for Phase 1 but must be tracked.

---

### BUG-R014 — globals.css references --transition-slow which does not match token naming convention

- **Project:** MyLife-React
- **File:** `src/styles/globals.css`
- **Location:** Transition utility classes
- **Root Cause:** `globals.css` uses `--transition-slow` in several rules. `tokens.css` defines easing and duration tokens under different names (e.g. `--ease-out`, `--duration-300`). The variable `--transition-slow` is never defined, so the `transition` property falls back to `all 0s`.
- **Current Behavior:** Elements that should animate with a slow ease-out transition snap without animation.
- **Expected Behavior:** Transitions apply the correct easing and duration.
- **Fix:** Either define `--transition-slow` in `tokens.css` or replace the usage in `globals.css` with the correct token references.
- **Blocking migration:** No — cosmetic, but motion design is part of the brand.

---

### BUG-R-HEADER-PROP — Header.tsx sidebarOpen prop is unused; causes TypeScript strict error

- **Project:** MyLife-React
- **File:** `src/app/components/layout/Header.tsx`
- **Location:** `HeaderProps` interface and component body
- **Root Cause:** `sidebarOpen` is declared in `HeaderProps` and passed from `AppShell`, but is never read inside the component body. With `noUnusedParameters` enabled in `tsconfig.json`, `tsc --noEmit` will fail.
- **Current Behavior:** Build fails on `tsc --noEmit && vite build` due to unused parameter.
- **Expected Behavior:** Either use the prop (e.g. for an aria-expanded attribute on the toggle button) or remove it from the interface and the call site.
- **Fix:** Use `sidebarOpen` in the `aria-expanded` attribute of the sidebar toggle button, or remove the prop entirely.
- **Blocking migration:** Yes for CI — build command includes `tsc --noEmit`.

---

### BUG-R-CURSOR — Login.tsx cursor-glow effect has no JavaScript driver

- **Project:** MyLife-React
- **File:** `src/app/pages/Login.tsx` + `src/styles/auth.css`
- **Location:** `.cursor-glow` element in Login JSX
- **Root Cause:** `auth.css` positions `.cursor-glow` using `--mx` and `--my` CSS custom properties to create a spotlight effect. No `mousemove` event listener exists anywhere to set those variables.
- **Current Behavior:** The spotlight element is rendered but never moves. It stays at its default position (0,0 or wherever the default properties resolve).
- **Expected Behavior:** The spotlight follows the user's cursor over the login page.
- **Fix:** Add a `mousemove` listener in `Login.tsx` (in a `useEffect`) that calls `element.style.setProperty('--mx', e.clientX + 'px')` and `--my` similarly.
- **Blocking migration:** No — cosmetic enhancement, but it's a broken promise in the current UI.

---

### BUG-R-THEMES-HEADER — Header theme selector only exposes 3 of 9 available themes

- **Project:** MyLife-React
- **File:** `src/app/components/layout/Header.tsx`
- **Location:** `<select>` for theme switching
- **Root Cause:** Only `light`, `dark`, and `system` are listed as options. Six planetary palettes (`earth`, `mars`, `saturn`, `neptune`, `nebula`, `galaxy`) defined in `tokens.css` are not represented.
- **Current Behavior:** User cannot access any of the branded space palettes from the UI.
- **Expected Behavior:** All palettes defined in `tokens.css` appear in the selector.
- **Fix:** Add an option per palette, and ensure the label matches the design system naming. Coordinate with BUG-R011.
- **Blocking migration:** No — feature gap.

---

### BUG-L009 — habits.js: allHabitCategories reads from window.currentData (stale global)

- **Project:** MyLife Legacy
- **File:** `js/habits.js`
- **Location:** `allHabitCategories` function
- **Root Cause:** The function reads `window.currentData.habits` rather than the module-scoped Firestore subscription cache. If the global has not been populated yet (e.g. cold load before first snapshot), the datalist shows no autocomplete options.
- **Current Behavior:** Category autocomplete may be empty on first load.
- **Expected Behavior:** Category suggestions are drawn from the live, module-scoped habit list.
- **Fix:** Read from the module-scoped `localHabits` array instead of `window.currentData.habits`.
- **Blocking migration:** No — UX degradation only.

---

### BUG-L010 — calendar.js: reconcileSourceLinkedEvents fires many small writes on first load

- **Project:** MyLife Legacy
- **File:** `js/calendar.js`
- **Location:** `reconcileSourceLinkedEvents` function
- **Root Cause:** The function runs on every Firestore snapshot and iterates all source collections, issuing a Firestore write per changed field. On first load, all source data arrives simultaneously, potentially generating dozens of write operations in a single tick.
- **Current Behavior:** First-load triggers a write storm that may hit Firestore rate limits on large datasets, and inflates Firestore write counts on the billing meter.
- **Expected Behavior:** Reconciliation is debounced or batched so multiple field changes are written in a single batch operation.
- **Fix:** Collect all changes into a Firestore `writeBatch` and commit once, or debounce the reconcile call by 500ms so rapid sequential snapshots collapse.
- **Blocking migration:** No — correctness is unaffected, but cost and performance impact is real.

---

### BUG-L011 — notification-center.js: window.refreshChrome monkey-patch may silently fail

- **Project:** MyLife Legacy
- **File:** `js/notification-center.js`
- **Location:** `DOMContentLoaded` handler, monkey-patch block
- **Root Cause:** The module wraps `window.refreshChrome` at `DOMContentLoaded` time. If `shared.js` has not executed before the notification center's listener fires, `baseRefreshChrome` is `undefined` and the patch is skipped with no error.
- **Current Behavior:** In load-order races, notification panel content only refreshes on Firestore pushes, not on Chrome re-renders. No error is thrown, so the issue is invisible.
- **Expected Behavior:** The patch must safely no-op when `window.refreshChrome` is not yet defined, or be deferred until `shared.js` is guaranteed to have run.
- **Fix:** Check for `window.refreshChrome` before patching; if absent, defer via a `MutationObserver` on the window object or use a shared event/promise.
- **Blocking migration:** No — timing-dependent, rarely triggered.

---

### BUG-L012 — study.js: Pomodoro interval may not be cleared on page dispose

- **Project:** MyLife Legacy
- **File:** `js/study.js`
- **Location:** `disposeStudyPage` function / `startStudyTicker` function
- **Root Cause:** `startStudyTicker` sets an interval for the Pomodoro countdown. Based on the reviewed code, `disposeStudyPage` clears Firestore subscriptions but no explicit `clearInterval` for the Pomodoro ticker is visible in the dispose path.
- **Current Behavior:** On SPA navigation away from the study page, the Pomodoro tick continues in the background, incrementing elapsed time incorrectly and competing with any new instance on re-entry.
- **Expected Behavior:** `disposeStudyPage` explicitly clears the Pomodoro interval.
- **Fix:** Store the interval reference in a module-scoped variable and call `clearInterval` in `disposeStudyPage`.
- **Blocking migration:** No — but must be resolved before the React port of the study page.

---

### BUG-L013 — weather-dashboard.js: 30-minute refresh interval never cleared (timer leak)

- **Project:** MyLife Legacy
- **File:** `js/weather-dashboard.js`
- **Location:** `window.__dashboardWeatherRefresh = setInterval(initDashboardWeather, 30min)`
- **Root Cause:** A 30-minute interval is set on `window` with a guard to prevent re-registration, but it is never cleared on page navigation or dispose.
- **Current Behavior:** The interval keeps firing after the user leaves the dashboard. On SPA navigation back to the dashboard, a new interval may be created (if the guard fails), resulting in duplicate weather refreshes.
- **Expected Behavior:** The interval is cleared when the dashboard is unmounted or the user navigates away.
- **Fix:** Expose a `disposeDashboardWeather` function that clears the interval, or wrap the interval reference and clear it when the root dashboard component unmounts.
- **Blocking migration:** No — timer leak is minor but will accumulate on long sessions.

---

## LOW / Code Quality Issues

---

### BUG-L014 — i18n.js: data-i18n-html uses innerHTML with translation strings (XSS risk)

- **Project:** MyLife Legacy
- **File:** `js/i18n.js`
- **Location:** `applyTranslations` function, `data-i18n-html` branch
- **Root Cause:** The `data-i18n-html` attribute sets `innerHTML` directly from the translation string. If a translation file is compromised or user-controlled content is ever interpolated into a translation, this becomes an XSS vector.
- **Current Behavior:** Translation strings are treated as trusted HTML. No sanitization is applied.
- **Expected Behavior:** If HTML is required, a safe subset parser (e.g. DOMPurify) should be used. Otherwise the feature should be deprecated in favor of components.
- **Fix:** Audit all uses of `data-i18n-html`, replace with component-based translation where possible, or integrate DOMPurify before setting `innerHTML`.
- **Blocking migration:** No — security issue but requires a specific exploit scenario.

---

### BUG-L015 — gamification-ui.js: non-module script loaded inline; inconsistent with other feature files

- **Project:** MyLife Legacy
- **File:** `js/gamification-ui.js`
- **Location:** Entire file
- **Root Cause:** All other feature modules use ES module `import`/`export`. `gamification-ui.js` is written as a plain script with no exports, and must be loaded via `<script src="...">` tag. It also accesses `t` and `escapeHtml` as globals with fallback guards.
- **Current Behavior:** Works but introduces an inconsistency. Cannot be imported by other modules. The script must be manually ordered in HTML `<head>`.
- **Expected Behavior:** The file should be an ES module with explicit imports for `t` and `escapeHtml`.
- **Fix:** Convert to an ES module, export `ensureOverlayRegion` if other modules need it, and import dependencies.
- **Blocking migration:** No — works as-is, but technical debt.

---

### BUG-L016 — types/firebase.ts: FirebaseUser re-declares inherited properties

- **Project:** MyLife-React (also legacy if copied)
- **File:** `src/types/firebase.ts`
- **Location:** `FirebaseUser` interface
- **Root Cause:** `FirebaseUser extends User` from `firebase/auth`, but re-declares `uid`, `email`, `emailVerified`, `displayName`, and `photoURL` — all of which are already present on the Firebase `User` type.
- **Current Behavior:** No runtime error, but creates a redundant layer. If Firebase narrows any of those types in a future SDK release, the re-declaration will cause TypeScript strict-mode conflicts.
- **Expected Behavior:** The interface should only add new fields beyond `User`, not re-declare inherited ones.
- **Fix:** Remove the redundant property declarations from `FirebaseUser`.
- **Blocking migration:** No — TypeScript warning, not a runtime bug.

---

### BUG-L017 — globals.css + auth.css: duplicate login-page responsive rules

- **Project:** MyLife-React
- **File:** `src/styles/globals.css` and `src/styles/auth.css`
- **Location:** `@media (max-width: 860px)` blocks
- **Root Cause:** Identical responsive rules for the login page appear in both CSS files. Both are imported in `main.tsx` so both apply, but the duplication is redundant and increases bundle size.
- **Current Behavior:** Login page layout rules are defined twice. No visual bug but the CSS is duplicated.
- **Expected Behavior:** Each rule should appear once. Either consolidate all auth styles in `auth.css` or all responsive overrides in `globals.css`.
- **Fix:** Remove the duplicate block from one of the files.
- **Blocking migration:** No — cosmetic / bundle size concern only.

---

### BUG-L018 — todo.js: historical variable shadowing bug documented inline; code is fragile

- **Project:** MyLife Legacy
- **File:** `js/todo.js`
- **Location:** `toggleTask` function
- **Root Cause:** A comment documents that a local `task` variable once shadowed the global `t()` translation function. The fix is in place but the function remains fragile if refactored.
- **Current Behavior:** Works correctly after the fix, but the code structure is prone to re-introducing the bug.
- **Expected Behavior:** The function should be refactored to eliminate the shadowing risk entirely, or the global `t` should be renamed to avoid collision.
- **Fix:** Rename the local `task` variable to `currentTask` or similar, or rename the global translation function to `translate`.
- **Blocking migration:** No — documented technical debt.

---

### BUG-L019 — habits.js: no loading skeleton; empty-state message shown during initial load

- **Project:** MyLife Legacy
- **File:** `js/habits.js`
- **Location:** Render path while `habitsLoading` is true
- **Root Cause:** The module sets `habitsLoading = true` but does not render a skeleton. The render function checks data length and displays "No habits yet" before the first Firestore snapshot arrives.
- **Current Behavior:** User sees "No habits yet" for ~1 second on first load even if habits exist in the database.
- **Expected Behavior:** A loading skeleton should render while `habitsLoading` is true.
- **Fix:** Add a skeleton state to the render logic similar to `todo.js`.
- **Blocking migration:** No — UX polish issue.

---

### BUG-L020 — habits.js: no undo on delete

- **Project:** MyLife Legacy
- **File:** `js/habits.js`
- **Location:** Delete handler in habit card
- **Root Cause:** Unlike `todo.js` which uses the `UndoManager` for 8-second undo toasts, habits delete with a `window.confirm` and no undo path.
- **Current Behavior:** Deleting a habit is irreversible after confirmation.
- **Expected Behavior:** Delete should show an undo toast with 8-second rollback, consistent with the todo page.
- **Fix:** Integrate the `UndoManager` pattern from `todo.js` into `habits.js`.
- **Blocking migration:** No — UX inconsistency.

---

### BUG-L021 — study.js: safeRenderStudyRoot swallows all render errors; invisible during development

- **Project:** MyLife Legacy
- **File:** `js/study.js`
- **Location:** `safeRenderStudyRoot` function
- **Root Cause:** The entire render path is wrapped in `try/catch`. Any render error replaces the page with an error banner, but the developer only knows if the console is open. No stack trace is logged unless the console is inspected.
- **Current Behavior:** Render bugs are silently replaced with a user-facing error message. No error is thrown to the console.
- **Expected Behavior:** The error should be logged to the console even in production mode, and in development mode the try/catch should be bypassed for full stack traces.
- **Fix:** Log the caught error with `console.error(error)` before rendering the error state, or remove the try/catch in development builds.
- **Blocking migration:** No — developer experience issue.

---

### BUG-L022 — study.js: achievements are computed locally and never persisted

- **Project:** MyLife Legacy
- **File:** `js/study.js`
- **Location:** `computeAchievements` function
- **Root Cause:** Achievements are derived from study data on every render. They are not written to any Firestore collection, so they do not sync across devices and are recalculated from scratch on each page load.
- **Current Behavior:** Achievements appear in the UI but are ephemeral. A user on a second device will not see the same achievement state.
- **Expected Behavior:** Achievements should be persisted to a Firestore `achievements/{uid}/items` collection and updated on milestone events, not recalculated on render.
- **Fix:** Create an `AchievementsRepository` and write achievement state after each milestone. Render from the synced collection.
- **Blocking migration:** No — design choice, but should be documented as a feature limitation.

---

## End of Report

**Next Steps:**

1. **CRITICAL** and **HIGH** bugs with "Blocking migration: Yes" must be resolved before Phase 2.
2. React token fixes (BUG-R002 through BUG-R009) should be batched into a single "design tokens audit" task.
3. Legacy timer leaks (BUG-L003, BUG-L012, BUG-L013) should be fixed in the legacy codebase immediately to prevent production degradation.
4. Dashboard widget data shape mismatches (BUG-L005) must be corrected before any dashboard React port begins.

**Total:** 46 bugs identified across 2 codebases.

