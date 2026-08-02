/**
 * core/GamificationEngine.js
 * ---------------------------------------------------------------------------
 * The Achievement System's rule engine. One place that:
 *   - defines the XP formula and level curve,
 *   - awards XP for a given event and updates the user's cached level,
 *   - tracks streaks (daily/weekly/monthly, current + longest),
 *   - evaluates badge/achievement unlock conditions and persists unlocks,
 *   - notifies the Notification Center (Phase 7) and dispatches DOM events
 *     for the UI layer (js/gamification-ui.js) to animate.
 *
 * DESIGN DECISION: badges and achievements share ONE definition list and one
 * evaluation pass (ACHIEVEMENT_DEFS), with a `badge: true` flag on the
 * subset that are also badges. The brief describes two systems (a Badges
 * section and an Achievements section) with real overlap ("100 Todos" reads
 * exactly like a progress achievement that also happens to award a badge) —
 * maintaining two separate definition lists and two separate evaluation
 * passes for the same underlying mechanic would be duplicated logic with
 * two chances to drift out of sync. Unlocking a badge-flagged achievement
 * writes to BOTH achievements/{uid} (the unlock record) and badges/{uid}
 * (a lighter-weight, profile-display-optimized copy).
 *
 * ONLY ONE REAL EVENT SOURCE IS WIRED THIS PHASE: Todo completion (the only
 * Firestore-migrated module). Every other event type this engine supports
 * (habit/goal/prayer/workout/study/nutrition/water/sleep) is fully
 * implemented and ready — see recordEvent()'s use of XP_AWARDS — but
 * nothing calls it for those yet, since those modules aren't on Firestore.
 * Same disclosed pattern as Phase 7's Notification Center and Phase 8's
 * Custom Dashboard: the system is complete; producers catch up as modules
 * migrate.
 */

import { XpRepository } from '../repositories/XpRepository.js';
import { BadgeRepository } from '../repositories/BadgeRepository.js';
import { AchievementRepository } from '../repositories/AchievementRepository.js';
import { StreakRepository } from '../repositories/StreakRepository.js';
import { UserService } from '../services/UserService.js';
import { NotificationRepository } from '../repositories/NotificationRepository.js';

// ─── XP formula ──────────────────────────────────────────────────────────
/**
 * XP required to advance FROM `level` TO `level + 1`. Grows by a 1.5 power
 * curve (level 1\u21922 costs 100 XP, level 10\u219211 costs ~3,162 XP, level
 * 50\u219251 costs ~35,355 XP) — a common, well-tested "unlimited levels,
 * escalating cost" shape that stays meaningful indefinitely with no
 * artificial cap.
 * @param {number} level @returns {number}
 */
export function xpForLevel(level) {
  return Math.round(100 * Math.pow(Math.max(1, level), 1.5));
}

/**
 * Computes the current level and progress-into-level from a total XP
 * count. O(level) — for any realistic amount of XP a real user could
 * accumulate, this terminates in well under a millisecond; not worth a
 * closed-form inverse for the complexity it would add.
 * @param {number} totalXp
 * @returns {{ level: number, xpIntoLevel: number, xpForNextLevel: number }}
 */
export function levelFromTotalXp(totalXp) {
  let level = 1;
  let remaining = Math.max(0, totalXp);
  let needed = xpForLevel(level);
  while (remaining >= needed) {
    remaining -= needed;
    level += 1;
    needed = xpForLevel(level);
  }
  return { level, xpIntoLevel: remaining, xpForNextLevel: needed };
}

// ─── XP award amounts per source — tunable in one place ────────────────────
export const XP_AWARDS = {
  'todo:completed': 10,
  'habit:completed': 15,
  'goal:completed': 50,
  'prayer:logged': 5,
  'workout:completed': 20,
  'study:session': 10,
  'nutrition:logged': 5,
  'water:logged': 2,
  'sleep:logged': 5,
  'achievement:unlocked': 0, // achievements award their OWN xpReward — this key completes the event-type union, not a double-award
};

