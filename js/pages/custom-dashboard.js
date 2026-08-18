// js/pages/custom-dashboard.js — Phase 8: the Custom Dashboard grid.
//
// Renders into the self-contained #custom-dashboard-root section added to
// dashboard.html (a new addition, not a rewrite of the existing fixed
// dashboard content in #data-list, which is untouched).
//
// PERFORMANCE-CONSCIOUS DESIGN (see NOTIFICATION_CENTER-style honesty in
// the deliverables doc): each widget is mounted (its render() called) ONCE
// and its DOM node kept alive across drag/resize/collapse — only ADDING or
// REMOVING a widget from view unmounts/mounts that ONE widget. Dragging to
// reorder physically moves the existing DOM node rather than re-rendering
// the whole grid, so a live widget (Todo, Weather, Notifications) never
// tears down its subscription just because the user rearranged something
// else on the board.
import { getAllWidgets, getWidget } from '../../core/WidgetRegistry.js';
import { DashboardLayoutService, DEFAULT_LAYOUT } from '../../services/DashboardLayoutService.js';
import { AuthService } from '../../services/AuthService.js';
import { TodoRepository } from '../../repositories/TodoRepository.js';
import '../dashboard-widget-defs.js'; // populates the registry as a side effect — import order matters here

/** @type {import('../../services/DashboardLayoutService.js').DashboardLayout} */
let layout = DEFAULT_LAYOUT;
/** @type {Map<string, () => void>} widgetId -> cleanup/unsubscribe */
const mounted = new Map();
let uid = null;
let dragId = null;
let saveTimer = null;
let layoutUnsubscribe = null;

document.addEventListener('DOMContentLoaded', async () => {
  const root = document.getElementById('custom-dashboard-root');
  if (!root) return;

  await AuthService.waitUntilReady();
  const user = AuthService.getCurrentUser();
  if (!user) {
    root.innerHTML = emptyStateHtml('lock', t ? t('Sign in to build your custom dashboard.') : 'Sign in to build your custom dashboard.');
    return;
  }
  uid = user.uid;

  const result = await DashboardLayoutService.getLayout(uid);
  layout = result.ok ? result.data : DEFAULT_LAYOUT;
  renderShell(root, user);

  // Cross-device sync: a layout change made elsewhere updates the
  // personalization/order here too. Widget content itself isn't touched by
  // this — only re-applies personalization CSS vars and, if the widget SET
  // genuinely differs (added/removed elsewhere), reconciles the grid.
  if (!layoutUnsubscribe) {
    layoutUnsubscribe = DashboardLayoutService.subscribeLayout(uid, (remoteLayout) => {
      layout = remoteLayout;
      applyPersonalization(root);
      reconcileWidgetSet(root, user);
    });
  }
});

function disposeCustomDashboard() {
  if (layoutUnsubscribe) {
    layoutUnsubscribe();
    layoutUnsubscribe = null;
  }
  [...mounted.keys()].forEach((id) => {
    unmountWidget(id);
  });
  clearTimeout(saveTimer);
}
window.addEventListener('beforeunload', disposeCustomDashboard);

function persistLayout() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => DashboardLayoutService.saveLayout(uid, layout), 400);
}

function renderShell(root, user) {
  const toolbar = document.createElement('div');
  toolbar.className = 'cdash-toolbar';

  const quickActions = document.createElement('div');
  quickActions.className = 'cdash-quick-actions';
  quickActions.dataset.cdashQuickActions = '';
  quickActions.innerHTML = quickActionsHtml();

  const toolbarActions = document.createElement('div');
  toolbarActions.className = 'cdash-toolbar-actions';

  const addWidgetButton = document.createElement('button');
  addWidgetButton.type = 'button';
  addWidgetButton.className = 'secondary-btn';
  addWidgetButton.dataset.cdashAddWidget = '';
  addWidgetButton.textContent = `+ ${t ? t('Add Widget') : 'Add Widget'}`;

  const personalizeButton = document.createElement('button');
  personalizeButton.type = 'button';
  personalizeButton.className = 'text-btn';
  personalizeButton.dataset.cdashPersonalize = '';
  personalizeButton.textContent = t ? t('Personalize') : 'Personalize';

  const grid = document.createElement('div');
  grid.className = 'cdash-grid';
  grid.dataset.cdashGrid = '';

  toolbarActions.append(addWidgetButton, personalizeButton);
  toolbar.append(quickActions, toolbarActions);
  root.replaceChildren(toolbar, grid);

  bindQuickActions(root, user);
  addWidgetButton.addEventListener('click', () => openWidgetStore(root, user));
  personalizeButton.addEventListener('click', () => openPersonalizationPanel(root));

  applyPersonalization(root);
  mountAllVisibleWidgets(root, user);
}

