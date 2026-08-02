/**
 * repositories/StreakRepository.js
 * Phase 9 — users/{uid}/streaks/{itemId}, via UserScopedRepository (see that
 * file for why this shape needs a different base than BaseRepository's
 * usual {module}/{uid}/items path).
 */
import { UserScopedRepository } from './UserScopedRepository.js';

export class StreakRepository extends UserScopedRepository {
  /** @param {string} uid */
  constructor(uid) {
    super('streaks', uid);
  }

  /**
   * Streak documents use a deterministic id equal to their `kind`
   * (e.g. 'daily-activity', 'prayer', 'habit:abc123') so
   * `updateStreak()` in core/GamificationEngine.js can read-then-write
   * the same document every time without a query.
   * @param {string} kind
   */
  getByKind(kind) {
    return this.get(kind);
  }
}
