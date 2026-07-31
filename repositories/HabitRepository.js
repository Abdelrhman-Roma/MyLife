/**
 * repositories/HabitRepository.js
 * ---------------------------------------------------------------------------
 * Repository for the Habit module. All Habit data lives at
 * habits/{uid}/items/{itemId} (see BaseRepository for why).
 *
 * This file is intentionally thin: module-specific query helpers belong
 * here, but generic CRUD/realtime/batch/transaction logic stays in
 * BaseRepository so it is implemented, tested, and fixed exactly once.
 */

import { BaseRepository } from './BaseRepository.js';

export class HabitRepository extends BaseRepository {
  /** @param {string} uid */
  constructor(uid) {
    super('habits', uid);
  }
}
