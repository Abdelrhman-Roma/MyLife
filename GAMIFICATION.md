# MyLife — Achievement System (Phase 9)

## Honest scope statement

Every mechanic the brief asks for is implemented and functional: XP, levels,
badges, achievements (hidden/secret/progress/one-time/repeatable/seasonal),
streaks, and a data layer ready for challenges/leaderboard. **Only one real
event source is wired**: Todo completion — the only Firestore-migrated
module. Habit/Goal/Prayer/Workout/Study/Nutrition/Water/Sleep all have a
defined XP amount in `XP_AWARDS` and are fully supported by
`recordEvent()`, but nothing calls it for them yet, since those modules
aren't on Firestore. Same disclosed pattern as Phases 7 and 8.

## XP Formula

`xpForLevel(level) = round(100 * level^1.5)` — the XP needed to advance
from that level to the next. Level 1→2 costs 100 XP; level 10→11 costs
~3,162 XP; level 50→51 costs ~35,355 XP. Unlimited levels, no cap, escalating
cost. `levelFromTotalXp()` walks this curve from a total XP count (fast —
O(level), i.e. effectively O(√xp), for any realistic amount of XP).

## Badge Architecture

Badges and achievements share **one** definition list (`ACHIEVEMENT_DEFS` in
`core/GamificationEngine.js`) and one evaluation pass, with a `badge: true`
flag on the subset that also produce a badge record. See that file's header
comment for the full reasoning — the short version: the brief's own example
badges ("100 Todos," "Prayer Master") are structurally identical to
progress achievements, so maintaining two parallel systems for one
mechanic would just be two chances to drift out of sync.

## Achievement Engine

`evaluateAchievements(uid, stats)` checks every definition's `check(stats)`
against a composed stats snapshot, persists new unlocks to
`achievements/{uid}` (and `badges/{uid}` for badge-flagged ones), awards
that achievement's own XP, and creates a real Notification Center entry
(category `Achievements`, Phase 7). All 6 requested achievement types are
implemented with a concrete example each: hidden (`century-club`), secret
(`midnight-marathon`), progress (`todos-100`), one-time (default —
everything not flagged repeatable), repeatable (`weekly-warrior`), seasonal
(`new-year-new-you`, date-windowed).

## Firestore schema

```
users/{uid}/xp/{entryId}            — XP ledger: { amount, source, metadata, awardedAt }
users/{uid}/badges/{badgeId}        — { badgeId, title, unlockedAt }
users/{uid}/achievements/{id}       — { achievementId, title, description, hidden, secret, xpReward, progress, target, unlockedAt }
users/{uid}/streaks/{kind}          — { kind, current, longest, lastActiveDate }
users/{uid}/challenges/{id}         — reserved, repository built (ChallengeRepository), no generator wired yet
users/{uid} (profile doc)           — .xp (total), .level (cached, for fast reads without summing the ledger)
```

Matches the brief's literal path exactly (`users/{uid}/xp`, etc.), via a
new `UserScopedRepository` that overrides `BaseRepository`'s path-building
so `users/{uid}/{subcollection}/{itemId}` reuses the entire existing
CRUD/subscribe/batch/transaction contract with zero duplicated logic.
**Rules gap checked proactively** (learning from Phase 6's discovery, and
Phase 8's precedent): all 5 new subcollections have matching
`firestore.rules` entries, verified before shipping.

## Future leaderboard plan

Not implemented (brief: "future-ready, keep architecture prepared"). The
`users/{uid}.xp`/`.level` cached fields are exactly what a leaderboard
needs to read — the missing piece is a `leaderboard` root collection with
public-readable `{uid, displayName, xp, level}` documents, kept in sync via
a Cloud Function triggered on profile XP writes (server-side work outside
this client-only project).

## Future multiplayer extension

Would build on the same event-driven pattern (`recordEvent`/custom DOM
events) plus the leaderboard collection above — e.g. friend challenges
comparing two users' `ChallengeRepository` progress documents. No
architecture changes needed to get there; it's additive on top of what
exists.

## Remaining technical debt

1. Only Todo produces real XP/achievement events (see Honest scope statement).
2. Challenges have a repository but no generator/UI yet.
3. `healthyWeek` and `weeklyGoalsAllComplete` stats always evaluate false —
   they need cross-referenced multi-day data from modules not yet migrated.
4. New strings are English-only (same localization gap as every prior phase).
5. No automated test for the XP curve or achievement evaluation — verified
   by manual reasoning only, consistent with this project's "no browser
   available" limitation throughout.
