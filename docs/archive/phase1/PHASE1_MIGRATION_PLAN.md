# PHASE 1 — MIGRATION PLAN

## Non-Negotiables

- **Legacy is source of truth for UI/UX/features.** Every feature, edge case, and data shape present in the vanilla JS app must be reproduced faithfully before the legacy page is retired.
- **React project is source of truth for architecture.** New code follows the React + Vite + TypeScript conventions established in `MyLife-React/`. No new vanilla JS files are added to the legacy tree.
- **No destructive changes to legacy until React version is verified.** Legacy pages, repositories, and services remain untouched until the corresponding React page passes all acceptance criteria and is deployed.
- **No user data loss.** All Firestore collections and localStorage keys documented in the data-layer audit are preserved and migrated with full fidelity. Data-shape mismatches are resolved by adapter layers, never by dropping fields.
- **Never commit `.env` or credentials.** `.env.local` stays in `.gitignore`. CI uses injected secrets only.

---

## Migration Strategy: Parallel Development + Cutover

The legacy app (`MyLife/`) and the React app (`MyLife/MyLife-React/`) run from the same Firebase project (`momentum-6bb1d`). Both read and write to the same Firestore collections and the same localStorage keys. This means:

1. A user can switch between the legacy URL and the React URL at any time without data loss.
2. React feature pages can be validated against real user data before the legacy page is retired.
3. Cutover is a routing change, not a data migration.

The migration proceeds page-by-page. Each phase ends with a verified, shippable React page. The legacy page is retired only after its React replacement passes the Definition of Done checklist.

---

## Phase 2: Foundation

**Goal:** Fix the structural bugs identified in the React audit so that every subsequent phase builds on a solid base.

Tasks:
- Move `import React from 'react'` in `Header.tsx` to line 1.
- Rename `div.app-shell-main` → `div.main` and `main.app-shell-content` → `main.page-content` in `AppShell.tsx` to match the layout rules in `globals.css`.
- Add `.app-loading-container` CSS rule to `globals.css`.
- Extend `ThemeProvider` to expose all 8 theme tokens (`light`, `dark`, `system`, `earth`, `mars`, `saturn`, `neptune`, `nebula`, `galaxy`) and wire the selector in `Header.tsx`.
- Remove the duplicate login-page responsive rules from either `globals.css` or `auth.css`.
- Scaffold empty directories: `src/hooks/`, `src/utils/`, `src/repositories/`, `src/components/navigation/`, `src/components/common/`.

Est. days: 1

---

## Phase 3: Auth

**Goal:** Complete, production-ready authentication with feature parity to `js/pages/auth-firebase.js` and `js/pages/auth-oauth.js`.

Tasks:
- Wire `Login.tsx` sign-in form to `AuthService.signIn()`.
- Add `Register.tsx` using `RegisterCredentials` type and `AuthService.register()`.
- Add `ForgotPassword.tsx` using `AuthService.sendPasswordReset()`.
- Implement Google and GitHub OAuth via `AuthService.signInWithProvider()`.
- Add `mousemove` listener in `Login.tsx` to set `--mx`/`--my` CSS variables for the cursor-glow effect.
- Add routing: `/login`, `/register`, `/forgot-password`, protected `/*` redirect.
- Wire `AuthProvider` context so `signOut` and `currentUser` are available throughout the shell.

Est. days: 3

---

## Phase 4: App Shell

**Goal:** Fully functional, responsive shell with 13-item navigation, matching the legacy `shared.js` chrome.

Tasks:
- Replace `<a href="#">` anchors in `Sidebar.tsx` with React Router `<Link>` components.
- Add all 13 nav items with icons and active-state highlighting via `useLocation`.
- Wire `onToggle` prop in `Sidebar.tsx`.
- Add CSS for `sidebar-open`/`sidebar-closed` transitions.
- Implement `Header.tsx`: user avatar, notification bell (count badge), theme selector (all 8 themes), language switcher (EN/AR/FR/DE), RTL layout toggle.
- Responsive behavior: sidebar collapses to overlay on mobile, persistent on desktop (matching legacy breakpoints).
- Connect `i18next` (see Phase 17) for translation keys, falling back to English literals for phases 3–16.

