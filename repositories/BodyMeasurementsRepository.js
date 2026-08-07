/**
 * repositories/BodyMeasurementsRepository.js
 * ---------------------------------------------------------------------------
 * Repository for body-measurement log entries (weight/waist over time).
 * Lives at bodyMeasurements/{uid}/items/{itemId}. Thin by design — see
 * NutritionRepository.js for why.
 */

import { BaseRepository } from './BaseRepository.js';

export class BodyMeasurementsRepository extends BaseRepository {
  /** @param {string} uid */
  constructor(uid) {
    super('bodyMeasurements', uid);
  }
}
