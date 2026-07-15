// MYLIFE â€” main application logic
// Handles auth, routing, data persistence, and page rendering for all standard pages.
// The Workout page shares this file's sidebar/topbar/art rendering but uses its
// own custom content renderer (js/workout.js) for the planner/session/analytics UI.

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

const NAV_ICONS = {
  dashboard: '⌂', todo: '✓', habits: '↻', goals: '◎', calendar: '□',
  workout: '↗', prayer: '✦', nutrition: '◒', water: '≈', sleep: '☾',
  study: '✎', statistics: '◔', account: '◉',
};

// Items shown in the account (avatar) dropdown menu — not part of the main nav.
const ACCOUNT_MENU = [
  ['account.html',            '👤', 'Profile & Settings'],
  ['account.html#statistics', '📊', 'Statistics'],
  ['account.html#appearance', '🎨', 'Appearance'],
  ['account.html#backup',     '💾', 'Backup'],
  ['account.html#about',      '❓', 'Help'],
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

// â”€â”€â”€ Boot â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Boot helpers are called by page-specific files in js/pages/.


// â”€â”€â”€ Auth â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function initAuth() {
  applyTheme(localStorage.getItem(THEME_KEY) || 'light', localStorage.getItem(PALETTE_KEY) || 'palette-1');
  if (getSessionUser()) {
    window.location.href = 'pages/dashboard.html';
    return;
  }
  byId('show-register').addEventListener('click', () => showAuthPanel('register'));
  byId('show-login').addEventListener('click',    () => showAuthPanel('login'));
  byId('login-form').addEventListener('submit',    login);
  byId('register-form').addEventListener('submit', register);
}

function showAuthPanel(mode) {
  byId('login-panel').classList.toggle('hidden', mode !== 'login');
  byId('register-panel').classList.toggle('hidden', mode !== 'register');
  document.querySelectorAll('.form-message').forEach((el) => (el.textContent = ''));
}

function login(e) {
  e.preventDefault();
  const email = byId('login-email').value.trim().toLowerCase();
  const pwd   = byId('login-password').value;
  const user  = getUsers().find((u) => u.email === email && u.password === pwd);
  if (!user) { byId('login-message').textContent = 'Invalid email or password.'; return; }
  localStorage.setItem(SESSION_KEY, email);
  window.location.href = 'pages/dashboard.html';
}

function register(e) {
  e.preventDefault();
  const name     = byId('register-name').value.trim();
  const email    = byId('register-email').value.trim().toLowerCase();
  const password = byId('register-password').value;
  const confirm  = byId('register-confirm').value;
  const users    = getUsers();
  if (password !== confirm) { byId('register-message').textContent = 'Passwords do not match.'; return; }
  if (users.some((u) => u.email === email)) { byId('register-message').textContent = 'Email already registered.'; return; }
  const user = { id: makeId(), name, email, password, createdAt: new Date().toISOString() };
  users.push(user);
  saveUsers(users);
  saveData(email, emptyData(name));
  localStorage.setItem(SESSION_KEY, email);
  window.location.href = 'pages/dashboard.html';
}

// â”€â”€â”€ Page init â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
  renderStats();
  renderForm(pageKey);
  renderList(pageKey);
}

