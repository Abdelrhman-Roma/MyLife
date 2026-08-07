/**
 * repositories/WeatherPreferencesRepository.js
 * ---------------------------------------------------------------------------
 * A single object per user (see SingletonDocRepository.js for why this
 * doesn't use BaseRepository's items-collection shape). Lives at weatherPreferences/{uid}.
 */

import { SingletonDocRepository } from './SingletonDocRepository.js';

export class WeatherPreferencesRepository extends SingletonDocRepository {
  /** @param {string} uid */
  constructor(uid) {
    super('weatherPreferences', uid);
  }
}
