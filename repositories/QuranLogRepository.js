/**
 * repositories/QuranLogRepository.js
 * ---------------------------------------------------------------------------
 * Quran reading-session log entries. Lives at quranLog/{uid}/items/{id}.
 * Thin by design — see NutritionRepository.js for why.
 */

import { BaseRepository } from './BaseRepository.js';

export class QuranLogRepository extends BaseRepository {
  /** @param {string} uid */
  constructor(uid) {
    super('quranLog', uid);
  }
}
