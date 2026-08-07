/**
 * repositories/SettingsRepository.js
 * ---------------------------------------------------------------------------
 * A single object per user (see SingletonDocRepository.js for why this
 * doesn't use BaseRepository's items-collection shape). Lives at settings/{uid}.
 */

import { SingletonDocRepository } from './SingletonDocRepository.js';

export class SettingsRepository extends SingletonDocRepository {
  /** @param {string} uid */
  constructor(uid) {
    super('settings', uid);
  }
}
