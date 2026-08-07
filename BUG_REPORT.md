# Comprehensive Bug Report: Momentum (MyLife)

This document contains detailed descriptions, reproduction steps, technical diagnoses, and suggested fixes for the critical and major bugs uncovered in the **Momentum** application.

---

## BUG 1: Geolocation Denial Redirect Loop Lockout (Critical)

* **Severity**: Critical
* **File**: `js/weather-dashboard.js`
* **Trigger condition**: User denies geolocation permission when prompted by the browser on the main Dashboard.
* **Reproduction Steps**:
  1. Clear browser storage and cache.
  2. Load `pages/dashboard.html` in the browser.
  3. When the browser prompts: *"dashboard.html wants to know your location"*, click **Block / Deny**.
  4. Note that the browser immediately and forcibly redirects your window to `pages/weather.html?search=1`.
* **Technical Diagnosis**:
  The dashboard weather widget initialization routine eagerly requests browser geolocation using `WeatherLocationService.locate()`. If this promise is rejected, the catch block forces a hard window location change:
  ```javascript
  try { location = await WeatherLocationService.locate(); }
  catch (error) {
    if (error.code === 1 || error.code === 'denied' || error.code === 'unsupported') {
      window.location.href = 'weather.html?search=1';
      return;
    }
    throw error;
  }
  ```
  This is a severe UX bug because users who prioritize privacy are completely locked out of the Dashboard home screen.
* **Suggested Fix**:
  Do not redirect the entire window. Instead, set the weather slot container's HTML to display a user-friendly error/fallback message with an input box to search by city:
  ```javascript
  catch (error) {
    slot.innerHTML = WeatherUI.error(error);
    bindDashboardWeatherFallback(slot);
  }
  ```

---

## BUG 2: Split-Brain Notification Configuration (Critical)

* **Severity**: Critical
* **Files**: `js/pages/account.js` vs `js/notification-center.js`
* **Trigger condition**: User toggles notification preferences in Account Settings.
* **Reproduction Steps**:
  1. Navigate to `pages/account.html#notifications`.
  2. Toggle the "Task reminders" switch to **Off**.
  3. Verify that `currentData.notifications.task` gets set to `false`.
  4. Navigate to the Todo view or wait for a task reminder.
  5. Note that the Smart Notification Center (`js/notification-center.js`) still generates/delivers Todo notifications.
* **Technical Diagnosis**:
  The toggle switches on the Account Settings page are bound to `currentData.notifications`, which updates the local legacy `appData` blob.
  However, the actual Smart Notification Center (`js/notification-center.js`) is backed by Cloud Firestore and listens to the `profile.notificationSettings` collection with Capitalized Keys:
  ```javascript
  settings = { ...DEFAULT_SETTINGS, ...(profile?.notificationSettings || {}) };
  ```
  The settings UI writes to `notifications.task` but the notification router reads from `notificationSettings.categories.Todo`. They are completely decoupled.
* **Suggested Fix**:
  Update `js/pages/account.js` to write directly to `SettingsRepository` or the user profile's `notificationSettings` block. Ensure the key mapping translates legacy keys (`task`) to capitalized category keys (`Todo`).

---

## BUG 3: Inoperable "Reset Statistics" & "Import Backup" Gaps (Major)

* **Severity**: Major
* **File**: `js/pages/account.js`
* **Trigger condition**: Click "Reset Statistics" or "Import Data" under backup settings.
* **Reproduction Steps**:
  1. Add several tasks, habits, and goals (all synchronized with Firestore repositories).
  2. Go to `pages/account.html#backup` and click **Reset statistics**.
  3. Verify that the UI numbers temporarily clear.
  4. Refresh the page.
  5. Note that all of your statistics, tasks, and habits have reappeared.
* **Technical Diagnosis**:
  The reset function inside `js/pages/account.js` only targets local arrays:
  ```javascript
  onConfirm: () => {
    ['tasks', 'habits', 'goals', ...].forEach((key) => { window.currentData[key] = []; });
    persist();
  }
  ```
  This is a legacy holdover. Because the application was migrated to Cloud Firestore repositories (`TodoRepository`, `HabitRepository`, `GoalRepository`), local array clearing does not delete documents on Cloud Firestore. The next sync snapshot automatically restores the remote records.
* **Suggested Fix**:
  Introduce transaction-based or batch deletion procedures inside `confirmResetStatistics`. When clicked, iterate over the active repositories and invoke `.delete()` on all user-scoped documents on Cloud Firestore.

---

## BUG 4: Split-Brain Gamification Ledger (Major)

* **Severity**: Major
* **Files**: `js/pages/account.js` vs `core/GamificationEngine.js`
* **Trigger condition**: Completing a task or habit to earn XP.
* **Reproduction Steps**:
  1. Complete a habit or task to trigger an XP award.
  2. Verify that the underlying `GamificationEngine` writes the new XP entry to the Firestore `XpRepository`.
  3. Navigate to `pages/account.html` and look at the level progress bar.
  4. Note that the XP and level remain unchanged because it reads from the local legacy field `currentData.profile.xp`.
* **Technical Diagnosis**:
  The Account hero profile visual card queries `currentData.profile.xp`. However, the active Firestore gamification ledger records XP entries in `XpRepository`. The display UI has not been hooked up to listen to the unified repository.
* **Suggested Fix**:
  Refactor `js/pages/account.js` to subscribe to `XpRepository` and `AchievementRepository` to display live gamification values.
