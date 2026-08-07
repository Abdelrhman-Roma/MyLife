# WORKOUT_PLAN_REPORT.md

## Status: not migrated this phase — deliberately, not by oversight

`WorkoutPlanRepository` and `WorkoutScheduleRepository` were not created, and `js/workout.js`'s plan/schedule code still runs on the legacy blob. Explaining precisely why, rather than leaving it as an unexplained gap.

## What makes this domain different from the ones completed this phase

Every domain migrated in Phases 4–6 so far shares one property: the data is read in one place and written in one or two places, with render logic that just iterates a list. Workout's plan/schedule is not that shape:

- The weekly schedule (`plan().schedule`) drives the **week view**, the **"today's workout" card** on the page itself, **streak calculations specific to the plan** (distinct from the streak logic already migrated for the finished-session log), the **calendar's linked-event materialization** for workout days (`SOURCE_MODULE_META.workout` in `js/calendar.js`, which reads `currentData.workoutPlan.schedule` directly), and `syncScheduleToTodo()` (which mirrors workout days into the Todo list).
- Each schedule entry nests **exercises**, each exercise nests **sets/reps/rest-timer configuration** — a genuinely nested structure, not a flat list of records like Habits or Goals.
- **Templates** and **split/program configuration** add a second layer on top of the schedule itself (a template is applied *to* produce a schedule).

## Why I didn't attempt a "good enough" version anyway

Two reasons, both concrete:

1. **Calendar already depends on this exact field shape.** `js/calendar.js`'s `SOURCE_MODULE_META.workout.getCollection()` reads `currentData.workoutPlan.schedule` directly to materialize linked calendar events. Any migration here has to keep that read working (or update Calendar in lockstep) — the same class of cross-page dependency that the Body Measurements work in Phase 4 caught and fixed *before* shipping, not after. Getting this wrong wouldn't just leave Workout's own page broken — it could silently break Calendar's workout-day mirroring too, and I can't verify that live.
2. **Nested-array updates need a real design decision, not just a repository.** Should each schedule day be its own document (`workoutSchedule/{uid}/items/{dayId}`, matching every other migrated domain's shape), or should the whole week be one document (closer to the current single-blob-field shape, easier to keep the existing render code working unchanged, but a worse fit for realtime granularity — editing one exercise would rewrite the whole week)? Both are defensible; picking one silently is exactly the kind of unilateral architecture decision your brief's "do not introduce new architecture" instruction cautions against for anything that isn't a clear extension of the existing pattern.

## What I'd need to do this properly

1. A decision on the document-per-day vs. document-per-week question above.
2. `WorkoutPlanRepository` (templates/split configuration — likely a `BaseRepository` items collection, one per template) and `WorkoutScheduleRepository` (the active week's schedule — shape depends on the decision above).
3. Migrate `js/workout.js`'s plan/schedule render and write paths.
4. Update `js/calendar.js`'s `SOURCE_MODULE_META.workout.getCollection()` in the same change, not a follow-up — this is exactly the kind of same-phase cross-page fix Phase 4's Body Measurements work modeled.
5. Update `syncScheduleToTodo()` similarly.

This is realistically its own dedicated phase, not a subtask — comparable in scope to Phase 5's entire Prayer or Study migration, both of which were themselves a full phase's worth of work.

## What's still fine as-is

The workout **log** (finished sessions — `WorkoutRepository`) and **body measurements** (`BodyMeasurementsRepository`) were migrated in Phases 4/5 and are unaffected by this deferral. Progress photos were completed this phase (see PHASE6_REPORT.md). Only the plan/schedule/templates portion remains legacy.