// ─── Grid / widget mounting ─────────────────────────────────────────────────
function visiblePlacements() {
  return [...layout.widgets].filter((w) => !w.hidden).sort((a, b) => a.order - b.order);
}

function mountAllVisibleWidgets(root, user) {
  const grid = root.querySelector('[data-cdash-grid]');
  const placements = visiblePlacements();
  if (!placements.length) {
    grid.innerHTML = onboardingHtml();
    bindOnboarding(root, user);
    return;
  }
  grid.innerHTML = '';
  placements.forEach((placement) => grid.appendChild(buildWidgetCard(placement, user)));
}

/** Reconciles the grid's DOM against `layout.widgets` after a remote (cross-device) change, without touching widgets that are already mounted and unchanged. */
function reconcileWidgetSet(root, user) {
  const grid = root.querySelector('[data-cdash-grid]');
  if (!grid) return;
  const placements = visiblePlacements();
  const wantedIds = new Set(placements.map((p) => p.widgetId));

  // Unmount widgets no longer wanted.
  [...mounted.keys()].forEach((id) => {
    if (!wantedIds.has(id)) { unmountWidget(id); grid.querySelector(`[data-widget-card="${id}"]`)?.remove(); }
  });
  // Mount newly-added widgets.
  placements.forEach((placement) => {
    if (!mounted.has(placement.widgetId)) grid.appendChild(buildWidgetCard(placement, user));
  });
  if (!placements.length) { grid.innerHTML = onboardingHtml(); bindOnboarding(root, user); }
}

function buildWidgetCard(placement, user) {
  const def = getWidget(placement.widgetId);
  if (!def) return document.createComment(`unknown widget: ${placement.widgetId}`);

  const card = document.createElement('article');
  card.className = `cdash-widget cdash-size-${placement.size}${placement.pinned ? ' is-pinned' : ''}${placement.collapsed ? ' is-collapsed' : ''}`;
  card.dataset.widgetCard = def.id;
  card.draggable = true;
  card.innerHTML = `
    <header class="cdash-widget-head">
      <span class="cdash-widget-icon" aria-hidden="true">${def.icon}</span>
      <h3>${t ? t(def.title) : def.title}</h3>
      <div class="cdash-widget-actions">
        <button type="button" class="std-icon-btn" data-cdash-collapse title="${t ? t('Collapse/Expand') : 'Collapse/Expand'}">${placement.collapsed ? '\u25be' : '\u25b4'}</button>
        <button type="button" class="std-icon-btn" data-cdash-resize title="${t ? t('Resize') : 'Resize'}">\u2922</button>
        <button type="button" class="std-icon-btn" data-cdash-pin title="${t ? t('Pin') : 'Pin'}">${placement.pinned ? '\u2605' : '\u2606'}</button>
        <button type="button" class="std-icon-btn std-icon-danger" data-cdash-hide title="${t ? t('Hide') : 'Hide'}">\u2715</button>
      </div>
    </header>
    <div class="cdash-widget-body" data-widget-body></div>
    ${def.dataSource === 'local-snapshot' ? '' : ''}
  `;

  const body = card.querySelector('[data-widget-body]');
  const cleanup = def.render({ root: body, user, size: placement.size, compactMode: !!layout.personalization.compactMode });
  if (typeof cleanup === 'function') mounted.set(def.id, cleanup);
  else mounted.set(def.id, () => {});

  bindWidgetCardEvents(card, def.id);
  return card;
}

function unmountWidget(id) {
  mounted.get(id)?.();
  mounted.delete(id);
}

