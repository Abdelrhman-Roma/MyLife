// services/RepoAggregatorSync.js
//
// Dashboard and Statistics don't own any data themselves — every number they
// show is a read-only view over the feature pages' own repositories. Before
// this file existed, Dashboard and Statistics only showed correct numbers if
// the user had *also* visited each individual feature page in the same
// session (because only that page's own onSnapshot subscription ever
// populated window.currentData.{tasks,habits,...}). That's the exact bug
// this file fixes: Dashboard/Statistics subscribe to the same repositories
// themselves, so they're correct standalone.
//
// Deliberately NOT using repositories/StatisticsRepository.js or
// repositories/DashboardRepository.js here: both are unused elsewhere, and
// on inspection both compute derived stats using field names that don't
// match the real data shape written by the actual pages (e.g. habit
// `.name`/`.currentStreak` instead of the real `.title`/computed-on-the-fly
// streak, study `.durationMinutes` instead of the real `.duration`, prayer
// `.completed` instead of the real `.status`). Subscribing to raw items and
// letting the existing, already-correct render functions in shared.js /
// dashboard-widget-defs.js do the computation (exactly as they already do
// today when fed by a feature page) avoids introducing a second,
// independently-wrong computation of the same numbers.

import { TodoRepository } from '../repositories/TodoRepository.js';
import { HabitRepository } from '../repositories/HabitRepository.js';
import { GoalRepository } from '../repositories/GoalRepository.js';
import { CalendarRepository } from '../repositories/CalendarRepository.js';
import { WorkoutRepository } from '../repositories/WorkoutRepository.js';
import { PrayerRepository } from '../repositories/PrayerRepository.js';
import { NutritionRepository } from '../repositories/NutritionRepository.js';
import { StudyRepository } from '../repositories/StudyRepository.js';
import { WaterRepository } from '../repositories/WaterRepository.js';
import { SleepRepository } from '../repositories/SleepRepository.js';
import { BodyMeasurementsRepository } from '../repositories/BodyMeasurementsRepository.js';
import { ShoppingRepository } from '../repositories/ShoppingRepository.js';
import { ProfileRepository } from '../repositories/ProfileRepository.js';
import { SettingsRepository } from '../repositories/SettingsRepository.js';
import { AuthService } from './AuthService.js';
import { ImageService } from './images/ImageService.js';

const REPO_CLASSES = {
  tasks: TodoRepository,
  habits: HabitRepository,
  goals: GoalRepository,
  events: CalendarRepository,
  workouts: WorkoutRepository,
  prayers: PrayerRepository,
  meals: NutritionRepository,
  study: StudyRepository,
  water: WaterRepository,
  sleep: SleepRepository,
  bodyMeasurements: BodyMeasurementsRepository,
  shoppingList: ShoppingRepository,
};

const SINGLETON_CLASSES = {
  profile: ProfileRepository,
  settings: SettingsRepository,
};

/**
 * Subscribes to migrated repositories lazily and mirrors their live data onto
 * window.currentData under the same keys the feature pages themselves use.
 *
 * @param {() => void} [onUpdate] called once per debounced batch of updates, so the caller can re-render without a render-storm
 * @param {string[]} [initialKeys] optional list of initial data keys to subscribe to. If omitted, all keys are synced (backward-compatible).
 * @returns {Promise<Function & { syncKeys: (keys: string[]) => void }>} unsubscribe-all function; resolves to a no-op if the user isn't authenticated
 */
export async function startRepoAggregatorSync(onUpdate, initialKeys = null) {
  const user = await AuthService.waitUntilReady();
  if (!user) {
    const noop = () => {};
    noop.syncKeys = () => {};
    return noop;
  }

  const activeUnsubscribers = new Map();
  const activeRepos = new Map();

  let flushTimer = null;
  const scheduleFlush = () => {
    if (!onUpdate) return;
    clearTimeout(flushTimer);
    flushTimer = setTimeout(() => {
      if (window.__pageLoading && window.currentPage) {
        window.__pageLoading[window.currentPage] = false;
      }
      onUpdate();
    }, 30);
  };

  /**
   * Dynamically adjusts subscriptions. Keeps currently active ones that are still wanted,
   * unsubscribes from no-longer-wanted ones, and subscribes to newly-wanted ones.
   * @param {string[]} keys
   */
  function syncKeys(keys) {
    const wantedKeys = new Set(keys);

    // Always keep profile and settings synced as they are core singletons
    wantedKeys.add('profile');
    wantedKeys.add('settings');

    // Unsubscribe from no-longer-wanted keys
    for (const [key, unsub] of activeUnsubscribers.entries()) {
      if (!wantedKeys.has(key)) {
        unsub();
        activeUnsubscribers.delete(key);
        activeRepos.delete(key);
      }
    }

    // Subscribe to newly-wanted keys
    for (const key of wantedKeys) {
      if (activeUnsubscribers.has(key)) continue;

      if (REPO_CLASSES[key]) {
        const repo = new REPO_CLASSES[key](user.uid);
        activeRepos.set(key, repo);
        const unsub = repo.subscribe(
          (items) => { window.currentData[key] = items; scheduleFlush(); },
          (error) => console.error(`[RepoAggregatorSync] ${key} sync failed`, error)
        );
        activeUnsubscribers.set(key, unsub);
      } else if (SINGLETON_CLASSES[key]) {
        const repo = new SINGLETON_CLASSES[key](user.uid);
        activeRepos.set(key, repo);
        const unsub = repo.subscribe(
          (data) => { if (data) Object.assign(window.currentData[key], data); scheduleFlush(); },
          (error) => console.error(`[RepoAggregatorSync] ${key} sync failed`, error)
        );
        activeUnsubscribers.set(key, unsub);
      }
    }
  }

  // If no initialKeys are specified, default to syncing all keys for full backward compatibility
  const defaultKeys = initialKeys || [...Object.keys(REPO_CLASSES), ...Object.keys(SINGLETON_CLASSES)];
  syncKeys(defaultKeys);

  const dispose = () => {
    clearTimeout(flushTimer);
    activeUnsubscribers.forEach((unsub) => unsub());
    activeUnsubscribers.clear();
    activeRepos.clear();
  };

  dispose.syncKeys = syncKeys;
  return dispose;
}
