// MYLIFE - Workout page logic
// Reuses bootShell(), persist(), currentData, escapeHtml(), escapeAttr(), makeId(), and percent() from shared.js.

const DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WORKOUT_TYPES = ['Push Day', 'Pull Day', 'Leg Day', 'Upper Body', 'Lower Body', 'Full Body', 'Cardio', 'Rest Day'];

const EX_STATUS_CLASS = { 'Not Started': 'ex-ns', 'In Progress': 'ex-inprogress', 'Done': 'ex-done', 'Skipped': 'ex-skipped' };

const WO_STATUS = ['Not Started', 'In Progress', 'Done', 'Skipped', 'Rest Day'];
const WO_STATUS_CLASS = { 'Not Started': 'wo-ns', 'In Progress': 'wo-inprogress', 'Done': 'wo-done', 'Skipped': 'wo-skipped', 'Rest Day': 'wo-rest' };
const REST_QUOTES = [
  'Push beyond your limits.',
  'Champions are built one rep at a time.',
  'Discipline beats motivation.',
  'Focus on perfect form.',
  'The next set matters.',
  'You are stronger than yesterday.',
  'Keep going.',
  'One more set.',
];

const REST_OPTIONS = [30, 60, 90, 120, 180, 240, 300];
const REST_OPTION_LABELS = { 30: '30 sec', 60: '60 sec', 90: '90 sec', 120: '2 min', 180: '3 min', 240: '4 min', 300: '5 min' };

let openSessionId = null;
let sessionTimers = {};
let restTimerState = null;
let restFocusReturn = null;
let workoutEventsBound = false;
let sessionClockInterval = null;
let collapsedExercises = new Set();

function initWorkoutPage() {
  migrateLegacyData();
  ensureWeekSchedule();
  renderArt('workout');
  renderWorkoutStats();
  renderWorkoutRoot();
  bindWorkoutEventsOnce();

  window.addEventListener('beforeunload', (e) => {
    const s = openSessionId && plan().schedule.find((x) => x.id === openSessionId);
    if (!s || s.status !== 'In Progress') return;
    e.preventDefault();
    e.returnValue = '';
  });

  const dayId = new URLSearchParams(window.location.search).get('day');
  if (dayId && plan().schedule.some((s) => s.id === dayId)) {
    openWorkoutSession(dayId);
  }
}

function isRestDay(s) {
  return s.type === 'Rest Day';
}

// Single source of truth for a schedule row's displayed status. Rest Day
// always wins (it can't have exercises), otherwise the status is whatever
// the planner/session logic last computed — never a free-form manual value.
function effectiveWorkoutStatus(s) {
  if (isRestDay(s)) return 'Rest Day';
  return s.status || 'Not Started';
}

// Recomputes a workout's status purely from its exercises, so the planner
// can never show a status that disagrees with the exercises underneath it.
// 'Done' (via Complete workout) and 'Skipped' are deliberate, explicit
// actions — once set, they stay locked until "Reset workout" is used, so
// finishing early or skipping doesn't get silently overwritten. Everything
// else (Not Started / In Progress / auto-Done-when-all-exercises-complete)
// is always recalculated fresh, so unmarking a "Done" exercise immediately
// drops the workout back out of Done too.
function recomputeWorkoutStatus(s) {
  if (isRestDay(s)) { s.status = 'Rest Day'; s.statusLocked = false; return; }
  if (s.statusLocked) return;
  const total = s.exercises.length;
  if (!total) { s.status = 'Not Started'; return; }
  const done = exerciseDoneCount(s);
  if (done >= total) {
    s.status = 'Done';
    if (!s.completionDate) { s.completionDate = new Date().toISOString().slice(0, 10); s.lastCompletedDate = s.completionDate; }
  } else if (done > 0 || s.exercises.some((ex) => (ex.log || []).some(setIsDone))) {
    s.status = 'In Progress';
  } else {
    s.status = 'Not Started';
  }
}

// Restarts a workout day: clears every exercise's logged sets/status and
// unlocks the workout status so it goes back to being auto-calculated.
function resetWorkoutSession(s) {
  s.exercises.forEach((ex) => {
    ex.log = [];
    ex.exStatus = 'Not Started';
    delete ex.performance;
  });
  s.status = 'Not Started';
  s.statusLocked = false;
  s.durationMin = 0;
  s.calories = 0;
  delete s.completionDate;
  delete s.lastCompletedDate;
  if (openSessionId === s.id) { clearRestTimer(); delete sessionTimers[s.id]; }
}

// Converts a day to Rest Day: clears exercises, timers, progress and status.
function convertToRestDay(s) {
  s.type = 'Rest Day';
  s.exercises = [];
  s.status = 'Rest Day';
  s.durationMin = 0;
  s.calories = 0;
  collapsedExercises.clear();
  if (openSessionId === s.id) { clearRestTimer(); openSessionId = null; delete sessionTimers[s.id]; }
}

function restDayCardHtml() {
  return `
    <div class="wo-rest-day-card">
      <span class="wo-rest-day-icon" aria-hidden="true">🛌</span>
      <h3>Rest Day</h3>
      <p>Recovery is part of progress. Enjoy your recovery.</p>
    </div>
  `;
}

function isLikelyValidUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function plan() {
  return currentData.workoutPlan;
}

// Single source of truth for a freshly-added exercise so every "add exercise"
// entry point (FAB, per-day + button) stays in sync and the name field never
// starts pre-filled with placeholder-like text (see excelPlanTableHtml()).
function createNewExercise() {
  return { id: makeId(), name: '', sets: 3, repsMin: 8, repsMax: 12, weight: 0, rest: '', video: '', notes: '', log: [], exStatus: 'Not Started' };
}

// Shared "commit a change and repaint" helper used after every mutation to
// plan()/currentData so the various click/change handlers don't each repeat
// the same persist + re-render sequence.
function refreshWorkout({ art = false } = {}) {
  plan().schedule.forEach(recomputeWorkoutStatus);
  persist();
  if (art) renderArt('workout');
  renderWorkoutStats();
  renderWorkoutRoot();
}

function migrateLegacyData() {
  const p = plan();
  if (!p.trainingDaysFull || !p.trainingDaysFull.length) {
    p.trainingDaysFull = (p.trainingDays || ['Mon', 'Wed', 'Fri'])
      .map((d) => DAY_NAMES_FULL[DAY_NAMES.indexOf(d)] || d)
      .filter((d) => DAY_NAMES_FULL.includes(d));
  }

  (p.schedule || []).forEach((s) => {
    if (s.status === 'Pending') s.status = 'Not Started';
    if (s.status === 'Completed') s.status = 'Done';
    if (typeof s.statusLocked !== 'boolean') s.statusLocked = s.status === 'Done' || s.status === 'Skipped';
    if (!s.dayFull && s.day) s.dayFull = DAY_NAMES_FULL[DAY_NAMES.indexOf(s.day)] || s.day;
    if (!s.date && s.dayFull) s.date = dateForDayFull(s.dayFull);
    if (!Array.isArray(s.exercises)) s.exercises = [];

    s.exercises.forEach((ex) => {
      if (!ex.id) ex.id = makeId();
      if (!ex.exStatus) ex.exStatus = 'Not Started';
      if (!Array.isArray(ex.log)) ex.log = [];
      if (!Array.isArray(ex.performanceHistory)) ex.performanceHistory = [];
      if (ex.videoUrl && !ex.video) ex.video = ex.videoUrl;
      ex.video = String(ex.video || '').trim();
      ex.sets = Math.max(1, Number(ex.sets) || 3);
      ex.repsMin = Number(ex.repsMin) || 8;
      ex.repsMax = Number(ex.repsMax) || 12;
      ex.rest = Number(ex.rest) || 90;
    });
  });
  persist();
}

function startOfWeek(d = new Date()) {
  const date = new Date(d);
  date.setDate(date.getDate() - date.getDay());
  date.setHours(0, 0, 0, 0);
  return date;
}

function dateForDayFull(dayFull) {
  const dow = DAY_NAMES_FULL.indexOf(dayFull);
  const sunday = startOfWeek();
  const d = new Date(sunday);
  d.setDate(d.getDate() + Math.max(0, dow));
  return d.toISOString().slice(0, 10);
}

