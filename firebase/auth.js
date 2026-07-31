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
