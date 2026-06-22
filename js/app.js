const DEFAULT_DATA = {
  user: {
    name: 'Ahmed Farouk',
    email: 'ahmed.farouk@email.com',
    role: 'Premium User',
    location: 'Cairo, Egypt',
    memberSince: '12 Jan 2025',
    birthDate: '15 March 2002',
    gender: 'Male',
    phone: '+20 101 234 5678',
    timezone: '(GMT+2:00) Cairo, Egypt',
    bio: 'Motivated to become a better version of myself every single day.',
    avatarInitials: 'AF',
  },
  dashboard: {
    greeting: 'Good Morning, Ahmed!',
    subtitle: "You've got a lot planned today.",
    motivation: 'Stay focused and keep pushing forward!',
    summary: [
      { label: 'Tasks Completed', value: '8', meta: 'of 12 tasks', percent: 67, icon: 'fa-check', tone: 'purple' },
      { label: 'Habits Completed', value: '7', meta: 'of 10 habits', percent: 70, icon: 'fa-bullseye', tone: 'green' },
      { label: 'Calories Consumed', value: '1,850', meta: 'of 2,500 kcal', percent: 74, icon: 'fa-fire', tone: 'orange' },
      { label: 'Water Intake', value: '6', meta: 'of 8 glasses', percent: 75, icon: 'fa-droplet', tone: 'blue' },
      { label: 'Sleep', value: '7h 32m', meta: 'of 8h goal', percent: 91, icon: 'fa-moon', tone: 'purple' },
    ],
    priorities: [
      { title: 'Chest Workout', category: 'Gym', time: '07:00 AM' },
      { title: 'Study Mathematics', category: 'Study', time: '10:00 AM' },
      { title: 'Read Quran', category: 'Prayer', time: '08:30 PM' },
    ],
    weeklyProgress: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      series: [
        { name: 'Tasks', color: '#4f46e5', values: [70, 82, 88, 80, 86, 79, 91] },
        { name: 'Habits', color: '#22c55e', values: [48, 64, 55, 45, 67, 58, 70] },
        { name: 'Gym', color: '#f97316', values: [28, 30, 45, 72, 68, 40, 50] },
        { name: 'Study', color: '#3b82f6', values: [50, 62, 50, 45, 32, 34, 24] },
      ],
    },
  },
  tasks: [],
  habits: [],
  goals: [],
  schedule: [],
  nutrition: { calories: 0, goal: 0, macros: [], meals: [] },
  water: { current: 0, goal: 8, volume: '0L', weeklyTotal: 0 },
  sleep: { duration: '0h', goal: '8h', score: 0, quality: 'Good', fellAsleep: '', wokeUp: '', logs: [] },
  workouts: [],
  prayers: [],
  study: [],
  stats: { journey: [], activity: [] },
};

document.addEventListener('DOMContentLoaded', async () => {
  const data = await loadAppData();
  setupShell(data);
  renderCurrentPage(data);
  initializeCommonActions(data);
});

async function loadAppData() {
  const dataPath = getDataPath();

  try {
    const response = await fetch(dataPath, { cache: 'no-store' });
    if (!response.ok) throw new Error('Data file not found');
    return { ...DEFAULT_DATA, ...(await response.json()) };
  } catch {
    return DEFAULT_DATA;
  }
}

function getDataPath() {
  return isInsidePages() ? '../data/app-data.json' : 'data/app-data.json';
}

function isInsidePages() {
  return window.location.pathname.replace(/\\/g, '/').includes('/pages/');
}

function getPageName() {
  const file = window.location.pathname.split('/').pop() || 'index.html';
  if (file === 'index.html' || file === '') return 'dashboard';
  return file.replace('.html', '');
}

function pageUrl(pageName) {
  const inPages = isInsidePages();
  const paths = {
    dashboard: inPages ? '../index.html' : 'index.html',
    todo: inPages ? 'todo.html' : 'pages/todo.html',
    habits: inPages ? 'habits.html' : 'pages/habits.html',
    goals: inPages ? 'goals.html' : 'pages/goals.html',
    calendar: inPages ? 'calendar.html' : 'pages/calendar.html',
    gym: inPages ? 'gym.html' : 'pages/gym.html',
    prayer: inPages ? 'prayer.html' : 'pages/prayer.html',
    nutrition: inPages ? 'nutrition.html' : 'pages/nutrition.html',
    water: inPages ? 'water.html' : 'pages/water.html',
    sleep: inPages ? 'sleep.html' : 'pages/sleep.html',
    study: inPages ? 'study.html' : 'pages/study.html',
    statistics: inPages ? 'statistics.html' : 'pages/statistics.html',
    settings: inPages ? 'settings.html' : 'pages/settings.html',
    profile: inPages ? 'profile.html' : 'pages/profile.html',
    login: inPages ? '../login.html' : 'login.html',
    register: inPages ? '../register.html' : 'register.html',
  };

  return paths[pageName] || paths.dashboard;
}

