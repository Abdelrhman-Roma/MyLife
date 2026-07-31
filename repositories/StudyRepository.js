/**
 * repositories/StudyRepository.js
 * ---------------------------------------------------------------------------
 * Repository for the Study module. All Study data lives at
 * study/{uid}/items/{itemId} (see BaseRepository for why).
 *
 * This file is intentionally thin: module-specific query helpers belong
 * here, but generic CRUD/realtime/batch/transaction logic stays in
 * BaseRepository so it is implemented, tested, and fixed exactly once.
 */

import { BaseRepository } from './BaseRepository.js';

export class StudyRepository extends BaseRepository {
  /** @param {string} uid */
  constructor(uid) {
    super('study', uid);
  }
}
