/**
 * repositories/ProgressPhotoRepository.js
 * ---------------------------------------------------------------------------
 * Progress photo metadata. Lives at progressPhotos/{uid}/items/{id}.
 * Thin by design — see NutritionRepository.js for why.
 */

import { BaseRepository } from './BaseRepository.js';

export class ProgressPhotoRepository extends BaseRepository {
  /** @param {string} uid */
  constructor(uid) {
    super('progressPhotos', uid);
  }
}
