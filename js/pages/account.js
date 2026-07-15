// MYLIFE — Profile & Settings page controller.
// Renders the merged account experience (overview, personal info, appearance,
// notifications, productivity, statistics, achievements, security, backup, about)
// on top of the shared shell (sidebar/topbar) from js/shared.js.

const ACCOUNT_SECTIONS = [
  ['overview',      'Overview',                '◔'],
  ['personal',      'Personal Information',    '✎'],
  ['appearance',    'Appearance',               '🎨'],
  ['notifications', 'Notifications',            '🔔'],
  ['productivity',  'Productivity',             '◎'],
  ['statistics',    'Statistics',               '📊'],
  ['achievements',  'Achievements',             '🏆'],
  ['security',      'Security',                 '🔒'],
  ['backup',        'Backup & Restore',         '💾'],
  ['about',         'About',                    'ℹ️'],
];

const PALETTE_SWATCHES = [
  ['palette-1',  '#3b6ea5', 'Blue Slate'],
  ['palette-2',  '#ffbf00', 'Sunshine'],
  ['palette-3',  '#408a71', 'Teal'],
  ['palette-4',  '#6f8f5c', 'Sage'],
  ['palette-5',  '#c1793a', 'Amber'],
  ['palette-6',  '#243b60', 'Midnight'],
  ['palette-7',  '#5b3a86', 'Violet'],
  ['palette-8',  '#7a2b3d', 'Wine'],
  ['palette-9',  '#c1443a', 'Crimson'],
  ['palette-10', '#1c3f66', 'Harbor'],
  ['palette-11', '#a565a0', 'Orchid'],
  ['palette-12', '#3a6dbf', 'Sky'],
  ['palette-13', '#5f9e78', 'Meadow'],
  ['palette-14', '#c9a227', 'Gold'],
  ['palette-15', '#4a4034', 'Espresso'],
  ['palette-16', '#3f7a4e', 'Forest'],
  ['palette-17', '#b1503f', 'Clay'],
];

const ACHIEVEMENT_DEFS = [
  ['first_step',   '🌱', 'First Step',     'Complete your first task.',            (c) => c.completedTasks >= 1,  (c) => Math.min(1, c.completedTasks)],
  ['habit_builder','↻', 'Habit Builder',   'Complete habits 7 times.',              (c) => c.completedHabits >= 7, (c) => c.completedHabits / 7],
  ['goal_getter',  '◎', 'Goal Getter',     'Finish 5 goals.',                       (c) => c.completedGoals >= 5,  (c) => c.completedGoals / 5],
  ['hydration_hero','≈','Hydration Hero',  'Log 30 glasses of water.',              (c) => c.water >= 30,          (c) => c.water / 30],
  ['bookworm',     '✎', 'Bookworm',        'Log 10 study sessions.',                (c) => c.study >= 10,          (c) => c.study / 10],
  ['iron_will',    '↗', 'Iron Will',       'Log 10 workouts.',                      (c) => c.workouts >= 10,       (c) => c.workouts / 10],
  ['prayerful',    '✦', 'Prayerful',       'Log 20 prayers or routines.',           (c) => c.prayers >= 20,        (c) => c.prayers / 20],
  ['well_rested',  '☾', 'Well Rested',     'Log 10 nights of sleep.',               (c) => c.sleep >= 10,          (c) => c.sleep / 10],
  ['century_club', '⌂', 'Century Club',    'Reach 100 total logged actions.',       (c) => totalActions(c) >= 100, (c) => totalActions(c) / 100],
  ['perfectionist','⚑', 'Perfectionist',   'Complete every task, habit and goal you\u2019ve added.', (c) => c.tasks + c.habits + c.goals > 0 && c.completedTasks === c.tasks && c.completedHabits === c.habits && c.completedGoals === c.goals, (c) => (c.tasks + c.habits + c.goals) ? (c.completedTasks + c.completedHabits + c.completedGoals) / (c.tasks + c.habits + c.goals) : 0],
];

function totalActions(c) {
  return c.completedTasks + c.completedHabits + c.completedGoals + c.workouts + c.prayers + c.study + c.sleep + c.water;
}

let cropperState = null;

document.addEventListener('DOMContentLoaded', initAccountPage);

function initAccountPage() {
  if (!bootShell('account')) return;
  syncAchievements();
  renderHero();
  renderNav();
  renderContent();
  bindScrollSpy();
  bindGlobalAccountEvents();
  const initial = (location.hash || '#overview').replace('#', '') || 'overview';
  requestAnimationFrame(() => scrollToSection(initial, true));
}