function addDays(dateText, days) {
  const d = new Date(`${dateText}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateForDayFull(DAY_NAMES_FULL[new Date().getDay()]);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function isDateThisWeek(dateText) {
  if (!dateText) return false;
  const d = new Date(`${dateText}T00:00:00`);
  if (Number.isNaN(d.getTime())) return false;
  const start = startOfWeek();
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return d >= start && d < end;
}

function lastNDates(n) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function restLabel(rest) {
  const secs = Number(rest);
  if (REST_OPTION_LABELS[secs]) return REST_OPTION_LABELS[secs];
  return secs ? `${secs}s` : 'Not set';
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function controlId(...parts) {
  return parts
    .map((part) => String(part || '').replace(/[^a-zA-Z0-9_-]+/g, '-'))
    .join('-');
}

function setIsDone(log) {
  return !!(log && log.done && hasSetPerformance(log));
}

function hasSetPerformance(log) {
  return !!(log && String(log.weight ?? '').trim() !== '' && String(log.reps ?? '').trim() !== '');
}

function exerciseDoneCount(s) {
  return (s.exercises || []).filter((ex) => ex.exStatus === 'Done').length;
}

function exerciseProgress(s) {
  const total = (s.exercises || []).length;
  return total ? percent(exerciseDoneCount(s), total) : 0;
}

function completedWorkoutsThisWeek() {
  return plan().schedule.filter((s) => {
    const completedDate = s.completionDate || s.lastCompletedDate;
    return isDateThisWeek(completedDate);
  });
}

function updateExerciseStatusFromSets(ex, workoutDate = new Date().toISOString().slice(0, 10)) {
  if (ex.exStatus === 'Skipped') return;
  const doneSets = (ex.log || []).filter(setIsDone).length;
  const totalSets = Math.max(1, Number(ex.sets) || 1);
  if (doneSets >= totalSets) {
    ex.exStatus = 'Done';
    saveExercisePerformance(ex, workoutDate);
  } else if (doneSets > 0) {
    ex.exStatus = 'In Progress';
  } else {
    ex.exStatus = 'Not Started';
  }
}

function analyzeExercisePerformance(ex) {
  const completed = (ex.log || []).filter(setIsDone).slice(0, Number(ex.sets) || 1);
  const totalSets = Math.max(1, Number(ex.sets) || 1);
  if (completed.length < totalSets) return null;

  const reps = completed.map((set) => Number(set.reps) || 0);
  const weights = completed.map((set) => Number(set.weight) || 0);
  const avgReps = reps.reduce((sum, value) => sum + value, 0) / reps.length;
  const avgWeight = weights.reduce((sum, value) => sum + value, 0) / weights.length;
  const repsMin = Number(ex.repsMin) || 1;
  const repsMax = Number(ex.repsMax) || repsMin;

  if (avgReps < repsMin) {
    return {
      status: 'Weight Too Heavy',
      recommendation: 'Reduce weight slightly next session',
      message: 'You struggled to hit the target reps. Recommended: reduce weight slightly next session.',
      tone: 'heavy',
      avgReps,
      avgWeight,
      reps,
    };
  }
  if (avgReps >= repsMax) {
    return {
      status: 'Ready to Progress',
      recommendation: 'Increase weight next session',
      message: 'Excellent performance. Recommended: increase weight next session.',
      tone: 'progress',
      avgReps,
      avgWeight,
      reps,
    };
  }
  return {
    status: 'Weight Good',
    recommendation: 'Current weight is appropriate',
    message: 'Good performance. Current weight is appropriate.',
    tone: 'good',
    avgReps,
    avgWeight,
    reps,
  };
}

function saveExercisePerformance(ex, workoutDate) {
  const feedback = analyzeExercisePerformance(ex);
  if (!feedback) return;
  ex.performance = feedback;
  ex.performanceHistory = Array.isArray(ex.performanceHistory) ? ex.performanceHistory : [];
  const signature = feedback.reps.join(',');
  const entry = {
    date: workoutDate,
    weight: Number(feedback.avgWeight.toFixed(1)),
    reps: feedback.reps,
    averageReps: Number(feedback.avgReps.toFixed(1)),
    status: feedback.status,
    recommendation: feedback.recommendation,
    signature,
  };
  const existing = ex.performanceHistory.find((item) => item.date === workoutDate && item.signature === signature);
  if (existing) Object.assign(existing, entry);
  else ex.performanceHistory.push(entry);
  ex.performanceHistory = ex.performanceHistory.slice(-12);
}

function ensureWeekSchedule() {
  const p = plan();
  const weekKey = startOfWeek().toISOString().slice(0, 10);
  if (p.weekKey === weekKey && p.schedule.length) return;
  const days = (Array.isArray(p.trainingDaysFull) && p.trainingDaysFull.length)
    ? p.trainingDaysFull
    : ['Monday', 'Wednesday', 'Friday'];
  generateSchedule(p.daysPerWeek || days.length, days, weekKey, true);
}

function generateSchedule(daysPerWeek, trainingDaysFull, weekKey, preserveExercises = false) {
  const p = plan();
  const oldByDay = {};
  (p.schedule || []).forEach((s) => { oldByDay[s.day] = s; });

  p.daysPerWeek = daysPerWeek;
  p.trainingDaysFull = trainingDaysFull;
  p.trainingDays = trainingDaysFull.map((d) => d.slice(0, 3));
  p.weekKey = weekKey;
  p.schedule = trainingDaysFull.map((dayFull, i) => {
    const shortDay = dayFull.slice(0, 3);
    const prev = oldByDay[shortDay];
    const exercises = preserveExercises && prev && prev.exercises
      ? prev.exercises.map((ex) => ({ ...ex, log: [], exStatus: 'Not Started' }))
      : [];
    return {
      id: (prev && prev.id) || makeId(),
      day: shortDay,
      dayFull,
      date: (prev && prev.nextWorkoutDate) || dateForDayFull(dayFull),
      type: (prev && prev.type) || WORKOUT_TYPES[i % WORKOUT_TYPES.length],
      exercises,
      status: 'Not Started',
      statusLocked: false,
      durationMin: 0,
      calories: 0,
      taskId: (prev && prev.taskId) || null,
      completionDate: prev && prev.completionDate,
      lastCompletedDate: prev && prev.lastCompletedDate,
      nextWorkoutDate: prev && prev.nextWorkoutDate,
    };
  });
  p.schedule.sort((a, b) => DAY_NAMES_FULL.indexOf(a.dayFull) - DAY_NAMES_FULL.indexOf(b.dayFull));
  syncScheduleToTodo();
  persist();
}

function setTrainingDays(newDaysFull) {
  const p = plan();
  const weekKey = startOfWeek().toISOString().slice(0, 10);
  const hasContent = p.schedule.some((s) => s.exercises.length);
  if (hasContent && !window.confirm("Changing training days rebuilds this week's schedule. Continue?")) return false;
  generateSchedule(newDaysFull.length, newDaysFull, weekKey, false);
  openSessionId = null;
  renderWorkoutStats();
  renderWorkoutRoot();
  return true;
}

function syncScheduleToTodo() {
  const p = plan();
  const validIds = new Set(p.schedule.map((s) => s.id));
  currentData.tasks = currentData.tasks.filter((t) => !t.workoutScheduleId || validIds.has(t.workoutScheduleId));
  p.schedule.forEach((s) => {
    const title = `${s.day} • ${s.type} workout`;
    let task = currentData.tasks.find((t) => t.workoutScheduleId === s.id);
    if (task) {
      task.title = title;
      task.completed = isDateThisWeek(s.completionDate || s.lastCompletedDate);
    } else {
      task = { id: makeId(), title, time: '', priority: 'Medium', completed: false, workoutScheduleId: s.id };
      currentData.tasks.push(task);
    }
    s.taskId = task.id;
  });
}

function renderWorkoutStats() {
  const p = plan();
  const active = p.schedule.filter((s) => !isRestDay(s));
  const total = active.length;
  const done = completedWorkoutsThisWeek();
  const skipped = active.filter((s) => s.status === 'Skipped');
  const calories = done.reduce((sum, s) => sum + Number(s.calories || 0), 0);
  const duration = done.reduce((sum, s) => sum + Number(s.durationMin || 0), 0);
  const donePct = percent(done.length, total || 1);

  let totalEx = 0, doneEx = 0;
  active.forEach((s) => {
    (s.exercises || []).forEach((ex) => {
      totalEx++;
      if (ex.exStatus === 'Done') doneEx++;
    });
  });
  const exPct = percent(doneEx, totalEx || 1);

  const stats = [
    ['Workouts this week', `${done.length}/${total}`, donePct],
    ['Exercise completion', `${exPct}%`, exPct],
    ['Calories burned', `${calories} kcal`, percent(calories, 1500)],
    ['Workout duration', `${duration} min`, percent(duration, 240)],
    ['Skipped workouts', `${skipped.length}`, 0],
  ];

  byId('stats-grid').innerHTML = stats.map(([label, value, width]) => `
    <article class="stat-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value))}</strong>
      <div class="meter"><i style="width:${width}%"></i></div>
    </article>
  `).join('');
}

function renderWorkoutRoot() {
  const root = byId('workout-root');
  const p = plan();
  const selected = Array.isArray(p.trainingDaysFull) ? p.trainingDaysFull : [];

  root.innerHTML = `
    <section class="panel">
      <div class="workout-panel-head">
        <div><p class="eyebrow">Setup</p><h2>Training days</h2></div>
      </div>
      <div class="wo-setup-grid">
        <div>
          <p class="wo-setup-label" id="workout-days-count-label">Days per week</p>
          <div class="workout-day-picker" role="group" aria-labelledby="workout-days-count-label">
            ${[3, 4, 5, 6].map((n) => `
              <button type="button" class="day-btn${selected.length === n ? ' active' : ''}" data-days="${n}" aria-pressed="${selected.length === n}" aria-label="Set training schedule to ${n} days per week" title="Set ${n} training days per week">${n} days</button>
            `).join('')}
          </div>
        </div>
        <div>
          <p class="wo-setup-label" id="workout-training-days-label">Select your days</p>
          <div class="wo-day-toggles" role="group" aria-labelledby="workout-training-days-label">
            ${DAY_NAMES_FULL.map((day) => `
              <button type="button" class="wo-day-toggle${selected.includes(day) ? ' active' : ''}" data-toggle-day="${escapeAttr(day)}" aria-pressed="${selected.includes(day)}" aria-label="${selected.includes(day) ? 'Remove' : 'Add'} ${escapeAttr(day)} as a training day" title="${selected.includes(day) ? 'Remove' : 'Add'} ${escapeAttr(day)}">
                ${day.slice(0, 3)}
              </button>
            `).join('')}
          </div>
        </div>
      </div>
      ${selected.length ? `<p class="muted wo-days-summary">
        <strong>${selected.length} training days:</strong> ${escapeHtml(selected.join(', '))}
      </p>` : '<p class="muted wo-days-summary">Select at least one training day above.</p>'}
    </section>

    ${weeklySummaryHtml()}

    <section class="panel">
      <div class="workout-panel-head">
        <div><p class="eyebrow">This week</p><h2>Weekly workout planner</h2></div>
      </div>
      <div class="workout-table-wrap">
        <table class="workout-planner-table">
          <thead>
            <tr>
              <th>Day</th><th>Date</th><th>Workout Type</th>
              <th>Exercises Count</th><th>Progress</th><th>Duration</th>
              <th>Status</th><th>Action</th>
            </tr>
          </thead>
          <tbody>${p.schedule.map(plannerRowHtml).join('')}</tbody>
        </table>
      </div>
    </section>

    <section class="panel">
      <div class="workout-panel-head">
        <div><p class="eyebrow">Your plan</p><h2>Workout plan sheet</h2></div>
      </div>
      <p class="muted" style="margin-top:-6px">Edit exercises directly — sets, reps range, target weight, rest time, and video URL.</p>
      ${excelPlanTableHtml()}
    </section>

    ${openSessionId ? sessionPanelHtml(openSessionId) : ''}

    <section class="panel">
      <div class="workout-panel-head">
        <div><p class="eyebrow">Insights</p><h2>Analytics</h2></div>
      </div>
      <div class="workout-analytics-grid">${analyticsBlockHtml()}</div>
    </section>

    ${workoutFabHtml()}
  `;
  updateSessionClock();
}

function workoutFabHtml() {
  const label = openSessionId ? 'Add exercise' : 'Start workout';
  const icon = openSessionId ? '+' : '▶';
  return `
    <button type="button" class="workout-fab" data-workout-fab aria-label="${escapeAttr(label)}" title="${escapeAttr(label)}">
      <span class="workout-fab-icon" aria-hidden="true">${icon}</span>
      <span class="workout-fab-label">${escapeHtml(label)}</span>
    </button>
  `;
}

function weeklySummaryHtml() {
  const total = plan().schedule.filter((s) => !isRestDay(s)).length;
  const done = completedWorkoutsThisWeek().length;
  const remaining = Math.max(0, total - done);
  const pct = percent(done, total || 1);
  return `
    <section class="panel workout-weekly-summary">
      <div class="workout-panel-head">
        <div><p class="eyebrow">Weekly summary</p><h2>${done} / ${total} workouts done</h2></div>
        <strong>${pct}% complete</strong>
      </div>
      <div class="wo-progress-bar wo-weekly-progress"><div class="wo-progress-fill" style="width:${pct}%"></div></div>
      <p class="muted">${remaining} ${remaining === 1 ? 'workout' : 'workouts'} remaining</p>
    </section>
  `;
}

function plannerRowHtml(s) {
  const totalEx = s.exercises.length;
  const doneEx = exerciseDoneCount(s);
  const exPct = exerciseProgress(s);
  const status = effectiveWorkoutStatus(s);
  const scls = WO_STATUS_CLASS[status] || 'wo-rest';
  const rest = isRestDay(s);
  const action = rest ? 'REST' : (status === 'Done' ? 'COMPLETE' : (status === 'Not Started' ? 'START' : 'OPEN'));
  const typeId = controlId('workout-type', s.id);
  const openLabel = rest ? `${s.day} is a rest day` : (openSessionId === s.id ? `Close ${s.day} ${s.type} session` : `${action.toLowerCase()} ${s.day} ${s.type} session`);
  return `
    <tr class="workout-planner-row${rest ? ' wo-rest-row' : ''}">
      <td data-label="Day"><strong>${escapeHtml(s.day)}</strong></td>
      <td class="muted" data-label="Date">${escapeHtml(s.date)}</td>
      <td data-label="Workout Type">
        <label class="sr-only" for="${escapeAttr(typeId)}">${escapeHtml(s.day)} workout type</label>
        <select id="${escapeAttr(typeId)}" data-type-for="${escapeAttr(s.id)}" aria-label="${escapeAttr(s.day)} workout type">
          ${WORKOUT_TYPES.map((t) => `<option ${t === s.type ? 'selected' : ''}>${escapeHtml(t)}</option>`).join('')}
        </select>
      </td>
      <td data-label="Exercises">${rest ? '—' : totalEx}</td>
      <td data-label="Progress">
        ${rest ? '<span class="muted">Rest day</span>' : (totalEx ? `
          <div class="wo-progress-bar">
            <div class="wo-progress-fill" style="width:${exPct}%"></div>
          </div>
          <span class="muted" style="font-size:0.72rem">${doneEx}/${totalEx} • ${exPct}%</span>
        ` : '<span class="muted">—</span>')}
      </td>
      <td data-label="Duration">${s.durationMin ? `${s.durationMin} min` : '—'}</td>
      <td data-label="Status"><span class="wo-status-badge ${scls}">${escapeHtml(status)}</span></td>
      <td data-label="Action"><button type="button" class="secondary-btn" data-open-session="${escapeAttr(s.id)}" ${rest ? 'disabled' : (!totalEx && openSessionId !== s.id ? 'disabled title="Add at least one exercise first"' : '')} aria-label="${escapeAttr(openLabel)}" title="${escapeAttr(openLabel)}">${rest ? 'REST' : (openSessionId === s.id ? 'CLOSE' : action)}</button></td>
    </tr>
  `;
}

function excelPlanTableHtml() {
  // One compact table per training day (instead of a single 9-column sheet
  // with rowspan) so the day/type context becomes a heading rather than a
  // cell — this lets the table collapse cleanly into labeled cards on
  // mobile without losing the "which day is this?" context.
  const groups = plan().schedule.map((s, dayIdx) => {
    if (isRestDay(s)) {
      return `
        <div class="wo-excel-day-group">
          ${excelDayHeadHtml(s, dayIdx)}
          ${restDayCardHtml()}
        </div>
      `;
    }

    if (!s.exercises.length) {
      return `
        <div class="wo-excel-day-group">
          ${excelDayHeadHtml(s, dayIdx)}
          <div class="empty-state wo-excel-empty">
            <span class="wo-empty-icon" aria-hidden="true">🏋️</span>
            <p>No exercises added.<br />Create your first exercise.</p>
            <button type="button" class="secondary-btn" data-excel-add="${escapeAttr(s.id)}" aria-label="Add exercise to ${escapeAttr(s.day)} ${escapeAttr(s.type)}" title="Add exercise">+ Add Exercise</button>
          </div>
        </div>
      `;
    }

    const rows = s.exercises.map((ex) => {
      const actual = (ex.log && ex.log[0] && ex.log[0].reps) || '';
      const nameId = controlId('exercise-name', s.id, ex.id);
      const setsId = controlId('exercise-sets', s.id, ex.id);
      const repsMinId = controlId('exercise-reps-min', s.id, ex.id);
      const repsMaxId = controlId('exercise-reps-max', s.id, ex.id);
      const weightId = controlId('exercise-weight', s.id, ex.id);
      const restId = controlId('exercise-rest', s.id, ex.id);
      const videoId = controlId('exercise-video', s.id, ex.id);
      const actualId = controlId('exercise-actual-reps', s.id, ex.id);
      const exLabel = `${s.day} ${ex.name || 'exercise'}`;
      return `
        <tr data-schedule="${escapeAttr(s.id)}" data-exercise="${escapeAttr(ex.id)}">
          <td data-label="Exercise">
            <label class="sr-only" for="${escapeAttr(nameId)}">${escapeHtml(exLabel)} name</label>
            <input id="${escapeAttr(nameId)}" type="text" value="${escapeAttr(ex.name || '')}" placeholder="Enter Exercise Name" aria-label="${escapeAttr(exLabel)} name" data-excel-field="name" data-schedule="${escapeAttr(s.id)}" data-exercise="${escapeAttr(ex.id)}" />
            ${ex.video ? `<a class="workout-exercise-name-link" href="${escapeAttr(ex.video)}" target="_blank" rel="noopener">${escapeHtml(ex.name)} ▶</a>` : ''}
          </td>
          <td data-label="Sets"><label class="sr-only" for="${escapeAttr(setsId)}">${escapeHtml(exLabel)} sets</label><input id="${escapeAttr(setsId)}" type="number" min="1" value="${ex.sets || 3}" placeholder="sets" aria-label="${escapeAttr(exLabel)} sets" data-excel-field="sets" data-schedule="${escapeAttr(s.id)}" data-exercise="${escapeAttr(ex.id)}" /></td>
          <td data-label="Reps (min–max)">
            <div style="display:flex;gap:4px;align-items:center">
              <label class="sr-only" for="${escapeAttr(repsMinId)}">${escapeHtml(exLabel)} minimum reps</label>
              <input id="${escapeAttr(repsMinId)}" type="number" min="1" value="${ex.repsMin || ''}" placeholder="min" style="width:54px" aria-label="${escapeAttr(exLabel)} minimum reps" data-excel-field="repsMin" data-schedule="${escapeAttr(s.id)}" data-exercise="${escapeAttr(ex.id)}" />
              <span class="muted">–</span>
              <label class="sr-only" for="${escapeAttr(repsMaxId)}">${escapeHtml(exLabel)} maximum reps</label>
              <input id="${escapeAttr(repsMaxId)}" type="number" min="1" value="${ex.repsMax || ''}" placeholder="max" style="width:54px" aria-label="${escapeAttr(exLabel)} maximum reps" data-excel-field="repsMax" data-schedule="${escapeAttr(s.id)}" data-exercise="${escapeAttr(ex.id)}" />
            </div>
          </td>
          <td data-label="Weight (kg)"><label class="sr-only" for="${escapeAttr(weightId)}">${escapeHtml(exLabel)} target weight in kilograms</label><input id="${escapeAttr(weightId)}" type="number" step="0.5" min="0" value="${ex.weight || ''}" placeholder="kg" aria-label="${escapeAttr(exLabel)} target weight in kilograms" data-excel-field="weight" data-schedule="${escapeAttr(s.id)}" data-exercise="${escapeAttr(ex.id)}" /></td>
          <td data-label="Rest Time">
            <label class="sr-only" for="${escapeAttr(restId)}">${escapeHtml(exLabel)} rest time</label>
            <select id="${escapeAttr(restId)}" aria-label="${escapeAttr(exLabel)} rest time" data-excel-field="rest" data-schedule="${escapeAttr(s.id)}" data-exercise="${escapeAttr(ex.id)}">
              <option value="" ${ex.rest ? '' : 'selected'} disabled>Select rest time</option>
              ${REST_OPTIONS.map((secs) => `<option value="${secs}" ${Number(ex.rest) === secs ? 'selected' : ''}>${REST_OPTION_LABELS[secs]}</option>`).join('')}
            </select>
          </td>
          <td data-label="Video URL"><label class="sr-only" for="${escapeAttr(videoId)}">${escapeHtml(exLabel)} video URL</label><input id="${escapeAttr(videoId)}" type="url" value="${escapeAttr(ex.video || '')}" placeholder="https://" aria-label="${escapeAttr(exLabel)} video URL" data-excel-field="video" data-schedule="${escapeAttr(s.id)}" data-exercise="${escapeAttr(ex.id)}" /></td>
          <td data-label="Reps done"><label class="sr-only" for="${escapeAttr(actualId)}">${escapeHtml(exLabel)} completed reps</label><input id="${escapeAttr(actualId)}" type="number" min="0" value="${actual}" placeholder="done" aria-label="${escapeAttr(exLabel)} completed reps" data-excel-field="actual" data-schedule="${escapeAttr(s.id)}" data-exercise="${escapeAttr(ex.id)}" /></td>
        </tr>
      `;
    }).join('');

    return `
      <div class="wo-excel-day-group">
        ${excelDayHeadHtml(s, dayIdx)}
        <div class="workout-table-wrap">
          <table class="workout-planner-table workout-excel-table">
            <thead>
              <tr><th>Exercise</th><th>Sets</th><th>Reps (min–max)</th><th>Weight (kg)</th><th>Rest Time</th><th>Video URL</th><th>Reps done</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <button type="button" class="text-btn wo-excel-add-btn" data-excel-add="${escapeAttr(s.id)}" aria-label="Add exercise to ${escapeAttr(s.day)} ${escapeAttr(s.type)}" title="Add exercise to ${escapeAttr(s.day)}">+ Add exercise to ${escapeHtml(s.day)}</button>
      </div>
    `;
  });

  return `<div class="wo-excel-days">${groups.join('')}</div>`;
}

function excelDayHeadHtml(s, dayIdx) {
  return `
    <div class="wo-excel-day-head">
      <span class="wo-excel-day-index">${dayIdx + 1}</span>
      <div>
        <strong>${escapeHtml(s.type)}</strong>
        <span class="muted">${escapeHtml(s.day)}</span>
      </div>
    </div>
  `;
}

function sessionPanelHtml(id) {
  const s = plan().schedule.find((x) => x.id === id);
  if (!s) return '';
  const scls = WO_STATUS_CLASS[s.status] || 'wo-ns';
  const totalEx = s.exercises.length;
  const doneEx = exerciseDoneCount(s);
  const skippedEx = s.exercises.filter((ex) => ex.exStatus === 'Skipped').length;
  const resolvedEx = doneEx + skippedEx;
  const canFinish = totalEx > 0 && resolvedEx >= totalEx;
  const exPct = exerciseProgress(s);
  const currentExercise = s.exercises.find((ex) => !['Done', 'Skipped'].includes(ex.exStatus || 'Not Started'));
  const elapsed = sessionTimers[id] ? Math.max(0, Math.floor((Date.now() - sessionTimers[id]) / 1000)) : 0;

  return `
    <section class="panel" id="workout-session-panel">
      <div class="workout-panel-head">
        <div>
          <p class="eyebrow">${escapeHtml(s.day)} • ${escapeHtml(s.date)}</p>
          <h2>${escapeHtml(s.type)} session</h2>
        </div>
        <div class="workout-session-actions">
          <span class="wo-status-badge ${scls}">${escapeHtml(s.status)}</span>
          <button type="button" class="secondary-btn" data-close-session="1" aria-label="Close ${escapeAttr(s.day)} workout session" title="Close workout session">Close</button>
          ${s.status !== 'Done' ? `
            <button type="button" class="primary-btn" data-finish-session="${escapeAttr(s.id)}" ${canFinish ? '' : 'disabled title="Mark or skip every exercise before completing a workout"'} aria-label="Complete ${escapeAttr(s.day)} workout" title="Complete workout">Complete workout</button>
            <button type="button" class="secondary-btn wo-skip-btn" data-skip-session="${escapeAttr(s.id)}" aria-label="Skip ${escapeAttr(s.day)} workout" title="Skip workout">Skip</button>
          ` : ''}
          ${(doneEx > 0 || s.status === 'Done' || s.status === 'Skipped') ? `<button type="button" class="text-btn" data-reset-workout="${escapeAttr(s.id)}" aria-label="Reset ${escapeAttr(s.day)} workout" title="Reset workout">Reset</button>` : ''}
        </div>
      </div>

      <div class="workout-session-grid">
        <article><span>Session progress</span><strong>${exPct}%</strong><div class="wo-progress-bar"><div class="wo-progress-fill" style="width:${exPct}%"></div></div></article>
        <article><span>Total exercises</span><strong>${doneEx}/${totalEx}</strong></article>
        <article><span>Timer</span><strong data-session-elapsed="${escapeAttr(s.id)}">${formatTime(elapsed)}</strong></article>
        <article><span>Current exercise</span><strong>${currentExercise ? escapeHtml(currentExercise.name) : 'All exercises complete'}</strong></article>
      </div>

      <div class="workout-sections">
        ${s.exercises.length
          ? s.exercises.map((ex) => exerciseCardHtml(s, ex)).join('')
          : '<div class="empty-state">No exercises saved yet. Add exercises in the workout plan sheet before starting.</div>'}
      </div>
    </section>
  `;
}

function exerciseCardHtml(s, ex) {
  const logRows = ex.log || [];
  const exCls = EX_STATUS_CLASS[ex.exStatus || 'Not Started'] || 'ex-ns';
  const doneSets = logRows.filter(setIsDone).length;
  const feedback = analyzeExercisePerformance(ex) || ex.performance || null;
  const collapsed = collapsedExercises.has(ex.id);
  return `
    <article class="workout-exercise-card${collapsed ? ' collapsed' : ''}" data-exercise-id="${escapeAttr(ex.id)}">
      <div class="workout-exercise-head">
        <button type="button" class="wo-exercise-collapse-toggle" data-toggle-exercise="${escapeAttr(ex.id)}" aria-expanded="${collapsed ? 'false' : 'true'}" aria-label="${collapsed ? 'Expand' : 'Collapse'} ${escapeAttr(ex.name)}" title="${collapsed ? 'Expand' : 'Collapse'}">
          <span aria-hidden="true">▾</span>
        </button>
        <div class="wo-exercise-head-main">
          <h3>${ex.video ? `<a class="workout-exercise-name-link" href="${escapeAttr(ex.video)}" target="_blank" rel="noopener">${escapeHtml(ex.name)} ▶</a>` : escapeHtml(ex.name)}</h3>
          <div class="workout-exercise-meta">
            <span>${ex.sets} sets</span>
            <span>${ex.repsMin}–${ex.repsMax} reps</span>
            <span>${ex.weight ? `${ex.weight} kg target` : 'Bodyweight'}</span>
            <span>${restLabel(ex.rest)} rest</span>
            <span>${doneSets}/${ex.sets} sets done</span>
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <span class="ex-status-badge ${exCls}">${escapeHtml(ex.exStatus || 'Not Started')}</span>
          ${ex.video ? `<a class="workout-video-link" href="${escapeAttr(ex.video)}" target="_blank" rel="noopener">▶ Video</a>` : ''}
          ${(ex.exStatus === 'Skipped' || ex.exStatus === 'Done')
            ? `<button type="button" class="text-btn" data-reset-exercise="${escapeAttr(ex.id)}" data-schedule="${escapeAttr(s.id)}" aria-label="Reset ${escapeAttr(ex.name)}" title="Reset exercise">Reset</button>`
            : `<button type="button" class="text-btn" data-skip-exercise="${escapeAttr(ex.id)}" data-schedule="${escapeAttr(s.id)}" aria-label="Skip ${escapeAttr(ex.name)}" title="Skip exercise">Skip</button>`}
          <button type="button" class="small-danger" data-remove-exercise="${escapeAttr(ex.id)}" data-schedule="${escapeAttr(s.id)}" aria-label="Delete ${escapeAttr(ex.name)}" title="Delete ${escapeAttr(ex.name)}">Delete</button>
        </div>
      </div>
      <div class="workout-exercise-body">
      ${ex.notes ? `<p class="muted">${escapeHtml(ex.notes)}</p>` : ''}

      <div class="workout-set-rows">
        ${Array.from({ length: Number(ex.sets) || 1 }, (_, i) => {
          const logged = logRows[i] || {};
          const canComplete = hasSetPerformance(logged);
          const done = setIsDone(logged);
          const summary = logged.weight && logged.reps ? `${escapeHtml(String(logged.weight))}kg × ${escapeHtml(String(logged.reps))}` : '';
          const doneId = controlId('set-done', s.id, ex.id, i);
          const weightId = controlId('set-weight', s.id, ex.id, i);
          const repsId = controlId('set-reps', s.id, ex.id, i);
          return `
            <div class="workout-set-row${done ? ' set-done' : ''}">
              <label class="wo-set-check" for="${escapeAttr(doneId)}">
                <input id="${escapeAttr(doneId)}" type="checkbox" ${done ? 'checked' : ''} ${canComplete ? '' : 'disabled'} aria-label="Mark ${escapeAttr(ex.name)} set ${i + 1} complete" data-set-done="${i}" data-exercise="${escapeAttr(ex.id)}" data-schedule="${escapeAttr(s.id)}" />
                <span>Set ${i + 1}</span>
              </label>
              <label class="sr-only" for="${escapeAttr(weightId)}">${escapeHtml(ex.name)} set ${i + 1} weight in kilograms</label>
              <input id="${escapeAttr(weightId)}" type="number" min="0" step="0.5" placeholder="Weight (kg)" value="${logged.weight ?? ''}" aria-label="${escapeAttr(ex.name)} set ${i + 1} weight in kilograms" data-set-weight="${i}" data-exercise="${escapeAttr(ex.id)}" data-schedule="${escapeAttr(s.id)}" />
              <label class="sr-only" for="${escapeAttr(repsId)}">${escapeHtml(ex.name)} set ${i + 1} reps</label>
              <input id="${escapeAttr(repsId)}" type="number" min="1" placeholder="Reps" value="${logged.reps ?? ''}" aria-label="${escapeAttr(ex.name)} set ${i + 1} reps" data-set-reps="${i}" data-exercise="${escapeAttr(ex.id)}" data-schedule="${escapeAttr(s.id)}" />
              <span class="wo-set-summary">${summary || (canComplete ? 'Ready to complete' : 'Enter weight and reps first')}</span>
            </div>
          `;
        }).join('')}
      </div>

      ${feedback ? performanceFeedbackHtml(feedback) : ''}
      ${performanceHistoryHtml(ex)}

      <div class="workout-rest-timer" data-rest-timer-for="${escapeAttr(ex.id)}">
        <button type="button" class="secondary-btn" data-start-rest="${escapeAttr(ex.id)}" data-rest-seconds="${ex.rest || 90}" ${ex.rest ? '' : 'title="Using default 90s — set a rest time in the plan sheet above"'} aria-label="Start rest timer for ${escapeAttr(ex.name)}">Start rest timer</button>
        <strong data-timer-display="${escapeAttr(ex.id)}">${formatTime(ex.rest || 90)}</strong>
      </div>
      </div>
    </article>
  `;
}

function performanceFeedbackHtml(feedback) {
  return `
    <div class="workout-feedback-card feedback-${escapeAttr(feedback.tone)}">
      <strong>${escapeHtml(feedback.status)}</strong>
      <p>${escapeHtml(feedback.message)}</p>
      <span>Average reps: ${Number(feedback.avgReps).toFixed(1)} • Average weight: ${Number(feedback.avgWeight).toFixed(1)} kg</span>
    </div>
  `;
}

function performanceHistoryHtml(ex) {
  const history = Array.isArray(ex.performanceHistory) ? ex.performanceHistory.slice(-3).reverse() : [];
  if (!history.length) return '';
  return `
    <div class="workout-history">
      <strong>Performance history</strong>
      ${history.map((item) => `
        <div>
          <span>${escapeHtml(item.date)}</span>
          <span>${escapeHtml(String(item.weight))}kg</span>
          <span>${escapeHtml(item.reps.join(', '))} reps</span>
          <b>${escapeHtml(item.recommendation)}</b>
        </div>
      `).join('')}
    </div>
  `;
}

function openWorkoutSession(id) {
  const s = plan().schedule.find((x) => x.id === id);
  if (!s || isRestDay(s) || !s.exercises.length) return;
  clearRestTimer();
  openSessionId = id;
  sessionTimers[id] = sessionTimers[id] || Date.now();
  syncScheduleToTodo();
  refreshWorkout({ art: true });
}

function finishSession(scheduleId) {
  clearRestTimer();
  const s = plan().schedule.find((x) => x.id === scheduleId);
  if (!s) return;
  const startedAt = sessionTimers[scheduleId] || Date.now();
  s.durationMin = Math.max(1, Math.round((Date.now() - startedAt) / 60000));

  let loggedSetCount = 0;
  s.exercises.forEach((ex) => {
    updateExerciseStatusFromSets(ex, s.date);
    const logged = (ex.log || []).filter(setIsDone);
    loggedSetCount += logged.length;
    if (!logged.length) return;
    const top = logged.reduce((a, b) => (Number(b.weight) || 0) > (Number(a.weight) || 0) ? b : a, logged[0]);
    currentData.workouts.push({
      id: makeId(),
      day: s.day,
      date: s.date,
      title: ex.name,
      weight: Number(top.weight) || 0,
      reps: Number(top.reps) || 0,
      sets: logged.length,
      note: '',
    });
  });

  s.calories = loggedSetCount ? loggedSetCount * 8 : s.exercises.length * 40;
  s.status = 'Done';
  s.statusLocked = true;
  s.completionDate = new Date().toISOString().slice(0, 10);
  s.lastCompletedDate = s.completionDate;
  s.lastCompletedWorkoutDate = s.date;
  // Record when this slot should next come around, but don't jump the visible
  // date or clear logged sets yet — this week's row should keep showing what
  // was actually done. The rollover to a fresh Not Started week happens in
  // generateSchedule() once the calendar week actually changes.
  s.nextWorkoutDate = addDays(s.date, 7);

  syncScheduleToTodo();
  openSessionId = null;
  delete sessionTimers[scheduleId];
  refreshWorkout({ art: true });
}

function skipSession(scheduleId) {
  const s = plan().schedule.find((x) => x.id === scheduleId);
  if (!s) return;
  openModal({
    title: 'Skip this workout?',
    body: `<p>${escapeHtml(s.day)}'s ${escapeHtml(s.type)} session will be marked as skipped. You can reset it later if you change your mind.</p>`,
    confirmLabel: 'Skip workout',
    danger: true,
    onConfirm: () => {
      clearRestTimer();
      s.status = 'Skipped';
      s.statusLocked = true;
      syncScheduleToTodo();
      openSessionId = null;
      refreshWorkout();
    },
  });
}

