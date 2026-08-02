/**
 * repositories/BadgeRepository.js
 * Phase 9 — users/{uid}/badges/{itemId}, via UserScopedRepository (see that
 * file for why this shape needs a different base than BaseRepository's
 * usual {module}/{uid}/items path).
 */
import { UserScopedRepository } from './UserScopedRepository.js';

export class BadgeRepository extends UserScopedRepository {
  /** @param {string} uid */
  constructor(uid) {
    super('badges', uid);
  }
}
