// MOMENTUM — Profile & Settings page controller.
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
  ['deep-space',  '#22d3ee', 'Deep Space'],
  ['solar-light', '#2563eb', 'Solar Light'],
  ['earth',       '#34d399', 'Earth'],
  ['mars',        '#f97316', 'Mars'],
  ['saturn',      '#facc15', 'Saturn'],
  ['neptune',     '#2dd4bf', 'Neptune'],
  ['nebula',      '#c084fc', 'Nebula'],
  ['galaxy',      '#60a5fa', 'Galaxy'],
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
  window.__pageContentReinit = () => { syncAchievements(); renderHero(); renderNav(); renderContent(); };
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
        <button class="account-photo" id="avatar-edit-btn" type="button" aria-label="Profile photo options" aria-haspopup="true" aria-expanded="false" aria-controls="avatar-menu" style="${p.photo ? `background-image:url('${p.photo}')` : ''}">
          ${p.photo ? '' : initials(currentUser.name)}
          <span class="account-photo-edit">✎</span>
        </button>
        <div class="account-menu avatar-menu" id="avatar-menu" role="menu" hidden>
          ${p.photo ? `
            <button role="menuitem" type="button" data-avatar-action="view">
              <span class="account-menu-icon" aria-hidden="true">${SVG_ICON.eye || ''}</span><span>View photo</span>
            </button>
          ` : ''}
          <button role="menuitem" type="button" data-avatar-action="change">
            <span class="account-menu-icon" aria-hidden="true">${SVG_ICON.save || ''}</span><span>${p.photo ? 'Change photo' : 'Upload photo'}</span>
          </button>
          ${p.photo ? `
            <button role="menuitem" type="button" class="account-menu-logout" data-avatar-action="remove">
              <span class="account-menu-icon" aria-hidden="true">${SVG_ICON.logout || ''}</span><span>Remove photo</span>
            </button>
          ` : ''}
          <button role="menuitem" type="button" data-avatar-action="edit-profile">
            <span class="account-menu-icon" aria-hidden="true">${SVG_ICON.user || ''}</span><span>Edit profile info</span>
          </button>
        </div>
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
    achievements: 'Milestones', security: 'Account safety', backup: 'Your data', about: 'Momentum',
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
        <label class="country-field">Country
          <div class="country-combobox" data-country-combobox>
            <input
              type="text"
              id="country-search"
              role="combobox"
              aria-expanded="false"
              aria-controls="country-listbox"
              aria-autocomplete="list"
              autocomplete="off"
              placeholder="Search countries…"
              value="${escapeAttr(p.country)}"
            />
            <input type="hidden" name="country" id="country-value" value="${escapeAttr(p.country)}" />
            <ul class="country-listbox" id="country-listbox" role="listbox" hidden></ul>
          </div>
        </label>
        <label>City<input name="city" value="${escapeAttr(p.location || p.city)}" /></label>
        <label>Timezone
          <select name="timezone">${timezoneOptions(p.timezone)}</select>
        </label>
        <label>Language
          <select name="language" id="profile-language-select">
            ${[['en', 'English'], ['ar', 'العربية'], ['fr', 'Français'], ['de', 'Deutsch']].map(([code, label]) => `<option value="${code}" ${getLang() === code ? 'selected' : ''}>${label}</option>`).join('')}
          </select>
        </label>
      </div>
      <p class="field-hint">${t('This also changes the interface language everywhere — the same as the switcher in the sidebar.')}</p>
      <label class="full-field">Headline<input name="headline" maxlength="60" value="${escapeAttr(p.headline)}" placeholder="e.g. Data Science Student" /></label>
      <label class="full-field">Bio<textarea name="bio" maxlength="280">${escapeHtml(p.bio)}</textarea></label>
      <div class="form-actions">
        <span class="form-message" id="personal-message"></span>
        <button class="secondary-btn" type="button" id="personal-cancel">Cancel</button>
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
        ${[['light', 'Light'], ['dark', 'Dark'], ['auto', 'Use System']].map(([t, l]) => `<button type="button" class="segmented-btn ${s.theme === t ? 'active' : ''}" data-value="${t}">${l}</button>`).join('')}
      </div>
    </div>

    <div class="appearance-block">
      <h3>Theme Color</h3>
      <div class="theme-card-grid">
        ${PALETTE_SWATCHES.map(([id, color, name]) => `
          <button type="button" class="theme-card ${s.palette === id ? 'active' : ''}" data-palette="${id}" aria-pressed="${s.palette === id}">
            <span class="theme-card-preview" data-theme-preview="${id}">
              <span class="theme-card-dots">
                <i></i><i></i><i></i>
              </span>
            </span>
            <span class="theme-card-name">${name}</span>
            <span class="theme-card-check" aria-hidden="true">${SVG_ICON.check || '✓'}</span>
          </button>
        `).join('')}
      </div>
    </div>

    <div class="appearance-block">
      <h3>Font size</h3>
      <div class="segmented" data-group="fontSize">
        ${[['sm', 'S'], ['md', 'M'], ['lg', 'L'], ['xl', 'XL']].map(([f, label]) => `<button type="button" class="segmented-btn ${s.fontSize === f ? 'active' : ''}" data-value="${f}">${label}</button>`).join('')}
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

