/**
 * repositories/PrayerRepository.js
 * ---------------------------------------------------------------------------
 * Repository for the Prayer module. All Prayer data lives at
 * prayer/{uid}/items/{itemId} (see BaseRepository for why).
 *
 * This file is intentionally thin: module-specific query helpers belong
 * here, but generic CRUD/realtime/batch/transaction logic stays in
 * BaseRepository so it is implemented, tested, and fixed exactly once.
 */

import { BaseRepository } from './BaseRepository.js';

export class PrayerRepository extends BaseRepository {
  /** @param {string} uid */
  constructor(uid) {
    super('prayer', uid);
  }
}
