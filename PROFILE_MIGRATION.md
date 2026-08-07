# PROFILE_MIGRATION.md

## Repository

`ProfileRepository` (`SingletonDocRepository`, `profile/{uid}`) — one document per user, not a collection, matching the actual shape of the data (a person has one profile, not many).

## Fields migrated

`firstName`, `lastName`, `username`, `phone`, `birthday`, `gender`, `country`, `city`, `location`, `timezone`, `headline`, `bio`, `photo` (now a Firebase Storage URL, not base64 — see below), `cover` (same).

## A genuine three-way naming tangle, resolved deliberately

"Name" turned out to live in three places before this migration, not one:

1. The legacy blob's `profile.firstName`/`profile.lastName`.
2. The local session bridge's `currentUser.name` (part of `mylife.users`, the pre-Firebase auth-gate system this project has deliberately left alone across every phase).
3. The *real* Firestore profile document's `displayName` field, via `services/UserService.js` — already built, already correct, already used for `subscribeProfile()`'s cross-tab sync, but never written to by the Profile edit form.

**Resolution:** the edit form now writes to all three, deliberately:
- `ProfileRepository.update()` — the new source of truth for the rest of the profile fields (bio, username, etc.), which have no other home.
- `currentUser.name` + `saveUsers()` — kept as-is, unchanged, because the local session gate's synchronous chrome rendering (sidebar greeting, etc.) still depends on it, and that system is explicitly out of scope for this migration (see every prior phase's conclusion on `mylife.session`).
- `UserService.updateProfile(uid, { displayName })` — the real Firestore path, reusing existing, already-correct infrastructure rather than inventing a fourth copy.

This is not a workaround — it's the correct outcome of "reuse everything that already exists," applied to a name field that had accumulated three legitimate-but-disconnected homes over the project's history.

## `language` field — a pre-existing dead field, left as-is, not silently fixed

The profile form saves a `language` value, but the *actual* UI language switch (`js/i18n.js`'s `getLang()`/`setLanguage()`) reads from its own, completely separate `localStorage` key — `currentData.profile.language` is saved but never read to control anything. This predates this migration; I did not "fix" it as part of moving the field to Firestore, because silently changing which value actually drives the UI language is a behavior change beyond "swap the data source," and worth a deliberate decision rather than an incidental one.

## Images: `photo`/`cover` now go through Firebase Storage

Same reasoning as Progress Photos (see WORKOUT_PLAN_REPORT.md / STORAGE_REPORT.md) — base64 in a Firestore document risks the 1MB limit. Upload path: `profile/{uid}/avatar.jpg` and `profile/{uid}/cover.jpg`. The UI still shows the photo instantly (optimistic local preview while the upload completes in the background), with the real Storage URL saved to `ProfileRepository` once the upload resolves.

## Dashboard/Statistics

`services/RepoAggregatorSync.js` now also subscribes to `ProfileRepository`, since `js/shared.js`'s sidebar/topbar rendering, `levelInfo()`, and Dashboard's hero card all read `currentData.profile` directly (headline, photo, XP-derived level). Without this, Dashboard would show stale/default profile info unless the user had also visited the Account page — the same bug pattern fixed for the original 8 domains in an earlier phase, caught here before it shipped by checking every reader of the field being migrated, not just the obvious one.

## What's NOT migrated

`xp` — blocked on the Achievements/XP product decision (see ACHIEVEMENT_COMPARISON.md). `social links` (mentioned in your brief's field list) — I did not find an existing implementation of social links anywhere in `js/pages/account.js`; if this is a field you expect to exist, it may not have been built yet, and I didn't want to invent a new field silently.
