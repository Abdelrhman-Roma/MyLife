// MYLIFE — Calendar page logic (refactor)
// Reuses bootShell(), persist(), currentData, escapeHtml(), escapeAttr(), makeId(),
// selected(), labelize() and percent() from shared.js. Self-contained: does not
// modify shared.js or any global stylesheet.

const CAL_MONTH_NAMES       = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const CAL_MONTH_NAMES_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const CAL_DAY_NAMES_FULL    = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const CAL_DAY_NAMES_SHORT   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// Category = visual identity (badge/color/icon). For source-linked events the
// category is fixed by the origin module; manual events pick any category.
const CATEGORY_META = {
  workout:   { label: 'Workout',   icon: '🏋', color: 'var(--red)' },
  study:     { label: 'Study',     icon: '📖', color: 'var(--blue)' },
  habit:     { label: 'Habit',     icon: '⭐', color: 'var(--purple)' },
  water:     { label: 'Water',     icon: '💧', color: 'color-mix(in srgb, var(--blue) 65%, var(--green))' },
  sleep:     { label: 'Sleep',     icon: '😴', color: 'color-mix(in srgb, var(--purple) 55%, var(--blue))' },
  nutrition: { label: 'Nutrition', icon: '🍽', color: 'var(--orange)' },
  prayer:    { label: 'Prayer',    icon: '🙏', color: 'var(--green)' },
  todo:      { label: 'Task',      icon: '✅', color: 'color-mix(in srgb, var(--blue) 55%, var(--orange))' },
  goal:      { label: 'Goal',      icon: '🎯', color: 'color-mix(in srgb, var(--purple) 60%, var(--orange))' },
  event:     { label: 'Event',     icon: '📅', color: 'color-mix(in srgb, var(--orange) 70%, var(--red))' },
  meeting:   { label: 'Meeting',   icon: '🤝', color: 'color-mix(in srgb, var(--blue) 55%, var(--red))' },
  reminder:  { label: 'Reminder',  icon: '🔔', color: 'color-mix(in srgb, var(--red) 65%, var(--orange))' },
  custom:    { label: 'Custom',    icon: '🔖', color: 'var(--muted)' },
};

const CATEGORY_HEX = {
  workout: '#c1443a', study: '#3b6ea5', habit: '#7a5c9e', water: '#3f8fa0', sleep: '#8a6fb0',
  nutrition: '#c1793a', prayer: '#4c7a5e', todo: '#3f7fae', goal: '#a5679e',
  event: '#c1543a', meeting: '#a5493e', reminder: '#c15b3a', custom: '#8b93a6',
};

const CAL_PRIORITIES = ['Low', 'Medium', 'High'];
const CAL_REPEATS    = ['None', 'Daily', 'Weekly', 'Monthly', 'Yearly'];
const CAL_REMINDER_OPTIONS = [
  ['None', 'No reminder'], ['5', '5 minutes before'], ['15', '15 minutes before'],
  ['30', '30 minutes before'], ['60', '1 hour before'], ['1440', '1 day before'],
];

// ─── Source module registry ─────────────────────────────────────────────────
// completable modules mirror a real completed/status field on the origin page
// (so Calendar <-> origin page sync both ways). Log-type modules (water,
// sleep, study, nutrition) have no "complete" concept on their own page — an
// entry existing already means the action happened, so their linked calendar
// event is created already-completed and is read-only.
const SOURCE_MODULE_META = {
  tasks:     { category: 'todo',  label: 'Task',    page: 'todo.html',      completable: true,
               getCollection: () => currentData.tasks || [],
               getCompleted: (i) => !!i.completed, setCompleted: (i, v) => { i.completed = v; } },
  habit:     { category: 'habit', label: 'Habit',   page: 'habits.html',    completable: true,
               getCollection: () => currentData.habits || [],
               getCompleted: (i) => !!i.completed, setCompleted: (i, v) => { i.completed = v; } },
  goals:     { category: 'goal',  label: 'Goal',    page: 'goals.html',     completable: true,
               getCollection: () => currentData.goals || [],
               getCompleted: (i) => !!i.completed, setCompleted: (i, v) => { i.completed = v; } },
  prayer:    { category: 'prayer',label: 'Prayer',  page: 'prayer.html',    completable: true,
               getCollection: () => currentData.prayers || [],
               getCompleted: (i) => i.status === 'Completed', setCompleted: (i, v) => { i.status = v ? 'Completed' : 'Planned'; } },
  workout:   { category: 'workout', label: 'Workout', page: 'workout.html', completable: true,
               getCollection: () => (currentData.workoutPlan && currentData.workoutPlan.schedule) || [],
               getCompleted: (i) => i.status === 'Done', setCompleted: (i, v) => { i.status = v ? 'Done' : 'Not Started'; } },
  nutrition: { category: 'nutrition', label: 'Nutrition', page: 'nutrition.html', completable: false, getCollection: () => currentData.meals || [] },
  water:     { category: 'water', label: 'Water',   page: 'water.html',     completable: false, getCollection: () => currentData.water || [] },
  sleep:     { category: 'sleep', label: 'Sleep',    page: 'sleep.html',     completable: false, getCollection: () => currentData.sleep || [] },
  study:     { category: 'study', label: 'Study',    page: 'study.html',     completable: true,
               getCollection: () => currentData.study || [],
               getCompleted: (i) => !!i.completed, setCompleted: (i, v) => { i.completed = v; i.status = v ? 'Completed' : 'Planned'; } },
};

let calState = {
  view: 'month',
  selected: null,
  search: '',
  hiddenCats: new Set(),
  filterOpen: false,
  scheduleCollapsed: false,
  modalEventId: undefined,
  _focusRestore: null,
};