function setupShell(data) {
  document.body.classList.toggle('dark-mode', localStorage.getItem('mylife_darkMode') === 'true');
  renderSidebar(data);
  updateUserShell(data.user);
}

function renderSidebar(data) {
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;

  const active = getPageName();
  const nav = [
    ['dashboard', 'fa-house', 'Dashboard'],
    ['todo', 'fa-square-check', 'Todo'],
    ['habits', 'fa-bullseye', 'Habits'],
    ['goals', 'fa-bullseye', 'Goals'],
    ['calendar', 'fa-calendar-days', 'Calendar'],
    ['gym', 'fa-dumbbell', 'Gym'],
    ['prayer', 'fa-hands-praying', 'Prayer'],
    ['nutrition', 'fa-apple-whole', 'Nutrition'],
    ['water', 'fa-droplet', 'Water'],
    ['sleep', 'fa-moon', 'Sleep'],
    ['study', 'fa-cube', 'Study'],
    ['statistics', 'fa-chart-column', 'Statistics'],
    ['settings', 'fa-gear', 'Settings'],
  ];

  sidebar.innerHTML = `
    <a class="brand" href="${pageUrl('dashboard')}" aria-label="MYLIFE dashboard">
      <span class="brand-mark">M</span>
      <span><strong>MYLIFE</strong><small>Life Tracker</small></span>
    </a>
    <nav class="sidebar-nav" aria-label="Main navigation">
      ${nav
        .map(
          ([page, icon, label]) => `
            <a href="${pageUrl(page)}" class="nav-item ${active === page ? 'active' : ''}">
              <i class="fas ${icon}" aria-hidden="true"></i>
              <span>${label}</span>
            </a>`,
        )
        .join('')}
    </nav>
    <div class="sidebar-focus">
      <p>${active === 'dashboard' ? 'Daily Streak' : 'Keep it up!'}</p>
      <strong>${active === 'dashboard' ? '16 days' : '78%'}</strong>
      <span>${active === 'dashboard' ? 'Keep going!' : 'Overall Score'}</span>
    </div>
    <button class="sidebar-user" data-action="profile">
      ${avatar(data.user)}
      <span><strong>${data.user.name}</strong><small>${data.user.role}</small></span>
      <i class="fas fa-chevron-down" aria-hidden="true"></i>
    </button>
    <label class="theme-pill">
      <i class="fas fa-moon" aria-hidden="true"></i>
      <span>Dark Mode</span>
      <input type="checkbox" id="darkModeToggle" ${document.body.classList.contains('dark-mode') ? 'checked' : ''} aria-label="Toggle dark mode" />
    </label>
    <a class="auth-link" href="${pageUrl('login')}">Login</a>
  `;
}

function updateUserShell(user) {
  document.querySelectorAll('.profile-name').forEach((node) => {
    node.textContent = user.name;
  });
}

function renderCurrentPage(data) {
  const page = getPageName();
  const main = document.querySelector('.main-content');
  if (!main) return;

  const renderers = {
    dashboard: renderDashboard,
    todo: renderTodo,
    habits: renderHabits,
    goals: renderGoals,
    calendar: renderCalendar,
    gym: renderGym,
    prayer: renderPrayer,
    nutrition: renderNutrition,
    water: renderWater,
    sleep: renderSleep,
    study: renderStudy,
    statistics: renderStatistics,
    settings: renderSettings,
    profile: renderProfile,
  };

  main.innerHTML = renderers[page] ? renderers[page](data) : renderDashboard(data);
}

function pageHeader(icon, title, subtitle, action = '') {
  return `
    <header class="app-header">
      <div class="page-title">
        <button class="menu-toggle" aria-label="Toggle navigation menu" aria-expanded="false">
          <i class="fas fa-bars" aria-hidden="true"></i>
        </button>
        <span class="page-icon"><i class="fas ${icon}" aria-hidden="true"></i></span>
        <span><h1>${title}</h1><p>${subtitle}</p></span>
      </div>
      <div class="header-actions">
        <button class="date-chip"><i class="fas fa-calendar-days" aria-hidden="true"></i>${formatDate()}</button>
        <button class="icon-button" aria-label="Notifications"><i class="fas fa-bell" aria-hidden="true"></i><span class="badge">3</span></button>
        ${action}
      </div>
    </header>`;
}