function startRestTimer(exerciseId, seconds) {
  clearRestTimer();
  const duration = Math.max(1, Number(seconds) || 90);
  const wrap = document.querySelector(`[data-rest-timer-for="${exerciseId}"]`);
  if (wrap) {
    wrap.classList.add('running');
    wrap.classList.remove('done');
  }

  restFocusReturn = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  restTimerState = {
    exerciseId,
    total: duration,
    remaining: duration,
    quoteIndex: Math.floor(Math.random() * REST_QUOTES.length),
    interval: null,
    quoteInterval: null,
    status: 'running', // running | paused | finished
    autoContinue: false,
  };
  renderRestOverlay();
  runRestInterval();
  const quoteInterval = setInterval(() => {
    if (!restTimerState || restTimerState.status !== 'running') return;
    restTimerState.quoteIndex = (restTimerState.quoteIndex + 1) % REST_QUOTES.length;
    updateRestOverlay(true);
  }, 4200);
  restTimerState.quoteInterval = quoteInterval;
}

function runRestInterval() {
  if (!restTimerState) return;
  if (restTimerState.interval) clearInterval(restTimerState.interval);
  restTimerState.interval = setInterval(() => {
    if (!restTimerState || restTimerState.status !== 'running') return;
    restTimerState.remaining -= 1;
    updateRestOverlay();
    if (restTimerState.remaining <= 0) finishRestTimer();
  }, 1000);
}