function toggleRow(key, title, desc, checked, disabled = false) {
  return `
    <label class="toggle-row${disabled ? ' is-disabled' : ''}" data-toggle-key="${key}">
      <span>
        <strong>${escapeHtml(title)}</strong>
        <small>${escapeHtml(desc)}</small>
      </span>
      <span class="switch"><input type="checkbox" ${checked ? 'checked' : ''} ${disabled ? 'disabled aria-disabled="true"' : ''} /><i></i></span>
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
      ${toggleRow('notif:email', 'Email notifications', 'Unavailable in local-only mode; it requires a connected email service.', false, true)}
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
          <p class="muted">Permanently remove your account and all Momentum data on this device.</p>
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
        <p class="muted">Restore from a previously exported Momentum JSON file.</p>
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
        <p class="muted">Remove all local Momentum data from this browser and sign out.</p>
        <button class="danger-btn" type="button" id="backup-clear-btn">Clear cache</button>
      </div>
    </div>
  `;
}

// ─── Country selector ───────────────────────────────────────────────────
// Builds the full list from standard ISO 3166-1 codes at runtime (flag via
// regional-indicator emoji math, name via the browser's built-in
// Intl.DisplayNames) — no external country-list dependency needed, and
// names automatically follow the active app language.
const ISO_COUNTRY_CODES = [
  'AF','AL','DZ','AD','AO','AG','AR','AM','AU','AT','AZ','BS','BH','BD','BB','BY','BE','BZ','BJ','BT',
  'BO','BA','BW','BR','BN','BG','BF','BI','CV','KH','CM','CA','CF','TD','CL','CN','CO','KM','CG','CD',
  'CR','CI','HR','CU','CY','CZ','DK','DJ','DM','DO','EC','EG','SV','GQ','ER','EE','SZ','ET','FJ','FI',
  'FR','GA','GM','GE','DE','GH','GR','GD','GT','GN','GW','GY','HT','HN','HU','IS','IN','ID','IR','IQ',
  'IE','IL','IT','JM','JP','JO','KZ','KE','KI','KP','KR','KW','KG','LA','LV','LB','LS','LR','LY','LI',
  'LT','LU','MG','MW','MY','MV','ML','MT','MH','MR','MU','MX','FM','MD','MC','MN','ME','MA','MZ','MM',
  'NA','NR','NP','NL','NZ','NI','NE','NG','MK','NO','OM','PK','PW','PA','PG','PY','PE','PH','PL','PT',
  'QA','RO','RU','RW','KN','LC','VC','WS','SM','ST','SA','SN','RS','SC','SL','SG','SK','SI','SB','SO',
  'ZA','SS','ES','LK','SD','SR','SE','CH','SY','TW','TJ','TZ','TH','TL','TG','TO','TT','TN','TR','TM',
  'TV','UG','UA','AE','GB','US','UY','UZ','VU','VA','VE','VN','YE','ZM','ZW','PS',
];

function countryFlag(code) {
  return String.fromCodePoint(...code.toUpperCase().split('').map((c) => 127397 + c.charCodeAt(0)));
}

