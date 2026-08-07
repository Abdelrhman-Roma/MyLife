/**
 * repositories/QuranFavoriteRepository.js
 * ---------------------------------------------------------------------------
 * Favorited Quran verses ({surah, ayah} refs). Lives at
 * quranFavorites/{uid}/items/{id}. Thin by design — see
 * NutritionRepository.js for why.
 */

import { BaseRepository } from './BaseRepository.js';

export class QuranFavoriteRepository extends BaseRepository {
  /** @param {string} uid */
  constructor(uid) {
    super('quranFavorites', uid);
  }
}
