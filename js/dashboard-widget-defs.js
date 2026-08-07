// js/dashboard-widget-defs.js — Phase 8: the 17 widgets, registered.
//
// Each widget's `render(ctx)` does real work — no widget here is a fake
// placeholder screenshot. Data-source tiers, honestly labeled (see
// core/WidgetRegistry.js's header comment):
//   firestore-live: Todo, Notifications, Quick Notes — real Firestore subscriptions
//   live-api:       Weather — real Open-Meteo network data via the existing WeatherService
//   local-snapshot: Habits, Goals, Workout, Nutrition, Study, Prayer, Calendar,
//                   Statistics, Achievements, Water, Sleep — read once from the
//                   existing in-memory `window.currentData` (their modules aren't on
//                   Firestore yet; see MIGRATION_NOTES_PHASE2.md). Each of these
//                   widgets says so plainly in its own UI, not hidden.
//   static:         Quote, Pomodoro — no backend needed at all.
import { registerWidget } from '../core/WidgetRegistry.js';
import { TodoRepository } from '../repositories/TodoRepository.js';
import { NotificationRepository } from '../repositories/NotificationRepository.js';
import { UserService } from '../services/UserService.js';

const QUOTES = [
  'Small steps every day add up to big change.',
  'Discipline is choosing between what you want now and what you want most.',
  'Progress, not perfection.',
  'The secret of getting ahead is getting started.',
  'You do not have to be great to start, but you have to start to be great.',
];

function localSnapshotNote(root) {
  const note = document.createElement('p');
  note.className = 'widget-snapshot-note';
  note.textContent = t ? t('Snapshot — refresh the page to update') : 'Snapshot — refresh the page to update';
  root.appendChild(note);
}

function emptyRow(root, message) {
  const p = document.createElement('p');
  p.className = 'widget-empty-row';
  p.textContent = message;
  root.appendChild(p);
}

// ─── Today's Tasks (firestore-live) ────────────────────────────────────────
registerWidget({
  id: 'todo', title: 'Today\u2019s Tasks', icon: '\u2705', category: 'productivity',
  defaultSize: 'md', allowedSizes: ['sm', 'md', 'lg'], dataSource: 'firestore-live',
  render(ctx) {
    const repo = new TodoRepository(ctx.user.uid);
    const list = document.createElement('div');
    list.className = 'widget-list';
    ctx.root.appendChild(list);
    const unsub = repo.subscribeIncomplete((tasks) => {
      list.innerHTML = tasks.length ? tasks.slice(0, 6).map((task) => `
        <label class="widget-task-row">
          <input type="checkbox" data-widget-task="${escapeAttr(task.id)}" />
          <span>${escapeHtml(task.title)}</span>
        </label>
      `).join('') : `<p class="widget-empty-row">${t ? t('Nothing due \u2014 nice work.') : 'Nothing due \u2014 nice work.'}</p>`;
      list.querySelectorAll('[data-widget-task]').forEach((cb) => cb.addEventListener('change', () => {
        repo.update(cb.dataset.widgetTask, { completed: true, completedAt: new Date().toISOString() });
      }));
    });
    return unsub;
  },
});

// ─── Weather (live-api via the real, existing WeatherService) ─────────────
registerWidget({
  id: 'weather', title: 'Weather', icon: '\u26c5', category: 'insight',
  defaultSize: 'sm', allowedSizes: ['sm', 'md'], dataSource: 'live-api',
  render(ctx) {
    ctx.root.innerHTML = `<p class="widget-loading-row">${t ? t('Loading weather\u2026') : 'Loading weather\u2026'}</p>`;
    let cancelled = false;
    (async () => {
      try {
        const cached = typeof WeatherCacheService !== 'undefined' ? WeatherCacheService.get() : null;
        const weather = (cached && WeatherCacheService.fresh(cached)) ? cached : await WeatherService.fetchWeather();
        if (cancelled) return;
        const cur = weather?.current;
        ctx.root.innerHTML = cur
          ? `<div class="widget-weather"><span class="widget-weather-temp">${Math.round(cur.temperature)}\u00b0</span><span class="widget-weather-desc">${escapeHtml(cur.description || '')}</span></div>`
          : `<p class="widget-empty-row">${t ? t('Weather unavailable') : 'Weather unavailable'}</p>`;
      } catch (_e) {
        if (!cancelled) ctx.root.innerHTML = `<p class="widget-empty-row">${t ? t('Weather unavailable') : 'Weather unavailable'}</p>`;
      }
    })();
    return () => { cancelled = true; };
  },
});

