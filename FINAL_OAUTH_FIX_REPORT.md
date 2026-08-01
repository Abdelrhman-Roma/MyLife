# Google and GitHub Authentication Fix Report

## Root cause

The OAuth buttons and their event listeners were present in `index.html` and `js/pages/auth-oauth.js`; CSS does not block their pointer events. The checkout has no Firebase environment values, however. `.env.example` contains empty `VITE_FIREBASE_*` placeholders and no `.env.local` supplies values, so the Firebase app cannot make a valid Google or GitHub authorization request.

The former UI also did not prevent default button behavior explicitly, did not log failed OAuth attempts, and offered no redirect fallback when a browser blocked a popup. As a result, configuration/module failures could present as an apparently inactive button.

## Changes made

- `firebase/firebase.js`
  - Exports `missingFirebaseConfig` and reports exactly which required values are absent.
- `firebase/auth.js`
  - Adds `signInWithRedirect()` and `getRedirectResult()` wrappers.
- `services/AuthService.js`
  - Refuses OAuth with a clear `auth/missing-config` result when configuration is incomplete.
  - Adds safe redirect initiation and completion, including profile synchronization after return.
- `js/pages/auth-oauth.js`
  - Uses `preventDefault()`, logs raw failures for diagnosis, displays mapped user-safe messages, and falls back to redirect only for `auth/popup-blocked`.
  - Completes the redirect session, bridges the authenticated user to the legacy session, then proceeds to the dashboard.
- `core/ErrorMapper.js`
  - Maps missing configuration, unauthorized-domain, disabled-provider, and invalid API-key errors to actionable messages.

## Firebase Console requirements

Before OAuth can succeed, create a local `.env.local` from `.env.example` with the Firebase web-app configuration, then configure Firebase Console:

1. Authentication → Sign-in method: enable **Google** and **GitHub**.
2. For GitHub, create an OAuth app and enter its client ID and client secret in the GitHub provider configuration. Its callback URL must be the one Firebase displays.
3. Authentication → Settings → Authorized domains: add the deployed domain and `localhost` for local development.
4. Deploy the reviewed Firestore rules before relying on profile synchronization.

## Verification

- All OAuth button selectors, IDs/classes, listeners, loading states, ARIA labels, and popup/redirect code paths were traced.
- The Firebase SDK is modular v11 and uses one app/auth instance with `GoogleAuthProvider`, `GithubAuthProvider`, `signInWithPopup`, `signInWithRedirect`, `getRedirectResult`, and auth-state observers.
- `npm run verify` passed: production build, JavaScript syntax, JSON, source HTML IDs, and required build assets.

## Remaining external validation

Actual Google/GitHub popup, redirect, OAuth network, session restoration, and Firestore profile writes cannot be executed in this checkout because it contains no Firebase project credentials and no access to the project's Firebase Console. Once the four configuration steps above are complete, the repaired flow will surface any provider/domain/network error directly in the UI and console instead of failing silently.
