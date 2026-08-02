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
} from 'firebase/auth';
import { auth } from './firebase.js';

/** @returns {import('firebase/auth').User|null} */
export function getCurrentUser() {
  return auth.currentUser;
}

/**
 * Subscribes to Firebase's auth-state observer.
 * @param {(user: import('firebase/auth').User|null) => void} callback
 * @returns {() => void} unsubscribe function
 */
export function onAuthStateChanged(callback) {
  return _onAuthStateChanged(auth, callback);
}

/** @param {string} email @param {string} password */
export function signIn(email, password) {
  return _signIn(auth, email, password);
}

/** @param {string} email @param {string} password */
export function createUser(email, password) {
  return _createUser(auth, email, password);
}

export function signOut() {
  return _signOut(auth);
}

/** @param {string} email */
export function sendPasswordResetEmail(email) {
  return _sendPasswordResetEmail(auth, email);
}

/** @param {import('firebase/auth').User} user */
export function sendEmailVerification(user) {
  return _sendEmailVerification(user);
}

/** @param {import('firebase/auth').User} user @param {{displayName?: string, photoURL?: string}} profile */
export function updateProfile(user, profile) {
  return _updateProfile(user, profile);
}

/** @param {import('firebase/auth').User} user */
export function reloadUser(user) {
  return _reload(user);
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
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await _reauthenticateWithCredential(user, credential);
  return _updatePassword(user, newPassword);
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
export function signInWithProviderPopup(providerId) {
  return _signInWithPopup(auth, providerFor(providerId));
}

/**
 * Links an additional OAuth provider onto the CURRENTLY signed-in user
 * (e.g. a user who registered with email later choosing "Connect Google").
 * @param {import('firebase/auth').User} user
 * @param {'google'|'github'} providerId
 */
export function linkProviderPopup(user, providerId) {
  return _linkWithPopup(user, providerFor(providerId));
}

/**
 * Unlinks a provider from the currently signed-in user. Firebase itself
 * does not prevent removing the last sign-in method — that check belongs
 * in AuthService.unlinkProvider(), not here, since this file is meant to
 * stay a thin SDK wrapper with no business rules.
 * @param {import('firebase/auth').User} user
 * @param {string} providerId - Firebase's provider id string, e.g. 'google.com'/'github.com'/'password'
 */
export function unlinkProvider(user, providerId) {
  return _unlink(user, providerId);
}
