/**
 * repositories/ProfileRepository.js
 * ---------------------------------------------------------------------------
 * A single object per user (see SingletonDocRepository.js for why this
 * doesn't use BaseRepository's items-collection shape). Lives at profile/{uid}.
 */

import { SingletonDocRepository } from './SingletonDocRepository.js';

export class ProfileRepository extends SingletonDocRepository {
  /** @param {string} uid */
  constructor(uid) {
    super('profile', uid);
  }
}
