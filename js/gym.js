(function () {
  'use strict';

  const STORAGE_KEY = 'mylife.gym.page';
  const USER_KEY = 'mylife.session';
  const USERS_KEY = 'mylife.users';
  const THEME_KEY = 'mylife.theme';
  const PALETTE_KEY = 'mylife.palette';
  const EMPTY_WEIGHT = '-';

  const defaults = {
    activePlanId: 'plan-a',
    plans: [
      {
        id: 'plan-a',
        name: 'Full Body (A)',
        group: 'Full Body',
        active: true,
        last: 'Today',
        exercises: [
          { id: 'a1', name: 'Incline DB Press', sets: 2, reps: '12', weight: '30kg', notes: '' },
          { id: 'a2', name: 'Lat Pulldown', sets: 2, reps: '12', weight: '40kg', notes: '' },
          { id: 'a3', name: 'Seated Row', sets: 2, reps: '12', weight: '35kg', notes: '' },
          { id: 'a4', name: 'Shoulder Press', sets: 2, reps: '12', weight: '25kg', notes: '' },
          { id: 'a5', name: 'Leg Press', sets: 2, reps: '12', weight: '80kg', notes: '' },
          { id: 'a6', name: 'Bicep Curl', sets: 2, reps: '12', weight: '15kg', notes: '' },
        ],
      },
      {
        id: 'plan-b',
        name: 'Full Body (B)',
        group: 'Full Body',
        active: true,
        last: '2 days ago',
        exercises: [
          { id: 'b1', name: 'Bench Press', sets: 2, reps: '12', weight: '60kg', notes: '' },
          { id: 'b2', name: 'Pull Up', sets: 2, reps: '12', weight: EMPTY_WEIGHT, notes: '' },
          { id: 'b3', name: 'T-Bar Row', sets: 2, reps: '12', weight: '45kg', notes: '' },
          { id: 'b4', name: 'Overhead Press', sets: 2, reps: '12', weight: '25kg', notes: '' },
          { id: 'b5', name: 'Squat', sets: 2, reps: '12', weight: '90kg', notes: '' },
          { id: 'b6', name: 'Tricep Pushdown', sets: 2, reps: '12', weight: '20kg', notes: '' },
          { id: 'b7', name: 'Calf Raise', sets: 2, reps: '15', weight: '40kg', notes: '' },
        ],
      },
      {
        id: 'plan-c',
        name: 'Rest Day (C)',
        group: 'Rest Day',
        active: true,
        last: '3 days ago',
        exercises: [
          { id: 'c1', name: 'Plank', sets: 3, reps: '60s', weight: EMPTY_WEIGHT, notes: '' },
          { id: 'c2', name: 'Crunches', sets: 3, reps: '20', weight: EMPTY_WEIGHT, notes: '' },
          { id: 'c3', name: 'Mobility Flow', sets: 2, reps: '12', weight: EMPTY_WEIGHT, notes: 'Easy pace' },
          { id: 'c4', name: 'Walking', sets: 1, reps: '20', weight: EMPTY_WEIGHT, notes: 'Minutes' },
          { id: 'c5', name: 'Stretching', sets: 2, reps: '30s', weight: EMPTY_WEIGHT, notes: '' },
          { id: 'c6', name: 'Breathing', sets: 2, reps: '60s', weight: EMPTY_WEIGHT, notes: '' },
        ],
      },
    ],
    recent: [
      { planId: 'plan-a', workout: 'Full Body (A)', exercises: 6, time: '1h 15m', calories: '560 kcal', date: '15 May 2025' },
      { planId: 'plan-b', workout: 'Full Body (B)', exercises: 7, time: '1h 05m', calories: '480 kcal', date: '13 May 2025' },
      { planId: 'plan-c', workout: 'Rest Day (C)', exercises: 6, time: '55m', calories: '320 kcal', date: '11 May 2025' },
    ],
    workout: {
      started: false,
      startedAt: '',
      duration: '1h 12m',
      calories: '540 kcal',
      repsDone: {},
      weightOverrides: {},
    },
  };

  let state = loadState();

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    applyTheme(localStorage.getItem(THEME_KEY) || 'light', localStorage.getItem(PALETTE_KEY) || 'palette-1');
    if (!hydrateUser()) return;
    bindEvents();
    renderAll();
    switchView('dashboard');
  }

  function bindEvents() {
    on('#gym-menu-btn', 'click', () => document.body.classList.toggle('gym-sidebar-open'));
    on('#gym-theme-toggle', 'click', toggleTheme);
    on('#body-stats-btn', 'click', showBodyStats);
    on('#new-workout-btn', 'click', () => startWorkout());
    on('#view-all-workouts', 'click', () => toast(`Showing ${state.recent.length} saved workout${state.recent.length === 1 ? '' : 's'}`));
    on('#add-exercise-btn', 'click', () => openExerciseModal());
    on('#workout-add-exercise', 'click', () => openExerciseModal());
    on('#finish-workout-btn', 'click', finishWorkout);
    on('#delete-workout-btn', 'click', deleteWorkout);
    on('#edit-plan-btn', 'click', () => openPlanModal(false));
    on('#delete-plan-btn', 'click', deletePlan);
    on('#exercise-form', 'submit', saveExercise);
    on('#plan-form', 'submit', savePlan);
    on('#gym-search', 'input', renderPlans);

    $$('[data-back-dashboard]').forEach((btn) => btn.addEventListener('click', showDashboard));
    $$('[data-close-modal]').forEach((btn) => btn.addEventListener('click', closeModals));
    $$('.gym-modal-backdrop').forEach((backdrop) => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) closeModals();
      });
    });
  }

  function renderAll() {
    ensureState();
    renderStats();
    renderPlans();
    renderRecent();
    renderPlanDetail();
    renderWorkout();
  }

  function renderStats() {
    const workoutsThisWeek = state.recent.length;
    const calories = state.recent.reduce((sum, item) => sum + parseNumber(item.calories), 0);
    const activeDays = Math.min(7, Math.max(1, new Set(state.recent.map((item) => item.date)).size));
    const stats = [
      ['Workouts This Week', String(workoutsThisWeek), `${state.plans.length} active plans`, 'W'],
      ['Calories Burned', calories.toLocaleString(), 'From saved workouts', 'K'],
      ['Workout Time', state.workout.duration || '0m', 'Last session duration', 'T'],
      ['Active Days', `${activeDays}/7`, activeDays >= 5 ? 'Great job!' : 'Keep going', 'OK'],
    ];

    $('#gym-stat-grid').innerHTML = stats.map(([label, value, hint, icon]) => `
      <article class="gym-stat-card">
        <div>
          <small>${escapeHtml(label)}</small>
          <strong>${escapeHtml(value)}</strong>
          <p>${escapeHtml(hint)}</p>
        </div>
        <span class="gym-stat-icon">${escapeHtml(icon)}</span>
      </article>
    `).join('');
  }

  function renderPlans() {
    const query = ($('#gym-search')?.value || '').trim().toLowerCase();
    const plans = state.plans.filter((plan) => {
      const haystack = [
        plan.name,
        plan.group,
        ...plan.exercises.map((ex) => `${ex.name} ${ex.notes || ''}`),
      ].join(' ').toLowerCase();
      return haystack.includes(query);
    });

    $('#gym-plan-grid').innerHTML = `
      ${plans.length ? plans.map(planCard).join('') : '<div class="gym-empty">No matching workout plans.</div>'}
      <button class="gym-create-plan" type="button" id="create-plan-btn">
        <b>+</b>
        <span>Create New Plan</span>
      </button>
    `;

    $$('.gym-plan-card').forEach((card) => {
      card.addEventListener('click', () => showPlan(card.dataset.plan));
    });
    on('#create-plan-btn', 'click', () => openPlanModal(true));
  }

  function planCard(plan) {
    return `
      <button class="gym-plan-card" type="button" data-plan="${escapeAttr(plan.id)}">
        <div class="gym-plan-image"></div>
        <div class="gym-plan-body">
          <h3>${escapeHtml(plan.name)} <span class="gym-status-pill">${plan.active ? 'Active' : 'Draft'}</span></h3>
          <div class="gym-plan-meta">
            <span>${plan.exercises.length} Exercise${plan.exercises.length === 1 ? '' : 's'}</span>
            <span>Last: ${escapeHtml(plan.last || 'New')}</span>
          </div>
        </div>
      </button>
    `;
  }

  function renderRecent() {
    const body = $('#recent-workouts-body');
    if (!state.recent.length) {
      body.innerHTML = '<tr><td colspan="6">No workouts saved yet.</td></tr>';
      return;
    }

    body.innerHTML = state.recent.map((item) => `
      <tr>
        <td>${escapeHtml(item.workout)}</td>
        <td>${Number(item.exercises || 0)}</td>
        <td>${escapeHtml(item.time || '-')}</td>
        <td>${escapeHtml(item.calories || '-')}</td>
        <td>${escapeHtml(item.date || '-')}</td>
        <td>
          <button class="gym-row-play" type="button" data-start="${escapeAttr(item.planId)}" aria-label="Start ${escapeAttr(item.workout)}">Start</button>
        </td>
      </tr>
    `).join('');

    $$('[data-start]').forEach((btn) => {
      btn.addEventListener('click', () => startWorkout(btn.dataset.start));
    });
  }

  function renderPlanDetail() {
    const activePlan = getActivePlan();
    $('#plan-title').textContent = activePlan.name;
    $('#plan-subtitle').textContent = `${activePlan.exercises.length} Exercise${activePlan.exercises.length === 1 ? '' : 's'}`;

    $('#gym-plan-tables').innerHTML = state.plans.map((plan) => `
      <section class="gym-plan-group">
        <div class="gym-plan-group-title">${escapeHtml(plan.name)}</div>
        <div class="gym-table-wrap">
          <table class="gym-table">
            <colgroup>
              <col class="gym-col-index" />
              <col class="gym-col-exercise" />
              <col class="gym-col-number" />
              <col class="gym-col-number" />
              <col class="gym-col-weight" />
              <col class="gym-col-notes" />
              <col class="gym-col-action" />
            </colgroup>
            <thead>
              <tr>
                <th>#</th>
                <th>Exercise</th>
                <th>Sets</th>
                <th>Reps</th>
                <th>Weight</th>
                <th>Notes</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${plan.exercises.length ? plan.exercises.map((ex, i) => exerciseRow(plan.id, ex, i)).join('') : '<tr><td colspan="7">No exercises in this plan yet.</td></tr>'}
            </tbody>
          </table>
        </div>
      </section>
    `).join('');

    $$('[data-edit-exercise]').forEach((btn) => {
      btn.addEventListener('click', () => openExerciseModal(btn.dataset.editExercise, btn.dataset.planId));
    });
    $$('[data-delete-exercise]').forEach((btn) => {
      btn.addEventListener('click', () => deleteExercise(btn.dataset.deleteExercise, btn.dataset.planId));
    });
  }

  function exerciseRow(planId, ex, index) {
    return `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(ex.name)}</td>
        <td class="center">${Number(ex.sets || 1)}</td>
        <td class="center">${escapeHtml(String(ex.reps || ''))}</td>
        <td class="center"><span class="gym-weight-badge">${escapeHtml(normalizeWeight(ex.weight))}</span></td>
        <td class="center">${escapeHtml(ex.notes || '-')}</td>
        <td>
          <span class="gym-action-group">
            <button class="gym-action-btn" type="button" data-plan-id="${escapeAttr(planId)}" data-edit-exercise="${escapeAttr(ex.id)}">Edit</button>
            <button class="gym-action-btn delete" type="button" data-plan-id="${escapeAttr(planId)}" data-delete-exercise="${escapeAttr(ex.id)}">Delete</button>
          </span>
        </td>
      </tr>
    `;
  }

  function renderWorkout() {
    const plan = getActivePlan();
    $('#workout-title').textContent = plan.name;
    $('#workout-duration').textContent = currentDuration();
    $('#workout-calories').textContent = currentCalories();
    $('#workout-date').textContent = formatDate(new Date());

    $('#today-workout-body').innerHTML = plan.exercises.length ? plan.exercises.map((ex, i) => {
      const repsDone = state.workout.repsDone[ex.id] ?? ex.reps ?? '';
      const weightVal = state.workout.weightOverrides[ex.id] ?? weightToInput(ex.weight);
      const isDone = String(repsDone).trim() !== '';
      return `
        <tr>
          <td>${i + 1}</td>
          <td>${escapeHtml(ex.name)}</td>
          <td class="center">${Number(ex.sets || 1)}</td>
          <td class="center">${escapeHtml(String(ex.reps || ''))}</td>
          <td class="center">
            <span class="weight-input">
              <input inputmode="decimal" value="${escapeAttr(weightVal)}" data-weight="${escapeAttr(ex.id)}" aria-label="Weight for ${escapeAttr(ex.name)}" />
              <span>kg</span>
            </span>
          </td>
          <td class="center">
            <input value="${escapeAttr(String(repsDone))}" data-reps="${escapeAttr(ex.id)}" aria-label="Reps done for ${escapeAttr(ex.name)}" />
          </td>
          <td class="center">
            <span class="gym-done-mark ${isDone ? '' : 'empty'}" aria-label="${isDone ? 'Done' : 'Pending'}">OK</span>
          </td>
        </tr>
      `;
    }).join('') : '<tr><td colspan="7">Add exercises before starting this workout.</td></tr>';

    $$('[data-reps]').forEach((input) => {
      input.addEventListener('input', () => {
        state.workout.repsDone[input.dataset.reps] = input.value;
        saveState();
        updateDoneMark(input);
      });
    });

    $$('[data-weight]').forEach((input) => {
      input.addEventListener('change', () => {
        const id = input.dataset.weight;
        const val = input.value.trim();
        state.workout.weightOverrides[id] = val;
        const ex = getActivePlan().exercises.find((item) => item.id === id);
        if (ex) ex.weight = val ? `${val}kg` : EMPTY_WEIGHT;
        saveState();
        renderPlanDetail();
      });
    });
  }

  function showPlan(planId) {
    const plan = state.plans.find((item) => item.id === planId);
    if (!plan) return;
    state.activePlanId = plan.id;
    saveState();
    renderPlanDetail();
    renderWorkout();
    switchView('plan');
  }

  function showDashboard() {
    renderAll();
    switchView('dashboard');
  }

  function startWorkout(planId) {
    const plan = planId ? state.plans.find((item) => item.id === planId) : getActivePlan();
    if (!plan) {
      toast('Create a workout plan first');
      return;
    }
    if (!plan.exercises.length) {
      state.activePlanId = plan.id;
      saveState();
      renderPlanDetail();
      switchView('plan');
      toast('Add exercises before starting this plan');
      return;
    }

    state.activePlanId = plan.id;
    state.workout.started = true;
    state.workout.startedAt = new Date().toISOString();
    state.workout.repsDone = {};
    state.workout.weightOverrides = {};
    plan.exercises.forEach((ex) => {
      state.workout.repsDone[ex.id] = ex.reps || '';
      state.workout.weightOverrides[ex.id] = weightToInput(ex.weight);
    });
    saveState();
    renderWorkout();
    switchView('workout');
  }

  function finishWorkout() {
    const plan = getActivePlan();
    if (!plan.exercises.length) {
      toast('No exercises to save');
      return;
    }

    state.workout.duration = currentDuration();
    state.workout.calories = currentCalories();
    const entry = {
      planId: plan.id,
      workout: plan.name,
      exercises: plan.exercises.length,
      time: state.workout.duration,
      calories: state.workout.calories,
      date: formatDate(new Date()),
    };
    state.recent = state.recent.filter((item) => !(item.planId === plan.id && item.date === entry.date));
    state.recent.unshift(entry);
    state.recent = state.recent.slice(0, 12);
    plan.last = 'Today';
    state.workout.started = false;
    saveState();
    renderAll();
    switchView('dashboard');
    toast('Workout saved');
  }

  function deleteWorkout() {
    state.workout.started = false;
    state.workout.startedAt = '';
    state.workout.repsDone = {};
    state.workout.weightOverrides = {};
    saveState();
    renderWorkout();
    switchView('dashboard');
    toast('Workout deleted');
  }

  function openExerciseModal(exerciseId, planId) {
    const form = $('#exercise-form');
    const fields = form.elements;
    const plan = state.plans.find((p) => p.id === (planId || state.activePlanId)) || getActivePlan();
    const ex = exerciseId ? plan.exercises.find((item) => item.id === exerciseId) : null;

    form.reset();
    fields.mode.value = ex ? 'edit' : 'add';
    fields.exerciseId.value = ex ? ex.id : '';
    form.dataset.planId = plan.id;
    $('#exercise-modal-title').textContent = ex ? 'Edit Exercise' : 'Add Exercise';

    if (ex) {
      fields.name.value = ex.name;
      fields.sets.value = String(ex.sets || 1);
      fields.reps.value = String(ex.reps || '12');
      fields.weight.value = weightToInput(ex.weight);
      fields.notes.value = ex.notes || '';
    }
    openModal('#exercise-modal');
  }

  function saveExercise(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const fields = form.elements;
    const plan = state.plans.find((p) => p.id === form.dataset.planId);
    if (!plan) {
      toast('Plan not found');
      return;
    }

    const name = fields.name.value.trim();
    if (!name) {
      toast('Exercise name is required');
      fields.name.focus();
      return;
    }

    const rawWeight = fields.weight.value.trim();
    const ex = {
      id: fields.exerciseId.value || makeId(),
      name,
      sets: Math.max(1, Number(fields.sets.value || 1)),
      reps: fields.reps.value || '12',
      weight: rawWeight ? `${rawWeight}kg` : EMPTY_WEIGHT,
      notes: fields.notes.value.trim(),
    };

    const idx = plan.exercises.findIndex((item) => item.id === ex.id);
    if (idx >= 0) plan.exercises[idx] = ex;
    else plan.exercises.push(ex);

    saveState();
    closeModals();
    renderAll();
    toast(idx >= 0 ? 'Exercise updated' : 'Exercise added');
  }

  function deleteExercise(exerciseId, planId) {
    const plan = state.plans.find((p) => p.id === planId);
    if (!plan) return;
    plan.exercises = plan.exercises.filter((item) => item.id !== exerciseId);
    saveState();
    renderAll();
    toast('Exercise deleted');
  }

  function openPlanModal(createNew) {
    const form = $('#plan-form');
    const fields = form.elements;
    const plan = createNew ? null : getActivePlan();

    form.reset();
    fields.planId.value = plan ? plan.id : '';
    $('#plan-modal-title').textContent = createNew ? 'Create New Plan' : 'Edit Plan';

    if (plan) {
      fields.name.value = plan.name;
      fields.group.value = plan.group || 'Full Body';
    }
    openModal('#plan-modal');
  }

  function savePlan(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const fields = form.elements;
    const name = fields.name.value.trim();
    if (!name) {
      toast('Plan name is required');
      fields.name.focus();
      return;
    }

    if (fields.planId.value) {
      const plan = state.plans.find((p) => p.id === fields.planId.value);
      if (plan) {
        plan.name = name;
        plan.group = fields.group.value;
      }
    } else {
      const plan = {
        id: makeId(),
        name,
        group: fields.group.value,
        active: true,
        last: 'New',
        exercises: [],
      };
      state.plans.push(plan);
      state.activePlanId = plan.id;
    }

    saveState();
    closeModals();
    renderAll();
    toast('Plan saved');
  }

  function deletePlan() {
    const plan = getActivePlan();
    if (state.plans.length <= 1) {
      toast('Keep at least one workout plan');
      return;
    }
    if (!window.confirm(`Delete "${plan.name}"?`)) return;

    state.plans = state.plans.filter((item) => item.id !== plan.id);
    state.recent = state.recent.filter((item) => item.planId !== plan.id);
    state.activePlanId = state.plans[0].id;
    saveState();
    renderAll();
    switchView('dashboard');
    toast('Plan deleted');
  }

  function showBodyStats() {
    const exercises = state.plans.reduce((sum, plan) => sum + plan.exercises.length, 0);
    const calories = state.recent.reduce((sum, item) => sum + parseNumber(item.calories), 0);
    toast(`${state.plans.length} plans | ${exercises} exercises | ${calories.toLocaleString()} kcal`);
  }

  function toggleTheme() {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    toast(`${next === 'dark' ? 'Dark' : 'Light'} mode enabled`);
  }

  function applyTheme(theme, palette) {
    const resolved = theme === 'dark' ? 'dark' : 'light';
    const resolvedPalette = palette || localStorage.getItem(PALETTE_KEY) || 'palette-1';
    document.documentElement.dataset.theme = resolved;
    document.documentElement.dataset.palette = resolvedPalette;
    document.body.dataset.theme = resolved;
    document.body.dataset.palette = resolvedPalette;
    localStorage.setItem(THEME_KEY, resolved);
    localStorage.setItem(PALETTE_KEY, resolvedPalette);

    const btn = $('#gym-theme-toggle');
    if (btn) {
      const icon = btn.querySelector('span');
      btn.textContent = '';
      if (icon) btn.appendChild(icon);
      btn.appendChild(document.createTextNode(resolved === 'dark' ? ' Light Mode' : ' Dark Mode'));
    }
  }

  function switchView(view) {
    $$('.gym-view').forEach((el) => {
      el.classList.remove('active');
      el.hidden = true;
    });
    const target = $(`#gym-${view}-view`);
    if (target) {
      target.hidden = false;
      target.classList.add('active');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openModal(selector) {
    const el = $(selector);
    if (!el) return;
    el.classList.add('open');
    el.setAttribute('aria-hidden', 'false');
    const first = el.querySelector('input:not([type=hidden]), select');
    if (first) setTimeout(() => first.focus(), 50);
  }

  function closeModals() {
    $$('.gym-modal-backdrop').forEach((modal) => {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
    });
  }

  function getActivePlan() {
    ensureState();
    return state.plans.find((plan) => plan.id === state.activePlanId) || state.plans[0];
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return cloneDefaults();
      const saved = JSON.parse(raw);
      if (saved && Array.isArray(saved.plans)) return mergeState(saved);
    } catch (err) {
      console.warn('Gym: could not load saved state, using defaults', err);
    }
    return cloneDefaults();
  }

  function mergeState(saved) {
    const merged = {
      ...cloneDefaults(),
      ...saved,
      plans: Array.isArray(saved.plans) ? saved.plans : cloneDefaults().plans,
      recent: Array.isArray(saved.recent) ? saved.recent : [],
      workout: {
        ...defaults.workout,
        ...(saved.workout || {}),
        repsDone: { ...(saved.workout?.repsDone || {}) },
        weightOverrides: { ...(saved.workout?.weightOverrides || {}) },
      },
    };
    merged.plans = merged.plans.map(normalizePlan).filter(Boolean);
    if (!merged.plans.length) merged.plans = cloneDefaults().plans;
    if (!merged.plans.some((plan) => plan.id === merged.activePlanId)) merged.activePlanId = merged.plans[0].id;
    return merged;
  }

  function normalizePlan(plan) {
    if (!plan || !plan.id) return null;
    return {
      id: String(plan.id),
      name: String(plan.name || 'Workout Plan'),
      group: String(plan.group || 'Full Body'),
      active: plan.active !== false,
      last: String(plan.last || 'New'),
      exercises: Array.isArray(plan.exercises) ? plan.exercises.map(normalizeExercise).filter(Boolean) : [],
    };
  }

  function normalizeExercise(ex) {
    if (!ex || !ex.id) return null;
    return {
      id: String(ex.id),
      name: String(ex.name || 'Exercise'),
      sets: Math.max(1, Number(ex.sets || 1)),
      reps: String(ex.reps || '12'),
      weight: normalizeWeight(ex.weight),
      notes: String(ex.notes || ''),
    };
  }

  function ensureState() {
    if (!state || !Array.isArray(state.plans) || !state.plans.length) state = cloneDefaults();
    if (!state.plans.some((plan) => plan.id === state.activePlanId)) state.activePlanId = state.plans[0].id;
    if (!state.workout) state.workout = { ...defaults.workout, repsDone: {}, weightOverrides: {} };
    if (!state.workout.repsDone) state.workout.repsDone = {};
    if (!state.workout.weightOverrides) state.workout.weightOverrides = {};
    if (!Array.isArray(state.recent)) state.recent = [];
  }

  function saveState() {
    ensureState();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn('Gym: could not save state', err);
    }
  }

  function hydrateUser() {
    try {
      const email = localStorage.getItem(USER_KEY);
      const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
      const user = users.find((u) => u.email === email);
      if (!user) {
        window.location.href = '../index.html';
        return false;
      }
      const abbr = initials(user.name);
      const nameEl = $('#gym-user-name');
      if (nameEl) nameEl.textContent = user.name;
      $$('.gym-avatar').forEach((el) => {
        el.textContent = abbr;
      });
      return true;
    } catch (err) {
      console.warn('Gym: could not hydrate user', err);
      return true;
    }
  }

  function toast(message) {
    const el = $('#gym-toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  function currentDuration() {
    if (!state.workout.startedAt) return state.workout.duration || '0m';
    const minutes = Math.max(1, Math.round((Date.now() - new Date(state.workout.startedAt).getTime()) / 60000));
    return formatMinutes(minutes);
  }

  function currentCalories() {
    const plan = getActivePlan();
    const estimated = plan.exercises.reduce((sum, ex) => sum + Number(ex.sets || 1) * 35, 0);
    return `${Math.max(80, estimated)} kcal`;
  }

  function updateDoneMark(input) {
    const mark = input.closest('tr')?.querySelector('.gym-done-mark');
    if (!mark) return;
    const done = input.value.trim() !== '';
    mark.classList.toggle('empty', !done);
    mark.setAttribute('aria-label', done ? 'Done' : 'Pending');
  }

  function normalizeWeight(value) {
    const raw = String(value || '').trim();
    if (!raw || !/\d/.test(raw)) return EMPTY_WEIGHT;
    return raw;
  }

  function weightToInput(value) {
    const normalized = normalizeWeight(value);
    if (normalized === EMPTY_WEIGHT) return '';
    return normalized.replace(/kg$/i, '').trim();
  }

  function parseNumber(value) {
    return Number(String(value || '').replace(/[^\d.]/g, '')) || 0;
  }

  function formatMinutes(minutes) {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }

  function formatDate(date) {
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function cloneDefaults() {
    return typeof structuredClone === 'function'
      ? structuredClone(defaults)
      : JSON.parse(JSON.stringify(defaults));
  }

  function makeId() {
    return window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
  }

  function initials(name) {
    return String(name || 'User')
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'U';
  }

  function on(selector, event, handler) {
    const el = $(selector);
    if (el) el.addEventListener(event, handler);
  }

  function escapeHtml(v) {
    return String(v)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function escapeAttr(v) {
    return escapeHtml(v);
  }
})();