function pauseRestTimer() {
  if (!restTimerState || restTimerState.status !== 'running') return;
  restTimerState.status = 'paused';
  if (restTimerState.interval) clearInterval(restTimerState.interval);
  renderRestOverlay();
}

function resumeRestTimer() {
  if (!restTimerState || restTimerState.status !== 'paused') return;
  restTimerState.status = 'running';
  runRestInterval();
  renderRestOverlay();
}

function adjustRestTimer(deltaSeconds) {
  if (!restTimerState || restTimerState.status === 'finished') return;
  restTimerState.remaining += deltaSeconds;
  restTimerState.total += deltaSeconds;
  updateRestOverlay();
}

function skipRestTimer() {
  if (!restTimerState) return;
  restTimerState.remaining = 0;
  finishRestTimer(true);
}

function requestCancelRestTimer() {
  if (!restTimerState) return;
  const wasRunning = restTimerState.status === 'running';
  if (wasRunning) pauseRestTimer();
  openModal({
    title: 'Stop current rest timer?',
    body: '<p>Your rest countdown will end and you\u2019ll return to the workout.</p>',
    confirmLabel: 'Stop timer',
    cancelLabel: 'Resume',
    danger: true,
    onConfirm: () => { cancelRestTimer(); },
    onCancel: () => { if (restTimerState && wasRunning) resumeRestTimer(); },
  });
}