// ─── Hero ───────────────────────────────────────────────────────────────
function renderHero() {
  const p = currentData.profile;
  const xpInfo = levelInfo(p);
  const score = productivityScore();
  byId('account-hero').innerHTML = `
    <div class="account-cover" id="account-cover" style="${p.cover ? `background-image:url('${p.cover}')` : ''}">
      <button class="cover-edit-btn" id="cover-edit-btn" type="button">🖼️ Change cover</button>
    </div>
    <div class="account-hero-body">
      <div class="account-photo-wrap">
        <button class="account-photo" id="avatar-edit-btn" type="button" aria-label="Change profile photo" style="${p.photo ? `background-image:url('${p.photo}')` : ''}">
          ${p.photo ? '' : initials(currentUser.name)}
          <span class="account-photo-edit">✎</span>
        </button>
      </div>
      <div class="account-hero-info">
        <h1>${escapeHtml(currentUser.name)}</h1>
        <p class="account-hero-bio">${escapeHtml(p.bio || 'No bio added yet.')}</p>
        <div class="account-hero-meta">
          <span>Level <b>${xpInfo.level}</b></span>
          <span class="dot">•</span>
          <span>${xpInfo.xp} XP</span>
          <span class="dot">•</span>
          <span>Joined ${formatDate(p.joinedAt)}</span>
        </div>
        <div class="xp-bar" title="${xpInfo.into}/${xpInfo.span} XP to next level">
          <i style="width:${xpInfo.pct}%"></i>
        </div>
      </div>
      <div class="account-hero-score">
        <span>Productivity</span>
        <strong>${score}%</strong>
      </div>
    </div>
    <input type="file" id="avatar-file-input" accept="image/png,image/jpeg,image/webp" hidden />
    <input type="file" id="cover-file-input" accept="image/png,image/jpeg,image/webp" hidden />
  `;
}

function levelInfo(p) {
  const xp = Number(p.xp) || computeXp();
  const span = 500;
  const level = Math.floor(xp / span) + 1;
  const into = xp % span;
  return { xp, level, into, span, pct: Math.round((into / span) * 100) };
}

function computeXp() {
  const c = getCounts();
  return totalActions(c) * 10;
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

function formatDate(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return '—'; }
}

// ─── Left nav ───────────────────────────────────────────────────────────
function renderNav() {
  byId('account-nav').innerHTML = ACCOUNT_SECTIONS.map(([key, label, icon]) => `
    <a class="account-nav-item" href="#${key}" data-section="${key}">
      <span aria-hidden="true">${icon}</span><span>${escapeHtml(label)}</span>
    </a>
  `).join('');
  byId('account-nav').addEventListener('click', (e) => {
    const link = e.target.closest('.account-nav-item');
    if (!link) return;
    e.preventDefault();
    scrollToSection(link.dataset.section);
  });
}

function scrollToSection(key, instant) {
  const el = byId(`sec-${key}`);
  if (!el) return;
  el.scrollIntoView({ behavior: instant ? 'auto' : 'smooth', block: 'start' });
  setActiveSection(key);
  history.replaceState(null, '', `#${key}`);
}

function setActiveSection(key) {
  document.querySelectorAll('.account-nav-item').forEach((a) =>
    a.classList.toggle('active', a.dataset.section === key)
  );
}

function bindScrollSpy() {
  const panels = document.querySelectorAll('.account-panel');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) setActiveSection(entry.target.id.replace('sec-', ''));
    });
  }, { rootMargin: '-20% 0px -70% 0px', threshold: 0 });
  panels.forEach((p) => observer.observe(p));
}

// ─── Content ────────────────────────────────────────────────────────────
function renderContent() {
  byId('account-content').innerHTML = ACCOUNT_SECTIONS.map(([key, label]) => `
    <section class="account-panel" id="sec-${key}">
      <div class="account-panel-head">
        <p class="eyebrow">${sectionEyebrow(key)}</p>
        <h2>${escapeHtml(label)}</h2>
      </div>
      <div class="account-panel-body">${sectionBody(key)}</div>
    </section>
  `).join('');
  bindSectionEvents();
}

function sectionEyebrow(key) {
  const map = {
    overview: 'Snapshot', personal: 'Account details', appearance: 'Look & feel',
    notifications: 'Stay on track', productivity: 'Daily targets', statistics: 'Your numbers',
    achievements: 'Milestones', security: 'Account safety', backup: 'Your data', about: 'MyLife',
  };
  return map[key] || '';
}

function sectionBody(key) {
  switch (key) {
    case 'overview':      return overviewHtml();
    case 'personal':      return personalHtml();
    case 'appearance':    return appearanceHtml();
    case 'notifications': return notificationsHtml();
    case 'productivity':  return productivityHtml();
    case 'statistics':    return statisticsHtml();
    case 'achievements':  return achievementsHtml();
    case 'security':      return securityHtml();
    case 'backup':        return backupHtml();
    case 'about':         return aboutHtml();
    default:               return '';
  }
}

