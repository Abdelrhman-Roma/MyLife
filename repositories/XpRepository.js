/**
 * repositories/XpRepository.js
 * Phase 9 — users/{uid}/xp/{itemId}, via UserScopedRepository (see that
 * file for why this shape needs a different base than BaseRepository's
 * usual {module}/{uid}/items path).
 */
import { UserScopedRepository } from './UserScopedRepository.js';

export class XpRepository extends UserScopedRepository {
  /** @param {string} uid */
  constructor(uid) {
    super('xp', uid);
  }
}
