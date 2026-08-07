/**
 * repositories/SecurityRepository.js
 * ---------------------------------------------------------------------------
 * A single object per user (see SingletonDocRepository.js for why this
 * doesn't use BaseRepository's items-collection shape). Lives at security/{uid}.
 */

import { SingletonDocRepository } from './SingletonDocRepository.js';

export class SecurityRepository extends SingletonDocRepository {
  /** @param {string} uid */
  constructor(uid) {
    super('security', uid);
  }
}
