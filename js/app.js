// ده الملف الرئيسي اللي بيحمل منطق الصفحة والتعامل مع المستخدم والبيانات في MYLIFE
const USERS_KEY = 'mylife.users';
const SESSION_KEY = 'mylife.session';
const DATA_PREFIX = 'mylife.data.';

const nav = [
  ['dashboard', 'Dashboard', 'Home'],
  ['todo', 'Todo', 'Tasks'],
  ['habits', 'Habits', 'Routines'],
  ['goals', 'Goals', 'Targets'],
  ['calendar', 'Calendar', 'Planner'],
  ['gym', 'Gym', 'Training'],
  ['prayer', 'Prayer', 'Spiritual'],
  ['nutrition', 'Nutrition', 'Meals'],
  ['water', 'Water', 'Hydration'],
  ['sleep', 'Sleep', 'Recovery'],
  ['study', 'Study', 'Focus'],
  ['statistics', 'Statistics', 'Insights'],
  ['settings', 'Settings', 'System'],
  ['profile', 'Profile', 'Account'],
];

const pages = {
  dashboard: { title: 'Dashboard', kicker: 'Personal workspace', accent: 'blue' },
  todo: { title: 'Todo', kicker: 'Today tasks', collection: 'tasks', accent: 'blue', fields: [['title', 'Task', 'text'], ['time', 'Time', 'time'], ['priority', 'Priority', 'select', ['Low', 'Medium', 'High']]], labels: ['time', 'priority'] },
  habits: { title: 'Habits', kicker: 'Daily routines', collection: 'habits', accent: 'green', fields: [['title', 'Habit', 'text'], ['target', 'Target', 'text'], ['category', 'Category', 'text']], labels: ['target', 'category'] },
  goals: { title: 'Goals', kicker: 'Progress targets', collection: 'goals', accent: 'purple', fields: [['title', 'Goal', 'text'], ['period', 'Period', 'select', ['Daily', 'Weekly', 'Monthly', 'Yearly']], ['category', 'Category', 'text'], ['deadline', 'Deadline', 'date']], labels: ['period', 'category', 'deadline'] },
  calendar: { title: 'Calendar', kicker: 'Weekly plan', collection: 'events', accent: 'orange', fields: [['title', 'Event', 'text'], ['date', 'Date', 'date'], ['time', 'Time', 'time']], labels: ['date', 'time'] },
  gym: { title: 'Gym', kicker: 'Workout log', collection: 'workouts', accent: 'red', fields: [['day', 'Workout day', 'date'], ['title', 'Exercise', 'text'], ['weight', 'Weight', 'number'], ['reps', 'Repetitions', 'number'], ['sets', 'Sets', 'number'], ['note', 'Note', 'textarea']], labels: ['day', 'weight', 'reps', 'sets'] },
  prayer: { title: 'Prayer', kicker: 'Spiritual tracker', collection: 'prayers', accent: 'green', fields: [['title', 'Prayer or routine', 'text'], ['time', 'Time', 'time'], ['status', 'Status', 'select', ['Planned', 'Completed']]], labels: ['time', 'status'] },
  nutrition: { title: 'Nutrition', kicker: 'Meal tracking', collection: 'meals', accent: 'orange', fields: [['title', 'Meal', 'text'], ['calories', 'Calories', 'number'], ['protein', 'Protein', 'number'], ['carbs', 'Carbs', 'number'], ['fat', 'Fat', 'number'], ['type', 'Type', 'select', ['Breakfast', 'Lunch', 'Dinner', 'Snack']]], labels: ['calories', 'protein', 'carbs', 'fat', 'type'] },
  water: { title: 'Water', kicker: 'Hydration', collection: 'water', accent: 'blue', fields: [['title', 'Entry', 'text'], ['amount', 'Glasses', 'number'], ['time', 'Time', 'time']], labels: ['amount', 'time'] },
  sleep: { title: 'Sleep', kicker: 'Recovery', collection: 'sleep', accent: 'purple', fields: [['title', 'Sleep note', 'text'], ['hours', 'Hours', 'number'], ['quality', 'Quality', 'select', ['Low', 'Good', 'Great']]], labels: ['hours', 'quality'] },
  study: { title: 'Study', kicker: 'Focus sessions', collection: 'study', accent: 'blue', fields: [['title', 'Subject', 'text'], ['topic', 'Topic', 'text'], ['minutes', 'Minutes', 'number']], labels: ['topic', 'minutes'] },
  statistics: { title: 'Statistics', kicker: 'Calculated insights', accent: 'green' },
  settings: { title: 'Settings', kicker: 'Preferences', accent: 'orange' },
  profile: { title: 'Profile', kicker: 'Account details', accent: 'purple' },
};