function renderDashboard(data) {
  return `
    ${pageHeader('fa-house', 'Dashboard', `Welcome back, ${data.user.name.split(' ')[0]}!`, '<button class="primary-action" data-action="add">+ Add New</button>')}
    <section class="dashboard-grid">
      <article class="card hero-card">
        <div>
          <h2>${data.dashboard.greeting}</h2>
          <p>${data.dashboard.subtitle}</p>
          <p>${data.dashboard.motivation}</p>
        </div>
        <div class="sunset-art" aria-hidden="true"></div>
      </article>
      <article class="card priorities-panel">
        <div class="card-title"><h3>Today's Priorities</h3><a href="${pageUrl('todo')}">View All</a></div>
        ${data.dashboard.priorities.map((item) => priorityRow(item)).join('')}
      </article>
      <article class="card task-ring-panel">
        <div class="card-title"><h3>Today's Tasks</h3><a href="${pageUrl('todo')}">View All</a></div>
        ${ring(60, '6', 'of 10')}
        <div class="legend-list">
          <span><b class="dot green"></b>Completed <strong>6</strong></span>
          <span><b class="dot blue"></b>In Progress <strong>2</strong></span>
          <span><b class="dot orange"></b>Pending <strong>2</strong></span>
        </div>
      </article>
    </section>
    <section class="metric-grid">${data.dashboard.summary.map(metricCard).join('')}</section>
    <section class="content-grid three">
      <article class="card">${sectionTitle("Today's Schedule", `<a href="${pageUrl('calendar')}">View Calendar</a>`)}${data.schedule.map(scheduleRow).join('')}<button class="link-action" data-action="add-reminder">+ Add Reminder</button></article>
      <article class="card">${sectionTitle('Habits Overview', '<button class="select-chip">This Week</button>')}${data.habits.map(habitCompact).join('')}<a class="link-action" href="${pageUrl('habits')}">View Habits</a></article>
      <article class="card">${sectionTitle('Weekly Progress', '<button class="select-chip">This Week</button>')}${lineChart(data.dashboard.weeklyProgress)}${chartLegend(data.dashboard.weeklyProgress.series)}</article>
    </section>
    <section class="content-grid three">
      <article class="card">${nutritionSummary(data)}</article>
      <article class="card">${waterSummary(data)}</article>
      <article class="card">${sleepSummary(data)}</article>
    </section>`;
}

function renderTodo(data) {
  const total = data.tasks.length;
  const completed = data.tasks.filter((task) => task.status === 'completed').length;
  const pending = data.tasks.filter((task) => task.status === 'pending').length;
  const progress = data.tasks.filter((task) => task.status === 'in-progress').length;

  return `
    ${pageHeader('fa-clipboard-check', 'To Do', 'Organize your tasks and get things done.', '<button class="primary-action" data-action="add-task">+ Add Task</button>')}
    <section class="metric-grid">
      ${metricCard({ label: 'All Tasks', value: total, meta: 'Total tasks', percent: 100, icon: 'fa-list-check', tone: 'purple' })}
      ${metricCard({ label: 'Completed', value: completed, meta: `${Math.round((completed / total) * 100)}% completed`, percent: (completed / total) * 100, icon: 'fa-check', tone: 'green' })}
      ${metricCard({ label: 'In Progress', value: progress, meta: `${Math.round((progress / total) * 100)}% in progress`, percent: (progress / total) * 100, icon: 'fa-clock', tone: 'blue' })}
      ${metricCard({ label: 'Pending', value: pending, meta: `${Math.round((pending / total) * 100)}% pending`, percent: (pending / total) * 100, icon: 'fa-hourglass-half', tone: 'orange' })}
    </section>
    <section class="content-grid two-one">
      <article class="card">${sectionTitle('My Day', '<button class="select-chip">Today</button>')}${data.tasks.map(timelineTask).join('')}<button class="link-action" data-action="add-task">+ Add Task</button></article>
      <article class="card">${sectionTitle('All Tasks', '')}<div class="data-table">${data.tasks.map(taskRow).join('')}</div></article>
      <article class="card">${sectionTitle('Task by Priority', '')}${donut('24', 'Total')}<div class="legend-list">${['High (5)', 'Medium (8)', 'Low (7)', 'No Priority (4)'].map((label, index) => `<span><b class="dot ${['red', 'orange', 'blue', 'gray'][index]}"></b>${label}</span>`).join('')}</div></article>
    </section>
    <section class="content-grid three">
      <article class="card">${sectionTitle('Upcoming Tasks', '<button class="select-chip">Next 7 days</button>')}${data.tasks.slice(0, 4).map(upcomingRow).join('')}</article>
      <article class="card wide">${sectionTitle('Productivity Trend', '<button class="select-chip">This Week</button>')}${lineChart(data.dashboard.weeklyProgress, 'Tasks')}</article>
      <article class="card">${sectionTitle('Quick Add', '')}<div class="quick-grid"><button>Add Task</button><button>Add Recurring Task</button><button>Add Note</button><button>Add Checklist</button></div></article>
    </section>`;
}

