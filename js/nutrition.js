// MyLife — Nutrition module (Phase 3).
// Meals now carry a real `date` (added in shared.js's normalizeData), so
// "today's totals" vs "meal planner" (future-dated meals) can be told apart.
// Weight history intentionally reuses currentData.bodyMeasurements (the same
// log Workout's Phase 3 body-measurements feature writes to) rather than
// keeping a second, disconnected weight log.

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

let nutritionState = { modal: null, plannerDate: null };

function nutIso(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function nutAddDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function nutToday() { return nutIso(new Date()); }

function initNutritionPage() {
  renderArt('nutrition');
  nutritionState.plannerDate = nutToday();
  renderNutritionRoot();
}

function renderNutritionRoot() {
  const root = byId('nutrition-root');
  if (!root) return;
  const s = currentData.settings;
  const totals = nutritionTotals();
  const todayMeals = currentData.meals.filter((m) => (m.date || nutToday()) === nutToday());

  root.innerHTML = `
    <section class="panel">
      <p class="eyebrow">${t('Today')}</p>
      <h2>${t('Macros')}</h2>
      <div class="dash-grid nut-macro-grid">
        ${nutRing('Calories', totals.calories, s.calorieTarget, 'orange')}
        ${nutRing('Protein', totals.protein, s.proteinTarget, 'green', 'g')}
        ${nutRing('Carbs', totals.carbs, s.carbTarget, 'blue', 'g')}
        ${nutRing('Fat', totals.fat, s.fatTarget, 'purple', 'g')}
      </div>
    </section>

    <section class="dash-columns">
      <div class="panel">
        <div class="td-header-top" style="margin-bottom:10px">
          <div><p class="eyebrow">${t('Log')}</p><h2>${t('Today\u2019s meals')}</h2></div>
          <button type="button" class="primary-btn" data-nut-add>+ ${t('Add meal')}</button>
        </div>
        <div class="nut-meal-list">
          ${todayMeals.length ? todayMeals.map(mealRowHtml).join('') : emptyStateHtml('apple', t('No meals logged today.'))}
        </div>
      </div>
      <div class="panel">
        ${weekCalorieChartHtml()}
      </div>
    </section>

    <section class="health-tracking-grid">
      ${waterTrackerHtml()}
      ${sleepTrackerHtml()}
      ${bodyTrackerHtml()}
      ${nutritionGoalsHtml()}
    </section>

    <section class="panel">
      ${mealPlannerHtml()}
    </section>

    <section class="dash-columns">
      <div class="panel">
        ${shoppingListHtml()}
      </div>
      <div class="panel">
        ${weightHistoryHtml()}
      </div>
    </section>
  `;
  bindNutritionRootEvents(root);
  renderMealModal();
}

function waterTrackerHtml() {
  const today = nutToday();
  const glasses = currentData.water.filter((entry) => !entry.date || entry.date === today)
    .reduce((sum, entry) => sum + Number(entry.glasses || entry.amount || 1), 0);
  const goal = Number(currentData.settings.waterGoal) || 8;
  return `<section class="panel health-tracker" id="water">
    <p class="eyebrow">${t('Hydration')}</p><h2>${t('Water')}</h2>
    <strong class="health-tracker-value">${glasses} / ${goal} ${t('glasses')}</strong>
    <div class="meter"><i style="width:${percent(glasses, goal)}%"></i></div>
    <form class="health-inline-form" data-health-water-form>
      <label>${t('Glasses')}<input name="glasses" type="number" min="1" value="1" required></label>
      <button class="primary-btn" type="submit">${t('Add water')}</button>
    </form>
  </section>`;
}

function sleepTrackerHtml() {
  const latest = [...currentData.sleep].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))[0];
  return `<section class="panel health-tracker" id="sleep">
    <p class="eyebrow">${t('Recovery')}</p><h2>${t('Sleep')}</h2>
    <strong class="health-tracker-value">${latest ? `${latest.hours || 0} ${t('hours')}` : t('No sleep logged')}</strong>
    <p class="muted">${latest ? `${t('Quality')}: ${t(latest.quality || '—')}` : t('Track each night to understand your recovery.')}</p>
    <form class="health-inline-form" data-health-sleep-form>
      <label>${t('Hours')}<input name="hours" type="number" min="0" max="24" step="0.1" required></label>
      <label>${t('Quality')}<select name="quality"><option>${t('Good')}</option><option>${t('Great')}</option><option>${t('Low')}</option></select></label>
      <button class="primary-btn" type="submit">${t('Log sleep')}</button>
    </form>
  </section>`;
}

