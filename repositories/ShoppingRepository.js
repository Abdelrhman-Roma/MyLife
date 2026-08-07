/**
 * repositories/ShoppingRepository.js
 * ---------------------------------------------------------------------------
 * Repository for shopping-list items. Lives at shopping/{uid}/items/{itemId}.
 * Thin by design — see NutritionRepository.js for why.
 */

import { BaseRepository } from './BaseRepository.js';

export class ShoppingRepository extends BaseRepository {
  /** @param {string} uid */
  constructor(uid) {
    super('shopping', uid);
  }
}
