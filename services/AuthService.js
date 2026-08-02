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

const PROVIDER_ID_MAP = { google: 'google.com', github: 'github.com', email: 'password' };
const LAST_METHOD_MESSAGE = 'You can\u2019t remove your only sign-in method \u2014 connect another one first.';

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

  // ─── Phase 5: OAuth sign-in, provider linking, profile sync ──────────────

  /**
   * Signs in with Google or GitHub via popup. On success, syncs the user's
   * profile metadata (display name, photo, provider, verification status,
   * last login) into Firestore — "every login should update profile
   * metadata," per the brief.
   * @param {'google'|'github'} providerId
   */
  signInWithProvider(providerId) {
    return tryFirebase(async () => {
      const credential = await fbAuth.signInWithProviderPopup(providerId);
      await this._syncProfileFromAuthUser(credential.user, providerId);
      return credential.user;
    });
  }

  /**
   * Links an additional provider onto the currently signed-in user (e.g. a
   * user who registered with email choosing "Connect Google" later).
   * Firebase automatically prevents linking a provider identity that's
   * already attached to a DIFFERENT user (throws
   * `auth/credential-already-in-use`); ErrorMapper turns that into a clear
   * message rather than this method trying to auto-merge accounts, which
   * Firebase's client SDK cannot safely do on its own.
   * @param {'google'|'github'} providerId
   */
  linkProvider(providerId) {
    return tryFirebase(async () => {
      if (!this.currentUser) throw new Error('No signed-in user.');
      const alreadyLinked = this.currentUser.providerData.some((p) => p.providerId === PROVIDER_ID_MAP[providerId]);
      if (alreadyLinked) {
        const err = new Error('Already linked');
        err.code = 'auth/provider-already-linked';
        throw err;
      }
      const credential = await fbAuth.linkProviderPopup(this.currentUser, providerId);
      this.currentUser = fbAuth.getCurrentUser(); // Phase 6 audit: explicit refresh, don't rely on the SDK's in-place mutation behavior
      await this._syncProfileFromAuthUser(credential.user, providerId);
      return credential.user;
    });
  }

  /**
   * Unlinks a provider — refuses if it's the user's only remaining sign-in
   * method ("never allow users to remove their last login method," per the
   * brief), checked client-side against `user.providerData.length` before
   * ever calling Firebase.
   * @param {'google'|'github'|'email'} providerId
   */
  unlinkProvider(providerId) {
    return tryFirebase(async () => {
      if (!this.currentUser) throw new Error('No signed-in user.');
      if (this.currentUser.providerData.length <= 1) {
        const err = new Error(LAST_METHOD_MESSAGE);
        err.code = 'LAST_METHOD';
        throw err;
      }
      await fbAuth.unlinkProvider(this.currentUser, PROVIDER_ID_MAP[providerId]);
      this.currentUser = fbAuth.getCurrentUser();
      return true;
    });
  }

  /**
   * @returns {{ id: 'google'|'github'|'email', connected: boolean }[]}
   * Connected-provider status for the currently signed-in user, in the
   * shape the account page's badges need directly.
   */
  getConnectedProviders() {
    const linked = new Set((this.currentUser?.providerData || []).map((p) => p.providerId));
    return [
      { id: 'email', connected: linked.has('password') },
      { id: 'google', connected: linked.has('google.com') },
      { id: 'github', connected: linked.has('github.com') },
    ];
  }

  /**
   * Resolves the best available avatar: the signed-in user's own photoURL
   * (set by whichever provider they used — Google/GitHub both supply one),
   * falling back to a deterministic generated avatar (initials on a color
   * derived from their uid) so a broken image is never shown, per the
   * brief's "never show broken images."
   * @returns {{ type: 'photo', url: string } | { type: 'initials', initials: string, color: string }}
   */
  getAvatar() {
    const user = this.currentUser;
    if (user?.photoURL) return { type: 'photo', url: user.photoURL };
    const name = user?.displayName || user?.email || '?';
    const initials = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('') || '?';
    const palette = ['#2563eb', '#059669', '#7c3aed', '#d97706', '#dc2626', '#0891b2'];
    const seed = (user?.uid || name).split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    return { type: 'initials', initials, color: palette[seed % palette.length] };
  }

  /**
   * Writes/updates the user's Firestore profile document from their current
   * Firebase Auth user object. Called after every successful sign-in
   * (email, Google, or GitHub) and after linking a new provider — this is
   * the one place "profile synchronization" actually happens, per the
   * brief, rather than being reimplemented at each call site.
   * @param {import('firebase/auth').User} user
   * @param {string} [providerId]
   */
  async _syncProfileFromAuthUser(user, providerId) {
    const existing = await UserService.getProfile(user.uid);
    const patch = {
      email: user.email || '',
      displayName: user.displayName || existing.data?.displayName || '',
      photoURL: user.photoURL || existing.data?.photoURL || null,
      emailVerified: user.emailVerified,
      lastLoginAt: new Date().toISOString(),
      lastProvider: providerId || 'email',
    };
    if (existing.ok && existing.data) {
      await UserService.updateProfile(user.uid, patch);
    } else {
      await UserService.createProfile(user.uid, { email: patch.email, displayName: patch.displayName });
      await UserService.updateProfile(user.uid, patch);
    }
  }
}

/** Singleton — import this, don't construct your own. */
export const AuthService = new AuthServiceImpl();