function cancelRestTimer() {
  clearRestTimer();
}

function clearRestTimer() {
  if (restTimerState && restTimerState.interval) clearInterval(restTimerState.interval);
  if (restTimerState && restTimerState.quoteInterval) clearInterval(restTimerState.quoteInterval);
  const wrap = restTimerState && document.querySelector(`[data-rest-timer-for="${restTimerState.exerciseId}"]`);
  if (wrap) wrap.classList.remove('running');
  const overlay = document.querySelector('[data-rest-overlay]');
  if (overlay) overlay.remove();
  if (restFocusReturn && document.contains(restFocusReturn)) restFocusReturn.focus();
  restFocusReturn = null;
  restTimerState = null;
}

function renderRestOverlay() {
  if (!restTimerState) return;
  const existing = document.querySelector('[data-rest-overlay]');
  if (existing) existing.remove();
  const { status, remaining, autoContinue } = restTimerState;
  const finished = status === 'finished';
  const paused = status === 'paused';

  document.body.insertAdjacentHTML('beforeend', `
    <div class="workout-rest-overlay" data-rest-overlay role="dialog" aria-modal="true" aria-label="Rest timer">
      <div class="workout-rest-backdrop"></div>
      <section class="workout-rest-stage ${finished ? 'rest-finished' : ''}">
        ${finished ? `
          <p class="eyebrow">TIME'S UP!</p>
          <div class="workout-rest-ring rest-ring-done" data-rest-ring style="--rest-progress: 100%">
            <span>✓</span>
          </div>
          <p class="workout-rest-quote">Next set ready.</p>
          <label class="wo-auto-continue">
            <input type="checkbox" data-rest-auto-continue ${autoContinue ? 'checked' : ''} /> Auto-continue next time
          </label>
          <button type="button" class="primary-btn" data-rest-continue autofocus>Continue</button>
        ` : `
          <p class="eyebrow">${paused ? 'REST PAUSED' : 'REST TIME'}</p>
          <div class="workout-rest-ring ${paused ? 'rest-ring-paused' : ''}" data-rest-ring style="--rest-progress: ${percent(Math.max(remaining, 0), restTimerState.total || 1)}%">
            <span data-rest-overlay-time>${formatTime(Math.max(remaining, 0))}</span>
          </div>
          <p class="workout-rest-quote" data-rest-quote>${escapeHtml(REST_QUOTES[restTimerState.quoteIndex])}</p>
          <p class="workout-rest-coach">Control your breathing. Prepare for the next set.</p>
          <div class="workout-rest-controls">
            <button type="button" class="secondary-btn" data-rest-add="10" aria-label="Add 10 seconds">+10 sec</button>
            <button type="button" class="secondary-btn" data-rest-add="30" aria-label="Add 30 seconds">+30 sec</button>
            ${paused
              ? `<button type="button" class="primary-btn" data-rest-resume aria-label="Resume rest timer">Resume</button>`
              : `<button type="button" class="secondary-btn" data-rest-pause aria-label="Pause rest timer">Pause</button>`}
            <button type="button" class="secondary-btn" data-rest-skip aria-label="Skip rest">Skip rest</button>
            <button type="button" class="text-btn" data-rest-cancel aria-label="Cancel rest timer">Cancel timer</button>
          </div>
        `}
      </section>
    </div>
  `);
  const focusTarget = document.querySelector('[data-rest-continue]') || document.querySelector('[data-rest-add]');
  if (focusTarget) focusTarget.focus();
}

