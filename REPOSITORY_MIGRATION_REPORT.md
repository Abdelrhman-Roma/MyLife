# REPOSITORY_MIGRATION_REPORT.md — Phase 4

## What this phase actually did

Built and fully wired 4 of the ~19 example domains from your brief: **Water, Sleep, Body Measurements, Shopping List**. Chosen deliberately — they're the domains with no ambiguity: simple arrays of log entries, no competing feature definitions, no product decision required, a clean fit for the exact `BaseRepository` pattern already proven across the 8 previously-migrated features.

I did **not** attempt all ~19 domains this phase. Building and wiring even 4 surfaced a real cross-page bug (below) that needed catching before it shipped — doing 19 at that same level of care in one pass wasn't realistic, and doing them shallower than that would have repeated the exact mistake this whole engagement has been correcting (built-but-not-verified code). What's left is listed precisely, by domain, in REMAINING_DOMAINS.md.

## Repositories created

| Repository | Collection path | Extends |
|---|---|---|
| `WaterRepository` | `water/{uid}/items/{id}` | `BaseRepository` |
| `SleepRepository` | `sleep/{uid}/items/{id}` | `BaseRepository` |
| `BodyMeasurementsRepository` | `bodyMeasurements/{uid}/items/{id}` | `BaseRepository` |
| `ShoppingRepository` | `shopping/{uid}/items/{id}` | `BaseRepository` |

All four are the same "thin subclass" pattern as the 8 existing repositories — no new architecture, no duplicated CRUD logic (that stays in `BaseRepository`, per its own header comment).

## A real bug this migration caught before it shipped

**Body Measurements is written from two different pages** — Nutrition's simple weight/waist form, and Workout's richer weight/chest/waist/hips/arms form. Both write to the same conceptual data; only Nutrition's side was in my original plan. If I'd migrated only Nutrition, Workout would have kept pushing to the legacy `currentData.bodyMeasurements` + `persist()`, which Nutrition's new repository subscription would have silently overwritten on its next snapshot — entries logged from the Workout page would have appeared to save, then vanished. Caught this by grepping for every other reference to the 4 fields I was about to migrate before considering the migration done, found `js/workout.js` writing to the same field, and migrated both pages to the same `BodyMeasurementsRepository` in this same phase so they share one real source of truth instead of one repository and one orphaned legacy writer.

## A second, unrelated bug found while verifying this work

`js/shared.js`'s `getCounts()` (which feeds Dashboard, Statistics, and the "Hydration Hero" achievement criterion) read `i.amount` for water entries — but every water entry, on every page, is actually written with a `glasses` field. `i.amount` was never set anywhere, so the water stat has been silently reading `0` regardless of how much water anyone logged, since before this migration even started. Found it because I was re-verifying every reader of the field I was migrating, not because it was in scope — fixed it in `js/shared.js` and the matching instance in `js/calendar.js`'s linked-event title text, since both were trivial, low-risk, one-line corrections directly relevant to Phase 4's Dashboard/Statistics verification mandate.

## Pages migrated

| Page | What changed |
|---|---|
| `js/nutrition.js` | Water, Sleep, Shopping List now read/write through their new repositories (create/update/delete), each with its own realtime subscription. Meals were already migrated in an earlier phase. |
| `js/workout.js` | Body Measurements now read/write through `BodyMeasurementsRepository`, subscribed alongside the existing `WorkoutRepository`. The workout log was already migrated in an earlier phase; the plan/schedule and progress photos remain legacy (see REMAINING_DOMAINS.md). |
| `services/RepoAggregatorSync.js` | Extended to also subscribe Dashboard/Statistics to the 4 new repositories — without this, Dashboard/Statistics would show correct data only for users who'd also visited Nutrition/Workout that session, the exact bug an earlier session fixed for the original 8 domains. |
| `js/shared.js` | `REPO_SYNCED_COLLECTIONS` (the list protecting repo-synced fields from being clobbered by legacy blob updates) extended to include the 4 new fields. `getCounts()`'s water bug fixed. |
| `js/calendar.js` | Matching water field-name fix in the linked-event title. |
| `firestore.rules` | Added owner-scoped read/write rules for `water`, `sleep`, `bodyMeasurements`, `shopping`. |

## Files modified (complete list)

`repositories/WaterRepository.js` (new), `repositories/SleepRepository.js` (new), `repositories/BodyMeasurementsRepository.js` (new), `repositories/ShoppingRepository.js` (new), `js/nutrition.js`, `js/workout.js`, `js/shared.js`, `js/calendar.js`, `services/RepoAggregatorSync.js`, `firestore.rules`.

## Runtime issues found

1. The Body Measurements cross-page conflict (above) — fixed within this phase.
2. The water `amount`/`glasses` field mismatch (above) — fixed within this phase.
3. No other runtime issues found in the domains touched this phase. Everything else (the ~15 remaining domains) is unchanged and carries whatever behavior it already had.

## Cross-device synchronization status

**Traced correct, not live-tested** — consistent with every other phase in this engagement, I don't have a browser or a second device here. All 4 new repositories follow the identical `AuthService.waitUntilReady().uid` → `new XRepository(uid)` → `subscribe()` pattern already used (and previously debugged) for the 8 earlier domains, with the same dedupe/debounce protections already in `BaseRepository`. I have no reason to expect these 4 to behave differently, but "no reason to expect a problem" is not the same claim as "confirmed working," and I'm not presenting it as one.
