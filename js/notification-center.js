// js/notification-center.js — Phase 7: Smart Notification Center.
//
// IMPORTANT — builds on, does not replace, the existing UI: shared.js
// already renders a notification bell + panel in every page's topbar
// (notificationCenterHtml()/bindNotificationCenter()), backed by the old
// local currentData.notificationCenter array. That bell is already
// "always visible, sticky while scrolling, keyboard accessible, dark/light
// mode, responsive" — see css/momentum-theme.css. Per this phase's brief
// ("Do NOT redesign the application. Build ONLY the Notification Center."),
// this module does NOT introduce a second bell/panel. Instead, once a real
// Firebase Auth session exists (see AUTHENTICATION.md), it takes over
// rendering the SAME panel element's contents with the richer feature set
// (tabs, search, pin/archive, smart actions, realtime Firestore sync) and
// updates the SAME bell's badge count. If there is no Firebase session yet
// (still the common case today — see NOTIFICATION_CENTER.md), this module
// does nothing and the original local system keeps working exactly as
// before — a deliberate, graceful fallback, not an accident.
// Keep Firebase out of the initial page graph. The legacy notification UI is
// already rendered by shared.js, and this enhancement only needs Firebase
// after the document is interactive and an authenticated session exists.
let NotificationRepository;
let AuthService;
let UserService;
let undoManager;
let searchText;

const CATEGORIES = ['Todo', 'Habit', 'Goal', 'Workout', 'Nutrition', 'Study', 'Prayer', 'Weather', 'Achievements', 'System', 'Security', 'Account', 'Backup'];
const DEFAULT_SETTINGS = {
  categories: Object.fromEntries(CATEGORIES.map((c) => [c, true])),
  sound: false, vibration: false, desktop: false,
};

let repo = null;
let latestItems = [];
let settings = DEFAULT_SETTINGS;
let unsubscribeItems = null;
let unsubscribeSettings = null;
const state = { tab: 'unread', search: '', category: 'all', settingsOpen: false };

document.addEventListener('DOMContentLoaded', async () => {
  const [repositoryModule, authModule, userModule, undoModule, queryModule] = await Promise.all([
    import('../repositories/NotificationRepository.js'),
    import('../services/AuthService.js'),
    import('../services/UserService.js'),
    import('../core/UndoManager.js'),
    import('../utils/QueryUtils.js'),
  ]);
  ({ NotificationRepository } = repositoryModule);
  ({ AuthService } = authModule);
  ({ UserService } = userModule);
  ({ undoManager } = undoModule);
  ({ searchText } = queryModule);

  await AuthService.waitUntilReady();
  const user = AuthService.getCurrentUser();
  if (!user) return; // graceful fallback — see file header

  repo = new NotificationRepository(user.uid);

  // Re-apply our content on top of the base bell/panel markup every time
  // shared.js's refreshChrome() re-renders the topbar (theme/language
  // switch, sidebar collapse, etc.) — otherwise our content would be wiped
  // back to the empty local-only version until the next Firestore update.
  // This is a deliberate, minimal function-wrap rather than a change to
  // shared.js itself, per "do not redesign the application."
  const baseRefreshChrome = window.refreshChrome;
  if (typeof baseRefreshChrome === 'function' && !window.__notificationCenterPatched) {
    window.__notificationCenterPatched = true;
    window.refreshChrome = function patchedRefreshChrome(...args) {
      baseRefreshChrome.apply(this, args);
      renderPanel();
    };
  }

  unsubscribeItems = repo.subscribe(
    (items) => { latestItems = items; renderPanel(); },
    (mappedError) => console.warn('[notification-center]', mappedError.message),
    { orderBy: ['createdAt', 'desc'], limit: 200 }
  );

  unsubscribeSettings = UserService.subscribeProfile(user.uid, (profile) => {
    settings = { ...DEFAULT_SETTINGS, ...(profile?.notificationSettings || {}), categories: { ...DEFAULT_SETTINGS.categories, ...(profile?.notificationSettings?.categories || {}) } };
    renderPanel();
  });

  window.addEventListener('beforeunload', () => { unsubscribeItems?.(); unsubscribeSettings?.(); }, { once: true });
});