function buildCountryList() {
  let namer;
  try { namer = new Intl.DisplayNames([getLang() === 'ar' ? 'ar' : getLang()], { type: 'region' }); }
  catch (_e) { namer = null; }
  return ISO_COUNTRY_CODES
    .map((code) => ({ code, flag: countryFlag(code), name: (namer && namer.of(code)) || code }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function bindCountryCombobox() {
  const wrap = document.querySelector('[data-country-combobox]');
  if (!wrap) return;
  const search  = byId('country-search');
  const hidden  = byId('country-value');
  const listbox = byId('country-listbox');
  const countries = buildCountryList();
  let activeIndex = -1;

  function renderOptions(query) {
    const q = query.trim().toLowerCase();
    const matches = (q ? countries.filter((c) => c.name.toLowerCase().includes(q)) : countries).slice(0, 40);
    listbox.innerHTML = matches.map((c, i) => `
      <li role="option" id="country-opt-${i}" data-code="${c.code}" data-name="${escapeAttr(c.name)}" class="${c.name === hidden.value ? 'is-selected' : ''}">
        <span class="country-flag" aria-hidden="true">${c.flag}</span><span>${escapeHtml(c.name)}</span>
      </li>
    `).join('') || `<li class="country-empty">${t('No matches')}</li>`;
    activeIndex = -1;
  }

  function openList() {
    listbox.hidden = false;
    search.setAttribute('aria-expanded', 'true');
  }
  function closeList() {
    listbox.hidden = true;
    search.setAttribute('aria-expanded', 'false');
  }
  function selectOption(li) {
    if (!li || !li.dataset.code) return;
    hidden.value = li.dataset.name;
    search.value = li.dataset.name;
    closeList();
  }
  function moveActive(delta) {
    const items = Array.from(listbox.querySelectorAll('li[data-code]'));
    if (!items.length) return;
    activeIndex = (activeIndex + delta + items.length) % items.length;
    items.forEach((li, i) => li.classList.toggle('is-active', i === activeIndex));
    items[activeIndex].scrollIntoView({ block: 'nearest' });
    search.setAttribute('aria-activedescendant', items[activeIndex].id);
  }

  search.addEventListener('focus', () => { renderOptions(search.value); openList(); });
  search.addEventListener('input', () => { renderOptions(search.value); openList(); });
  search.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (listbox.hidden) openList(); moveActive(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveActive(-1); }
    else if (e.key === 'Enter') { e.preventDefault(); const items = listbox.querySelectorAll('li[data-code]'); if (activeIndex >= 0) selectOption(items[activeIndex]); }
    else if (e.key === 'Escape') { closeList(); search.blur(); }
  });
  listbox.addEventListener('mousedown', (e) => {
    const li = e.target.closest('li[data-code]');
    if (li) selectOption(li);
  });
  document.addEventListener('click', (e) => { if (!wrap.contains(e.target)) closeList(); });
}

// ─── About ──────────────────────────────────────────────────────────────
function aboutHtml() {
  return `
    <div class="about-grid">
      <div class="data-card stacked"><h3>Version</h3><p>Momentum 1.0.0</p></div>
      <div class="data-card stacked"><h3>Developer</h3><p>Built and maintained by you, powered by Momentum.</p></div>
      <div class="data-card stacked"><h3>Privacy</h3><p class="muted">All data stays in this browser's local storage — nothing is sent to a server.</p></div>
      <div class="data-card stacked"><h3>Terms</h3><p class="muted">Momentum is a personal tracking tool provided as-is, for your own use.</p></div>
      <div class="data-card stacked"><h3>Licenses</h3><p class="muted">Built with vanilla HTML, CSS and JavaScript — no third-party runtime dependencies.</p></div>
    </div>
  `;
}

// ─── Section event binding ──────────────────────────────────────────────
function bindSectionEvents() {
  const personalForm = byId('personal-form');
  if (personalForm) personalForm.addEventListener('submit', savePersonal);
  const personalCancel = byId('personal-cancel');
  if (personalCancel) personalCancel.addEventListener('click', () => {
    // Profile edits are only written on submit. Re-rendering restores the
    // persisted values and also resets the country combobox state.
    renderContent();
    showToast('Changes discarded.', 'default');
  });

  const profileLangSelect = byId('profile-language-select');
  if (profileLangSelect) profileLangSelect.addEventListener('change', () => setLanguage(profileLangSelect.value));

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

  document.querySelectorAll('.theme-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentData.settings.palette = btn.dataset.palette;
      persist();
      applyTheme(currentData.settings.theme, currentData.settings.palette);
      document.querySelectorAll('.theme-card').forEach((s) => {
        s.classList.toggle('active', s === btn);
        s.setAttribute('aria-pressed', String(s === btn));
      });
      showToast(`${btn.querySelector('.theme-card-name').textContent} theme applied`, 'success');
    });
  });

  bindCountryCombobox();

  document.querySelectorAll('[data-toggle-key]').forEach((row) => {
    const input = row.querySelector('input[type="checkbox"]');
    input.addEventListener('change', () => handleToggle(row.dataset.toggleKey, input.checked));
  });

  bindAccountMenu('avatar-edit-btn', 'avatar-menu');
  const avatarMenu = byId('avatar-menu');
  if (avatarMenu) {
    avatarMenu.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-avatar-action]');
      if (!btn) return;
      const action = btn.dataset.avatarAction;
      avatarMenu.classList.remove('open');
      avatarMenu.hidden = true;
      byId('avatar-edit-btn').setAttribute('aria-expanded', 'false');
      if (action === 'change') byId('avatar-file-input').click();
      else if (action === 'remove') removePhoto('avatar');
      else if (action === 'view') openPhotoViewer(currentData.profile.photo);
      else if (action === 'edit-profile') scrollToSection('personal');
    });
  }
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
  if (!e.currentTarget.checkValidity()) {
    e.currentTarget.reportValidity();
    return;
  }
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
    language:  String(form.get('language') || getLang()),
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
  if (!e.currentTarget.checkValidity()) {
    e.currentTarget.reportValidity();
    return;
  }
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
  if (key === 'notif:desktop' && checked) {
    if (!('Notification' in window)) {
      currentData.notifications.desktop = false;
      persist();
      renderContent();
      showToast('Desktop notifications are not supported by this browser.', 'danger');
      return;
    }
    if (Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        currentData.notifications.desktop = permission === 'granted';
        persist();
        renderContent();
        showToast(permission === 'granted' ? 'Desktop notifications enabled.' : 'Desktop notification permission was not granted.', permission === 'granted' ? 'success' : 'danger');
      });
      return;
    }
    if (Notification.permission === 'denied') {
      currentData.notifications.desktop = false;
      persist();
      renderContent();
      showToast('Allow notifications in your browser settings to enable reminders.', 'danger');
      return;
    }
  }
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
    body: '<p>This permanently deletes your Momentum account and every entry stored on this device. This cannot be undone.</p>',
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
    body: '<p>This removes all Momentum data stored in this browser, including every account, and signs you out.</p>',
    confirmLabel: 'Clear cache',
    danger: true,
    onConfirm: () => {
      Object.keys(localStorage).filter((key) => key.startsWith('mylife.')).forEach((key) => localStorage.removeItem(key));
      Object.keys(sessionStorage).filter((key) => key.startsWith('mylife.')).forEach((key) => sessionStorage.removeItem(key));
      window.location.href = '../index.html';
    },
  });
}

function onImportFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    showToast('Backup files must be smaller than 5MB.', 'danger');
    e.target.value = '';
    return;
  }
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
      showToast('Backup restored successfully.', 'success');
    } catch {
      showToast('That file could not be read as a Momentum backup.', 'danger');
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
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { showToast('Choose a JPG, PNG, or WEBP image.', 'danger'); return; }
  if (file.size > 5 * 1024 * 1024) { showToast('Images must be smaller than 5MB.', 'danger'); return; }
  const reader = new FileReader();
  reader.onload = () => openCropper(reader.result, kind);
  reader.readAsDataURL(file);
}

function openPhotoViewer(dataUrl) {
  if (!dataUrl) return;
  const layer = ensureModalLayer();
  layer.hidden = false;
  layer.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal-card photo-viewer-card">
        <img src="${dataUrl}" alt="Profile photo" />
        <div class="modal-actions">
          <button class="secondary-btn" type="button" id="photo-viewer-close">Close</button>
        </div>
      </div>
    </div>
  `;
  requestAnimationFrame(() => layer.querySelector('.modal-backdrop').classList.add('open'));
  byId('photo-viewer-close').addEventListener('click', closeModal);
  layer.querySelector('.modal-backdrop').addEventListener('click', (e) => { if (e.target.classList.contains('modal-backdrop')) closeModal(); });
}

function openCropper(dataUrl, kind) {
  const isAvatar = kind === 'avatar';
  const layer = ensureModalLayer();
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
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeCropper();
  }, { signal: cropperState.controller.signal });
  byId('cropper-cancel').addEventListener('click', closeCropper);
  byId('cropper-save').addEventListener('click', () => saveCroppedPhoto(kind));
  byId('cropper-rotate').addEventListener('click', () => rotateCropper());
  byId('cropper-remove').addEventListener('click', () => removePhoto(kind));
  layer.querySelector('.modal-backdrop').addEventListener('click', (event) => {
    if (event.target.classList.contains('modal-backdrop')) closeCropper();
  });
}

function closeCropper() {
  if (cropperState && cropperState.controller) cropperState.controller.abort();
  cropperState = null;
  closeModal();
}

function removePhoto(kind) {
  if (kind === 'avatar') currentData.profile.photo = null;
  else currentData.profile.cover = null;
  persist();
  closeCropper();
  renderHero();
  renderSidebar('account');
  showToast(kind === 'avatar' ? 'Profile photo removed' : 'Cover image removed', 'default');
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
  cropperState = { x: 0, y: 0, scale: 1, rotate: 0, dragging: false, startX: 0, startY: 0, isAvatar, controller: new AbortController() };
  const options = { signal: cropperState.controller.signal };

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

  viewport.addEventListener('pointerdown', (e) => start(e.clientX, e.clientY), options);
  window.addEventListener('pointermove', (e) => move(e.clientX, e.clientY), options);
  window.addEventListener('pointerup', end, options);

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
  closeCropper();
  renderHero();
  renderSidebar('account');
  showToast(kind === 'avatar' ? 'Profile photo updated.' : 'Cover image updated.', 'success');
}

// openModal() / closeModal() are provided by shared.js (used across pages).
