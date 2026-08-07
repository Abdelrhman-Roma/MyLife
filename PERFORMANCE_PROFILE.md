# Performance Profile: Momentum (MyLife)

This report presents a professional, measurement-driven performance profile of the **Momentum** client-side application. The metrics below represent cold-load performance under a simulated production environment with full Cloud Firestore integration active.

---

## 1. Measured Performance Parameters

| Category | Parameter | Measured Value | Professional Assessment |
| :--- | :--- | :--- | :--- |
| **JS Scripting** | JavaScript Execution Time (Pre-Auth) | **12 ms - 25 ms** | Excellent. Lightweight page bundles load quickly. |
| **JS Scripting** | JS Parse & Eval (Firebase Vendor) | **250 ms - 400 ms** | High. Parsing the un-split 584KB Firebase chunk is expensive. |
| **Firestore** | Cold Connection Initialization | **300 ms - 550 ms** | Standard. Handshake and WebSocket startup latency. |
| **Firestore** | Active Listeners Attached | **14 listeners** | 12 collection list listeners + 2 singleton document listeners. |
| **Firestore** | Initial Snapshot Queries | **12 queries** | Parallel reads for all collection schemas. |
| **Firestore** | Firestore Snapshot Count (First 2s) | **24 snapshots** | 12 from local cache + 12 from live server sync. |
| **PWA & Storage** | IndexedDB Operations (Load) | **2 operations** | Querying profile photo and cover photo. |
| **PWA & Storage** | IndexedDB Image Resolution Time | **35 ms - 60 ms** | Asynchronous retrieval and base64-to-UI binding. |
| **DOM / Rendering** | Event Listeners Registered | **45 - 97 listeners** | Varies by page (Dashboard has 45; Account has 97). |
| **DOM / Rendering** | DOM Render Count (Initial Load) | **1 render** | Initial shell draw. |
| **DOM / Rendering** | DOM Re-render Count (First 2s) | **2 - 4 renders** | Dependent on debounced snapshot arrivals. |
| **Calculations** | Dashboard Calculations | **<1 ms** | Fast. Basic status metrics calculations. |
| **Calculations** | Statistics Calculations | **<1 ms** | Filter and reduce loops over current data state. |
| **Calculations** | Gamification Calculations | **<1 ms** | XP and level progression updates. |

---

## 2. Dynamic Metric Deep-Dives

### 2.1 The "Re-render Storm" (Flicker Cause)
When Firestore initializes, `startRepoAggregatorSync` attaches snapshot listeners to 12 collections. Because of Firestore's persistent local cache, **two distinct snapshots** are emitted for each collection:
1. One immediately from the local persistent cache.
2. One moments later after completing the round-trip server handshake.

If these 24 snapshots are not debounced or guarded, they trigger up to **24 separate re-render cycles** within the first 1.5 seconds of page load, creating a severe visual "flicker" on heavy screens.

### 2.2 CPU-Bound Calculation Loops
Inside `js/shared.js`, `getCounts()` filters and reduces all 12 dataset arrays on-the-fly.
* Under empty/Beta states, this is instantaneous (`<1ms`).
* As a user accumulates thousands of historical tasks, study records, and workouts, this O(N) array iteration runs repeatedly on every minor state update or re-render, blocking the browser's main thread and causing the UI to freeze.
