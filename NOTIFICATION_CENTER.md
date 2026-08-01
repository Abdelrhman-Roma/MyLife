# MyLife — Smart Notification Center (Phase 7)

## Honest scope statement — read this first

This phase builds a real, working Notification Center on top of the
already-existing bell/panel UI (built in earlier phases) rather than
replacing it, per the brief's "do not redesign the application." It also
turned up and fixed a serious, previously-undetected bug — see "Critical
bug found this phase," below, before anything else, since it's more
consequential than the new feature itself.

**Known limitation, stated plainly**: exactly like every other Firestore
feature in this project so far, the Notification Center is fully live only
for users with a real Firebase Auth session (see `AUTHENTICATION.md`'s
bridge). Only **Todo** currently creates real notifications through it
(task-due and task-completed). The other 12 categories the brief lists
(Habit, Goal, Workout, Nutrition, Study, Prayer, Weather, Achievements,
System, Security, Account, Backup) are fully supported by the Notification
Center's UI, repository, and settings — but nothing in those modules calls
`NotificationRepository.notifyOnce()` yet, because those modules aren't
migrated to Firestore. The panel will correctly show and manage
notifications from any of them the moment they are.

## Critical bug found this phase (fix, not a feature)

While wiring Todo's reminder system into the new Notification Center, a
**severe, previously-undetected bug** was found in `js/todo.js`, present
since Phase 2: `taskCardHtml(t, conflicts, draggable)` named its first
parameter `t` — which shadows the global `t()` translation function for the
entire function body. That function calls `t('Drag to reorder')`,
`t('Mark complete')`, `t('Repeats')`, `t('Conflict')`, `t('Edit')`,
`t('Delete')`, and more than a dozen other translation calls throughout.
Every one of those would throw `TypeError: t is not a function`, meaning
**rendering a single task card would fail**, breaking Todo's entire task
list. The same shadowing pattern was also present in `toggleTask()`
(`t('next occurrence')`) and was introduced fresh, by this very phase's own
first draft, in `checkTaskReminders()`. All three were found and fixed —
renamed to `task` throughout, translation calls restored to correctly
reference the global `t()`.

This is exactly the class of bug that static syntax-checking (`node
--check`) cannot catch — it's valid JavaScript, just wrong at runtime — and
exactly why every phase of this project has repeated the same caveat: no
browser was available to actually click through and observe this failure
directly. It was only caught by manually tracing variable scope while
reading the code closely enough to add new calls to it. See Remaining
Technical Debt for what this implies about the rest of the codebase.

## Architecture

```
UI (existing bell/panel markup, shared.js — unmodified)
        │
js/notification-center.js (new, Phase 7)
        │  — waits for AuthService.waitUntilReady()
        │  — if no Firebase user: does nothing (local system keeps working)
        │  — if Firebase user: subscribes realtime, re-renders the SAME
        │    panel element's contents, patches window.refreshChrome so its
        │    content survives theme/language chrome refreshes
        ▼
repositories/NotificationRepository.js (extended, Phase 7)
        │  — notifyOnce(), pin/unpin, archive/unarchive, getUnread, markAllRead
        ▼
Firestore: notifications/{uid}/items/{notificationId}
```

Settings (categories, sound, vibration, desktop) are stored on the user's
existing profile document via `UserService`, not a new collection —
`users/{uid}.notificationSettings`.

## Firestore schema

