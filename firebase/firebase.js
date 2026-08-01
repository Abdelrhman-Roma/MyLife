/**
 * firebase/firebase.js
 * ---------------------------------------------------------------------------
 * Single source of truth for Firebase initialization.
 *
 * Every other file in this project (services, repositories, core) must import
 * `app`, `auth`, or `db` from THIS file only. Nothing outside this file is
 * allowed to call `initializeApp()` — that is what prevents duplicate
 * initialization (a common source of "Firebase App named '[DEFAULT]' already
 * exists" runtime errors).
 *
 * Requires the `firebase` npm package (Firebase Modular / v9+ SDK):
 *   npm install firebase
 *
 * NOTE ON PROJECT STRUCTURE: MyLife currently has no build step / bundler and
 * loads plain <script> tags into one shared global scope (see the Phase 3
 * technical audit). The Firebase Modular SDK is distributed as ES modules and
 * cannot be loaded that way. Every file introduced in this migration
 * (firebase/, services/, repositories/, utils/, core/) is written as a real
 * ES module (import/export). To run this code you need ONE of:
 *   (a) a lightweight bundler (Vite/esbuild) added via the included
 *       package.json — the recommended, production-grade path, or
 *   (b) `<script type="module">` tags pointing at these files directly,
 *       swapping the `firebase` bare-specifier imports below for the
 *       CDN ESM build (https://www.gstatic.com/firebasejs/<version>/firebase-app.js)
 *       as a stop-gap that needs no build step.
 * This is a real, disclosed architectural change — not something that can be
 * quietly bolted onto the existing plain-script pages. See MIGRATION_NOTES.md.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

/**
 * Firebase project configuration.
 * Loaded from environment variables (Vite's `import.meta.env`) rather than
 * hardcoded here — Phase 4 production-hardening: even though Firebase Web
 * API keys are not secret in the traditional sense (they identify a project,
 * not authenticate one), hardcoding them still couples this file to one
 * environment and makes it easy to accidentally commit a different project's
 * config. Copy `.env.example` to `.env.local` and fill in your project's
 * values (Firebase Console → Project Settings → General → Your apps);
 * Vite loads `.env.local` automatically and `.gitignore` already excludes it.
 * @type {import('firebase/app').FirebaseOptions}
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const missingFirebaseConfig = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingFirebaseConfig.length) {
  // Fail loudly and early rather than letting every Firebase call downstream
  // throw a cryptic "invalid-api-key" error with no context about why.
  console.error(`[firebase] Missing Firebase configuration: ${missingFirebaseConfig.join(', ')}. Copy .env.example to .env.local and fill in your project config.`);
}

/**
 * Returns the single shared FirebaseApp instance, creating it on first call.
 * Safe to call from multiple files/modules — `getApps().length` guards against
 * the "already exists" error if this module is somehow evaluated twice
 * (e.g. duplicate bundles).
 * @returns {import('firebase/app').FirebaseApp}
 */
function getFirebaseApp() {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export const app = getFirebaseApp();

/**
 * Firestore instance with offline persistence enabled up front via
 * `initializeFirestore` (the modern replacement for the deprecated
 * `enableIndexedDbPersistence`). `persistentMultipleTabManager` lets several
 * open tabs share one persistence layer instead of fighting over it — this
 * directly addresses the cross-tab data-loss risk documented in the Phase 4
 * audit of the old LocalStorage architecture.
 */
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

export const auth = getAuth(app);

export default app;
