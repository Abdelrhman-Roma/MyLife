# ACHIEVEMENT_COMPARISON.md

Per your explicit instruction, this is analysis only — no migration has been performed, and no code changed either achievement system this phase.

## System A — `js/pages/account.js`'s local achievement engine

10 achievements, computed entirely from `getCounts()` (a local aggregation over `currentData`), stored in the legacy blob (`currentData.achievements.unlocked`), with XP computed by a local `computeXp()` formula (`currentData.profile.xp`).

| id | Title | Criterion |
|---|---|---|
| `first_step` | First Step | Complete 1 task |
| `habit_builder` | Habit Builder | Complete habits 7 times |
| `goal_getter` | Goal Getter | Finish 5 goals |
| `hydration_hero` | Hydration Hero | Log 30 glasses of water |
| `bookworm` | Bookworm | Log 10 study sessions |
| `iron_will` | Iron Will | Log 10 workouts |
| `prayerful` | Prayerful | Log 20 prayers |
| `well_rested` | Well Rested | Log 10 nights of sleep |
| `century_club` | Century Club | Reach 100 total logged actions (sum across all types) |
| `perfectionist` | Perfectionist | 100% completion rate across every task/habit/goal ever added |

## System B — `core/GamificationEngine.js`'s repository-backed engine

14 achievements (10 visible + 1 hidden + at least 1 secret, truncated in my extraction — see the file directly for the full secret list), computed from discrete `recordEvent()` calls at the moment something happens (not a periodic recount), backed by real Firestore repositories (`XpRepository`, `BadgeRepository`, `AchievementRepository`, `StreakRepository`), with XP awarded per-event (`xpReward` field on each achievement, plus other award sources) rather than one computed total.

| id | Title | Criterion |
|---|---|---|
| `early-bird` | Early Bird | Complete something before 7am, 5 times |
| `night-owl` | Night Owl | Complete something after 11pm, 5 times |
| `streak-7` | 7-Day Streak | 7 consecutive active days |
| `streak-30` | 30-Day Streak | 30 consecutive active days |
| `todos-100` | 100 Todos | Complete 100 tasks |
| `workouts-100` | 100 Workouts | Complete 100 workouts |
| `prayer-master` | Prayer Master | 30-day prayer streak |
| `study-champion` | Study Champion | 50 hours of study |
| `healthy-week` | Healthy Week | Log water, sleep, and a meal every day for a week |
| `perfect-month` | Perfect Month | 30 consecutive active days (ultimate consistency badge) |
| `century-club` | Century Club (hidden) | Reach level 100 |
| *(secret achievements)* | — | Not shown until unlocked; see `core/GamificationEngine.js` directly |

## Differences

- **Zero overlapping IDs.** Not one achievement in System A matches an ID in System B, including the two that sound similar (`century_club` vs `century-club` — A means "100 total actions logged," B means "reach level 100," a completely different bar).
- **Computation model.** A recomputes from scratch on every page load/action (a full recount over `currentData`). B awards incrementally, at the moment a qualifying event happens, via `recordEvent()`.
- **Data model.** A stores one array of unlocked IDs plus one XP number, both in the legacy blob. B stores individual XP-award documents, badge documents, and achievement-unlock documents, each in its own Firestore collection — a proper ledger, not a single derived number.
- **Streaks.** B has real streak-based achievements (`streak-7`, `streak-30`, `prayer-master`'s 30-day prayer streak, `perfect-month`) backed by `StreakRepository`. A has no streak concept at all — its closest equivalent (`century_club`) is a cumulative count, not a consecutive-day streak.
- **Hidden/secret achievements.** B supports hidden (shown masked until unlocked) and secret (not shown at all until unlocked) achievements as a first-class feature. A has no such concept — all 10 are always fully visible.
- **Time-of-day achievements.** B has `early-bird`/`night-owl` (based on when an action happens). A has no time-of-day awareness at all.

## Pros and cons

**System A (local/legacy):**
- *Pro:* Simple, easy to read in one file, no async/Firestore round-trip needed to compute.
- *Pro:* Recomputing from scratch means it can't drift from the underlying data — whatever `currentData` says right now is authoritative for A's own logic.
- *Con:* Not real-time/cross-device — recomputed locally from whatever's in `currentData` on this device at this moment, so a device that hasn't synced recently could show different unlocked achievements than one that has.
- *Con:* No streak, hidden, secret, or time-of-day support — architecturally simpler, but also meaningfully less capable.
- *Con:* XP is a single recomputed number with no history — you can't see *when* or *why* XP was earned, only the current total.

**System B (repository-backed):**
- *Pro:* Real-time, cross-device by construction (it's already Firestore-backed, already proven working via `js/todo.js`'s `recordEvent()` calls).
- *Pro:* Richer feature set — streaks, hidden/secret achievements, time-of-day awareness, per-event XP history.
- *Pro:* Matches the architecture the rest of this migration has been moving toward (repository + realtime, not local recomputation).
- *Con:* Only `js/todo.js` currently calls `recordEvent()` — none of the other 7 migrated feature pages (Habits, Goals, Calendar, Workout, Prayer, Nutrition, Study) fire these events yet, meaning most of System B's achievements (workouts-100, prayer-master, study-champion, healthy-week) can't actually unlock yet in practice, regardless of which system is chosen as canonical.
- *Con:* More moving parts (4 repositories instead of 1 array) — slightly more to reason about, though this is the same trade-off already made for every other domain in this project.

## Missing achievements (gaps either system would need to fill if chosen alone)

- If **B** is chosen: needs `recordEvent()` calls added to Habits/Goals/Calendar/Workout/Prayer/Nutrition/Study (currently only Todo fires them) before most of its achievements can ever unlock. Also has no equivalent to A's `hydration_hero` (water-specific) or `bookworm` (study-count-specific, as opposed to B's time-based `study-champion`).
- If **A** is chosen: needs streak tracking, hidden/secret support, and time-of-day awareness built from scratch — B already has all of this working.

## Migration difficulty

- **A → B:** Low-medium. B's infrastructure already exists and works; the work is wiring `recordEvent()` into the other 7 pages (a bounded, mechanical task, same shape as what `js/todo.js` already does) and deciding whether to recreate A's water/study-count-specific achievements as new B-style entries.
- **B → A:** Medium-high. Would mean building streak tracking, hidden/secret support, and time-of-day logic from scratch inside the legacy local-compute model — replicating infrastructure that already exists and works in B, for no clear benefit.

## Recommendation

**System B (`core/GamificationEngine.js`), completed rather than replaced.** It's real-time, cross-device, already Firestore-backed (consistent with every other domain in this project), and has a richer feature set than System A in every dimension I found. Its main gap — most events not firing yet outside Todo — is a bounded, mechanical task (add `recordEvent()` calls to 7 more pages), not a redesign. System A's two achievements with no B equivalent (`hydration_hero`, `bookworm`) are worth re-adding as new B-style entries during that work, so nothing users could unlock today gets quietly removed.

**This is a recommendation, not a decision I'm making unilaterally** — per your instruction, no migration will happen until you accept it (or choose otherwise).
