// MyLife — Habits module (Phase 3).
// currentData.habits keeps `.completed` as a real, synced field meaning
// "completed today" (kept in sync with the new `.completions[]` history log
// by normalizeData()'s day-rollover pass in shared.js) — so getCounts(),
// the Dashboard, Statistics, and achievements all keep working unchanged.

const HABIT_DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const HABIT_HEATMAP_WEEKS = 12;

let habitState = { filter: 'all', category: 'all', modal: null };

function habIso(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function habAddDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function habToday() { return habIso(new Date()); }

function habitStreaks(h) {
  const set = new Set(h.completions || []);
  const today = new Date();
  let current = 0;
  let cursor = set.has(habIso(today)) ? today : habAddDays(today, -1);
  while (set.has(habIso(cursor))) { current++; cursor = habAddDays(cursor, -1); }

  const days = [...set].sort();
  let best = 0, run = 0, prev = null;
  days.forEach((iso) => {
    if (prev) {
      const gapDays = Math.round((habIsoToDate(iso) - habIsoToDate(prev)) / 86400000);
      run = gapDays === 1 ? run + 1 : 1;
    } else run = 1;
    best = Math.max(best, run);
    prev = iso;
  });
  return { current, best: Math.max(best, current) };
}

function habIsoToDate(iso) { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); }

function habitMissedDays(h, windowDays = 30) {
  const created = h.createdAt ? new Date(h.createdAt) : habAddDays(new Date(), -windowDays);
  const start = habAddDays(new Date(), -(windowDays - 1)) > created ? habAddDays(new Date(), -(windowDays - 1)) : created;
  const set = new Set(h.completions || []);
  let missed = 0;
  for (let d = new Date(start); d <= new Date(); d = habAddDays(d, 1)) {
    if (!set.has(habIso(d))) missed++;
  }
  return missed;
}

function habitWeekProgress(h) {
  const now = new Date();
  const dow = now.getDay(); // 0=Sun
  const monday = habAddDays(now, dow === 0 ? -6 : 1 - dow);
  const set = new Set(h.completions || []);
  let done = 0;
  for (let i = 0; i < 7; i++) { if (set.has(habIso(habAddDays(monday, i)))) done++; }
  return { done, target: h.weeklyTarget || 7 };
}

function habitHeatmapCells(h) {
  const set = new Set(h.completions || []);
  const today = new Date();
  const totalDays = HABIT_HEATMAP_WEEKS * 7;
  const start = habAddDays(today, -(totalDays - 1 + today.getDay()));
  const cells = [];
  for (let i = 0; i < totalDays + 7; i++) {
    const d = habAddDays(start, i);
    if (d > today) break;
    const iso = habIso(d);
    cells.push({ iso, on: set.has(iso), future: false });
  }
  return cells;
}

function allHabitCategories() {
  const set = new Set();
  currentData.habits.forEach((h) => { if (h.category) set.add(h.category); });
  return [...set].sort((a, b) => a.localeCompare(b));
}

function initHabitsPage() {
  renderArt('habits');
  renderHabitsRoot();
}

function renderHabitsRoot() {
  const root = byId('habits-root');
  if (!root) return;
  const habits = visibleHabits();
  root.innerHTML = `
    ${habitsHeaderHtml()}
    ${habitsFiltersHtml()}
    <div class="hab-list">
      ${habits.length ? habits.map(habitCardHtml).join('') : emptyStateHtml('flame', t('No habits yet. Add one to start building your streak.'), `<button type="button" class="secondary-btn empty-state-cta" data-hab-add>+ ${t('New habit')}</button>`)}
    </div>
  `;
  bindHabitsRootEvents(root);
  renderHabitModal();
}

function habitsHeaderHtml() {
  const total = currentData.habits.length;
  const done = currentData.habits.filter((h) => h.completed).length;
  return `
    <section class="panel hab-header">
      <div class="hab-header-top">
        <div>
          <p class="eyebrow">${t('Daily routines')}</p>
          <h2>${t('Habits')}</h2>
          <p class="muted">${done}/${total} ${t('done today')}</p>
        </div>
        <button type="button" class="primary-btn" data-hab-add>+ ${t('New habit')}</button>
      </div>
    </section>
  `;
}

