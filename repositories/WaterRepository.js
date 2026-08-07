/**
 * repositories/WaterRepository.js
 * ---------------------------------------------------------------------------
 * Repository for water-intake log entries. Lives at water/{uid}/items/{itemId}.
 * Thin by design — see NutritionRepository.js for why.
 */

import { BaseRepository } from './BaseRepository.js';

export class WaterRepository extends BaseRepository {
  /** @param {string} uid */
  constructor(uid) {
    super('water', uid);
  }
}
