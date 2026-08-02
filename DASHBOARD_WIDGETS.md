# MyLife — Custom Dashboard (Phase 8)

## Honest scope statement

All 17 widgets from the brief are built and render real content — none is a
placeholder screenshot. But "real content" means three different, clearly
labeled things (see Widget API, below), because only Todo and Notifications
are actually on Firestore so far (Phases 2 and 7). Widgets for unmigrated
modules (Habits, Goals, Workout, Nutrition, Study, Prayer, Calendar,
Statistics, Achievements, Water, Sleep) read once from the existing
in-memory `currentData` object and say "Snapshot — refresh the page to
update" directly in their own UI, rather than silently pretending to be
live. This is not a corner cut to hide — it's the same disclosed
architecture boundary every phase since Phase 2 has documented.

## Dashboard architecture

```
pages/dashboard.html
  #data-list          — existing, UNCHANGED fixed dashboard content
  #custom-dashboard-root — NEW, self-contained (Phase 8)
        │
js/pages/custom-dashboard.js  — the grid controller
        │  — loads/saves layout via DashboardLayoutService
        │  — mounts widgets from core/WidgetRegistry.js
        │  — drag/resize/hide/pin/collapse, Add Widget dialog, Personalize panel
        ▼
core/WidgetRegistry.js  — the Widget API (registerWidget/getWidget/getAllWidgets)
        ▲
js/dashboard-widget-defs.js  — all 17 widgets registered here
        │  — each widget calls into the real repository/service it needs
        ▼
repositories/TodoRepository, NotificationRepository | services/UserService,
WeatherService | plain reads from currentData (unmigrated modules)
```

## Widget API

```js
registerWidget({
  id: 'my-widget',
  title: 'My Widget',
  icon: '⭐',
  category: 'productivity' | 'wellness' | 'insight' | 'utility',
  defaultSize: 'sm' | 'md' | 'lg',
  allowedSizes: ['sm', 'md'],
  dataSource: 'firestore-live' | 'live-api' | 'local-snapshot' | 'static',
  render({ root, user, size, compactMode }) {
    // Render into `root`. Return an optional cleanup function (called when
    // the widget is hidden or the page unloads) — this is where you
    // unsubscribe a realtime listener.
  },
});
```

That's the entire contract. **A future widget needs exactly one new
`registerWidget()` call in (or alongside) `js/dashboard-widget-defs.js` —
nothing in `custom-dashboard.js` or the grid/persistence layer changes.**
This is what "future widgets can be installed without changing dashboard
architecture" means concretely, not just as a stated goal.

## Widget lifecycle

1. **Mount** — `def.render(ctx)` is called once when a widget first becomes
   visible (page load, or added from the widget store). Its cleanup
   function is stored.
2. **Live** — a `firestore-live`/`live-api` widget keeps its subscription
   running for as long as it's mounted, including while **collapsed**
   (collapsing only hides the body via CSS — it does not unmount).
   **Dragging to reorder also does not unmount anything** — the grid
   controller physically moves the existing DOM node rather than
   re-rendering, specifically so live widgets never lose their
   subscription just because something else on the board moved.
3. **Unmount** — happens only when a widget is hidden (via its own \u2715
   button) or removed by a remote layout change (cross-device). The stored
   cleanup function runs, then the DOM node is removed.
4. **Resize** — only changes the widget's `size` (and its CSS grid-column
   span); does not remount. Widgets are not currently size-reactive beyond
   the CSS layout change (a future widget could read `ctx.size` to render
   differently at each size, but none of the 17 built here need to).

## Firestore schema

```
users/{uid}/dashboard/layout   (single document — see DashboardLayoutService.js)
  widgets: [
    { widgetId, order, size: 'sm'|'md'|'lg', hidden, pinned, collapsed },
    ...
  ]
  personalization: {
    accentColor, cornerRadius: 'sharp'|'md'|'round', transparency: 0-100,
    compactMode, animations
  }
  updatedAt
```

This matches the brief's literal path (`users/{uid}/dashboard/layout`)
exactly — unlike Phase 7's Notification Center, no deviation was needed
here, since a single per-user layout document fits naturally as a
subdocument under the user's own profile.

**A rules gap was checked for proactively before shipping, learning from
Phase 6's discovery**: `users/{uid}`'s existing Security Rule does not
automatically cover subcollections. A `match /dashboard/{document}` block
was added under it in `firestore.rules` — verified before this feature
shipped, not after.

## Personalization

Accent color, corner radius, transparency, compact mode, and animations are
applied as CSS custom properties (`--cdash-accent`, `--cdash-radius`,
`--cdash-transparency`) scoped to `#custom-dashboard-root` only — they do
not touch the app's global theme system (`data-palette`/`data-theme`),
keeping this a dashboard-local customization layer rather than a second,
competing theming mechanism.

## Cross-device sync

`DashboardLayoutService.subscribeLayout()` is a realtime Firestore listener
on the single layout document — a layout change made on another device
(reorder, resize, personalization) reflects here automatically. The grid
reconciles only the *set* of visible widgets on a remote change (mounting
newly-added ones, unmounting removed ones) — it does not tear down and
rebuild widgets that are already correctly mounted, for the same
performance reason described in the Widget Lifecycle section.

## Performance optimizations

- Widgets mount once and stay mounted across drag/resize/collapse — see
  Lifecycle, above. This is the single biggest performance decision in this
  feature: a naive "re-render the whole grid on every change" approach
  would tear down and rebuild every live subscription (Todo, Weather,
  Notifications) on every drag movement.
- Layout saves are debounced (400ms) so dragging or adjusting a slider
  doesn't write to Firestore on every intermediate event.
- Local-snapshot widgets read `currentData` synchronously (already in
  memory) — zero additional network/Firestore cost for those 11 widgets.
- The Quick Notes widget ignores incoming realtime updates while the
  textarea has focus, so typing is never interrupted by your own debounced
  save round-tripping back.

## Future extension plan

1. **Migrate the local-snapshot widgets' underlying modules to Firestore**
   (Habits, Goals, Workout, Nutrition, Study, Prayer, Calendar — following
   the Phase 2 Todo pattern) — each one then flips from `local-snapshot` to
   `firestore-live` with no change to the grid/registry/persistence layer,
   only to that one widget's `render()`.
2. **Freeform pixel resize** (drag a corner handle) instead of the current
   sm/md/lg size-cycle button, if users want finer control than 3 presets.
3. **Per-breakpoint layouts** (a genuinely different widget arrangement on
   mobile vs. desktop, not just responsive column-span) — the schema's
   `widgets[].size` could become `{ sm: 'sm', md: 'md', lg: 'lg' }` per
   breakpoint without changing the collection path.
4. **A true widget marketplace** (third-party/community widgets) — the
   registry pattern already supports this structurally; it would need a
   sandboxing/permission layer before actually accepting untrusted code,
   which is a real, separate security project, not a small addition.