function bindWidgetCardEvents(card, widgetId) {
  card.addEventListener('dragstart', () => { dragId = widgetId; card.classList.add('is-dragging'); });
  card.addEventListener('dragend', () => { card.classList.remove('is-dragging'); dragId = null; });
  card.addEventListener('dragover', (e) => { e.preventDefault(); card.classList.add('cdash-drop-hover'); });
  card.addEventListener('dragleave', () => card.classList.remove('cdash-drop-hover'));
  card.addEventListener('drop', (e) => {
    e.preventDefault();
    card.classList.remove('cdash-drop-hover');
    if (!dragId || dragId === widgetId) return;
    reorderByDom(card, dragId);
  });

  card.querySelector('[data-cdash-collapse]').addEventListener('click', () => {
    const p = layout.widgets.find((w) => w.widgetId === widgetId);
    p.collapsed = !p.collapsed;
    card.classList.toggle('is-collapsed', p.collapsed);
    card.querySelector('[data-cdash-collapse]').textContent = p.collapsed ? '\u25be' : '\u25b4';
    persistLayout();
  });
  card.querySelector('[data-cdash-resize]').addEventListener('click', () => {
    const def = getWidget(widgetId);
    const p = layout.widgets.find((w) => w.widgetId === widgetId);
    const sizes = def.allowedSizes;
    p.size = sizes[(sizes.indexOf(p.size) + 1) % sizes.length];
    card.className = card.className.replace(/cdash-size-\w+/, `cdash-size-${p.size}`);
    persistLayout();
  });
  card.querySelector('[data-cdash-pin]').addEventListener('click', () => {
    const p = layout.widgets.find((w) => w.widgetId === widgetId);
    p.pinned = !p.pinned;
    card.classList.toggle('is-pinned', p.pinned);
    card.querySelector('[data-cdash-pin]').textContent = p.pinned ? '\u2605' : '\u2606';
    persistLayout();
  });
  card.querySelector('[data-cdash-hide]').addEventListener('click', () => {
    const p = layout.widgets.find((w) => w.widgetId === widgetId);
    p.hidden = true;
    unmountWidget(widgetId);
    card.remove();
    persistLayout();
    if (!visiblePlacements().length) {
      const root = document.getElementById('custom-dashboard-root');
      const grid = root.querySelector('[data-cdash-grid]');
      grid.innerHTML = onboardingHtml();
      bindOnboarding(root, AuthService.getCurrentUser());
    }
    if (typeof showToast === 'function') {
      showToast(t ? t('Widget hidden.') : 'Widget hidden.', 'default', 6000, {
        onUndo: () => { p.hidden = false; persistLayout(); const grid2 = document.querySelector('[data-cdash-grid]'); grid2.appendChild(buildWidgetCard(p, AuthService.getCurrentUser())); },
      });
    }
  });
}

/** Physically moves the dragged card's DOM node before/after the drop target — no widget is unmounted or re-rendered. */
function reorderByDom(targetCard, draggedId) {
  const grid = targetCard.parentElement;
  const draggedCard = grid.querySelector(`[data-widget-card="${draggedId}"]`);
  if (!draggedCard) return;
  const cards = [...grid.children];
  const targetIdx = cards.indexOf(targetCard);
  const draggedIdx = cards.indexOf(draggedCard);
  if (draggedIdx < targetIdx) grid.insertBefore(draggedCard, targetCard.nextSibling);
  else grid.insertBefore(draggedCard, targetCard);

  // Persist the new order from the DOM's actual current order.
  [...grid.children].forEach((el, i) => {
    const id = el.dataset?.widgetCard;
    const p = id && layout.widgets.find((w) => w.widgetId === id);
    if (p) p.order = i;
  });
  persistLayout();
}

// ─── Personalization ────────────────────────────────────────────────────────
function applyPersonalization(root) {
  const p = layout.personalization;
  root.style.setProperty('--cdash-radius', p.cornerRadius === 'sharp' ? '4px' : p.cornerRadius === 'round' ? '20px' : '12px');
  root.style.setProperty('--cdash-transparency', String(1 - (p.transparency || 0) / 100));
  if (p.accentColor) root.style.setProperty('--cdash-accent', p.accentColor);
  else root.style.removeProperty('--cdash-accent');
  root.classList.toggle('cdash-compact', !!p.compactMode);
  root.classList.toggle('cdash-no-animations', !p.animations);
}