// ─── Notifications (firestore-live via Phase 7's NotificationRepository) ──
registerWidget({
  id: 'notifications', title: 'Notifications', icon: '\ud83d\udd14', category: 'utility',
  defaultSize: 'sm', allowedSizes: ['sm', 'md'], dataSource: 'firestore-live',
  render(ctx) {
    const repo = new NotificationRepository(ctx.user.uid);
    const list = document.createElement('div');
    list.className = 'widget-list';
    ctx.root.appendChild(list);
    const unsub = repo.subscribe(
      (items) => {
        const unread = items.filter((n) => !n.read && !n.archived).slice(0, 5);
        list.innerHTML = unread.length ? unread.map((n) => `<p class="widget-notification-row">${escapeHtml(n.message)}</p>`).join('') : `<p class="widget-empty-row">${t ? t('You are all caught up.') : 'You are all caught up.'}</p>`;
      },
      () => {},
      { where: [['archived', '==', false]], orderBy: ['createdAt', 'desc'] }
    );
    return unsub;
  },
});

// ─── Quick Notes (firestore-live: a single synced field on the user profile) ─
registerWidget({
  id: 'quick-notes', title: 'Quick Notes', icon: '\ud83d\udcdd', category: 'utility',
  defaultSize: 'sm', allowedSizes: ['sm', 'md', 'lg'], dataSource: 'firestore-live',
  render(ctx) {
    const textarea = document.createElement('textarea');
    textarea.className = 'widget-notes-textarea';
    textarea.placeholder = t ? t('Jot something down\u2026') : 'Jot something down\u2026';
    ctx.root.appendChild(textarea);
    let saveTimer = null;
    let applyingRemote = false;
    const unsub = UserService.subscribeProfile(ctx.user.uid, (profile) => {
      if (document.activeElement === textarea) return; // don't clobber while the user is typing
      applyingRemote = true;
      textarea.value = profile?.quickNotes || '';
      applyingRemote = false;
    });
    textarea.addEventListener('input', () => {
      if (applyingRemote) return;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => UserService.updateProfile(ctx.user.uid, { quickNotes: textarea.value }), 600);
    });
    return unsub;
  },
});

// ─── Quote (static) ─────────────────────────────────────────────────────────
registerWidget({
  id: 'quote', title: 'Quote', icon: '\u2728', category: 'wellness',
  defaultSize: 'sm', allowedSizes: ['sm', 'md'], dataSource: 'static',
  render(ctx) {
    const quote = QUOTES[new Date().getDate() % QUOTES.length]; // changes daily, deterministic, no backend needed
    ctx.root.innerHTML = `<p class="widget-quote">\u201c${escapeHtml(quote)}\u201d</p>`;
  },
});

// ─── Pomodoro (static, genuinely functional client-side timer) ─────────────
registerWidget({
  id: 'pomodoro', title: 'Pomodoro', icon: '\u23f2\ufe0f', category: 'wellness',
  defaultSize: 'sm', allowedSizes: ['sm', 'md'], dataSource: 'static',
  render(ctx) {
    let seconds = 25 * 60;
    let timer = null;
    ctx.root.innerHTML = `
      <p class="widget-pomodoro-time" data-widget-pomo-time>25:00</p>
      <div class="widget-pomodoro-actions">
        <button type="button" class="secondary-btn" data-widget-pomo-toggle>${t ? t('Start') : 'Start'}</button>
        <button type="button" class="text-btn" data-widget-pomo-reset>${t ? t('Reset') : 'Reset'}</button>
      </div>
    `;
    const timeEl = ctx.root.querySelector('[data-widget-pomo-time]');
    const toggleBtn = ctx.root.querySelector('[data-widget-pomo-toggle]');
    const paint = () => { timeEl.textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; };
    toggleBtn.addEventListener('click', () => {
      if (timer) { clearInterval(timer); timer = null; toggleBtn.textContent = t ? t('Start') : 'Start'; return; }
      toggleBtn.textContent = t ? t('Pause') : 'Pause';
      timer = setInterval(() => { seconds = Math.max(0, seconds - 1); paint(); if (seconds === 0) { clearInterval(timer); timer = null; toggleBtn.textContent = t ? t('Start') : 'Start'; } }, 1000);
    });
    ctx.root.querySelector('[data-widget-pomo-reset]').addEventListener('click', () => { seconds = 25 * 60; paint(); if (timer) { clearInterval(timer); timer = null; toggleBtn.textContent = t ? t('Start') : 'Start'; } });
    return () => { if (timer) clearInterval(timer); };
  },
});

