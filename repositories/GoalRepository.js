/**
 * repositories/GoalRepository.js
 * ---------------------------------------------------------------------------
 * Repository for the Goal module. All Goal data lives at
 * goals/{uid}/items/{itemId} (see BaseRepository for why).
 *
 * This file is intentionally thin: module-specific query helpers belong
 * here, but generic CRUD/realtime/batch/transaction logic stays in
 * BaseRepository so it is implemented, tested, and fixed exactly once.
 */

import { BaseRepository } from './BaseRepository.js';

export class GoalRepository extends BaseRepository {
  /** @param {string} uid */
  constructor(uid) {
    super('goals', uid);
  }
}