// ─── Overview ───────────────────────────────────────────────────────────
function overviewHtml() {
  const c = getCounts();
  const s = currentData.settings;
  const n = nutritionTotals();
  const avgSleep = currentData.sleep.length
    ? (currentData.sleep.reduce((sum, i) => sum + Number(i.hours || 0), 0) / currentData.sleep.length).toFixed(1)
    : '0';
  const cards = [
    ['Tasks completed',    `${c.completedTasks}/${c.tasks}`],
    ['Habits completed',   `${c.completedHabits}/${c.habits}`],
    ['Study hours',        (currentData.study.reduce((s2, i) => s2 + Number(i.minutes || 0), 0) / 60).toFixed(1)],
    ['Workout sessions',   c.workouts],
    ['Prayer consistency', `${percent(c.prayers, (s.prayerGoal || 5) * 4)}%`],
    ['Water streak',       `${c.water} glasses logged`],
    ['Sleep average',      `${avgSleep} h/night`],
    ['Calories logged',    n.calories],
  ];
  return `
    <div class="overview-grid">
      ${cards.map(([label, value]) => `
        <div class="overview-card">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(String(value))}</strong>
        </div>
      `).join('')}
    </div>
    <div class="overview-identity">
      <div class="data-card stacked">
        <h3>Account</h3>
        <p>${escapeHtml(currentUser.name)}</p>
        <p class="muted">${escapeHtml(currentUser.email)}</p>
      </div>
      <div class="data-card stacked">
        <h3>Bio</h3>
        <p>${escapeHtml(currentData.profile.bio || 'No bio added yet.')}</p>
      </div>
    </div>
  `;
}

// ─── Personal information ─────────────────────────────────────────────
function personalHtml() {
  const p = currentData.profile;
  const [firstName, ...rest] = currentUser.name.split(' ');
  const lastName = rest.join(' ');
  return `
    <form class="account-form" id="personal-form" novalidate>
      <div class="form-grid">
        <label>First name<input name="firstName" value="${escapeAttr(p.firstName || firstName || '')}" required /></label>
        <label>Last name<input name="lastName" value="${escapeAttr(p.lastName || lastName || '')}" /></label>
        <label>Username<input name="username" value="${escapeAttr(p.username)}" placeholder="e.g. taha.codes" /></label>
        <label>Email<input value="${escapeAttr(currentUser.email)}" disabled /></label>
        <label>Phone<input name="phone" type="tel" value="${escapeAttr(p.phone)}" /></label>
        <label>Birthday<input name="birthday" type="date" value="${escapeAttr(p.birthday)}" /></label>
        <label>Gender
          <select name="gender">
            ${['Prefer not to say', 'Female', 'Male', 'Other'].map((g) => `<option ${selected(p.gender || 'Prefer not to say', g)}>${g}</option>`).join('')}
          </select>
        </label>
        <label>Country<input name="country" value="${escapeAttr(p.country)}" /></label>
        <label>City<input name="city" value="${escapeAttr(p.location || p.city)}" /></label>
        <label>Timezone
          <select name="timezone">${timezoneOptions(p.timezone)}</select>
        </label>
        <label>Language
          <select name="language">
            ${['English', 'Arabic', 'French', 'Spanish', 'German'].map((l) => `<option ${selected(p.language || 'English', l)}>${l}</option>`).join('')}
          </select>
        </label>
      </div>
      <label class="full-field">Headline<input name="headline" maxlength="60" value="${escapeAttr(p.headline)}" placeholder="e.g. Data Science Student" /></label>
      <label class="full-field">Bio<textarea name="bio" maxlength="280">${escapeHtml(p.bio)}</textarea></label>
      <div class="form-actions">
        <span class="form-message" id="personal-message"></span>
        <button class="primary-btn" type="submit">Save changes</button>
      </div>
    </form>
  `;
}

function timezoneOptions(current) {
  const zones = ['UTC-8', 'UTC-5', 'UTC', 'UTC+1', 'UTC+2', 'UTC+3', 'UTC+4', 'UTC+5:30', 'UTC+8', 'UTC+9'];
  const value = current || 'UTC+2';
  return zones.map((z) => `<option ${selected(value, z)}>${z}</option>`).join('');
}

// ─── Appearance ─────────────────────────────────────────────────────────
function appearanceHtml() {
  const s = currentData.settings;
  return `
    <div class="appearance-block">
      <h3>Theme</h3>
      <div class="segmented" data-group="theme">
        ${['light', 'dark', 'auto'].map((t) => `<button type="button" class="segmented-btn ${s.theme === t ? 'active' : ''}" data-value="${t}">${labelize(t)}</button>`).join('')}
      </div>
    </div>

    <div class="appearance-block">
      <h3>Accent palette</h3>
      <div class="swatch-grid">
        ${PALETTE_SWATCHES.map(([id, color, name]) => `
          <button type="button" class="swatch ${s.palette === id ? 'active' : ''}" data-palette="${id}" style="--swatch:${color}" title="${name}" aria-label="${name}"></button>
        `).join('')}
      </div>
    </div>

    <div class="appearance-block">
      <h3>Font size</h3>
      <div class="segmented" data-group="fontSize">
        ${['sm', 'md', 'lg'].map((f) => `<button type="button" class="segmented-btn ${s.fontSize === f ? 'active' : ''}" data-value="${f}">${f.toUpperCase()}</button>`).join('')}
      </div>
    </div>

    <div class="appearance-block">
      <h3>Border radius</h3>
      <div class="segmented" data-group="radius">
        ${[['sharp', 'Sharp'], ['md', 'Rounded'], ['round', 'Pill']].map(([r, l]) => `<button type="button" class="segmented-btn ${s.radius === r ? 'active' : ''}" data-value="${r}">${l}</button>`).join('')}
      </div>
    </div>

    <div class="appearance-block toggles">
      ${toggleRow('animations', 'Animations', 'Enable interface motion and transitions.', s.animations !== false)}
      ${toggleRow('compact', 'Compact mode', 'Tighten spacing to fit more on screen.', !!s.compact)}
      ${toggleRow('glass', 'Glass effect', 'Frosted, translucent panels.', !!s.glass)}
    </div>
  `;
}