function habitsFiltersHtml() {
  const filters = [['all', t('All')], ['today', t('Due today')], ['done', t('Done today')]];
  const cats = allHabitCategories();
  return `
    <section class="td-filter-row">
      <div class="td-filter-chips" role="tablist">
        ${filters.map(([k, label]) => `<button type="button" class="td-chip${habitState.filter === k ? ' active' : ''}" data-hab-filter="${k}" role="tab" aria-selected="${habitState.filter === k}">${label}</button>`).join('')}
      </div>
      ${cats.length ? `
        <select class="td-tag-select" data-hab-category aria-label="${t('Filter by category')}">
          <option value="all" ${habitState.category === 'all' ? 'selected' : ''}>${t('All categories')}</option>
          ${cats.map((c) => `<option value="${escapeAttr(c)}" ${habitState.category === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
        </select>
      ` : ''}
    </section>
  `;
}

function visibleHabits() {
  return currentData.habits.filter((h) => {
    if (habitState.filter === 'today' && h.completed) return false;
    if (habitState.filter === 'done' && !h.completed) return false;
    if (habitState.category !== 'all' && h.category !== habitState.category) return false;
    return true;
  });
}

function habitCardHtml(h) {
  const streaks = habitStreaks(h);
  const missed = habitMissedDays(h);
  const week = habitWeekProgress(h);
  const cells = habitHeatmapCells(h);
  return `
    <article class="hab-card${h.completed ? ' is-completed' : ''}">
      <label class="td-check">
        <input type="checkbox" ${h.completed ? 'checked' : ''} data-hab-toggle="${h.id}" aria-label="${h.completed ? t('Mark not done today') : t('Mark done today')}" />
      </label>
      <div class="hab-card-main">
        <div class="td-card-top">
          <strong data-hab-edit="${h.id}" role="button" tabindex="0">${escapeHtml(h.title)}</strong>
          ${h.category ? `<span class="td-tag-chip">${escapeHtml(h.category)}</span>` : ''}
          <span class="td-badge td-badge-${(h.difficulty || 'Medium').toLowerCase()}">${t(h.difficulty || 'Medium')}</span>
        </div>
        <div class="hab-stats-row">
          <span class="hab-stat" title="${t('Current streak')}">\ud83d\udd25 ${streaks.current}</span>
          <span class="hab-stat" title="${t('Best streak')}">\ud83c\udfc6 ${streaks.best}</span>
          <span class="hab-stat" title="${t('Missed in last 30 days')}">\u26a0 ${missed} ${t('missed')}</span>
        </div>
        <div class="hab-week">
          <span class="hab-week-label">${t('This week')}: ${week.done}/${week.target}</span>
          <div class="td-subtask-bar"><i style="width:${percent(week.done, week.target)}%"></i></div>
        </div>
        <div class="hab-heatmap" role="img" aria-label="${t('Completion history')}">
          ${cells.map((c) => `<span class="hab-cell${c.on ? ' on' : ''}" data-hab-cell="${h.id}:${c.iso}" title="${c.iso}"></span>`).join('')}
        </div>
      </div>
      <div class="td-actions">
        <button type="button" class="std-icon-btn" data-hab-edit="${h.id}" title="${t('Edit')}" aria-label="${t('Edit')}">\u270e</button>
        <button type="button" class="std-icon-btn std-icon-danger" data-hab-delete="${h.id}" title="${t('Delete')}" aria-label="${t('Delete')}">\u2715</button>
      </div>
    </article>
  `;
}

function bindHabitsRootEvents(root) {
  root.querySelectorAll('[data-hab-add]').forEach((btn) => btn.addEventListener('click', () => openHabitModal()));
  root.querySelectorAll('[data-hab-filter]').forEach((btn) => btn.addEventListener('click', () => { habitState.filter = btn.dataset.habFilter; renderHabitsRoot(); }));
  const catSelect = root.querySelector('[data-hab-category]');
  if (catSelect) catSelect.addEventListener('change', () => { habitState.category = catSelect.value; renderHabitsRoot(); });
  root.querySelectorAll('[data-hab-toggle]').forEach((el) => el.addEventListener('change', () => toggleHabitToday(el.dataset.habToggle)));
  root.querySelectorAll('[data-hab-cell]').forEach((el) => el.addEventListener('click', () => {
    const [id, iso] = el.dataset.habCell.split(':');
    toggleHabitDate(id, iso);
  }));
  root.querySelectorAll('[data-hab-edit]').forEach((el) => {
    el.addEventListener('click', () => openHabitModal(el.dataset.habEdit));
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openHabitModal(el.dataset.habEdit); } });
  });
  root.querySelectorAll('[data-hab-delete]').forEach((btn) => btn.addEventListener('click', () => deleteHabit(btn.dataset.habDelete)));
}

function toggleHabitToday(id) { toggleHabitDate(id, habToday()); }

function toggleHabitDate(id, iso) {
  const h = currentData.habits.find((x) => x.id === id);
  if (!h) return;
  h.completions = h.completions || [];
  if (h.completions.includes(iso)) h.completions = h.completions.filter((d) => d !== iso);
  else h.completions.push(iso);
  h.completed = h.completions.includes(habToday());
  persist();
  renderHabitsRoot();
}

function deleteHabit(id) {
  currentData.habits = currentData.habits.filter((x) => x.id !== id);
  persist();
  renderHabitsRoot();
}

function openHabitModal(id) { habitState.modal = id || 'new'; renderHabitModal(); }
function closeHabitModal() { habitState.modal = null; const el = document.querySelector('[data-hab-modal]'); if (el) el.remove(); }

function renderHabitModal() {
  const existing = document.querySelector('[data-hab-modal]');
  if (existing) existing.remove();
  if (!habitState.modal) return;
  const editing = habitState.modal === 'new' ? null : currentData.habits.find((x) => x.id === habitState.modal);
  const cats = allHabitCategories();

  document.body.insertAdjacentHTML('beforeend', `
    <div class="td-modal-overlay" data-hab-modal role="dialog" aria-modal="true" aria-label="${editing ? t('Edit habit') : t('New habit')}">
      <div class="td-modal-backdrop" data-hab-modal-close></div>
      <div class="panel td-modal-card">
        <div class="td-modal-head">
          <div><p class="eyebrow">${editing ? t('Edit') : t('New')}</p><h2>${t('Habit')}</h2></div>
          <button type="button" class="std-icon-btn" data-hab-modal-close aria-label="${t('Close')}">\u2715</button>
        </div>
        <form class="form-stack" data-hab-form novalidate>
          <label class="full-field">${t('Title')}
            <input type="text" name="title" required value="${escapeAttr(editing?.title || '')}" />
          </label>
          <div class="form-grid">
            <label>${t('Category')}
              <input type="text" name="category" list="hab-category-list" value="${escapeAttr(editing?.category || '')}" placeholder="${t('Health, Mind, Work\u2026')}" />
              <datalist id="hab-category-list">${cats.map((c) => `<option value="${escapeAttr(c)}"></option>`).join('')}</datalist>
            </label>
            <label>${t('Difficulty')}
              <select name="difficulty">${HABIT_DIFFICULTIES.map((d) => `<option ${((editing?.difficulty) || 'Medium') === d ? 'selected' : ''}>${t(d)}</option>`).join('')}</select>
            </label>
            <label>${t('Weekly target (days)')}
              <input type="number" name="weeklyTarget" min="1" max="7" value="${editing?.weeklyTarget || 7}" />
            </label>
          </div>
          <div class="td-modal-actions">
            ${editing ? `<button type="button" class="danger-btn" data-hab-modal-delete>${t('Delete')}</button>` : '<span></span>'}
            <div class="td-modal-actions-right">
              <button type="button" class="secondary-btn" data-hab-modal-close>${t('Cancel')}</button>
              <button type="submit" class="primary-btn">${t('Save')}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  `);

  const overlay = document.querySelector('[data-hab-modal]');
  overlay.querySelectorAll('[data-hab-modal-close]').forEach((b) => b.addEventListener('click', closeHabitModal));
  overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); closeHabitModal(); } });
  const delBtn = overlay.querySelector('[data-hab-modal-delete]');
  if (delBtn) delBtn.addEventListener('click', () => { deleteHabit(editing.id); closeHabitModal(); });

  overlay.querySelector('[data-hab-form]').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get('title') || '').trim();
    if (!title) return;
    const data = {
      title,
      category: String(fd.get('category') || '').trim(),
      difficulty: String(fd.get('difficulty') || 'Medium'),
      weeklyTarget: Math.max(1, Math.min(7, Number(fd.get('weeklyTarget')) || 7)),
    };
    if (editing) {
      Object.assign(editing, data);
    } else {
      currentData.habits.push({ id: makeId(), completed: false, completions: [], createdAt: new Date().toISOString(), ...data });
    }
    persist();
    closeHabitModal();
    renderHabitsRoot();
  });
}