function openPersonalizationPanel(root) {
  const p = layout.personalization;
  const overlay = document.createElement('div');
  overlay.className = 'cdash-modal-overlay';
  overlay.innerHTML = `
    <div class="cdash-modal-backdrop" data-cdash-modal-close></div>
    <div class="panel cdash-modal-card">
      <h2>${t ? t('Personalize') : 'Personalize'}</h2>
      <label class="full-field">${t ? t('Accent color') : 'Accent color'}
        <input type="color" data-cdash-accent value="${escapeAttr(p.accentColor || '#2563eb')}" />
      </label>
      <label class="full-field">${t ? t('Corner radius') : 'Corner radius'}
        <select data-cdash-radius>
          <option value="sharp" ${p.cornerRadius === 'sharp' ? 'selected' : ''}>${t ? t('Sharp') : 'Sharp'}</option>
          <option value="md" ${p.cornerRadius === 'md' ? 'selected' : ''}>${t ? t('Medium') : 'Medium'}</option>
          <option value="round" ${p.cornerRadius === 'round' ? 'selected' : ''}>${t ? t('Round') : 'Round'}</option>
        </select>
      </label>
      <label class="full-field">${t ? t('Transparency') : 'Transparency'}
        <input type="range" min="0" max="80" data-cdash-transparency value="${p.transparency || 0}" />
      </label>
      <label class="cdash-toggle-row"><span>${t ? t('Compact mode') : 'Compact mode'}</span><input type="checkbox" data-cdash-compact ${p.compactMode ? 'checked' : ''} /></label>
      <label class="cdash-toggle-row"><span>${t ? t('Animations') : 'Animations'}</span><input type="checkbox" data-cdash-animations ${p.animations !== false ? 'checked' : ''} /></label>
      <button type="button" class="secondary-btn" data-cdash-modal-close>${t ? t('Done') : 'Done'}</button>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelectorAll('[data-cdash-modal-close]').forEach((el) => el.addEventListener('click', () => overlay.remove()));

  const set = (patch) => { layout.personalization = { ...layout.personalization, ...patch }; applyPersonalization(root); persistLayout(); };
  overlay.querySelector('[data-cdash-accent]').addEventListener('input', (e) => set({ accentColor: e.target.value }));
  overlay.querySelector('[data-cdash-radius]').addEventListener('change', (e) => set({ cornerRadius: e.target.value }));
  overlay.querySelector('[data-cdash-transparency]').addEventListener('input', (e) => set({ transparency: Number(e.target.value) }));
  overlay.querySelector('[data-cdash-compact]').addEventListener('change', (e) => set({ compactMode: e.target.checked }));
  overlay.querySelector('[data-cdash-animations]').addEventListener('change', (e) => set({ animations: e.target.checked }));
}

// ─── Widget store ("Add Widget" dialog) with search ────────────────────────
function openWidgetStore(root, user) {
  const overlay = document.createElement('div');
  overlay.className = 'cdash-modal-overlay';
  const renderList = (query) => {
    const visibleIds = new Set(layout.widgets.filter((w) => !w.hidden).map((w) => w.widgetId));
    const all = getAllWidgets().filter((w) => !visibleIds.has(w.id));
    const filtered = query.trim() ? all.filter((w) => w.title.toLowerCase().includes(query.trim().toLowerCase())) : all;
    return filtered.length
      ? filtered.map((w) => `
        <button type="button" class="cdash-store-item" data-cdash-store-add="${w.id}">
          <span aria-hidden="true">${w.icon}</span>
          <span>${t ? t(w.title) : w.title}</span>
        </button>
      `).join('')
      : `<p class="widget-empty-row">${t ? t('No matching widgets.') : 'No matching widgets.'}</p>`;
  };
  overlay.innerHTML = `
    <div class="cdash-modal-backdrop" data-cdash-modal-close></div>
    <div class="panel cdash-modal-card">
      <h2>${t ? t('Add Widget') : 'Add Widget'}</h2>
      <input type="search" class="full-field" placeholder="${t ? t('Search widgets') : 'Search widgets'}" data-cdash-store-search />
      <div class="cdash-store-list" data-cdash-store-list>${renderList('')}</div>
      <button type="button" class="secondary-btn" data-cdash-modal-close>${t ? t('Close') : 'Close'}</button>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelectorAll('[data-cdash-modal-close]').forEach((el) => el.addEventListener('click', () => overlay.remove()));

  const list = overlay.querySelector('[data-cdash-store-list]');
  const bindAddButtons = () => list.querySelectorAll('[data-cdash-store-add]').forEach((btn) => btn.addEventListener('click', () => {
    addWidgetToLayout(root, user, btn.dataset.cdashStoreAdd);
    overlay.remove();
  }));
  bindAddButtons();
  overlay.querySelector('[data-cdash-store-search]').addEventListener('input', (e) => { list.innerHTML = renderList(e.target.value); bindAddButtons(); });
}