function bodyTrackerHtml() {
  const latest = [...currentData.bodyMeasurements].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))[0];
  return `<section class="panel health-tracker" id="measurements">
    <p class="eyebrow">${t('Progress')}</p><h2>${t('Body measurements')}</h2>
    <strong class="health-tracker-value">${latest?.weight ? `${latest.weight} kg` : t('No measurement logged')}</strong>
    <form class="health-inline-form" data-health-body-form>
      <label>${t('Weight')}<input name="weight" type="number" min="0" step="0.1" required></label>
      <label>${t('Waist')}<input name="waist" type="number" min="0" step="0.1"></label>
      <button class="primary-btn" type="submit">${t('Save measurement')}</button>
    </form>
  </section>`;
}

function nutritionGoalsHtml() {
  const s = currentData.settings;
  return `<section class="panel health-tracker" id="goals">
    <p class="eyebrow">${t('Personal targets')}</p><h2>${t('Nutrition goals')}</h2>
    <form class="health-inline-form health-goals-form" data-health-goals-form>
      <label>${t('Calories')}<input name="calorieTarget" type="number" min="0" value="${s.calorieTarget || ''}"></label>
      <label>${t('Protein')}<input name="proteinTarget" type="number" min="0" value="${s.proteinTarget || ''}"></label>
      <label>${t('Carbs')}<input name="carbTarget" type="number" min="0" value="${s.carbTarget || ''}"></label>
      <label>${t('Fat')}<input name="fatTarget" type="number" min="0" value="${s.fatTarget || ''}"></label>
      <button class="primary-btn" type="submit">${t('Save goals')}</button>
    </form>
  </section>`;
}

function nutRing(label, value, target, color, suffix = '') {
  const pct = percent(value, target || 1);
  return `
    <div class="dash-card" data-accent="${color}">
      ${progressRingSvg(pct, color, 52)}
      <div class="dash-card-body">
        <h3>${t(label)}</h3>
        <p>${Math.round(value)}${suffix} / ${target || 0}${suffix}</p>
      </div>
    </div>
  `;
}

function mealRowHtml(m) {
  return `
    <article class="nut-meal-row">
      <div>
        <strong>${escapeHtml(m.title)}</strong>
        <span class="td-tag-chip">${t(m.type || 'Snack')}</span>
        <small class="muted">${m.calories || 0} kcal \u00b7 P${m.protein || 0} \u00b7 C${m.carbs || 0} \u00b7 F${m.fat || 0}</small>
      </div>
      <div class="td-actions">
        <button type="button" class="std-icon-btn" data-nut-edit="${m.id}" aria-label="${t('Edit')}">\u270e</button>
        <button type="button" class="std-icon-btn std-icon-danger" data-nut-delete="${m.id}" aria-label="${t('Delete')}">\u2715</button>
      </div>
    </article>
  `;
}

function weekCalorieChartHtml() {
  const days = Array.from({ length: 7 }, (_, i) => nutIso(nutAddDays(new Date(), i - 6)));
  const labels = days.map((iso) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(`${iso}T00:00:00`).getDay()]);
  const values = days.map((iso) => nutritionTotals(iso).calories);
  return `<h3>${t('Calories this week')}</h3>${statsBarChartSvg(labels, values, 'orange')}`;
}