function todayKey(d) { return new Date(d).toDateString(); }
function groupLabel(createdAt) {
  const date = toDate(createdAt);
  const today = todayKey(Date.now());
  const yesterday = todayKey(Date.now() - 86400000);
  const key = todayKey(date);
  if (key === today) return t ? t('Today') : 'Today';
  if (key === yesterday) return t ? t('Yesterday') : 'Yesterday';
  return t ? t('Earlier') : 'Earlier';
}
function toDate(createdAt) {
  if (createdAt && typeof createdAt.toDate === 'function') return createdAt.toDate(); // Firestore Timestamp
  return new Date(createdAt || Date.now());
}

function visibleItems() {
  let items = latestItems.filter((n) => n.category ? settings.categories[n.category] !== false : true);
  if (state.tab === 'unread') items = items.filter((n) => !n.read && !n.archived);
  else if (state.tab === 'read') items = items.filter((n) => n.read && !n.archived);
  else if (state.tab === 'archived') items = items.filter((n) => n.archived);
  else if (state.tab === 'pinned') items = items.filter((n) => n.pinned && !n.archived);
  if (state.category !== 'all') items = items.filter((n) => n.category === state.category);
  if (state.search.trim()) items = searchText(items, state.search, ['message', 'category']);
  return items;
}

function renderPanel() {
  const bell = document.getElementById('notification-bell');
  const panel = document.getElementById('notification-panel');
  if (!bell || !panel) return; // page's topbar hasn't rendered yet, or has no chrome (e.g. auth page)

  const unreadCount = latestItems.filter((n) => !n.read && !n.archived).length;
  let badge = bell.querySelector('b');
  if (unreadCount > 0) {
    if (!badge) { badge = document.createElement('b'); bell.appendChild(badge); }
    badge.setAttribute('aria-label', `${unreadCount} unread`);
    badge.textContent = unreadCount > 99 ? '99+' : String(unreadCount);
  } else if (badge) {
    badge.remove();
  }

  const items = visibleItems();
  const groups = groupByDate(items);

  panel.innerHTML = `
    <header>
      <div><p class="eyebrow">${t ? t('Updates') : 'Updates'}</p><h2>${t ? t('Notifications') : 'Notifications'}</h2></div>
      <div class="notification-header-actions">
        <button class="text-btn" type="button" data-nc-settings aria-label="${t ? t('Notification settings') : 'Notification settings'}">\u2699\ufe0f</button>
      </div>
    </header>
    ${state.settingsOpen ? settingsPanelHtml() : mainPanelHtml(groups)}
  `;

  bindPanelEvents(panel);
}

function mainPanelHtml(groups) {
  const tabs = [['unread', t ? t('Unread') : 'Unread'], ['read', t ? t('Read') : 'Read'], ['pinned', t ? t('Pinned') : 'Pinned'], ['archived', t ? t('Archived') : 'Archived']];
  return `
    <div class="notification-tools">
      <button class="text-btn" type="button" data-nc-mark-all-read>${t ? t('Mark all read') : 'Mark all read'}</button>
    </div>
    <div class="notification-tabs" role="tablist">
      ${tabs.map(([id, label]) => `<button type="button" class="notification-tab${state.tab === id ? ' active' : ''}" data-nc-tab="${id}" role="tab" aria-selected="${state.tab === id}">${label}</button>`).join('')}
    </div>
    <div class="notification-filter-row">
      <input type="search" class="notification-search" placeholder="${t ? t('Search notifications') : 'Search notifications'}" value="${escapeAttr(state.search)}" data-nc-search aria-label="${t ? t('Search notifications') : 'Search notifications'}" />
      <select class="notification-category-select" data-nc-category aria-label="${t ? t('Filter by category') : 'Filter by category'}">
        <option value="all" ${state.category === 'all' ? 'selected' : ''}>${t ? t('All categories') : 'All categories'}</option>
        ${CATEGORIES.map((c) => `<option value="${c}" ${state.category === c ? 'selected' : ''}>${t ? t(c) : c}</option>`).join('')}
      </select>
    </div>
    <div class="notification-list">
      ${groups.length ? groups.map(([label, items]) => `
        <div class="notification-group">
          <p class="notification-group-label">${label}</p>
          ${items.map(notificationItemHtml).join('')}
        </div>
      `).join('') : `<p class="notification-empty">${t ? t('You are all caught up.') : 'You are all caught up.'}</p>`}
    </div>
  `;
}