function updateRestOverlay(animateQuote = false) {
  if (!restTimerState) return;
  const overlay = document.querySelector('[data-rest-overlay]');
  if (!overlay) return;
  const time = overlay.querySelector('[data-rest-overlay-time]');
  const ring = overlay.querySelector('[data-rest-ring]');
  const quote = overlay.querySelector('[data-rest-quote]');
  const progress = percent(Math.max(restTimerState.remaining, 0), restTimerState.total || 1);
  if (time) time.textContent = formatTime(Math.max(restTimerState.remaining, 0));
  if (ring) ring.style.setProperty('--rest-progress', `${progress}%`);
  if (quote) {
    if (animateQuote) {
      quote.classList.remove('quote-fade');
      void quote.offsetWidth;
      quote.classList.add('quote-fade');
    }
    quote.textContent = REST_QUOTES[restTimerState.quoteIndex];
  }
}

function finishRestTimer(skipped = false) {
  if (!restTimerState) return;
  if (restTimerState.interval) clearInterval(restTimerState.interval);
  if (restTimerState.quoteInterval) clearInterval(restTimerState.quoteInterval);
  restTimerState.status = 'finished';
  const wrap = document.querySelector(`[data-rest-timer-for="${restTimerState.exerciseId}"]`);
  if (wrap) { wrap.classList.remove('running'); wrap.classList.add('done'); }
  if (navigator.vibrate) navigator.vibrate(skipped ? 60 : 180);
  if (restTimerState.autoContinue) {
    window.setTimeout(() => continueAfterRest(), skipped ? 0 : 700);
  } else {
    renderRestOverlay();
  }
}

function continueAfterRest() {
  if (!restTimerState) return;
  const exerciseId = restTimerState.exerciseId;
  restFocusReturn = null;
  const overlay = document.querySelector('[data-rest-overlay]');
  if (overlay) overlay.remove();
  restTimerState = null;
  focusNextSet(exerciseId);
  showRestCompleteMessage();
}

function focusNextSet(exerciseId) {
  window.setTimeout(() => {
    const card = document.querySelector(`[data-exercise-id="${exerciseId}"]`);
    const row = card && Array.from(card.querySelectorAll('.workout-set-row')).find((item) => !item.classList.contains('set-done'));
    const input = row && row.querySelector('[data-set-weight], [data-set-reps]');
    if (input) input.focus();
  }, 50);
}

function showRestCompleteMessage() {
  const panel = byId('workout-session-panel');
  if (!panel) return;
  const existing = panel.querySelector('[data-rest-complete-message]');
  if (existing) existing.remove();
  panel.insertAdjacentHTML('afterbegin', `
    <div class="workout-rest-complete" data-rest-complete-message role="status">
      Rest complete. Time for your next set.
    </div>
  `);
  window.setTimeout(() => {
    const msg = panel.querySelector('[data-rest-complete-message]');
    if (msg) msg.remove();
  }, 4500);
}

function updateSessionClock() {
  if (sessionClockInterval) clearInterval(sessionClockInterval);
  if (!openSessionId) return;
  sessionClockInterval = setInterval(() => {
    const display = document.querySelector(`[data-session-elapsed="${openSessionId}"]`);
    if (!display || !sessionTimers[openSessionId]) return;
    display.textContent = formatTime(Math.max(0, Math.floor((Date.now() - sessionTimers[openSessionId]) / 1000)));
  }, 1000);
}

