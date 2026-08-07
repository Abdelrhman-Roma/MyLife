// MOMENTUM — main application logic
// Handles auth, routing, data persistence, and page rendering for all standard pages.
// The Workout page shares this file's sidebar/topbar/art rendering but uses its
// own custom content renderer (js/workout.js) for the planner/session/analytics UI.

// Page assets live one level up from application pages, but alongside the
// landing page.  Use the current page to avoid failed requests on index.html.
const momentumAssetPrefix = document.body.dataset.page === 'auth' ? '' : '../';
const momentumExtraCss = document.createElement('link');
momentumExtraCss.rel = 'stylesheet';
momentumExtraCss.href = `${momentumAssetPrefix}css/momentum-overrides.css`;
document.head.appendChild(momentumExtraCss);
const momentumLayoutCss = document.createElement('link');
momentumLayoutCss.rel = 'stylesheet';
momentumLayoutCss.href = `${momentumAssetPrefix}css/momentum-layout.css`;
document.head.appendChild(momentumLayoutCss);
const momentumThemeCss = document.createElement('link');
momentumThemeCss.rel = 'stylesheet';
momentumThemeCss.href = `${momentumAssetPrefix}css/momentum-theme.css`;
document.head.appendChild(momentumThemeCss);
const momentumSpaceScript = document.createElement('script');
momentumSpaceScript.src = `${momentumAssetPrefix}js/space-video.js`;
document.head.appendChild(momentumSpaceScript);

const USERS_KEY   = 'mylife.users';
const SESSION_KEY = 'mylife.session';
const DATA_PREFIX = 'mylife.data.';
window.DATA_PREFIX = DATA_PREFIX; // js/pages/account.js (an ES module) needs this for its account-deletion cleanup
const THEME_KEY   = 'mylife.theme';
const PALETTE_KEY = 'mylife.palette';
const PASSWORD_ITERATIONS = 100000;

const NAV = [
  ['dashboard',   'Dashboard',  'Home'],
  ['todo',        'Todo',       'Tasks'],
  ['habits',      'Habits',     'Routines'],
  ['goals',       'Goals',      'Targets'],
  ['calendar',    'Calendar',   'Planner'],
  ['workout',     'Workout',    'Training'],
  ['prayer',      'Prayer',     'Spiritual'],
  ['nutrition',   'Health',     'Wellness'],
  ['weather',     'Weather',    'Forecast'],
  ['study',       'Study',      'Focus'],
  ['statistics',  'Statistics', 'Insights'],
];

const NAV_ICONS = Object.fromEntries(['dashboard','todo','habits','goals','calendar','workout','prayer','nutrition','water','sleep','study','statistics','account'].map((key, i) => [key, `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="${i % 3 === 0 ? '8' : '6'}"/><path d="M${5 + i % 5} 12h${7 + i % 4}M12 ${5 + i % 5}v${7 + i % 4}"/></svg>`]));
const PLANET_ASSETS = { dashboard:'jupiter.jpg', todo:'moon.jpg', habits:'mars.jpg', goals:'mars.jpg', calendar:'Milky Way.jpg', workout:'mars.jpg', prayer:'sun.jpg', nutrition:'Neptune.jpg', weather:'Earth.jpg', study:'ISS.jpg', statistics:'jupiter.jpg', account:'jupiter.jpg' };
// Which of the 3 named brand tiers (earth / mars / jupiter) each page belongs
// to, per the brand brief — drives the accent glow on that page's hero art.
// Pages not listed keep the app's existing per-page accent color as-is.
const PLANET_TIER = { dashboard:'jupiter', statistics:'jupiter', account:'jupiter', workout:'mars', habits:'mars', goals:'mars' };

// Inline SVG icons (24x24 viewbox, 2px stroke, currentColor) used in the account
// menu instead of emoji so the icon language stays vector, themeable, and
// consistent across light/dark/palette modes (per UI/UX design-system guidance).
const SVG_ICON = {
  user: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  chart: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
  palette: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r="0.5" fill="currentColor"/><circle cx="17.5" cy="10.5" r="0.5" fill="currentColor"/><circle cx="8.5" cy="7.5" r="0.5" fill="currentColor"/><circle cx="6.5" cy="12.5" r="0.5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.4-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.3c2.3 0 4.2-1.9 4.2-4.2C21.5 6 17.2 2 12 2z"/></svg>',
  save: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>',
  help: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  logout: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
  eye: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/><circle cx="12" cy="12" r="3"/></svg>',
  check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
};

// Items shown in the account (avatar) dropdown menu — not part of the main nav.
const ACCOUNT_MENU = [
  ['account.html',            SVG_ICON.user,    'Profile & Settings'],
  ['account.html#statistics', SVG_ICON.chart,   'Statistics'],
  ['account.html#appearance', SVG_ICON.palette, 'Appearance'],
  ['account.html#backup',     SVG_ICON.save,    'Backup'],
  ['account.html#about',      SVG_ICON.help,    'Help'],
];

const PAGES = {
  dashboard:  { title: 'Dashboard',  kicker: 'Personal workspace',  accent: 'blue' },
  todo:       { title: 'Todo',        kicker: 'Today tasks',         accent: 'blue',   collection: 'tasks',    fields: [['title','Task','text'],['time','Time','time'],['priority','Priority','select',['Low','Medium','High']]], labels: ['time','priority'] },
  habits:     { title: 'Habits',      kicker: 'Daily routines',      accent: 'green',  collection: 'habits',   fields: [['title','Habit','text'],['target','Target','text'],['category','Category','text']], labels: ['target','category'] },
  goals:      { title: 'Goals',       kicker: 'Progress targets',    accent: 'purple', collection: 'goals',    fields: [['title','Goal','text'],['period','Period','select',['Daily','Weekly','Monthly','Yearly']],['category','Category','text'],['deadline','Deadline','date']], labels: ['period','category','deadline'] },
  calendar:   { title: 'Calendar',    kicker: 'Weekly plan',         accent: 'orange', collection: 'events',   fields: [['title','Event','text'],['date','Date','date'],['time','Time','time']], labels: ['date','time'] },
  workout:    { title: 'Workout',     kicker: 'Training tracker',    accent: 'blue' },
  prayer:     { title: 'Prayer',      kicker: 'Spiritual tracker',   accent: 'green',  collection: 'prayers',  fields: [['title','Prayer or routine','text'],['time','Time','time'],['status','Status','select',['Planned','Completed']]], labels: ['time','status'] },
  nutrition:  { title: 'Health',      kicker: 'Daily wellness',      accent: 'orange', collection: 'meals',    fields: [['title','Meal','text'],['calories','Calories','number'],['protein','Protein','number'],['carbs','Carbs','number'],['fat','Fat','number'],['type','Type','select',['Breakfast','Lunch','Dinner','Snack']]], labels: ['calories','protein','carbs','fat','type'] },
  weather:    { title: 'Weather',     kicker: 'Local forecast',      accent: 'blue' },
  water:      { title: 'Water',       kicker: 'Hydration',           accent: 'blue',   collection: 'water',    fields: [['title','Entry','text'],['amount','Glasses','number'],['time','Time','time']], labels: ['amount','time'] },
  sleep:      { title: 'Sleep',       kicker: 'Recovery',            accent: 'purple', collection: 'sleep',    fields: [['title','Sleep note','text'],['hours','Hours','number'],['quality','Quality','select',['Low','Good','Great']]], labels: ['hours','quality'] },
  study:      { title: 'Study',       kicker: 'Focus sessions',      accent: 'blue',   collection: 'study',    fields: [['title','Subject','text'],['topic','Topic','text'],['minutes','Minutes','number']], labels: ['topic','minutes'] },
  statistics: { title: 'Statistics',  kicker: 'Calculated insights', accent: 'green' },
  account:    { title: 'Profile & Settings', kicker: 'Your account', accent: 'purple' },
};

let currentUser = null;
let currentData = null;
let currentPage = document.body.dataset.page;
let statsPeriod = 'week'; // 'week' | 'month' | 'year' — drives the Statistics page trend charts

// ─── Boot ──────────────────────────────────────────────────────────────────────
// Boot helpers are called by page-specific files in js/pages/.


// ─── Auth ─────────────────────────────────────────────────────────────────────
function initAuth() {
  applyTheme(localStorage.getItem(THEME_KEY) || 'light', localStorage.getItem(PALETTE_KEY) || 'deep-space');
  if (getSessionUser()) {
    window.location.href = 'pages/dashboard.html';
    return;
  }
  byId('show-register').addEventListener('click', () => showAuthPanel('register'));
  byId('show-login').addEventListener('click',    () => showAuthPanel('login'));
  byId('login-form').addEventListener('submit',    login);
  byId('register-form').addEventListener('submit', register);
  const forgotPasswordButton = byId('forgot-password');
  if (forgotPasswordButton) forgotPasswordButton.addEventListener('click', openPasswordReset);
}

function showAuthPanel(mode) {
  byId('login-panel').classList.toggle('hidden', mode !== 'login');
  byId('register-panel').classList.toggle('hidden', mode !== 'register');
  document.querySelectorAll('.form-message').forEach((el) => (el.textContent = ''));
}

async function login(e) {
  e.preventDefault();
  if (!e.currentTarget.checkValidity()) {
    e.currentTarget.reportValidity();
    return;
  }
  const email = byId('login-email').value.trim().toLowerCase();
  const pwd   = byId('login-password').value;
  if (window.MomentumFirebaseAuth) {
    return window.MomentumFirebaseAuth.login(email, pwd, byId('remember-me')?.checked !== false);
  }
  const user  = getUsers().find((u) => u.email === email);
  if (!user || !(await verifyPassword(user, pwd))) { byId('login-message').textContent = 'Invalid email or password.'; return; }
  const rememberEl = byId('remember-me');
  const remember = rememberEl ? rememberEl.checked : true;
  if (remember) {
    localStorage.setItem(SESSION_KEY, email);
    sessionStorage.removeItem(SESSION_KEY);
  } else {
    sessionStorage.setItem(SESSION_KEY, email);
    localStorage.removeItem(SESSION_KEY);
  }
  navigateAfterAuth('pages/dashboard.html');
}

async function register(e) {
  e.preventDefault();
  if (!e.currentTarget.checkValidity()) {
    e.currentTarget.reportValidity();
    return;
  }
  const name     = byId('register-name').value.trim();
  const email    = byId('register-email').value.trim().toLowerCase();
  const password = byId('register-password').value;
  const confirm  = byId('register-confirm').value;
  if (window.MomentumFirebaseAuth) {
    return window.MomentumFirebaseAuth.register(name, email, password, confirm);
  }
  const users    = getUsers();
  if (!name) { byId('register-message').textContent = 'Please enter your name.'; return; }
  if (password !== confirm) { byId('register-message').textContent = 'Passwords do not match.'; return; }
  if (users.some((u) => u.email === email)) { byId('register-message').textContent = 'Email already registered.'; return; }
  const user = { id: makeId(), name, email, createdAt: new Date().toISOString() };
  if (!(await setPassword(user, password))) {
    byId('register-message').textContent = 'Your browser cannot securely create a local account.';
    return;
  }
  users.push(user);
  saveUsers(users);
  localStorage.setItem(SESSION_KEY, email);
  navigateAfterAuth('pages/dashboard.html');
}

// Lets a page layer in a richer success transition (button morph, page-veil, etc.)
// via window.onAuthSuccess without changing what makes login/register succeed.
function navigateAfterAuth(target) {
  if (typeof window.onAuthSuccess === 'function') { window.onAuthSuccess(target); }
  else { window.location.href = target; }
}