**Deliberate, disclosed deviation from the brief's literal path**: the
brief specifies `users/{uid}/notifications/{notificationId}`. This project
keeps the path already established in Phase 2 and used by every other
module — `notifications/{uid}/items/{notificationId}` — for consistency
with `BaseRepository`'s shared contract and `firestore.rules`'s existing
per-module structure. Restructuring to the literal brief path would mean
changing the Repository Pattern's data-layout convention for one module
only, which conflicts with "do not modify Firebase architecture." The
practical effect is identical either way (one document per notification,
rooted under the owning user's uid).

```
notifications/{uid}/items/{notificationId}
  category:    string   — Todo | Habit | Goal | Workout | Nutrition | Study
                           | Prayer | Weather | Achievements | System
                           | Security | Account | Backup
  dedupKey:    string   — what notifyOnce() used to derive the doc id
  message:     string
  priority:    'low' | 'normal' | 'high'
  read:        boolean
  pinned:      boolean
  archived:    boolean
  deepLink:    string | null   — e.g. '../pages/todo.html'
  action:      { label: string, actionId: string } | null
  metadata:    Record<string, unknown> | null
  ownerId:     string (uid)
  createdAt:   Firestore Timestamp
  updatedAt:   Firestore Timestamp
```

`firestore.rules` already covers this path (fixed in Phase 6's audit — see
that phase's report for the bug this closed).
`firestore.indexes.json` (new this phase) declares the 3 composite indexes
the panel's queries need: `(read, archived, createdAt)` for the unread
badge/tab, `(archived, pinned, createdAt)` for the pinned tab, and
`(category, createdAt)` for the category filter. Deploy with
`firebase deploy --only firestore:indexes`.

## User actions implemented

Mark read, mark all read, delete (with undo via the existing
`core/UndoManager.js` — recreates the exact document), archive, unarchive,
pin, unpin — all via `NotificationRepository`, all optimistic where it
matters (settings toggles), realtime-reconciled everywhere else.

## Search & filter

Tabs (Unread/Read/Pinned/Archived) plus a text search box (message +
category, client-side over the already-realtime-synced local array — same
`utils/QueryUtils.js` pattern used by Todo, for the same reason: instant,
free, no extra Firestore reads per keystroke) plus a category dropdown.
Results are grouped into Today/Yesterday/Earlier within whichever
tab/filter is active.

## Future Push Notification integration plan

Not implemented this phase (the brief lists Push as "future ready," not
required now). The path already exists:
- `sw.js` (Phase 4) already has working `push`/`notificationclick` handlers.
- `core/Monitoring.js` (Phase 4) is the established pattern for
  "infrastructure now, real integration later, no paid service enabled
  automatically" — a `core/PushNotifications.js` following the same shape
  (a documented no-op `enablePush()` that would call
  `getMessaging()`/`getToken()` from `firebase/messaging` when adopted) is
  the natural next step.
- The `deepLink` field already stored on every notification is exactly what
  a push payload's click-through needs (`sw.js`'s `notificationclick`
  handler already reads `event.notification.data.url`).
- Email notifications: the brief also marks this "future ready" — would
  need a Cloud Function triggered on notification-document creation,
  which is server-side work outside this client-side project's scope.

## Performance optimizations

- Notification settings and the item list share one realtime subscription
  pair (items + profile), not re-subscribed per tab/filter change — tab
  switches, search, and category filtering are pure client-side
  re-renders of already-fetched data.
- `notifyOnce()`'s deterministic-id dedup means a flaky reminder check that
  fires 3 times in a row still produces exactly one Firestore write, not 3.
- The realtime subscription is capped at the 200 most recent notifications
  (`limit: 200`) so a long-lived account doesn't pull an ever-growing
  history into memory on every page load.

## Remaining technical debt

1. **Only Todo produces real notifications.** The other 12 categories are
   fully supported by the system but have no producer yet — see Known
   Limitation.
2. **The critical `t`-shadowing bug class found this phase was only caught
   by manual code reading, not tooling.** No automated check in this
   project would catch a same-named parameter shadowing a global function.
   A lint rule (`no-shadow` in ESLint, specifically flagging shadowing of
   known globals) would have caught this at write-time in Phase 2 — none
   exists in this project. Recommended as the highest-priority process fix,
   not just a code fix.
3. **`firestore.indexes.json` has not been deployed** to any real Firebase
   project from this environment (no Firebase project connected here).
4. **New Notification Center strings are English-only** — not yet added to
   `locales/de.js`/`ar.js`/`fr.js`, continuing the pattern flagged in every
   earlier localization audit.
5. **Push/Email notifications remain unimplemented** (by design — see
   Future Integration Plan).
6. **No automated test exists** for the `notifyOnce()` dedup guarantee or
   the tab/search/filter logic — verified by code reading only, consistent
   with every other phase's disclosed limitation (no browser available
   here).
