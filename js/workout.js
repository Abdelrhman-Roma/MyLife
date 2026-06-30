// MYLIFE — Workout page logic
// Reuses bootShell()/persist()/currentData/escapeHtml/makeId/percent from shared.js
// so the Workout page shares the exact same data layer, sidebar, topbar, and
// design system as every other page.

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_PATTERNS = {
  3: ['Mon', 'Wed', 'Fri'],
  4: ['Mon', 'Tue', 'Thu', 'Fri'],
  5: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  6: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};
const WORKOUT_TYPES = ['Push Day', 'Pull Day', 'Leg Day', 'Upper Body', 'Lower Body', 'Full Body', 'Cardio', 'Rest Day'];

let openSessionId   = null;
let sessionTimers   = {};   // scheduleId -> Date.now() when session opened
let restTimerState  = null; // { exerciseId, interval }
let workoutEventsBound = false;

// ─── Boot ───────────────────────────────────────────────────────────────────
function initWorkoutPage() {
  ensureWeekSchedule();
  renderArt('workout');
  renderWorkoutStats();
  renderWorkoutRoot();
  bindWorkoutEventsOnce();

  const dayId = new URLSearchParams(window.location.search).get('day');
  if (dayId && plan().schedule.some((s) => s.id === dayId)) {
    openSessionId = dayId;
    sessionTimers[dayId] = sessionTimers[dayId] || Date.now();
    renderWorkoutRoot();
  }
}

function plan() { return currentData.workoutPlan; }

// ─── Date helpers ───────────────────────────────────────────────────────────
function startOfWeek(d = new Date()) {
  const date = new Date(d);
  const dow  = date.getDay();
  date.setDate(date.getDate() + ((dow === 0 ? -6 : 1) - dow));
  date.setHours(0, 0, 0, 0);
  return date;
}

