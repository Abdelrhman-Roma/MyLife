/**
 * repositories/ExamRepository.js
 * ---------------------------------------------------------------------------
 * Part of the Study page's entity family (see js/study.js's ENTITY_META).
 * Lives at exams/{uid}/items/{id}. Thin by design — see
 * NutritionRepository.js for why.
 */

import { BaseRepository } from './BaseRepository.js';

export class ExamRepository extends BaseRepository {
  /** @param {string} uid */
  constructor(uid) {
    super('exams', uid);
  }
}
