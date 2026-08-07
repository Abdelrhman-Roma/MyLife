/**
 * repositories/QuranProgressRepository.js
 * ---------------------------------------------------------------------------
 * Quran reading progress (lastSurah/lastAyah, per-day readLog, reading goal,
 * font-size setting) is a single object per user, not a list of items —
 * see SingletonDocRepository.js for why. Lives at quranProgress/{uid}.
 */

import { SingletonDocRepository } from './SingletonDocRepository.js';

export class QuranProgressRepository extends SingletonDocRepository {
  /** @param {string} uid */
  constructor(uid) {
    super('quranProgress', uid);
  }
}
