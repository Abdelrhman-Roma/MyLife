/**
 * repositories/SleepRepository.js
 * ---------------------------------------------------------------------------
 * Repository for sleep log entries. Lives at sleep/{uid}/items/{itemId}.
 * Thin by design — see NutritionRepository.js for why.
 */

import { BaseRepository } from './BaseRepository.js';

export class SleepRepository extends BaseRepository {
  /** @param {string} uid */
  constructor(uid) {
    super('sleep', uid);
  }
}