// â”€â”€â”€ Sidebar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function renderSidebar(pageKey) {
  byId('sidebar').innerHTML = `
    <a class="brand" href="dashboard.html">
      <span class="brand-logo" aria-hidden="true">M</span>
      <span><strong>MYLIFE</strong><small>Life Tracker</small></span>
    </a>
    <nav class="nav-list">
      ${NAV.map(([key, title, label]) => `
        <a class="nav-item${key === pageKey ? ' active' : ''}" data-accent="${(PAGES[key] && PAGES[key].accent) || 'blue'}" href="${key}.html">
          <span class="nav-icon" aria-hidden="true">${NAV_ICONS[key] || '•'}</span>
          <strong>${title}<small>${label}</small></strong>
        </a>
      `).join('')}
    </nav>
    ${accountWidgetHtml('sidebar', pageKey === 'account')}
  `;
  renderMobileAccountTrigger();
  bindAccountMenu('account-trigger', 'account-menu');
  bindAccountMenu('account-trigger-m', 'account-menu-m');
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
          <small>${escapeHtml(currentData.profile.headline || 'MyLife member')}</small>
        </span>
        <span class="sidebar-account-chevron" aria-hidden="true">⌄</span>
      </button>
      <div class="account-menu" id="${menuId}" role="menu" hidden>
        ${ACCOUNT_MENU.map(([href, icon, label]) => `
          <a role="menuitem" href="${href}">
            <span class="account-menu-icon" aria-hidden="true">${icon}</span><span>${label}</span>
          </a>
        `).join('')}
        <button role="menuitem" type="button" class="account-menu-logout" data-menu-logout>
          <span class="account-menu-icon" aria-hidden="true">🚪</span><span>Logout</span>
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
  if (!shell || byId('mobile-account-slot')) return;
  const slot = document.createElement('div');
  slot.id = 'mobile-account-slot';
  slot.className = 'mobile-account-slot';
  slot.innerHTML = accountWidgetHtml('m', currentPage === 'account');
  shell.appendChild(slot);
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

