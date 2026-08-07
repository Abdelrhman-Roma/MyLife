# SETTINGS_MIGRATION.md

## Repository

`SettingsRepository` (`SingletonDocRepository`, `settings/{uid}`).

## The theme-instant-load requirement — already solved before this phase, verified not broken by it

Your brief was explicit: theme must never wait for Firebase. Investigating this before touching anything, I found the codebase already implements exactly the pattern your brief describes, independently of `currentData`/Firestore:

- `js/i18n.js`'s `initI18n()` — called at the very top of every page, before `bootShell()`, before any repository could possibly resolve — applies theme instantly from `localStorage.getItem('mylife.theme')`/`'mylife.palette'`.
- `js/shared.js`'s `applyTheme()` — called later, once real settings data is available — writes the resolved theme back to those same `localStorage` keys as an updated cache for the *next* load.

This means the "localStorage → instant apply → Firestore sync → realtime update" flow your brief asks for already existed, just not yet connected to Firestore for the sync/realtime part. I did not touch `initI18n()` or the localStorage caching — only made sure `applyTheme()` keeps getting called with the right values once Settings is Firestore-backed, which happens automatically since it already reads from `currentData.settings.theme`, now populated by `SettingsRepository`'s subscription.

## Fields migrated

Theme, palette (via `applyTheme()`), all appearance toggles (`applyAppearance()` — the generic key/value toggle path already used by the settings UI), macro-nutrient targets (`calorieTarget`/`proteinTarget`/`carbTarget`/`fatTarget`), and the generic notification-related settings toggles that route through the same key/value path as appearance.

**One thing deliberately not migrated: the notification *preference* toggles specifically** (task/habit/workout/etc. mute switches). This is the confirmed split-brain bug from an earlier session's audit — those toggles write to a field (`currentData.notifications`) that the real notification system (`js/notification-center.js`, reading `UserService`'s `notificationSettings`) never reads. Migrating the *storage* of a field nothing reads doesn't fix the underlying bug; it just moves a broken wire to a nicer-looking junction box. Left it exactly as documented in the earlier audit rather than paper over it with a data-source swap that looks like progress but isn't.

## Dashboard/Statistics

Same as Profile — `RepoAggregatorSync` now subscribes to `SettingsRepository`, since `getCounts()`, `renderDashboard()`, `renderStatistics()`, the sidebar theme toggle, and the Nutrition summary cards all read `currentData.settings` directly (water/sleep/prayer goals, macro targets, theme). Verified by grepping every `currentData.settings.*` reference in `js/shared.js` before considering this done — 20+ read sites, all now fed correctly regardless of which page the user visited first.

## Macro goals form (Nutrition page)

`js/nutrition.js`'s macro-target form (`data-health-goals-form`) also writes through `SettingsRepository` — both pages write the same underlying `settings/{uid}` document, and Nutrition's own subscription exists so a macro-target edit made on the Account page shows up there too, not just the reverse. Confirmed zero remaining `persist()` calls in `js/nutrition.js`.
