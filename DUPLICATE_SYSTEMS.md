# DUPLICATE_SYSTEMS.md — Phase 2

Full inventory of every duplicate/potential-duplicate system found this phase, with disposition. "Merged" means actually consolidated this phase; "Marked" means confirmed real but deliberately deferred (see reasoning in ARCHITECTURE_CLEANUP_REPORT.md).

| # | System | Duplicate found? | Which version is live | Which is obsolete | Safe to delete now? | Disposition |
|---|---|---|---|---|---|---|
| 2 | Duplicate folders | No | — | — | — | Clean |
| 3 | Duplicate JS files (by filename) | 9 filename collisions, all false positives (bootstrap/module pattern, or unrelated files sharing a name) | Both are live | Neither | N/A | Clean |
| 4 | Duplicate CSS files | 4 files never linked from any page | N/A — not currently active | Unclear — likely unshipped features, not legacy | No | Marked — needs a product decision, not a cleanup decision |
| 5 | Duplicate helper functions | 7 confirmed pairs (`pad2`, `toISO`, `todayISO`, `nowStamp`, `addDays`, `startOfWeek`, `parseISO`) across `calendar.js`/`study.js`/`workout.js` | Both copies are live, independently | Neither — both actively used by their own file | No — both are referenced | Marked for consolidation into a shared date-utility module during Phases 11–18 |
| 6 | Duplicate utilities | Same as above (date helpers are the only real utility duplication found) | — | — | No | Same as above |
| 7 | Duplicate services | None found | — | — | — | Clean |
| 8 | Duplicate repositories | None found (StatisticsRepository/DashboardRepository are *unused*, not *duplicates* of something else — see Phase 3 for the dedicated repository audit) | — | — | — | Clean for this specific check |
| 9 | Duplicate Firebase wrappers | None found | — | — | — | Clean |
| 10 | Duplicate state managers | None found | — | — | — | Clean |
| 11 | Duplicate render systems | 1 real finding: `notificationItemHtml`/`notificationCenterHtml` in both `shared.js` and `notification-center.js` | Both — shared.js creates the DOM shell, notification-center.js fills live content | Neither is fully obsolete — layered, not duplicated | No — shared.js's version is load-bearing (creates the DOM elements the other depends on) | Marked for Phase 21, narrow performance smell only, not a correctness bug |
| 12 | Duplicate initialization code | None found beyond the dead DI/bootstrap cluster already removed in Phase 1 | — | — | — | Clean (resolved last phase) |
| 13 | Duplicate page boot logic | None found — every page follows the same `bootShell()` → page-module pattern | — | — | — | Clean |
| 14 | Duplicate authentication helpers | None found this phase (the remember-me/session-persistence issue was found and fixed in an earlier session, not a duplication issue) | — | — | — | Clean |
| 15 | Duplicate storage helpers | `utils/LocalStorageService.js` exists as a clean abstraction but has zero callers — the app calls `localStorage` directly elsewhere instead | Direct calls (scattered across `shared.js`, `auth-firebase.js`) | `LocalStorageService.js` (built, never adopted) | No — it's not "obsolete", it's "never adopted"; deleting it would remove a better version in favor of the worse scattered one | Marked for Phase 30 |
| 16 | Duplicate sync systems | None found — one repository layer, one `onSnapshot` pattern, one `RepoAggregatorSync` | — | — | — | Clean |
| 17 | Duplicate theme systems | 1 finding: `variables.css`'s default `:root` light-theme block is permanently overridden by `momentum.css`'s later-loaded `:root` dark-theme block | `momentum.css`'s block (by load order) | `variables.css`'s default block (unreachable) | Not attempted this phase | Marked for Phase 26 — theme CSS load order needs live visual verification before touching |
| 18 | Duplicate localization systems | None found | — | — | — | Clean |
| 19 | Duplicate notification systems | See #11 above — same finding | — | — | — | Marked for Phase 21 |
| 20 | Duplicate dashboard logic | None found this phase (resolved in an earlier session via `RepoAggregatorSync`) | — | — | — | Clean |
| 21 | Duplicate statistics logic | None found this phase (same) | — | — | — | Clean |
| 22 | Duplicate cache systems | None found | — | — | — | Clean |
| 23 | Duplicate Service Workers | None found — one `sw.js` | — | — | — | Clean |
| 24 | Duplicate constants | None found | — | — | — | Clean |
| 25 | Duplicate configuration files | None found — one `vite.config.js`, one `firebase.json`, one `firestore.rules` | — | — | — | Clean |

## Summary

- **Confirmed duplicate/dead systems merged or removed this phase:** 0 systems merged (the DI/bootstrap cluster was already removed in Phase 1); 9 individual dead files removed (see REMOVED_FILES.md).
- **Confirmed duplicate systems found but deliberately not touched:** 4 (unlinked CSS files, duplicate date-helper functions, the notification shell/overlay pattern, the theme `:root` override, and the orphaned LocalStorageService — 5 total, all requiring either a product decision or live verification before it's safe to act).
- **False positives investigated and ruled out:** the 9 filename collisions, the CSS custom-property "10x" count, the `recentActivityHtml` naming coincidence.