// ─── Streak tracking ────────────────────────────────────────────────────────
/**
 * Updates a named streak (e.g. 'daily-activity', 'prayer', 'habit:abc123')
 * given today's activity date (ISO 'YYYY-MM-DD'). Consecutive-day activity
 * increments `current`; a gap resets it to 1; the same day twice is a
 * no-op. `longest` tracks the record.
 * @param {import('../repositories/StreakRepository.js').StreakRepository} streakRepo
 * @param {string} kind
 * @param {string} todayIso
 */
export async function updateStreak(streakRepo, kind, todayIso) {
  const existing = await streakRepo.getByKind(kind);
  const prev = existing.ok && existing.data ? existing.data : { current: 0, longest: 0, lastActiveDate: null };
  if (prev.lastActiveDate === todayIso) {
    return { current: prev.current, longest: prev.longest, isNewRecord: false };
  }
  const yesterday = new Date(new Date(todayIso).getTime() - 86400000).toISOString().slice(0, 10);
  const current = prev.lastActiveDate === yesterday ? prev.current + 1 : 1;
  const longest = Math.max(prev.longest, current);
  const isNewRecord = longest > prev.longest;
  await streakRepo.create({ kind, current, longest, lastActiveDate: todayIso }, kind);
  return { current, longest, isNewRecord };
}

// ─── Achievement / badge definitions ────────────────────────────────────────
/** @type {Array<Object>} see file header for the shared badge+achievement design */
export const ACHIEVEMENT_DEFS = [
  { id: 'early-bird', title: 'Early Bird', description: 'Complete something before 7am, 5 times.', badge: true, xpReward: 30,
    check: (s) => ({ unlocked: (s.earlyBirdCount || 0) >= 5, progress: s.earlyBirdCount || 0, target: 5 }) },
  { id: 'night-owl', title: 'Night Owl', description: 'Complete something after 11pm, 5 times.', badge: true, xpReward: 30,
    check: (s) => ({ unlocked: (s.nightOwlCount || 0) >= 5, progress: s.nightOwlCount || 0, target: 5 }) },
  { id: 'streak-7', title: '7-Day Streak', description: 'Stay active 7 days in a row.', badge: true, xpReward: 50,
    check: (s) => ({ unlocked: s.dailyActivityStreakCurrent >= 7, progress: s.dailyActivityStreakCurrent, target: 7 }) },
  { id: 'streak-30', title: '30-Day Streak', description: 'Stay active 30 days in a row.', badge: true, xpReward: 200,
    check: (s) => ({ unlocked: s.dailyActivityStreakCurrent >= 30, progress: s.dailyActivityStreakCurrent, target: 30 }) },
  { id: 'todos-100', title: '100 Todos', description: 'Complete 100 tasks.', badge: true, xpReward: 150,
    check: (s) => ({ unlocked: s.totalTasksCompleted >= 100, progress: s.totalTasksCompleted, target: 100 }) },
  { id: 'workouts-100', title: '100 Workouts', description: 'Complete 100 workouts.', badge: true, xpReward: 150,
    check: (s) => ({ unlocked: s.totalWorkoutsCompleted >= 100, progress: s.totalWorkoutsCompleted, target: 100 }) },
  { id: 'prayer-master', title: 'Prayer Master', description: 'Keep a 30-day prayer streak.', badge: true, xpReward: 200,
    check: (s) => ({ unlocked: s.prayerStreakCurrent >= 30, progress: s.prayerStreakCurrent, target: 30 }) },
  { id: 'study-champion', title: 'Study Champion', description: 'Log 50 hours of study.', badge: true, xpReward: 200,
    check: (s) => ({ unlocked: s.totalStudyMinutes >= 3000, progress: Math.round(s.totalStudyMinutes / 60), target: 50 }) },
  { id: 'healthy-week', title: 'Healthy Week', description: 'Log water, sleep, and a meal every day for a week.', badge: true, xpReward: 80,
    check: (s) => ({ unlocked: !!s.healthyWeek }) },
  { id: 'perfect-month', title: 'Perfect Month', description: 'Stay active 30 days in a row \u2014 the ultimate consistency badge.', badge: true, xpReward: 300,
    check: (s) => ({ unlocked: s.dailyActivityStreakCurrent >= 30, progress: s.dailyActivityStreakCurrent, target: 30 }) },
  // Hidden: shown masked in the profile list until unlocked.
  { id: 'century-club', title: 'Century Club', description: 'Reach level 100.', hidden: true, xpReward: 500,
    check: (s) => ({ unlocked: (s.level || 1) >= 100, progress: s.level || 1, target: 100 }) },
  // Secret: not listed at all until unlocked.
  { id: 'midnight-marathon', title: 'Midnight Marathon', description: 'Complete 3 tasks between midnight and 3am in one night.', secret: true, xpReward: 75,
    check: (s) => ({ unlocked: (s.midnightRunCount || 0) >= 3, progress: s.midnightRunCount || 0 }) },
  // Repeatable: unlocks again every time the condition is freshly met.
  { id: 'weekly-warrior', title: 'Weekly Warrior', description: 'Complete every weekly goal, every week.', repeatable: true, xpReward: 40,
    check: (s) => ({ unlocked: !!s.weeklyGoalsAllComplete }) },
  // Seasonal: only evaluated within a date window.
  { id: 'new-year-new-you', title: 'New Year, New You', description: 'Stay active on January 1st.', seasonal: true,
    season: { startMonth: 1, startDay: 1, endMonth: 1, endDay: 1 }, xpReward: 25,
    check: (s) => ({ unlocked: !!s.activeToday }) },
];

