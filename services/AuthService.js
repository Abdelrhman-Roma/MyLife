/**
 * services/AuthService.js
 * ---------------------------------------------------------------------------
 * Centralized authentication layer. This is the ONLY place sign-in/out,
 * registration, password reset, email verification, and session restore are
 * implemented. UI pages call these methods; they never call firebase/auth.js
 * (or the Firebase SDK) directly.
 */

import * as fbAuth from '../firebase/auth.js';
import { tryFirebase } from '../core/ErrorMapper.js';
import { UserService } from './UserService.js';

class AuthServiceImpl {
  constructor() {
    /** @type {import('firebase/auth').User|null} */
    this.currentUser = fbAuth.getCurrentUser();
    /** @type {Set<(user: import('firebase/auth').User|null) => void>} */
    this._listeners = new Set();
    /** @type {Promise<import('firebase/auth').User|null>} resolves once Firebase has restored (or confirmed there is no) session */
    this.ready = new Promise((resolve) => {
      const unsubscribe = fbAuth.onAuthStateChanged((user) => {
        this.currentUser = user;
        resolve(user);
        this._listeners.forEach((cb) => cb(user));
        unsubscribe(); // only needed once for the initial "session restore" resolution
      });
    });
    // Keep listening for the lifetime of the app (sign-in/out from any tab).
    fbAuth.onAuthStateChanged((user) => {
      this.currentUser = user;
      this._listeners.forEach((cb) => cb(user));
    });
  }

  /** @returns {import('firebase/auth').User|null} */
  getCurrentUser() {
    return this.currentUser;
  }

  /** Resolves once the initial session-restore check (page load) has completed. */
  waitUntilReady() {
    return this.ready;
  }

  /**
   * Subscribes to auth-state changes (sign in, sign out, token refresh).
   * @param {(user: import('firebase/auth').User|null) => void} callback
   * @returns {() => void} unsubscribe
   */
  onAuthStateChange(callback) {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  /**
   * @param {string} email @param {string} password
   */
  signIn(email, password) {
    return tryFirebase(async () => {
      const credential = await fbAuth.signIn(email, password);
      return credential.user;
    });
  }

  /**
   * Registers a new account, sets an initial display name, creates the
   * user's Firestore profile document, and kicks off email verification —
   * the full "Register" flow in one call so UI code can't accidentally
   * do these steps out of order or skip one.
   * @param {string} email @param {string} password @param {{ displayName?: string }} [profile]
   */
  register(email, password, profile = {}) {
    return tryFirebase(async () => {
      const credential = await fbAuth.createUser(email, password);
      if (profile.displayName) {
        await fbAuth.updateProfile(credential.user, { displayName: profile.displayName });
      }
      await UserService.createProfile(credential.user.uid, {
        email,
        displayName: profile.displayName || '',
      });
      await fbAuth.sendEmailVerification(credential.user);
      return credential.user;
    });
  }

  signOut() {
    return tryFirebase(() => fbAuth.signOut());
  }

  /** @param {string} email */
  sendPasswordReset(email) {
    return tryFirebase(() => fbAuth.sendPasswordResetEmail(email));
  }

  /** Resends a verification email to the currently signed-in user. */
  resendEmailVerification() {
    return tryFirebase(async () => {
      if (!this.currentUser) throw new Error('No signed-in user to verify.');
      return fbAuth.sendEmailVerification(this.currentUser);
    });
  }

  /** Re-fetches the current user's record (e.g. after clicking an email-verification link). */
  refreshEmailVerificationStatus() {
    return tryFirebase(async () => {
      if (!this.currentUser) return false;
      await fbAuth.reloadUser(this.currentUser);
      this.currentUser = fbAuth.getCurrentUser();
      return !!this.currentUser?.emailVerified;
    });
  }

  /** @param {string} currentPassword @param {string} newPassword */
  changePassword(currentPassword, newPassword) {
    return tryFirebase(async () => {
      if (!this.currentUser) throw new Error('No signed-in user.');
      return fbAuth.changePassword(this.currentUser, currentPassword, newPassword);
    });
  }
}

/** Singleton — import this, don't construct your own. */
export const AuthService = new AuthServiceImpl();