function renderHabits(data) {
  return `
    ${pageHeader('fa-bullseye', 'Habits', 'Build good habits and become your best self.', '<button class="primary-action" data-action="add-habit">+ Add Habit</button>')}
    <section class="metric-grid">
      ${metricCard({ label: 'Habits Completed', value: '6 / 8', meta: '75% completed', percent: 75, icon: 'fa-check', tone: 'green' })}
      ${metricCard({ label: 'Current Streak', value: '12 days', meta: 'Best: 18 days', percent: 85, icon: 'fa-calendar-check', tone: 'purple' })}
      ${metricCard({ label: 'Total Perfect Days', value: '8', meta: 'This month', percent: 65, icon: 'fa-fire', tone: 'orange' })}
      ${metricCard({ label: 'Monthly Progress', value: '76%', meta: '+12% from last month', percent: 76, icon: 'fa-dumbbell', tone: 'blue' })}
    </section>
    <section class="content-grid two-one">
      <article class="card wide">${sectionTitle('Habit Progress', '<button class="select-chip">This Week</button>')}${lineChart(data.dashboard.weeklyProgress, 'Habits')}<div class="day-summary">${data.habits.slice(0, 5).map((habit) => `<span><small>${habit.shortName}</small><strong>${habit.progress}%</strong></span>`).join('')}</div></article>
      <article class="card">${sectionTitle('Current Streaks', '<a href="#">View All</a>')}${data.habits.map(streakRow).join('')}</article>
    </section>
    <section class="content-grid two-one">
      <article class="card wide">${sectionTitle('My Habits', '<button class="select-chip">All Habits</button>')}<div class="data-table habit-table">${data.habits.map(habitRow).join('')}</div><button class="link-action" data-action="add-habit">+ Add Habit</button></article>
      <aside class="side-stack"><article class="card">${sectionTitle('Habit Insights', '<button class="select-chip">This Week</button>')}<div class="insight-grid"><span><strong>Morning workout</strong><small>Most Consistent</small></span><span><strong>Tahajjud prayer</strong><small>Need Focus</small></span></div></article><article class="card">${sectionTitle('Quick Actions', '')}<div class="quick-grid"><button>Add Habit</button><button>Habit Templates</button><button>Edit Reminders</button><button>Habit Settings</button></div></article></aside>
    </section>`;
}

function renderGoals(data) {
  return `
    ${pageHeader('fa-bullseye', 'Goals', 'Track your long-term goals and milestones.', '<button class="primary-action" data-action="add-goal">+ Add Goal</button>')}
    <section class="metric-grid">${data.goals.map((goal) => metricCard({ label: goal.name, value: `${goal.progress}%`, meta: 'Goal progress', percent: goal.progress, icon: goal.icon, tone: goal.tone })).join('')}</section>
    <section class="content-grid two-one">
      <article class="card wide">${sectionTitle('Goal Progress', '<button class="select-chip">This Month</button>')}${data.goals.map(goalRow).join('')}</article>
      <article class="card">${sectionTitle('Goal Categories', '')}${donut(data.goals.length, 'Active')}</article>
    </section>`;
}

function renderCalendar(data) {
  return `
    ${pageHeader('fa-calendar-days', 'Calendar', 'View your schedule and daily plans.')}
    <section class="content-grid two-one">
      <article class="card wide">${sectionTitle('May 2025', '<div class="button-pair"><button><</button><button>></button></div>')}<div class="calendar-board">${calendarDays()}</div></article>
      <article class="card">${sectionTitle('May 17 Events', '')}${data.schedule.map(scheduleRow).join('')}</article>
    </section>`;
}