// ─── Meal planner (future-dated meals) ─────────────────────────────────────
function mealPlannerHtml() {
  const days = Array.from({ length: 7 }, (_, i) => nutIso(nutAddDays(new Date(), i)));
  return `
    <p class="eyebrow">${t('Plan ahead')}</p>
    <h2>${t('Meal planner')}</h2>
    <div class="nut-planner-grid">
      ${days.map((iso) => {
        const d = new Date(`${iso}T00:00:00`);
        const meals = currentData.meals.filter((m) => m.date === iso);
        return `
          <div class="nut-planner-day">
            <div class="nut-planner-day-head">
              <strong>${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]}</strong>
              <small>${d.getMonth() + 1}/${d.getDate()}</small>
            </div>
            ${meals.map((m) => `<div class="nut-planner-chip">${escapeHtml(m.title)}</div>`).join('')}
            <button type="button" class="text-btn" data-nut-plan="${iso}">+ ${t('Plan meal')}</button>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ─── Shopping list ──────────────────────────────────────────────────────────
function shoppingListHtml() {
  const items = currentData.shoppingList;
  return `
    <div class="td-header-top" style="margin-bottom:10px">
      <div><p class="eyebrow">${t('From your meal plan')}</p><h2>${t('Shopping list')}</h2></div>
    </div>
    <div class="nut-shop-actions">
      <button type="button" class="secondary-btn" data-nut-shop-generate">${t('Generate from planned meals')}</button>
      <button type="button" class="text-btn" data-nut-shop-clear">${t('Clear checked')}</button>
    </div>
    <div class="nut-shop-list">
      ${items.length ? items.map((i) => `
        <label class="nut-shop-row${i.checked ? ' is-checked' : ''}">
          <input type="checkbox" ${i.checked ? 'checked' : ''} data-nut-shop-toggle="${i.id}" />
          <span>${escapeHtml(i.item)}</span>
          <button type="button" class="std-icon-btn std-icon-danger" data-nut-shop-delete="${i.id}" aria-label="${t('Delete')}">\u2715</button>
        </label>
      `).join('') : emptyStateHtml('cart', t('Add ingredients to planned meals, then generate your list here.'))}
    </div>
  `;
}

function generateShoppingList() {
  const upcoming = currentData.meals.filter((m) => m.date && m.date >= nutToday() && m.ingredients);
  const existing = new Set(currentData.shoppingList.map((i) => i.item.toLowerCase()));
  const added = new Set();
  upcoming.forEach((m) => {
    m.ingredients.split(',').map((s) => s.trim()).filter(Boolean).forEach((ing) => {
      const key = ing.toLowerCase();
      if (existing.has(key) || added.has(key)) return;
      added.add(key);
      currentData.shoppingList.push({ id: makeId(), item: ing, checked: false });
    });
  });
  persist();
  renderNutritionRoot();
  showToast(added.size ? `${added.size} ${t('items added')}` : t('Nothing new to add \u2014 add ingredients to planned meals first'), added.size ? 'success' : 'default');
}

// ─── Weight history (shared with Workout's body measurements) ─────────────
function weightHistoryHtml() {
  const items = [...currentData.bodyMeasurements].filter((m) => m.weight).sort((a, b) => a.date.localeCompare(b.date));
  const latest = items[items.length - 1];
  return `
    <p class="eyebrow">${t('Shared with Workout \u2192 Body measurements')}</p>
    <h2>${t('Weight history')}</h2>
    ${latest ? `<p class="muted">${t('Latest')}: ${latest.weight}kg (${escapeHtml(latest.date)})</p>` : ''}
    ${items.length > 1 ? buildSimpleLineChart(items.map((m) => Number(m.weight))) : emptyStateHtml('chart', t('Log your weight from the Workout page to see a trend here.'))}
  `;
}

