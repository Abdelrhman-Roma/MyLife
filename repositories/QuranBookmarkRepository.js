/**
 * repositories/QuranBookmarkRepository.js
 * ---------------------------------------------------------------------------
 * Bookmarked Quran verses ({surah, ayah} refs). Lives at
 * quranBookmarks/{uid}/items/{id}. Thin by design — see
 * NutritionRepository.js for why.
 */

import { BaseRepository } from './BaseRepository.js';

export class QuranBookmarkRepository extends BaseRepository {
  /** @param {string} uid */
  constructor(uid) {
    super('quranBookmarks', uid);
  }
}