function toggleRow(key, title, desc, checked) {
  return `
    <label class="toggle-row" data-toggle-key="${key}">
      <span>
        <strong>${escapeHtml(title)}</strong>
        <small>${escapeHtml(desc)}</small>
      </span>
      <span class="switch"><input type="checkbox" ${checked ? 'checked' : ''} /><i></i></span>
    </label>
  `;
}

// ─── Notifications ──────────────────────────────────────────────────────
function notificationsHtml() {
  const n = currentData.notifications;
  const reminders = [
    ['task', 'Task reminders'], ['habit', 'Habit reminders'], ['workout', 'Workout reminders'],
    ['study', 'Study reminders'], ['prayer', 'Prayer reminders'], ['goal', 'Goal reminders'],
    ['water', 'Water reminders'], ['sleep', 'Sleep reminders'],
  ];
  return `
    <div class="toggles">
      ${reminders.map(([key, label]) => toggleRow(`notif:${key}`, label, 'Get nudged when it\u2019s time.', !!n[key])).join('')}
    </div>
    <h3 class="section-subhead">Delivery</h3>
    <div class="toggles">
      ${toggleRow('notif:desktop', 'Desktop notifications', 'Show alerts on this device.', !!n.desktop)}
      ${toggleRow('notif:sound', 'Sound', 'Play a sound with reminders.', !!n.sound)}
      ${toggleRow('notif:email', 'Email notifications', 'Send a daily recap by email.', !!n.email)}
    </div>
  `;
}

// ─── Productivity ───────────────────────────────────────────────────────
function productivityHtml() {
  const s = currentData.settings;
  return `
    <form class="account-form" id="productivity-form" novalidate>
      <div class="form-grid">
        <label>Daily study goal (min)<input name="studyGoal" type="number" min="0" value="${s.studyGoal}" /></label>
        <label>Workout goal (per week)<input name="workoutGoal" type="number" min="0" value="${s.workoutGoal}" /></label>
        <label>Water goal (glasses)<input name="waterGoal" type="number" min="1" value="${s.waterGoal}" /></label>
        <label>Sleep goal (hours)<input name="sleepGoal" type="number" min="1" value="${s.sleepGoal}" /></label>
        <label>Habit goal (per day)<input name="habitGoal" type="number" min="0" value="${s.habitGoal}" /></label>
        <label>Prayer goal (per day)<input name="prayerGoal" type="number" min="0" value="${s.prayerGoal}" /></label>
        <label>Calorie target<input name="calorieTarget" type="number" min="0" value="${s.calorieTarget}" /></label>
        <label>Protein target (g)<input name="proteinTarget" type="number" min="0" value="${s.proteinTarget}" /></label>
        <label>Carb target (g)<input name="carbTarget" type="number" min="0" value="${s.carbTarget}" /></label>
        <label>Fat target (g)<input name="fatTarget" type="number" min="0" value="${s.fatTarget}" /></label>
      </div>
      <div class="form-actions">
        <span class="form-message" id="productivity-message"></span>
        <button class="primary-btn" type="submit">Save targets</button>
      </div>
    </form>
    <h3 class="section-subhead">Reviews</h3>
    <div class="toggles">
      ${toggleRow('notif:weeklyReview', 'Weekly review reminder', 'A nudge every Sunday to reflect on the week.', !!currentData.notifications.weeklyReview)}
      ${toggleRow('notif:monthlyReview', 'Monthly review reminder', 'A nudge on the 1st to plan the month ahead.', !!currentData.notifications.monthlyReview)}
    </div>
  `;
}

// ─── Statistics ─────────────────────────────────────────────────────────
function statisticsHtml() {
  const c = getCounts();
  const s = currentData.settings;
  const n = nutritionTotals();
  const rows = [
    ['Tasks', c.completedTasks, c.tasks],
    ['Habits', c.completedHabits, c.habits],
    ['Goals', c.completedGoals, c.goals],
    ['Water', c.water, s.waterGoal * 7],
    ['Sleep records', c.sleep, s.sleepGoal ? 30 : 30],
    ['Study sessions', c.study, 30],
    ['Workouts', c.workouts, s.workoutGoal * 4 || 16],
    ['Prayers', c.prayers, s.prayerGoal * 30 || 150],
  ];
  return `
    <div class="stat-bars">
      ${rows.map(([label, value, target]) => `
        <div class="stat-bar-row">
          <span>${escapeHtml(label)}</span>
          <div class="stat-bar"><i style="width:${percent(value, target || 1)}%"></i></div>
          <b>${value}</b>
        </div>
      `).join('')}
    </div>
    <div class="overview-grid">
      ${nutritionSummaryCard2('Calories', n.calories, s.calorieTarget)}
      ${nutritionSummaryCard2('Protein', n.protein, s.proteinTarget, 'g')}
      ${nutritionSummaryCard2('Carbs', n.carbs, s.carbTarget, 'g')}
      ${nutritionSummaryCard2('Fat', n.fat, s.fatTarget, 'g')}
    </div>
  `;
}