function isWithinSeason(def, now = new Date()) {
  if (!def.seasonal || !def.season) return true;
  const month = now.getMonth() + 1, day = now.getDate();
  const { startMonth, startDay, endMonth, endDay } = def.season;
  const afterStart = month > startMonth || (month === startMonth && day >= startDay);
  const beforeEnd = month < endMonth || (month === endMonth && day <= endDay);
  return afterStart && beforeEnd;
}

/**
 * Evaluates every achievement definition against a stats snapshot and
 * persists any newly-unlocked ones (achievements/{uid}, and badges/{uid}
 * for the badge-flagged subset), awarding each unlock's own xpReward and
 * creating a Notification Center entry (category 'Achievements', Phase 7).
 * @param {string} uid @param {Object} stats
 */
export async function evaluateAchievements(uid, stats) {
  const achievementRepo = new AchievementRepository(uid);
  const badgeRepo = new BadgeRepository(uid);
  const notificationRepo = new NotificationRepository(uid);
  const newlyUnlocked = [];

  for (const def of ACHIEVEMENT_DEFS) {
    if (!isWithinSeason(def)) continue;
    const result = def.check(stats);
    if (!result.unlocked) continue;

    const docId = def.repeatable ? `${def.id}-${Date.now()}` : def.id;
    if (!def.repeatable) {
      const existing = await achievementRepo.get(docId);
      if (existing.ok && existing.data) continue;
    }

    await achievementRepo.create({
      achievementId: def.id, title: def.title, description: def.description,
      hidden: !!def.hidden, secret: !!def.secret, xpReward: def.xpReward,
      progress: result.progress ?? null, target: result.target ?? null,
      unlockedAt: new Date().toISOString(),
    }, docId);

    if (def.badge) {
      await badgeRepo.create({ badgeId: def.id, title: def.title, unlockedAt: new Date().toISOString() }, docId);
    }

    if (def.xpReward) await awardXp(uid, 'achievement:unlocked', def.xpReward, { achievementId: def.id });

    await notificationRepo.notifyOnce('Achievements', `unlock-${docId}`, {
      message: `${def.secret ? 'Secret achievement' : 'Achievement'} unlocked: ${def.title}`,
      priority: 'normal', deepLink: '../pages/account.html', action: { label: 'View', actionId: 'view-achievement' },
    });

    newlyUnlocked.push(def);
    window.dispatchEvent(new CustomEvent('mylife:achievement-unlocked', { detail: { def } }));
  }

  return newlyUnlocked;
}