// This is a local-first application: accounts live only in this browser, so
// password recovery is an explicit local reset rather than an email workflow.
function openPasswordReset() {
  const layer = ensureModalLayer();
  layer.hidden = false;
  layer.innerHTML = `
    <div class="modal-backdrop">
      <section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="reset-password-title">
        <h2 id="reset-password-title">Reset password</h2>
        <p class="muted">Reset the password for an account stored on this device.</p>
        <form class="form-stack" id="password-reset-form" novalidate>
          <label>Email<input name="email" type="email" autocomplete="email" required /></label>
          <label>New password<input name="password" type="password" autocomplete="new-password" minlength="6" required /></label>
          <label>Confirm new password<input name="confirm" type="password" autocomplete="new-password" minlength="6" required /></label>
          <p class="form-message" id="password-reset-message" role="alert"></p>
          <div class="modal-actions">
            <button class="secondary-btn" type="button" data-reset-cancel>Cancel</button>
            <button class="primary-btn" type="submit">Reset password</button>
          </div>
        </form>
      </section>
    </div>
  `;
  const form = byId('password-reset-form');
  const message = byId('password-reset-message');
  const cancel = () => closeModal();
  layer.querySelector('[data-reset-cancel]').addEventListener('click', cancel);
  layer.querySelector('.modal-backdrop').addEventListener('click', (event) => {
    if (event.target.classList.contains('modal-backdrop')) cancel();
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const values = new FormData(form);
    const email = String(values.get('email')).trim().toLowerCase();
    const password = String(values.get('password'));
    if (password !== String(values.get('confirm'))) {
      message.textContent = 'Passwords do not match.';
      return;
    }
    const users = getUsers();
    const index = users.findIndex((user) => user.email === email);
    if (index === -1) {
      message.textContent = 'No local account exists for that email address.';
      return;
    }
    const updatedUser = { ...users[index] };
    if (!(await setPassword(updatedUser, password))) {
      message.textContent = 'Your browser cannot securely reset a local password.';
      return;
    }
    users[index] = updatedUser;
    saveUsers(users);
    closeModal();
    byId('login-message').textContent = 'Password reset. You can now log in.';
    byId('login-email').value = email;
    byId('login-password').focus();
  });
  requestAnimationFrame(() => layer.querySelector('.modal-backdrop').classList.add('open'));
  form.querySelector('input[name="email"]').focus();
}

// ─── Page init ────────────────────────────────────────────────────────────────
function bootShell(pageKey) {
  currentUser = getSessionUser();
  if (!currentUser) { window.location.href = '../index.html'; return false; }
  currentPage = pageKey;
  const storedData = getData(currentUser.name);
  currentData = normalizeData(storedData, currentUser.name);
  window.currentData = currentData; // ES-module page controllers (habits/goals/etc.) can't see classic-script `let` bindings directly.
  // storedData is only a one-time migration candidate. Persisted user data is
  // always routed to Firestore at users/{auth.currentUser.uid}.
  applyTheme(currentData.settings.theme, currentData.settings.palette);
  applyAppearance(currentData.settings);
  renderSidebar(pageKey);
  initMobileNav();
  initNavShortcuts();
  renderTopbar(pageKey);
  renderArt(pageKey);
  initNotificationRuntime();
  return true;
}

// Invoked by the Firestore onSnapshot listener. This redraw is what makes
// create/edit/delete changes from another device visible without a reload.
// Collections that have been migrated off the legacy appData blob onto their
// own Firestore repository (habits/{uid}/items, goals/{uid}/items, etc.),
// each kept live by that page's own onSnapshot subscription. applyRemoteData()
// below still fires whenever ANY OTHER blob field changes (settings, tasks,
// notifications, ...) on any device — without this list, normalizeData()
// would rebuild these fields from the blob's stale, pre-migration snapshot
// and clobber the real, live data every time.
const REPO_SYNCED_COLLECTIONS = [
  'habits', 'goals', 'events', 'prayers', 'meals', 'workouts', 'study',
  'water', 'sleep', 'bodyMeasurements', 'shoppingList',
  'tasbeeh', 'quranProgress', 'quranBookmarks', 'quranFavorites', 'quranLog', 'hadithCollection',
  'subjects', 'assignments', 'exams', 'projects', 'studyNotes', 'resources', 'pomodoro',
  'progressPhotos', 'profile', 'settings', 'security',
];

function applyRemoteData(remoteData) {
  if (!currentUser) return;
  const preserved = {};
  if (currentData) {
    // Arrays (item collections) and plain objects (singleton docs like
    // tasbeeh/quranProgress/pomodoro) both need protecting from being
    // clobbered by a stale legacy-blob refresh — only `null`/`undefined`
    // (i.e. "not populated by a repository subscription yet") should fall
    // through to normalizeData()'s default.
    REPO_SYNCED_COLLECTIONS.forEach((key) => {
      const value = currentData[key];
      if (Array.isArray(value) || (value && typeof value === 'object')) preserved[key] = value;
    });
  }
  currentData = normalizeData(remoteData, currentUser.name);
  Object.assign(currentData, preserved);
  window.currentData = currentData;
  applyTheme(currentData.settings.theme, currentData.settings.palette);
  applyAppearance(currentData.settings);
  refreshChrome();
  if (typeof window.__pageContentReinit === 'function') window.__pageContentReinit();
}
window.MomentumLegacyData = {
  getInitialData: () => currentData,
  applyRemote: applyRemoteData,
};

function initPage(pageKey) {
  if (!window.__pageLoading) window.__pageLoading = {};
  window.__pageLoading[pageKey] = true;

  if (!bootShell(pageKey)) return;
  renderPageContent(pageKey);
  window.__pageContentReinit = () => renderPageContent(pageKey);
}

function renderStatsSkeleton() {
  const grid = byId('stats-grid');
  if (!grid) return;
  grid.innerHTML = [0, 1, 2, 3].map(() => `
    <article class="stat-card" style="padding: 16px; border-radius: 8px; background: var(--surface); border: 1px solid var(--line);">
      <div class="skeleton" style="width:50%;height:1em;margin-bottom:8px;">&nbsp;</div>
      <div class="skeleton" style="width:30%;height:1.4em;">&nbsp;</div>
    </article>
  `).join('');
}

function renderListSkeleton(pageKey) {
  const container = byId('data-list');
  if (!container) return;

  if (pageKey === 'dashboard') {
    container.innerHTML = `
      <div class="cdash-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px;">
        ${[0, 1, 2, 3].map(() => `
          <div class="panel skeleton-card" aria-hidden="true" style="height:180px;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:16px;">
            <div class="skeleton" style="width:30%;height:1.2em;margin-bottom:16px;">&nbsp;</div>
            <div class="skeleton" style="width:70%;height:1em;margin-bottom:12px;">&nbsp;</div>
            <div class="skeleton" style="width:50%;height:1em;">&nbsp;</div>
          </div>
        `).join('')}
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div style="display:grid;gap:16px;">
      ${[0, 1, 2].map(() => `
        <div class="panel skeleton-card" aria-hidden="true" style="background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:20px;">
          <div class="skeleton" style="width:40%;height:1.2em;margin-bottom:12px;">&nbsp;</div>
          <div class="skeleton" style="width:70%;height:1em;margin-bottom:8px;">&nbsp;</div>
          <div class="skeleton" style="width:25%;height:1em;">&nbsp;</div>
        </div>
      `).join('')}
    </div>
  `;
}

let lastPageContentSerialized = null;
function renderPageContent(pageKey) {
  if (window.__pageLoading && window.__pageLoading[pageKey]) {
    renderStatsSkeleton();
    renderListSkeleton(pageKey);
    return;
  }

  let dependencies = null;
  const page = PAGES[pageKey];
  if (pageKey === 'dashboard' || pageKey === 'statistics') {
    dependencies = {
      tasks: currentData.tasks,
      habits: currentData.habits,
      goals: currentData.goals,
      events: currentData.events,
      workouts: currentData.workouts,
      prayers: currentData.prayers,
      meals: currentData.meals,
      water: currentData.water,
      sleep: currentData.sleep,
      study: currentData.study,
    };
  } else if (page && page.collection) {
    dependencies = currentData[page.collection];
  } else {
    dependencies = currentData;
  }

  const serialized = pageKey + '|' + JSON.stringify(dependencies);
  if (serialized === lastPageContentSerialized) return;
  lastPageContentSerialized = serialized;

  renderStats();
  renderForm(pageKey);
  renderList(pageKey);
}

// Re-renders the shared chrome (sidebar/topbar/art) and lets the current
// page's own content re-render itself — used when the language changes so
// everything updates instantly with no page refresh.
function refreshChrome() {
  if (!currentPage) return;
  renderSidebar(currentPage);
  initMobileNav();
  renderTopbar(currentPage);
  renderArt(currentPage);
}

document.addEventListener('mylife:i18n-change', () => {
  refreshChrome();
  if (typeof window.__pageContentReinit === 'function') window.__pageContentReinit();
});

// ─── Sidebar ──────────────────────────────────────────────────────────────────
const SIDEBAR_COLLAPSE_KEY = 'mylife.sidebarCollapsed';
// First 9 NAV entries get a number shortcut (Alt+1..Alt+9) — 12 pages total,
// so the least-used 3 (sleep/study/statistics) are reachable via the nav
// itself rather than a shortcut key running out of single digits.
const NAV_SHORTCUT_COUNT = 9;

function renderSidebar(pageKey) {
  const collapsed = localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === '1';
  const sidebar = byId('sidebar');
  sidebar.classList.toggle('collapsed', collapsed);
  document.body.classList.toggle('sidebar-collapsed', collapsed);
  sidebar.innerHTML = `
    <a class="brand" href="dashboard.html" title="${t('Momentum \u2014 Dashboard')}">
      <span class="brand-logo" aria-hidden="true"></span>
      <span><strong>Momentum</strong><small>${t('Life Tracker')}</small></span>
    </a>
    <nav class="nav-list">
      ${NAV.map(([key, title, label], i) => {
        const shortcut = i < NAV_SHORTCUT_COUNT ? `Alt+${i + 1}` : '';
        return `
        <a class="nav-item${key === pageKey ? ' active' : ''}" data-accent="${(PAGES[key] && PAGES[key].accent) || 'blue'}" href="${key}.html" title="${escapeAttr(t(title))}${shortcut ? ` (${shortcut})` : ''}">
          <span class="nav-icon" aria-hidden="true">${NAV_ICONS[key] || '•'}</span>
          <strong>${t(title)}<small>${t(label)}</small></strong>
          ${shortcut ? `<kbd class="nav-shortcut" aria-hidden="true">${i + 1}</kbd>` : ''}
        </a>
      `;
      }).join('')}
    </nav>
    <button type="button" class="sidebar-collapse-btn" id="sidebar-collapse-btn" aria-label="${collapsed ? t('Expand sidebar') : t('Collapse sidebar')}" title="${collapsed ? t('Expand sidebar') : t('Collapse sidebar')}">
      <span aria-hidden="true">${collapsed ? '\u203a' : '\u2039'}</span>
    </button>
    ${accountWidgetHtml('sidebar', pageKey === 'account')}
  `;
  byId('sidebar-collapse-btn').addEventListener('click', toggleSidebarCollapse);
  renderMobileAccountTrigger();
  bindAccountMenu('account-trigger', 'account-menu');
  bindLanguageSwitchers(byId('sidebar'));
}

function toggleSidebarCollapse() {
  const collapsed = localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === '1';
  localStorage.setItem(SIDEBAR_COLLAPSE_KEY, collapsed ? '0' : '1');
  renderSidebar(currentPage);
}

let navShortcutsBound = false;
function initNavShortcuts() {
  if (navShortcutsBound) return;
  navShortcutsBound = true;
  document.addEventListener('keydown', (e) => {
    if (!e.altKey || e.ctrlKey || e.metaKey) return;
    const n = Number(e.key);
    if (!Number.isInteger(n) || n < 1 || n > NAV_SHORTCUT_COUNT) return;
    const target = NAV[n - 1];
    if (!target) return;
    e.preventDefault();
    window.location.href = `${target[0]}.html`;
  });
}

// ─── Account avatar + dropdown ─────────────────────────────────────────────
function accountWidgetHtml(suffix, active) {
  const triggerId = suffix === 'sidebar' ? 'account-trigger' : `account-trigger-${suffix}`;
  const menuId     = suffix === 'sidebar' ? 'account-menu'    : `account-menu-${suffix}`;
  return `
    <div class="sidebar-account">
      <button class="sidebar-account-trigger${active ? ' active' : ''}" id="${triggerId}" type="button" aria-haspopup="true" aria-expanded="false" aria-controls="${menuId}">
        ${accountAvatarHtml()}
        <span class="sidebar-account-info">
          <strong>${escapeHtml(currentUser.name)}</strong>
          <small>${escapeHtml(currentData.profile.headline || 'Momentum member')}</small>
        </span>
        <span class="sidebar-account-chevron" aria-hidden="true">⌄</span>
      </button>
      <div class="account-menu" id="${menuId}" role="menu" hidden>
        ${ACCOUNT_MENU.map(([href, icon, label]) => `
          <a role="menuitem" href="${href}">
            <span class="account-menu-icon" aria-hidden="true">${icon}</span><span>${t(label)}</span>
          </a>
        `).join('')}
        <div class="account-menu-lang" role="none">${languageSwitcherHtml()}</div>
        <button role="menuitem" type="button" class="account-menu-logout" data-menu-logout>
          <span class="account-menu-icon" aria-hidden="true">${SVG_ICON.logout}</span><span>${t('Logout')}</span>
        </button>
      </div>
    </div>
  `;
}

function accountAvatarHtml() {
  return currentData.profile.photo
    ? `<span class="sidebar-avatar" style="background-image:url('${currentData.profile.photo}')"></span>`
    : `<span class="sidebar-avatar">${initials(currentUser.name)}</span>`;
}

function renderMobileAccountTrigger() {
  const shell = document.querySelector('.app-shell');
  if (!shell) return;
  let slot = byId('mobile-account-slot');
  if (!slot) {
    slot = document.createElement('div');
    slot.id = 'mobile-account-slot';
    slot.className = 'mobile-account-slot';
    shell.appendChild(slot);
  }
  slot.innerHTML = accountWidgetHtml('m', currentPage === 'account');
  bindAccountMenu('account-trigger-m', 'account-menu-m');
  bindLanguageSwitchers(slot);
}

function bindAccountMenu(triggerId, menuId) {
  const trigger = byId(triggerId);
  const menu = byId(menuId);
  if (!trigger || !menu) return;
  const close = () => {
    menu.classList.remove('open');
    trigger.setAttribute('aria-expanded', 'false');
    window.setTimeout(() => { if (!menu.classList.contains('open')) menu.hidden = true; }, 220);
  };
  const open = () => {
    menu.hidden = false;
    requestAnimationFrame(() => menu.classList.add('open'));
    trigger.setAttribute('aria-expanded', 'true');
  };
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.contains('open') ? close() : open();
  });
  document.addEventListener('click', (e) => {
    if (menu.classList.contains('open') && !menu.contains(e.target) && e.target !== trigger) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('open')) { close(); trigger.focus(); }
  });
  const logoutBtn = menu.querySelector('[data-menu-logout]');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);
}

