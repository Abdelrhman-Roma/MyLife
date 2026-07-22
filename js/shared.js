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
const THEME_KEY   = 'mylife.theme';
const PALETTE_KEY = 'mylife.palette';

const NAV = [
  ['dashboard',   'Dashboard',  'Home'],
  ['todo',        'Todo',       'Tasks'],
  ['habits',      'Habits',     'Routines'],
  ['goals',       'Goals',      'Targets'],
  ['calendar',    'Calendar',   'Planner'],
  ['workout',     'Workout',    'Training'],
  ['prayer',      'Prayer',     'Spiritual'],
  ['nutrition',   'Nutrition',  'Meals'],
  ['water',       'Water',      'Hydration'],
  ['sleep',       'Sleep',      'Recovery'],
  ['study',       'Study',      'Focus'],
  ['statistics',  'Statistics', 'Insights'],
];

const NAV_ICONS = Object.fromEntries(['dashboard','todo','habits','goals','calendar','workout','prayer','nutrition','water','sleep','study','statistics','account'].map((key, i) => [key, `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="${i % 3 === 0 ? '8' : '6'}"/><path d="M${5 + i % 5} 12h${7 + i % 4}M12 ${5 + i % 5}v${7 + i % 4}"/></svg>`]));
const PLANET_ASSETS = { dashboard:'jupiter.jpg', todo:'moon.jpg', habits:'mars.jpg', goals:'mars.jpg', calendar:'Milky Way.jpg', workout:'mars.jpg', prayer:'sun.jpg', nutrition:'Neptune.jpg', water:'Uranus.jpg', sleep:'moon.jpg', study:'ISS.jpg', statistics:'jupiter.jpg', account:'jupiter.jpg' };
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
  nutrition:  { title: 'Nutrition',   kicker: 'Meal tracking',       accent: 'orange', collection: 'meals',    fields: [['title','Meal','text'],['calories','Calories','number'],['protein','Protein','number'],['carbs','Carbs','number'],['fat','Fat','number'],['type','Type','select',['Breakfast','Lunch','Dinner','Snack']]], labels: ['calories','protein','carbs','fat','type'] },
  water:      { title: 'Water',       kicker: 'Hydration',           accent: 'blue',   collection: 'water',    fields: [['title','Entry','text'],['amount','Glasses','number'],['time','Time','time']], labels: ['amount','time'] },
  sleep:      { title: 'Sleep',       kicker: 'Recovery',            accent: 'purple', collection: 'sleep',    fields: [['title','Sleep note','text'],['hours','Hours','number'],['quality','Quality','select',['Low','Good','Great']]], labels: ['hours','quality'] },
  study:      { title: 'Study',       kicker: 'Focus sessions',      accent: 'blue',   collection: 'study',    fields: [['title','Subject','text'],['topic','Topic','text'],['minutes','Minutes','number']], labels: ['topic','minutes'] },
  statistics: { title: 'Statistics',  kicker: 'Calculated insights', accent: 'green' },
  account:    { title: 'Profile & Settings', kicker: 'Your account', accent: 'purple' },
};

let currentUser = null;
let currentData = null;
let currentPage = document.body.dataset.page;

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

