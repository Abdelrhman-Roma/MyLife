/**
 * repositories/ResourceRepository.js
 * ---------------------------------------------------------------------------
 * Part of the Study page's entity family (see js/study.js's ENTITY_META).
 * Lives at resources/{uid}/items/{id}. Thin by design — see
 * NutritionRepository.js for why.
 */

import { BaseRepository } from './BaseRepository.js';

export class ResourceRepository extends BaseRepository {
  /** @param {string} uid */
  constructor(uid) {
    super('resources', uid);
  }
}