let currentUser = null;
let currentData = null;
let currentPage = document.body.dataset.page;

// ده الجزء اللي بيشغل التطبيق حسب نوع الصفحة الحالية
document.addEventListener('DOMContentLoaded', () => {
  if (currentPage === 'auth') initAuth();
  else initPage(currentPage);
});

// ده الجزء اللي بيهتم بصفحة تسجيل الدخول وإنشاء الحساب
function initAuth() {
  applyTheme(localStorage.getItem('mylife.theme') || 'light');
  if (getSessionUser()) {
    window.location.href = 'pages/dashboard.html';
    return;
  }
  byId('show-register').addEventListener('click', () => showAuthPanel('register'));
  byId('show-login').addEventListener('click', () => showAuthPanel('login'));
  byId('login-form').addEventListener('submit', login);
  byId('register-form').addEventListener('submit', register);
}

// ده الجزء اللي بيحمّل الصفحة الحالية ويجهّز البيانات والواجهة
function initPage(pageKey) {
  currentUser = getSessionUser();
  if (!currentUser) {
    window.location.href = '../index.html';
    return;
  }
  currentPage = pageKey;
  currentData = normalizeData(getData(currentUser.email, currentUser.name), currentUser.name);
  persist();
  applyTheme(currentData.settings.theme);
  renderSidebar(pageKey);
  renderTopbar(pageKey);
  renderArt(pageKey);
  renderStats();
  renderForm(pageKey);
  renderList(pageKey);
}

function showAuthPanel(mode) {
  byId('login-panel').classList.toggle('hidden', mode !== 'login');
  byId('register-panel').classList.toggle('hidden', mode !== 'register');
  document.querySelectorAll('.form-message').forEach((node) => {
    node.textContent = '';
  });
}

function login(event) {
  event.preventDefault();
  const email = byId('login-email').value.trim().toLowerCase();
  const password = byId('login-password').value;
  const user = getUsers().find((item) => item.email === email && item.password === password);
  if (!user) {
    byId('login-message').textContent = 'Invalid email or password.';
    return;
  }
  localStorage.setItem(SESSION_KEY, email);
  window.location.href = 'pages/dashboard.html';
}

function register(event) {
  event.preventDefault();
  const name = byId('register-name').value.trim();
  const email = byId('register-email').value.trim().toLowerCase();
  const password = byId('register-password').value;
  const confirm = byId('register-confirm').value;
  const users = getUsers();
  if (password !== confirm) {
    byId('register-message').textContent = 'Passwords do not match.';
    return;
  }
  if (users.some((item) => item.email === email)) {
    byId('register-message').textContent = 'This email already has an account.';
    return;
  }
  const user = { id: makeId(), name, email, password, createdAt: new Date().toISOString() };
  users.push(user);
  saveUsers(users);
  saveData(email, emptyData(name));
  localStorage.setItem(SESSION_KEY, email);
  window.location.href = 'pages/dashboard.html';
}

// ده الجزء اللي بيظبط الشريط الجانبي والروابط بين الصفحات
function renderSidebar(pageKey) {
  byId('sidebar').innerHTML = `
    <a class="brand" href="dashboard.html">
      <span class="brand-mark">M</span>
      <span><strong>MYLIFE</strong><small>Life Tracker</small></span>
    </a>
    <nav class="nav-list">
      ${nav.map(([key, title, label]) => `
        <a class="nav-item ${key === pageKey ? 'active' : ''}" href="${key}.html">
          <span>${label}</span>
          <strong>${title}</strong>
        </a>
      `).join('')}
    </nav>
    <div class="sidebar-card">
      <span>Signed in</span>
      <strong>${escapeHtml(currentUser.name)}</strong>
    </div>
  `;
}