function groupByDate(items) {
  const order = [];
  const map = new Map();
  items.forEach((item) => {
    const label = groupLabel(item.createdAt);
    if (!map.has(label)) { map.set(label, []); order.push(label); }
    map.get(label).push(item);
  });
  return order.map((label) => [label, map.get(label)]);
}

function notificationItemHtml(item) {
  const action = item.action && item.deepLink
    ? `<button type="button" class="notification-smart-action" data-nc-action="${escapeAttr(item.id)}">${escapeHtml(item.action.label)}</button>`
    : '';
  return `<article class="notification-item${item.read ? '' : ' is-unread'}${item.pinned ? ' is-pinned' : ''}" data-notification-id="${escapeAttr(item.id)}">
    <span class="notification-category">${escapeHtml(t ? t(item.category || 'System') : (item.category || 'System'))}</span>
    <div>
      <p>${escapeHtml(item.message)}</p>
      <time>${formatDateLocalized ? formatDateLocalized(toDate(item.createdAt).toISOString(), { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : toDate(item.createdAt).toLocaleString()}</time>
      ${action}
    </div>
    <div class="notification-item-actions">
      ${!item.archived ? `<button type="button" aria-label="${item.pinned ? (t ? t('Unpin') : 'Unpin') : (t ? t('Pin') : 'Pin')}" data-nc-pin="${escapeAttr(item.id)}">${item.pinned ? '\u2605' : '\u2606'}</button>` : ''}
      ${!item.read ? `<button type="button" aria-label="${t ? t('Mark as read') : 'Mark as read'}" data-nc-read="${escapeAttr(item.id)}">\u2713</button>` : ''}
      <button type="button" aria-label="${item.archived ? (t ? t('Unarchive') : 'Unarchive') : (t ? t('Archive') : 'Archive')}" data-nc-archive="${escapeAttr(item.id)}">${item.archived ? '\u2b06' : '\ud83d\udcc1'}</button>
      <button type="button" aria-label="${t ? t('Delete') : 'Delete'}" data-nc-delete="${escapeAttr(item.id)}">\u00d7</button>
    </div>
  </article>`;
}

function settingsPanelHtml() {
  return `
    <div class="notification-settings">
      <button class="text-btn" type="button" data-nc-settings-back>\u2190 ${t ? t('Back') : 'Back'}</button>
      <h3>${t ? t('Categories') : 'Categories'}</h3>
      ${CATEGORIES.map((c) => `
        <label class="notification-setting-row">
          <span>${t ? t(c) : c}</span>
          <input type="checkbox" data-nc-category-toggle="${c}" ${settings.categories[c] !== false ? 'checked' : ''} />
        </label>
      `).join('')}
      <h3>${t ? t('Delivery') : 'Delivery'}</h3>
      <label class="notification-setting-row"><span>${t ? t('Sound') : 'Sound'}</span><input type="checkbox" data-nc-toggle="sound" ${settings.sound ? 'checked' : ''} /></label>
      <label class="notification-setting-row"><span>${t ? t('Vibration') : 'Vibration'}</span><input type="checkbox" data-nc-toggle="vibration" ${settings.vibration ? 'checked' : ''} /></label>
      <label class="notification-setting-row"><span>${t ? t('Desktop notifications') : 'Desktop notifications'}</span><input type="checkbox" data-nc-toggle="desktop" ${settings.desktop ? 'checked' : ''} /></label>
      <p class="muted notification-settings-note">${t ? t('Email and push notifications are ready to enable in a future update.') : 'Email and push notifications are ready to enable in a future update.'}</p>
    </div>
  `;
}

