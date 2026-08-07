/**
 * repositories/AssignmentRepository.js
 * ---------------------------------------------------------------------------
 * Part of the Study page's entity family (see js/study.js's ENTITY_META).
 * Lives at assignments/{uid}/items/{id}. Thin by design — see
 * NutritionRepository.js for why.
 */

import { BaseRepository } from './BaseRepository.js';

export class AssignmentRepository extends BaseRepository {
  /** @param {string} uid */
  constructor(uid) {
    super('assignments', uid);
  }
}