function renderGym(data) {
  return `
    ${pageHeader('fa-dumbbell', 'Gym', 'Track workouts, calories, and strength.', '<button class="primary-action" data-action="log-workout">+ Log Workout</button>')}
    <section class="metric-grid">
      ${metricCard({ label: 'Workouts', value: data.workouts.length, meta: '+1 from last week', percent: 80, icon: 'fa-dumbbell', tone: 'green' })}
      ${metricCard({ label: 'Calories Burned', value: '2,450', meta: '+350 from last week', percent: 74, icon: 'fa-fire', tone: 'orange' })}
      ${metricCard({ label: 'Average Time', value: '45m', meta: 'per session', percent: 70, icon: 'fa-clock', tone: 'blue' })}
    </section>
    <section class="content-grid three">${data.workouts.map(workoutCard).join('')}</section>`;
}

function renderPrayer(data) {
  return `
    ${pageHeader('fa-hands-praying', 'Prayer', 'Never miss a prayer with smart reminders.')}
    <section class="content-grid two-one">
      <article class="card wide">${sectionTitle('Prayer Times', '')}${data.prayers.map(prayerRow).join('')}</article>
      <article class="card">${sectionTitle('Today Progress', '')}${ring(60, '3', 'of 5')}</article>
    </section>`;
}

function renderNutrition(data) {
  return `
    ${pageHeader('fa-apple-whole', 'Nutrition', 'Track calories, meals, and macros.', '<button class="primary-action" data-action="add-meal">+ Add Meal</button>')}
    <section class="content-grid two-one">
      <article class="card">${nutritionSummary(data)}</article>
      <article class="card wide">${sectionTitle("Today's Meals", '')}<div class="card-grid">${data.nutrition.meals.map(mealCard).join('')}</div></article>
    </section>`;
}

function renderWater(data) {
  return `
    ${pageHeader('fa-droplet', 'Water', 'Stay hydrated and maintain your daily goal.', '<button class="primary-action" data-action="add-water">+ Add Glass</button>')}
    <section class="content-grid two-one">
      <article class="card wide">${waterSummary(data)}<button class="link-action" data-action="add-water">+ Add Glass</button></article>
      <article class="card">${sectionTitle('Weekly Summary', '')}${metricList([{ label: 'Today Consumed', value: data.water.current }, { label: 'This Week', value: data.water.weeklyTotal }, { label: 'Daily Goal', value: `${Math.round((data.water.current / data.water.goal) * 100)}%` }, { label: 'Total Volume', value: data.water.volume }])}</article>
    </section>`;
}

function renderSleep(data) {
  return `
    ${pageHeader('fa-moon', 'Sleep', 'Monitor sleep duration and quality.')}
    <section class="content-grid two-one">
      <article class="card">${sleepSummary(data)}</article>
      <article class="card wide">${sectionTitle('Sleep Logs', '')}${data.sleep.logs.map((log) => `<div class="list-row"><span><strong>${log.date}</strong><small>${log.duration} - ${log.quality}</small></span><strong>${log.interruptions} interruptions</strong></div>`).join('')}</article>
    </section>`;
}

function renderStudy(data) {
  return `
    ${pageHeader('fa-cube', 'Study', 'Plan study sessions and stay focused.', '<button class="primary-action" data-action="log-session">+ Log Session</button>')}
    <section class="content-grid three">${data.study.map(studyCard).join('')}</section>`;
}

function renderStatistics(data) {
  return `
    ${pageHeader('fa-chart-column', 'Statistics', 'Beautiful insights into your overall progress.')}
    <section class="content-grid two-one">
      <article class="card wide">${sectionTitle('My Journey', '<button class="select-chip">This Month</button>')}${lineChart(data.dashboard.weeklyProgress, 'Tasks')}${metricList(data.stats.journey)}</article>
      <article class="card">${sectionTitle('Achievements', '<a href="#">View All</a>')}<div class="achievement-grid">${['Consistency Master', 'Goal Getter', 'Study Star', 'Hydration Hero', 'Sleep Tracker'].map((name) => `<span><i class="fas fa-award"></i><strong>${name}</strong></span>`).join('')}</div></article>
    </section>
    <section class="card">${sectionTitle('Activity Overview', '<button class="select-chip">This Week</button>')}${data.stats.activity.map(activityRow).join('')}</section>`;
}