// ─── Topbar ───────────────────────────────────────────────────────────────────
function renderTopbar(pageKey) {
  const page = PAGES[pageKey];
  byId('topbar').innerHTML = `
    <div>
      <p class="eyebrow">Mission Control / ${escapeHtml(page.kicker)}</p>
      <h1>${pageKey === 'dashboard' ? 'Mission Control' : escapeHtml(page.title)}</h1>
    </div>
    <div class="topbar-actions">
      ${notificationCenterHtml()}
      <button class="secondary-btn" id="theme-btn" type="button">${currentData.settings.theme === 'dark' ? 'Light mode' : 'Dark mode'}</button>
      <button class="secondary-btn" id="export-btn" type="button">Export</button>
      <button class="danger-btn"    id="logout-btn" type="button">Logout</button>
      <div class="avatar" style="${currentData.profile.photo ? `background:url('${currentData.profile.photo}') center/cover;` : ''}">${currentData.profile.photo ? '' : initials(currentUser.name)}</div>
    </div>
  `;
  byId('logout-btn').addEventListener('click', logout);
  byId('export-btn').addEventListener('click', exportData);
  byId('theme-btn').addEventListener('click',  toggleTheme);
  bindNotificationCenter();
}

// ─── Art panel ────────────────────────────────────────────────────────────────
function renderArt(pageKey) {
  if (!byId('page-art')) return;
  const page   = PAGES[pageKey];
  const counts = getCounts();
  byId('page-art').className   = `page-art accent-${page.accent}`;
  if (PLANET_TIER[pageKey]) byId('page-art').dataset.tier = PLANET_TIER[pageKey];
  else delete byId('page-art').dataset.tier;
  byId('page-art').innerHTML   = `
    <div class="art-copy">
      <p class="eyebrow">${escapeHtml(t(page.kicker))}</p>
      <h2>${pageKey === 'dashboard' ? t('Welcome back, {name}.', { name: escapeHtml(firstName(currentUser.name)) }) : escapeHtml(t(page.title))}</h2>
      <p>${t(artDescription(pageKey))}</p>
    </div>
    <div class="art-board art-${pageKey}">
       <img src="../assist/images/${PLANET_ASSETS[pageKey] || 'Earth.jpg'}" width="220" height="220" alt="" aria-hidden="true" decoding="async" />
    </div>
  `;
}

function artDescription(pageKey) {
  const map = {
    dashboard:  'Your hub — tasks, habits, goals, workouts, nutrition, and more, all in one place.',
    todo:       'Check completed tasks and watch the statistics update instantly.',
    habits:     'Build streaks by checking habits every day.',
    goals:      'Create daily, weekly, monthly, and yearly goals with categories.',
    calendar:   'A calendar-style planning surface built from your events.',
    workout:    'Plan your training week, log every set, and watch your strength progress.',
    prayer:     'Prayer routine cards with clear planned and completed states.',
    nutrition:  'Track calories, protein, carbs, and fat against your personal targets.',
    water:      'Hydration bars generated from your water entries.',
    sleep:      'Sleep quality cards and recovery meters.',
    study:      'Study session panels with subject and topic tracking.',
    statistics: 'Charts and totals calculated from your account data.',
  };
  return map[pageKey] || '';
}

function artMarkup(pageKey, counts) {
  if (pageKey === 'calendar') {
    return `<div class="calendar-grid">${Array.from({ length: 35 }, (_, i) => `<span class="${i % 7 === 0 ? 'hot' : ''}">${i + 1}</span>`).join('')}</div>`;
  }
  if (pageKey === 'water') {
    return `<div class="water-bars">${Array.from({ length: 8 }, (_, i) => `<span class="${i < Math.min(counts.water, 8) ? 'filled' : ''}"></span>`).join('')}</div><strong>${counts.water}/${currentData.settings.waterGoal} glasses</strong>`;
  }
  if (pageKey === 'sleep') {
    return `<div class="sleep-ring"><span>${counts.sleep}</span></div><p>sleep records</p>`;
  }
  if (pageKey === 'nutrition') {
    const n = nutritionTotals();
    return macroBoard([
      ['Calories', n.calories, currentData.settings.calorieTarget],
      ['Protein',  n.protein,  currentData.settings.proteinTarget],
      ['Carbs',    n.carbs,    currentData.settings.carbTarget],
      ['Fat',      n.fat,      currentData.settings.fatTarget],
    ]);
  }
  if (pageKey === 'statistics') {
    return `<div class="chart-bars">${Object.values(counts).slice(0, 8).map((v) => `<span style="height:${Math.max(14, Math.min(96, v * 12))}%"></span>`).join('')}</div>`;
  }
  if (pageKey === 'workout') {
    return workoutArtBoard();
  }
  return `
    <div class="mini-top"></div>
    <div class="mini-cards"><span></span><span></span><span></span></div>
    <div class="mini-list"><span></span><span></span><span></span><span></span></div>
  `;
}

function workoutArtBoard() {
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const today = days[new Date().getDay()];
  const schedule = (currentData.workoutPlan && currentData.workoutPlan.schedule) || [];
  const total = schedule.length;
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const done = schedule.filter((s) => {
    const completed = s.completionDate || s.lastCompletedDate;
    if (!completed) return s.status === 'Done';
    const d = new Date(`${completed}T00:00:00`);
    return d >= weekStart && d < weekEnd;
  }).length;
  const upcoming = schedule.slice(0, 4);
  return `
    <div class="workout-hero-board">
      <div class="workout-hero-card">
        <p class="eyebrow">${t('This week')}</p>
        <strong>${done}/${total} ${t('workouts done')}</strong>
        <p>${percent(done, total || 1)}% ${t('of your weekly plan complete')}${today ? ` — ${t('today is')} ${escapeHtml(t(today))}` : ''}.</p>
      </div>
      <div class="workout-track-list">
        ${upcoming.length ? upcoming.map((s) => `
          <div class="workout-track-item">
            <span>${escapeHtml(t(s.day))} • ${escapeHtml(t(s.type || 'Workout'))}</span>
            <b>${escapeHtml(t(s.status))}</b>
          </div>
        `).join('') : `<div class="workout-track-item"><span>${t('No plan yet')}</span><b>${t('Set up days →')}</b></div>`}
      </div>
    </div>
  `;
}

function initMobileNav() {
  const shell = document.querySelector('.app-shell');
  const sidebar = byId('sidebar');
  if (!shell || !sidebar) return;

  let toggle = byId('mobile-nav-toggle');
  let overlay = byId('mobile-nav-overlay');
  if (!toggle) {
    toggle = document.createElement('button');
    toggle.id = 'mobile-nav-toggle';
    toggle.className = 'mobile-nav-toggle';
    toggle.type = 'button';
    toggle.setAttribute('aria-label', t('Open navigation'));
    toggle.setAttribute('aria-controls', 'sidebar');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML = '<span aria-hidden="true"></span>';
    shell.insertBefore(toggle, sidebar);
  }
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'mobile-nav-overlay';
    overlay.className = 'mobile-nav-overlay';
    overlay.hidden = true;
    shell.insertBefore(overlay, sidebar.nextSibling);
  }

  if (shell.dataset.mobileNavBound === 'true') return;
  shell.dataset.mobileNavBound = 'true';

  const closeNav = () => {
    document.body.classList.remove('nav-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', t('Open navigation'));
    overlay.hidden = true;
  };
  const openNav = () => {
    document.body.classList.add('nav-open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', t('Close navigation'));
    overlay.hidden = false;
  };

  toggle.addEventListener('click', () => {
    if (document.body.classList.contains('nav-open')) closeNav();
    else openNav();
  });
  overlay.addEventListener('click', closeNav);
  sidebar.addEventListener('click', (e) => {
    if (e.target.closest('.nav-item')) closeNav();
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) closeNav();
  });
}

function macroBoard(rows) {
  return `<div class="macro-board">${rows.map(([label, value, target]) => `
    <div>
      <strong>${escapeHtml(label)}</strong>
      <span>${value}/${target}</span>
      <i><b style="width:${percent(value, target)}%"></b></i>
    </div>
  `).join('')}</div>`;
}