function addWidgetToLayout(root, user, widgetId) {
  const def = getWidget(widgetId);
  if (!def) return;
  let placement = layout.widgets.find((w) => w.widgetId === widgetId);
  if (placement) placement.hidden = false;
  else {
    placement = { widgetId, order: layout.widgets.length, size: def.defaultSize, hidden: false, pinned: false, collapsed: false };
    layout.widgets.push(placement);
  }
  persistLayout();
  const grid = root.querySelector('[data-cdash-grid]');
  if (!mounted.has(widgetId)) {
    if (grid.querySelector('.cdash-onboarding')) grid.innerHTML = '';
    grid.appendChild(buildWidgetCard(placement, user));
  }
}

// ─── Onboarding / empty state ───────────────────────────────────────────────
function onboardingHtml() {
  const suggestions = ['todo', 'habits', 'weather'].map((id) => getWidget(id)).filter(Boolean);
  return `
    <div class="cdash-onboarding">
      <p class="eyebrow">${t ? t('Your dashboard is empty') : 'Your dashboard is empty'}</p>
      <h3>${t ? t('Add a widget to get started') : 'Add a widget to get started'}</h3>
      <div class="cdash-onboarding-suggestions">
        ${suggestions.map((w) => `<button type="button" class="secondary-btn" data-cdash-onboard-add="${w.id}"><span aria-hidden="true">${w.icon}</span> ${t ? t(w.title) : w.title}</button>`).join('')}
      </div>
    </div>
  `;
}
function bindOnboarding(root, user) {
  root.querySelectorAll('[data-cdash-onboard-add]').forEach((btn) => btn.addEventListener('click', () => addWidgetToLayout(root, user, btn.dataset.cdashOnboardAdd)));
}

// ─── Quick actions ───────────────────────────────────────────────────────────
function quickActionsHtml() {
  return `
    <button type="button" class="secondary-btn" data-cdash-quick="todo">+ ${t ? t('Quick Add Todo') : 'Quick Add Todo'}</button>
    <button type="button" class="secondary-btn" data-cdash-quick="habit">+ ${t ? t('Quick Habit') : 'Quick Habit'}</button>
    <button type="button" class="secondary-btn" data-cdash-quick="goal">+ ${t ? t('Quick Goal') : 'Quick Goal'}</button>
    <button type="button" class="secondary-btn" data-cdash-quick="workout">+ ${t ? t('Quick Workout') : 'Quick Workout'}</button>
    <button type="button" class="secondary-btn" data-cdash-quick="study">+ ${t ? t('Quick Study') : 'Quick Study'}</button>
    <button type="button" class="secondary-btn" data-cdash-quick="note">+ ${t ? t('Quick Note') : 'Quick Note'}</button>
  `;
}

/** Deep-link map for quick actions on modules not yet migrated to Firestore — see js/dashboard-widget-defs.js's header for which modules that is. */
const QUICK_ACTION_PAGES = { habit: '../pages/habits.html', goal: '../pages/goals.html', workout: '../pages/workout.html', study: '../pages/study.html' };

function bindQuickActions(root, user) {
  root.querySelectorAll('[data-cdash-quick]').forEach((btn) => btn.addEventListener('click', async () => {
    const kind = btn.dataset.cdashQuick;
    if (kind === 'todo') {
      const title = window.prompt(t ? t('Quick task title') : 'Quick task title');
      if (!title || !title.trim()) return;
      await new TodoRepository(user.uid).create({ title: title.trim(), completed: false, priority: 'Medium', tags: [], dueDate: '', time: '', dependsOn: [], subtasks: [], attachments: [] });
      if (typeof showToast === 'function') showToast(t ? t('Task added.') : 'Task added.', 'success');
      return;
    }
    if (kind === 'note') {
      const grid = root.querySelector('[data-cdash-grid]');
      const notesCard = grid.querySelector('[data-widget-card="quick-notes"]');
      if (notesCard) { notesCard.scrollIntoView({ behavior: layout.personalization.animations ? 'smooth' : 'auto', block: 'center' }); notesCard.querySelector('textarea')?.focus(); }
      else addWidgetToLayout(root, user, 'quick-notes');
      return;
    }
    // Habit/Goal/Workout/Study: their modules aren't Firestore-migrated yet
    // (see file header), so a "quick add" here can't safely call into
    // habits.js/goals.js's internal state from this page — it deep-links to
    // the real page instead of faking a save that wouldn't persist correctly.
    window.location.href = QUICK_ACTION_PAGES[kind];
  }));
}
