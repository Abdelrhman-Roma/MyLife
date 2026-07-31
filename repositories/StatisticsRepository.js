/**
 * repositories/StatisticsRepository.js
 * ---------------------------------------------------------------------------
 * A DELIBERATE DESIGN DECISION, carried over from the Phase 1 migration
 * notes' open question: Statistics has NO Firestore collection of its own.
 *
 * Every number Statistics/Dashboard show (completed todos, habit streaks,
 * workout progress, calories, study hours, prayer completion, weekly/monthly
 * reports) is a computed view over the other modules' own data. Giving
 * Statistics a second, separately-written collection would mean every write
 * to Todo/Habit/Workout/etc. would ALSO need to write a matching Statistics
 * update in the same transaction, forever — a duplicated-write surface that
 * is a classic source of "the dashboard number and the real data disagree"
 * bugs. Composing over the existing repositories' realtime listeners instead
 * means the numbers can never drift out of sync with the data they describe.
 *
 * This repository is intentionally NOT a BaseRepository subclass — it has no
 * `{module}/{uid}/items` collection of its own to point at.
 */

import { TodoRepository } from './TodoRepository.js';
import { HabitRepository } from './HabitRepository.js';
import { GoalRepository } from './GoalRepository.js';
import { WorkoutRepository } from './WorkoutRepository.js';
import { StudyRepository } from './StudyRepository.js';
import { PrayerRepository } from './PrayerRepository.js';
import { NutritionRepository } from './NutritionRepository.js';

export class StatisticsRepository {
  /** @param {string} uid */
  constructor(uid) {
    this.uid = uid;
    this.todos = new TodoRepository(uid);
    this.habits = new HabitRepository(uid);
    this.goals = new GoalRepository(uid);
    this.workouts = new WorkoutRepository(uid);
    this.study = new StudyRepository(uid);
    this.prayer = new PrayerRepository(uid);
    this.nutrition = new NutritionRepository(uid);
  }

  /**
   * Subscribes to every underlying module at once and recomputes combined
   * statistics whenever ANY of them changes — "statistics update immediately
   * after data changes," driven by the exact same Firestore snapshot
   * listeners the module pages themselves use, not a second polling loop.
   * @param {(stats: object) => void} callback
   * @returns {() => void} a single unsubscribe function for all six listeners
   */
  subscribeAll(callback) {
    /** @type {Record<string, any[]>} */
    const latest = { todos: [], habits: [], goals: [], workouts: [], study: [], prayer: [], nutrition: [] };
    const recompute = () => callback(this._compute(latest));

    const unsubscribers = [
      this.todos.subscribe((items) => { latest.todos = items; recompute(); }),
      this.habits.subscribe((items) => { latest.habits = items; recompute(); }),
      this.goals.subscribe((items) => { latest.goals = items; recompute(); }),
      this.workouts.subscribe((items) => { latest.workouts = items; recompute(); }),
      this.study.subscribe((items) => { latest.study = items; recompute(); }),
      this.prayer.subscribe((items) => { latest.prayer = items; recompute(); }),
      this.nutrition.subscribe((items) => { latest.nutrition = items; recompute(); }),
    ];
    return () => unsubscribers.forEach((unsub) => unsub());
  }

  /** @param {Record<string, any[]>} data @returns {object} */
  _compute(data) {
    const completedTodos = data.todos.filter((t) => t.completed).length;
    const habitStreaks = data.habits.map((h) => ({ id: h.id, name: h.name, streak: h.currentStreak || 0 }));
    const workoutsCompleted = data.workouts.filter((w) => w.completed).length;
    const totalCalories = data.nutrition.reduce((sum, n) => sum + (n.calories || 0), 0);
    const studyMinutes = data.study.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
    const prayerCompletionRate = data.prayer.length
      ? data.prayer.filter((p) => p.completed).length / data.prayer.length
      : 0;

    return {
      completedTodos,
      totalTodos: data.todos.length,
      habitStreaks,
      goalsInProgress: data.goals.filter((g) => !g.completed).length,
      workoutsCompleted,
      totalCalories,
      studyMinutes,
      prayerCompletionRate,
      generatedAt: new Date().toISOString(),
    };
  }
}