// ─── Stats strip ──────────────────────────────────────────────────────────────
let lastStatsSerialized = null;
let lastStatsPageKey = null;
function renderStats() {
  const grid = byId('stats-grid');
  if (!grid) return; // Dashboard has its own hero/ring stats instead of the generic strip
  const counts = getCounts();
  const serialized = JSON.stringify(counts);
  if (serialized === lastStatsSerialized && currentPage === lastStatsPageKey) return;
  lastStatsSerialized = serialized;
  lastStatsPageKey = currentPage;

  const stats = [
    [t('Tasks done'),    `${counts.completedTasks}/${counts.tasks}`,   percent(counts.completedTasks, counts.tasks || 1)],
    [t('Habits done'),   `${counts.completedHabits}/${counts.habits}`, percent(counts.completedHabits, counts.habits || 1)],
    [t('Goal progress'), `${counts.completedGoals}/${counts.goals}`,   percent(counts.completedGoals, counts.goals || 1)],
    [t('Water'),         `${counts.water}/${currentData.settings.waterGoal}`, percent(counts.water, currentData.settings.waterGoal)],
  ];
  grid.innerHTML = stats.map(([label, value, width]) => `
    <article class="stat-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value))}</strong>
      <div class="meter"><i style="width:${width}%"></i></div>
    </article>
  `).join('');
}

// ─── Form panel ───────────────────────────────────────────────────────────────
function renderForm(pageKey) {
  const page = PAGES[pageKey];
  const formTitle = byId('form-title');
  const formKicker = byId('form-kicker');
  const entryForm = byId('entry-form');

  // Guard: these elements don't exist on the workout page (handled by workout.js)
  if (!formTitle || !formKicker || !entryForm) return;

  formTitle.textContent  = t(page.title);
  formKicker.textContent = page.collection ? t('Add entry') : t('Manage');

  if (page.collection) {
    entryForm.innerHTML = `
      <div class="form-grid">${page.fields.map(fieldHtml).join('')}</div>
      <button class="primary-btn" type="submit">${t('Add {title}', { title: escapeHtml(t(page.title)) })}</button>
    `;
    entryForm.onsubmit = (e) => addEntry(e, pageKey);
    return;
  }

  entryForm.innerHTML = emptyStateHtml('sparkles', t('Use the sidebar to navigate to a data page.'));
  entryForm.onsubmit  = null;
}

// ─── List panel ───────────────────────────────────────────────────────────────
function renderList(pageKey) {
  const listTitle = byId('list-title');
  if (!listTitle) return; // workout page has its own layout
  listTitle.textContent = t(PAGES[pageKey].title);

  if (pageKey === 'dashboard')  return renderDashboard();
  if (pageKey === 'statistics') return renderStatistics();
  if (pageKey === 'nutrition')  return renderNutrition();
  if (pageKey === 'goals')      return renderGoals();
  if (pageKey === 'todo' || pageKey === 'habits') return renderChecklist(pageKey);

  renderGenericList(pageKey);
}

function renderGenericList(pageKey) {
  const page  = PAGES[pageKey];
  const items = currentData[page.collection] || [];
  if (!items.length) {
    byId('data-list').innerHTML = emptyStateHtml('checklist', t('No {title} records yet. Add your first one above.', { title: escapeHtml(t(page.title).toLowerCase()) }));
    return;
  }
  byId('data-list').innerHTML = items.map((item) => cardHtml(item, page)).join('');
  bindDeleteButtons(pageKey);
}

function renderChecklist(pageKey) {
  const page  = PAGES[pageKey];
  const items = currentData[page.collection] || [];
  if (!items.length) {
    byId('data-list').innerHTML = emptyStateHtml('checklist', t('No {title} records yet. Add your first one above.', { title: escapeHtml(t(page.title).toLowerCase()) }));
    return;
  }
  byId('data-list').innerHTML = items.map((item) => `
    <article class="data-card checklist-card ${item.completed ? 'complete' : ''}">
      <label class="check-row">
        <input type="checkbox" data-toggle="${escapeAttr(item.id)}" ${item.completed ? 'checked' : ''} />
        <span>${escapeHtml(item.title)}</span>
      </label>
      <p>${page.labels.map((k) => item[k] !== undefined ? `${t(labelize(k))}: ${escapeHtml(String(item[k]))}` : '').filter(Boolean).join(' · ')}</p>
      <div class="checklist-card-actions">
        ${item.workoutScheduleId ? `<a class="text-btn workout-start-link" href="workout.html?day=${escapeAttr(item.workoutScheduleId)}">${t('Start Workout →')}</a>` : ''}
        <button class="small-danger" data-delete="${escapeAttr(item.id)}" type="button">${t('Delete')}</button>
      </div>
    </article>
  `).join('');
  document.querySelectorAll('[data-toggle]').forEach((input) =>
    input.addEventListener('change', () => toggleComplete(pageKey, input.dataset.toggle))
  );
  bindDeleteButtons(pageKey);
}

function renderGoals() {
  const groups = ['Daily', 'Weekly', 'Monthly', 'Yearly'];
  const items  = currentData.goals;
  byId('data-list').innerHTML = groups.map((period) => {
    const periodItems = items.filter((item) => item.period === period);
    return `
      <section class="group-card">
        <h3>${t(period)} ${t('goals')}</h3>
        ${periodItems.length
          ? periodItems.map(goalCard).join('')
          : `<p class="muted">${t('No goals in this period yet.')}</p>`}
      </section>
    `;
  }).join('');
  document.querySelectorAll('[data-toggle]').forEach((input) =>
    input.addEventListener('change', () => toggleComplete('goals', input.dataset.toggle))
  );
  bindDeleteButtons('goals');
}

function goalCard(item) {
  return `
    <article class="data-card checklist-card ${item.completed ? 'complete' : ''}">
      <label class="check-row">
        <input type="checkbox" data-toggle="${escapeAttr(item.id)}" ${item.completed ? 'checked' : ''} />
        <span>${escapeHtml(item.title)}</span>
      </label>
      <p>${t('Category')}: ${escapeHtml(item.category || '—')} · ${t('Deadline')}: ${escapeHtml(item.deadline || '—')}</p>
      <button class="small-danger" data-delete="${escapeAttr(item.id)}" type="button">${t('Delete')}</button>
    </article>
  `;
}

function renderNutrition() {
  const totals = nutritionTotals();
  const items  = currentData.meals;
  byId('data-list').innerHTML = `
    <div class="summary-grid">
      ${nutritionSummaryCard(t('Calories'), totals.calories, currentData.settings.calorieTarget)}
      ${nutritionSummaryCard(t('Protein'),  totals.protein,  currentData.settings.proteinTarget, 'g')}
      ${nutritionSummaryCard(t('Carbs'),    totals.carbs,    currentData.settings.carbTarget,    'g')}
      ${nutritionSummaryCard(t('Fat'),      totals.fat,      currentData.settings.fatTarget,     'g')}
    </div>
    ${items.length
      ? items.map((item) => cardHtml(item, PAGES.nutrition)).join('')
      : emptyStateHtml('apple', t('No meals yet. Log calories, protein, carbs, and fat above.'))}
  `;
  bindDeleteButtons('nutrition');
}

function nutritionSummaryCard(label, value, target, suffix = '') {
  return `<article class="data-card stacked">
    <h3>${escapeHtml(label)}</h3>
    <strong>${value}${suffix} / ${target}${suffix}</strong>
    <div class="meter"><i style="width:${percent(value, target)}%"></i></div>
  </article>`;
}

const MOTIVATION_LINES = [
  'Small steps, repeated daily, outrun big leaps taken rarely.',
  'You don\u2019t need a perfect day \u2014 you need a done day.',
  'Momentum is built one checkbox at a time.',
  'Discipline is choosing between what you want now and what you want most.',
  'Progress hides in the boring, repeated stuff.',
  'The plan doesn\u2019t need to be exciting. It needs to be followed.',
  'Show up today. That\u2019s the whole job.',
];

function dayOfYear(d = new Date()) {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d - start) / 86400000);
}

function todayWeekdayShort() {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()];
}

function todaysWorkoutInfo() {
  const schedule = (currentData.workoutPlan && currentData.workoutPlan.schedule) || [];
  const today = todayWeekdayShort();
  const slot = schedule.find((s) => s.day === today);
  if (!slot) return { label: t('No session scheduled'), sub: t('Rest day'), pct: 0 };
  if (slot.type === 'Rest Day') {
    return { label: t('Rest day'), sub: t('Recovery'), pct: 100 };
  }
  const done = slot.status === 'Done';
  const exCount = (slot.exercises || []).length;
  return {
    label: escapeHtml(slot.type || t('Workout')),
    sub: done ? t('Completed') : `${exCount} ${t('exercises')} \u00b7 ${escapeHtml(slot.status || t('Not started'))}`,
    pct: done ? 100 : (slot.status === 'In Progress' ? 50 : 0),
  };
}

function upcomingEventsHtml() {
  const todayIso = new Date().toISOString().slice(0, 10);
  const upcoming = (currentData.events || [])
    .filter((e) => !e.date || e.date >= todayIso)
    .sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.time || '').localeCompare(b.time || ''))
    .slice(0, 5);
  if (!upcoming.length) {
    return emptyStateHtml('calendar', t('Nothing on the calendar yet. Add an event to see it here.'));
  }
  return `<div class="dash-event-list">${upcoming.map((e) => `
    <div class="dash-event-row">
      <div class="dash-event-date">
        <strong>${escapeHtml((e.date || '').slice(5) || '\u2014')}</strong>
      </div>
      <div class="dash-event-body">
        <p>${escapeHtml(e.title || t('Untitled event'))}</p>
        <small>${escapeHtml(e.time || '')}</small>
      </div>
    </div>
  `).join('')}</div>`;
}

function recentActivityHtml() {
  // Best-effort feed: the data model doesn't store timestamps on every entry,
  // so this uses insertion order (arrays are appended to) across domains as a
  // reasonable proxy for "recent", newest first.
  const sources = [
    ['tasks', 'title', t('Task added')],
    ['habits', 'title', t('Habit added')],
    ['goals', 'title', t('Goal added')],
    ['events', 'title', t('Event added')],
    ['meals', 'title', t('Meal logged')],
    ['study', 'title', t('Study session logged')],
    ['sleep', 'title', t('Sleep logged')],
  ];
  const items = [];
  sources.forEach(([key, field, label]) => {
    const arr = currentData[key] || [];
    arr.slice(-2).forEach((entry) => items.push({ label, text: entry[field] || '' }));
  });
  const recent = items.slice(-6).reverse();
  if (!recent.length) {
    return emptyStateHtml('activity', t('Your recent activity will show up here as you use MyLife.'));
  }
  return `<ul class="dash-activity-list">${recent.map((r) => `
    <li><span class="dash-activity-dot" aria-hidden="true"></span><span><strong>${escapeHtml(r.label)}</strong>${r.text ? ` \u2014 ${escapeHtml(r.text)}` : ''}</span></li>
  `).join('')}</ul>`;
}

function dashCard(key, label, accent, value, target, sub, href) {
  const pct = percent(value, target || 1);
  return `
    <a class="dash-card" data-accent="${accent}" href="${href}">
      ${progressRingSvg(pct, accent, 52)}
      <div class="dash-card-body">
        <h3>${escapeHtml(label)}</h3>
        <p>${sub}</p>
      </div>
    </a>
  `;
}

