/**
 * repositories/UserScopedRepository.js
 * ---------------------------------------------------------------------------
 * Phase 9 needs `users/{uid}/xp`, `users/{uid}/badges`,
 * `users/{uid}/achievements`, `users/{uid}/streaks`, `users/{uid}/challenges`
 * — subcollections directly under the user's own profile document, per the
 * brief's literal schema. `BaseRepository` assumes `{module}/{uid}/items`
 * (a top-level collection per module), which doesn't fit that shape.
 *
 * Rather than duplicate BaseRepository's get/getAll/create/update/delete/
 * subscribe/batch/transaction/paginate/searchByPrefix/optimisticUpdate logic
 * a second time, this overrides only the two path-building methods
 * BaseRepository already isolates for exactly this reason — every other
 * method calls through `itemsCollection`/`itemDoc`, so overriding just these
 * two is enough to retarget the entire contract at a new path shape.
 */

import { BaseRepository } from './BaseRepository.js';
import { collectionRef, docRef } from '../firebase/firestore.js';
import { assertId } from '../utils/validators.js';

export class UserScopedRepository extends BaseRepository {
  /**
   * @param {string} subcollection - e.g. 'xp', 'badges', 'achievements', 'streaks', 'challenges'
   * @param {string} uid
   */
  constructor(subcollection, uid) {
    super(subcollection, uid); // BaseRepository stores this as `this.moduleName` — reused as the subcollection name here
  }

  get itemsCollection() {
    return collectionRef('users', this.uid, this.moduleName);
  }

  itemDoc(id) {
    assertId(id);
    return docRef('users', this.uid, this.moduleName, id);
  }
}