function renderSettings(data) {
  return `
    ${pageHeader('fa-gear', 'Settings', 'Manage your profile, preferences and app settings.')}
    <section class="settings-layout">
      <aside class="card settings-menu">${['Profile & Account', 'Personal Information', 'Body & Goals', 'App Preferences', 'Reminders & Notifications', 'Privacy & Security', 'Data & Backup', 'Integrations', 'Subscription', 'Support & Help', 'About MyLife'].map((item, index) => `<button class="${index === 0 ? 'active' : ''}">${item}</button>`).join('')}</aside>
      <main class="settings-main">
        <article class="card profile-strip">${avatar(data.user, 'large')}<span><h2>${data.user.name}</h2><p>${data.user.email} - Email verified</p><p>${data.user.location}</p></span><button class="select-chip">Edit Profile</button></article>
        <article class="card">${sectionTitle('Personal Information', '<button class="select-chip">Edit</button>')}${infoGrid(data)}</article>
        <article class="card">${sectionTitle('App Preferences', '')}${preferenceRows()}</article>
      </main>
      <aside class="side-stack"><article class="card">${sectionTitle('Your Goals Overview', '')}${data.goals.map(goalRow).join('')}</article><article class="card">${sectionTitle('Data & Backup', '')}${['Backup Now', 'Export Data', 'Import Data'].map((item) => `<button class="settings-action">${item}<i class="fas fa-chevron-right"></i></button>`).join('')}</article></aside>
    </section>`;
}

function renderProfile(data) {
  return `
    ${pageHeader('fa-user', 'Profile', 'Manage your profile and track your journey.')}
    <section class="profile-layout">
      <article class="card profile-hero">
        ${avatar(data.user, 'xl')}
        <div><h2>${data.user.name} <span class="tag">Premium</span></h2><p>${data.user.email} - Verified</p><p>${data.user.location}</p><p>Member since ${data.user.memberSince}</p></div>
        <button class="select-chip">Edit Profile</button>
        <div class="profile-stats">${metricList([{ label: 'Days Active', value: '128' }, { label: 'Current Streak', value: '24' }, { label: 'Overall Progress', value: '78%' }, { label: 'Points Earned', value: '1,250' }])}</div>
      </article>
      <article class="card">${sectionTitle('About Me', '<button class="select-chip">Edit</button>')}${infoGrid(data)}</article>
      <article class="card wide">${sectionTitle('My Journey', '<button class="select-chip">This Month</button>')}${lineChart(data.dashboard.weeklyProgress, 'Tasks')}${metricList(data.stats.journey)}</article>
      <article class="card">${sectionTitle('Achievements', '<a href="#">View All</a>')}<div class="achievement-grid">${['Consistency Master', 'Goal Getter', 'Study Star', 'Hydration Hero', 'Sleep Tracker'].map((name) => `<span><i class="fas fa-award"></i><strong>${name}</strong></span>`).join('')}</div></article>
    </section>`;
}

function metricCard(item) {
  return `
    <article class="card metric-card">
      <span class="metric-icon ${item.tone}"><i class="fas ${item.icon}" aria-hidden="true"></i></span>
      <span><small>${item.label}</small><strong>${item.value}</strong><em>${item.meta}</em></span>
      <div class="progress-track"><span class="${item.tone}" style="width:${Math.min(item.percent, 100)}%"></span></div>
      <b>${Math.round(item.percent)}%</b>
    </article>`;
}

function sectionTitle(title, action) {
  return `<div class="card-title"><h3>${title}</h3>${action || ''}</div>`;
}

function priorityRow(item) {
  return `<div class="list-row"><span><strong>${item.title}</strong><small>${item.category}</small></span><time>${item.time}</time></div>`;
}

function scheduleRow(item) {
  return `<div class="timeline-row"><time>${item.time}</time><i class="fas ${item.icon}" aria-hidden="true"></i><span><strong>${item.title}</strong><small>${item.category}</small></span></div>`;
}

function habitCompact(habit) {
  return `<div class="habit-compact"><span><strong>${habit.shortName}</strong>${dayDots(habit.days)}</span><b>${habit.progress}%</b></div>`;
}