function analyticsBlockHtml() {
  const p = plan();
  const active = p.schedule.filter((s) => !isRestDay(s));
  const total = active.length || 1;
  const done = completedWorkoutsThisWeek().length;
  const skipped = active.filter((s) => s.status === 'Skipped').length;
  const weeklyPct = percent(done, total);

  let totalEx = 0, doneEx = 0, skippedEx = 0;
  active.forEach((s) => {
    (s.exercises || []).forEach((ex) => {
      totalEx++;
      if (ex.exStatus === 'Done') doneEx++;
      if (ex.exStatus === 'Skipped') skippedEx++;
    });
  });
  const exPct = percent(doneEx, totalEx || 1);

  const history = currentData.workouts.slice(-80);
  const byDate = {};
  history.forEach((w) => { if (w.date) (byDate[w.date] = byDate[w.date] || []).push(w); });
  const last7 = lastNDates(7);
  const consistency = last7.map((d) => (byDate[d] || []).length);

  const counts = {};
  history.forEach((w) => { counts[w.title] = (counts[w.title] || 0) + 1; });
  const topExercise = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
  const series = topExercise ? history.filter((w) => w.title === topExercise).map((w) => Number(w.weight) || 0) : [];

  return `
    <div class="workout-chart-card workout-chart-block">
      <h3>Weekly progress</h3>
      <div class="wo-stat-row">
        <div class="wo-stat-pill wo-done-pill"><strong>${done}/${total}</strong><span>Done</span></div>
        <div class="wo-stat-pill wo-skip-pill"><strong>${Math.max(0, total - done)}</strong><span>Remaining</span></div>
        <div class="wo-stat-pill wo-pct-pill"><strong>${weeklyPct}%</strong><span>Complete</span></div>
      </div>
      <div class="chart-bars" style="height:80px"><span style="height:${weeklyPct}%"></span></div>
    </div>
    <div class="workout-chart-card workout-chart-block">
      <h3>Exercise completion</h3>
      <div class="wo-stat-row">
        <div class="wo-stat-pill wo-done-pill"><strong>${doneEx}</strong><span>Done</span></div>
        <div class="wo-stat-pill wo-skip-pill"><strong>${skippedEx}</strong><span>Skipped</span></div>
        <div class="wo-stat-pill wo-pct-pill"><strong>${exPct}%</strong><span>Rate</span></div>
      </div>
      <div class="chart-bars" style="height:80px"><span style="height:${exPct}%"></span></div>
    </div>
    <div class="workout-chart-card workout-chart-block">
      <h3>Workout consistency</h3>
      <div class="chart-bars">${consistency.map((v) => `<span style="height:${Math.max(6, Math.min(100, v * 40))}%"></span>`).join('')}</div>
      <div class="workout-chart-labels">${last7.map((d) => `<span>${escapeHtml(d.slice(5))}</span>`).join('')}</div>
    </div>
    <div class="workout-chart-card workout-chart-block">
      <h3>Strength progression${topExercise ? ` • ${escapeHtml(topExercise)}` : ''}</h3>
      ${series.length > 1 ? buildLineChartSvg(series) : '<p class="muted">Log a few sessions to see your trend.</p>'}
    </div>
  `;
}

function buildLineChartSvg(series) {
  const w = 320, h = 140, pad = 12;
  const max = Math.max(...series, 1);
  const min = Math.min(...series, 0);
  const range = (max - min) || 1;
  const stepX = (w - pad * 2) / (series.length - 1);
  const pt = (v, i) => {
    const x = pad + i * stepX;
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return [x, y];
  };
  const points = series.map((v, i) => pt(v, i).join(',')).join(' ');
  const dots = series.map((v, i) => {
    const [x, y] = pt(v, i);
    return `<circle cx="${x}" cy="${y}" r="3.5" style="fill:var(--blue)" />`;
  }).join('');
  return `
    <svg class="workout-line-chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <polyline points="${points}" style="fill:none;stroke:var(--blue);stroke-width:3;stroke-linecap:round;stroke-linejoin:round" />
      ${dots}
    </svg>
  `;
}

function bindWorkoutEventsOnce() {
  if (workoutEventsBound) return;
  workoutEventsBound = true;
  const root = byId('workout-root');
  root.addEventListener('click', onWorkoutClick);
  root.addEventListener('change', onWorkoutChange);
  document.addEventListener('click', onWorkoutDocumentClick);
  document.addEventListener('keydown', onWorkoutKeydown, true);
}

function onWorkoutDocumentClick(e) {
  if (!restTimerState) return;

  const addBtn = e.target.closest('[data-rest-add]');
  if (addBtn) { adjustRestTimer(Number(addBtn.dataset.restAdd) || 10); return; }

  if (e.target.closest('[data-rest-pause]'))  { pauseRestTimer(); return; }
  if (e.target.closest('[data-rest-resume]')) { resumeRestTimer(); return; }
  if (e.target.closest('[data-rest-skip]'))   { skipRestTimer(); return; }
  if (e.target.closest('[data-rest-cancel]')) { requestCancelRestTimer(); return; }
  if (e.target.closest('[data-rest-continue]')) { continueAfterRest(); return; }

  const autoToggle = e.target.closest('[data-rest-auto-continue]');
  if (autoToggle) { restTimerState.autoContinue = autoToggle.checked; return; }
}