function renderDashboard() {
  const counts = getCounts();
  const s = currentData.settings;
  const lvl = levelInfo(currentData.profile);
  const score = productivityScore();
  const hour = new Date().getHours();
  const greeting = hour < 5 ? t('Still up?') : hour < 12 ? t('Good morning') : hour < 18 ? t('Good afternoon') : t('Good evening');
  const wo = todaysWorkoutInfo();
  const eventsToday = (currentData.events || []).filter((e) => e.date === new Date().toISOString().slice(0, 10)).length;
  const quote = MOTIVATION_LINES[dayOfYear() % MOTIVATION_LINES.length];

  byId('data-list').innerHTML = `
    <section class="dash-hero" aria-label="${t('Overview')}">
      <div class="dash-hero-greeting">
        <p class="eyebrow">${escapeHtml(greeting)}, ${escapeHtml(firstName(currentUser.name))}</p>
        <h2>${t('Level {level}', { level: lvl.level })} <span class="dash-hero-xp">${lvl.into} / ${lvl.span} XP</span></h2>
        <p class="dash-hero-quote">\u201c${escapeHtml(quote)}\u201d</p>
      </div>
      <div class="dash-hero-rings">
        <div class="dash-hero-ring">
          ${progressRingSvg(lvl.pct, 'blue', 72)}
          <span>${lvl.pct}%</span>
          <small>${t('To next level')}</small>
        </div>
        <div class="dash-hero-ring">
          ${progressRingSvg(score, 'green', 72)}
          <span>${score}%</span>
          <small>${t('Productivity')}</small>
        </div>
      </div>
    </section>

    <section class="dash-quick-actions" aria-label="${t('Quick actions')}">
      <a class="dash-quick-action" href="todo.html"><span aria-hidden="true">+</span>${t('Add task')}</a>
      <a class="dash-quick-action" href="habits.html"><span aria-hidden="true">+</span>${t('Add habit')}</a>
      <a class="dash-quick-action" href="calendar.html"><span aria-hidden="true">+</span>${t('Add event')}</a>
      <a class="dash-quick-action" href="workout.html"><span aria-hidden="true">\u25b6</span>${t('Start workout')}</a>
      <a class="dash-quick-action" href="nutrition.html#water"><span aria-hidden="true">+</span>${t('Log water')}</a>
    </section>

    <section class="dash-section" data-dashboard-weather aria-label="${t('Weather')}"></section>

    <section class="dash-section" aria-label="${t('Today')}">
      <h3 class="dash-section-title">${t('Today')}</h3>
      <div class="dash-grid">
        ${dashCard('tasks', t('Tasks'), 'blue', counts.completedTasks, counts.tasks, `${counts.completedTasks}/${counts.tasks || 0} ${t('done')}`, 'todo.html')}
        ${dashCard('habits', t('Habits'), 'green', counts.completedHabits, counts.habits, `${counts.completedHabits}/${counts.habits || 0} ${t('done')}`, 'habits.html')}
        ${dashCard('goals', t('Goals'), 'purple', counts.completedGoals, counts.goals, `${counts.completedGoals}/${counts.goals || 0} ${t('done')}`, 'goals.html')}
        <a class="dash-card" data-accent="mars" href="workout.html">
          ${progressRingSvg(wo.pct, 'orange', 52)}
          <div class="dash-card-body"><h3>${t('Workout')}</h3><p>${wo.label} \u2014 ${wo.sub}</p></div>
        </a>
        ${dashCard('prayer', t('Prayer'), 'green', counts.prayersToday, s.prayerGoal, `${counts.prayersToday}/${s.prayerGoal || 0} ${t('today')}`, 'prayer.html')}
        ${dashCard('study', t('Study'), 'blue', counts.study, s.studyGoal ? Math.round(s.studyGoal / 30) : 1, `${counts.study} ${t('sessions')}`, 'study.html')}
        <a class="dash-card" data-accent="orange" href="calendar.html">
          ${progressRingSvg(percent(eventsToday, Math.max(eventsToday, 1)), 'orange', 52)}
          <div class="dash-card-body"><h3>${t('Calendar')}</h3><p>${eventsToday} ${t('events today')}</p></div>
        </a>
        ${dashCard('water', t('Water'), 'blue', counts.water, s.waterGoal, `${counts.water}/${s.waterGoal || 0} ${t('glasses')}`, 'nutrition.html#water')}
        ${dashCard('sleep', t('Sleep'), 'purple', counts.sleep, s.sleepGoal, `${counts.sleep} ${t('records')}`, 'nutrition.html#sleep')}
      </div>
    </section>

    <section class="dash-columns">
      <div class="dash-section">
        <h3 class="dash-section-title">${t('Upcoming events')}</h3>
        ${upcomingEventsHtml()}
      </div>
      <div class="dash-section">
        <h3 class="dash-section-title">${t('Recent activity')}</h3>
        ${recentActivityHtml()}
      </div>
    </section>
  `;
}

// ─── Minimal date helpers, namespaced to avoid clashing with the different
// addDays()/toISO() signatures already used by calendar.js and workout.js
// (which are never loaded alongside this file's stats functions, but sharing
// generic names across scripts loaded in the same page is asking for bugs).
function statIso(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function statAddDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function statParseIso(s) { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); }

// Buckets `entries` (each with a `.date` ISO string) into counts per period.
// Returns { labels: string[], values: number[] } spanning the trailing
// window for the given period (7 days / 8 weeks / 12 months).
function bucketByPeriod(entries, dateField, period) {
  const today = new Date();
  if (period === 'week') {
    const days = Array.from({ length: 7 }, (_, i) => statAddDays(today, i - 6));
    const labels = days.map((d) => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()]);
    const isoSet = days.map(statIso);
    const values = isoSet.map((iso) => entries.filter((e) => (e[dateField] || '').slice(0, 10) === iso).length);
    return { labels, values };
  }
  if (period === 'month') {
    const weeks = Array.from({ length: 8 }, (_, i) => statAddDays(today, (i - 7) * 7));
    const labels = weeks.map((d) => `${d.getMonth() + 1}/${d.getDate()}`);
    const values = weeks.map((start) => {
      const from = statIso(start);
      const to = statIso(statAddDays(start, 6));
      return entries.filter((e) => {
        const iso = (e[dateField] || '').slice(0, 10);
        return iso && iso >= from && iso <= to;
      }).length;
    });
    return { labels, values };
  }
  // year: trailing 12 months
  const months = Array.from({ length: 12 }, (_, i) => new Date(today.getFullYear(), today.getMonth() - (11 - i), 1));
  const labels = months.map((d) => ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]);
  const values = months.map((m) => entries.filter((e) => {
    const iso = e[dateField];
    if (!iso) return false;
    const d = statParseIso(iso);
    return d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth();
  }).length);
  return { labels, values };
}

function statsBarChartSvg(labels, values, colorVar = 'blue') {
  const w = 640, h = 160, pad = 24, gap = 8;
  const max = Math.max(1, ...values);
  const bw = (w - pad * 2 - gap * (values.length - 1)) / values.length;
  const bars = values.map((v, i) => {
    const bh = Math.max(2, (v / max) * (h - pad - 20));
    const x = pad + i * (bw + gap);
    const y = h - pad - bh;
    return `
      <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="4" fill="var(--${colorVar})" opacity="${v ? 1 : 0.25}">
        <title>${labels[i]}: ${v}</title>
      </rect>
      <text x="${(x + bw / 2).toFixed(1)}" y="${h - 6}" text-anchor="middle" class="stats-chart-label">${escapeHtml(labels[i])}</text>
    `;
  }).join('');
  return `<svg class="stats-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Bar chart">${bars}</svg>`;
}

function comparisonBarsHtml() {
  const c = getCounts();
  const rows = [
    ['Tasks',  percent(c.completedTasks, c.tasks || 1), 'blue'],
    ['Habits', percent(c.completedHabits, c.habits || 1), 'green'],
    ['Goals',  percent(c.completedGoals, c.goals || 1), 'purple'],
    ['Water',  percent(c.water, currentData.settings.waterGoal), 'blue'],
    ['Sleep',  percent(c.sleep, currentData.settings.sleepGoal), 'purple'],
    ['Prayer', percent(c.prayersToday, currentData.settings.prayerGoal), 'green'],
  ];
  return `<div class="stats-compare">${rows.map(([label, pct, color]) => `
    <div class="stats-compare-row">
      <span class="stats-compare-label">${t(label)}</span>
      <div class="stats-compare-track"><div class="stats-compare-fill" style="--w:${pct}%; --c:var(--${color})"></div></div>
      <span class="stats-compare-pct">${pct}%</span>
    </div>
  `).join('')}</div>`;
}

function statsInsightsHtml() {
  const c = getCounts();
  const s = currentData.settings;
  const rates = [
    ['Tasks', percent(c.completedTasks, c.tasks || 1)],
    ['Habits', percent(c.completedHabits, c.habits || 1)],
    ['Goals', percent(c.completedGoals, c.goals || 1)],
    ['Water', percent(c.water, s.waterGoal)],
    ['Sleep', percent(c.sleep, s.sleepGoal)],
    ['Prayer', percent(c.prayersToday, s.prayerGoal)],
  ];
  const strongest = rates.reduce((a, b) => (b[1] > a[1] ? b : a), rates[0]);
  const weakest = rates.reduce((a, b) => (b[1] < a[1] ? b : a), rates[0]);
  const insights = [];
  insights.push(`Your strongest area right now is <strong>${t(strongest[0])}</strong> at ${strongest[1]}% of goal.`);
  if (weakest[0] !== strongest[0]) {
    insights.push(`<strong>${t(weakest[0])}</strong> is furthest from its goal at ${weakest[1]}% \u2014 a good place to focus next.`);
  }
  const upcoming = (currentData.events || []).filter((e) => e.date >= new Date().toISOString().slice(0, 10)).length;
  if (upcoming) insights.push(`You have <strong>${upcoming}</strong> upcoming event${upcoming === 1 ? '' : 's'} on the calendar.`);
  const openGoals = (currentData.goals || []).filter((g) => !g.completed).length;
  if (openGoals) insights.push(`<strong>${openGoals}</strong> goal${openGoals === 1 ? ' is' : 's are'} still open.`);
  const lvl = levelInfo(currentData.profile);
  insights.push(`You're ${lvl.pct}% of the way to Level ${lvl.level + 1}.`);
  return `<ul class="stats-insights">${insights.map((i) => `<li>${i}</li>`).join('')}</ul>`;
}

function renderStatistics() {
  const counts = getCounts();
  const lvl = levelInfo(currentData.profile);
  const studyBuckets = bucketByPeriod(currentData.study || [], 'date', statsPeriod);
  const workoutBuckets = bucketByPeriod(currentData.workouts || [], 'date', statsPeriod);

  byId('data-list').innerHTML = `
    <section class="stats-period-bar" aria-label="${t('Time period')}">
      ${['week', 'month', 'year'].map((p) => `<button type="button" class="stats-period-btn${statsPeriod === p ? ' active' : ''}" data-stats-period="${p}">${t(labelize(p))}</button>`).join('')}
    </section>

    <section class="dash-grid stats-today-grid" aria-label="${t('Today vs goal')}">
      ${dashCard('tasks', t('Tasks'), 'blue', counts.completedTasks, counts.tasks, `${counts.completedTasks}/${counts.tasks || 0}`, 'todo.html')}
      ${dashCard('habits', t('Habits'), 'green', counts.completedHabits, counts.habits, `${counts.completedHabits}/${counts.habits || 0}`, 'habits.html')}
      ${dashCard('goals', t('Goals'), 'purple', counts.completedGoals, counts.goals, `${counts.completedGoals}/${counts.goals || 0}`, 'goals.html')}
      ${dashCard('water', t('Water'), 'blue', counts.water, currentData.settings.waterGoal, `${counts.water}/${currentData.settings.waterGoal || 0}`, 'nutrition.html#water')}
      ${dashCard('sleep', t('Sleep'), 'purple', counts.sleep, currentData.settings.sleepGoal, `${counts.sleep} ${t('records')}`, 'nutrition.html#sleep')}
      ${dashCard('level', t('Level'), 'green', lvl.into, lvl.span, `${t('Level')} ${lvl.level} \u00b7 ${lvl.pct}%`, 'account.html')}
    </section>

    <section class="dash-columns">
      <div class="panel stats-chart-card">
        <h3>${t('Study sessions')}</h3>
        ${studyBuckets.values.some(Boolean) ? statsBarChartSvg(studyBuckets.labels, studyBuckets.values, 'blue') : emptyStateHtml('book', t('Log a study session to see this chart.'))}
      </div>
      <div class="panel stats-chart-card">
        <h3>${t('Workouts')}</h3>
        ${workoutBuckets.values.some(Boolean) ? statsBarChartSvg(workoutBuckets.labels, workoutBuckets.values, 'orange') : emptyStateHtml('dumbbell', t('Finish a workout session to see this chart.'))}
      </div>
    </section>

    <section class="dash-columns">
      <div class="panel">
        <h3>${t('Completion comparison')}</h3>
        ${comparisonBarsHtml()}
      </div>
      <div class="panel">
        <h3>${t('Insights')}</h3>
        ${statsInsightsHtml()}
      </div>
    </section>
  `;

  document.querySelectorAll('[data-stats-period]').forEach((btn) => btn.addEventListener('click', () => {
    statsPeriod = btn.dataset.statsPeriod;
    renderStatistics();
  }));
}

