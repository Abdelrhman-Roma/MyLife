# Changelog: Momentum (MyLife)

All notable changes to the **Momentum (MyLife)** product are documented in this file.

---

## [1.0.0] - Stable Release

This release establishes the baseline production foundation, introducing Cloud Firestore persistence and the Repository Pattern.

### Added
- **Authentication**: Modern Firebase Authentication integration supporting email/password sign-in and session persistence.
- **Repository Pattern**: Built abstract, unified repository layers (`TodoRepository`, `ProfileRepository`, `SettingsRepository`) to isolate data persistence logic.
- **Realtime Sync**: Introduced the dynamic `RepoAggregatorSync` to fetch and mirror Firestore documents into the local render cache in real time.
- **PWA Capabilities**: Added offline caching support via the Service Worker (`sw.js`) and application manifest definition.
- **Language Localization**: Multi-lingual interface support for English, Arabic (with RTL), German, and French.

### Fixed
- **Dashboard Load Flicker**: Resolved page-flicker issues by debouncing parallel Firestore subscriptions inside the data sync aggregator.
- **Secure Password Updates**: Redirected settings page password updates through the authenticated `AuthService.changePassword` endpoint.
- **IndexedDB Image Isolation**: Moved profile images and covers into localized IndexedDB storage to bypass base64 document constraints.