// â”€â”€â”€ Topbar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function renderTopbar(pageKey) {
  const page = PAGES[pageKey];
  byId('topbar').innerHTML = `
    <div>
      <p class="eyebrow">${escapeHtml(page.kicker)}</p>
      <h1>${escapeHtml(page.title)}</h1>
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

// â”€â”€â”€ Art panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function renderArt(pageKey) {
  if (!byId('page-art')) return;
  const page   = PAGES[pageKey];
  const counts = getCounts();
  byId('page-art').className   = `page-art accent-${page.accent}`;
  byId('page-art').innerHTML   = `
    <div class="art-copy">
      <p class="eyebrow">${escapeHtml(page.kicker)}</p>
      <h2>${pageKey === 'dashboard' ? `Welcome back, ${escapeHtml(firstName(currentUser.name))}.` : escapeHtml(page.title)}</h2>
      <p>${artDescription(pageKey)}</p>
    </div>
    <div class="art-board art-${pageKey}">
      ${artMarkup(pageKey, counts)}
    </div>
  `;
}

function artDescription(pageKey) {
  const map = {
    dashboard:  'Your hub â€” tasks, habits, goals, workouts, nutrition, and more, all in one place.',
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
        <p class="eyebrow">This week</p>
        <strong>${done}/${total} workouts done</strong>
        <p>${percent(done, total || 1)}% of your weekly plan complete${today ? ` — today is ${escapeHtml(today)}` : ''}.</p>
      </div>
      <div class="workout-track-list">
        ${upcoming.length ? upcoming.map((s) => `
          <div class="workout-track-item">
            <span>${escapeHtml(s.day)} • ${escapeHtml(s.type || 'Workout')}</span>
            <b>${escapeHtml(s.status)}</b>
          </div>
        `).join('') : '<div class="workout-track-item"><span>No plan yet</span><b>Set up days →</b></div>'}
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
    toggle.setAttribute('aria-label', 'Open navigation');
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
    toggle.setAttribute('aria-label', 'Open navigation');
    overlay.hidden = true;
  };
  const openNav = () => {
    document.body.classList.add('nav-open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close navigation');
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

// â”€â”€â”€ Stats strip â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function renderStats() {
  const counts = getCounts();
  const stats = [
    ['Tasks done',    `${counts.completedTasks}/${counts.tasks}`,   percent(counts.completedTasks, counts.tasks || 1)],
    ['Habits done',   `${counts.completedHabits}/${counts.habits}`, percent(counts.completedHabits, counts.habits || 1)],
    ['Goal progress', `${counts.completedGoals}/${counts.goals}`,   percent(counts.completedGoals, counts.goals || 1)],
    ['Water',         `${counts.water}/${currentData.settings.waterGoal}`, percent(counts.water, currentData.settings.waterGoal)],
  ];
  byId('stats-grid').innerHTML = stats.map(([label, value, width]) => `
    <article class="stat-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value))}</strong>
      <div class="meter"><i style="width:${width}%"></i></div>
    </article>
  `).join('');
}

// â”€â”€â”€ Form panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function renderForm(pageKey) {
  const page = PAGES[pageKey];
  const formTitle = byId('form-title');
  const formKicker = byId('form-kicker');
  const entryForm = byId('entry-form');

  // Guard: these elements don't exist on the workout page (handled by workout.js)
  if (!formTitle || !formKicker || !entryForm) return;

  formTitle.textContent  = page.title;
  formKicker.textContent = page.collection ? 'Add entry' : 'Manage';

  if (page.collection) {
    entryForm.innerHTML = `
      <div class="form-grid">${page.fields.map(fieldHtml).join('')}</div>
      <button class="primary-btn" type="submit">Add ${escapeHtml(page.title)}</button>
    `;
    entryForm.onsubmit = (e) => addEntry(e, pageKey);
    return;
  }

  entryForm.innerHTML = '<div class="empty-state">Use the sidebar to navigate to a data page.</div>';
  entryForm.onsubmit  = null;
}

// â”€â”€â”€ List panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function renderList(pageKey) {
  const listTitle = byId('list-title');
  if (!listTitle) return; // workout page has its own layout
  listTitle.textContent = PAGES[pageKey].title;

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
    byId('data-list').innerHTML = `<div class="empty-state">No ${escapeHtml(page.title.toLowerCase())} records yet. Add your first one above.</div>`;
    return;
  }
  byId('data-list').innerHTML = items.map((item) => cardHtml(item, page)).join('');
  bindDeleteButtons(pageKey);
}

function renderChecklist(pageKey) {
  const page  = PAGES[pageKey];
  const items = currentData[page.collection] || [];
  if (!items.length) {
    byId('data-list').innerHTML = `<div class="empty-state">No ${escapeHtml(page.title.toLowerCase())} records yet. Add your first one above.</div>`;
    return;
  }
  byId('data-list').innerHTML = items.map((item) => `
    <article class="data-card checklist-card ${item.completed ? 'complete' : ''}">
      <label class="check-row">
        <input type="checkbox" data-toggle="${escapeAttr(item.id)}" ${item.completed ? 'checked' : ''} />
        <span>${escapeHtml(item.title)}</span>
      </label>
      <p>${page.labels.map((k) => item[k] !== undefined ? `${labelize(k)}: ${escapeHtml(String(item[k]))}` : '').filter(Boolean).join(' Â· ')}</p>
      <div class="checklist-card-actions">
        ${item.workoutScheduleId ? `<a class="text-btn workout-start-link" href="workout.html?day=${escapeAttr(item.workoutScheduleId)}">Start Workout â†’</a>` : ''}
        <button class="small-danger" data-delete="${escapeAttr(item.id)}" type="button">Delete</button>
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
        <h3>${period} goals</h3>
        ${periodItems.length
          ? periodItems.map(goalCard).join('')
          : '<p class="muted">No goals in this period yet.</p>'}
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
      <p>Category: ${escapeHtml(item.category || 'â€”')} Â· Deadline: ${escapeHtml(item.deadline || 'â€”')}</p>
      <button class="small-danger" data-delete="${escapeAttr(item.id)}" type="button">Delete</button>
    </article>
  `;
}

function renderNutrition() {
  const totals = nutritionTotals();
  const items  = currentData.meals;
  byId('data-list').innerHTML = `
    <div class="summary-grid">
      ${nutritionSummaryCard('Calories', totals.calories, currentData.settings.calorieTarget)}
      ${nutritionSummaryCard('Protein',  totals.protein,  currentData.settings.proteinTarget, 'g')}
      ${nutritionSummaryCard('Carbs',    totals.carbs,    currentData.settings.carbTarget,    'g')}
      ${nutritionSummaryCard('Fat',      totals.fat,      currentData.settings.fatTarget,     'g')}
    </div>
    ${items.length
      ? items.map((item) => cardHtml(item, PAGES.nutrition)).join('')
      : '<div class="empty-state">No meals yet. Log calories, protein, carbs, and fat above.</div>'}
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
    <div class="summary-grid">
      ${nutritionSummaryCard('Task completion',  counts.completedTasks,  counts.tasks  || 1)}
      ${nutritionSummaryCard('Habit completion', counts.completedHabits, counts.habits || 1)}
      ${nutritionSummaryCard('Goal completion',  counts.completedGoals,  counts.goals  || 1)}
      ${nutritionSummaryCard('Water today',      counts.water,           currentData.settings.waterGoal, ' gl')}
    </div>
    ${['tasks', 'habits', 'goals', 'meals', 'study', 'sleep'].map((key) => `
      <article class="data-card stacked">
        <h3>${labelize(key)}</h3>
        <p>${(currentData[key] || []).length} records</p>
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
      ${nutritionSummaryCard('Tasks done',   counts.completedTasks,  counts.tasks  || 1)}
      ${nutritionSummaryCard('Habits done',  counts.completedHabits, counts.habits || 1)}
      ${nutritionSummaryCard('Goals done',   counts.completedGoals,  counts.goals  || 1)}
      ${nutritionSummaryCard('Calories',     n.calories,             currentData.settings.calorieTarget)}
    </div>
    ${Object.entries(counts).map(([key, value]) => `
      <article class="data-card stat-line">
        <h3>${labelize(key)}</h3>
        <strong>${value}</strong>
      </article>
    `).join('')}
  `;
}

// â”€â”€â”€ Field builder â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function fieldHtml([name, label, type, options]) {
  if (type === 'textarea') {
    return `<label class="full-field">${escapeHtml(label)}<textarea name="${name}"></textarea></label>`;
  }
  if (type === 'select') {
    return `<label>${escapeHtml(label)}<select name="${name}" required>${options.map((o) => `<option>${escapeHtml(o)}</option>`).join('')}</select></label>`;
  }
  return `<label>${escapeHtml(label)}<input name="${name}" type="${type}" required /></label>`;
}

