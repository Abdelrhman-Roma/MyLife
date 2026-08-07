# REMOVED_FILES.md — Phase 3

No whole files were deleted this phase. Everything that met the "proven 100% obsolete" bar this round was function-level, not file-level — see LEGACY_REMOVAL_REPORT.md for the full reasoning. (Phase 2's file-level removals are documented in that phase's own version of this report, preserved in git history / the earlier session.)

## Code removed

| Location | What | Proof of safety |
|---|---|---|
| `js/shared.js` | `saveData(_email, _data) { }` function definition | Function body is a literal no-op — confirmed by reading it, not inferred |
| `js/shared.js` | `saveData(email, emptyData(name));` call site inside the non-Firebase fallback `register()` | Calling a no-op has zero behavioral effect at any call site |
| `js/pages/auth-oauth.js` | `saveData(email, emptyData(user.name));` call site inside the OAuth bridge | Same |

## Code simplified (not removed — behavior-preserving)

| Location | Before | After | Why not a full removal |
|---|---|---|---|
| `js/shared.js` | `getData(email, name)` read `localStorage.getItem(DATA_PREFIX + email)` before falling back to `emptyData(name)` | `getData(name)` always returns `emptyData(name)` directly | The `DATA_PREFIX` constant itself is kept — `js/pages/account.js`'s account-deletion flow still uses it to clean up any pre-migration stale entry. Only the pointless *read* was removed; the cleanup-relevant constant stays. |

## Not removed this phase, with reasons (see LEGACY_REMOVAL_REPORT.md for full detail)

- `js/services/LegacyDataSync.js` — still actively loaded on 11 of 12 pages; still the only sync path for ~9 unmigrated feature domains
- `js/shared.js`'s `appData`/`persist()`/`currentData` machinery — same reason
- `mylife.session` / `mylife.users` / `bridgeIntoLegacySession()` / `getSessionUser()` — every page's auth gate depends on it
- `repositories/StatisticsRepository.js`, `repositories/DashboardRepository.js` — unused, but flagged (not re-decided) in an earlier phase; not touched again here since nothing new was learned about them this phase
- `utils/LocalStorageService.js` — unused, same as above
- `css/space-video.css`, `css/momentum-theme.css`, `css/momentum-layout.css` — unused, same as above

**Total files deleted this phase: 0**
**Total functions deleted: 1**
**Total functions simplified: 1**
**Total call sites removed: 2**