// ─── XP awarding + level-up detection ───────────────────────────────────────
/**
 * Awards XP for an event, updates the user's cached level on their profile
 * (users/{uid}.xp / .level), and dispatches UI events for XP-gain and
 * level-up animations (js/gamification-ui.js listens for these).
 * @param {string} uid @param {string} eventType
 * @param {number} [amountOverride] @param {Record<string, unknown>} [metadata]
 */
export async function awardXp(uid, eventType, amountOverride, metadata = {}) {
  const amount = amountOverride ?? XP_AWARDS[eventType] ?? 0;
  if (amount <= 0) return { xp: 0, level: 1, leveledUp: false };

  const xpRepo = new XpRepository(uid);
  await xpRepo.create({ amount, source: eventType, metadata, awardedAt: new Date().toISOString() });

  const profileResult = await UserService.getProfile(uid);
  const previousTotal = profileResult.ok && profileResult.data ? (profileResult.data.xp || 0) : 0;
  const previousLevel = levelFromTotalXp(previousTotal).level;
  const newTotal = previousTotal + amount;
  const { level: newLevel } = levelFromTotalXp(newTotal);

  await UserService.updateProfile(uid, { xp: newTotal, level: newLevel });

  window.dispatchEvent(new CustomEvent('mylife:xp-awarded', { detail: { amount, total: newTotal, level: newLevel, eventType } }));
  if (newLevel > previousLevel) window.dispatchEvent(new CustomEvent('mylife:level-up', { detail: { level: newLevel } }));

  return { xp: newTotal, level: newLevel, leveledUp: newLevel > previousLevel };
}

/**
 * The single entry point modules call when something XP-worthy happens.
 * Awards XP, updates the daily-activity streak, builds a stats snapshot,
 * and evaluates achievements — one call does the whole pipeline.
 * @param {string} uid @param {string} eventType @param {Record<string, unknown>} [metadata]
 */
export async function recordEvent(uid, eventType, metadata = {}) {
  await awardXp(uid, eventType, undefined, metadata);

  const streakRepo = new StreakRepository(uid);
  const todayIso = new Date().toISOString().slice(0, 10);
  await updateStreak(streakRepo, 'daily-activity', todayIso);

  const stats = await buildStatsSnapshot(uid, streakRepo, metadata);
  await evaluateAchievements(uid, stats);
}

/**
 * Composes a stats snapshot from the XP profile, streaks, and (for the
 * counts unmigrated modules still own) the existing `currentData` global —
 * read-only, same "local snapshot" honesty pattern as Phase 8's dashboard
 * widgets.
 */
async function buildStatsSnapshot(uid, streakRepo, metadata) {
  const profileResult = await UserService.getProfile(uid);
  const level = profileResult.ok && profileResult.data ? levelFromTotalXp(profileResult.data.xp || 0).level : 1;
  const dailyStreak = await streakRepo.getByKind('daily-activity');
  const prayerStreak = await streakRepo.getByKind('prayer');
  const hour = new Date().getHours();

  const d = (typeof currentData !== 'undefined' && currentData) || {};
  return {
    totalTasksCompleted: (d.tasks || []).filter((x) => x.completed).length,
    totalWorkoutsCompleted: (d.workouts || []).filter((x) => x.completed).length,
    totalStudySessions: (d.study || []).length,
    totalStudyMinutes: (d.study || []).reduce((sum, s) => sum + (s.durationMinutes || 0), 0),
    prayerStreakCurrent: prayerStreak.ok && prayerStreak.data ? prayerStreak.data.current : 0,
    dailyActivityStreakCurrent: dailyStreak.ok && dailyStreak.data ? dailyStreak.data.current : 0,
    healthyWeek: false, // needs cross-referenced 7-day water/sleep/nutrition logs — pending those modules' migration, not faked
    level, hour,
    earlyBirdCount: hour < 7 ? (metadata.earlyBirdCount || 0) + 1 : (metadata.earlyBirdCount || 0),
    nightOwlCount: hour >= 23 ? (metadata.nightOwlCount || 0) + 1 : (metadata.nightOwlCount || 0),
  };
}
