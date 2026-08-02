/**
 * services/UserService.js
 * ---------------------------------------------------------------------------
 * Manages each user's top-level profile document at users/{uid} — settings,
 * notification preferences, theme/language choice synced across devices,
 * onboarding state, etc. (Everything that isn't Todo/Habit/Goal/... item
 * data, which belongs to the per-module repositories instead.)
 *
 * Deliberately NOT a subclass of BaseRepository: users/{uid} is a single
 * document per user, not a `{module}/{uid}/items/{itemId}` collection, so
 * the collection-oriented BaseRepository contract doesn't fit cleanly here.
 */

import { docRef, getDoc, setDoc, updateDoc, onSnapshot, serverTimestamp } from '../firebase/firestore.js';
import { tryFirebase } from '../core/ErrorMapper.js';
import { assertUid, assertPlainObject } from '../utils/validators.js';

class UserServiceImpl {
  /** @param {string} uid @returns {import('firebase/firestore').DocumentReference} */
  _ref(uid) {
    assertUid(uid);
    return docRef('users', uid);
  }

  /**
   * Creates the initial profile document for a newly-registered user.
   * Called once, from AuthService.register() — nowhere else should create
   * this document, to avoid two code paths racing to initialize it
   * differently.
   * @param {string} uid @param {{ email: string, displayName?: string }} initial
   */
  createProfile(uid, initial) {
    assertPlainObject(initial);
    return tryFirebase(() => setDoc(this._ref(uid), {
      email: initial.email,
      displayName: initial.displayName || '',
      settings: { theme: 'dark', palette: 'deep-space', language: 'English', fontSize: 'md', radius: 'md' },
      workspace: { id: 'personal', name: 'Personal workspace', createdAt: new Date().toISOString() },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true }));
  }

  /** @param {string} uid */
  getProfile(uid) {
    return tryFirebase(async () => {
      const snap = await getDoc(this._ref(uid));
      return snap.exists() ? { id: snap.id, ...snap.data() } : null;
    });
  }

  /** @param {string} uid @param {Record<string, unknown>} patch */
  updateProfile(uid, patch) {
    assertPlainObject(patch);
    return tryFirebase(() => updateDoc(this._ref(uid), { ...patch, updatedAt: serverTimestamp() }));
  }

  /**
   * Subscribes to realtime profile changes — e.g. a settings change made on
   * another device (or another tab) reflecting immediately, which directly
   * replaces the old LocalStorage architecture's lack of cross-tab sync
   * (see the Phase 4 audit's FINAL-BUG-001).
   * @param {string} uid
   * @param {(profile: Record<string, unknown>|null) => void} callback
   */
  subscribeProfile(uid, callback) {
    return onSnapshot(this._ref(uid), (snap) => callback(snap.exists() ? { id: snap.id, ...snap.data() } : null));
  }
}

/** Singleton — import this, don't construct your own. */
export const UserService = new UserServiceImpl();
