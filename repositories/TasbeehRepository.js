/**
 * repositories/TasbeehRepository.js
 * ---------------------------------------------------------------------------
 * The Tasbeeh counter is a single object per user (count/target/updatedAt),
 * not a list of items — see SingletonDocRepository.js for why that needs a
 * different base than BaseRepository. Lives at tasbeeh/{uid}.
 */

import { SingletonDocRepository } from './SingletonDocRepository.js';

export class TasbeehRepository extends SingletonDocRepository {
  /** @param {string} uid */
  constructor(uid) {
    super('tasbeeh', uid);
  }
}