function renderTopbar(pageKey) {
  const page = pages[pageKey];
  byId('topbar').innerHTML = `
    <div>
      <p class="eyebrow">${page.kicker}</p>
      <h1>${page.title}</h1>
    </div>
    <div class="topbar-actions">
      <button class="secondary-btn" id="theme-btn" type="button">${currentData.settings.theme === 'dark' ? 'Light mode' : 'Dark mode'}</button>
      <button class="secondary-btn" id="export-btn" type="button">Export</button>
      <button class="danger-btn" id="logout-btn" type="button">Logout</button>
      <div class="avatar">${initials(currentUser.name)}</div>
    </div>
  `;
  byId('logout-btn').addEventListener('click', logout);
  byId('export-btn').addEventListener('click', exportData);
  byId('theme-btn').addEventListener('click', toggleTheme);
}

function renderArt(pageKey) {
  const page = pages[pageKey];
  const counts = getCounts();
  byId('page-art').className = `page-art accent-${page.accent}`;
  byId('page-art').innerHTML = `
    <div class="art-copy">
      <p class="eyebrow">${page.kicker}</p>
      <h2>${pageKey === 'dashboard' ? `Welcome back, ${escapeHtml(firstName(currentUser.name))}.` : page.title}</h2>
      <p>${artDescription(pageKey)}</p>
    </div>
    <div class="art-board art-${pageKey}">
      ${artMarkup(pageKey, counts)}
    </div>
  `;
}

function artDescription(pageKey) {
  const text = {
    dashboard: 'Your dashboard is built from your own saved records, completion checks, workouts, nutrition, and goals.',
    todo: 'Check completed tasks and watch the statistics update instantly.',
    habits: 'Check completed habits and keep routines visible.',
    goals: 'Create daily, weekly, monthly, and yearly goals with categories.',
    calendar: 'A calendar-style planning surface made from code.',
    gym: 'Track workout days, exercises, weights, repetitions, sets, notes, and progress.',
    prayer: 'Prayer routine cards with clear planned and completed states.',
    nutrition: 'Track calories, protein, carbs, and fat against your personal targets.',
    water: 'Hydration bars generated from your water entries.',
    sleep: 'Sleep quality cards and recovery meters.',
    study: 'Study session panels with subject and topic tracking.',
    statistics: 'Charts and totals are calculated from your account data.',
    settings: 'Switch light or dark mode and set nutrition and health targets.',
    profile: 'Account profile details for the active user.',
  };
  return text[pageKey];
}

