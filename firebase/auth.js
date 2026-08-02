/**
 * firebase/auth.js
 * ---------------------------------------------------------------------------
 * Thin, reusable wrapper around the Firebase Auth SDK, bound to the single
 * `auth` instance exported by firebase/firebase.js.
 *
 * This file does NOT contain business/auth-flow logic (that lives in
 * services/AuthService.js). It only exists so nothing else in the project
 * needs to `import { ... } from 'firebase/auth'` directly — every Firebase
 * Auth call in the app funnels through here, which is what "never duplicate
 * auth logic" and "don't place Firebase logic inside UI pages" mean in
 * practice.
 */

import {
  onAuthStateChanged as _onAuthStateChanged,
  signInWithEmailAndPassword as _signIn,
  createUserWithEmailAndPassword as _createUser,
  signOut as _signOut,
  sendPasswordResetEmail as _sendPasswordResetEmail,
  sendEmailVerification as _sendEmailVerification,
  updateProfile as _updateProfile,
  reload as _reload,
  EmailAuthProvider,
  reauthenticateWithCredential as _reauthenticateWithCredential,
  updatePassword as _updatePassword,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup as _signInWithPopup,
  linkWithPopup as _linkWithPopup,
  unlink as _unlink,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { auth } from './firebase.js';

function logAuthError(operation, error) {
  console.error(`[firebase-auth] ${operation} failed`, {
    code: error?.code || 'NO_CODE',
    message: error?.message || String(error),
    stack: error?.stack || '(no stack provided)',
  });
}

async function runAuth(operation, action) {
  try {
    return await action();
  } catch (error) {
    logAuthError(operation, error);
    throw error;
  }
}

// Firebase defaults to local persistence in browsers. Setting it explicitly
// makes the intended session behavior deterministic and observable.
const authPersistenceReady = auth
  ? runAuth('setPersistence', () => setPersistence(auth, browserLocalPersistence))
  : Promise.resolve();

/** @returns {import('firebase/auth').User|null} */
export function getCurrentUser() {
  return auth?.currentUser || null;
}

/**
 * Subscribes to Firebase's auth-state observer.
 * @param {(user: import('firebase/auth').User|null) => void} callback
 * @returns {() => void} unsubscribe function
 */
export function onAuthStateChanged(callback) {
  if (!auth) {
    callback(null);
    return () => {};
  }
  let unsubscribe = () => {};
  let disposed = false;
  authPersistenceReady.then(
    () => { if (!disposed) unsubscribe = _onAuthStateChanged(auth, callback, (error) => logAuthError('onAuthStateChanged', error)); },
    () => { if (!disposed) unsubscribe = _onAuthStateChanged(auth, callback, (error) => logAuthError('onAuthStateChanged', error)); },
  );
  return () => { disposed = true; unsubscribe(); };
}

/** @param {string} email @param {string} password */
export async function signIn(email, password) {
  if (!auth) throw new Error('Firebase Auth is not configured in this environment.');
  await authPersistenceReady;
  return runAuth('signInWithEmailAndPassword', () => _signIn(auth, email, password));
}

/** @param {string} email @param {string} password */
export async function createUser(email, password) {
  if (!auth) throw new Error('Firebase Auth is not configured in this environment.');
  await authPersistenceReady;
  return runAuth('createUserWithEmailAndPassword', () => _createUser(auth, email, password));
}

export async function signOut() {
  if (!auth) return Promise.resolve();
  return runAuth('signOut', () => _signOut(auth));
}

/** @param {string} email */
export async function sendPasswordResetEmail(email) {
  if (!auth) throw new Error('Firebase Auth is not configured in this environment.');
  return runAuth('sendPasswordResetEmail', () => _sendPasswordResetEmail(auth, email));
}

/** @param {import('firebase/auth').User} user */
export async function sendEmailVerification(user) {
  if (!auth) throw new Error('Firebase Auth is not configured in this environment.');
  return runAuth('sendEmailVerification', () => _sendEmailVerification(user));
}

/** @param {import('firebase/auth').User} user @param {{displayName?: string, photoURL?: string}} profile */
export async function updateProfile(user, profile) {
  if (!auth) throw new Error('Firebase Auth is not configured in this environment.');
  return runAuth('updateProfile', () => _updateProfile(user, profile));
}

/** @param {import('firebase/auth').User} user */
export async function reloadUser(user) {
  if (!auth) return Promise.resolve(user);
  return runAuth('reload', () => _reload(user));
}

/**
 * Re-authenticates the current user with a fresh password, then updates it.
 * Firebase requires a "recent login" for sensitive operations like changing
 * a password — this wraps that two-step dance into one call.
 * @param {import('firebase/auth').User} user
 * @param {string} currentPassword
 * @param {string} newPassword
 */
export async function changePassword(user, currentPassword, newPassword) {
  return runAuth('changePassword', async () => {
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await _reauthenticateWithCredential(user, credential);
    return _updatePassword(user, newPassword);
  });
}

export { auth };

// ─── Phase 5: OAuth providers (Google/GitHub) ──────────────────────────────
// Provider instances are created once and reused, per Firebase's own
// recommendation, rather than `new GoogleAuthProvider()` at every call site.
const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();
githubProvider.addScope('read:user'); // enough to get name/avatar/email, nothing more

/** @param {'google'|'github'} providerId */
function providerFor(providerId) {
  if (providerId === 'google') return googleProvider;
  if (providerId === 'github') return githubProvider;
  throw new Error(`Unknown provider: ${providerId}`);
}

/**
 * Signs in with a popup for the given OAuth provider. If the signed-in
 * email already has an account under a different provider, Firebase throws
 * `auth/account-exists-with-different-credential` — the caller (see
 * AuthService.signInWithProvider) is responsible for surfacing that clearly
 * rather than this file silently swallowing or reinterpreting it.
 * @param {'google'|'github'} providerId
 */
export async function signInWithProviderPopup(providerId) {
  if (!auth) throw new Error('Firebase Auth is not configured in this environment.');
  await authPersistenceReady;
  return runAuth(`signInWithPopup:${providerId}`, () => _signInWithPopup(auth, providerFor(providerId)));
}

/**
 * Links an additional OAuth provider onto the CURRENTLY signed-in user
 * (e.g. a user who registered with email later choosing "Connect Google").
 * @param {import('firebase/auth').User} user
 * @param {'google'|'github'} providerId
 */
export async function linkProviderPopup(user, providerId) {
  if (!auth) throw new Error('Firebase Auth is not configured in this environment.');
  return runAuth(`linkWithPopup:${providerId}`, () => _linkWithPopup(user, providerFor(providerId)));
}

/**
 * Unlinks a provider from the currently signed-in user. Firebase itself
 * does not prevent removing the last sign-in method — that check belongs
 * in AuthService.unlinkProvider(), not here, since this file is meant to
 * stay a thin SDK wrapper with no business rules.
 * @param {import('firebase/auth').User} user
 * @param {string} providerId - Firebase's provider id string, e.g. 'google.com'/'github.com'/'password'
 */
export async function unlinkProvider(user, providerId) {
  if (!auth) throw new Error('Firebase Auth is not configured in this environment.');
  return runAuth(`unlink:${providerId}`, () => _unlink(user, providerId));
}