function login(e) {
  e.preventDefault();
  if (!e.currentTarget.checkValidity()) {
    e.currentTarget.reportValidity();
    return;
  }
  const email = byId('login-email').value.trim().toLowerCase();
  const pwd   = byId('login-password').value;
  const user  = getUsers().find((u) => u.email === email && u.password === pwd);
  if (!user) { byId('login-message').textContent = 'Invalid email or password.'; return; }
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

function register(e) {
  e.preventDefault();
  if (!e.currentTarget.checkValidity()) {
    e.currentTarget.reportValidity();
    return;
  }
  const name     = byId('register-name').value.trim();
  const email    = byId('register-email').value.trim().toLowerCase();
  const password = byId('register-password').value;
  const confirm  = byId('register-confirm').value;
  const users    = getUsers();
  if (!name) { byId('register-message').textContent = 'Please enter your name.'; return; }
  if (password !== confirm) { byId('register-message').textContent = 'Passwords do not match.'; return; }
  if (users.some((u) => u.email === email)) { byId('register-message').textContent = 'Email already registered.'; return; }
  const user = { id: makeId(), name, email, password, createdAt: new Date().toISOString() };
  users.push(user);
  saveUsers(users);
  saveData(email, emptyData(name));
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
  form.addEventListener('submit', (event) => {
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
    users[index] = { ...users[index], password };
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
  currentData = normalizeData(getData(currentUser.email, currentUser.name), currentUser.name);
  persist();
  applyTheme(currentData.settings.theme, currentData.settings.palette);
  applyAppearance(currentData.settings);
  renderSidebar(pageKey);
  initMobileNav();
  renderTopbar(pageKey);
  renderArt(pageKey);
  return true;
}

function initPage(pageKey) {
  if (!bootShell(pageKey)) return;
  renderPageContent(pageKey);
  window.__pageContentReinit = () => renderPageContent(pageKey);
}

function renderPageContent(pageKey) {
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
function renderSidebar(pageKey) {
  byId('sidebar').innerHTML = `
    <a class="brand" href="dashboard.html">
      <span class="brand-logo" aria-hidden="true"></span>
      <span><strong>Momentum</strong><small>${t('Life Tracker')}</small></span>
    </a>
    <nav class="nav-list">
      ${NAV.map(([key, title, label]) => `
        <a class="nav-item${key === pageKey ? ' active' : ''}" data-accent="${(PAGES[key] && PAGES[key].accent) || 'blue'}" href="${key}.html">
          <span class="nav-icon" aria-hidden="true">${NAV_ICONS[key] || '•'}</span>
          <strong>${t(title)}<small>${t(label)}</small></strong>
        </a>
      `).join('')}
    </nav>
    ${accountWidgetHtml('sidebar', pageKey === 'account')}
  `;
  renderMobileAccountTrigger();
  bindAccountMenu('account-trigger', 'account-menu');
  bindLanguageSwitchers(byId('sidebar'));
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
      <button class="secondary-btn" id="theme-btn" type="button">${currentData.settings.theme === 'dark' ? 'Light mode' : 'Dark mode'}</button>
      <button class="secondary-btn" id="export-btn" type="button">Export</button>
      <button class="danger-btn"    id="logout-btn" type="button">Logout</button>
      <div class="avatar" style="${currentData.profile.photo ? `background:url('${currentData.profile.photo}') center/cover;` : ''}">${currentData.profile.photo ? '' : initials(currentUser.name)}</div>
    </div>
  `;
  byId('logout-btn').addEventListener('click', logout);
  byId('export-btn').addEventListener('click', exportData);
  byId('theme-btn').addEventListener('click',  toggleTheme);
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
function renderStats() {
  const counts = getCounts();
  const stats = [
    [t('Tasks done'),    `${counts.completedTasks}/${counts.tasks}`,   percent(counts.completedTasks, counts.tasks || 1)],
    [t('Habits done'),   `${counts.completedHabits}/${counts.habits}`, percent(counts.completedHabits, counts.habits || 1)],
    [t('Goal progress'), `${counts.completedGoals}/${counts.goals}`,   percent(counts.completedGoals, counts.goals || 1)],
    [t('Water'),         `${counts.water}/${currentData.settings.waterGoal}`, percent(counts.water, currentData.settings.waterGoal)],
  ];
  byId('stats-grid').innerHTML = stats.map(([label, value, width]) => `
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

  entryForm.innerHTML = `<div class="empty-state">${t('Use the sidebar to navigate to a data page.')}</div>`;
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
    byId('data-list').innerHTML = `<div class="empty-state">${t('No {title} records yet. Add your first one above.', { title: escapeHtml(t(page.title).toLowerCase()) })}</div>`;
    return;
  }
  byId('data-list').innerHTML = items.map((item) => cardHtml(item, page)).join('');
  bindDeleteButtons(pageKey);
}

function renderChecklist(pageKey) {
  const page  = PAGES[pageKey];
  const items = currentData[page.collection] || [];
  if (!items.length) {
    byId('data-list').innerHTML = `<div class="empty-state">${t('No {title} records yet. Add your first one above.', { title: escapeHtml(t(page.title).toLowerCase()) })}</div>`;
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
      : `<div class="empty-state">${t('No meals yet. Log calories, protein, carbs, and fat above.')}</div>`}
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

function renderDashboard() {
  const counts = getCounts();
  byId('data-list').innerHTML = `
    <section class="mission-status" aria-label="Momentum progress">
      <div><p class="eyebrow">Current destination</p><h2>Earth orbit</h2><p>Level 3 · 640 / 1,000 XP</p></div>
      <div class="meter" aria-label="64% to next level"><i style="width:64%"></i></div>
      <strong>7-Day Orbit</strong>
    </section>
    <div class="summary-grid">
      ${nutritionSummaryCard(t('Task completion'),  counts.completedTasks,  counts.tasks  || 1)}
      ${nutritionSummaryCard(t('Habit completion'), counts.completedHabits, counts.habits || 1)}
      ${nutritionSummaryCard(t('Goal completion'),  counts.completedGoals,  counts.goals  || 1)}
      ${nutritionSummaryCard(t('Water today'),      counts.water,           currentData.settings.waterGoal, ' gl')}
    </div>
    ${['tasks', 'habits', 'goals', 'meals', 'study', 'sleep'].map((key) => `
      <article class="data-card stacked">
        <h3>${t(labelize(key))}</h3>
        <p>${(currentData[key] || []).length} ${t('records')}</p>
        <small>${latestText(key)}</small>
      </article>
    `).join('')}
  `;
}

function renderStatistics() {
  const counts = getCounts();
  const n      = nutritionTotals();
  byId('data-list').innerHTML = `
    <div class="summary-grid">
      ${nutritionSummaryCard(t('Tasks done'),   counts.completedTasks,  counts.tasks  || 1)}
      ${nutritionSummaryCard(t('Habits done'),  counts.completedHabits, counts.habits || 1)}
      ${nutritionSummaryCard(t('Goals done'),   counts.completedGoals,  counts.goals  || 1)}
      ${nutritionSummaryCard(t('Calories'),     n.calories,             currentData.settings.calorieTarget)}
    </div>
    ${Object.entries(counts).map(([key, value]) => `
      <article class="data-card stat-line">
        <h3>${t(labelize(key))}</h3>
        <strong>${value}</strong>
      </article>
    `).join('')}
  `;
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
  const item = { id: makeId(), completed: false };
  page.fields.forEach(([name, , type]) => {
    const val = form.get(name);
    item[name] = type === 'number' ? Number(val) : String(val || '');
  });
  currentData[page.collection].push(item);
  persist();
  e.currentTarget.reset();
  initPage(pageKey);
}

function toggleComplete(pageKey, id) {
  const col  = PAGES[pageKey].collection;
  const item = currentData[col].find((entry) => entry.id === id);
  if (item) item.completed = !item.completed;
  persist();
  initPage(pageKey);
}

function bindDeleteButtons(pageKey) {
  document.querySelectorAll('[data-delete]').forEach((btn) =>
    btn.addEventListener('click', () => deleteEntry(pageKey, btn.dataset.delete))
  );
}

function deleteEntry(pageKey, id) {
  const col = PAGES[pageKey].collection;
  currentData[col] = currentData[col].filter((item) => item.id !== id);
  persist();
  initPage(pageKey);
  showToast(t('Deleted'), 'danger');
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

function showToast(message, variant = 'default', duration = 2600) {
  const region = ensureToastRegion();
  const toast = document.createElement('div');
  toast.className = `toast toast-${variant}`;
  toast.innerHTML = `<span class="toast-icon" aria-hidden="true">${TOAST_ICONS[variant] || TOAST_ICONS.default}</span><span>${escapeHtml(message)}</span>`;
  region.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('is-leaving');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, duration);
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
  layer.hidden = false;
  layer.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal-card">
        <h2>${escapeHtml(title)}</h2>
        <div class="modal-body">${body}</div>
        <div class="modal-actions">
          <button class="secondary-btn" type="button" data-modal-cancel>${escapeHtml(cancelLabel)}</button>
          <button class="${danger ? 'danger-btn' : 'primary-btn'}" type="button" data-modal-confirm>${escapeHtml(confirmLabel)}</button>
        </div>
      </div>
    </div>
  `;
  requestAnimationFrame(() => layer.querySelector('.modal-backdrop').classList.add('open'));
  let resolved = false;
  const onKeydown = (e) => { if (e.key === 'Escape') cancel(); };
  const cancel = () => {
    if (resolved) return;
    resolved = true;
    document.removeEventListener('keydown', onKeydown);
    closeModal();
    if (onCancel) onCancel();
  };
  const confirm = () => {
    if (resolved) return;
    resolved = true;
    document.removeEventListener('keydown', onKeydown);
    closeModal();
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
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); }
  catch { return []; }
}

function saveUsers(users) { localStorage.setItem(USERS_KEY, JSON.stringify(users)); }

function getData(email, name) {
  try {
    const saved = localStorage.getItem(DATA_PREFIX + email);
    if (saved) return JSON.parse(saved);
  } catch { /* corrupt data — fall through */ }
  const data = emptyData(name);
  saveData(email, data);
  return data;
}

function saveData(email, data) { localStorage.setItem(DATA_PREFIX + email, JSON.stringify(data)); }
function persist() { saveData(currentUser.email, currentData); }

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
    prayers:         currentData.prayers.length,
    meals:           currentData.meals.length,
    water:           currentData.water.reduce((s, i) => s + Number(i.amount || 0), 0),
    sleep:           currentData.sleep.length,
    study:           currentData.study.length,
  };
}

function nutritionTotals() {
  return currentData.meals.reduce(
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
    achievements: { unlocked: [] },
    tasks:    [], habits: [], goals: [], events: [], workouts: [],
    prayers:  [], meals:  [], water: [], sleep:  [], study:   [],
    subjects: [], assignments: [], exams: [], projects: [], studyNotes: [],
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
    workoutPlan:   { ...base.workoutPlan,   ...(data.workoutPlan   || {}) },
    pomodoro:      { ...base.pomodoro,      ...(data.pomodoro      || {}) },
  };
  // Ensure every array key exists
  Object.keys(base).forEach((k) => {
    if (Array.isArray(base[k]) && !Array.isArray(merged[k])) merged[k] = [];
  });
  if (!Array.isArray(merged.workoutPlan.schedule)) merged.workoutPlan.schedule = [];
  if (!Array.isArray(merged.workoutPlan.trainingDays)) merged.workoutPlan.trainingDays = base.workoutPlan.trainingDays;
  merged.workoutPlan.schedule = merged.workoutPlan.schedule.map((s) => ({
    status: 'Pending', exercises: [], durationMin: 0, calories: 0, taskId: null, ...s,
  }));
  // Hydrate default fields on array items
  merged.tasks    = merged.tasks.map((i)    => ({ completed: false, ...i }));
  merged.habits   = merged.habits.map((i)   => ({ completed: false, ...i }));
  merged.goals    = merged.goals.map((i)    => ({ period: 'Daily', category: 'General', completed: false, ...i }));
  merged.meals    = merged.meals.map((i)    => ({ protein: 0, carbs: 0, fat: 0, ...i }));
  merged.workouts = merged.workouts.map((i) => ({ day: '', title: 'Exercise', weight: 0, reps: 0, sets: 1, note: '', ...i }));
  merged.study        = merged.study.map((i)        => ({ title: 'Study session', topic: '', subjectId: null, date: '', startTime: '', duration: 30, minutes: 30, priority: 'Medium', difficulty: 'Medium', status: 'Planned', progress: 0, elapsedSeconds: 0, notes: '', completed: false, completedAt: null, ...i }));
  merged.subjects     = merged.subjects.map((i)     => ({ name: 'Subject', icon: '📘', color: '#3b6ea5', teacher: '', semester: '', creditHours: 0, progress: 0, avgGrade: '', difficulty: 'Medium', notes: '', ...i }));
  merged.assignments  = merged.assignments.map((i)  => ({ title: 'Assignment', subjectId: null, dueDate: '', priority: 'Medium', estimatedTime: 60, status: 'Not Started', progress: 0, attachments: '', notes: '', reminder: 'None', repeat: 'None', completed: false, ...i }));
  merged.exams        = merged.exams.map((i)        => ({ subjectId: null, date: '', time: '', room: '', instructor: '', importance: 'Medium', preparation: 0, studyMaterials: '', notes: '', ...i }));
  merged.projects      = merged.projects.map((i)     => ({ title: 'Project', progress: 0, tasks: [], deadline: '', priority: 'Medium', attachments: '', members: '', notes: '', ...i }));
  merged.studyNotes   = merged.studyNotes.map((i)   => ({ text: '', color: '#f2d492', pinned: false, archived: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...i }));
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
