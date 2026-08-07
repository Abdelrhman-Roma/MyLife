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

/**
 * Subscribes to all migrated repositories and mirrors their live data onto
 * window.currentData under the same keys the feature pages themselves use
 * (tasks, habits, goals, events, workouts, prayers, meals, study, water,
 * sleep, bodyMeasurements, shoppingList).
 * @param {() => void} [onUpdate] called once per debounced batch of updates, so the caller can re-render without a render-storm
 * @returns {Promise<() => void>} unsubscribe-all function; resolves to a no-op if the user isn't authenticated
 */
export async function startRepoAggregatorSync(onUpdate) {
  const user = await AuthService.waitUntilReady();
  if (!user) return () => {};

  const repos = {
    tasks: new TodoRepository(user.uid),
    habits: new HabitRepository(user.uid),
    goals: new GoalRepository(user.uid),
    events: new CalendarRepository(user.uid),
    workouts: new WorkoutRepository(user.uid),
    prayers: new PrayerRepository(user.uid),
    meals: new NutritionRepository(user.uid),
    study: new StudyRepository(user.uid),
    water: new WaterRepository(user.uid),
    sleep: new SleepRepository(user.uid),
    bodyMeasurements: new BodyMeasurementsRepository(user.uid),
    shoppingList: new ShoppingRepository(user.uid),
  };
  // Profile/Settings are singleton documents (one object, not a list of
  // items — see SingletonDocRepository.js), so they need Object.assign onto
  // the existing render-cache object rather than a wholesale replace, the
  // same distinction js/pages/account.js's own sync already makes.
  const singletonRepos = {
    profile: new ProfileRepository(user.uid),
    settings: new SettingsRepository(user.uid),
  };

  // Debounce: the 8 repositories' onSnapshot listeners each resolve
  // independently, often within milliseconds of each other on page load
  // (and again, independently, whenever Firestore delivers a cache snapshot
  // followed by a server snapshot for each — see BaseRepository.subscribe()'s
  // own dedupe for the identical-content case). Without coalescing, every
  // one of those calls triggered its own full Dashboard/Statistics re-render
  // — up to 8+ re-renders in quick succession, the exact cause of the
  // reported page-load flicker. Batching updates that land within the same
  // short window into a single re-render call fixes this; window.currentData
  // itself is still updated immediately and per-collection, so no data is
  // delayed — only the expensive full re-render is batched.
  let flushTimer = null;
  const scheduleFlush = () => {
    if (!onUpdate) return;
    clearTimeout(flushTimer);
    flushTimer = setTimeout(() => onUpdate(), 30);
  };

  const unsubscribers = Object.entries(repos).map(([key, repo]) =>
    repo.subscribe(
      (items) => { window.currentData[key] = items; scheduleFlush(); },
      (error) => console.error(`[RepoAggregatorSync] ${key} sync failed`, error)
    )
  );
  const singletonUnsubscribers = Object.entries(singletonRepos).map(([key, repo]) =>
    repo.subscribe(
      (data) => { if (data) Object.assign(window.currentData[key], data); scheduleFlush(); },
      (error) => console.error(`[RepoAggregatorSync] ${key} sync failed`, error)
    )
  );

  return () => { clearTimeout(flushTimer); [...unsubscribers, ...singletonUnsubscribers].forEach((unsub) => unsub()); };
}
