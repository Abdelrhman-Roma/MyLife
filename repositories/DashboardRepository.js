/**
 * repositories/DashboardRepository.js
 * ---------------------------------------------------------------------------
 * Same design decision as StatisticsRepository (see that file's header): the
 * Dashboard has no Firestore collection of its own. It needs two things
 * beyond plain statistics — "what's overdue/next" — which are just
 * differently-filtered views over TodoRepository/CalendarRepository, so
 * this composes those plus StatisticsRepository rather than re-deriving
 * anything.
 */

import { TodoRepository } from './TodoRepository.js';
import { CalendarRepository } from './CalendarRepository.js';
import { StatisticsRepository } from './StatisticsRepository.js';

export class DashboardRepository {
  /** @param {string} uid */
  constructor(uid) {
    this.uid = uid;
    this.todos = new TodoRepository(uid);
    this.calendar = new CalendarRepository(uid);
    this.statistics = new StatisticsRepository(uid);
  }

  /**
   * Subscribes to everything the Dashboard renders: combined statistics,
   * incomplete tasks (for "up next"), and today's calendar events.
   * @param {(dashboard: { stats: object, upNext: object[], todayEvents: object[] }) => void} callback
   * @returns {() => void} unsubscribe
   */
  subscribeAll(callback) {
    const state = { stats: null, upNext: null, todayEvents: null };
    const emit = () => {
      if (state.stats && state.upNext && state.todayEvents) callback(state);
    };

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart); todayEnd.setDate(todayEnd.getDate() + 1);

    const unsubStats = this.statistics.subscribeAll((stats) => { state.stats = stats; emit(); });
    const unsubTasks = this.todos.subscribeIncomplete((items) => { state.upNext = items; emit(); });
    const unsubEvents = this.calendar.subscribe(
      (items) => { state.todayEvents = items; emit(); },
      undefined,
      { where: [['startsAt', '>=', todayStart.toISOString()], ['startsAt', '<', todayEnd.toISOString()]], orderBy: ['startsAt', 'asc'] }
    );

    return () => { unsubStats(); unsubTasks(); unsubEvents(); };
  }
}