function cardHtml(item, page) {
  return `
    <article class="data-card">
      <div>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${page.labels.map((k) => item[k] !== undefined ? `${labelize(k)}: ${escapeHtml(String(item[k]))}` : '').filter(Boolean).join(' Â· ')}</p>
      </div>
      <button class="small-danger" data-delete="${escapeAttr(item.id)}" type="button">Delete</button>
    </article>
  `;
}

// â”€â”€â”€ CRUD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function addEntry(e, pageKey) {
  e.preventDefault();
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
}

// â”€â”€â”€ Theme â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
  const resolvedPalette = palette || localStorage.getItem(PALETTE_KEY) || 'palette-1';
  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.dataset.palette = resolvedPalette;
  document.documentElement.style.colorScheme = resolvedTheme;
  document.body.dataset.theme = resolvedTheme;
  document.body.dataset.palette = resolvedPalette;
  localStorage.setItem(THEME_KEY, resolvedTheme);
  localStorage.setItem(PALETTE_KEY, resolvedPalette);
}

function applyAppearance(s) {
  const root = document.documentElement;
  root.dataset.fontSize   = s.fontSize || 'md';
  root.dataset.radius     = s.radius   || 'md';
  root.dataset.animations = s.animations === false ? 'off' : 'on';
  root.dataset.compact    = s.compact ? 'on' : 'off';
  root.dataset.glass      = s.glass ? 'on' : 'off';
}

// â”€â”€â”€ Session / storage â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function logout() {
  localStorage.removeItem(SESSION_KEY);
  window.location.href = '../index.html';
}

function exportData() {
  const blob = new Blob(
    [JSON.stringify({ user: currentUser, data: currentData }, null, 2)],
    { type: 'application/json' }
  );
  const a = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = `mylife-${currentUser.email}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function getSessionUser() {
  const email = localStorage.getItem(SESSION_KEY);
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
  } catch { /* corrupt data â€” fall through */ }
  const data = emptyData(name);
  saveData(email, data);
  return data;
}

function saveData(email, data) { localStorage.setItem(DATA_PREFIX + email, JSON.stringify(data)); }
function persist() { saveData(currentUser.email, currentData); }

// â”€â”€â”€ Data helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      theme: 'light', palette: 'palette-1',
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

// â”€â”€â”€ Utilities â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function latestText(key) {
  const items = currentData[key] || [];
  return items.length ? `Latest: ${escapeHtml(items[items.length - 1].title || 'â€”')}` : 'No records yet';
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