function bindPanelEvents(panel) {
  panel.querySelector('[data-nc-settings]')?.addEventListener('click', () => { state.settingsOpen = true; renderPanel(); });
  panel.querySelector('[data-nc-settings-back]')?.addEventListener('click', () => { state.settingsOpen = false; renderPanel(); });

  panel.querySelectorAll('[data-nc-category-toggle]').forEach((el) => el.addEventListener('change', () => {
    updateSettings({ categories: { ...settings.categories, [el.dataset.ncCategoryToggle]: el.checked } });
  }));
  panel.querySelectorAll('[data-nc-toggle]').forEach((el) => el.addEventListener('change', () => {
    updateSettings({ [el.dataset.ncToggle]: el.checked });
  }));

  panel.querySelector('[data-nc-mark-all-read]')?.addEventListener('click', async () => {
    const result = await repo.markAllRead();
    if (!result.ok && typeof showToast === 'function') showToast(result.error.message, 'danger');
  });

  panel.querySelectorAll('[data-nc-tab]').forEach((btn) => btn.addEventListener('click', () => { state.tab = btn.dataset.ncTab; renderPanel(); }));

  const search = panel.querySelector('[data-nc-search]');
  let searchTimer = null;
  search?.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { state.search = search.value; renderPanel(); }, 200);
  });
  panel.querySelector('[data-nc-category]')?.addEventListener('change', (e) => { state.category = e.target.value; renderPanel(); });

  panel.querySelectorAll('[data-nc-read]').forEach((btn) => btn.addEventListener('click', () => repo.update(btn.dataset.ncRead, { read: true })));
  panel.querySelectorAll('[data-nc-pin]').forEach((btn) => btn.addEventListener('click', () => {
    const item = latestItems.find((n) => n.id === btn.dataset.ncPin);
    if (item) (item.pinned ? repo.unpin(item.id) : repo.pin(item.id));
  }));
  panel.querySelectorAll('[data-nc-archive]').forEach((btn) => btn.addEventListener('click', () => {
    const item = latestItems.find((n) => n.id === btn.dataset.ncArchive);
    if (item) (item.archived ? repo.unarchive(item.id) : repo.archive(item.id));
  }));
  panel.querySelectorAll('[data-nc-delete]').forEach((btn) => btn.addEventListener('click', () => onDelete(btn.dataset.ncDelete)));
  panel.querySelectorAll('[data-nc-action]').forEach((btn) => btn.addEventListener('click', () => onSmartAction(btn.dataset.ncAction)));
}

async function updateSettings(patch) {
  const user = AuthService.getCurrentUser();
  if (!user) return;
  const next = { ...settings, ...patch };
  settings = next; // optimistic
  renderPanel();
  await UserService.updateProfile(user.uid, { notificationSettings: next });
}

async function onDelete(id) {
  const removed = latestItems.find((n) => n.id === id);
  if (!removed) return;
  const result = await repo.delete(id);
  if (!result.ok) { if (typeof showToast === 'function') showToast(result.error.message, 'danger'); return; }
  const token = undoManager.register(async () => {
    const { id: _id, ...data } = removed;
    await repo.create(data, id);
  });
  if (typeof showToast === 'function') showToast(t ? t('Notification deleted.') : 'Notification deleted.', 'default', 6000, { onUndo: () => undoManager.undo(token) });
}

function onSmartAction(id) {
  const item = latestItems.find((n) => n.id === id);
  if (!item || !item.deepLink) return;
  repo.update(id, { read: true });
  window.location.href = item.deepLink;
}
