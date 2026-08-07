# Production Readiness Report: Momentum (MyLife)

This document provides a final assessment of the **Momentum** application's production readiness, detailing a formal release checklist and a list of remaining domains to migrate.

---

## 1. Release Readiness Grade

* **Current Readiness Assessment**: **B+ (Highly Stable, but split-brain bugs must be patched before rollout)**
* **Core Strengths**: Strong PWA capabilities, clean modular folder structure, excellent security rule coverage, complete multi-language i18n support.
* **Core Vulnerabilities**: Split-brain settings and gamification synchronization; Geolocation lockout loop.

---

## 2. Production Release Checklist

Before launching Momentum to public production, the following milestones must be executed:

- [ ] **Fix Geolocation Catch Block**: Change `js/weather-dashboard.js` to prevent hard-redirecting users away from the Dashboard upon geolocation rejection.
- [ ] **Unify Notification Settings**: Map Account Settings toggle states directly to Firestore-backed `profile.notificationSettings`.
- [ ] **Implement Repository Bulk Delete**: Update the "Reset Statistics" callback to iterate through and clear all active Cloud Firestore collections instead of clearing local variables only.
- [ ] **Verify Firebase Hosting CSP Headers**: Ensure `firebase.json` headers allow images from `lh3.googleusercontent.com` and `firebasestorage.googleapis.com`.
- [ ] **Configure Manual Chunking in Vite**: Split out the Firebase SDK bundle (`584KB`) to optimize initial page loading speeds.

---

## 3. Remaining Domains to Migrate

Today, only the Todo module is fully integrated on Cloud Firestore. The remaining modules still operate on top of the browser local storage model.

Below is the planned migration priority schedule for migrating the rest of the application to Cloud Firestore:

| Priority | Module / Domain | Status | Dependency / Effort |
| :--- | :--- | :--- | :--- |
| **P0** | **Settings & Notifications** | Partially Migrated | Mapped to `SettingsRepository` but blocked by legacy split-brain. |
| **P1** | **Gamification & Profile** | Partially Migrated | Mapped to `ProfileRepository`, `XpRepository` and `AchievementRepository`. |
| **P2** | **Workout Plan & Schedule** | Pending | Highly dependent on Calendar integration. Medium effort. |
| **P3** | **Nutrition & Meals** | Pending | High data-write volume. High effort. |
| **P4** | **Study & Prayer Trackers** | Pending | Moderate size; low data volume. Low effort. |