function dateForDay(dayName) {
  const monday = startOfWeek();
  const idx    = DAY_NAMES.indexOf(dayName);
  const offset = idx === 0 ? 6 : idx - 1;
  const d = new Date(monday);
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
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

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ─── Schedule generation (Training Days Setup → Weekly Planner) ────────────
function ensureWeekSchedule() {
  const p = plan();
  const weekKey = startOfWeek().toISOString().slice(0, 10);
  if (p.weekKey === weekKey && p.schedule.length) return;
  generateSchedule(p.daysPerWeek, p.trainingDays, weekKey);
}

function generateSchedule(daysPerWeek, trainingDays, weekKey) {
  const p = plan();
  const days = (Array.isArray(trainingDays) && trainingDays.length === daysPerWeek)
    ? trainingDays
    : (DAY_PATTERNS[daysPerWeek] || DAY_PATTERNS[4]);
  const oldByDay = {};
  (p.schedule || []).forEach((s) => { oldByDay[s.day] = s; });

  p.daysPerWeek   = daysPerWeek;
  p.trainingDays  = days;
  p.weekKey       = weekKey;
  p.schedule      = days.map((day, i) => {
    const prev = oldByDay[day];
    return {
      id:          (prev && prev.id) || makeId(),
      day,
      date:        dateForDay(day),
      type:        (prev && prev.type) || WORKOUT_TYPES[i % WORKOUT_TYPES.length],
      exercises:   prev && prev.exercises ? prev.exercises.map((ex) => ({ ...ex, log: [] })) : [],
      status:      'Pending',
      durationMin: 0,
      calories:    0,
      taskId:      (prev && prev.taskId) || null,
    };
  });
  syncScheduleToTodo();
  persist();
}

function regenerateDays(n) {
  if (n === plan().daysPerWeek) return;
  const hasContent = plan().schedule.some((s) => s.exercises.length);
  if (hasContent && !window.confirm("Changing training days rebuilds this week's schedule. Continue?")) return;
  generateSchedule(n, DAY_PATTERNS[n], plan().weekKey);
  openSessionId = null;
  renderWorkoutStats();
  renderWorkoutRoot();
}

// ─── Todo integration ───────────────────────────────────────────────────────
function syncScheduleToTodo() {
  const p = plan();
  const validIds = new Set(p.schedule.map((s) => s.id));
  currentData.tasks = currentData.tasks.filter((t) => !t.workoutScheduleId || validIds.has(t.workoutScheduleId));
  p.schedule.forEach((s) => {
    const title = `${s.day} · ${s.type} workout`;
    let task = currentData.tasks.find((t) => t.workoutScheduleId === s.id);
    if (task) {
      task.title     = title;
      task.completed = s.status === 'Completed';
    } else {
      task = { id: makeId(), title, time: '', priority: 'Medium', completed: s.status === 'Completed', workoutScheduleId: s.id };
      currentData.tasks.push(task);
    }
    s.taskId = task.id;
  });
}

// ─── Overview stat cards (same markup as the Dashboard stats strip) ───────
function renderWorkoutStats() {
  const p         = plan();
  const total     = p.schedule.length;
  const completed = p.schedule.filter((s) => s.status === 'Completed');
  const calories  = completed.reduce((sum, s) => sum + Number(s.calories || 0), 0);
  const duration  = completed.reduce((sum, s) => sum + Number(s.durationMin || 0), 0);
  const pct       = percent(completed.length, total || 1);

  const stats = [
    ['Workouts this week', `${completed.length}/${total}`, pct],
    ['Calories burned',    `${calories} kcal`,             percent(calories, 1500)],
    ['Workout duration',   `${duration} min`,               percent(duration, 240)],
    ['Active days',        `${completed.length}/${total}`,  pct],
    ['Weekly progress',    `${pct}%`,                       pct],
  ];
  byId('stats-grid').innerHTML = stats.map(([label, value, width]) => `
    <article class="stat-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value))}</strong>
      <div class="meter"><i style="width:${width}%"></i></div>
    </article>
  `).join('');
}

// ─── Root content ───────────────────────────────────────────────────────────
function renderWorkoutRoot() {
  const root = byId('workout-root');
  root.innerHTML = `
    <section class="panel">
      <div class="workout-panel-head">
        <div><p class="eyebrow">Setup</p><h2>Training days</h2></div>
      </div>
      <div class="workout-day-picker">
        ${[3, 4, 5, 6].map((n) => `<button type="button" class="day-btn${plan().daysPerWeek === n ? ' active' : ''}" data-days="${n}">${n} days/week</button>`).join('')}
      </div>
      <p class="muted" style="margin-top:10px">Training days: ${escapeHtml(plan().trainingDays.join(', '))}. Changing this rebuilds this week's schedule.</p>
    </section>

    <section class="panel">
      <div class="workout-panel-head">
        <div><p class="eyebrow">This week</p><h2>Weekly workout planner</h2></div>
      </div>
      <div class="workout-table-wrap">
        <table class="workout-planner-table">
          <thead>
            <tr><th>Day</th><th>Date</th><th>Workout type</th><th>Exercises</th><th>Duration</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>${plan().schedule.map(plannerRowHtml).join('')}</tbody>
        </table>
      </div>
    </section>

    <section class="panel">
      <div class="workout-panel-head">
        <div><p class="eyebrow">Your plan</p><h2>Workout plan sheet</h2></div>
      </div>
      <p class="muted" style="margin-top:-6px">Edit any cell directly, like a spreadsheet — weight, target reps, and the reps you actually did.</p>
      ${excelPlanTableHtml()}
    </section>

    ${openSessionId ? sessionPanelHtml(openSessionId) : ''}

    <section class="panel">
      <div class="workout-panel-head">
        <div><p class="eyebrow">Insights</p><h2>Analytics</h2></div>
      </div>
      <div class="workout-analytics-grid">${analyticsBlockHtml()}</div>
    </section>
  `;
}

function plannerRowHtml(s) {
  return `
    <tr>
      <td><strong>${escapeHtml(s.day)}</strong></td>
      <td>${escapeHtml(s.date)}</td>
      <td>
        <select data-type-for="${escapeAttr(s.id)}">
          ${WORKOUT_TYPES.map((t) => `<option ${t === s.type ? 'selected' : ''}>${escapeHtml(t)}</option>`).join('')}
        </select>
      </td>
      <td>${s.exercises.length}</td>
      <td>${s.durationMin ? `${s.durationMin} min` : '—'}</td>
      <td><span class="workout-status-pill ${s.status === 'Completed' ? 'completed' : 'pending'}">${escapeHtml(s.status)}</span></td>
      <td><button type="button" class="secondary-btn" data-open-session="${escapeAttr(s.id)}">${openSessionId === s.id ? 'Close' : 'Open'}</button></td>
    </tr>
  `;
}

// ─── Excel-style plan sheet (Day # | Day | Exercise | Weight | Target reps | Reps done) ─
function excelPlanTableHtml() {
  const rows = [];
  plan().schedule.forEach((s, dayIdx) => {
    if (!s.exercises.length) {
      rows.push(`
        <tr>
          <td>${dayIdx + 1}</td>
          <td><strong>${escapeHtml(s.type)}</strong><br><span class="muted">${escapeHtml(s.day)}</span></td>
          <td colspan="4" class="muted">
            No exercises yet —
            <button type="button" class="text-btn workout-start-link" data-excel-add="${escapeAttr(s.id)}">+ Add exercise</button>
          </td>
        </tr>
      `);
      return;
    }
    s.exercises.forEach((ex, exIdx) => {
      const actual = (ex.log && ex.log[0] && ex.log[0].reps) || '';
      rows.push(`
        <tr data-schedule="${escapeAttr(s.id)}" data-exercise="${escapeAttr(ex.id)}">
          ${exIdx === 0 ? `
            <td rowspan="${s.exercises.length}">${dayIdx + 1}</td>
            <td rowspan="${s.exercises.length}"><strong>${escapeHtml(s.type)}</strong><br><span class="muted">${escapeHtml(s.day)}</span></td>
          ` : ''}
          <td><input type="text" value="${escapeAttr(ex.name)}" data-excel-field="name" data-schedule="${escapeAttr(s.id)}" data-exercise="${escapeAttr(ex.id)}" /></td>
          <td><input type="number" step="0.5" min="0" value="${ex.weight || ''}" placeholder="kg" data-excel-field="weight" data-schedule="${escapeAttr(s.id)}" data-exercise="${escapeAttr(ex.id)}" /></td>
          <td><input type="number" min="1" value="${ex.repsMax || ''}" placeholder="target" data-excel-field="repsMax" data-schedule="${escapeAttr(s.id)}" data-exercise="${escapeAttr(ex.id)}" /></td>
          <td><input type="number" min="0" value="${actual}" placeholder="done" data-excel-field="actual" data-schedule="${escapeAttr(s.id)}" data-exercise="${escapeAttr(ex.id)}" /></td>
        </tr>
      `);
    });
    rows.push(`
      <tr class="workout-excel-add-row">
        <td colspan="6"><button type="button" class="text-btn workout-start-link" data-excel-add="${escapeAttr(s.id)}">+ Add exercise to ${escapeHtml(s.day)}</button></td>
      </tr>
    `);
  });
  return `
    <div class="workout-table-wrap">
      <table class="workout-planner-table workout-excel-table">
        <thead>
          <tr><th>#</th><th>Day</th><th>Exercise</th><th>Weight (kg)</th><th>Target reps</th><th>Reps done</th></tr>
        </thead>
        <tbody>${rows.join('')}</tbody>
      </table>
    </div>
  `;
}

// ─── Session panel (exercises, sets/reps tracking, rest timer) ────────────
function sessionPanelHtml(id) {
  const s = plan().schedule.find((x) => x.id === id);
  if (!s) return '';
  return `
    <section class="panel" id="workout-session-panel">
      <div class="workout-panel-head">
        <div><p class="eyebrow">${escapeHtml(s.day)} · ${escapeHtml(s.date)}</p><h2>${escapeHtml(s.type)} session</h2></div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button type="button" class="secondary-btn" data-close-session="1">Close</button>
          ${s.status !== 'Completed' ? `<button type="button" class="primary-btn" data-finish-session="${escapeAttr(s.id)}">Finish workout</button>` : ''}
        </div>
      </div>

      <form data-add-exercise-for="${escapeAttr(s.id)}" class="form-stack" novalidate style="margin-bottom:18px">
        <label>Exercise name<input name="name" type="text" required /></label>
        <label>Sets<input name="sets" type="number" min="1" value="3" required /></label>
        <label>Reps min<input name="repsMin" type="number" min="1" value="8" required /></label>
        <label>Reps max<input name="repsMax" type="number" min="1" value="12" required /></label>
        <label>Target weight (kg)<input name="weight" type="number" min="0" step="0.5" /></label>
        <label>Rest (sec)<input name="rest" type="number" min="0" value="90" /></label>
        <label class="full-field">Video link (YouTube/URL)<input name="video" type="url" placeholder="https://" /></label>
        <label class="full-field">Notes<textarea name="notes"></textarea></label>
        <button class="primary-btn" type="submit">Add exercise</button>
      </form>

      <div class="workout-sections">
        ${s.exercises.length ? s.exercises.map((ex) => exerciseCardHtml(s, ex)).join('') : '<div class="empty-state">No exercises yet — add one above.</div>'}
      </div>
    </section>
  `;
}

function exerciseCardHtml(s, ex) {
  const logRows = ex.log || [];
  return `
    <article class="workout-exercise-card" data-exercise-id="${escapeAttr(ex.id)}">
      <div class="workout-exercise-head">
        <div>
          <h3>${escapeHtml(ex.name)}</h3>
          <div class="workout-exercise-meta">
            <span>${ex.sets} sets</span>
            <span>${ex.repsMin}–${ex.repsMax} reps</span>
            <span>${ex.weight ? `${ex.weight} kg target` : 'Bodyweight'}</span>
            <span>${ex.rest || 90}s rest</span>
          </div>
        </div>
        <div style="display:flex;gap:10px;align-items:center">
          ${ex.video ? `<a class="workout-video-link" href="${escapeAttr(ex.video)}" target="_blank" rel="noopener">▶ Video</a>` : ''}
          <button type="button" class="small-danger" data-remove-exercise="${escapeAttr(ex.id)}" data-schedule="${escapeAttr(s.id)}">Remove</button>
        </div>
      </div>
      ${ex.notes ? `<p class="muted">${escapeHtml(ex.notes)}</p>` : ''}

      <div class="workout-set-rows">
        ${Array.from({ length: ex.sets }, (_, i) => {
          const logged = logRows[i] || {};
          const summary = logged.weight && logged.reps ? `${escapeHtml(String(logged.weight))}kg × ${escapeHtml(String(logged.reps))}` : '';
          return `
            <div class="workout-set-row">
              <span>Set ${i + 1}</span>
              <input type="number" placeholder="kg"   value="${logged.weight ?? ''}" data-set-weight="${i}" data-exercise="${escapeAttr(ex.id)}" data-schedule="${escapeAttr(s.id)}" />
              <input type="number" placeholder="reps" value="${logged.reps ?? ''}"   data-set-reps="${i}"   data-exercise="${escapeAttr(ex.id)}" data-schedule="${escapeAttr(s.id)}" />
              <span>${summary}</span>
            </div>
          `;
        }).join('')}
      </div>

      <div class="workout-rest-timer" data-rest-timer-for="${escapeAttr(ex.id)}">
        <button type="button" class="secondary-btn" data-start-rest="${escapeAttr(ex.id)}" data-rest-seconds="${ex.rest || 90}">Start rest timer</button>
        <strong data-timer-display="${escapeAttr(ex.id)}">${formatTime(ex.rest || 90)}</strong>
      </div>
    </article>
  `;
}

function finishSession(scheduleId) {
  const s = plan().schedule.find((x) => x.id === scheduleId);
  if (!s) return;
  const startedAt = sessionTimers[scheduleId] || Date.now();
  s.durationMin = Math.max(1, Math.round((Date.now() - startedAt) / 60000));

  let loggedSetCount = 0;
  s.exercises.forEach((ex) => {
    const logged = (ex.log || []).filter((l) => l && (l.weight || l.reps));
    loggedSetCount += logged.length;
    if (!logged.length) return;
    const top = logged.reduce((a, b) => (Number(b.weight) || 0) > (Number(a.weight) || 0) ? b : a, logged[0]);
    currentData.workouts.push({
      id: makeId(), day: s.day, date: s.date, title: ex.name,
      weight: Number(top.weight) || 0, reps: Number(top.reps) || 0, sets: logged.length, note: '',
    });
  });
  s.calories = loggedSetCount ? loggedSetCount * 8 : s.exercises.length * 40;
  s.status   = 'Completed';

  syncScheduleToTodo();
  persist();
  openSessionId = null;
  delete sessionTimers[scheduleId];
  renderWorkoutStats();
  renderWorkoutRoot();
}

// ─── Rest timer ─────────────────────────────────────────────────────────────
function startRestTimer(exerciseId, seconds) {
  clearRestTimer();
  let remaining = seconds;
  const display = document.querySelector(`[data-timer-display="${exerciseId}"]`);
  const wrap    = document.querySelector(`[data-rest-timer-for="${exerciseId}"]`);
  if (wrap) { wrap.classList.add('running'); wrap.classList.remove('done'); }
  if (display) display.textContent = formatTime(remaining);

  const interval = setInterval(() => {
    remaining -= 1;
    if (display) display.textContent = formatTime(Math.max(remaining, 0));
    if (remaining <= 0) {
      clearInterval(interval);
      restTimerState = null;
      if (wrap) { wrap.classList.remove('running'); wrap.classList.add('done'); }
      window.alert('Rest time is over — start your next set!');
    }
  }, 1000);
  restTimerState = { exerciseId, interval };
}

function clearRestTimer() {
  if (restTimerState && restTimerState.interval) clearInterval(restTimerState.interval);
  restTimerState = null;
}

// ─── Analytics ──────────────────────────────────────────────────────────────
function analyticsBlockHtml() {
  const p         = plan();
  const total     = p.schedule.length || 1;
  const completed = p.schedule.filter((s) => s.status === 'Completed').length;
  const weeklyPct = percent(completed, total);

  const history = currentData.workouts.slice(-80);
  const byDate  = {};
  history.forEach((w) => { if (w.date) (byDate[w.date] = byDate[w.date] || []).push(w); });
  const last7 = lastNDates(7);
  const consistency = last7.map((d) => (byDate[d] || []).length);
  const calories    = last7.map((d) => (byDate[d] || []).length * 60);

  const counts = {};
  history.forEach((w) => { counts[w.title] = (counts[w.title] || 0) + 1; });
  const topExercise = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
  const series = topExercise ? history.filter((w) => w.title === topExercise).map((w) => Number(w.weight) || 0) : [];

  return `
    <div class="workout-chart-card workout-chart-block">
      <h3>Weekly progress</h3>
      <div class="chart-bars" style="height:90px"><span style="height:${weeklyPct}%"></span></div>
      <p class="muted">${completed}/${total} scheduled workouts completed (${weeklyPct}%).</p>
    </div>
    <div class="workout-chart-card workout-chart-block">
      <h3>Workout consistency</h3>
      <div class="chart-bars">${consistency.map((v) => `<span style="height:${Math.max(6, Math.min(100, v * 40))}%"></span>`).join('')}</div>
      <div class="workout-chart-labels">${last7.map((d) => `<span>${escapeHtml(d.slice(5))}</span>`).join('')}</div>
    </div>
    <div class="workout-chart-card workout-chart-block">
      <h3>Strength progression${topExercise ? ` · ${escapeHtml(topExercise)}` : ''}</h3>
      ${series.length > 1 ? buildLineChartSvg(series) : '<p class="muted">Log a few sessions to see your trend.</p>'}
    </div>
    <div class="workout-chart-card workout-chart-block">
      <h3>Calories burned</h3>
      <div class="chart-bars">${calories.map((v) => `<span style="height:${Math.max(6, Math.min(100, percent(v, 300)))}%"></span>`).join('')}</div>
      <div class="workout-chart-labels">${last7.map((d) => `<span>${escapeHtml(d.slice(5))}</span>`).join('')}</div>
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
  const dots = series.map((v, i) => { const [x, y] = pt(v, i); return `<circle cx="${x}" cy="${y}" r="3.5" style="fill:var(--blue)" />`; }).join('');
  return `
    <svg class="workout-line-chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <polyline points="${points}" style="fill:none;stroke:var(--blue);stroke-width:3;stroke-linecap:round;stroke-linejoin:round" />
      ${dots}
    </svg>
  `;
}

// ─── Event delegation (bound once; #workout-root persists across re-renders) ─
function bindWorkoutEventsOnce() {
  if (workoutEventsBound) return;
  workoutEventsBound = true;
  const root = byId('workout-root');
  root.addEventListener('click', onWorkoutClick);
  root.addEventListener('change', onWorkoutChange);
  root.addEventListener('submit', onWorkoutSubmit);
}

function onWorkoutClick(e) {
  const daysBtn = e.target.closest('[data-days]');
  if (daysBtn) return regenerateDays(Number(daysBtn.dataset.days));

  const openBtn = e.target.closest('[data-open-session]');
  if (openBtn) {
    const id = openBtn.dataset.openSession;
    openSessionId = openSessionId === id ? null : id;
    if (openSessionId) sessionTimers[id] = sessionTimers[id] || Date.now();
    return renderWorkoutRoot();
  }

  const closeBtn = e.target.closest('[data-close-session]');
  if (closeBtn) { openSessionId = null; return renderWorkoutRoot(); }

  const finishBtn = e.target.closest('[data-finish-session]');
  if (finishBtn) return finishSession(finishBtn.dataset.finishSession);

  const removeBtn = e.target.closest('[data-remove-exercise]');
  if (removeBtn) {
    const s = plan().schedule.find((x) => x.id === removeBtn.dataset.schedule);
    if (s) {
      s.exercises = s.exercises.filter((x) => x.id !== removeBtn.dataset.removeExercise);
      persist();
      renderWorkoutRoot();
    }
    return;
  }

  const restBtn = e.target.closest('[data-start-rest]');
  if (restBtn) return startRestTimer(restBtn.dataset.startRest, Number(restBtn.dataset.restSeconds) || 90);

  const excelAddBtn = e.target.closest('[data-excel-add]');
  if (excelAddBtn) {
    const s = plan().schedule.find((x) => x.id === excelAddBtn.dataset.excelAdd);
    if (s) {
      s.exercises.push({ id: makeId(), name: 'New exercise', sets: 1, repsMin: 8, repsMax: 8, weight: 0, rest: 90, video: '', notes: '', log: [] });
      persist();
      renderWorkoutStats();
      renderWorkoutRoot();
    }
    return;
  }
}

function onWorkoutChange(e) {
  const typeSel = e.target.closest('[data-type-for]');
  if (typeSel) {
    const s = plan().schedule.find((x) => x.id === typeSel.dataset.typeFor);
    if (s) { s.type = typeSel.value; syncScheduleToTodo(); persist(); }
    return;
  }

  const excelInput = e.target.closest('[data-excel-field]');
  if (excelInput) {
    const s  = plan().schedule.find((x) => x.id === excelInput.dataset.schedule);
    const ex = s && s.exercises.find((x) => x.id === excelInput.dataset.exercise);
    if (!ex) return;
    const field = excelInput.dataset.excelField;
    if (field === 'name')    ex.name = excelInput.value.trim() || 'Exercise';
    if (field === 'weight')  ex.weight = Number(excelInput.value) || 0;
    if (field === 'repsMax') { ex.repsMax = Number(excelInput.value) || 0; ex.repsMin = ex.repsMax; }
    if (field === 'actual') {
      ex.log = ex.log || [];
      ex.log[0] = { ...(ex.log[0] || {}), reps: excelInput.value, weight: ex.log[0] && ex.log[0].weight ? ex.log[0].weight : ex.weight };
    }
    persist();
    return;
  }

  const wInput = e.target.closest('[data-set-weight]');
  const rInput = e.target.closest('[data-set-reps]');
  const target = wInput || rInput;
  if (!target) return;

  const s  = plan().schedule.find((x) => x.id === target.dataset.schedule);
  const ex = s && s.exercises.find((x) => x.id === target.dataset.exercise);
  if (!ex) return;
  ex.log = ex.log || [];
  const idx = Number(wInput ? target.dataset.setWeight : target.dataset.setReps);
  ex.log[idx] = ex.log[idx] || {};
  if (wInput) ex.log[idx].weight = target.value; else ex.log[idx].reps = target.value;
  persist();

  const row = target.closest('.workout-set-row');
  const summary = row && row.querySelector('span:last-child');
  if (summary) summary.textContent = (ex.log[idx].weight && ex.log[idx].reps) ? `${ex.log[idx].weight}kg × ${ex.log[idx].reps}` : '';
}

function onWorkoutSubmit(e) {
  const form = e.target.closest('[data-add-exercise-for]');
  if (!form) return;
  e.preventDefault();
  const s = plan().schedule.find((x) => x.id === form.dataset.addExerciseFor);
  if (!s) return;
  const data = new FormData(form);
  s.exercises.push({
    id:      makeId(),
    name:    String(data.get('name') || '').trim() || 'Exercise',
    sets:    Math.max(1, Number(data.get('sets')) || 3),
    repsMin: Number(data.get('repsMin')) || 8,
    repsMax: Number(data.get('repsMax')) || 12,
    weight:  Number(data.get('weight')) || 0,
    rest:    Number(data.get('rest')) || 90,
    video:   String(data.get('video') || '').trim(),
    notes:   String(data.get('notes') || '').trim(),
    log:     [],
  });
  persist();
  renderWorkoutStats();
  renderWorkoutRoot();
}