function nutritionSummaryCard2(label, value, target, suffix = '') {
  return `<div class="overview-card"><span>${escapeHtml(label)}</span><strong>${value}${suffix} / ${target}${suffix}</strong></div>`;
}

// ─── Achievements ───────────────────────────────────────────────────────
function syncAchievements() {
  const c = getCounts();
  const unlocked = new Set(currentData.achievements.unlocked || []);
  let changed = false;
  ACHIEVEMENT_DEFS.forEach(([id, , , , test]) => {
    if (test(c) && !unlocked.has(id)) { unlocked.add(id); changed = true; }
  });
  if (changed) {
    currentData.achievements.unlocked = Array.from(unlocked);
    currentData.profile.xp = computeXp();
    persist();
  }
}

function achievementsHtml() {
  const c = getCounts();
  const unlocked = new Set(currentData.achievements.unlocked || []);
  return `
    <div class="achievement-grid">
      ${ACHIEVEMENT_DEFS.map(([id, icon, title, desc, , progressFn]) => {
        const isUnlocked = unlocked.has(id);
        const pct = Math.min(100, Math.round((progressFn(c) || 0) * 100));
        return `
          <div class="achievement-card ${isUnlocked ? 'unlocked' : 'locked'}">
            <span class="achievement-icon">${isUnlocked ? icon : '🔒'}</span>
            <strong>${escapeHtml(title)}</strong>
            <p>${escapeHtml(desc)}</p>
            ${isUnlocked ? '<span class="achievement-badge">Unlocked</span>' : `<div class="meter"><i style="width:${pct}%"></i></div>`}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ─── Security ───────────────────────────────────────────────────────────
function securityHtml() {
  const sec = currentData.security;
  return `
    <div class="account-panel-section">
      <h3>Change password</h3>
      <form class="account-form" id="password-form" novalidate>
        <div class="form-grid">
          <label>Current password<input name="current" type="password" autocomplete="current-password" required /></label>
          <label>New password<input name="next" type="password" autocomplete="new-password" minlength="6" required /></label>
          <label>Confirm new password<input name="confirm" type="password" autocomplete="new-password" minlength="6" required /></label>
        </div>
        <div class="form-actions">
          <span class="form-message" id="password-message"></span>
          <button class="primary-btn" type="submit">Update password</button>
        </div>
      </form>
    </div>

    <div class="account-panel-section">
      <h3>Sessions &amp; devices</h3>
      <div class="data-card stacked">
        <h3>This device</h3>
        <p>${escapeHtml(browserLabel())}</p>
        <p class="muted">Active now · Signed in as ${escapeHtml(currentUser.email)}</p>
      </div>
    </div>

    <div class="account-panel-section">
      <h3>Two-factor authentication</h3>
      ${toggleRow('security:twoFactor', 'Require a second step at sign-in', 'Coming soon — this switch will enable email or app-based 2FA.', !!sec.twoFactor)}
    </div>

    <div class="account-panel-section danger-zone">
      <h3>Danger zone</h3>
      <div class="danger-row">
        <div>
          <strong>Delete account</strong>
          <p class="muted">Permanently remove your account and all MyLife data on this device.</p>
        </div>
        <button class="danger-btn" type="button" id="delete-account-btn">Delete account</button>
      </div>
    </div>
  `;
}

function browserLabel() {
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  const os = /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'macOS' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Linux/.test(ua) ? 'Linux' : 'Unknown OS';
  return `${browser} on ${os}`;
}

// ─── Backup ─────────────────────────────────────────────────────────────
function backupHtml() {
  return `
    <div class="backup-grid">
      <div class="data-card stacked">
        <h3>Export data</h3>
        <p class="muted">Download everything as a JSON file — doubles as a backup.</p>
        <button class="secondary-btn" type="button" id="backup-export-btn">Export data</button>
      </div>
      <div class="data-card stacked">
        <h3>Import / restore data</h3>
        <p class="muted">Restore from a previously exported MyLife JSON file.</p>
        <button class="secondary-btn" type="button" id="backup-import-btn">Import data</button>
        <input type="file" id="backup-import-input" accept="application/json" hidden />
      </div>
      <div class="data-card stacked">
        <h3>Reset statistics</h3>
        <p class="muted">Clear all logged entries but keep your profile and settings.</p>
        <button class="danger-btn" type="button" id="backup-reset-btn">Reset statistics</button>
      </div>
      <div class="data-card stacked">
        <h3>Clear cache</h3>
        <p class="muted">Remove all local MyLife data from this browser and sign out.</p>
        <button class="danger-btn" type="button" id="backup-clear-btn">Clear cache</button>
      </div>
    </div>
  `;
}

// ─── About ──────────────────────────────────────────────────────────────
function aboutHtml() {
  return `
    <div class="about-grid">
      <div class="data-card stacked"><h3>Version</h3><p>MyLife 2.0.0</p></div>
      <div class="data-card stacked"><h3>Developer</h3><p>Built and maintained by you, powered by MyLife.</p></div>
      <div class="data-card stacked"><h3>Privacy</h3><p class="muted">All data stays in this browser's local storage — nothing is sent to a server.</p></div>
      <div class="data-card stacked"><h3>Terms</h3><p class="muted">MyLife is a personal tracking tool provided as-is, for your own use.</p></div>
      <div class="data-card stacked"><h3>Licenses</h3><p class="muted">Built with vanilla HTML, CSS and JavaScript — no third-party runtime dependencies.</p></div>
    </div>
  `;
}

// ─── Section event binding ──────────────────────────────────────────────
function bindSectionEvents() {
  const personalForm = byId('personal-form');
  if (personalForm) personalForm.addEventListener('submit', savePersonal);

  const productivityForm = byId('productivity-form');
  if (productivityForm) productivityForm.addEventListener('submit', saveProductivity);

  const passwordForm = byId('password-form');
  if (passwordForm) passwordForm.addEventListener('submit', changePassword);

  document.querySelectorAll('.segmented[data-group]').forEach((group) => {
    group.addEventListener('click', (e) => {
      const btn = e.target.closest('.segmented-btn');
      if (!btn) return;
      handleSegmented(group.dataset.group, btn.dataset.value);
      group.querySelectorAll('.segmented-btn').forEach((b) => b.classList.toggle('active', b === btn));
    });
  });

  document.querySelectorAll('.swatch').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentData.settings.palette = btn.dataset.palette;
      persist();
      applyTheme(currentData.settings.theme, currentData.settings.palette);
      document.querySelectorAll('.swatch').forEach((s) => s.classList.toggle('active', s === btn));
    });
  });

  document.querySelectorAll('[data-toggle-key]').forEach((row) => {
    const input = row.querySelector('input[type="checkbox"]');
    input.addEventListener('change', () => handleToggle(row.dataset.toggleKey, input.checked));
  });

  const avatarBtn = byId('avatar-edit-btn');
  if (avatarBtn) avatarBtn.addEventListener('click', () => byId('avatar-file-input').click());
  const avatarInput = byId('avatar-file-input');
  if (avatarInput) avatarInput.addEventListener('change', (e) => onPhotoChosen(e, 'avatar'));

  const coverBtn = byId('cover-edit-btn');
  if (coverBtn) coverBtn.addEventListener('click', () => byId('cover-file-input').click());
  const coverInput = byId('cover-file-input');
  if (coverInput) coverInput.addEventListener('change', (e) => onPhotoChosen(e, 'cover'));

  const deleteBtn = byId('delete-account-btn');
  if (deleteBtn) deleteBtn.addEventListener('click', confirmDeleteAccount);

  const exportBtn = byId('backup-export-btn');
  if (exportBtn) exportBtn.addEventListener('click', exportData);

  const importBtn = byId('backup-import-btn');
  const importInput = byId('backup-import-input');
  if (importBtn && importInput) {
    importBtn.addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', onImportFile);
  }

  const resetBtn = byId('backup-reset-btn');
  if (resetBtn) resetBtn.addEventListener('click', confirmResetStatistics);

  const clearBtn = byId('backup-clear-btn');
  if (clearBtn) clearBtn.addEventListener('click', confirmClearCache);
}