function buildSimpleLineChart(series) {
  const w = 320, h = 100, pad = 10;
  const max = Math.max(...series), min = Math.min(...series);
  const span = max - min || 1;
  const pts = series.map((v, i) => {
    const x = pad + (i / (series.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / span) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return `<svg class="stats-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="${t('Weight trend')}"><polyline points="${pts}" fill="none" stroke="var(--purple)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" /></svg>`;
}

// ─── Events ─────────────────────────────────────────────────────────────────
function bindNutritionRootEvents(root) {
  root.querySelector('[data-nut-add]').addEventListener('click', () => openMealModal(null, nutToday()));
  root.querySelectorAll('[data-nut-edit]').forEach((btn) => btn.addEventListener('click', () => openMealModal(btn.dataset.nutEdit)));
  root.querySelectorAll('[data-nut-delete]').forEach((btn) => btn.addEventListener('click', () => deleteMeal(btn.dataset.nutDelete)));
  root.querySelectorAll('[data-nut-plan]').forEach((btn) => btn.addEventListener('click', () => openMealModal(null, btn.dataset.nutPlan)));

  const genBtn = root.querySelector('[data-nut-shop-generate]');
  if (genBtn) genBtn.addEventListener('click', generateShoppingList);
  const clearBtn = root.querySelector('[data-nut-shop-clear]');
  if (clearBtn) clearBtn.addEventListener('click', () => {
    currentData.shoppingList = currentData.shoppingList.filter((i) => !i.checked);
    persist();
    renderNutritionRoot();
  });
  root.querySelectorAll('[data-nut-shop-toggle]').forEach((el) => el.addEventListener('change', () => {
    const item = currentData.shoppingList.find((i) => i.id === el.dataset.nutShopToggle);
    if (item) { item.checked = !item.checked; persist(); renderNutritionRoot(); }
  }));
  root.querySelectorAll('[data-nut-shop-delete]').forEach((btn) => btn.addEventListener('click', () => {
    currentData.shoppingList = currentData.shoppingList.filter((i) => i.id !== btn.dataset.nutShopDelete);
    persist();
    renderNutritionRoot();
  }));
  root.querySelector('[data-health-water-form]')?.addEventListener('submit', (e) => {
    e.preventDefault(); const glasses = Number(new FormData(e.currentTarget).get('glasses')) || 0;
    if (!glasses) return; currentData.water.push({ id: makeId(), glasses, date: nutToday() }); addNotification('Nutrition', `${glasses} ${t('glasses')} ${t('of water logged')}`); renderNutritionRoot();
  });
  root.querySelector('[data-health-sleep-form]')?.addEventListener('submit', (e) => {
    e.preventDefault(); const fd = new FormData(e.currentTarget); const hours = Number(fd.get('hours'));
    if (!Number.isFinite(hours)) return; currentData.sleep.push({ id: makeId(), hours, quality: String(fd.get('quality')), date: nutToday() }); addNotification('Nutrition', `${hours} ${t('hours')} ${t('of sleep logged')}`); renderNutritionRoot();
  });
  root.querySelector('[data-health-body-form]')?.addEventListener('submit', (e) => {
    e.preventDefault(); const fd = new FormData(e.currentTarget); const weight = Number(fd.get('weight'));
    if (!weight) return; currentData.bodyMeasurements.push({ id: makeId(), weight, waist: Number(fd.get('waist')) || 0, date: nutToday() }); addNotification('Nutrition', t('Body measurement saved')); renderNutritionRoot();
  });
  root.querySelector('[data-health-goals-form]')?.addEventListener('submit', (e) => {
    e.preventDefault(); const fd = new FormData(e.currentTarget);
    ['calorieTarget', 'proteinTarget', 'carbTarget', 'fatTarget'].forEach((key) => { currentData.settings[key] = Number(fd.get(key)) || 0; });
    persist(); renderNutritionRoot();
  });
}

function deleteMeal(id) {
  currentData.meals = currentData.meals.filter((m) => m.id !== id);
  persist();
  renderNutritionRoot();
}

function openMealModal(id, defaultDate) {
  nutritionState.modal = id || 'new';
  nutritionState.defaultDate = defaultDate || nutToday();
  renderMealModal();
}
function closeMealModal() {
  nutritionState.modal = null;
  const el = document.querySelector('[data-nut-modal]');
  if (el) el.remove();
}

function renderMealModal() {
  const existing = document.querySelector('[data-nut-modal]');
  if (existing) existing.remove();
  if (!nutritionState.modal) return;
  const editing = nutritionState.modal === 'new' ? null : currentData.meals.find((m) => m.id === nutritionState.modal);

  document.body.insertAdjacentHTML('beforeend', `
    <div class="td-modal-overlay" data-nut-modal role="dialog" aria-modal="true" aria-label="${editing ? t('Edit meal') : t('New meal')}">
      <div class="td-modal-backdrop" data-nut-modal-close></div>
      <div class="panel td-modal-card">
        <div class="td-modal-head">
          <div><p class="eyebrow">${editing ? t('Edit') : t('New')}</p><h2>${t('Meal')}</h2></div>
          <button type="button" class="std-icon-btn" data-nut-modal-close aria-label="${t('Close')}">\u2715</button>
        </div>
        <form class="form-stack" data-nut-form novalidate>
          <label class="full-field">${t('Meal name')}
            <input type="text" name="title" required value="${escapeAttr(editing?.title || '')}" />
          </label>
          <div class="form-grid">
            <label>${t('Type')}
              <select name="type">${MEAL_TYPES.map((tp) => `<option ${((editing?.type) || 'Snack') === tp ? 'selected' : ''}>${t(tp)}</option>`).join('')}</select>
            </label>
            <label>${t('Date')}<input type="date" name="date" value="${escapeAttr(editing?.date || nutritionState.defaultDate || nutToday())}" required /></label>
            <label>${t('Calories')}<input type="number" min="0" name="calories" value="${editing?.calories || ''}" /></label>
            <label>${t('Protein (g)')}<input type="number" min="0" name="protein" value="${editing?.protein || ''}" /></label>
            <label>${t('Carbs (g)')}<input type="number" min="0" name="carbs" value="${editing?.carbs || ''}" /></label>
            <label>${t('Fat (g)')}<input type="number" min="0" name="fat" value="${editing?.fat || ''}" /></label>
          </div>
          <label class="full-field">${t('Ingredients (comma separated \u2014 powers the shopping list)')}
            <textarea name="ingredients" placeholder="${t('chicken breast, rice, broccoli')}">${escapeHtml(editing?.ingredients || '')}</textarea>
          </label>
          <div class="td-modal-actions">
            ${editing ? `<button type="button" class="danger-btn" data-nut-modal-delete>${t('Delete')}</button>` : '<span></span>'}
            <div class="td-modal-actions-right">
              <button type="button" class="secondary-btn" data-nut-modal-close>${t('Cancel')}</button>
              <button type="submit" class="primary-btn">${t('Save')}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  `);

  const overlay = document.querySelector('[data-nut-modal]');
  overlay.querySelectorAll('[data-nut-modal-close]').forEach((b) => b.addEventListener('click', closeMealModal));
  const delBtn = overlay.querySelector('[data-nut-modal-delete]');
  if (delBtn) delBtn.addEventListener('click', () => { deleteMeal(editing.id); closeMealModal(); });

  overlay.querySelector('[data-nut-form]').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get('title') || '').trim();
    if (!title) return;
    const data = {
      title,
      type: String(fd.get('type') || 'Snack'),
      date: String(fd.get('date') || nutToday()),
      calories: Number(fd.get('calories')) || 0,
      protein: Number(fd.get('protein')) || 0,
      carbs: Number(fd.get('carbs')) || 0,
      fat: Number(fd.get('fat')) || 0,
      ingredients: String(fd.get('ingredients') || ''),
    };
    if (editing) {
      Object.assign(editing, data);
    } else {
      currentData.meals.push({ id: makeId(), ...data });
      addNotification('Nutrition', `${t('Meal logged')}: ${title}`);
    }
    persist();
    closeMealModal();
    renderNutritionRoot();
  });
}
