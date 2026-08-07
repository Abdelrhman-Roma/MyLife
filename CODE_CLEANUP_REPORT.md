# CODE_CLEANUP_REPORT.md — Phase 3

Checklist from your brief's "REMOVE" section, answered against what was actually found this phase (not re-litigating Phase 1/2's already-completed removals).

| Category | Found this phase? | Action |
|---|---|---|
| Unused files | No new ones beyond what Phase 1/2 already removed | None |
| Unused folders | None found | None |
| Unused repositories | None new (StatisticsRepository/DashboardRepository already flagged in an earlier phase, not re-actioned here) | None this phase |
| Unused services | None new | None |
| Unused helpers | The duplicate date-helper functions from Phase 2 (`pad2`/`toISO`/`todayISO`/`nowStamp`/`addDays`/`startOfWeek`/`parseISO` across calendar.js/study.js/workout.js) remain — still not "unused," still actively self-referenced, still marked for the consolidation phases | None this phase (correctly deferred) |
| Unused CSS | None new beyond Phase 2's findings | None |
| Unused JS | `saveData()` — confirmed unused after this phase's own call-site removal | **Deleted** |
| Unused assets | None new beyond Phase 2's findings | None |
| Unused JSON | None found — every `data/` file is legitimately used dynamically | None |
| Unused build scripts | None found | None |
| Unused Firebase wrappers | None found — one `firebase/auth.js`, one `firebase/firestore.js`, one `firebase/firebase.js`, all in active use | None |
| Unused imports | Not exhaustively re-audited this phase (would require a full per-file import/export trace across ~90 JS files) — flagged as a good fit for Phase 43 ("remove remaining orphaned/never-wired files project-wide") in the 50-phase roadmap | Deferred |
| Unused exports | Same | Deferred |
| Unused constants | `DATA_PREFIX` was a candidate but is **not** unused — `js/pages/account.js` depends on it (see DEPENDENCY_REPORT.md) | Kept, correctly |
| Unused models | N/A — this codebase doesn't have a separate "models" layer distinct from repositories | N/A |
| Unused listeners | Not found — every `onSnapshot`/`addEventListener` traced this phase resolved to a real, currently-wired caller | None |
| Unused event handlers | Same | None |
| Unused compatibility code | `saveData()` was exactly this category, and is now gone | **Deleted** |

## What this phase did NOT attempt, and why

A full unused-import/unused-export sweep across every one of the ~90 JavaScript files in this project is a real, valuable, but separate piece of work — it requires tracing every named export against every import site individually (not just grepping for a known list of suspect terms, which is what this phase's brief specifically asked for). Doing it properly deserves its own phase rather than a rushed pass at the tail end of a legacy-removal phase. It's already on the roadmap (Phase 43).

## Net result

- 1 function deleted (`saveData()`)
- 1 function simplified (`getData()`)
- 2 call sites removed
- 0 new dead files, folders, repositories, services, or assets found beyond what Phases 1–2 already caught
- Production build verified clean before and after every change in this phase