function bindGlobalAccountEvents() {
  window.addEventListener('resize', () => { /* reserved for future responsive tweaks */ });
}

// ─── Handlers ───────────────────────────────────────────────────────────
function savePersonal(e) {
  e.preventDefault();
  const form = new FormData(e.currentTarget);
  const first = String(form.get('firstName') || '').trim();
  const last  = String(form.get('lastName') || '').trim();
  if (!first) { byId('personal-message').textContent = 'First name is required.'; return; }

  currentUser.name = [first, last].filter(Boolean).join(' ');
  Object.assign(currentData.profile, {
    firstName: first,
    lastName:  last,
    username:  String(form.get('username') || '').trim(),
    phone:     String(form.get('phone') || '').trim(),
    birthday:  String(form.get('birthday') || ''),
    gender:    String(form.get('gender') || ''),
    country:   String(form.get('country') || '').trim(),
    city:      String(form.get('city') || '').trim(),
    location:  String(form.get('city') || '').trim(),
    timezone:  String(form.get('timezone') || ''),
    language:  String(form.get('language') || 'English'),
    headline:  String(form.get('headline') || '').trim(),
    bio:       String(form.get('bio') || '').trim(),
  });
  saveUsers(getUsers().map((u) => (u.email === currentUser.email ? currentUser : u)));
  persist();
  byId('personal-message').textContent = 'Saved.';
  renderHero();
  renderSidebar('account');
  window.setTimeout(() => { const m = byId('personal-message'); if (m) m.textContent = ''; }, 2500);
}