// ─── Date helpers ───────────────────────────────────────────────────────────
function pad2(n) { return String(n).padStart(2, '0'); }
function toISO(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function parseISO(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function todayISO() { return toISO(new Date()); }
function nowStamp() { return new Date().toISOString(); }
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function daysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
// Calendar-correct month stepping: JS Date#setMonth overflows short months
// (e.g. Jan 31 + 1 month silently becomes Mar 3), which is the classic
// "month switching" bug. Clamp the day-of-month to the target month's length.
function addMonthsClamped(d, delta) {
  const day = d.getDate();
  const targetYear = d.getFullYear();
  const targetMonthRaw = d.getMonth() + delta;
  const target = new Date(targetYear, targetMonthRaw, 1);
  const clampedDay = Math.min(day, daysInMonth(target.getFullYear(), target.getMonth()));
  target.setDate(clampedDay);
  return target;
}
function startOfWeek(d) { const r = new Date(d); r.setDate(r.getDate() - r.getDay()); r.setHours(0, 0, 0, 0); return r; }
function weekDaysFor(anchorIso) {
  const start = startOfWeek(parseISO(anchorIso));
  return Array.from({ length: 7 }, (_, i) => toISO(addDays(start, i)));
}
function formatTimeLabel(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  let hh = h % 12; if (hh === 0) hh = 12;
  return `${hh}:${pad2(m)} ${ampm}`;
}
function timeLabel(ev) {
  if (!ev.startTime) return 'All day';
  return ev.endTime ? `${formatTimeLabel(ev.startTime)} – ${formatTimeLabel(ev.endTime)}` : formatTimeLabel(ev.startTime);
}
function monthLabel(anchorIso) { const d = parseISO(anchorIso); return `${CAL_MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`; }
function weekRangeLabel(anchorIso) {
  const start = startOfWeek(parseISO(anchorIso));
  const end = addDays(start, 6);
  const sameMonth = start.getMonth() === end.getMonth();
  const fmt = (d, withMonth) => `${withMonth ? CAL_MONTH_NAMES_SHORT[d.getMonth()] + ' ' : ''}${d.getDate()}`;
  return `${fmt(start, true)} – ${fmt(end, !sameMonth)}, ${end.getFullYear()}`;
}
function dayLabel(iso) {
  const d = parseISO(iso);
  return `${CAL_DAY_NAMES_FULL[d.getDay()]}, ${CAL_MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}
function friendlyDateLabel(iso) {
  if (iso === todayISO()) return `Today · ${dayLabel(iso)}`;
  if (iso === toISO(addDays(new Date(), 1))) return `Tomorrow · ${dayLabel(iso)}`;
  return dayLabel(iso);
}

// ─── Data model ─────────────────────────────────────────────────────────────
function hydrateEvent(raw) {
  const ev = raw || {};
  const category = CATEGORY_META[ev.category] ? ev.category : 'event';
  const now = nowStamp();
  return {
    id: ev.id || makeId(),
    title: ev.title || 'Untitled event',
    description: ev.description || '',
    category,
    date: ev.date || todayISO(),
    startTime: ev.startTime || '',
    endTime: ev.endTime || '',
    allDay: !ev.startTime,
    priority: CAL_PRIORITIES.includes(ev.priority) ? ev.priority : 'Medium',
    repeatRule: CAL_REPEATS.includes(ev.repeatRule) ? ev.repeatRule : (CAL_REPEATS.includes(ev.repeat) ? ev.repeat : 'None'),
    reminder: ev.reminder || 'None',
    color: ev.color || '',
    icon: ev.icon || '',
    notes: ev.notes || '',
    completed: !!ev.completed,
    completedAt: ev.completedAt || null,
    createdAt: ev.createdAt || now,
    updatedAt: ev.updatedAt || now,
    status: ev.status || 'Upcoming',
    sourceModule: ev.sourceModule || null,
    sourceId: ev.sourceId || null,
  };
}

function hydrateAllEvents() {
  if (!Array.isArray(currentData.events)) currentData.events = [];
  currentData.events = currentData.events.map((ev) => {
    try { return hydrateEvent(ev); } catch (_e) { return null; }
  }).filter(Boolean);
}

function occursOn(ev, iso) {
  if (!ev.repeatRule || ev.repeatRule === 'None') return ev.date === iso;
  const start = parseISO(ev.date), d = parseISO(iso);
  if (d < start) return false;
  if (ev.repeatRule === 'Daily')   return true;
  if (ev.repeatRule === 'Weekly')  return d.getDay() === start.getDay();
  if (ev.repeatRule === 'Monthly') return d.getDate() === start.getDate();
  if (ev.repeatRule === 'Yearly')  return d.getDate() === start.getDate() && d.getMonth() === start.getMonth();
  return ev.date === iso;
}

// ─── Bidirectional source sync ──────────────────────────────────────────────
// Materializes exactly one real calendar event per linkable source record
// (idempotent — keyed by sourceModule+sourceId, so re-running never spawns
// duplicates), then keeps completion state in sync on every load:
//   Calendar checkbox  -> writes back into the source collection immediately.
//   Source page change -> pulled into the linked calendar event on next load.
function findLinkedEvent(sourceModule, sourceId) {
  return (currentData.events || []).find((e) => e.sourceModule === sourceModule && e.sourceId === sourceId);
}

function materializeSourceEvent(sourceModule, item, defaults) {
  if (!item || !item.id) return;
  const meta = SOURCE_MODULE_META[sourceModule];
  let ev = findLinkedEvent(sourceModule, item.id);
  const title = defaults.title;
  if (!ev) {
    ev = hydrateEvent({
      sourceModule, sourceId: item.id, title,
      category: meta.category, date: defaults.date, repeatRule: defaults.repeatRule,
      priority: defaults.priority || 'Medium', startTime: defaults.startTime || '',
      completed: meta.completable ? !!meta.getCompleted(item) : true,
    });
    if (!meta.completable) ev.completedAt = ev.createdAt;
    else if (ev.completed) ev.completedAt = ev.createdAt;
    currentData.events.push(ev);
    return;
  }
  if (ev.title !== title) { ev.title = title; ev.updatedAt = nowStamp(); }
  if (meta.completable) {
    const srcCompleted = !!meta.getCompleted(item);
    if (ev.completed !== srcCompleted) {
      ev.completed = srcCompleted;
      ev.completedAt = srcCompleted ? nowStamp() : null;
      ev.updatedAt = nowStamp();
    }
  }
}

function reconcileSourceLinkedEvents() {
  (currentData.tasks || []).forEach((t) => materializeSourceEvent('tasks', t, { title: t.title || 'Task', date: todayISO(), repeatRule: 'Daily', priority: t.priority }));
  (currentData.habits || []).forEach((h) => materializeSourceEvent('habit', h, { title: h.title || 'Habit', date: todayISO(), repeatRule: 'Daily' }));
  (currentData.prayers || []).forEach((p) => materializeSourceEvent('prayer', p, { title: p.title || 'Prayer', date: todayISO(), repeatRule: 'Daily', startTime: p.time }));
  (currentData.goals || []).forEach((g) => materializeSourceEvent('goals', g, { title: g.title || 'Goal', date: g.deadline || todayISO(), repeatRule: g.deadline ? 'None' : 'Daily' }));
  ((currentData.workoutPlan && currentData.workoutPlan.schedule) || []).forEach((w) => {
    if (w.date) materializeSourceEvent('workout', w, { title: w.type || 'Workout', date: w.date, repeatRule: 'None' });
  });
  (currentData.meals || []).forEach((m) => materializeSourceEvent('nutrition', m, { title: m.title || 'Meal logged', date: todayISO(), repeatRule: 'None' }));
  (currentData.water || []).forEach((w) => materializeSourceEvent('water', w, { title: `Water${w.amount ? ` · ${w.amount} glasses` : ''}`, date: todayISO(), repeatRule: 'None' }));
  (currentData.sleep || []).forEach((s) => materializeSourceEvent('sleep', s, { title: s.title || 'Sleep logged', date: todayISO(), repeatRule: 'None' }));
  (currentData.study || []).forEach((s) => materializeSourceEvent('study', s, { title: s.topic ? `${s.title} · ${s.topic}` : (s.title || 'Study session'), date: s.date || todayISO(), repeatRule: 'None', priority: s.priority, startTime: s.startTime }));

  // Prune links whose source record was deleted elsewhere in the app.
  currentData.events = (currentData.events || []).filter((ev) => {
    if (!ev.sourceModule) return true;
    const meta = SOURCE_MODULE_META[ev.sourceModule];
    if (!meta) return true;
    return meta.getCollection().some((i) => i.id === ev.sourceId);
  });
}

function stampStatuses() {
  (currentData.events || []).forEach((ev) => { ev.status = computeStatus(ev); });
}

function getVisibleEventsForDate(iso) {
  const q = calState.search.trim().toLowerCase();
  return (currentData.events || [])
    .filter((ev) => occursOn(ev, iso))
    .map((ev) => ({ ...ev, occurrenceDate: iso }))
    .filter((ev) => {
      if (calState.hiddenCats.has(ev.category)) return false;
      if (q) {
        const hay = `${ev.title} ${ev.description || ''} ${ev.notes || ''} ${CATEGORY_META[ev.category]?.label || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => (a.startTime || '99:99').localeCompare(b.startTime || '99:99'));
}

function eventColor(ev) { return ev.color || CATEGORY_META[ev.category]?.color || 'var(--muted)'; }
function eventIcon(ev) { return ev.icon || CATEGORY_META[ev.category]?.icon || '🔖'; }

function computeStatus(ev) {
  if (ev.completed) return 'Completed';
  const todayIso = todayISO();
  if (ev.date < todayIso && ev.repeatRule === 'None') return 'Missed';
  if (ev.date === todayIso && ev.startTime) {
    const now = new Date();
    const [h, m] = ev.startTime.split(':').map(Number);
    const start = new Date(); start.setHours(h, m, 0, 0);
    let end = null;
    if (ev.endTime) { const [eh, em] = ev.endTime.split(':').map(Number); end = new Date(); end.setHours(eh, em, 0, 0); }
    if (now < start) return 'Upcoming';
    if (end && now > end) return 'Missed';
    return 'Ongoing';
  }
  return 'Upcoming';
}

// ─── Stats ──────────────────────────────────────────────────────────────────
function computeStreak(realEvents) {
  let streak = 0;
  for (let i = 0; i < 400; i++) {
    const iso = toISO(addDays(new Date(), -i));
    const dayEvents = realEvents.filter((e) => occursOn(e, iso));
    const hasCompleted = dayEvents.some((e) => e.completed);
    if (hasCompleted) { streak++; continue; }
    if (i === 0 && dayEvents.length === 0) continue;
    break;
  }
  return streak;
}

function computeStats() {
  const todayIso = todayISO();
  const realEvents = currentData.events || [];
  const todayCount = getVisibleEventsForDate(todayIso).length;
  const completedCount = realEvents.filter((e) => e.completed).length;
  const upcomingCount = realEvents.filter((e) => !e.completed && e.date >= todayIso).length;
  const completionRate = realEvents.length ? Math.round((completedCount / realEvents.length) * 100) : 0;
  const streak = computeStreak(realEvents);
  const buckets = Array.from({ length: 8 }, (_, i) => ({ label: `${pad2(i * 3)}h`, count: 0 }));
  realEvents.forEach((e) => { if (e.startTime) buckets[Math.floor(Number(e.startTime.split(':')[0]) / 3)].count++; });
  return { todayCount, completedCount, upcomingCount, completionRate, streak, buckets };
}

// ─── Init / refresh ─────────────────────────────────────────────────────────
function initCalendarPage() {
  calState.selected = todayISO();
  try {
    hydrateAllEvents();
    reconcileSourceLinkedEvents();
    stampStatuses();
    persist();
  } catch (_e) { /* fall through — refreshCalendar's own guard renders an error state */ }
  bindCalendarGlobalListeners();
  startReminderLoop();
  refreshCalendar();
}

function refreshCalendar(opts = {}) {
  if (opts.persistData) {
    reconcileSourceLinkedEvents();
    stampStatuses();
    persist();
  }
  const stats = computeStats();
  renderCalendarQuickStats(stats);
  safeRenderCalendarRoot(stats);
}

function navigateCalendar(dir) {
  const d = parseISO(calState.selected);
  let next;
  if (calState.view === 'month') next = addMonthsClamped(d, dir);
  else if (calState.view === 'week') next = addDays(d, dir * 7);
  else next = addDays(d, dir);
  calState.selected = toISO(next);
  refreshCalendar();
}

// ─── Quick stats strip (#stats-grid) ────────────────────────────────────────
function renderCalendarQuickStats(stats) {
  const el = byId('stats-grid');
  if (!el) return;
  const s = stats || computeStats();
  el.innerHTML = [
    ["Today's events", s.todayCount, Math.min(100, s.todayCount * 20)],
    ['Completed events', s.completedCount, Math.min(100, s.completedCount * 10)],
    ['Upcoming events', s.upcomingCount, Math.min(100, s.upcomingCount * 10)],
    ['Completion rate', `${s.completionRate}%`, s.completionRate],
  ].map(([label, value, width]) => `
    <article class="stat-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value))}</strong>
      <div class="meter"><i style="width:${width}%"></i></div>
    </article>
  `).join('');
}

// ─── Root render (with error-state guard) ──────────────────────────────────
function safeRenderCalendarRoot(stats) {
  try {
    renderCalendarRoot(stats);
  } catch (err) {
    renderCalendarErrorState(err);
  }
}

function renderCalendarErrorState(err) {
  const root = byId('calendar-root');
  if (!root) return;
  console.error('Calendar render error:', err);
  root.innerHTML = `
    <div class="panel cal-error-state">
      <p class="eyebrow">Something went wrong</p>
      <h2>The calendar view hit a snag</h2>
      <p class="muted">This usually clears itself by resetting the current view and filters. Your events are safe in storage.</p>
      <button class="primary-btn" type="button" data-cal-error-reset>Reset calendar view</button>
    </div>
  `;
  const btn = root.querySelector('[data-cal-error-reset]');
  if (btn) btn.addEventListener('click', () => {
    calState.view = 'month';
    calState.search = '';
    calState.hiddenCats = new Set();
    calState.filterOpen = false;
    calState.selected = todayISO();
    refreshCalendar();
  });
}

function renderCalendarRoot(stats) {
  const root = byId('calendar-root');
  if (!root) return;
  const s = stats || computeStats();
  root.innerHTML = `
    ${controlsHtml()}
    <div class="cal-body">
      <div class="cal-main">
        ${calState.view === 'month'
          ? monthGridHtml()
          : timeGridHtml(calState.view === 'week' ? weekDaysFor(calState.selected) : [calState.selected])}
      </div>
      <aside class="cal-side">
        ${dailyScheduleHtml()}
        ${upcomingHtml()}
        ${quickAddHtml()}
      </aside>
    </div>
    ${statsSectionHtml(s)}
    <button class="cal-fab" data-cal-add type="button" aria-label="Add event">+</button>
  `;
  bindCalendarRootEvents(root);
  if (calState._focusRestore) {
    const el = root.querySelector(calState._focusRestore);
    if (el) {
      el.focus();
      if (typeof el.value === 'string' && el.setSelectionRange) {
        const p = el.value.length;
        try { el.setSelectionRange(p, p); } catch (_e) { /* ignore */ }
      }
    }
    calState._focusRestore = null;
  }
}

// ─── Controls ───────────────────────────────────────────────────────────────
function controlsHtml() {
  const label = calState.view === 'month' ? monthLabel(calState.selected)
    : calState.view === 'week' ? weekRangeLabel(calState.selected)
    : dayLabel(calState.selected);
  return `
    <div class="panel cal-controls">
      <div class="cal-controls-left">
        <button class="cal-nav-btn" data-cal-prev type="button" aria-label="Previous">‹</button>
        <div class="cal-current-label"><strong>${escapeHtml(label)}</strong></div>
        <button class="cal-nav-btn" data-cal-next type="button" aria-label="Next">›</button>
        <button class="secondary-btn cal-today-btn" data-cal-today type="button">Today</button>
      </div>
      <div class="cal-controls-right">
        <div class="cal-view-switch" role="tablist">
          ${['month', 'week', 'day'].map((v) => `<button class="cal-view-btn${calState.view === v ? ' active' : ''}" data-cal-view="${v}" type="button" role="tab" aria-selected="${calState.view === v}">${labelize(v)}</button>`).join('')}
        </div>
        <div class="cal-search-wrap">
          <input type="search" id="cal-search-input" placeholder="Search events…" value="${escapeAttr(calState.search)}" aria-label="Search events" />
        </div>
        <div class="cal-filter-wrap" data-cal-filter-wrap>
          <button class="secondary-btn" data-cal-filter-toggle type="button" aria-expanded="${calState.filterOpen}">Filter${calState.hiddenCats.size ? ` (${Object.keys(CATEGORY_META).length - calState.hiddenCats.size})` : ''}</button>
          <div class="cal-filter-dropdown${calState.filterOpen ? ' open' : ''}">
            ${Object.entries(CATEGORY_META).map(([key, meta]) => `
              <label class="cal-filter-item">
                <input type="checkbox" data-cal-filter-cat="${key}" ${calState.hiddenCats.has(key) ? '' : 'checked'} />
                <span class="cal-dot" style="background:${meta.color}"></span>${meta.icon} ${meta.label}
              </label>
            `).join('')}
          </div>
        </div>
        <button class="primary-btn cal-add-btn" data-cal-add type="button">+ Add Event</button>
      </div>
    </div>
  `;
}

// ─── Month view ─────────────────────────────────────────────────────────────
function buildMonthCells(anchorIso) {
  const anchor = parseISO(anchorIso);
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart = startOfWeek(first);
  return Array.from({ length: 42 }, (_, i) => {
    const d = addDays(gridStart, i);
    const iso = toISO(d);
    return {
      iso, dateNum: d.getDate(), inMonth: d.getMonth() === anchor.getMonth(),
      isToday: iso === todayISO(), isSelected: iso === calState.selected,
      events: getVisibleEventsForDate(iso),
    };
  });
}

function monthGridHtml() {
  const cells = buildMonthCells(calState.selected);
  return `
    <div class="panel cal-month-grid">
      <div class="cal-weekday-row">${CAL_DAY_NAMES_SHORT.map((d) => `<span>${d}</span>`).join('')}</div>
      <div class="cal-days-grid" data-cal-days>${cells.map(dayCellHtml).join('')}</div>
    </div>
  `;
}

function dayCellHtml(cell) {
  const cats = [...new Set(cell.events.map((e) => e.category))]
    .sort((a, b) => Object.keys(CATEGORY_META).indexOf(a) - Object.keys(CATEGORY_META).indexOf(b));
  const shown = cats.slice(0, 3);
  const extra = cats.length - shown.length;
  return `
    <button type="button" class="cal-day${cell.inMonth ? '' : ' cal-day-muted'}${cell.isToday ? ' cal-day-today' : ''}${cell.isSelected ? ' cal-day-selected' : ''}"
      data-cal-day="${cell.iso}" tabindex="${cell.isSelected ? '0' : '-1'}" aria-current="${cell.isToday ? 'date' : 'false'}" aria-pressed="${cell.isSelected}">
      <span class="cal-day-num">${cell.dateNum}</span>
      <span class="cal-day-dots">
        ${shown.map((c) => `<i class="cal-dot" style="background:${CATEGORY_META[c].color}" title="${CATEGORY_META[c].label}"></i>`).join('')}
        ${extra > 0 ? `<em class="cal-more">+${extra} More</em>` : ''}
      </span>
    </button>
  `;
}

// ─── Week / Day time-grid view ──────────────────────────────────────────────
const CAL_HOUR_HEIGHT = 48;

function hourLabel(h) {
  const ampm = h >= 12 ? 'PM' : 'AM';
  let hh = h % 12; if (hh === 0) hh = 12;
  return `${hh} ${ampm}`;
}

function timeGridHtml(days) {
  return `
    <div class="panel cal-timegrid" style="--cal-cols:${days.length}" data-cal-timegrid>
      <div class="cal-timegrid-header">
        <div class="cal-timegrid-gutter"></div>
        ${days.map((iso) => `
          <div class="cal-timegrid-daycol-head${iso === todayISO() ? ' is-today' : ''}${iso === calState.selected ? ' is-selected' : ''}" data-cal-day="${iso}">
            <span>${CAL_DAY_NAMES_SHORT[parseISO(iso).getDay()]}</span><strong>${parseISO(iso).getDate()}</strong>
          </div>
        `).join('')}
      </div>
      <div class="cal-timegrid-alldayrow">
        <div class="cal-timegrid-gutter">All day</div>
        ${days.map((iso) => `
          <div class="cal-timegrid-alldaycell" data-cal-day="${iso}">
            ${getVisibleEventsForDate(iso).filter((e) => !e.startTime).map((ev) => miniChipHtml(ev)).join('')}
          </div>
        `).join('')}
      </div>
      <div class="cal-timegrid-body">
        <div class="cal-timegrid-hours">${Array.from({ length: 24 }, (_, h) => `<div class="cal-timegrid-hour-label">${hourLabel(h)}</div>`).join('')}</div>
        ${days.map((iso) => `
          <div class="cal-timegrid-daycol" data-cal-day="${iso}" style="height:${24 * CAL_HOUR_HEIGHT}px">
            ${Array.from({ length: 24 }, (_, h) => `<div class="cal-timegrid-hourline" style="top:${h * CAL_HOUR_HEIGHT}px"></div>`).join('')}
            ${getVisibleEventsForDate(iso).filter((e) => e.startTime).map((ev) => timeBlockHtml(ev)).join('')}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function miniChipHtml(ev) {
  return `<span class="cal-mini-chip" style="background:${eventColor(ev)}" data-cal-event-id="${ev.id}" draggable="${ev.sourceModule ? 'false' : 'true'}">${eventIcon(ev)} ${escapeHtml(ev.title)}</span>`;
}

function timeBlockHtml(ev) {
  const [sh, sm] = ev.startTime.split(':').map(Number);
  let dur = 60;
  if (ev.endTime) { const [eh, em] = ev.endTime.split(':').map(Number); dur = Math.max(15, (eh * 60 + em) - (sh * 60 + sm)); }
  const top = (sh + sm / 60) * CAL_HOUR_HEIGHT;
  const height = Math.max(22, (dur / 60) * CAL_HOUR_HEIGHT);
  return `
    <div class="cal-time-block${ev.completed ? ' is-completed' : ''}" data-cal-block data-cal-event-id="${ev.id}" draggable="${ev.sourceModule ? 'false' : 'true'}" style="top:${top}px;height:${height}px;background:${eventColor(ev)}">
      <div class="cal-time-block-title">${eventIcon(ev)} ${escapeHtml(ev.title)}</div>
      <div class="cal-time-block-time">${timeLabel(ev)}</div>
      ${!ev.sourceModule ? `<span class="cal-resize-handle" data-cal-resize="${ev.id}"></span>` : ''}
    </div>
  `;
}

// ─── Daily schedule panel ───────────────────────────────────────────────────
function dailyScheduleHtml() {
  const items = getVisibleEventsForDate(calState.selected);
  return `
    <section class="panel cal-daily-schedule">
      <div class="cal-panel-head">
        <div><p class="eyebrow">Schedule</p><h2>${escapeHtml(friendlyDateLabel(calState.selected))}</h2></div>
        <button class="cal-collapse-toggle${calState.scheduleCollapsed ? ' collapsed' : ''}" data-cal-schedule-collapse type="button" aria-label="Toggle schedule">⌄</button>
      </div>
      <div class="cal-schedule-list${calState.scheduleCollapsed ? ' collapsed' : ''}" data-cal-schedule-list>
        ${items.length ? items.map(scheduleItemHtml).join('') : '<div class="empty-state">No activities for this day. Add one below.</div>'}
      </div>
    </section>
  `;
}

function scheduleItemHtml(ev) {
  const status = computeStatus(ev);
  const color = eventColor(ev);
  const meta = CATEGORY_META[ev.category] || CATEGORY_META.custom;
  const srcMeta = ev.sourceModule ? SOURCE_MODULE_META[ev.sourceModule] : null;
  const canToggle = !srcMeta || srcMeta.completable;
  return `
    <article class="cal-event-card${ev.completed ? ' is-completed' : ''}" draggable="${ev.sourceModule ? 'false' : 'true'}" data-cal-event-id="${ev.id}" style="--cal-cat-color:${color}">
      <label class="cal-event-check">
        <input type="checkbox" ${ev.completed ? 'checked' : ''} ${canToggle ? '' : 'disabled'} data-cal-toggle="${ev.id}" aria-label="Mark ${escapeAttr(ev.title)} complete" />
      </label>
      <div class="cal-event-icon" aria-hidden="true">${eventIcon(ev)}</div>
      <div class="cal-event-main" data-cal-view="${ev.id}">
        <div class="cal-event-top"><strong>${escapeHtml(ev.title)}</strong><span class="cal-pill cal-pill-${ev.priority.toLowerCase()}">${ev.priority}</span></div>
        <div class="cal-event-meta">
          <span class="cal-badge" style="background:${color}">${eventIcon(ev)} ${meta.label}</span>
          <span class="cal-event-time">${timeLabel(ev)}</span>
          <span class="cal-status cal-status-${status.toLowerCase()}">${status}</span>
        </div>
        ${srcMeta ? `<a class="cal-open-source" href="${sourceHref(ev)}">Open ${escapeHtml(srcMeta.label)} →</a>` : ''}
      </div>
      <div class="cal-event-actions">
        <button class="cal-icon-btn" data-cal-edit="${ev.id}" type="button" title="Edit event" aria-label="Edit event">✎</button>
        <button class="cal-icon-btn" data-cal-duplicate="${ev.id}" type="button" title="Duplicate event" aria-label="Duplicate event">⧉</button>
        ${!ev.sourceModule ? `<button class="cal-icon-btn cal-icon-danger" data-cal-delete="${ev.id}" type="button" title="Delete event" aria-label="Delete event">✕</button>` : ''}
      </div>
    </article>
  `;
}

function sourceHref(ev) {
  if (ev.sourceModule === 'workout') return `workout.html?day=${encodeURIComponent(ev.sourceId)}`;
  const meta = SOURCE_MODULE_META[ev.sourceModule];
  return meta ? meta.page : '#';
}

// ─── Upcoming events sidebar ────────────────────────────────────────────────
function upcomingGroups() {
  const tomorrow = toISO(addDays(new Date(), 1));
  const weekItems = [];
  for (let i = 2; i <= 6; i++) {
    const iso = toISO(addDays(new Date(), i));
    getVisibleEventsForDate(iso).forEach((ev) => weekItems.push({ ...ev, _iso: iso }));
  }
  return [
    { label: "Today's Events", items: getVisibleEventsForDate(todayISO()) },
    { label: 'Tomorrow', items: getVisibleEventsForDate(tomorrow) },
    { label: 'This Week', items: weekItems },
  ];
}

function upcomingCardHtml(ev) {
  const color = eventColor(ev);
  const iso = ev._iso || ev.occurrenceDate || ev.date;
  const d = parseISO(iso);
  const status = computeStatus(ev);
  return `
    <article class="cal-upcoming-card${ev.completed ? ' is-completed' : ''}" style="--cal-cat-color:${color}">
      <span class="cal-upcoming-time">${ev._iso ? `${CAL_MONTH_NAMES_SHORT[d.getMonth()]} ${d.getDate()} · ` : ''}${timeLabel(ev)}</span>
      <strong>${escapeHtml(ev.title)}</strong>
      <span class="cal-badge" style="background:${color}">${eventIcon(ev)} ${(CATEGORY_META[ev.category] || CATEGORY_META.custom).label}</span>
      <span class="cal-status cal-status-${status.toLowerCase()}">${status}</span>
    </article>
  `;
}

function upcomingHtml() {
  const groups = upcomingGroups();
  const allEmpty = groups.every((g) => !g.items.length);
  return `
    <section class="panel cal-upcoming">
      <p class="eyebrow">Upcoming</p><h2>Upcoming events</h2>
      ${allEmpty
        ? '<div class="empty-state">Nothing on the horizon. Add an event to get started.</div>'
        : `<div class="cal-upcoming-scroll">${groups.map((g) => `
            <div class="cal-upcoming-group">
              <h3>${escapeHtml(g.label)}</h3>
              ${g.items.length ? g.items.map(upcomingCardHtml).join('') : '<p class="muted">Nothing scheduled.</p>'}
            </div>
          `).join('')}</div>`}
    </section>
  `;
}

// ─── Quick add panel ────────────────────────────────────────────────────────
function categoryOptions(sel) {
  return Object.entries(CATEGORY_META).map(([k, m]) => `<option value="${k}" ${sel === k ? 'selected' : ''}>${m.icon} ${m.label}</option>`).join('');
}

function quickAddHtml() {
  return `
    <section class="panel cal-quickadd">
      <p class="eyebrow">Fast entry</p><h2>Quick add</h2>
      <form class="cal-quickadd-form" data-cal-quickadd novalidate>
        <input name="title" placeholder="Event title" required aria-label="Event title" />
        <div class="cal-quickadd-row">
          <input name="date" type="date" value="${escapeAttr(calState.selected)}" required aria-label="Event date" />
          <input name="time" type="time" aria-label="Event time" />
        </div>
        <select name="category" aria-label="Event category">${categoryOptions('event')}</select>
        <button class="primary-btn" type="submit">Add Event</button>
      </form>
    </section>
  `;
}

// ─── Statistics section ─────────────────────────────────────────────────────
function ringSvg(pct) {
  const r = 34, c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(100, pct)) / 100) * c;
  return `
    <div class="cal-ring">
      <svg viewBox="0 0 80 80" aria-hidden="true">
        <circle cx="40" cy="40" r="${r}" class="cal-ring-track" />
        <circle cx="40" cy="40" r="${r}" class="cal-ring-fill" style="stroke-dasharray:${c};stroke-dashoffset:${offset}" />
      </svg>
      <strong class="cal-ring-label">${pct}%</strong>
    </div>
  `;
}

function busyBarsHtml(buckets) {
  const max = Math.max(1, ...buckets.map((b) => b.count));
  return `<div class="cal-busy-bars">${buckets.map((b) => `
    <div class="cal-busy-bar-wrap">
      <div class="cal-busy-bar" style="height:${Math.max(6, Math.round((b.count / max) * 72))}px"></div>
      <small>${b.label}</small>
    </div>
  `).join('')}</div>`;
}

function statsSectionHtml(s) {
  return `
    <section class="panel cal-stats-section">
      <p class="eyebrow">Statistics</p><h2>Calendar insights</h2>
      <div class="cal-stats-grid">
        <article class="cal-stat-card"><span>Today's Events</span><strong>${s.todayCount}</strong></article>
        <article class="cal-stat-card"><span>Completed Events</span><strong>${s.completedCount}</strong></article>
        <article class="cal-stat-card"><span>Upcoming Events</span><strong>${s.upcomingCount}</strong></article>
        <article class="cal-stat-card cal-ring-card"><span>Completion Rate</span>${ringSvg(s.completionRate)}</article>
        <article class="cal-stat-card"><span>Current Streak</span><strong>${s.streak} day${s.streak === 1 ? '' : 's'}</strong></article>
        <article class="cal-stat-card cal-busy-card"><span>Busy Hours</span>${busyBarsHtml(s.buckets)}</article>
      </div>
    </section>
  `;
}

// ─── CRUD ───────────────────────────────────────────────────────────────────
function moveEventToDate(id, iso) {
  const ev = (currentData.events || []).find((e) => e.id === id);
  if (!ev || ev.sourceModule) return;
  ev.date = iso;
  ev.updatedAt = nowStamp();
  refreshCalendar({ persistData: true });
}

// Method 1: complete directly inside the Calendar. For source-linked events
// this writes straight back into the origin collection (Todo/Habits/Goals/
// Prayer/Workout) so both sides agree immediately — no conflicting states.
function toggleEventComplete(id) {
  const ev = (currentData.events || []).find((e) => e.id === id);
  if (!ev) return;
  const meta = ev.sourceModule ? SOURCE_MODULE_META[ev.sourceModule] : null;
  if (meta && !meta.completable) return; // log-type source: read-only, nothing to flip
  const next = !ev.completed;
  ev.completed = next;
  ev.completedAt = next ? nowStamp() : null;
  ev.updatedAt = nowStamp();
  if (meta) {
    const item = meta.getCollection().find((i) => i.id === ev.sourceId);
    if (item) meta.setCompleted(item, next);
  }
  refreshCalendar({ persistData: true });
}

function deleteCalendarEvent(id) {
  const ev = (currentData.events || []).find((e) => e.id === id);
  if (!ev || ev.sourceModule) return; // linked events are managed at the source
  currentData.events = currentData.events.filter((e) => e.id !== id);
  refreshCalendar({ persistData: true });
}

function duplicateCalendarEvent(id) {
  const ev = (currentData.events || []).find((e) => e.id === id);
  if (!ev) return;
  const copy = hydrateEvent({
    ...ev, id: makeId(), title: `${ev.title} (Copy)`,
    sourceModule: null, sourceId: null, completed: false, completedAt: null,
  });
  currentData.events.push(copy);
  refreshCalendar({ persistData: true });
}

function handleQuickAdd(e) {
  e.preventDefault();
  ensureNotificationPermission();
  const fd = new FormData(e.currentTarget);
  const title = String(fd.get('title') || '').trim();
  if (!title) return;
  currentData.events.push(hydrateEvent({
    id: makeId(), title,
    date: String(fd.get('date') || todayISO()),
    startTime: String(fd.get('time') || ''),
    category: String(fd.get('category') || 'event'),
  }));
  calState.selected = String(fd.get('date') || calState.selected);
  refreshCalendar({ persistData: true });
}

// ─── Add / Edit event modal ─────────────────────────────────────────────────
function closeEventModal() {
  const el = document.querySelector('[data-cal-modal]');
  if (el) el.remove();
  calState.modalEventId = undefined;
}

function openEventModal(id) {
  ensureNotificationPermission();
  calState.modalEventId = id || null;
  renderEventModal();
}

function renderEventModal() {
  closeEventModal();
  const editing = calState.modalEventId ? (currentData.events || []).find((e) => e.id === calState.modalEventId) : null;
  const ev = editing || {
    title: '', description: '', category: 'event', date: calState.selected || todayISO(),
    startTime: '', endTime: '', priority: 'Medium', repeatRule: 'None', reminder: 'None', color: '', notes: '',
  };
  const linked = editing && editing.sourceModule ? SOURCE_MODULE_META[editing.sourceModule] : null;
  document.body.insertAdjacentHTML('beforeend', `
    <div class="cal-modal-overlay" data-cal-modal role="dialog" aria-modal="true" aria-label="${editing ? 'Edit event' : 'Add event'}">
      <div class="cal-modal-backdrop" data-cal-modal-close></div>
      <div class="panel cal-modal-card">
        <div class="cal-modal-head">
          <div><p class="eyebrow">${editing ? 'Edit' : 'New'} event</p><h2>${editing ? 'Edit Event' : 'Add Event'}</h2></div>
          <button class="cal-icon-btn" data-cal-modal-close type="button" aria-label="Close">✕</button>
        </div>
        ${linked ? `<p class="cal-sync-note">🔗 Synced from <strong>${escapeHtml(linked.label)}</strong> — title and category are managed on the ${escapeHtml(linked.label)} page. <a href="${sourceHref(editing)}">Open ${escapeHtml(linked.label)} →</a></p>` : ''}
        <form class="cal-modal-form form-stack" data-cal-event-form novalidate>
          <label class="full-field">Title<input name="title" required value="${escapeAttr(ev.title)}" ${linked ? 'readonly' : ''} /></label>
          <label class="full-field">Description<textarea name="description">${escapeHtml(ev.description || '')}</textarea></label>
          <div class="form-grid">
            <label>Category<select name="category" ${linked ? 'disabled' : ''}>${categoryOptions(ev.category)}</select></label>
            <label>Priority<select name="priority">${CAL_PRIORITIES.map((p) => `<option ${selected(ev.priority, p)}>${p}</option>`).join('')}</select></label>
            <label>Date<input name="date" type="date" required value="${escapeAttr(ev.date)}" /></label>
            <label>Repeat<select name="repeatRule">${CAL_REPEATS.map((r) => `<option ${selected(ev.repeatRule, r)}>${r}</option>`).join('')}</select></label>
            <label>Start Time<input name="startTime" type="time" value="${escapeAttr(ev.startTime || '')}" /></label>
            <label>End Time<input name="endTime" type="time" value="${escapeAttr(ev.endTime || '')}" /></label>
            <label>Reminder<select name="reminder">${CAL_REMINDER_OPTIONS.map(([v, l]) => `<option value="${v}" ${ev.reminder === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
            <label>Color<input name="color" type="color" value="${ev.color || CATEGORY_HEX[ev.category] || '#c1793a'}" /></label>
          </div>
          <label class="full-field">Notes<textarea name="notes">${escapeHtml(ev.notes || '')}</textarea></label>
          <div class="cal-modal-actions">
            ${editing && !linked ? '<button type="button" class="danger-btn" data-cal-modal-delete>Delete</button>' : '<span></span>'}
            <div class="cal-modal-actions-right">
              <button type="button" class="secondary-btn" data-cal-modal-close>Cancel</button>
              <button type="submit" class="primary-btn">Save Event</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  `);
  const overlay = document.querySelector('[data-cal-modal]');
  overlay.querySelectorAll('[data-cal-modal-close]').forEach((b) => b.addEventListener('click', closeEventModal));
  overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); closeEventModal(); } });
  const delBtn = overlay.querySelector('[data-cal-modal-delete]');
  if (delBtn) delBtn.addEventListener('click', () => { deleteCalendarEvent(editing.id); closeEventModal(); });
  overlay.querySelector('[data-cal-event-form]').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get('title') || '').trim();
    if (!title && !linked) return;
    const data = {
      title: linked ? editing.title : title,
      description: String(fd.get('description') || '').trim(),
      category: linked ? editing.category : String(fd.get('category') || 'event'),
      priority: String(fd.get('priority') || 'Medium'),
      date: String(fd.get('date')),
      repeatRule: String(fd.get('repeatRule') || 'None'),
      startTime: String(fd.get('startTime') || ''),
      endTime: String(fd.get('endTime') || ''),
      reminder: String(fd.get('reminder') || 'None'),
      color: String(fd.get('color') || ''),
      notes: String(fd.get('notes') || '').trim(),
    };
    if (editing) {
      Object.assign(editing, hydrateEvent({ ...editing, ...data, updatedAt: nowStamp() }));
    } else {
      currentData.events.push(hydrateEvent({ id: makeId(), completed: false, ...data }));
    }
    calState.selected = data.date;
    closeEventModal();
    refreshCalendar({ persistData: true });
  });
  const first = overlay.querySelector('input[name="title"]');
  if (first && !linked) first.focus();
}

// ─── Notifications / reminders ──────────────────────────────────────────────
function ensureNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
}

function showToast(msg) {
  const existing = document.querySelector('.cal-toast');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.className = 'cal-toast';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.textContent = msg;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 6000);
}

function fireReminder(ev) {
  const body = `${(CATEGORY_META[ev.category] || CATEGORY_META.custom).label} at ${formatTimeLabel(ev.startTime)}`;
  if ('Notification' in window && Notification.permission === 'granted') {
    try { new Notification(ev.title, { body }); } catch (_e) { /* ignore */ }
  }
  showToast(`${ev.title} — ${body}`);
}

function checkReminders() {
  const now = Date.now();
  window.__calFiredReminders = window.__calFiredReminders || new Set();
  (currentData.events || []).forEach((ev) => {
    if (!ev.reminder || ev.reminder === 'None' || ev.completed || !ev.startTime) return;
    const dt = new Date(`${ev.date}T${ev.startTime}:00`);
    const fireAt = dt.getTime() - Number(ev.reminder) * 60000;
    const key = `${ev.id}:${ev.date}:${ev.startTime}`;
    if (now >= fireAt && now < dt.getTime() && !window.__calFiredReminders.has(key)) {
      window.__calFiredReminders.add(key);
      fireReminder(ev);
    }
  });
}

function startReminderLoop() {
  if (window.__calReminderInterval) return;
  window.__calReminderInterval = setInterval(checkReminders, 20000);
  checkReminders();
}

// ─── Global listeners (bound once, survive full-root re-renders) ───────────
function bindCalendarGlobalListeners() {
  if (window.__calGlobalBound) return;
  window.__calGlobalBound = true;

  document.addEventListener('keydown', (e) => {
    if (document.querySelector('[data-cal-modal]')) return;
    if (e.key === 'Escape' && calState.filterOpen) { calState.filterOpen = false; refreshCalendar(); return; }
    const tag = (e.target.tagName || '').toLowerCase();
    if (['input', 'textarea', 'select'].includes(tag)) return;
    if (!byId('calendar-root')) return;
    let handled = true;
    if (e.key === 'ArrowLeft')  calState.selected = toISO(addDays(parseISO(calState.selected), -1));
    else if (e.key === 'ArrowRight') calState.selected = toISO(addDays(parseISO(calState.selected), 1));
    else if (e.key === 'ArrowUp')    calState.selected = toISO(addDays(parseISO(calState.selected), -7));
    else if (e.key === 'ArrowDown')  calState.selected = toISO(addDays(parseISO(calState.selected), 7));
    else if (e.key === 'Enter')      openEventModal();
    else handled = false;
    if (handled) {
      e.preventDefault();
      calState._focusRestore = '.cal-day-selected, [data-cal-day].is-selected';
      refreshCalendar();
    }
  });

  document.addEventListener('click', (e) => {
    if (!calState.filterOpen) return;
    if (e.target.closest('[data-cal-filter-wrap]')) return;
    calState.filterOpen = false;
    refreshCalendar();
  });
}

function bindSwipe(root) {
  const grid = root.querySelector('[data-cal-days]') || root.querySelector('.cal-timegrid-body');
  if (!grid) return;
  let startX = 0, startY = 0, tracking = false;
  grid.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    startX = e.touches[0].clientX; startY = e.touches[0].clientY; tracking = true;
  }, { passive: true });
  grid.addEventListener('touchend', (e) => {
    if (!tracking) return;
    tracking = false;
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) navigateCalendar(dx < 0 ? 1 : -1);
  }, { passive: true });
}

function bindResizeHandlers(root) {
  root.querySelectorAll('[data-cal-resize]').forEach((handle) => {
    handle.addEventListener('mousedown', (e) => {
      e.preventDefault(); e.stopPropagation();
      const id = handle.dataset.calResize;
      const block = handle.closest('[data-cal-block]');
      const ev = (currentData.events || []).find((x) => x.id === id);
      if (!ev || !block) return;
      const startY = e.clientY;
      const startHeight = block.offsetHeight;
      function onMove(e2) {
        block.style.height = `${Math.max(22, startHeight + (e2.clientY - startY))}px`;
      }
      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        const totalMinutes = Math.max(15, Math.round((block.offsetHeight / CAL_HOUR_HEIGHT) * 60 / 15) * 15);
        const [sh, sm] = ev.startTime.split(':').map(Number);
        const endTotal = sh * 60 + sm + totalMinutes;
        ev.endTime = `${pad2(Math.min(23, Math.floor(endTotal / 60)))}:${pad2(endTotal % 60)}`;
        ev.updatedAt = nowStamp();
        refreshCalendar({ persistData: true });
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  });
}

function bindCalendarRootEvents(root) {
  const q = (sel) => root.querySelector(sel);
  const qa = (sel) => root.querySelectorAll(sel);

  const prev = q('[data-cal-prev]'); if (prev) prev.addEventListener('click', () => navigateCalendar(-1));
  const next = q('[data-cal-next]'); if (next) next.addEventListener('click', () => navigateCalendar(1));
  const today = q('[data-cal-today]'); if (today) today.addEventListener('click', () => { calState.selected = todayISO(); refreshCalendar(); });

  qa('[data-cal-view]').forEach((btn) => btn.addEventListener('click', () => { calState.view = btn.dataset.calView; refreshCalendar(); }));

  const searchInput = q('#cal-search-input');
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        calState.search = searchInput.value;
        calState._focusRestore = '#cal-search-input';
        refreshCalendar();
      }, 250);
    });
  }

  const filterToggle = q('[data-cal-filter-toggle]');
  if (filterToggle) filterToggle.addEventListener('click', (e) => { e.stopPropagation(); calState.filterOpen = !calState.filterOpen; refreshCalendar(); });
  qa('[data-cal-filter-cat]').forEach((chk) => chk.addEventListener('change', () => {
    const key = chk.dataset.calFilterCat;
    if (chk.checked) calState.hiddenCats.delete(key); else calState.hiddenCats.add(key);
    refreshCalendar();
  }));

  qa('[data-cal-add]').forEach((btn) => btn.addEventListener('click', () => openEventModal()));

  qa('[data-cal-day]').forEach((el) => {
    el.addEventListener('click', () => { calState.selected = el.dataset.calDay; refreshCalendar(); });
    el.addEventListener('dragover', (e) => { e.preventDefault(); el.classList.add('cal-drop-hover'); });
    el.addEventListener('dragleave', () => el.classList.remove('cal-drop-hover'));
    el.addEventListener('drop', (e) => {
      e.preventDefault();
      el.classList.remove('cal-drop-hover');
      const id = e.dataTransfer.getData('text/plain');
      if (id) moveEventToDate(id, el.dataset.calDay);
    });
  });

  qa('[draggable="true"][data-cal-event-id]').forEach((el) => {
    el.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', el.dataset.calEventId);
      e.dataTransfer.effectAllowed = 'move';
    });
  });

  qa('[data-cal-toggle]').forEach((chk) => chk.addEventListener('change', () => toggleEventComplete(chk.dataset.calToggle)));
  qa('[data-cal-edit]').forEach((btn) => btn.addEventListener('click', () => openEventModal(btn.dataset.calEdit)));
  qa('[data-cal-duplicate]').forEach((btn) => btn.addEventListener('click', () => duplicateCalendarEvent(btn.dataset.calDuplicate)));
  qa('[data-cal-delete]').forEach((btn) => btn.addEventListener('click', () => deleteCalendarEvent(btn.dataset.calDelete)));
  qa('.cal-event-main[data-cal-view]').forEach((el) => el.addEventListener('click', () => openEventModal(el.dataset.calView)));

  const collapseBtn = q('[data-cal-schedule-collapse]');
  if (collapseBtn) collapseBtn.addEventListener('click', () => { calState.scheduleCollapsed = !calState.scheduleCollapsed; refreshCalendar(); });

  const quickForm = q('[data-cal-quickadd]');
  if (quickForm) quickForm.addEventListener('submit', handleQuickAdd);

  bindResizeHandlers(root);
  bindSwipe(root);
}