Est. days: 2

---

## Phase 5: Dashboard

**Goal:** Functional dashboard with the same 17 widget types as `js/dashboard-widget-defs.js`, powered by `RepoAggregatorSync`.

Tasks:
- Replace `Dashboard.tsx` placeholder with real implementation.
- Port `DashboardLayoutService` read/write to a React hook (`useDashboardLayout`).
- Port `RepoAggregatorSync` to a React context (`DataContext`) that lazy-subscribes to Firestore collections as widgets mount.
- Implement all 17 widget types. Fix the data-shape bugs identified in the audit:
  - Prayer widget: read from `prayers/{uid}/items` array, not the old boolean-value object.
  - Workout widget: read `session.title || session.type`, not `w.name || w.title`.
  - Water widget: read `entry.glasses`, not `w.amount || w.cups`.
  - Statistics widget: guard against `undefined` before calling `.filter`.
- Implement drag-to-reorder and resize (port `js/pages/custom-dashboard.js` grid logic).
- Pomodoro widget: self-contained 25-min countdown with start/pause/reset.
- Weather widget: use `WeatherService` + `WeatherCacheService`; clear the 30-min interval on widget unmount.

Est. days: 4

---

## Phase 6–16: Feature Pages

Each phase ports one feature page from legacy to React. The React page must reach feature parity before the legacy page URL is retired. Pages are sequenced by dependency depth (lowest-dependency first).

| Phase | Page | Est. Days | Complexity | Dependencies |
|---|---|---|---|---|
| 6 | Todo | 5 | High | TodoRepository, NotificationRepository, UndoManager |
| 7 | Habits | 3 | Medium | HabitRepository |
| 8 | Goals | 2 | Low | GoalRepository |
| 9 | Prayer | 5 | High | PrayerRepository, QuranService, AzkarService, HadithService stub, 6 additional repos |
| 10 | Nutrition | 4 | High | 6 repos (nutrition/water/sleep/body/shopping/settings), fix malformed HTML buttons |
| 11 | Workout | 5 | High | WorkoutRepository, BodyMeasurementsRepository, ProgressPhotoRepository; fix timer-leak in disposeWorkoutPage; fix appData split-brain for workout plan |
| 12 | Study | 5 | High | 8 repos, Pomodoro timer, Focus Mode overlay, achievement badges |
| 13 | Calendar | 5 | High | CalendarRepository + 5 cross-module repos, bidirectional sync, repeat rules |
| 14 | Statistics | 3 | Medium | RepoAggregatorSync (full), all repos read-only |
| 15 | Weather | 2 | Low | WeatherService, WeatherCacheService, WeatherLocationService, WeatherPreferencesRepository |
| 16 | Account / Settings | 4 | High | ProfileRepository, SettingsRepository, SecurityRepository, ImageService, AuthService, UserService, OAuth provider linking |

**Cross-cutting work per phase:**
- Fix any data-shape mismatches identified in the feature JS audit.
- Replace `window.confirm()` calls with React modal dialogs.
- Replace `setInterval` timers with `useEffect` cleanup.
- Replace `window.currentData` globals with `DataContext`.
- Replace `window.addNotification` global with a `useNotifications` hook.

---

## Phase 17: i18n + RTL

**Goal:** Full four-locale support matching `locales/ar.js`, `locales/fr.js`, `locales/de.js`, `locales/en.js`.

Tasks:
- Install `i18next` and `react-i18next`. Convert locale files from `window.MOMENTUM_LOCALES` format to i18next JSON namespaces.
- Replace all hardcoded strings in components with `t()` calls.
- Arabic RTL: apply `dir="rtl"` to `<html>` when `lang === 'ar'`; load Noto Sans Arabic via Google Fonts or bundled subset.
- Test all 130+ translation keys across 4 locales.
- Validate `formatDateLocalized` covers all 4 locales without silent `en-US` fallback.
- Remove `data-i18n-html` pattern (XSS risk from legacy `i18n.js`) — all translated content goes through `t()` which returns plain text.

Est. days: 3

---

## Phase 18: Gamification + Notifications