function dayDots(days) {
  return `<div class="day-dots">${days.map((done, index) => `<i class="${done ? 'done' : ''}">${['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}</i>`).join('')}</div>`;
}

function ring(percent, value, label) {
  return `<div class="ring" style="--value:${percent}"><span><strong>${value}</strong><small>${label}</small></span></div>`;
}

function donut(value, label) {
  return `<div class="donut"><span><strong>${value}</strong><small>${label}</small></span></div>`;
}

function lineChart(progress, preferredSeries) {
  const series = preferredSeries ? progress.series.filter((item) => item.name === preferredSeries) : progress.series;
  return `
    <div class="css-chart">
      <div class="chart-grid"></div>
      ${series
        .map(
          (item) => `
          <svg viewBox="0 0 700 180" preserveAspectRatio="none" style="--line:${item.color}">
            <polyline points="${item.values.map((value, index) => `${index * (700 / (item.values.length - 1))},${180 - value * 1.6}`).join(' ')}" />
          </svg>`,
        )
        .join('')}
      <div class="chart-labels">${progress.labels.map((label) => `<span>${label}</span>`).join('')}</div>
    </div>`;
}

function chartLegend(series) {
  return `<div class="chart-legend">${series.map((item) => `<span><b style="background:${item.color}"></b>${item.name}</span>`).join('')}</div>`;
}

function nutritionSummary(data) {
  return `
    ${sectionTitle('Nutrition Summary', `<a href="${pageUrl('nutrition')}">View Details</a>`)}
    <div class="nutrition-summary">
      ${donut(data.nutrition.calories.toLocaleString(), 'kcal')}
      <div>${data.nutrition.macros.map((macro) => `<div class="macro-row"><b style="background:${macro.color}"></b><span>${macro.name}</span><strong>${macro.value} (${macro.percent}%)</strong></div>`).join('')}</div>
    </div>`;
}

function waterSummary(data) {
  const filled = data.water.current;
  return `
    ${sectionTitle('Water Tracker', `<a href="${pageUrl('water')}">View Details</a>`)}
    <div class="water-glasses">${Array.from({ length: data.water.goal }, (_, index) => `<span class="${index < filled ? 'filled' : ''}"></span>`).join('')}</div>
    <h3 class="center-value">${filled} <small>of ${data.water.goal} glasses</small></h3>
    <p class="soft-message">Great! Keep drinking water</p>`;
}

function sleepSummary(data) {
  return `
    ${sectionTitle('Sleep Summary', `<a href="${pageUrl('sleep')}">View Details</a>`)}
    <div class="sleep-summary">${ring(data.sleep.score, data.sleep.score, 'Sleep Score')}<div class="legend-list"><span>Time Asleep <strong>${data.sleep.duration}</strong></span><span>Sleep Quality <strong>${data.sleep.quality}</strong></span><span>Fell Asleep <strong>${data.sleep.fellAsleep}</strong></span><span>Woke Up <strong>${data.sleep.wokeUp}</strong></span></div></div>`;
}

function taskRow(task) {
  return `<div class="table-row"><input type="checkbox" ${task.status === 'completed' ? 'checked' : ''} aria-label="Complete ${task.title}"><strong>${task.title}</strong><span>${task.category}</span><em class="priority ${task.priority.toLowerCase()}">${task.priority}</em><time>${task.date}</time><button aria-label="More task options">...</button></div>`;
}

function timelineTask(task) {
  return `<div class="timeline-row"><time>${task.time}</time><input type="checkbox" ${task.status === 'completed' ? 'checked' : ''} aria-label="Complete ${task.title}"><span><strong>${task.title}</strong><small>${task.category}</small></span><em class="priority ${task.priority.toLowerCase()}">${task.priority}</em></div>`;
}

function upcomingRow(task) {
  return `<div class="list-row"><span><strong>${task.title}</strong><small>${task.category}</small></span><em class="priority ${task.priority.toLowerCase()}">${task.priority}</em></div>`;
}

function habitRow(habit) {
  return `<div class="table-row"><i class="fas ${habit.icon}"></i><strong>${habit.name}</strong><span>${habit.frequency}</span><div class="mini-progress"><b style="width:${habit.progress}%"></b></div>${dayDots(habit.days)}<span>${habit.streak} days</span><span>${habit.best} days</span></div>`;
}

function streakRow(habit) {
  return `<div class="list-row"><span><i class="fas ${habit.icon}"></i><strong>${habit.shortName}</strong><small>Best: ${habit.best} days</small></span><strong>${habit.streak} days</strong></div>`;
}

function goalRow(goal) {
  return `<div class="goal-row"><span><i class="fas ${goal.icon}"></i>${goal.name}</span><div class="progress-track"><span class="${goal.tone}" style="width:${goal.progress}%"></span></div><strong>${goal.progress}%</strong></div>`;
}

function workoutCard(workout) {
  return `<article class="card"><h3>${workout.name}</h3>${metricList([{ label: 'Minutes', value: workout.minutes }, { label: 'Calories', value: workout.calories }, { label: 'Difficulty', value: workout.difficulty }])}<div class="progress-track"><span class="purple" style="width:${workout.progress}%"></span></div><p>${workout.sets} sets</p></article>`;
}

function prayerRow(prayer) {
  return `<div class="list-row"><span><i class="fas fa-hands-praying"></i><strong>${prayer.name}</strong></span><time>${prayer.time}</time><i class="fas ${prayer.done ? 'fa-check' : 'fa-circle'}"></i></div>`;
}

function mealCard(meal) {
  return `<article class="sub-card"><h3>${meal.name}</h3><p>${meal.time}</p><strong>${meal.calories} kcal</strong><ul>${meal.items.map((item) => `<li>${item}</li>`).join('')}</ul></article>`;
}

function studyCard(item) {
  return `<article class="card"><h3>${item.subject}</h3><p>${item.topic}</p><strong>${item.duration}</strong><div class="progress-track"><span class="blue" style="width:${item.progress}%"></span></div><small>${item.progress}% Complete</small></article>`;
}

function activityRow(item) {
  return `<div class="activity-row"><span>${item.label}</span><strong>${item.value}</strong><div class="progress-track"><span class="purple" style="width:${item.percent}%"></span></div><b>${item.percent}%</b></div>`;
}

function metricList(items) {
  return `<div class="metric-list">${items.map((item) => `<span><strong>${item.value}</strong><small>${item.label}</small></span>`).join('')}</div>`;
}

function infoGrid(data) {
  const user = data.user;
  const items = [
    ['Full Name', user.name],
    ['Email Address', user.email],
    ['Date of Birth', user.birthDate],
    ['Phone Number', user.phone],
    ['Gender', user.gender],
    ['Timezone', user.timezone],
    ['Bio', user.bio],
  ];

  return `<div class="info-grid">${items.map(([label, value]) => `<span><small>${label}</small><strong>${value}</strong></span>`).join('')}</div>`;
}

function preferenceRows() {
  return ['Theme', 'Language', 'Start of the Week', 'Date Format', 'Time Format', 'Units']
    .map((label) => `<label class="preference-row"><span><strong>${label}</strong><small>Choose your preferred ${label.toLowerCase()}</small></span><select aria-label="${label}"><option>Default</option><option>Light</option><option>Dark</option></select></label>`)
    .join('');
}

function calendarDays() {
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return `${labels.map((label) => `<b>${label}</b>`).join('')}${Array.from({ length: 35 }, (_, index) => {
    const day = index < 3 ? 28 + index : index - 2;
    const active = [8, 9, 10, 12, 13, 14, 15, 16, 17, 18, 26, 27, 28, 29, 30].includes(day);
    return `<button class="${day === 17 ? 'today' : ''} ${active ? 'done' : ''}">${day}</button>`;
  }).join('')}`;
}

function avatar(user, size = '') {
  return `<span class="avatar ${size}">${user.avatarInitials || user.name.slice(0, 2)}</span>`;
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
}

function initializeCommonActions(data) {
  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-action]');
    if (!target) return;

    const action = target.dataset.action;
    if (action === 'profile') window.location.href = pageUrl('profile');
    if (action === 'add-water') {
      data.water.current = Math.min(data.water.goal, data.water.current + 1);
      renderCurrentPage(data);
      showToast('Water glass added.');
    }
    if (action.startsWith('add') || action.startsWith('log')) showToast('Saved to your local MYLIFE data.');
  });

  document.addEventListener('change', (event) => {
    if (event.target.id === 'darkModeToggle') {
      document.body.classList.toggle('dark-mode', event.target.checked);
      localStorage.setItem('mylife_darkMode', String(event.target.checked));
    }
  });

  document.querySelector('.menu-toggle')?.addEventListener('click', () => {
    document.querySelector('.sidebar')?.classList.toggle('sidebar-open');
  });
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'app-toast show';
  toast.textContent = message;
  document.body.appendChild(toast);
  window.setTimeout(() => toast.remove(), 2200);
}
