/**
 * repositories/HadithFavoriteRepository.js
 * ---------------------------------------------------------------------------
 * User-saved/favorited hadith entries (distinct from js/services/HadithService.js,
 * which loads the static bundled hadith reference content — this repository
 * is only the user's own saved list). Lives at hadithFavorites/{uid}/items/{id}.
 * Thin by design — see NutritionRepository.js for why.
 */

import { BaseRepository } from './BaseRepository.js';

export class HadithFavoriteRepository extends BaseRepository {
  /** @param {string} uid */
  constructor(uid) {
    super('hadithFavorites', uid);
  }
}