**Goal:** Port `GamificationEngine.js`, `gamification-ui.js`, and `notification-center.js` to React.

Tasks:
- Port `GamificationEngine.recordEvent()` to a React service; dispatch `mylife:xp-awarded`, `mylife:level-up`, `mylife:achievement-unlocked` as React context events.
- Port XP pop, level-up banner (24-span confetti), and achievement card animations from `gamification-ui.js` to a `GamificationOverlay` component with proper cleanup on unmount.
- Port `notification-center.js` to `NotificationCenter` component:
  - Remove the `window.refreshChrome` monkey-patch; use React state instead.
  - Fix hardcoded English group labels ('Today'/'Yesterday'/'Earlier') — route through `t()`.
- Wire `GamificationEngine` calls into each feature page on relevant user actions (see `XP_AWARDS` table in `GamificationEngine.js`).
- `computeAchievements` in `study.js` currently recalculates locally on every render; in React, write earned achievements to `achievements/{uid}/items` so they sync across devices.

Est. days: 3

---

## Phase 19: PWA + Service Worker

**Goal:** Restore PWA capabilities from `manifest.json` in the React build.

Tasks:
- Configure `vite-plugin-pwa` with the existing manifest metadata (name, short name, start URL, icons, shortcuts).
- Service worker: cache static assets and Quran JSON data (`data/quran/`) for offline reading.
- Offline fallback page for network-dependent features (weather, Firestore writes queued).
- Test install prompt on Android Chrome and iOS Safari.

Est. days: 2

---

## Phase 20: Testing

**Goal:** Sufficient automated coverage to gate the cutover with confidence.

Tasks:
- Playwright end-to-end: login, each feature page CRUD flow, dashboard widget interactions.
- Visual regression: screenshot each page in EN/AR (RTL) at 375px mobile and 1280px desktop.
- Performance baseline: Lighthouse CI on dashboard, todo, prayer pages. Target LCP < 2.5s, TBT < 200ms.
- Unit tests (Vitest) for: `GamificationEngine` XP/level formulas, `BaseRepository` dedup guard, `i18n` `t()` fallback behavior, calendar `addMonthsClamped` fix.
- Increase Playwright `workers` from 1 to 4 for local dev runs once the suite is stable.

Est. days: 4

---

## Phase 21: Migration Cutover

**Goal:** Route production traffic from legacy pages to React pages with zero data loss and a tested rollback path.

Steps:
1. **Backup.** Export a full Firestore backup for `momentum-6bb1d` via `gcloud firestore export`. Download a personal data export for the primary test account.
2. **Smoke test.** Run the full Playwright suite against the React build in staging. All tests must pass.
3. **Shadow period (1 week).** Deploy the React app alongside the legacy app. Primary account uses React app exclusively. Monitor Firestore for unexpected writes or missing fields.
4. **DNS/routing cutover.** Update Firebase Hosting rewrites to serve `MyLife-React/dist/` for all routes. Legacy HTML pages remain on disk but are no longer the default target.
5. **Verification.** Re-run Lighthouse CI and the Playwright suite against the production URL.
6. **Rollback plan.** Revert the Firebase Hosting rewrite rule to restore legacy pages within minutes. No Firestore data is deleted at cutover — rollback is always safe.
7. **Legacy retirement.** After 30 days of stable production operation, open a PR to delete the legacy HTML/JS files. Do not delete until all feature pages have passed the Definition of Done.

Est. days: 3 (cutover week) + 30 days observation window

---

## Critical Path

The following sequence is strictly ordered — each phase blocks the next:

```
Phase 2 (Foundation fixes)
  → Phase 3 (Auth)
    → Phase 4 (App Shell)
      → Phase 5 (Dashboard)
        → Phases 6–16 (Feature pages, parallelizable per page)
          → Phase 17 (i18n — must follow all feature pages)
            → Phase 18 (Gamification — depends on all feature pages firing events)
              → Phase 19 (PWA)
                → Phase 20 (Testing)
                  → Phase 21 (Cutover)
```

