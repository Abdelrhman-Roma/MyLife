/**
 * repositories/ChallengeRepository.js
 * Phase 9 — users/{uid}/challenges/{itemId}, via UserScopedRepository (see that
 * file for why this shape needs a different base than BaseRepository's
 * usual {module}/{uid}/items path).
 */
import { UserScopedRepository } from './UserScopedRepository.js';

export class ChallengeRepository extends UserScopedRepository {
  /** @param {string} uid */
  constructor(uid) {
    super('challenges', uid);
  }
}