function saveProductivity(e) {
  e.preventDefault();
  const form = new FormData(e.currentTarget);
  ['studyGoal', 'workoutGoal', 'waterGoal', 'sleepGoal', 'habitGoal', 'prayerGoal', 'calorieTarget', 'proteinTarget', 'carbTarget', 'fatTarget']
    .forEach((key) => { currentData.settings[key] = Number(form.get(key)) || 0; });
  persist();
  byId('productivity-message').textContent = 'Targets saved.';
  window.setTimeout(() => { const m = byId('productivity-message'); if (m) m.textContent = ''; }, 2500);
}

function handleSegmented(group, value) {
  if (group === 'theme') {
    currentData.settings.theme = value;
    applyTheme(value, currentData.settings.palette);
  } else {
    currentData.settings[group] = value;
    applyAppearance(currentData.settings);
  }
  persist();
}

function handleToggle(key, checked) {
  if (key.startsWith('notif:')) {
    currentData.notifications[key.slice(6)] = checked;
  } else if (key.startsWith('security:')) {
    currentData.security[key.slice(9)] = checked;
  } else {
    currentData.settings[key] = checked;
    applyAppearance(currentData.settings);
  }
  persist();
}

function changePassword(e) {
  e.preventDefault();
  const form = new FormData(e.currentTarget);
  const current = String(form.get('current') || '');
  const next    = String(form.get('next') || '');
  const confirm = String(form.get('confirm') || '');
  const msg = byId('password-message');
  if (current !== currentUser.password) { msg.textContent = 'Current password is incorrect.'; return; }
  if (next.length < 6) { msg.textContent = 'New password must be at least 6 characters.'; return; }
  if (next !== confirm) { msg.textContent = 'New passwords do not match.'; return; }
  currentUser.password = next;
  currentData.security.lastPasswordChange = new Date().toISOString();
  saveUsers(getUsers().map((u) => (u.email === currentUser.email ? currentUser : u)));
  persist();
  msg.textContent = 'Password updated.';
  e.currentTarget.reset();
}

function confirmDeleteAccount() {
  openModal({
    title: 'Delete your account?',
    body: '<p>This permanently deletes your MyLife account and every entry stored on this device. This cannot be undone.</p>',
    confirmLabel: 'Delete account',
    danger: true,
    onConfirm: () => {
      const users = getUsers().filter((u) => u.email !== currentUser.email);
      saveUsers(users);
      localStorage.removeItem(DATA_PREFIX + currentUser.email);
      logout();
    },
  });
}

function confirmResetStatistics() {
  openModal({
    title: 'Reset all statistics?',
    body: '<p>This clears every logged task, habit, goal, meal, workout and other entry. Your profile and settings stay untouched.</p>',
    confirmLabel: 'Reset statistics',
    danger: true,
    onConfirm: () => {
      ['tasks', 'habits', 'goals', 'events', 'workouts', 'prayers', 'meals', 'water', 'sleep', 'study', 'subjects', 'assignments', 'exams', 'projects', 'studyNotes']
        .forEach((key) => { currentData[key] = []; });
      currentData.achievements.unlocked = [];
      currentData.profile.xp = 0;
      persist();
      renderHero();
      renderContent();
    },
  });
}

function confirmClearCache() {
  openModal({
    title: 'Clear cache?',
    body: '<p>This removes all MyLife data stored in this browser, including every account, and signs you out.</p>',
    confirmLabel: 'Clear cache',
    danger: true,
    onConfirm: () => { localStorage.clear(); window.location.href = '../index.html'; },
  });
}

function onImportFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!parsed || !parsed.data) throw new Error('Invalid file');
      currentData = normalizeData(parsed.data, currentUser.name);
      persist();
      renderHero();
      renderContent();
      bindScrollSpy();
    } catch {
      alert('That file could not be read as a MyLife backup.');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

// ─── Photo upload + crop ────────────────────────────────────────────────
function onPhotoChosen(e, kind) {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { alert('Please choose a JPG, PNG or WEBP image.'); return; }
  if (file.size > 5 * 1024 * 1024) { alert('Images must be under 5MB.'); return; }
  const reader = new FileReader();
  reader.onload = () => openCropper(reader.result, kind);
  reader.readAsDataURL(file);
}

function openCropper(dataUrl, kind) {
  const isAvatar = kind === 'avatar';
  const layer = byId('modal-layer');
  layer.hidden = false;
  layer.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal-card cropper-card">
        <h2>${isAvatar ? 'Update profile photo' : 'Update cover image'}</h2>
        <div class="cropper-viewport ${isAvatar ? 'round' : 'wide'}" id="cropper-viewport">
          <img id="cropper-img" src="${dataUrl}" alt="" draggable="false" />
        </div>
        <label class="cropper-zoom">
          Zoom
          <input type="range" id="cropper-zoom" min="1" max="3" step="0.01" value="1" />
        </label>
        <div class="cropper-tools">
          <button class="text-btn" type="button" id="cropper-rotate">↻ Rotate</button>
          <button class="text-btn" type="button" id="cropper-remove">Remove photo</button>
        </div>
        <div class="modal-actions">
          <button class="secondary-btn" type="button" id="cropper-cancel">Cancel</button>
          <button class="primary-btn" type="button" id="cropper-save">Save photo</button>
        </div>
      </div>
    </div>
  `;
  requestAnimationFrame(() => layer.querySelector('.modal-backdrop').classList.add('open'));
  setupCropper(isAvatar);
  byId('cropper-cancel').addEventListener('click', closeModal);
  byId('cropper-save').addEventListener('click', () => saveCroppedPhoto(kind));
  byId('cropper-rotate').addEventListener('click', () => rotateCropper());
  byId('cropper-remove').addEventListener('click', () => removePhoto(kind));
}

function removePhoto(kind) {
  if (kind === 'avatar') currentData.profile.photo = null;
  else currentData.profile.cover = null;
  persist();
  closeModal();
  renderHero();
  renderSidebar('account');
}

function rotateCropper() {
  cropperState.rotate = ((cropperState.rotate || 0) + 90) % 360;
  applyCropperTransform();
}

function applyCropperTransform() {
  const img = byId('cropper-img');
  if (!img) return;
  img.style.transform = `translate(-50%, -50%) translate(${cropperState.x}px, ${cropperState.y}px) rotate(${cropperState.rotate || 0}deg) scale(${cropperState.scale})`;
}

function setupCropper(isAvatar) {
  const img = byId('cropper-img');
  const viewport = byId('cropper-viewport');
  const zoomInput = byId('cropper-zoom');
  cropperState = { x: 0, y: 0, scale: 1, rotate: 0, dragging: false, startX: 0, startY: 0, isAvatar };

  img.addEventListener('load', applyCropperTransform);
  if (img.complete) applyCropperTransform();

  const start = (clientX, clientY) => {
    cropperState.dragging = true;
    cropperState.startX = clientX - cropperState.x;
    cropperState.startY = clientY - cropperState.y;
  };
  const move = (clientX, clientY) => {
    if (!cropperState.dragging) return;
    cropperState.x = clientX - cropperState.startX;
    cropperState.y = clientY - cropperState.startY;
    applyCropperTransform();
  };
  const end = () => { cropperState.dragging = false; };

  viewport.addEventListener('pointerdown', (e) => start(e.clientX, e.clientY));
  window.addEventListener('pointermove', (e) => move(e.clientX, e.clientY));
  window.addEventListener('pointerup', end);

  zoomInput.addEventListener('input', () => {
    cropperState.scale = Number(zoomInput.value);
    applyCropperTransform();
  });
}

function saveCroppedPhoto(kind) {
  const img = byId('cropper-img');
  const viewport = byId('cropper-viewport');
  const size = kind === 'avatar' ? 480 : { w: 1200, h: 420 };
  const canvas = document.createElement('canvas');
  canvas.width = kind === 'avatar' ? size : size.w;
  canvas.height = kind === 'avatar' ? size : size.h;
  const ctx = canvas.getContext('2d');
  const vpRect = viewport.getBoundingClientRect();
  // Map the on-screen crop viewport (and its pan/zoom transform) onto the
  // output canvas at the same relative scale, so what's visible is what's saved.
  const ratio = canvas.width / vpRect.width;
  const baseImgRect = img.getBoundingClientRect();
  const imgW = baseImgRect.width * ratio;
  const imgH = baseImgRect.height * ratio;
  const centerX = canvas.width / 2 + cropperState.x * ratio;
  const centerY = canvas.height / 2 + cropperState.y * ratio;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, canvas.width, canvas.height);
  ctx.clip();
  ctx.translate(centerX, centerY);
  ctx.rotate(((cropperState.rotate || 0) * Math.PI) / 180);
  ctx.drawImage(img, -imgW / 2, -imgH / 2, imgW, imgH);
  ctx.restore();

  const dataUrl = canvas.toDataURL('image/jpeg', 0.86);
  if (kind === 'avatar') currentData.profile.photo = dataUrl;
  else currentData.profile.cover = dataUrl;
  persist();
  closeModal();
  renderHero();
  renderSidebar('account');
}

// ─── Generic confirm modal ──────────────────────────────────────────────
function openModal({ title, body, confirmLabel, danger, onConfirm }) {
  const layer = byId('modal-layer');
  layer.hidden = false;
  layer.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal-card">
        <h2>${escapeHtml(title)}</h2>
        <div class="modal-body">${body}</div>
        <div class="modal-actions">
          <button class="secondary-btn" type="button" id="modal-cancel">Cancel</button>
          <button class="${danger ? 'danger-btn' : 'primary-btn'}" type="button" id="modal-confirm">${escapeHtml(confirmLabel)}</button>
        </div>
      </div>
    </div>
  `;
  requestAnimationFrame(() => layer.querySelector('.modal-backdrop').classList.add('open'));
  byId('modal-cancel').addEventListener('click', closeModal);
  byId('modal-confirm').addEventListener('click', () => { onConfirm(); closeModal(); });
  layer.querySelector('.modal-backdrop').addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-backdrop')) closeModal();
  });
}

function closeModal() {
  const layer = byId('modal-layer');
  const backdrop = layer.querySelector('.modal-backdrop');
  if (!backdrop) { layer.hidden = true; return; }
  backdrop.classList.remove('open');
  window.setTimeout(() => { layer.hidden = true; layer.innerHTML = ''; }, 200);
}