Phases 6–16 can be worked in parallel by different contributors as long as `DataContext` (Phase 5 output) is stable.

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Workout plan data loss (plan is in localStorage/appData, not per-module Firestore) | High | High | In Phase 11, write a one-time migration that reads `appData.workoutPlan` and writes it to a new `workoutPlan/{uid}` Firestore document before retiring the localStorage path. |
| Prayer times always wrong (hardcoded strings) | High | Medium | In Phase 9, integrate AlAdhan API or `adhan-js` library for calculated prayer times by location. Hardcoded fallback is kept only when location is unavailable. |
| Dashboard widget data-shape mismatches cause silent zeros | High | Medium | Each widget has a dedicated integration test that asserts non-zero values against a seeded Firestore test account before Phase 21. |
| `reconcileSourceLinkedEvents` in `calendar.js` produces excessive Firestore writes | Medium | High | In Phase 13, implement a field-level diff before writing; batch all changes from a single reconcile pass into one `batchUpdate` call. |
| Locale files fail to load (404, parse error) silently | Low | Medium | In Phase 17, add a `window.onerror` handler for locale script tags that surfaces a visible "Translation unavailable" banner in dev mode and logs to Sentry in production. |
| `gamification-ui.js` runs before DOMContentLoaded, `document.body` is null | Low | Low | In Phase 18, replace `document.body.appendChild` with a React portal; the race condition is eliminated. |
| `.env.local` committed accidentally | Low | Critical | Add a pre-commit hook (husky + `detect-secrets`) that blocks commits containing Firebase API key patterns. |
| Firestore billing spike during shadow period (double-write) | Medium | Medium | Shadow period is read-only for legacy app — legacy pages serve as fallback, not as active writers, during the shadow period. |
| Multi-device workout plan divergence (localStorage-only) | High | Medium | Document known limitation in Phase 11 release notes; full fix is the Phase 11 Firestore migration. |
| XSS via `data-i18n-html` in legacy app | Low | High | Not patched in legacy (out of scope). Eliminated in React by routing all translations through `t()`. |

---

## Estimated Total Timeline

| Phase | Description | Duration |
|---|---|---|
| 2 | Foundation fixes | 1 day |
| 3 | Auth | 3 days |
| 4 | App Shell | 2 days |
| 5 | Dashboard | 4 days |
| 6 | Todo page | 5 days |
| 7 | Habits page | 3 days |
| 8 | Goals page | 2 days |
| 9 | Prayer page | 5 days |
| 10 | Nutrition page | 4 days |
| 11 | Workout page | 5 days |
| 12 | Study page | 5 days |
| 13 | Calendar page | 5 days |
| 14 | Statistics page | 3 days |
| 15 | Weather page | 2 days |
| 16 | Account / Settings page | 4 days |
| 17 | i18n + RTL | 3 days |
| 18 | Gamification + Notifications | 3 days |
| 19 | PWA + Service Worker | 2 days |
| 20 | Testing | 4 days |
| 21 | Migration Cutover + Observation | 3 days + 30 days |
| **Total** | | **~65 active working days** |

Phases 6–16 can be parallelized across contributors, reducing calendar time to approximately 6–8 weeks of elapsed time if two contributors work in parallel.

---

## Definition of Done

A phase is complete and its legacy page eligible for retirement when all of the following are true:

- [ ] All features listed in the legacy feature JS audit for that page are implemented in React.
- [ ] All data fields written by the legacy page are written identically by the React page (no field renames, no dropped fields).
- [ ] All Firestore subscriptions are cleaned up on component unmount (no timer or subscription leaks).
- [ ] No `window.` globals are used — all shared state goes through React context or hooks.
- [ ] All UI strings are routed through `t()` (EN/AR/FR/DE all render without missing-key fallback).
- [ ] The page renders correctly in Arabic RTL layout at 375px mobile viewport.
- [ ] Lighthouse CI scores: Performance >= 85, Accessibility >= 95, Best Practices >= 90.
- [ ] All Playwright end-to-end tests for that page pass on Chromium.
- [ ] The React page has been tested against real Firestore data in the shadow period for at least 48 hours without data errors.
- [ ] A code review by a second contributor has approved the PR.
- [ ] `.env.local` is not referenced or hardcoded anywhere in the committed code.
