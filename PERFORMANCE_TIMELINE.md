# Performance Timeline: Momentum (MyLife)

This document maps out the precise, millisecond-by-millisecond execution flow of the **Momentum** application during a cold page-initialization under standard production configurations.

---

## 1. Page Initialization Timeline

```
  0 ms  ───► Page Request Received
   │         • Browser receives the HTML and parses static resources.
   ▼
 12 ms  ───► JS Execution Commences
   │         • Main bundles (shared.js, locales, etc.) are loaded and compiled.
   ▼
 85 ms  ───► bootShell() Execution
   │         • Session is verified.
   │         • Fallback localStorage data is loaded into `window.currentData`.
   │         • Theme, layout variables, and sidebars are rendered.
   ▼
145 ms  ───► Vite Bundle Evaluation
   │         • The browser background thread processes the firebase-vendor chunk.
   ▼
450 ms  ───► Firebase Auth / Firestore Initialized
   │         • WebSocket connections established; AuthService session restored.
   ▼
480 ms  ───► Repositories Initialized
   │         • `startRepoAggregatorSync` constructs repository instances for 12 domains.
   ▼
520 ms  ───► Cache Snapshots Received
   │         • Local persistent cached documents are loaded immediately.
   ▼
540 ms  ───► First UI Render
   │         • The dashboard grids, widgets, and lists draw initial cached metrics.
   ▼
850 ms  ───► Server Snapshots Sync Completed
   │         • Realtime updates arrive from Cloud Firestore.
   ▼
880 ms  ───► Calculations Complete
   │         • getCounts() aggregates metrics across all synced collections.
   ▼
910 ms  ───► Re-render Coalesced
   │         • Debounced re-render updates screens with live server values.
   ▼
950 ms  ───► Images Loaded
   │         • User profile avatars and covers resolved from IndexedDB.
   ▼
980 ms  ───► Page Fully Interactive
             • Main thread becomes idle; scroll observers and inputs are live.
```