// ─── Local-snapshot widgets (Habits/Goals/Workout/Nutrition/Study/Prayer/
//     Calendar/Statistics/Achievements/Water/Sleep) — read once from the
//     existing in-memory window.currentData; see file header. ─────────────────────
function localSnapshotWidget(id, title, icon, category, computeRows) {
  registerWidget({
    id, title, icon, category, defaultSize: 'sm', allowedSizes: ['sm', 'md'], dataSource: 'local-snapshot',
    render(ctx) {
      const rows = computeRows();
      if (rows.length) ctx.root.innerHTML = rows.map((r) => `<p class="widget-snapshot-row">${escapeHtml(r)}</p>`).join('');
      else emptyRow(ctx.root, t ? t('No data yet') : 'No data yet');
      localSnapshotNote(ctx.root);
    },
  });
}

localSnapshotWidget('habits', 'Habits', '\ud83d\udd01', 'wellness', () =>
  (window.currentData?.habits || []).slice(0, 5).map((h) => `${h.name || h.title || 'Habit'} \u2014 ${h.completed ? (t ? t('done today') : 'done today') : (t ? t('not yet today') : 'not yet today')}`));

localSnapshotWidget('goals', 'Goals', '\ud83c\udfaf', 'productivity', () =>
  (window.currentData?.goals || []).slice(0, 5).map((g) => `${g.title || g.name || 'Goal'} \u2014 ${Math.round(((g.progress || 0) / (g.target || 100)) * 100)}%`));

localSnapshotWidget('workout', 'Workout', '\ud83c\udfcb\ufe0f', 'wellness', () =>
  (window.currentData?.workouts || []).slice(-3).reverse().map((w) => `${w.name || w.title || 'Workout'} \u2014 ${w.completed ? (t ? t('completed') : 'completed') : (t ? t('scheduled') : 'scheduled')}`));

localSnapshotWidget('nutrition', 'Nutrition', '\ud83c\udf7d\ufe0f', 'wellness', () => {
  const meals = window.currentData?.meals || [];
  const todayMeals = meals.filter((m) => (m.date || '').slice(0, 10) === new Date().toISOString().slice(0, 10));
  const calories = todayMeals.reduce((sum, m) => sum + (m.calories || 0), 0);
  return todayMeals.length ? [`${calories} ${t ? t('calories today') : 'calories today'} \u00b7 ${todayMeals.length} ${t ? t('meals logged') : 'meals logged'}`] : [];
});

localSnapshotWidget('prayer', 'Prayer', '\ud83d\udd4c', 'wellness', () => {
  const today = (window.currentData?.prayers || []).find((p) => (p.date || '').slice(0, 10) === new Date().toISOString().slice(0, 10));
  if (!today) return [];
  const done = Object.values(today.completed || {}).filter(Boolean).length;
  return [`${done}/5 ${t ? t('prayers logged today') : 'prayers logged today'}`];
});

localSnapshotWidget('study', 'Study', '\ud83d\udcda', 'productivity', () => {
  const sessions = window.currentData?.study || [];
  const totalMinutes = sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
  return sessions.length ? [`${totalMinutes} ${t ? t('minutes logged total') : 'minutes logged total'}`] : [];
});

localSnapshotWidget('calendar', 'Calendar', '\ud83d\udcc5', 'productivity', () => {
  const todayIso = new Date().toISOString().slice(0, 10);
  return (window.currentData?.events || []).filter((e) => (e.date || e.startsAt || '').slice(0, 10) === todayIso).slice(0, 5).map((e) => e.title || e.name || 'Event');
});

localSnapshotWidget('statistics', 'Statistics', '\ud83d\udcca', 'insight', () => {
  const d = window.currentData || {};
  return [
    `${(d.tasks || []).filter((x) => x.completed).length}/${(d.tasks || []).length} ${t ? t('tasks done') : 'tasks done'}`,
    `${(d.habits || []).length} ${t ? t('habits tracked') : 'habits tracked'}`,
  ];
});

localSnapshotWidget('achievements', 'Achievements', '\ud83c\udfc6', 'insight', () => {
  const unlocked = window.currentData?.achievements?.unlocked || [];
  return unlocked.length ? [`${unlocked.length} ${t ? t('achievements unlocked') : 'achievements unlocked'}`] : [];
});

localSnapshotWidget('water', 'Water', '\ud83d\udca7', 'wellness', () => {
  const todayIso = new Date().toISOString().slice(0, 10);
  const entries = (window.currentData?.water || []).filter((w) => (w.date || '').slice(0, 10) === todayIso);
  const total = entries.reduce((sum, w) => sum + (w.amount || w.cups || 0), 0);
  return entries.length ? [`${total} ${t ? t('logged today') : 'logged today'}`] : [];
});

localSnapshotWidget('sleep', 'Sleep', '\ud83d\ude34', 'wellness', () => {
  const last = (window.currentData?.sleep || []).slice(-1)[0];
  return last ? [`${last.hours || last.duration || '?'} ${t ? t('hours last logged') : 'hours last logged'}`] : [];
});
