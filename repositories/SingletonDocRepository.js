/**
 * repositories/SingletonDocRepository.js
 * ---------------------------------------------------------------------------
 * BaseRepository assumes a domain is a *collection* of items, each with its
 * own id (todos, habits, goals, ...). Several remaining domains (Tasbeeh's
 * counter, Quran's reading progress, and eventually Settings/Profile) are a
 * single object per user instead — there's nothing to give an id to, no
 * "delete one of many," no query filtering. Forcing those into
 * BaseRepository's `items/{id}` shape would mean either a fake collection
 * with exactly one fake id (awkward, misleading to whoever reads it later)
 * or duplicating CRUD logic a second time (exactly what BaseRepository's own
 * header comment says to avoid).
 *
 * This is the smallest class that covers the singleton-document case with
 * the same principles as BaseRepository: one Firestore doc at
 * `{module}/{uid}` (a document, not a subcollection), realtime via
 * `onSnapshot`, and the same auth/uid handling. It is NOT a BaseRepository
 * subclass, because its contract is genuinely different (get/set/update on
 * one object, not create/get/update/delete/subscribe on many) — subclassing
 * something whose contract doesn't apply would be more confusing than a
 * small sibling class, not less.
 */

import { docRef, getDoc, setDoc, updateDoc, onSnapshot, serverTimestamp } from '../firebase/firestore.js';
import { tryFirebase, mapFirebaseError } from '../core/ErrorMapper.js';
import { assertUid, assertPlainObject } from '../utils/validators.js';

export class SingletonDocRepository {
  /**
   * @param {string} moduleName - e.g. 'tasbeeh', 'quranProgress'
   * @param {string} uid
   */
  constructor(moduleName, uid) {
    assertUid(uid);
    this.moduleName = moduleName;
    this.uid = uid;
  }

  get docRef() {
    return docRef(this.moduleName, this.uid);
  }

  /** @returns {Promise<{ok: boolean, data: any}>} */
  get() {
    return tryFirebase(async () => {
      const snap = await getDoc(this.docRef);
      return snap.exists() ? snap.data() : null;
    });
  }

  /** Overwrites the whole document. @param {Object} data */
  set(data) {
    assertPlainObject(data);
    return tryFirebase(async () => {
      await setDoc(this.docRef, { ...data, ownerId: this.uid, updatedAt: serverTimestamp() });
      return null;
    });
  }

  /** Merges fields into the existing document (creating it if absent). @param {Object} patch */
  update(patch) {
    assertPlainObject(patch);
    return tryFirebase(async () => {
      await setDoc(this.docRef, { ...patch, ownerId: this.uid, updatedAt: serverTimestamp() }, { merge: true });
      return null;
    });
  }

  /**
   * @param {(data: any) => void} callback
   * @param {(error: Error) => void} [onError]
   * @returns {() => void} unsubscribe
   */
  subscribe(callback, onError) {
    return onSnapshot(
      this.docRef,
      (snap) => callback(snap.exists() ? snap.data() : null),
      (error) => { if (onError) onError(mapFirebaseError(error)); }
    );
  }
}