// ─── Field builder ────────────────────────────────────────────────────────────
function fieldHtml([name, label, type, options]) {
  if (type === 'textarea') {
    return `<label class="full-field">${escapeHtml(t(label))}<textarea name="${name}"></textarea></label>`;
  }
  if (type === 'select') {
    return `<label>${escapeHtml(t(label))}<select name="${name}" required>${options.map((o) => `<option>${escapeHtml(t(o))}</option>`).join('')}</select></label>`;
  }
  const numericAttrs = type === 'number' ? ' min="0" step="any"' : '';
  return `<label>${escapeHtml(t(label))}<input name="${name}" type="${type}"${numericAttrs} required /></label>`;
}

function cardHtml(item, page) {
  return `
    <article class="data-card">
      <div>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${page.labels.map((k) => item[k] !== undefined ? `${t(labelize(k))}: ${escapeHtml(String(item[k]))}` : '').filter(Boolean).join(' · ')}</p>
      </div>
      <button class="small-danger" data-delete="${escapeAttr(item.id)}" type="button">${t('Delete')}</button>
    </article>
  `;
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────
function addEntry(e, pageKey) {
  e.preventDefault();
  if (!e.currentTarget.checkValidity()) {
    e.currentTarget.reportValidity();
    return;
  }
  const page = PAGES[pageKey];
  const form = new FormData(e.currentTarget);
  const item = { id: makeId(), completed: false, createdAt: new Date().toISOString() };
  page.fields.forEach(([name, , type]) => {
    const val = form.get(name);
    item[name] = type === 'number' ? Number(val) : String(val || '');
  });
  currentData[page.collection].push(item);
  addNotification(pageKey, `${page.title}: ${item.title || t('New entry added')}`);
  e.currentTarget.reset();
  initPage(pageKey);
  if (pageKey === 'goals' && window.__goalsRepo) {
    const { id, ...data } = item;
    window.__goalsRepo.create(data, id).then((result) => {
      if (!result.ok) {
        currentData.goals = currentData.goals.filter((x) => x.id !== id);
        initPage(pageKey);
      }
    });
    return;
  }
  persist();
}

function toggleComplete(pageKey, id) {
  const col  = PAGES[pageKey].collection;
  const item = currentData[col].find((entry) => entry.id === id);
  if (item) {
    item.completed = !item.completed;
    item.completedAt = item.completed ? new Date().toISOString() : null;
  }
  if (item && item.completed) addNotification(pageKey, `${PAGES[pageKey].title}: ${item.title || t('Completed')}`);
  initPage(pageKey);
  if (pageKey === 'goals' && window.__goalsRepo && item) {
    window.__goalsRepo.update(id, { completed: item.completed, completedAt: item.completedAt });
    return;
  }
  persist();
}

function bindDeleteButtons(pageKey) {
  document.querySelectorAll('[data-delete]').forEach((btn) =>
    btn.addEventListener('click', () => deleteEntry(pageKey, btn.dataset.delete))
  );
}

function deleteEntry(pageKey, id) {
  const col = PAGES[pageKey].collection;
  const removed = currentData[col].find((item) => item.id === id);
  const removedIndex = currentData[col].findIndex((item) => item.id === id);
  currentData[col] = currentData[col].filter((item) => item.id !== id);
  initPage(pageKey);
  showToast(t('Deleted'), 'danger');
  if (pageKey === 'goals' && window.__goalsRepo) {
    window.__goalsRepo.delete(id).then((result) => {
      if (!result.ok && removed) {
        currentData[col].splice(removedIndex, 0, removed);
        initPage(pageKey);
      }
    });
    return;
  }
  persist();
}

// ─── Toast ──────────────────────────────────────────────────────────────
// showToast(message, variant) — variant: 'default' | 'success' | 'danger'
// Any page can call this without extra markup; the region is created lazily.
const TOAST_ICONS = {
  success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  danger:  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
  default: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
};

function ensureToastRegion() {
  let region = document.querySelector('.toast-region');
  if (!region) {
    region = document.createElement('div');
    region.className = 'toast-region';
    region.setAttribute('aria-live', 'polite');
    document.body.appendChild(region);
  }
  return region;
}

function showToast(message, variant = 'default', duration = 2600, options = {}) {
  const { onUndo } = options; // optional callback — new in the Phase 2 Firestore migration, additive only
  const region = ensureToastRegion();
  const toast = document.createElement('div');
  toast.className = `toast toast-${variant}`;
  toast.innerHTML = `<span class="toast-icon" aria-hidden="true">${TOAST_ICONS[variant] || TOAST_ICONS.default}</span><span>${escapeHtml(message)}</span>${onUndo ? `<button type="button" class="toast-undo-btn" data-toast-undo>${t('Undo')}</button>` : ''}`;
  region.appendChild(toast);
  const dismiss = () => {
    toast.classList.add('is-leaving');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  };
  const timer = setTimeout(dismiss, duration);
  if (onUndo) {
    const undoBtn = toast.querySelector('[data-toast-undo]');
    undoBtn.addEventListener('click', () => {
      clearTimeout(timer);
      onUndo();
      dismiss();
    });
  }
}

// ─── Notification center + browser notification bridge ───────────────────
// Stored per user with the rest of their local-first data. The service worker
// handles future Push API payloads; foreground reminders provide a useful
// fallback on static hosting where no push server has been configured yet.
function notificationCenterHtml() {
  const items = (currentData.notificationCenter || []);
  const unread = items.filter((item) => !item.read).length;
  return `<div class="notification-center">
    <button class="notification-bell" id="notification-bell" type="button" aria-label="${t('Notifications')}" aria-expanded="false" aria-controls="notification-panel">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>
      ${unread ? `<b aria-label="${unread} unread">${unread > 99 ? '99+' : unread}</b>` : ''}
    </button>
    <section class="notification-panel" id="notification-panel" hidden aria-label="${t('Notification center')}">
      <header><div><p class="eyebrow">${t('Updates')}</p><h2>${t('Notifications')}</h2></div><button class="text-btn" type="button" data-notification-clear>${t('Clear all')}</button></header>
      <div class="notification-tools"><button class="text-btn" type="button" data-notification-read>${t('Mark all read')}</button>${typeof Notification !== 'undefined' && Notification.permission === 'default' ? `<button class="text-btn" type="button" data-notification-permission>${t('Enable browser alerts')}</button>` : ''}</div>
      <div class="notification-list">${items.length ? items.slice(0, 30).map(notificationItemHtml).join('') : `<p class="notification-empty">${t('You are all caught up.')}</p>`}</div>
    </section>
  </div>`;
}

function notificationItemHtml(item) {
  return `<article class="notification-item${item.read ? '' : ' is-unread'}" data-notification-id="${escapeAttr(item.id)}">
    <span class="notification-category">${escapeHtml(t(item.category || 'General'))}</span><div><p>${escapeHtml(item.message)}</p><time>${formatDateLocalized(item.createdAt, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</time></div>
    <div class="notification-item-actions"><button type="button" aria-label="${t('Mark as read')}" data-notification-read-one="${escapeAttr(item.id)}">✓</button><button type="button" aria-label="${t('Delete')}" data-notification-delete="${escapeAttr(item.id)}">×</button></div>
  </article>`;
}

function bindNotificationCenter() {
  const bell = byId('notification-bell'); const panel = byId('notification-panel');
  if (!bell || !panel) return;
  const close = () => { panel.hidden = true; bell.setAttribute('aria-expanded', 'false'); };
  bell.addEventListener('click', (event) => { event.stopPropagation(); panel.hidden = !panel.hidden; bell.setAttribute('aria-expanded', String(!panel.hidden)); });
  if (!window.__notificationOutsideBound) {
    window.__notificationOutsideBound = true;
    document.addEventListener('click', (event) => {
      const activePanel = byId('notification-panel'); const activeBell = byId('notification-bell');
      if (activePanel && activeBell && !activePanel.hidden && !activePanel.contains(event.target) && event.target !== activeBell) {
        activePanel.hidden = true; activeBell.setAttribute('aria-expanded', 'false');
      }
    });
  }
  panel.querySelector('[data-notification-clear]')?.addEventListener('click', () => { currentData.notificationCenter = []; persist(); refreshChrome(); });
  panel.querySelector('[data-notification-read]')?.addEventListener('click', () => { currentData.notificationCenter.forEach((item) => { item.read = true; }); persist(); refreshChrome(); });
  panel.querySelector('[data-notification-permission]')?.addEventListener('click', requestBrowserNotificationPermission);
  panel.querySelectorAll('[data-notification-read-one]').forEach((button) => button.addEventListener('click', () => updateNotification(button.dataset.notificationReadOne, { read: true })));
  panel.querySelectorAll('[data-notification-delete]').forEach((button) => button.addEventListener('click', () => { currentData.notificationCenter = currentData.notificationCenter.filter((item) => item.id !== button.dataset.notificationDelete); persist(); refreshChrome(); }));
}

function updateNotification(id, values) { const item = currentData.notificationCenter.find((entry) => entry.id === id); if (item) Object.assign(item, values); persist(); refreshChrome(); }
function addNotification(category, message, options = {}) {
  if (!currentData) return;
  currentData.notificationCenter = Array.isArray(currentData.notificationCenter) ? currentData.notificationCenter : [];
  currentData.notificationCenter.unshift({ id: makeId(), category, message, read: false, createdAt: new Date().toISOString(), ...options });
  currentData.notificationCenter = currentData.notificationCenter.slice(0, 100);
  persist();
  if (options.browser !== false) showBrowserNotification(category, message);
}

async function requestBrowserNotificationPermission() {
  if (!('Notification' in window)) { showToast(t('Browser notifications are unavailable.'), 'danger'); return; }
  const result = await Notification.requestPermission();
  currentData.notifications.desktop = result === 'granted'; persist(); refreshChrome();
  showToast(result === 'granted' ? t('Browser alerts enabled.') : t('Browser alert permission was not granted.'), result === 'granted' ? 'success' : 'danger');
}
function showBrowserNotification(category, message) {
  if (!currentData?.notifications?.desktop || !('Notification' in window) || Notification.permission !== 'granted') return;
  try { new Notification(`${t('Momentum')} — ${t(category)}`, { body: message, tag: `momentum-${category}` }); } catch (_) { /* browser may require an active page */ }
}
function initNotificationRuntime() {
  if ('serviceWorker' in navigator && !window.__momentumServiceWorker) {
    window.__momentumServiceWorker = true;
    navigator.serviceWorker.register('../sw.js').catch(() => { /* static previews may not expose a worker scope */ });
  }
  if (window.__momentumReminderTimer) return;
  window.__momentumReminderTimer = window.setInterval(runForegroundReminders, 60000);
  runForegroundReminders();
}
function runForegroundReminders() {
  if (!currentData?.notifications?.desktop) return;
  const now = new Date(); const key = now.toISOString().slice(0, 10); const hour = now.getHours();
  const reminders = currentData.reminderLog || (currentData.reminderLog = {});
  if (hour === 9 && !reminders[`habits-${key}`]) { reminders[`habits-${key}`] = true; addNotification('Habits', t('Time to check in on your habits.'), { browser: true }); }
  if (hour === 18 && !reminders[`prayer-${key}`]) { reminders[`prayer-${key}`] = true; addNotification('Prayer', t('Prayer reminder'), { browser: true }); }
  if (hour === 20 && !reminders[`goals-${key}`]) { reminders[`goals-${key}`] = true; addNotification('Goals', t('Review today’s goal progress.'), { browser: true }); }
  if (hour === 21 && !reminders[`daily-${key}`]) { reminders[`daily-${key}`] = true; addNotification('Daily', t('Your daily review is ready.'), { browser: true }); }
  persist();
}

// ─── Theme ────────────────────────────────────────────────────────────────
function toggleTheme() {
  currentData.settings.theme = currentData.settings.theme === 'dark' ? 'light' : 'dark';
  persist();
  initPage(currentPage);
}

function applyTheme(theme, palette) {
  let resolvedTheme = theme === 'dark' ? 'dark' : 'light';
  if (theme === 'auto') {
    resolvedTheme = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  }
  const resolvedPalette = palette || localStorage.getItem(PALETTE_KEY) || 'deep-space';
  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.dataset.palette = resolvedPalette;
  document.documentElement.style.colorScheme = resolvedTheme;
  document.body.dataset.theme = resolvedTheme;
  document.body.dataset.palette = resolvedPalette;
  localStorage.setItem(THEME_KEY, resolvedTheme);
  localStorage.setItem(PALETTE_KEY, resolvedPalette);
}

// ─── Shared confirm modal ───────────────────────────────────────────────
// Any page can call openModal({...}) — the layer is created on demand so no
// page markup changes are required.
function ensureModalLayer() {
  let layer = byId('modal-layer');
  if (!layer) {
    layer = document.createElement('div');
    layer.id = 'modal-layer';
    layer.className = 'modal-layer';
    layer.hidden = true;
    document.body.appendChild(layer);
  }
  return layer;
}

function openModal({ title, body, confirmLabel = t('Confirm'), cancelLabel = t('Cancel'), danger = false, onConfirm, onCancel }) {
  const layer = ensureModalLayer();
  const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  layer.hidden = false;
  layer.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <h2 id="modal-title">${escapeHtml(title)}</h2>
        <div class="modal-body">${body}</div>
        <div class="modal-actions">
          <button class="secondary-btn" type="button" data-modal-cancel>${escapeHtml(cancelLabel)}</button>
          <button class="${danger ? 'danger-btn' : 'primary-btn'}" type="button" data-modal-confirm>${escapeHtml(confirmLabel)}</button>
        </div>
      </div>
    </div>
  `;
  requestAnimationFrame(() => {
    layer.querySelector('.modal-backdrop').classList.add('open');
    layer.querySelector('[data-modal-cancel]').focus();
  });
  let resolved = false;
  const onKeydown = (e) => {
    if (e.key === 'Escape') { cancel(); return; }
    if (e.key !== 'Tab') return;
    const focusable = [...layer.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  const restoreFocus = () => { if (returnFocus && returnFocus.isConnected) returnFocus.focus(); };
  const cancel = () => {
    if (resolved) return;
    resolved = true;
    document.removeEventListener('keydown', onKeydown);
    closeModal();
    restoreFocus();
    if (onCancel) onCancel();
  };
  const confirm = () => {
    if (resolved) return;
    resolved = true;
    document.removeEventListener('keydown', onKeydown);
    closeModal();
    restoreFocus();
    onConfirm();
  };
  layer.querySelector('[data-modal-cancel]').addEventListener('click', cancel);
  layer.querySelector('[data-modal-confirm]').addEventListener('click', confirm);
  layer.querySelector('.modal-backdrop').addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-backdrop')) cancel();
  });
  document.addEventListener('keydown', onKeydown);
}

function closeModal() {
  const layer = byId('modal-layer');
  if (!layer) return;
  const backdrop = layer.querySelector('.modal-backdrop');
  if (!backdrop) { layer.hidden = true; return; }
  backdrop.classList.remove('open');
  window.setTimeout(() => { layer.hidden = true; layer.innerHTML = ''; }, 200);
}

function applyAppearance(s) {
  const root = document.documentElement;
  root.dataset.fontSize   = s.fontSize || 'md';
  root.dataset.radius     = s.radius   || 'md';
  root.dataset.animations = s.animations === false ? 'off' : 'on';
  root.dataset.compact    = s.compact ? 'on' : 'off';
  root.dataset.glass      = s.glass ? 'on' : 'off';
}

// ─── Session / storage ────────────────────────────────────────────────────────
function logout() {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
  window.location.href = '../index.html';
}

function exportData() {
  const blob = new Blob(
    [JSON.stringify({ user: currentUser, data: currentData }, null, 2)],
    { type: 'application/json' }
  );
  const a = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = `momentum-${currentUser.email}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function getSessionUser() {
  const email = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
  if (!email) return null;
  return getUsers().find((u) => u.email === email) || null;
}

function getUsers() {
  try {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    return Array.isArray(users) ? users : [];
  }
  catch { return []; }
}

function saveUsers(users) { localStorage.setItem(USERS_KEY, JSON.stringify(users)); }

function getData(name) {
  // Business data is never read from or written to localStorage after the
  // Firestore migration — this always seeds an empty shape, which every
  // page's realtime repository subscription overwrites within moments.
  // DATA_PREFIX itself is kept (see js/pages/account.js) purely so account
  // deletion can still clean up any stale entry left by a pre-migration
  // session; nothing writes to it anymore.
  return emptyData(name);
}
function persist() {
  if (!currentData) return;
  if (window.MomentumDataSync) window.MomentumDataSync.save(currentData);
  else window.__mylifePendingData = currentData;
}

// Passwords are never kept as plaintext for newly-created or migrated local
// accounts. This is defense in depth only: a local-only static app cannot
// protect data from someone who controls the browser profile.
async function derivePasswordHash(password, salt) {
  if (!window.crypto || !window.crypto.subtle || !window.TextEncoder) return null;
  try {
    const encoded = new TextEncoder();
    const key = await window.crypto.subtle.importKey('raw', encoded.encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await window.crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: Uint8Array.from(atob(salt), (char) => char.charCodeAt(0)), iterations: PASSWORD_ITERATIONS, hash: 'SHA-256' },
      key,
      256
    );
    return btoa(String.fromCharCode(...new Uint8Array(bits)));
  } catch (_error) {
    return null;
  }
}

async function setPassword(user, password) {
  if (!window.crypto || !window.crypto.getRandomValues) return false;
  const salt = new Uint8Array(16);
  window.crypto.getRandomValues(salt);
  const passwordSalt = btoa(String.fromCharCode(...salt));
  const passwordHash = await derivePasswordHash(password, passwordSalt);
  if (!passwordHash) return false;
  user.passwordSalt = passwordSalt;
  user.passwordHash = passwordHash;
  user.passwordVersion = 1;
  delete user.password;
  return true;
}

function secureStringEquals(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string' || left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

async function verifyPassword(user, password) {
  if (user.passwordHash && user.passwordSalt) {
    const hash = await derivePasswordHash(password, user.passwordSalt);
    return !!hash && secureStringEquals(hash, user.passwordHash);
  }
  // Backward-compatible one-time migration for accounts created before v1.
  if (!secureStringEquals(password, user.password || '')) return false;
  if (await setPassword(user, password)) saveUsers(getUsers().map((candidate) => candidate.email === user.email ? user : candidate));
  return true;
}

// ─── Data helpers ─────────────────────────────────────────────────────────────
function getCounts() {
  return {
    tasks:           currentData.tasks.length,
    completedTasks:  currentData.tasks.filter((i) => i.completed).length,
    habits:          currentData.habits.length,
    completedHabits: currentData.habits.filter((i) => i.completed).length,
    goals:           currentData.goals.length,
    completedGoals:  currentData.goals.filter((i) => i.completed).length,
    events:          currentData.events.length,
    workouts:        currentData.workouts.length,
    prayers:         currentData.prayers.filter((p) => p.status === 'Completed').length,
    prayersToday:    currentData.prayers.filter((p) => p.date === new Date().toISOString().slice(0, 10) && p.status === 'Completed').length,
    meals:           currentData.meals.length,
    water:           currentData.water.reduce((s, i) => s + Number(i.glasses || 0), 0),
    sleep:           currentData.sleep.length,
    study:           currentData.study.length,
  };
}

// ─── Level / XP / productivity (shared across Dashboard + Account pages) ──
function totalActions(c) {
  return c.completedTasks + c.completedHabits + c.completedGoals + c.workouts + c.prayers + c.study + c.sleep + c.water;
}

function computeXp() {
  const c = getCounts();
  return totalActions(c) * 10;
}

function levelInfo(p) {
  const xp = Number(p.xp) || computeXp();
  const span = 500;
  const level = Math.floor(xp / span) + 1;
  const into = xp % span;
  return { xp, level, into, span, pct: Math.round((into / span) * 100) };
}

function productivityScore() {
  const c = getCounts();
  const s = currentData.settings;
  const parts = [
    percent(c.completedTasks, c.tasks || 1),
    percent(c.completedHabits, c.habits || 1),
    percent(c.completedGoals, c.goals || 1),
    percent(c.water, s.waterGoal || 1),
    percent(c.sleep, s.sleepGoal || 1),
  ];
  return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
}

function nutritionTotals(dateIso) {
  const target = dateIso || new Date().toISOString().slice(0, 10);
  return currentData.meals.filter((m) => (m.date || target) === target).reduce(
    (t, i) => ({
      calories: t.calories + Number(i.calories || 0),
      protein:  t.protein  + Number(i.protein  || 0),
      carbs:    t.carbs    + Number(i.carbs    || 0),
      fat:      t.fat      + Number(i.fat      || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

function emptyData(name) {
  return {
    profile: {
      photo: null, cover: null, headline: '', phone: '', location: '',
      bio: `${name} has not added a bio yet.`,
      username: '', birthday: '', gender: '', country: '', city: '',
      timezone: '', language: 'English', level: 1, xp: 0,
      joinedAt: new Date().toISOString(),
    },
    settings: {
      theme: 'dark', palette: 'deep-space',
      waterGoal: 8, sleepGoal: 8, calorieTarget: 2200, proteinTarget: 150, carbTarget: 250, fatTarget: 70,
      habitGoal: 3, prayerGoal: 5, studyGoal: 120, workoutGoal: 4,
      fontSize: 'md', radius: 'md', animations: true, compact: false, glass: false,
    },
    notifications: {
      task: true, habit: true, workout: true, study: true, prayer: true,
      goal: true, water: true, sleep: true, desktop: false, sound: true, email: false,
      weeklyReview: true, monthlyReview: true,
    },
    security: { twoFactor: false, lastPasswordChange: null },
    quranProgress: {
      lastSurah: null, lastAyah: null, lastReadAt: null, readLog: {}, dailyGoal: 10, goal: null,
      readingSettings: { mode: 'light', fontSize: 'md', lineHeight: 'comfortable', fontFamily: 'amiri', focus: false, autoScroll: false },
    },
    achievements: { unlocked: [] },
    notificationCenter: [], reminderLog: {},
    tasks:    [], habits: [], goals: [], events: [], workouts: [],
    prayers:  [], meals:  [], water: [], sleep:  [], study:   [],
    subjects: [], assignments: [], exams: [], projects: [], studyNotes: [], resources: [],
    bodyMeasurements: [], progressPhotos: [], quranLog: [], hadithCollection: [], shoppingList: [],
    quranBookmarks: [], quranFavorites: [], tasbeeh: { count: 0, target: 33, updatedAt: null },
    workoutPlan: { daysPerWeek: 4, trainingDays: ['Mon','Tue','Thu','Fri'], schedule: [] },
    pomodoro: { mode: '25/5', workMin: 25, breakMin: 5, sessionsToday: 0, dailyGoal: 8, lastResetDate: '', soundOn: true },
  };
}

function normalizeData(data, name) {
  const base   = emptyData(name);
  const merged = {
    ...base, ...data,
    profile:       { ...base.profile,       ...(data.profile       || {}) },
    settings:      { ...base.settings,      ...(data.settings      || {}) },
    notifications: { ...base.notifications, ...(data.notifications || {}) },
    security:      { ...base.security,      ...(data.security      || {}) },
    achievements:  { ...base.achievements,  ...(data.achievements  || {}) },
    reminderLog: { ...(data.reminderLog || {}) },
    workoutPlan:   { ...base.workoutPlan,   ...(data.workoutPlan   || {}) },
    quranProgress: {
      ...base.quranProgress, ...(data.quranProgress || {}),
      readingSettings: { ...base.quranProgress.readingSettings, ...((data.quranProgress && data.quranProgress.readingSettings) || {}) },
    },
    pomodoro:      { ...base.pomodoro,      ...(data.pomodoro      || {}) },
  };
  // Ensure every array key exists
  Object.keys(base).forEach((k) => {
    if (Array.isArray(base[k]) && !Array.isArray(merged[k])) merged[k] = [];
  });
  if (!Array.isArray(merged.notificationCenter)) merged.notificationCenter = [];
  if (!Array.isArray(merged.workoutPlan.schedule)) merged.workoutPlan.schedule = [];
  if (!Array.isArray(merged.workoutPlan.trainingDays)) merged.workoutPlan.trainingDays = base.workoutPlan.trainingDays;
  merged.tasbeeh = { ...base.tasbeeh, ...(data.tasbeeh || {}) };
  merged.workoutPlan.schedule = merged.workoutPlan.schedule.map((s) => ({
    status: 'Pending', exercises: [], durationMin: 0, calories: 0, taskId: null, ...s,
  }));
  // Hydrate default fields on array items
  merged.tasks    = merged.tasks.map((i, idx)    => ({
    completed: false, notes: '', tags: [], dueDate: '', recurring: null,
    subtasks: [], dependsOn: [], attachments: [], reminder: null, reminderFired: false,
    createdAt: i.createdAt || null, completedAt: i.completedAt || null, order: idx,
    ...i,
    tags: Array.isArray(i.tags) ? i.tags : [],
    subtasks: Array.isArray(i.subtasks) ? i.subtasks : [],
    dependsOn: Array.isArray(i.dependsOn) ? i.dependsOn : [],
    attachments: Array.isArray(i.attachments) ? i.attachments : [],
  }));
  merged.habits   = merged.habits.map((i)   => ({
    completed: false, completions: [], difficulty: 'Medium', weeklyTarget: 7, createdAt: i.createdAt || null,
    ...i,
    completions: Array.isArray(i.completions) ? i.completions : [],
  }));
  const habitsToday = new Date().toISOString().slice(0, 10);
  merged.habits.forEach((h) => { h.completed = h.completions.includes(habitsToday); });

  // Prayers: migrate to a real 5-daily-prayer model. Old free-form entries
  // (title/time/status only, no date) are preserved as-is under whatever
  // name they had — nothing is deleted — while the canonical daily prayers
  // are auto-generated so streaks/insights have real per-day data to work with.
  const PRAYER_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  const prayerToday = habitsToday;
  merged.prayers = merged.prayers.map((i) => ({
    date: i.date || '', prayer: i.prayer || i.title || '', time: i.time || '',
    status: i.status === 'Completed' ? 'Completed' : (i.status === 'Missed' ? 'Missed' : 'Pending'),
    completedAt: i.completedAt || null,
    ...i,
  }));
  merged.prayers.forEach((p) => { if (p.date && p.date < prayerToday && p.status === 'Pending') p.status = 'Missed'; });
  const existingTodayPrayers = new Set(merged.prayers.filter((p) => p.date === prayerToday).map((p) => p.prayer));
  PRAYER_NAMES.forEach((name) => {
    if (!existingTodayPrayers.has(name)) {
      merged.prayers.push({ id: makeId(), date: prayerToday, prayer: name, time: '', status: 'Pending', completedAt: null });
    }
  });
  merged.goals    = merged.goals.map((i)    => ({ period: 'Daily', category: 'General', completed: false, ...i }));
  merged.meals    = merged.meals.map((i)    => ({ protein: 0, carbs: 0, fat: 0, date: '', ingredients: '', ...i }));
  merged.workouts = merged.workouts.map((i) => ({ day: '', title: 'Exercise', weight: 0, reps: 0, sets: 1, note: '', ...i }));
  merged.study        = merged.study.map((i)        => ({ title: 'Study session', topic: '', subjectId: null, date: '', startTime: '', duration: 30, minutes: 30, priority: 'Medium', difficulty: 'Medium', status: 'Planned', progress: 0, elapsedSeconds: 0, notes: '', completed: false, completedAt: null, ...i }));
  merged.subjects     = merged.subjects.map((i)     => ({ name: 'Subject', icon: '📘', color: '#3b6ea5', teacher: '', semester: '', creditHours: 0, progress: 0, avgGrade: '', difficulty: 'Medium', notes: '', ...i }));
  merged.assignments  = merged.assignments.map((i)  => ({ title: 'Assignment', subjectId: null, dueDate: '', priority: 'Medium', estimatedTime: 60, status: 'Not Started', progress: 0, attachments: '', notes: '', reminder: 'None', repeat: 'None', completed: false, ...i }));
  merged.exams        = merged.exams.map((i)        => ({ subjectId: null, date: '', time: '', room: '', instructor: '', importance: 'Medium', preparation: 0, studyMaterials: '', notes: '', ...i }));
  merged.projects      = merged.projects.map((i)     => ({ title: 'Project', progress: 0, tasks: [], deadline: '', priority: 'Medium', attachments: '', members: '', notes: '', ...i }));
  merged.studyNotes   = merged.studyNotes.map((i)   => ({ text: '', color: '#f2d492', pinned: false, archived: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...i }));
  merged.profile.photo = isSafeImageDataUrl(merged.profile.photo) ? merged.profile.photo : null;
  merged.profile.cover = isSafeImageDataUrl(merged.profile.cover) ? merged.profile.cover : null;
  return merged;
}

// ─── Utilities ────────────────────────────────────────────────────────────────
function latestText(key) {
  const items = currentData[key] || [];
  return items.length ? `Latest: ${escapeHtml(items[items.length - 1].title || '—')}` : 'No records yet';
}

function selected(actual, expected) { return actual === expected ? 'selected' : ''; }

function makeId() {
  return (window.crypto && crypto.randomUUID)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

function initials(name) {
  return name.split(' ').filter(Boolean).map((p) => p[0]).join('').slice(0, 2).toUpperCase();
}

function firstName(name) { return name.split(' ')[0] || name; }

function percent(value, max) {
  return Math.max(0, Math.min(100, Math.round((Number(value) / Number(max || 1)) * 100)));
}

// ─── Empty-state illustrations ──────────────────────────────────────────────
const EMPTY_ICONS = {
  checklist: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l2 2 4-4"/><path d="M4 5h16v14H4z"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>',
  flame: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2c1 4-4 5-4 10a4 4 0 0 0 8 0c0-2-1-3-1-3s2 1 2 4a6 6 0 0 1-12 0c0-6 6-7 5-11z"/></svg>',
  dumbbell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 6.5l11 11M4 9l3-3 2 2-3 3-2-2zm9 9l3-3 2 2-3 3-2-2zM2 11l2-2M20 15l2-2"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5V4.5z"/><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/></svg>',
  apple: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8c-3 0-5.5 2.5-5.5 6.5S9 21 12 21s5.5-2.5 5.5-6.5S15 8 12 8z"/><path d="M12 8c0-2 1-4 3-4"/></svg>',
  camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-2h6l2 2h3v11H4z"/><circle cx="12" cy="13.5" r="3.5"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M12 20V4M20 20v-7"/></svg>',
  sparkles: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18"/></svg>',
  cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.4 12.4a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.6L21 7H6"/></svg>',
  activity: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l2 8 4-16 2 8h6"/></svg>',
  // Phase 3 UI pass — added for the new errorStateHtml() component below.
  'wifi-off': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 1l22 22M8.5 16.5a5 5 0 0 1 7 0M5 12.5a10 10 0 0 1 3.5-2.3M19 12.5a10 10 0 0 0-2.8-2.1M12 20h.01M12.5 8.3A14 14 0 0 1 22.5 11"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
  server: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="6" rx="1.5"/><rect x="3" y="14" width="18" height="6" rx="1.5"/><path d="M7 7h.01M7 17h.01"/></svg>',
  'alert-triangle': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
};

function emptyStateHtml(icon, message, ctaHtml = '') {
  return `<div class="empty-state">${EMPTY_ICONS[icon] || EMPTY_ICONS.sparkles}<p>${message}</p>${ctaHtml}</div>`;
}

/**
 * Phase 3 UI pass: a single, consistent error-state component for every
 * page, driven by core/ErrorMapper.js's `category` — so "no internet,"
 * "permission denied," "server unavailable," etc. all get a recognizable
 * icon and tone instead of each page inventing its own error markup.
 * Visually reuses `.empty-state` (same spacing/typography as the empty
 * state above) with an `.empty-state-error` modifier for a slightly
 * warmer/attention tint, per the brief's "Error States" section.
 * @param {{ category: string, message: string, retryable: boolean }} mappedError - from core/ErrorMapper.js
 * @param {{ onRetryId?: string }} [options] - onRetryId: element id to bind a retry click to (see bindErrorStateEvents)
 */
function errorStateHtml(mappedError, options = {}) {
  const icons = {
    network: 'wifi-off', permission: 'lock', 'not-found': 'sparkles',
    timeout: 'alert-triangle', unavailable: 'server', 'auth-expired': 'lock',
    validation: 'alert-triangle', unknown: 'alert-triangle',
  };
  const icon = icons[mappedError.category] || 'alert-triangle';
  const retryBtn = mappedError.retryable
    ? `<button type="button" class="secondary-btn empty-state-cta" id="${options.onRetryId || 'error-state-retry'}">${t('Try again')}</button>`
    : '';
  return `<div class="empty-state empty-state-error">${EMPTY_ICONS[icon]}<p>${escapeHtml(mappedError.message)}</p>${retryBtn}</div>`;
}

/**
 * Wires the retry button rendered by errorStateHtml(). Call after inserting
 * the HTML into the DOM, same pattern as bindTodoRootEvents/etc.
 * @param {HTMLElement} root
 * @param {() => void} onRetry
 * @param {string} [retryId]
 */
function bindErrorStateEvents(root, onRetry, retryId = 'error-state-retry') {
  const btn = root.querySelector(`#${retryId}`);
  if (btn) btn.addEventListener('click', onRetry);
}

// Reusable radial progress indicator. `colorVar` is a CSS custom property
// name (e.g. 'blue', 'green') so the ring always matches the active theme.
function progressRingSvg(pct, colorVar = 'blue', size = 56) {
  const clamped = Math.max(0, Math.min(100, pct));
  const stroke = Math.round(size / 9.5);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;
  return `
    <svg class="progress-ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${clamped}%">
      <circle class="progress-ring-track" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" fill="none" />
      <circle class="progress-ring-value" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" fill="none"
        stroke="var(--${colorVar})" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${offset}"
        transform="rotate(-90 ${size / 2} ${size / 2})" />
    </svg>
  `;
}

function labelize(key) {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
}

function byId(id) { return document.getElementById(id); }

function escapeHtml(v) {
  return String(v)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttr(v) { return escapeHtml(v); }

function isSafeImageDataUrl(value) {
  return typeof value === 'string' && /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value);
}
