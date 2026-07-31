/**
 * repositories/CalendarRepository.js
 * ---------------------------------------------------------------------------
 * Repository for the Calendar module. All Calendar data lives at
 * calendar/{uid}/items/{itemId} (see BaseRepository for why).
 *
 * This file is intentionally thin: module-specific query helpers belong
 * here, but generic CRUD/realtime/batch/transaction logic stays in
 * BaseRepository so it is implemented, tested, and fixed exactly once.
 */

import { BaseRepository } from './BaseRepository.js';

export class CalendarRepository extends BaseRepository {
  /** @param {string} uid */
  constructor(uid) {
    super('calendar', uid);
  }

  /**
   * Fetches events whose start time falls within [startIso, endIso) —
   * the query a Month/Week/Day view actually needs, rather than pulling
   * every event a user has ever created.
   * @param {string} startIso @param {string} endIso
   */
  getInRange(startIso, endIso) {
    return this.getAll({
      where: [['startsAt', '>=', startIso], ['startsAt', '<', endIso]],
      orderBy: ['startsAt', 'asc'],
    });
  }
}
