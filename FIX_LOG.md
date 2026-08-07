# Fix Log: Momentum (MyLife)

This document records key fixes, patches, and enhancements made to resolve security risks, logical inconsistencies, and data flow synchronization gaps.

---

## 1. Resolved Issues & Patches

### Fix 1.1: Dashboard Loading Flicker
* **Issue**: Multiple concurrent Firestore snapshot listeners triggered a series of rapid full-page visual re-renders on page load.
* **Resolution**: Introduced a robust **30ms debounce mechanism** in `services/RepoAggregatorSync.js` to batch consecutive data-change snapshot notifications into a single visual update.

### Fix 1.2: Playwright Geolocation Bypass
* **Issue**: The automated E2E testing crawl was blocked on the Dashboard page because geolocation denial forced a redirect to the weather page.
* **Resolution**: Patched the Playwright crawler to inject a mock Cairo geolocation coordinate inside browser `localStorage` prior to loading pages, successfully bypassing the redirect loop.

---

## 2. Recommended Next-Phase Patches

To transition the remaining split-brain bugs into fully resolved states, developers should prioritize the following patches during the next active cycle:

### Patch Recommendation: Account Settings Notification Sync
* **Target File**: `js/pages/account.js`
* **Implementation Details**:
  Replace the legacy toggles block with direct calls to `SettingsRepository`:
  ```javascript
  function handleToggle(key, checked) {
    if (key.startsWith('notif:')) {
      const category = mapLegacyToCategory(key.slice(6)); // e.g. 'task' -> 'Todo'
      settingsRepo.update({
        [`notificationSettings.categories.${category}`]: checked
      });
    }
  }
  ```

### Patch Recommendation: Unified Gamification XP Display
* **Target File**: `js/pages/account.js`
* **Implementation Details**:
  Introduce a subscriber inside `startAccountSync()` to listen to `XpRepository`:
  ```javascript
  xpUnsubscribe = xpRepo.subscribe((xpLogs) => {
    const totalXp = xpLogs.reduce((sum, log) => sum + log.amount, 0);
    window.currentData.profile.xp = totalXp;
    renderHero();
  });
  ```
