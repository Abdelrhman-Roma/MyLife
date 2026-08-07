/**
 * repositories/PomodoroRepository.js
 * ---------------------------------------------------------------------------
 * Pomodoro timer settings (mode/workMin/breakMin/sessionsToday/dailyGoal/
 * lastResetDate/soundOn) are a single object per user, not a list of items —
 * see SingletonDocRepository.js for why. Lives at pomodoro/{uid}.
 */

import { SingletonDocRepository } from './SingletonDocRepository.js';

export class PomodoroRepository extends SingletonDocRepository {
  /** @param {string} uid */
  constructor(uid) {
    super('pomodoro', uid);
  }
}
