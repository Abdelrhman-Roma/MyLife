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

const firebaseConfig = {
  apiKey: typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_FIREBASE_API_KEY : '',
  authDomain: typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_FIREBASE_AUTH_DOMAIN : '',
  projectId: typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_FIREBASE_PROJECT_ID : '',
  storageBucket: typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_FIREBASE_STORAGE_BUCKET : '',
  messagingSenderId: typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID : '',
  appId: typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_FIREBASE_APP_ID : '',
};

const hasFirebaseConfig = Object.values(firebaseConfig).every((value) => typeof value === 'string' && value.trim().length > 0);

if (!hasFirebaseConfig) {
  console.warn('[firebase] Firebase is not configured in this environment. Auth and Firestore will be disabled until VITE_FIREBASE_* values are set.');
}

function getFirebaseApp() {
  if (!hasFirebaseConfig) return null;
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export const app = getFirebaseApp();

export const db = app ? initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
}) : null;

export const auth = app ? getAuth(app) : null;

export default app;