function onWorkoutKeydown(e) {
  if (!restTimerState) return;
  const overlay = document.querySelector('[data-rest-overlay]');
  if (!overlay) return;
  const modalLayer = byId('modal-layer');
  if (modalLayer && !modalLayer.hidden) return; // let the confirm modal handle its own Escape/Tab

  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    if (restTimerState.status === 'finished') continueAfterRest();
    else requestCancelRestTimer();
    return;
  }

  if (e.key !== 'Tab') return;
  const focusable = Array.from(overlay.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
    .filter((el) => !el.disabled && el.offsetParent !== null);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

function onWorkoutClick(e) {
  const daysBtn = e.target.closest('[data-days]');
  if (daysBtn) {
    const n = Number(daysBtn.dataset.days);
    const p = plan();
    const cur = Array.isArray(p.trainingDaysFull) ? p.trainingDaysFull : [];
    let newDays = cur.slice(0, n);
    if (newDays.length < n) {
      for (const d of DAY_NAMES_FULL) {
        if (newDays.length >= n) break;
        if (!newDays.includes(d)) newDays.push(d);
      }
    }
    setTrainingDays(newDays);
    return;
  }

  const toggleBtn = e.target.closest('[data-toggle-day]');
  if (toggleBtn) {
    const day = toggleBtn.dataset.toggleDay;
    let selected = Array.isArray(plan().trainingDaysFull) ? [...plan().trainingDaysFull] : [];
    if (selected.includes(day)) {
      if (selected.length <= 1) return;
      selected = selected.filter((d) => d !== day);
    } else {
      selected.push(day);
      selected.sort((a, b) => DAY_NAMES_FULL.indexOf(a) - DAY_NAMES_FULL.indexOf(b));
    }
    setTrainingDays(selected);
    return;
  }

  const collapseToggle = e.target.closest('[data-toggle-exercise]');
  if (collapseToggle) {
    const exId = collapseToggle.dataset.toggleExercise;
    if (collapsedExercises.has(exId)) collapsedExercises.delete(exId);
    else collapsedExercises.add(exId);
    const card = collapseToggle.closest('.workout-exercise-card');
    if (card) {
      const nowCollapsed = collapsedExercises.has(exId);
      card.classList.toggle('collapsed', nowCollapsed);
      collapseToggle.setAttribute('aria-expanded', nowCollapsed ? 'false' : 'true');
      collapseToggle.setAttribute('aria-label', `${nowCollapsed ? 'Expand' : 'Collapse'} exercise`);
    }
    return;
  }

  const fabBtn = e.target.closest('[data-workout-fab]');
  if (fabBtn) {
    if (openSessionId) {
      const s = plan().schedule.find((x) => x.id === openSessionId);
      if (s) {
        const newEx = createNewExercise();
        s.exercises.push(newEx);
        refreshWorkout();
        window.requestAnimationFrame(() => {
          const card = document.querySelector(`[data-exercise-id="${newEx.id}"]`);
          if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const nameInput = document.getElementById(controlId('exercise-name', s.id, newEx.id));
          if (nameInput) nameInput.focus();
        });
      }
    } else {
      const p = plan();
      const next = p.schedule.find((x) => !isRestDay(x) && x.status === 'In Progress') || p.schedule.find((x) => !isRestDay(x) && x.status === 'Not Started');
      if (next) openWorkoutSession(next.id);
    }
    return;
  }

  const openBtn = e.target.closest('[data-open-session]');
  if (openBtn) {
    const id = openBtn.dataset.openSession;
    if (openSessionId === id) {
      clearRestTimer();
      openSessionId = null;
      renderWorkoutRoot();
    } else {
      openWorkoutSession(id);
    }
    return;
  }

  const closeBtn = e.target.closest('[data-close-session]');
  if (closeBtn) {
    clearRestTimer();
    openSessionId = null;
    renderWorkoutRoot();
    return;
  }

  const finishBtn = e.target.closest('[data-finish-session]');
  if (finishBtn) {
    finishSession(finishBtn.dataset.finishSession);
    return;
  }

  const skipBtn = e.target.closest('[data-skip-session]');
  if (skipBtn) {
    skipSession(skipBtn.dataset.skipSession);
    return;
  }

  const removeBtn = e.target.closest('[data-remove-exercise]');
  if (removeBtn) {
    const scheduleId = removeBtn.dataset.schedule;
    const exId = removeBtn.dataset.removeExercise;
    const s = plan().schedule.find((x) => x.id === scheduleId);
    const ex = s && s.exercises.find((x) => x.id === exId);
    if (!s || !ex) return;
    openModal({
      title: 'Delete exercise?',
      body: `<p><strong>${escapeHtml(ex.name || 'This exercise')}</strong> will be removed. This action cannot be undone.</p>`,
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: () => {
        const card = document.querySelector(`[data-exercise-id="${exId}"]`);
        const finish = () => {
          s.exercises = s.exercises.filter((x) => x.id !== exId);
          collapsedExercises.delete(exId);
          refreshWorkout();
        };
        if (card) {
          card.classList.add('removing');
          card.addEventListener('transitionend', finish, { once: true });
          window.setTimeout(finish, 400); // fallback if transitionend doesn't fire
        } else {
          finish();
        }
      },
    });
    return;
  }

  const skipExBtn = e.target.closest('[data-skip-exercise]');
  if (skipExBtn) {
    const s = plan().schedule.find((x) => x.id === skipExBtn.dataset.schedule);
    const ex = s && s.exercises.find((x) => x.id === skipExBtn.dataset.skipExercise);
    if (ex) { ex.exStatus = 'Skipped'; refreshWorkout(); }
    return;
  }

  const resetExBtn = e.target.closest('[data-reset-exercise]');
  if (resetExBtn) {
    const s = plan().schedule.find((x) => x.id === resetExBtn.dataset.schedule);
    const ex = s && s.exercises.find((x) => x.id === resetExBtn.dataset.resetExercise);
    if (ex) { ex.log = []; ex.exStatus = 'Not Started'; delete ex.performance; refreshWorkout(); }
    return;
  }

  const resetWorkoutBtn = e.target.closest('[data-reset-workout]');
  if (resetWorkoutBtn) {
    const s = plan().schedule.find((x) => x.id === resetWorkoutBtn.dataset.resetWorkout);
    if (!s) return;
    openModal({
      title: 'Reset this workout?',
      body: `<p>All logged sets and progress for ${escapeHtml(s.day)}'s ${escapeHtml(s.type)} will be cleared. This action cannot be undone.</p>`,
      confirmLabel: 'Reset workout',
      danger: true,
      onConfirm: () => { resetWorkoutSession(s); syncScheduleToTodo(); refreshWorkout({ art: true }); },
    });
    return;
  }

  const restBtn = e.target.closest('[data-start-rest]');
  if (restBtn) {
    startRestTimer(restBtn.dataset.startRest, Number(restBtn.dataset.restSeconds) || 90);
    return;
  }

  const excelAddBtn = e.target.closest('[data-excel-add]');
  if (excelAddBtn) {
    const s = plan().schedule.find((x) => x.id === excelAddBtn.dataset.excelAdd);
    if (s) {
      const newEx = createNewExercise();
      s.exercises.push(newEx);
      refreshWorkout();
      window.requestAnimationFrame(() => {
        const nameInput = document.getElementById(controlId('exercise-name', s.id, newEx.id));
        if (nameInput) nameInput.focus();
      });
    }
    return;
  }
}

function onWorkoutChange(e) {
  const typeSel = e.target.closest('[data-type-for]');
  if (typeSel) {
    const s = plan().schedule.find((x) => x.id === typeSel.dataset.typeFor);
    if (!s) return;
    const nextType = typeSel.value;

    if (nextType === 'Rest Day' && s.exercises.length) {
      openModal({
        title: 'Convert to Rest Day?',
        body: `<p>This day contains ${s.exercises.length} exercise${s.exercises.length === 1 ? '' : 's'}. Changing to Rest Day will remove ${s.exercises.length === 1 ? 'it' : 'them all'}.</p>`,
        confirmLabel: 'Convert to Rest Day',
        danger: true,
        onConfirm: () => { convertToRestDay(s); syncScheduleToTodo(); refreshWorkout({ art: true }); },
      });
      typeSel.value = s.type; // revert the select until/unless confirmed
      return;
    }

    if (nextType === 'Rest Day') {
      convertToRestDay(s);
    } else {
      s.type = nextType;
    }
    syncScheduleToTodo();
    refreshWorkout({ art: true });
    return;
  }

  const excelInput = e.target.closest('[data-excel-field]');
  if (excelInput) {
    const s = plan().schedule.find((x) => x.id === excelInput.dataset.schedule);
    const ex = s && s.exercises.find((x) => x.id === excelInput.dataset.exercise);
    if (!ex) return;
    if (!applyExcelFieldChange(ex, s, excelInput.dataset.excelField, excelInput)) return;
    refreshWorkout();
    return;
  }

  const wInput = e.target.closest('[data-set-weight]');
  const rInput = e.target.closest('[data-set-reps]');
  const doneInput = e.target.closest('[data-set-done]');
  const target = wInput || rInput || doneInput;
  if (!target) return;

  const s = plan().schedule.find((x) => x.id === target.dataset.schedule);
  const ex = s && s.exercises.find((x) => x.id === target.dataset.exercise);
  if (!ex) return;
  ex.log = ex.log || [];
  const idx = Number(wInput ? target.dataset.setWeight : (rInput ? target.dataset.setReps : target.dataset.setDone));
  ex.log[idx] = ex.log[idx] || {};
  if (wInput) {
    if (target.value !== '' && Number(target.value) < 0) {
      window.alert('Weight cannot be negative.');
      target.value = ex.log[idx].weight ?? '';
      return;
    }
    ex.log[idx].weight = target.value;
    if (!hasSetPerformance(ex.log[idx])) ex.log[idx].done = false;
  } else if (rInput) {
    if (target.value !== '' && Number(target.value) <= 0) {
      window.alert('Reps must be greater than 0.');
      target.value = ex.log[idx].reps ?? '';
      return;
    }
    ex.log[idx].reps = target.value;
    if (!hasSetPerformance(ex.log[idx])) ex.log[idx].done = false;
  } else if (target.checked && !hasSetPerformance(ex.log[idx])) {
    target.checked = false;
    ex.log[idx].done = false;
    window.alert('Please enter weight and reps first.');
  } else {
    ex.log[idx].done = target.checked;
  }
  updateExerciseStatusFromSets(ex, s.date);
  refreshWorkout();
}

// Validates + applies a single edit made in the "workout plan sheet" table.
// Returns true when the change was valid and should be persisted/re-rendered,
// or false (after showing a message and reverting the field) when it wasn't.
function applyExcelFieldChange(ex, s, field, inputEl) {
  const raw = inputEl.value;
  switch (field) {
    case 'name': {
      const trimmed = raw.trim();
      if (!trimmed) {
        window.alert('Please enter exercise name.');
        inputEl.value = ex.name || '';
        return false;
      }
      const dup = s.exercises.some((other) => other.id !== ex.id && other.name.trim().toLowerCase() === trimmed.toLowerCase());
      if (dup) {
        window.alert(`${s.day} already has an exercise named "${trimmed}". Use a different name.`);
        inputEl.value = ex.name || '';
        return false;
      }
      ex.name = trimmed;
      return true;
    }
    case 'sets': {
      const n = Number(raw);
      if (raw.trim() === '' || !Number.isFinite(n) || n <= 0) {
        window.alert('Sets must be greater than 0.');
        inputEl.value = ex.sets || 1;
        return false;
      }
      ex.sets = Math.max(1, Math.round(n));
      ex.log = (ex.log || []).slice(0, ex.sets);
      updateExerciseStatusFromSets(ex, s.date);
      return true;
    }
    case 'repsMin':
    case 'repsMax': {
      const n = Number(raw);
      if (raw.trim() === '' || !Number.isFinite(n) || n <= 0) {
        window.alert('Reps must be greater than 0.');
        inputEl.value = ex[field] || '';
        return false;
      }
      ex[field] = Math.round(n);
      return true;
    }
    case 'weight': {
      if (raw.trim() === '') { ex.weight = 0; return true; }
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0) {
        window.alert('Weight cannot be negative.');
        inputEl.value = ex.weight || '';
        return false;
      }
      ex.weight = n;
      return true;
    }
    case 'rest': {
      if (!raw) {
        window.alert('Please select rest time.');
        return false;
      }
      ex.rest = Number(raw);
      return true;
    }
    case 'video': {
      const trimmed = raw.trim();
      if (trimmed && !isLikelyValidUrl(trimmed)) {
        window.alert('That doesn\u2019t look like a valid video link. Use a full http:// or https:// URL.');
        inputEl.value = ex.video || '';
        return false;
      }
      ex.video = trimmed;
      return true;
    }
    case 'actual': {
      if (raw !== '' && Number(raw) < 0) {
        window.alert('Reps cannot be negative.');
        inputEl.value = (ex.log && ex.log[0] && ex.log[0].reps) || '';
        return false;
      }
      ex.log = ex.log || [];
      ex.log[0] = { ...(ex.log[0] || {}), reps: raw, weight: ex.log[0]?.weight || ex.weight };
      updateExerciseStatusFromSets(ex, s.date);
      return true;
    }
    default:
      return true;
  }
}