function artMarkup(pageKey, counts) {
  if (pageKey === 'calendar') {
    return `<div class="calendar-grid">${Array.from({ length: 35 }, (_, index) => `<span class="${index % 7 === 0 ? 'hot' : ''}">${index + 1}</span>`).join('')}</div>`;
  }
  if (pageKey === 'water') {
    return `<div class="water-bars">${Array.from({ length: 8 }, (_, index) => `<span class="${index < Math.min(counts.water, 8) ? 'filled' : ''}"></span>`).join('')}</div><strong>${counts.water}/${currentData.settings.waterGoal} glasses</strong>`;
  }
  if (pageKey === 'sleep') {
    return `<div class="sleep-ring"><span>${counts.sleep}</span></div><p>sleep records</p>`;
  }
  if (pageKey === 'nutrition') {
    const n = nutritionTotals();
    return macroBoard([
      ['Calories', n.calories, currentData.settings.calorieTarget],
      ['Protein', n.protein, currentData.settings.proteinTarget],
      ['Carbs', n.carbs, currentData.settings.carbTarget],
      ['Fat', n.fat, currentData.settings.fatTarget],
    ]);
  }
  if (pageKey === 'gym') {
    return `<div class="chart-bars">${gymStats().byExercise.map((item) => `<span style="height:${Math.max(18, Math.min(100, item.volume / Math.max(gymStats().maxVolume, 1) * 100))}%"></span>`).join('') || '<span style="height:18%"></span><span style="height:18%"></span><span style="height:18%"></span>'}</div>`;
  }
  if (pageKey === 'statistics') {
    return `<div class="chart-bars">${Object.values(counts).slice(0, 8).map((value) => `<span style="height:${Math.max(14, Math.min(96, value * 12))}%"></span>`).join('')}</div>`;
  }
  return `
    <div class="mini-top"></div>
    <div class="mini-cards"><span></span><span></span><span></span></div>
    <div class="mini-list"><span></span><span></span><span></span><span></span></div>
  `;
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

// ده الجزء اللي بيعرض الإحصائيات السريعة في الصفحة
function renderStats() {
  const counts = getCounts();
  const stats = [
    ['Tasks done', `${counts.completedTasks}/${counts.tasks}`, percent(counts.completedTasks, counts.tasks || 1)],
    ['Habits done', `${counts.completedHabits}/${counts.habits}`, percent(counts.completedHabits, counts.habits || 1)],
    ['Goal progress', `${counts.completedGoals}/${counts.goals}`, percent(counts.completedGoals, counts.goals || 1)],
    ['Water', `${counts.water}/${currentData.settings.waterGoal}`, percent(counts.water, currentData.settings.waterGoal)],
  ];
  byId('stats-grid').innerHTML = stats.map(([label, value, width]) => `
    <article class="stat-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value))}</strong>
      <div class="meter"><i style="width:${width}%"></i></div>
    </article>
  `).join('');
}

function renderForm(pageKey) {
  const page = pages[pageKey];
  byId('form-title').textContent = page.title;
  byId('form-kicker').textContent = page.collection ? 'Add user data' : 'Manage';
  if (page.collection) {
    byId('entry-form').innerHTML = `
      <div class="form-grid">${page.fields.map(fieldHtml).join('')}</div>
      <button class="primary-btn" type="submit">Add ${page.title}</button>
    `;
    byId('entry-form').onsubmit = (event) => addEntry(event, pageKey);
    return;
  }
  if (pageKey === 'settings') {
    byId('entry-form').innerHTML = `
      <div class="form-grid">
        <label>Theme<select name="theme"><option value="light" ${selected(currentData.settings.theme, 'light')}>Light</option><option value="dark" ${selected(currentData.settings.theme, 'dark')}>Dark</option></select></label>
        <label>Water goal<input name="waterGoal" type="number" min="1" value="${currentData.settings.waterGoal}" required /></label>
        <label>Sleep goal<input name="sleepGoal" type="number" min="1" value="${currentData.settings.sleepGoal}" required /></label>
        <label>Calories target<input name="calorieTarget" type="number" min="0" value="${currentData.settings.calorieTarget}" required /></label>
        <label>Protein target<input name="proteinTarget" type="number" min="0" value="${currentData.settings.proteinTarget}" required /></label>
        <label>Carbs target<input name="carbTarget" type="number" min="0" value="${currentData.settings.carbTarget}" required /></label>
        <label>Fat target<input name="fatTarget" type="number" min="0" value="${currentData.settings.fatTarget}" required /></label>
      </div>
      <button class="primary-btn" type="submit">Save settings</button>
    `;
    byId('entry-form').onsubmit = saveSettings;
    return;
  }
  if (pageKey === 'profile') {
    byId('entry-form').innerHTML = `
      <div class="form-grid">
        <label>Name<input name="name" value="${escapeAttr(currentUser.name)}" required /></label>
        <label>Email<input value="${escapeAttr(currentUser.email)}" disabled /></label>
        <label>Phone<input name="phone" value="${escapeAttr(currentData.profile.phone)}" /></label>
        <label>Location<input name="location" value="${escapeAttr(currentData.profile.location)}" /></label>
      </div>
      <label>Bio<textarea name="bio">${escapeHtml(currentData.profile.bio)}</textarea></label>
      <button class="primary-btn" type="submit">Save profile</button>
    `;
    byId('entry-form').onsubmit = saveProfile;
    return;
  }
  byId('entry-form').innerHTML = '<div class="empty-state">Use the separated pages in the sidebar to add your personal data.</div>';
  byId('entry-form').onsubmit = null;
}

// ده الجزء اللي بيعرض قائمة البيانات الخاصة بالصفحة
function renderList(pageKey) {
  byId('list-title').textContent = pages[pageKey].title;
  if (pageKey === 'dashboard') return renderDashboard();
  if (pageKey === 'statistics') return renderStatistics();
  if (pageKey === 'nutrition') return renderNutrition();
  if (pageKey === 'gym') return renderGym();
  if (pageKey === 'goals') return renderGoals();
  if (pageKey === 'todo' || pageKey === 'habits') return renderChecklist(pageKey);
  if (pageKey === 'settings') {
    byId('data-list').innerHTML = `
      <article class="data-card stacked"><h3>Current targets</h3>
        <p>Theme: ${escapeHtml(currentData.settings.theme)}</p>
        <p>Water: ${currentData.settings.waterGoal} glasses</p>
        <p>Sleep: ${currentData.settings.sleepGoal} hours</p>
        <p>Nutrition: ${currentData.settings.calorieTarget} calories, ${currentData.settings.proteinTarget}g protein, ${currentData.settings.carbTarget}g carbs, ${currentData.settings.fatTarget}g fat</p>
      </article>`;
    return;
  }
  if (pageKey === 'profile') {
    byId('data-list').innerHTML = `<article class="data-card stacked"><h3>${escapeHtml(currentUser.name)}</h3><p>${escapeHtml(currentUser.email)}</p><p>${escapeHtml(currentData.profile.phone || 'No phone')}</p><p>${escapeHtml(currentData.profile.location || 'No location')}</p><p>${escapeHtml(currentData.profile.bio || 'No bio')}</p></article>`;
    return;
  }
  renderGenericList(pageKey);
}

function renderGenericList(pageKey) {
  const page = pages[pageKey];
  const items = currentData[page.collection];
  if (!items.length) {
    byId('data-list').innerHTML = `<div class="empty-state">No ${page.title.toLowerCase()} records yet. Add your first one.</div>`;
    return;
  }
  byId('data-list').innerHTML = items.map((item) => cardHtml(item, page)).join('');
  bindDeleteButtons(pageKey);
}

function renderChecklist(pageKey) {
  const page = pages[pageKey];
  const items = currentData[page.collection];
  if (!items.length) {
    byId('data-list').innerHTML = `<div class="empty-state">No ${page.title.toLowerCase()} records yet. Add your first one.</div>`;
    return;
  }
  byId('data-list').innerHTML = items.map((item) => `
    <article class="data-card checklist-card ${item.completed ? 'complete' : ''}">
      <label class="check-row"><input type="checkbox" data-toggle="${escapeAttr(item.id)}" ${item.completed ? 'checked' : ''} /><span>${escapeHtml(item.title)}</span></label>
      <p>${page.labels.map((key) => item[key] !== undefined ? `${labelize(key)}: ${escapeHtml(item[key])}` : '').filter(Boolean).join(' | ')}</p>
      <button class="small-danger" data-delete="${escapeAttr(item.id)}" type="button">Delete</button>
    </article>
  `).join('');
  document.querySelectorAll('[data-toggle]').forEach((input) => input.addEventListener('change', () => toggleComplete(pageKey, input.dataset.toggle)));
  bindDeleteButtons(pageKey);
}

function renderGoals() {
  const groups = ['Daily', 'Weekly', 'Monthly', 'Yearly'];
  const items = currentData.goals;
  byId('data-list').innerHTML = groups.map((period) => {
    const periodItems = items.filter((item) => item.period === period);
    return `
      <section class="group-card">
        <h3>${period} goals</h3>
        ${periodItems.length ? periodItems.map((item) => goalCard(item)).join('') : '<p class="muted">No goals in this period.</p>'}
      </section>
    `;
  }).join('');
  document.querySelectorAll('[data-toggle]').forEach((input) => input.addEventListener('change', () => toggleComplete('goals', input.dataset.toggle)));
  bindDeleteButtons('goals');
}

function goalCard(item) {
  return `
    <article class="data-card checklist-card ${item.completed ? 'complete' : ''}">
      <label class="check-row"><input type="checkbox" data-toggle="${escapeAttr(item.id)}" ${item.completed ? 'checked' : ''} /><span>${escapeHtml(item.title)}</span></label>
      <p>Category: ${escapeHtml(item.category)} | Deadline: ${escapeHtml(item.deadline)}</p>
      <button class="small-danger" data-delete="${escapeAttr(item.id)}" type="button">Delete</button>
    </article>
  `;
}

function renderNutrition() {
  const totals = nutritionTotals();
  const items = currentData.meals;
  byId('data-list').innerHTML = `
    <div class="summary-grid">
      ${nutritionSummaryCard('Calories', totals.calories, currentData.settings.calorieTarget)}
      ${nutritionSummaryCard('Protein', totals.protein, currentData.settings.proteinTarget, 'g')}
      ${nutritionSummaryCard('Carbs', totals.carbs, currentData.settings.carbTarget, 'g')}
      ${nutritionSummaryCard('Fat', totals.fat, currentData.settings.fatTarget, 'g')}
    </div>
    ${items.length ? items.map((item) => cardHtml(item, pages.nutrition)).join('') : '<div class="empty-state">No meals yet. Add calories, protein, carbs, and fat.</div>'}
  `;
  bindDeleteButtons('nutrition');
}

function nutritionSummaryCard(label, value, target, suffix = '') {
  return `<article class="data-card stacked"><h3>${label}</h3><strong>${value}${suffix} / ${target}${suffix}</strong><div class="meter"><i style="width:${percent(value, target)}%"></i></div></article>`;
}

function renderGym() {
  const stats = gymStats();
  const items = currentData.workouts;
  byId('data-list').innerHTML = `
    <div class="summary-grid">
      <article class="data-card stacked"><h3>Workout days</h3><strong>${stats.days}</strong></article>
      <article class="data-card stacked"><h3>Exercises</h3><strong>${stats.exercises}</strong></article>
      <article class="data-card stacked"><h3>Total volume</h3><strong>${stats.volume}</strong></article>
    </div>
    ${items.length ? items.map((item) => `
      <article class="data-card stacked">
        <div class="data-card-head"><h3>${escapeHtml(item.title)}</h3><button class="small-danger" data-delete="${escapeAttr(item.id)}" type="button">Delete</button></div>
        <p>Day: ${escapeHtml(item.day)} | Weight: ${item.weight} | Reps: ${item.reps} | Sets: ${item.sets}</p>
        <p>${escapeHtml(item.note || 'No note')}</p>
      </article>
    `).join('') : '<div class="empty-state">No workouts yet. Add a workout day, exercise, weight, repetitions, sets, and note.</div>'}
  `;
  bindDeleteButtons('gym');
}

function renderDashboard() {
  const counts = getCounts();
  byId('data-list').innerHTML = `
    <div class="summary-grid">
      ${nutritionSummaryCard('Task completion', counts.completedTasks, counts.tasks || 1)}
      ${nutritionSummaryCard('Habit completion', counts.completedHabits, counts.habits || 1)}
      ${nutritionSummaryCard('Goal completion', counts.completedGoals, counts.goals || 1)}
      ${nutritionSummaryCard('Gym volume', gymStats().volume, Math.max(gymStats().volume, 1))}
    </div>
    ${['tasks', 'habits', 'goals', 'workouts', 'meals', 'study'].map((key) => `
      <article class="data-card stacked">
        <h3>${labelize(key)}</h3>
        <p>${(currentData[key] || []).length} user records</p>
        <small>${latestText(key)}</small>
      </article>
    `).join('')}
  `;
}

function renderStatistics() {
  const counts = getCounts();
  const n = nutritionTotals();
  const g = gymStats();
  byId('data-list').innerHTML = `
    <div class="summary-grid">
      ${nutritionSummaryCard('Tasks done', counts.completedTasks, counts.tasks || 1)}
      ${nutritionSummaryCard('Habits done', counts.completedHabits, counts.habits || 1)}
      ${nutritionSummaryCard('Goals done', counts.completedGoals, counts.goals || 1)}
      ${nutritionSummaryCard('Calories', n.calories, currentData.settings.calorieTarget)}
    </div>
    <article class="data-card stacked">
      <h3>Gym statistics</h3>
      <p>Workout days: ${g.days}</p>
      <p>Total exercises: ${g.exercises}</p>
      <p>Total volume: ${g.volume}</p>
    </article>
    ${Object.entries(counts).map(([key, value]) => `<article class="data-card stat-line"><h3>${labelize(key)}</h3><strong>${value}</strong></article>`).join('')}
  `;
}

function fieldHtml([name, label, type, options]) {
  if (type === 'textarea') return `<label class="full-field">${label}<textarea name="${name}"></textarea></label>`;
  if (type === 'select') return `<label>${label}<select name="${name}" required>${options.map((item) => `<option>${item}</option>`).join('')}</select></label>`;
  return `<label>${label}<input name="${name}" type="${type}" required /></label>`;
}

// ده الجزء اللي بيضيف عنصر جديد إلى أي قائمة داخل التطبيق
function addEntry(event, pageKey) {
  event.preventDefault();
  const page = pages[pageKey];
  const form = new FormData(event.currentTarget);
  const item = { id: makeId(), completed: false };
  page.fields.forEach(([name, , type]) => {
    const value = form.get(name);
    item[name] = type === 'number' ? Number(value) : String(value || '');
  });
  currentData[page.collection].push(item);
  persist();
  event.currentTarget.reset();
  initPage(pageKey);
}

function toggleComplete(pageKey, id) {
  const collection = pages[pageKey].collection;
  const item = currentData[collection].find((entry) => entry.id === id);
  if (item) item.completed = !item.completed;
  persist();
  initPage(pageKey);
}

function bindDeleteButtons(pageKey) {
  document.querySelectorAll('[data-delete]').forEach((button) => button.addEventListener('click', () => deleteEntry(pageKey, button.dataset.delete)));
}

function deleteEntry(pageKey, id) {
  const collection = pages[pageKey].collection;
  currentData[collection] = currentData[collection].filter((item) => item.id !== id);
  persist();
  initPage(pageKey);
}

// ده الجزء اللي بيحفظ الإعدادات مثل الثيم والهدف اليومي
function saveSettings(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  currentData.settings.theme = String(form.get('theme'));
  currentData.settings.waterGoal = Number(form.get('waterGoal'));
  currentData.settings.sleepGoal = Number(form.get('sleepGoal'));
  currentData.settings.calorieTarget = Number(form.get('calorieTarget'));
  currentData.settings.proteinTarget = Number(form.get('proteinTarget'));
  currentData.settings.carbTarget = Number(form.get('carbTarget'));
  currentData.settings.fatTarget = Number(form.get('fatTarget'));
  persist();
  initPage('settings');
}

// ده الجزء اللي بيحفظ بيانات الملف الشخصي للمستخدم
function saveProfile(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  currentUser.name = String(form.get('name')).trim();
  currentData.profile.phone = String(form.get('phone')).trim();
  currentData.profile.location = String(form.get('location')).trim();
  currentData.profile.bio = String(form.get('bio')).trim();
  saveUsers(getUsers().map((user) => (user.email === currentUser.email ? currentUser : user)));
  persist();
  initPage('profile');
}

function cardHtml(item, page) {
  return `
    <article class="data-card">
      <div>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${page.labels.map((key) => item[key] !== undefined ? `${labelize(key)}: ${escapeHtml(item[key])}` : '').filter(Boolean).join(' | ')}</p>
      </div>
      <button class="small-danger" data-delete="${escapeAttr(item.id)}" type="button">Delete</button>
    </article>
  `;
}

function toggleTheme() {
  currentData.settings.theme = currentData.settings.theme === 'dark' ? 'light' : 'dark';
  persist();
  initPage(currentPage);
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : 'light';
  localStorage.setItem('mylife.theme', theme === 'dark' ? 'dark' : 'light');
}

function logout() {
  localStorage.removeItem(SESSION_KEY);
  window.location.href = '../index.html';
}

function exportData() {
  const blob = new Blob([JSON.stringify({ user: currentUser, data: currentData }, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `mylife-${currentUser.email}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

// ده الجزء اللي بيحسب عدد العناصر والإكمال في كل قسم
function getCounts() {
  return {
    tasks: currentData.tasks.length,
    completedTasks: currentData.tasks.filter((item) => item.completed).length,
    habits: currentData.habits.length,
    completedHabits: currentData.habits.filter((item) => item.completed).length,
    goals: currentData.goals.length,
    completedGoals: currentData.goals.filter((item) => item.completed).length,
    events: currentData.events.length,
    workouts: currentData.workouts.length,
    prayers: currentData.prayers.length,
    meals: currentData.meals.length,
    water: currentData.water.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    sleep: currentData.sleep.length,
    study: currentData.study.length,
  };
}

function nutritionTotals() {
  return currentData.meals.reduce((totals, item) => {
    totals.calories += Number(item.calories || 0);
    totals.protein += Number(item.protein || 0);
    totals.carbs += Number(item.carbs || 0);
    totals.fat += Number(item.fat || 0);
    return totals;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
}

function gymStats() {
  const byExerciseMap = new Map();
  const days = new Set();
  let volume = 0;
  currentData.workouts.forEach((item) => {
    if (item.day) days.add(item.day);
    const itemVolume = Number(item.weight || 0) * Number(item.reps || 0) * Number(item.sets || 1);
    volume += itemVolume;
    byExerciseMap.set(item.title, (byExerciseMap.get(item.title) || 0) + itemVolume);
  });
  const byExercise = [...byExerciseMap.entries()].map(([title, exerciseVolume]) => ({ title, volume: exerciseVolume }));
  return { days: days.size, exercises: currentData.workouts.length, volume, byExercise, maxVolume: Math.max(0, ...byExercise.map((item) => item.volume)) };
}

// ده الجزء اللي بيجهّز البيانات الافتراضية عند أول استخدام
function emptyData(name) {
  return {
    profile: { phone: '', location: '', bio: `${name} has not added a bio yet.` },
    settings: { theme: 'light', waterGoal: 8, sleepGoal: 8, calorieTarget: 2200, proteinTarget: 150, carbTarget: 250, fatTarget: 70 },
    tasks: [],
    habits: [],
    goals: [],
    events: [],
    workouts: [],
    prayers: [],
    meals: [],
    water: [],
    sleep: [],
    study: [],
  };
}

function normalizeData(data, name) {
  const base = emptyData(name);
  const merged = { ...base, ...data, profile: { ...base.profile, ...(data.profile || {}) }, settings: { ...base.settings, ...(data.settings || {}) } };
  Object.keys(base).forEach((key) => {
    if (Array.isArray(base[key]) && !Array.isArray(merged[key])) merged[key] = [];
  });
  merged.tasks = merged.tasks.map((item) => ({ completed: false, ...item }));
  merged.habits = merged.habits.map((item) => ({ completed: false, ...item }));
  merged.goals = merged.goals.map((item) => ({ period: 'Daily', category: 'General', completed: false, ...item }));
  merged.meals = merged.meals.map((item) => ({ protein: 0, carbs: 0, fat: 0, ...item }));
  merged.workouts = merged.workouts.map((item) => ({ day: '', title: item.title || 'Exercise', weight: item.weight || 0, reps: item.reps || 0, sets: item.sets || 1, note: item.note || '', ...item }));
  return merged;
}

function getSessionUser() {
  const email = localStorage.getItem(SESSION_KEY);
  if (!email) return null;
  return getUsers().find((user) => user.email === email) || null;
}

function getUsers() {
  return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getData(email, name) {
  const saved = localStorage.getItem(DATA_PREFIX + email);
  if (saved) return JSON.parse(saved);
  const data = emptyData(name);
  saveData(email, data);
  return data;
}

function saveData(email, data) {
  localStorage.setItem(DATA_PREFIX + email, JSON.stringify(data));
}

function persist() {
  saveData(currentUser.email, currentData);
}

function latestText(key) {
  const items = currentData[key] || [];
  return items.length ? `Latest: ${items[items.length - 1].title}` : 'No user data yet';
}

function selected(actual, expected) {
  return actual === expected ? 'selected' : '';
}

function makeId() {
  return window.crypto && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function initials(name) {
  return name.split(' ').filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

function firstName(name) {
  return name.split(' ')[0] || name;
}

function percent(value, max) {
  return Math.max(0, Math.min(100, Math.round((Number(value) / Number(max || 1)) * 100)));
}

function labelize(key) {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase());
}

function byId(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function escapeAttr(value) {
  return escapeHtml(value);
}
