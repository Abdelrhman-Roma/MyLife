// MOMENTUM — Study page logic
// Reuses bootShell(), persist(), currentData, escapeHtml(), escapeAttr(), makeId(),
// selected(), labelize(), percent() from shared.js. Self-contained: does not
// modify any global stylesheet.
//
// Scope notes (documented rather than silently skipped):
//  - "Subject details page" is an in-page modal, not a separate route.
//  - Quick Notes support plain text + checklist lines, not rich-text formatting.
//  - Focus Mode is a full-viewport overlay, not the browser Fullscreen API
//    (more reliable across browsers/automation than requestFullscreen()).
//  - Export supports JSON + CSV (real downloads) and a print-friendly view for
//    PDF via the browser's print dialog. Excel/PDF binary generation and
//    CSV/Excel *import* aren't implemented — no parser library is loaded
//    anywhere in this vanilla-JS project, so JSON import is the supported path.
//  - The Study Calendar section is a compact month glance with a link to the
//    full Calendar page, which already owns drag-and-drop scheduling — this
//    avoids rebuilding that whole engine a second time.
//  - Focus Score / Productivity Score are transparent heuristics over real
//    data, not scores an external service provides.

const PRIORITIES   = ['Low', 'Medium', 'High'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const SESSION_STATUSES    = ['Planned', 'In Progress', 'Paused', 'Completed'];
const ASSIGNMENT_STATUSES = ['Not Started', 'In Progress', 'Completed'];
const STUDY_REMINDER_OPTIONS = [
  ['None', 'No reminder'], ['5', '5 minutes before'], ['15', '15 minutes before'],
  ['30', '30 minutes before'], ['60', '1 hour before'], ['1440', '1 day before'],
];
const POMODORO_PRESETS = { '25/5': { work: 25, break: 5 }, '50/10': { work: 50, break: 10 }, '90/20': { work: 90, break: 20 } };
const NOTE_COLORS = ['#f2d492', '#a7d8c9', '#b9c9f2', '#f2b9c9', '#d7c1f2', '#c9d7a0'];

let studyState = {
  search: '',
  filters: { subjectId: 'all', priority: 'all', difficulty: 'all', status: 'all' },
  filtersOpen: false,
  modal: null,          // { type, id }
  focusMode: false,
  notesShowArchived: false,
  _focusRestore: null,
};

let pomodoro = {
  running: false,
  phase: 'work',        // 'work' | 'break'
  remaining: 25 * 60,
};

// ─── Small date/format helpers ──────────────────────────────────────────────
function pad2(n) { return String(n).padStart(2, '0'); }
function toISO(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function parseISO(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); }
function todayISO() { return toISO(new Date()); }
function nowStamp() { return new Date().toISOString(); }
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function minutesToHours(min) { return Math.round((min / 60) * 10) / 10; }
function fmtClock(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h > 0 ? `${h}:${pad2(m)}:${pad2(sec)}` : `${pad2(m)}:${pad2(sec)}`;
}
function greetingForHour(h) {
  if (h < 5) return 'Still up studying?';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Burning the midnight oil';
}
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_SHORT   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// ─── Lookup helpers ─────────────────────────────────────────────────────────
function subjectById(id) { return (currentData.subjects || []).find((s) => s.id === id) || null; }
function subjectLabel(id) { const s = subjectById(id); return s ? `${s.icon || '📘'} ${s.name}` : 'General'; }
function subjectColor(id) { const s = subjectById(id); return s ? s.color : '#8b93a6'; }

// ─── Derived stats (all computed from real currentData, nothing fabricated) ─
function totalMinutesBetween(startIso, endIso) {
  return (currentData.study || [])
    .filter((s) => s.completed && s.date >= startIso && s.date <= endIso)
    .reduce((sum, s) => sum + Number(s.duration || 0), 0);
}

function computeStreaks() {
  const days = new Set((currentData.study || []).filter((s) => s.completed && s.date).map((s) => s.date));
  let current = 0;
  for (let i = 0; i < 400; i++) {
    const iso = toISO(addDays(new Date(), -i));
    if (days.has(iso)) { current++; continue; }
    if (i === 0) continue; // today not studied yet doesn't break the streak
    break;
  }
  let longest = 0;
  if (days.size) {
    const sorted = [...days].sort();
    let run = 1;
    longest = 1;
    for (let i = 1; i < sorted.length; i++) {
      const prev = parseISO(sorted[i - 1]);
      const cur = parseISO(sorted[i]);
      const diff = Math.round((cur - prev) / 86400000);
      run = diff === 1 ? run + 1 : 1;
      longest = Math.max(longest, run);
    }
  }
  return { current, longest };
}

function computeOverviewStats() {
  const today = todayISO();
  const weekStart = toISO(addDays(new Date(), -6));
  const monthStart = toISO(addDays(new Date(), -29));
  const sessions = currentData.study || [];
  const completed = sessions.filter((s) => s.completed);
  const todayMinutes = totalMinutesBetween(today, today);
  const weekMinutes = totalMinutesBetween(weekStart, today);
  const monthMinutes = totalMinutesBetween(monthStart, today);
  const remaining = sessions.filter((s) => !s.completed && s.date === today).length;
  const completionRate = sessions.length ? Math.round((completed.length / sessions.length) * 100) : 0;
  const { current, longest } = computeStreaks();
  const last30 = minutesToHours(monthMinutes) / 30;
  const onTarget = completed.filter((s) => (s.elapsedSeconds || 0) >= Number(s.duration || 0) * 60 * 0.8).length;
  const focusScore = completed.length ? Math.round((onTarget / completed.length) * 100) : 0;
  const productivityScore = Math.round(completionRate * 0.5 + Math.min(100, current * 8) * 0.3 + focusScore * 0.2);
  return {
    todayMinutes, weekMinutes, monthMinutes,
    completedCount: completed.length, remaining, completionRate,
    currentStreak: current, longestStreak: longest,
    avgDailyHours: Math.round(last30 * 10) / 10,
    focusScore, productivityScore,
  };
}

function computeAchievements(stats) {
  const completed = (currentData.study || []).filter((s) => s.completed);
  const totalHours = completed.reduce((sum, s) => sum + Number(s.duration || 0), 0) / 60;
  const hasEarly = completed.some((s) => s.startTime && s.startTime < '07:00');
  const hasLate = completed.some((s) => s.startTime && s.startTime >= '22:00');
  const perfectWeek = Array.from({ length: 7 }, (_, i) => toISO(addDays(new Date(), -i)))
    .every((iso) => completed.some((s) => s.date === iso));
  const doneAssignments = (currentData.assignments || []).filter((a) => a.status === 'Completed').length;
  const wellPreparedExams = (currentData.exams || []).filter((e) => Number(e.preparation || 0) >= 90).length;
  return [
    { id: 'streak7', label: '7 Day Streak', icon: '🔥', earned: stats.currentStreak >= 7 },
    { id: 'streak30', label: '30 Day Streak', icon: '🏆', earned: stats.currentStreak >= 30 },
    { id: 'hours100', label: '100 Hours', icon: '⏱', earned: totalHours >= 100 },
    { id: 'hours500', label: '500 Hours', icon: '🎖', earned: totalHours >= 500 },
    { id: 'earlybird', label: 'Early Bird', icon: '🌅', earned: hasEarly },
    { id: 'nightowl', label: 'Night Owl', icon: '🦉', earned: hasLate },
    { id: 'perfectweek', label: 'Perfect Week', icon: '✨', earned: perfectWeek },
    { id: 'assignmentmaster', label: 'Assignment Master', icon: '📚', earned: doneAssignments >= 10 },
    { id: 'examcrusher', label: 'Exam Crusher', icon: '🎯', earned: wellPreparedExams >= 5 },
  ];
}

// ─── Init / refresh ─────────────────────────────────────────────────────────
function initStudyPage() {
  try {
    resetPomodoroIfNewDay();
    persist();
  } catch (_e) { /* handled by the render guard */ }
  bindStudyGlobalListeners();
  startStudyTicker();
  refreshStudy();
}

function refreshStudy(opts = {}) {
  if (opts.persistData) persist();
  const stats = computeOverviewStats();
  renderStudyQuickStats(stats);
  safeRenderStudyRoot(stats);
}

function resetPomodoroIfNewDay() {
  const p = currentData.pomodoro;
  if (p.lastResetDate !== todayISO()) { p.sessionsToday = 0; p.lastResetDate = todayISO(); }
  pomodoro.remaining = (p.mode === 'Custom' ? p.workMin : POMODORO_PRESETS[p.mode]?.work || p.workMin) * 60;
}

// ─── Quick stats strip (#stats-grid) ────────────────────────────────────────
function renderStudyQuickStats(stats) {
  const el = byId('stats-grid');
  if (!el) return;
  el.innerHTML = [
    ["Today's study time", `${minutesToHours(stats.todayMinutes)}h`, Math.min(100, minutesToHours(stats.todayMinutes) * 20)],
    ['Completed sessions', stats.completedCount, Math.min(100, stats.completedCount * 5)],
    ['Completion rate', `${stats.completionRate}%`, stats.completionRate],
    ['Current streak', `${stats.currentStreak}d`, Math.min(100, stats.currentStreak * 10)],
  ].map(([label, value, width]) => `
    <article class="stat-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value))}</strong>
      <div class="meter"><i style="width:${width}%"></i></div>
    </article>
  `).join('');
}

// ─── Root render (error-guarded) ────────────────────────────────────────────
function safeRenderStudyRoot(stats) {
  try { renderStudyRoot(stats); } catch (err) { renderStudyErrorState(err); }
}

function renderStudyErrorState(err) {
  const root = byId('study-root');
  if (!root) return;
  console.error('Study page render error:', err);
  root.innerHTML = `
    <div class="panel std-error-state">
      <p class="eyebrow">Something went wrong</p>
      <h2>The study dashboard hit a snag</h2>
      <p class="muted">Your subjects, sessions and notes are safe in storage. Resetting the view usually clears this.</p>
      <button class="primary-btn" type="button" data-std-error-reset>Reset study view</button>
    </div>
  `;
  const btn = root.querySelector('[data-std-error-reset]');
  if (btn) btn.addEventListener('click', () => {
    studyState.search = '';
    studyState.filters = { subjectId: 'all', priority: 'all', difficulty: 'all', status: 'all' };
    studyState.filtersOpen = false;
    refreshStudy();
  });
}

function renderStudyRoot(stats) {
  const root = byId('study-root');
  if (!root) return;
  const s = stats || computeOverviewStats();
  root.innerHTML = `
    ${headerHtml()}
    ${overviewStatsHtml(s)}
    <div class="std-two-col">
      ${todayPlanHtml()}
      ${currentSessionHtml()}
    </div>
    ${pomodoroHtml()}
    ${subjectsHtml()}
    ${assignmentsHtml()}
    ${examsHtml()}
    ${projectsHtml()}
    <div class="std-two-col">
      ${studyCalendarHtml()}
      ${notesHtml()}
    </div>
    ${achievementsHtml(s)}
    ${analyticsHtml(s)}
    ${recentActivityHtml()}
  `;
  bindStudyRootEvents(root);
  if (studyState._focusRestore) {
    const el = root.querySelector(studyState._focusRestore);
    if (el) {
      el.focus();
      if (typeof el.value === 'string' && el.setSelectionRange) {
        const p = el.value.length;
        try { el.setSelectionRange(p, p); } catch (_e) { /* ignore */ }
      }
    }
    studyState._focusRestore = null;
  }
}

// ─── Header ─────────────────────────────────────────────────────────────────
function headerHtml() {
  const now = new Date();
  const dateLabel = `${DAY_SHORT[now.getDay()]}, ${MONTH_NAMES[now.getMonth()]} ${now.getDate()}`;
  return `
    <div class="panel std-header">
      <div class="std-header-left">
        <p class="eyebrow">${escapeHtml(dateLabel)}</p>
        <h2>${escapeHtml(greetingForHour(now.getHours()))}, ${escapeHtml(currentUser.name.split(' ')[0])}</h2>
      </div>
      <div class="std-header-right">
        <input type="search" id="std-search-input" placeholder="Search subjects, assignments, exams, notes…" value="${escapeAttr(studyState.search)}" aria-label="Search study data" />
        <div class="std-filter-wrap" data-std-filter-wrap>
          <button class="secondary-btn" type="button" data-std-filter-toggle aria-expanded="${studyState.filtersOpen}">Filter</button>
          <div class="std-filter-dropdown${studyState.filtersOpen ? ' open' : ''}">
            <label>Subject
              <select data-std-filter="subjectId">
                <option value="all">All subjects</option>
                ${(currentData.subjects || []).map((sub) => `<option value="${sub.id}" ${studyState.filters.subjectId === sub.id ? 'selected' : ''}>${escapeHtml(sub.name)}</option>`).join('')}
              </select>
            </label>
            <label>Priority
              <select data-std-filter="priority"><option value="all">Any priority</option>${PRIORITIES.map((p) => `<option ${selected(studyState.filters.priority, p)}>${p}</option>`).join('')}</select>
            </label>
            <label>Difficulty
              <select data-std-filter="difficulty"><option value="all">Any difficulty</option>${DIFFICULTIES.map((d) => `<option ${selected(studyState.filters.difficulty, d)}>${d}</option>`).join('')}</select>
            </label>
            <label>Status
              <select data-std-filter="status"><option value="all">Any status</option>${SESSION_STATUSES.map((st) => `<option ${selected(studyState.filters.status, st)}>${st}</option>`).join('')}</select>
            </label>
          </div>
        </div>
        <div class="std-quickadd-wrap" data-std-quickadd-wrap>
          <button class="primary-btn" type="button" data-std-quickadd-toggle>+ Quick Add</button>
          <div class="std-quickadd-dropdown">
            ${['session', 'subject', 'assignment', 'exam', 'project', 'note'].map((t) => `<button type="button" data-std-add="${t}">${ENTITY_META[t].icon} ${ENTITY_META[t].label}</button>`).join('')}
          </div>
        </div>
        <div class="std-export-wrap" data-std-export-wrap>
          <button class="secondary-btn" type="button" data-std-export-toggle>Export</button>
          <div class="std-export-dropdown">
            <button type="button" data-std-export="json">Download JSON</button>
            <button type="button" data-std-export="csv">Download CSV (sessions)</button>
            <button type="button" data-std-export="print">Print / Save as PDF</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ─── Overview stats ──────────────────────────────────────────────────────────
function overviewStatsHtml(s) {
  const cards = [
    ["Today's Study Time", `${minutesToHours(s.todayMinutes)}h`],
    ['Weekly Study Time', `${minutesToHours(s.weekMinutes)}h`],
    ['Monthly Study Time', `${minutesToHours(s.monthMinutes)}h`],
    ['Completed Sessions', s.completedCount],
    ['Remaining Today', s.remaining],
    ['Completion Rate', `${s.completionRate}%`],
    ['Current Streak', `${s.currentStreak} day${s.currentStreak === 1 ? '' : 's'}`],
    ['Longest Streak', `${s.longestStreak} day${s.longestStreak === 1 ? '' : 's'}`],
    ['Avg Daily Hours', `${s.avgDailyHours}h`],
    ['Focus Score', `${s.focusScore}%`],
    ['Productivity Score', `${s.productivityScore}%`],
  ];
  return `
    <section class="panel std-overview">
      <p class="eyebrow">Study Statistics</p><h2>Overview</h2>
      <div class="std-overview-grid">
        ${cards.map(([label, value]) => `<article class="std-overview-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong></article>`).join('')}
      </div>
    </section>
  `;
}

// ─── Filtering helpers shared by Today's Plan / Assignments ────────────────
function matchesFilters(item, { subjectKey = 'subjectId', priorityKey = 'priority', difficultyKey = 'difficulty', statusKey = 'status' } = {}) {
  const f = studyState.filters;
  if (f.subjectId !== 'all' && item[subjectKey] !== f.subjectId) return false;
  if (f.priority !== 'all' && item[priorityKey] !== f.priority) return false;
  if (f.difficulty !== 'all' && difficultyKey && item[difficultyKey] && item[difficultyKey] !== f.difficulty) return false;
  if (f.status !== 'all' && statusKey && item[statusKey] !== f.status) return false;
  return true;
}
function matchesSearch(haystackParts) {
  const q = studyState.search.trim().toLowerCase();
  if (!q) return true;
  return haystackParts.join(' ').toLowerCase().includes(q);
}

// ─── Today's Study Plan ─────────────────────────────────────────────────────
function todayPlanHtml() {
  const today = todayISO();
  const items = (currentData.study || [])
    .filter((s) => s.date === today)
    .filter((s) => matchesFilters(s))
    .filter((s) => matchesSearch([s.title, s.topic, s.notes]))
    .sort((a, b) => (a.startTime || '99:99').localeCompare(b.startTime || '99:99'));
  return `
    <section class="panel std-today-plan">
      <div class="std-panel-head">
        <div><p class="eyebrow">Today's Plan</p><h2>Study sessions today</h2></div>
        <button class="secondary-btn" type="button" data-std-add="session">+ Session</button>
      </div>
      <div class="std-session-list">
        ${items.length ? items.map(sessionCardHtml).join('') : '<div class="empty-state">Nothing planned for today yet. Add a study session to get started.</div>'}
      </div>
    </section>
  `;
}

function sessionCardHtml(sess) {
  const color = subjectColor(sess.subjectId);
  const progress = sess.status === 'Completed' ? 100 : Math.max(sess.progress || 0, sess.duration ? Math.min(100, Math.round((sess.elapsedSeconds / (sess.duration * 60)) * 100)) : 0);
  return `
    <article class="std-session-card${sess.status === 'Completed' ? ' is-completed' : ''}" data-std-session-id="${sess.id}" style="--std-cat-color:${color}">
      <div class="std-session-top">
        <div>
          <strong>${escapeHtml(sess.title)}</strong>
          ${sess.topic ? `<span class="std-topic">· ${escapeHtml(sess.topic)}</span>` : ''}
        </div>
        <span class="std-status std-status-${sess.status.toLowerCase().replace(/\s+/g, '-')}">${sess.status}</span>
      </div>
      <div class="std-session-meta">
        <span class="std-pill std-pill-${sess.priority.toLowerCase()}">${sess.priority}</span>
        <span class="std-chip">${sess.difficulty}</span>
        <span class="std-chip">${sess.duration} min${sess.startTime ? ` · ${sess.startTime}` : ''}</span>
      </div>
      <div class="meter"><i style="width:${progress}%;background:${color}"></i></div>
      <div class="std-session-actions">
        ${sess.status === 'Completed'
          ? '<span class="muted">✓ Completed</span>'
          : sess.status === 'In Progress'
            ? `<button class="secondary-btn" type="button" data-std-session-action="pause" data-std-id="${sess.id}">Pause</button>
               <button class="primary-btn" type="button" data-std-session-action="complete" data-std-id="${sess.id}">Complete</button>`
            : `<button class="primary-btn" type="button" data-std-session-action="start" data-std-id="${sess.id}">Start</button>
               <button class="secondary-btn" type="button" data-std-session-action="complete" data-std-id="${sess.id}">Complete</button>`}
        <button class="std-icon-btn" type="button" data-std-edit="session:${sess.id}" title="Edit" aria-label="Edit">✎</button>
        <button class="std-icon-btn std-icon-danger" type="button" data-std-delete="session:${sess.id}" title="Delete" aria-label="Delete">✕</button>
      </div>
    </article>
  `;
}

// ─── Current Session (big timer card) ───────────────────────────────────────
function activeSession() { return (currentData.study || []).find((s) => s.status === 'In Progress') || null; }

function currentSessionHtml() {
  const sess = activeSession();
  if (!sess) {
    return `
      <section class="panel std-current-session std-current-empty">
        <p class="eyebrow">Current Session</p>
        <h2>No session running</h2>
        <p class="muted">Start a session from Today's Plan to see a live timer here.</p>
      </section>
    `;
  }
  const totalSec = Number(sess.duration || 0) * 60;
  const remaining = Math.max(0, totalSec - (sess.elapsedSeconds || 0));
  const pct = totalSec ? Math.min(100, Math.round(((sess.elapsedSeconds || 0) / totalSec) * 100)) : 0;
  const r = 52, c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return `
    <section class="panel std-current-session" data-std-current-session="${sess.id}">
      <p class="eyebrow">Current Session</p>
      <h2>${escapeHtml(sess.title)}${sess.topic ? ` — ${escapeHtml(sess.topic)}` : ''}</h2>
      <div class="std-current-body">
        <div class="std-current-ring">
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle cx="60" cy="60" r="${r}" class="std-ring-track" />
            <circle cx="60" cy="60" r="${r}" class="std-ring-fill" style="stroke-dasharray:${c};stroke-dashoffset:${offset}" />
          </svg>
          <strong class="std-current-elapsed" data-std-elapsed>${fmtClock(sess.elapsedSeconds || 0)}</strong>
        </div>
        <div class="std-current-info">
          <p><span class="muted">Remaining</span> <strong data-std-remaining>${fmtClock(remaining)}</strong></p>
          <p><span class="muted">Goal</span> <strong>${sess.duration} min focused on ${escapeHtml(sess.topic || sess.title)}</strong></p>
          <div class="std-current-actions">
            <button class="secondary-btn" type="button" data-std-session-action="pause" data-std-id="${sess.id}">Pause</button>
            <button class="secondary-btn" type="button" data-std-session-action="stop" data-std-id="${sess.id}">Stop</button>
            <button class="primary-btn" type="button" data-std-session-action="complete" data-std-id="${sess.id}">Complete</button>
            <button class="secondary-btn" type="button" data-std-focus-mode>⛶ Focus Mode</button>
          </div>
        </div>
      </div>
    </section>
  `;
}

// ─── Pomodoro Timer ──────────────────────────────────────────────────────────
function pomodoroHtml() {
  const p = currentData.pomodoro;
  return `
    <section class="panel std-pomodoro">
      <div class="std-panel-head">
        <div><p class="eyebrow">Pomodoro Timer</p><h2>Focus intervals</h2></div>
        <div class="std-pomodoro-modes">
          ${Object.keys(POMODORO_PRESETS).map((m) => `<button class="std-mode-btn${p.mode === m ? ' active' : ''}" type="button" data-std-pomo-mode="${m}">${m}</button>`).join('')}
          <button class="std-mode-btn${p.mode === 'Custom' ? ' active' : ''}" type="button" data-std-pomo-mode="Custom">Custom</button>
        </div>
      </div>
      ${p.mode === 'Custom' ? `
        <div class="std-pomodoro-custom">
          <label>Work (min) <input type="number" min="1" max="180" id="std-pomo-work" value="${p.workMin}" /></label>
          <label>Break (min) <input type="number" min="1" max="60" id="std-pomo-break" value="${p.breakMin}" /></label>
        </div>` : ''}
      <div class="std-pomodoro-body">
        <div class="std-pomodoro-clock ${pomodoro.phase === 'break' ? 'is-break' : ''}">
          <strong data-std-pomo-time>${fmtClock(pomodoro.remaining)}</strong>
          <span data-std-pomo-phase>${pomodoro.phase === 'work' ? 'Focus' : 'Break'}</span>
        </div>
        <div class="std-pomodoro-actions">
          <button class="primary-btn" type="button" data-std-pomo-action="${pomodoro.running ? 'pause' : 'start'}">${pomodoro.running ? 'Pause' : 'Start'}</button>
          <button class="secondary-btn" type="button" data-std-pomo-action="reset">Reset</button>
          <button class="secondary-btn" type="button" data-std-pomo-action="skip">Skip</button>
        </div>
        <div class="std-pomodoro-meta">
          <p><span class="muted">Sessions today</span> <strong>${p.sessionsToday} / ${p.dailyGoal}</strong></p>
          <div class="meter"><i style="width:${Math.min(100, Math.round((p.sessionsToday / p.dailyGoal) * 100))}%"></i></div>
        </div>
      </div>
    </section>
  `;
}

// ─── Generic entity metadata (drives the shared add/edit modal) ────────────
const ENTITY_META = {
  session:    { icon: '📖', label: 'Study Session', collection: 'study' },
  subject:    { icon: '📘', label: 'Subject', collection: 'subjects' },
  assignment: { icon: '📝', label: 'Assignment', collection: 'assignments' },
  exam:       { icon: '🧾', label: 'Exam', collection: 'exams' },
  project:    { icon: '📁', label: 'Project', collection: 'projects' },
  note:       { icon: '🗒', label: 'Note', collection: 'studyNotes' },
};

const ENTITY_FIELDS = {
  session: [
    ['title', 'Subject name', 'text'],
    ['subjectId', 'Linked subject', 'subjects'],
    ['topic', 'Topic / chapter', 'text'],
    ['date', 'Date', 'date'],
    ['startTime', 'Start time', 'time'],
    ['duration', 'Duration (minutes)', 'number'],
    ['priority', 'Priority', 'select', PRIORITIES],
    ['difficulty', 'Difficulty', 'select', DIFFICULTIES],
    ['status', 'Status', 'select', SESSION_STATUSES],
    ['notes', 'Notes', 'textarea'],
  ],
  subject: [
    ['name', 'Name', 'text'],
    ['icon', 'Icon (emoji)', 'text'],
    ['color', 'Color', 'color'],
    ['teacher', 'Teacher', 'text'],
    ['semester', 'Semester', 'text'],
    ['creditHours', 'Credit hours', 'number'],
    ['difficulty', 'Difficulty', 'select', DIFFICULTIES],
    ['avgGrade', 'Average grade', 'text'],
    ['progress', 'Progress %', 'number'],
    ['notes', 'Notes', 'textarea'],
  ],
  assignment: [
    ['title', 'Title', 'text'],
    ['subjectId', 'Subject', 'subjects'],
    ['dueDate', 'Due date', 'date'],
    ['priority', 'Priority', 'select', PRIORITIES],
    ['estimatedTime', 'Estimated time (min)', 'number'],
    ['status', 'Status', 'select', ASSIGNMENT_STATUSES],
    ['progress', 'Progress %', 'number'],
    ['attachments', 'Attachments (links, comma separated)', 'text'],
    ['reminder', 'Reminder', 'reminder'],
    ['repeat', 'Repeat', 'select', ['None', 'Daily', 'Weekly', 'Monthly']],
    ['notes', 'Notes', 'textarea'],
  ],
  exam: [
    ['subjectId', 'Subject', 'subjects'],
    ['date', 'Date', 'date'],
    ['time', 'Time', 'time'],
    ['room', 'Room', 'text'],
    ['instructor', 'Instructor', 'text'],
    ['importance', 'Importance', 'select', PRIORITIES],
    ['preparation', 'Preparation %', 'number'],
    ['studyMaterials', 'Study materials', 'textarea'],
    ['notes', 'Notes', 'textarea'],
  ],
  project: [
    ['title', 'Title', 'text'],
    ['progress', 'Progress %', 'number'],
    ['deadline', 'Deadline', 'date'],
    ['priority', 'Priority', 'select', PRIORITIES],
    ['members', 'Members (comma separated)', 'text'],
    ['attachments', 'Attachments (links, comma separated)', 'text'],
    ['notes', 'Notes', 'textarea'],
  ],
  note: [
    ['text', 'Note', 'textarea'],
    ['color', 'Color', 'color'],
  ],
};

// ─── Subjects ───────────────────────────────────────────────────────────────
function subjectsHtml() {
  const items = (currentData.subjects || []).filter((s) => matchesSearch([s.name, s.teacher, s.notes]));
  const assignmentCounts = {};
  (currentData.assignments || []).forEach((a) => { assignmentCounts[a.subjectId] = (assignmentCounts[a.subjectId] || 0) + 1; });
  const upcomingExam = {};
  (currentData.exams || []).forEach((e) => { if (!upcomingExam[e.subjectId] || e.date < upcomingExam[e.subjectId]) upcomingExam[e.subjectId] = e.date; });
  return `
    <section class="panel std-subjects">
      <div class="std-panel-head">
        <div><p class="eyebrow">Subjects</p><h2>Subject management</h2></div>
        <button class="secondary-btn" type="button" data-std-add="subject">+ Subject</button>
      </div>
      <div class="std-subject-grid">
        ${items.length ? items.map((s) => `
          <article class="std-subject-card" style="--std-cat-color:${s.color}" data-std-edit="subject:${s.id}" role="button" tabindex="0">
            <div class="std-subject-top"><span class="std-subject-icon">${escapeHtml(s.icon || '📘')}</span><strong>${escapeHtml(s.name)}</strong></div>
            <p class="muted">${escapeHtml(s.teacher || 'No teacher set')}${s.semester ? ` · ${escapeHtml(s.semester)}` : ''}</p>
            <div class="meter"><i style="width:${s.progress || 0}%;background:${s.color}"></i></div>
            <div class="std-subject-meta">
              <span class="std-chip">${escapeHtml(s.difficulty)}</span>
              ${s.avgGrade ? `<span class="std-chip">Grade: ${escapeHtml(s.avgGrade)}</span>` : ''}
              <span class="std-chip">${assignmentCounts[s.id] || 0} assignments</span>
              ${upcomingExam[s.id] ? `<span class="std-chip">Exam ${escapeHtml(upcomingExam[s.id])}</span>` : ''}
            </div>
          </article>
        `).join('') : '<div class="empty-state">No subjects yet. Add your first subject to start organizing sessions.</div>'}
      </div>
    </section>
  `;
}

// ─── Assignments ────────────────────────────────────────────────────────────
function assignmentsHtml() {
  const items = (currentData.assignments || [])
    .filter((a) => matchesFilters(a, { difficultyKey: null }))
    .filter((a) => matchesSearch([a.title, a.notes]))
    .sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));
  return `
    <section class="panel std-assignments">
      <div class="std-panel-head">
        <div><p class="eyebrow">Assignments</p><h2>Assignments</h2></div>
        <button class="secondary-btn" type="button" data-std-add="assignment">+ Assignment</button>
      </div>
      <div class="std-assignment-list">
        ${items.length ? items.map(assignmentRowHtml).join('') : '<div class="empty-state">No assignments tracked yet.</div>'}
      </div>
    </section>
  `;
}

function assignmentRowHtml(a) {
  const overdue = a.status !== 'Completed' && a.dueDate && a.dueDate < todayISO();
  return `
    <article class="std-assignment-row${a.status === 'Completed' ? ' is-completed' : ''}${overdue ? ' is-overdue' : ''}">
      <label class="std-check">
        <input type="checkbox" ${a.status === 'Completed' ? 'checked' : ''} data-std-assignment-toggle="${a.id}" aria-label="Mark ${escapeAttr(a.title)} complete" />
      </label>
      <div class="std-assignment-main">
        <div class="std-session-top">
          <strong>${escapeHtml(a.title)}</strong>
          <span class="std-chip">${subjectLabel(a.subjectId)}</span>
        </div>
        <div class="std-session-meta">
          <span class="std-pill std-pill-${a.priority.toLowerCase()}">${a.priority}</span>
          <span class="std-chip">${a.dueDate ? `Due ${escapeHtml(a.dueDate)}` : 'No due date'}</span>
          <span class="std-status std-status-${a.status.toLowerCase().replace(/\s+/g, '-')}">${a.status}</span>
        </div>
        <div class="meter"><i style="width:${a.progress || 0}%"></i></div>
      </div>
      <div class="std-actions">
        <button class="std-icon-btn" type="button" data-std-edit="assignment:${a.id}" title="Edit" aria-label="Edit">✎</button>
        <button class="std-icon-btn std-icon-danger" type="button" data-std-delete="assignment:${a.id}" title="Delete" aria-label="Delete">✕</button>
      </div>
    </article>
  `;
}

// ─── Exams ──────────────────────────────────────────────────────────────────
function examsHtml() {
  const items = (currentData.exams || [])
    .filter((e) => matchesSearch([e.room, e.instructor, e.notes]))
    .sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
  return `
    <section class="panel std-exams">
      <div class="std-panel-head">
        <div><p class="eyebrow">Exams</p><h2>Upcoming exams</h2></div>
        <button class="secondary-btn" type="button" data-std-add="exam">+ Exam</button>
      </div>
      <div class="std-exam-grid">
        ${items.length ? items.map(examCardHtml).join('') : '<div class="empty-state">No exams scheduled.</div>'}
      </div>
    </section>
  `;
}

function examCardHtml(e) {
  const days = e.date ? Math.ceil((parseISO(e.date) - new Date(new Date().toDateString())) / 86400000) : null;
  const countdown = days === null ? 'No date set' : days > 0 ? `${days} day${days === 1 ? '' : 's'} left` : days === 0 ? 'Today' : 'Passed';
  return `
    <article class="std-exam-card">
      <div class="std-session-top"><strong>${escapeHtml(subjectLabel(e.subjectId))}</strong><span class="std-pill std-pill-${e.importance.toLowerCase()}">${e.importance}</span></div>
      <p class="std-exam-countdown">${escapeHtml(countdown)}</p>
      <p class="muted">${escapeHtml(e.date || '')} ${escapeHtml(e.time || '')}${e.room ? ` · Room ${escapeHtml(e.room)}` : ''}</p>
      ${e.instructor ? `<p class="muted">${escapeHtml(e.instructor)}</p>` : ''}
      <div class="std-session-meta"><span class="std-chip">Preparation ${e.preparation || 0}%</span></div>
      <div class="meter"><i style="width:${e.preparation || 0}%"></i></div>
      <div class="std-session-actions">
        <button class="std-icon-btn" type="button" data-std-edit="exam:${e.id}" title="Edit" aria-label="Edit">✎</button>
        <button class="std-icon-btn std-icon-danger" type="button" data-std-delete="exam:${e.id}" title="Delete" aria-label="Delete">✕</button>
      </div>
    </article>
  `;
}

// ─── Projects ───────────────────────────────────────────────────────────────
function projectsHtml() {
  const items = (currentData.projects || []).filter((p) => matchesSearch([p.title, p.notes, p.members]));
  return `
    <section class="panel std-projects">
      <div class="std-panel-head">
        <div><p class="eyebrow">Projects</p><h2>Study projects</h2></div>
        <button class="secondary-btn" type="button" data-std-add="project">+ Project</button>
      </div>
      <div class="std-project-grid">
        ${items.length ? items.map(projectCardHtml).join('') : '<div class="empty-state">No projects yet.</div>'}
      </div>
    </section>
  `;
}

function projectCardHtml(p) {
  const tasks = p.tasks || [];
  const doneCount = tasks.filter((t) => t.done).length;
  return `
    <article class="std-project-card">
      <div class="std-session-top"><strong>${escapeHtml(p.title)}</strong><span class="std-pill std-pill-${p.priority.toLowerCase()}">${p.priority}</span></div>
      <p class="muted">${p.deadline ? `Due ${escapeHtml(p.deadline)}` : 'No deadline'}${p.members ? ` · ${escapeHtml(p.members)}` : ''}</p>
      <div class="meter"><i style="width:${p.progress || 0}%"></i></div>
      <div class="std-project-tasks">
        ${tasks.map((t) => `
          <label class="std-project-task">
            <input type="checkbox" ${t.done ? 'checked' : ''} data-std-project-task="${p.id}:${t.id}" />
            <span>${escapeHtml(t.title)}</span>
          </label>
        `).join('')}
        <span class="muted">${doneCount}/${tasks.length} tasks</span>
        <form class="std-project-task-add" data-std-project-task-add="${p.id}">
          <input type="text" name="title" placeholder="Add task…" aria-label="Add task" />
          <button type="submit" class="std-icon-btn" aria-label="Add task">+</button>
        </form>
      </div>
      <div class="std-session-actions">
        <button class="std-icon-btn" type="button" data-std-edit="project:${p.id}" title="Edit" aria-label="Edit">✎</button>
        <button class="std-icon-btn std-icon-danger" type="button" data-std-delete="project:${p.id}" title="Delete" aria-label="Delete">✕</button>
      </div>
    </article>
  `;
}

// ─── Study Calendar (compact glance; full engine lives on the Calendar page) ─
function studyCalendarHtml() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const gridStart = addDays(first, -first.getDay());
  const marked = new Set([
    ...(currentData.study || []).map((s) => s.date),
    ...(currentData.assignments || []).map((a) => a.dueDate),
    ...(currentData.exams || []).map((e) => e.date),
    ...(currentData.projects || []).map((p) => p.deadline),
  ].filter(Boolean));
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = addDays(gridStart, i);
    const iso = toISO(d);
    return { iso, num: d.getDate(), inMonth: d.getMonth() === now.getMonth(), isToday: iso === todayISO(), marked: marked.has(iso) };
  });
  return `
    <section class="panel std-mini-calendar">
      <div class="std-panel-head">
        <div><p class="eyebrow">Study Calendar</p><h2>${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}</h2></div>
        <a class="secondary-btn" href="calendar.html">Open full Calendar →</a>
      </div>
      <div class="std-mini-weekday-row">${DAY_SHORT.map((d) => `<span>${d}</span>`).join('')}</div>
      <div class="std-mini-days-grid">
        ${cells.map((c) => `<span class="std-mini-day${c.inMonth ? '' : ' is-muted'}${c.isToday ? ' is-today' : ''}${c.marked ? ' is-marked' : ''}">${c.num}</span>`).join('')}
      </div>
    </section>
  `;
}

// ─── Quick Notes ─────────────────────────────────────────────────────────────
function notesHtml() {
  const items = (currentData.studyNotes || [])
    .filter((n) => !!n.archived === studyState.notesShowArchived)
    .filter((n) => matchesSearch([n.text]))
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.updatedAt.localeCompare(a.updatedAt));
  return `
    <section class="panel std-notes">
      <div class="std-panel-head">
        <div><p class="eyebrow">Quick Notes</p><h2>Sticky notes</h2></div>
        <div class="std-notes-actions">
          <button class="secondary-btn" type="button" data-std-notes-toggle-archive>${studyState.notesShowArchived ? 'Show active' : 'Show archived'}</button>
          <button class="secondary-btn" type="button" data-std-add="note">+ Note</button>
        </div>
      </div>
      <div class="std-notes-grid">
        ${items.length ? items.map(noteCardHtml).join('') : `<div class="empty-state">${studyState.notesShowArchived ? 'No archived notes.' : 'No notes yet. Jot one down.'}</div>`}
      </div>
    </section>
  `;
}

function noteCardHtml(n) {
  return `
    <article class="std-note-card" style="background:${n.color}">
      <div class="std-note-top">
        <button class="std-icon-btn" type="button" data-std-note-pin="${n.id}" title="Pin" aria-label="Pin note">${n.pinned ? '📌' : '📍'}</button>
        <button class="std-icon-btn" type="button" data-std-note-archive="${n.id}" title="Archive" aria-label="Archive note">${n.archived ? '↩' : '🗄'}</button>
        <button class="std-icon-btn std-icon-danger" type="button" data-std-delete="note:${n.id}" title="Delete" aria-label="Delete note">✕</button>
      </div>
      <p class="std-note-text" data-std-edit="note:${n.id}" role="button" tabindex="0">${escapeHtml(n.text) || '<span class="muted">Empty note — click to edit</span>'}</p>
    </article>
  `;
}

// ─── Achievements ────────────────────────────────────────────────────────────
function achievementsHtml(s) {
  const badges = computeAchievements(s);
  return `
    <section class="panel std-achievements">
      <p class="eyebrow">Achievements</p><h2>Milestones</h2>
      <div class="std-achievements-grid">
        ${badges.map((b) => `
          <article class="std-badge${b.earned ? ' is-earned' : ''}">
            <span class="std-badge-icon">${b.icon}</span>
            <span>${escapeHtml(b.label)}</span>
          </article>
        `).join('')}
      </div>
    </section>
  `;
}

// ─── Analytics ───────────────────────────────────────────────────────────────
function analyticsHtml(s) {
  const daily = Array.from({ length: 14 }, (_, i) => {
    const iso = toISO(addDays(new Date(), i - 13));
    return { label: `${parseISO(iso).getDate()}`, minutes: totalMinutesBetween(iso, iso) };
  });
  const maxDaily = Math.max(1, ...daily.map((d) => d.minutes));

  const bySubject = {};
  (currentData.study || []).filter((x) => x.completed).forEach((x) => { bySubject[x.subjectId || 'none'] = (bySubject[x.subjectId || 'none'] || 0) + Number(x.duration || 0); });
  const subjectTotal = Object.values(bySubject).reduce((a, b) => a + b, 0) || 1;
  const subjectRows = Object.entries(bySubject).sort((a, b) => b[1] - a[1]).slice(0, 8);

  const weeks = Array.from({ length: 10 }, (_, w) => Array.from({ length: 7 }, (_, d) => {
    const offset = (9 - w) * 7 + (6 - d);
    const iso = toISO(addDays(new Date(), -offset));
    return { iso, minutes: totalMinutesBetween(iso, iso) };
  }));

  return `
    <section class="panel std-analytics">
      <p class="eyebrow">Study Analytics</p><h2>Trends &amp; distribution</h2>
      <div class="std-analytics-grid">
        <div class="std-chart-card">
          <h3>Daily hours (last 14 days)</h3>
          <div class="std-bars std-daily-bars">
            ${daily.map((d) => `<div class="std-bar-wrap"><div class="std-bar" style="height:${Math.max(4, Math.round((d.minutes / maxDaily) * 90))}px"></div><small>${d.label}</small></div>`).join('')}
          </div>
        </div>
        <div class="std-chart-card">
          <h3>Subject distribution</h3>
          ${subjectRows.length ? subjectRows.map(([id, min]) => `
            <div class="std-distribution-row">
              <span>${escapeHtml(subjectLabel(id === 'none' ? null : id))}</span>
              <div class="std-distribution-bar"><i style="width:${Math.round((min / subjectTotal) * 100)}%;background:${id === 'none' ? '#8b93a6' : subjectColor(id)}"></i></div>
              <small>${minutesToHours(min)}h</small>
            </div>
          `).join('') : '<p class="muted">No completed sessions yet.</p>'}
        </div>
        <div class="std-chart-card">
          <h3>Focus &amp; Productivity</h3>
          <div class="std-score-rings">
            ${scoreRingHtml('Focus', s.focusScore)}
            ${scoreRingHtml('Productivity', s.productivityScore)}
          </div>
        </div>
        <div class="std-chart-card">
          <h3>Consistency heat map (10 weeks)</h3>
          <div class="std-heatmap">
            ${weeks.map((week) => `<div class="std-heatmap-col">${week.map((d) => `<span class="std-heatmap-cell" style="opacity:${d.minutes ? Math.min(1, 0.25 + d.minutes / 120) : 0.08}" title="${d.iso}: ${minutesToHours(d.minutes)}h"></span>`).join('')}</div>`).join('')}
          </div>
        </div>
      </div>
    </section>
  `;
}

function scoreRingHtml(label, pct) {
  const r = 30, c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(100, pct)) / 100) * c;
  return `
    <div class="std-score-ring">
      <div class="std-ring" style="width:70px;height:70px">
        <svg viewBox="0 0 80 80" aria-hidden="true">
          <circle cx="40" cy="40" r="${r}" class="std-ring-track" />
          <circle cx="40" cy="40" r="${r}" class="std-ring-fill" style="stroke-dasharray:${c};stroke-dashoffset:${offset}" />
        </svg>
        <strong class="std-ring-label" style="font-size:0.85rem">${pct}%</strong>
      </div>
      <span>${label}</span>
    </div>
  `;
}

// ─── Recent Activity ─────────────────────────────────────────────────────────
function recentActivityHtml() {
  const items = [
    ...(currentData.study || []).filter((s) => s.completed).map((s) => ({ ts: s.completedAt || s.updatedAt || '', text: `Completed "${s.title}"${s.topic ? ` — ${s.topic}` : ''}`, icon: '📖' })),
    ...(currentData.assignments || []).filter((a) => a.status === 'Completed').map((a) => ({ ts: a.updatedAt || '', text: `Finished assignment "${a.title}"`, icon: '📝' })),
    ...(currentData.studyNotes || []).map((n) => ({ ts: n.updatedAt || '', text: `Updated a note`, icon: '🗒' })),
  ].filter((i) => i.ts).sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, 8);
  return `
    <section class="panel std-recent">
      <p class="eyebrow">Recent Activity</p><h2>What's happened lately</h2>
      ${items.length ? `<ul class="std-recent-list">${items.map((i) => `<li><span>${i.icon}</span> ${escapeHtml(i.text)}</li>`).join('')}</ul>` : '<div class="empty-state">Nothing logged yet.</div>'}
    </section>
  `;
}

// ─── Session lifecycle actions ──────────────────────────────────────────────
function startSession(id) {
  const running = activeSession();
  if (running && running.id !== id) { running.status = 'Paused'; running.updatedAt = nowStamp(); }
  const sess = (currentData.study || []).find((s) => s.id === id);
  if (!sess) return;
  sess.status = 'In Progress';
  sess.updatedAt = nowStamp();
  refreshStudy({ persistData: true });
}
function pauseSession(id) {
  const sess = (currentData.study || []).find((s) => s.id === id);
  if (!sess) return;
  sess.status = 'Paused';
  sess.updatedAt = nowStamp();
  refreshStudy({ persistData: true });
}
function stopSession(id) {
  const sess = (currentData.study || []).find((s) => s.id === id);
  if (!sess) return;
  sess.status = 'Planned';
  sess.elapsedSeconds = 0;
  sess.updatedAt = nowStamp();
  refreshStudy({ persistData: true });
}
function completeSession(id) {
  const sess = (currentData.study || []).find((s) => s.id === id);
  if (!sess) return;
  sess.status = 'Completed';
  sess.completed = true;
  sess.progress = 100;
  sess.completedAt = nowStamp();
  sess.updatedAt = nowStamp();
  if (studyState.focusMode) closeFocusMode();
  refreshStudy({ persistData: true });
}

function handleSessionAction(action, id) {
  if (action === 'start') startSession(id);
  else if (action === 'pause') pauseSession(id);
  else if (action === 'stop') stopSession(id);
  else if (action === 'complete') completeSession(id);
}

// ─── Ticking timers (session elapsed + Pomodoro) ────────────────────────────
function startStudyTicker() {
  if (window.__studyTickerBound) return;
  window.__studyTickerBound = true;
  let softRefreshCounter = 0;
  setInterval(() => {
    let needsPersist = false;
    const sess = activeSession();
    if (sess) {
      sess.elapsedSeconds = (sess.elapsedSeconds || 0) + 1;
      const elapsedEl = document.querySelector('[data-std-elapsed]');
      const remainingEl = document.querySelector('[data-std-remaining]');
      if (elapsedEl) elapsedEl.textContent = fmtClock(sess.elapsedSeconds);
      if (remainingEl) remainingEl.textContent = fmtClock(Math.max(0, sess.duration * 60 - sess.elapsedSeconds));
      if (studyState.focusMode) updateFocusModeDom(sess);
      if (sess.elapsedSeconds % 10 === 0) needsPersist = true;
    }
    if (pomodoro.running) {
      pomodoro.remaining -= 1;
      if (pomodoro.remaining <= 0) {
        handlePomodoroPhaseEnd();
      } else {
        const timeEl = document.querySelector('[data-std-pomo-time]');
        if (timeEl) timeEl.textContent = fmtClock(pomodoro.remaining);
      }
    }
    softRefreshCounter++;
    if (needsPersist) persist();
    if (softRefreshCounter >= 15) { softRefreshCounter = 0; refreshStudy(); }
  }, 1000);
}

function handlePomodoroPhaseEnd() {
  const p = currentData.pomodoro;
  playBeep();
  if (pomodoro.phase === 'work') {
    p.sessionsToday += 1;
    pomodoro.phase = 'break';
    pomodoro.remaining = p.breakMin * 60;
    showToast('Work interval complete — take a break!');
  } else {
    pomodoro.phase = 'work';
    pomodoro.remaining = (p.mode === 'Custom' ? p.workMin : POMODORO_PRESETS[p.mode]?.work || p.workMin) * 60;
    showToast('Break over — back to focus.');
  }
  persist();
  refreshStudy();
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    osc.connect(gain); gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
    setTimeout(() => ctx.close(), 500);
  } catch (_e) { /* audio not available — toast still shows */ }
}

// ─── Focus Mode (full-viewport overlay) ─────────────────────────────────────
const FOCUS_QUOTES = [
  'Small steps, every day.',
  'Deep work beats busy work.',
  'Progress, not perfection.',
  'One topic at a time.',
  'Future you is grateful right now.',
];

function openFocusMode() {
  const sess = activeSession();
  if (!sess) { showToast('Start a session first to use Focus Mode.'); return; }
  studyState.focusMode = true;
  renderFocusModeOverlay(sess);
}
function closeFocusMode() {
  studyState.focusMode = false;
  const el = document.querySelector('[data-std-focus-overlay]');
  if (el) el.remove();
}
function renderFocusModeOverlay(sess) {
  const quote = FOCUS_QUOTES[Math.floor(Math.random() * FOCUS_QUOTES.length)];
  document.body.insertAdjacentHTML('beforeend', `
    <div class="std-focus-overlay" data-std-focus-overlay role="dialog" aria-modal="true" aria-label="Focus mode">
      <button class="std-icon-btn std-focus-exit" type="button" data-std-focus-exit aria-label="Exit focus mode">✕ Exit</button>
      <p class="std-focus-subject">${escapeHtml(sess.title)}${sess.topic ? ` — ${escapeHtml(sess.topic)}` : ''}</p>
      <strong class="std-focus-timer" data-std-focus-elapsed>${fmtClock(sess.elapsedSeconds || 0)}</strong>
      <div class="meter std-focus-meter"><i data-std-focus-meter style="width:${sess.duration ? Math.min(100, Math.round(((sess.elapsedSeconds || 0) / (sess.duration * 60)) * 100)) : 0}%"></i></div>
      <p class="std-focus-quote">${escapeHtml(quote)}</p>
      <div class="std-focus-actions">
        <button class="secondary-btn" type="button" data-std-session-action="pause" data-std-id="${sess.id}">Pause</button>
        <button class="primary-btn" type="button" data-std-session-action="complete" data-std-id="${sess.id}">Complete</button>
      </div>
    </div>
  `);
  const overlay = document.querySelector('[data-std-focus-overlay]');
  overlay.querySelector('[data-std-focus-exit]').addEventListener('click', closeFocusMode);
  overlay.querySelectorAll('[data-std-session-action]').forEach((btn) => btn.addEventListener('click', () => handleSessionAction(btn.dataset.stdSessionAction, btn.dataset.stdId)));
}
function updateFocusModeDom(sess) {
  const el = document.querySelector('[data-std-focus-elapsed]');
  if (el) el.textContent = fmtClock(sess.elapsedSeconds || 0);
  const meter = document.querySelector('[data-std-focus-meter]');
  if (meter && sess.duration) meter.style.width = `${Math.min(100, Math.round(((sess.elapsedSeconds || 0) / (sess.duration * 60)) * 100))}%`;
}

// ─── Notifications ───────────────────────────────────────────────────────────
function showToast(msg) {
  const existing = document.querySelector('.std-toast');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.className = 'std-toast';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.textContent = msg;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 5000);
}

// ─── Generic entity modal (drives Subject/Assignment/Exam/Project/Note/Session) ─
function fieldValue(item, name, type) {
  const v = item ? item[name] : undefined;
  if (v !== undefined && v !== null) return v;
  if (type === 'number') return 0;
  if (name === 'date' || name === 'dueDate' || name === 'deadline') return '';
  return '';
}

function renderFieldHtml(item, [name, label, type, options]) {
  const value = fieldValue(item, name, type);
  if (type === 'select') {
    return `<label>${label}<select name="${name}">${options.map((o) => `<option ${selected(value, o)}>${o}</option>`).join('')}</select></label>`;
  }
  if (type === 'subjects') {
    return `<label>${label}<select name="${name}"><option value="">General (no subject)</option>${(currentData.subjects || []).map((s) => `<option value="${s.id}" ${value === s.id ? 'selected' : ''}>${escapeHtml(s.name)}</option>`).join('')}</select></label>`;
  }
  if (type === 'reminder') {
    return `<label>${label}<select name="${name}">${STUDY_REMINDER_OPTIONS.map(([v, l]) => `<option value="${v}" ${value === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>`;
  }
  if (type === 'textarea') {
    return `<label class="full-field">${label}<textarea name="${name}">${escapeHtml(String(value || ''))}</textarea></label>`;
  }
  if (type === 'color') {
    return `<label>${label}<input type="color" name="${name}" value="${escapeAttr(String(value || '#3b6ea5'))}" /></label>`;
  }
  return `<label>${label}<input type="${type}" name="${name}" value="${escapeAttr(String(value))}" /></label>`;
}

function removeStudyModalDom() {
  const el = document.querySelector('[data-std-modal]');
  if (el) el.remove();
}

function closeStudyModal() {
  removeStudyModalDom();
  studyState.modal = null;
}

function openStudyModal(type, id) {
  studyState.modal = { type, id: id || null };
  renderStudyModal();
}

function renderStudyModal() {
  removeStudyModalDom();
  const { type, id } = studyState.modal || {};
  if (!type) return;
  const meta = ENTITY_META[type];
  const collection = currentData[meta.collection] || [];
  const editing = id ? collection.find((x) => x.id === id) : null;
  const fields = ENTITY_FIELDS[type];
  document.body.insertAdjacentHTML('beforeend', `
    <div class="std-modal-overlay" data-std-modal role="dialog" aria-modal="true" aria-label="${editing ? 'Edit' : 'Add'} ${meta.label}">
      <div class="std-modal-backdrop" data-std-modal-close></div>
      <div class="panel std-modal-card">
        <div class="std-modal-head">
          <div><p class="eyebrow">${editing ? 'Edit' : 'New'}</p><h2>${meta.icon} ${meta.label}</h2></div>
          <button class="std-icon-btn" type="button" data-std-modal-close aria-label="Close">✕</button>
        </div>
        <form class="std-modal-form form-stack" data-std-entity-form novalidate>
          <div class="form-grid">${fields.map((f) => renderFieldHtml(editing, f)).join('')}</div>
          <div class="std-modal-actions">
            ${editing ? '<button type="button" class="danger-btn" data-std-modal-delete>Delete</button>' : '<span></span>'}
            <div class="std-modal-actions-right">
              <button type="button" class="secondary-btn" data-std-modal-close>Cancel</button>
              <button type="submit" class="primary-btn">Save</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  `);
  const overlay = document.querySelector('[data-std-modal]');
  overlay.querySelectorAll('[data-std-modal-close]').forEach((b) => b.addEventListener('click', closeStudyModal));
  overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); closeStudyModal(); } });
  const delBtn = overlay.querySelector('[data-std-modal-delete]');
  if (delBtn) delBtn.addEventListener('click', () => { deleteEntityById(type, id); closeStudyModal(); });
  overlay.querySelector('[data-std-entity-form]').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {};
    fields.forEach(([name, , ftype]) => {
      const raw = fd.get(name);
      data[name] = ftype === 'number' ? Number(raw || 0) : String(raw || '');
    });
    saveEntity(type, editing, data);
    closeStudyModal();
    refreshStudy({ persistData: true });
  });
  const firstInput = overlay.querySelector('input, textarea, select');
  if (firstInput) firstInput.focus();
}

function saveEntity(type, editing, data) {
  const meta = ENTITY_META[type];
  const now = nowStamp();
  if (editing) {
    Object.assign(editing, data, { updatedAt: now });
    if (type === 'assignment') editing.completed = editing.status === 'Completed';
    if (type === 'session') editing.completed = editing.status === 'Completed';
    return;
  }
  const base = { id: makeId(), createdAt: now, updatedAt: now, ...data };
  if (type === 'session') { base.elapsedSeconds = 0; base.completed = data.status === 'Completed'; if (!base.date) base.date = todayISO(); }
  if (type === 'assignment') base.completed = data.status === 'Completed';
  if (type === 'project') base.tasks = [];
  if (type === 'note') { base.pinned = false; base.archived = false; if (!base.color) base.color = NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)]; }
  currentData[meta.collection].push(base);
}

function deleteEntityById(type, id) {
  const meta = ENTITY_META[type];
  currentData[meta.collection] = (currentData[meta.collection] || []).filter((x) => x.id !== id);
  refreshStudy({ persistData: true });
}

// ─── Export / Import ─────────────────────────────────────────────────────────
function downloadBlob(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
function exportStudyJson() {
  const payload = {
    study: currentData.study, subjects: currentData.subjects, assignments: currentData.assignments,
    exams: currentData.exams, projects: currentData.projects, studyNotes: currentData.studyNotes,
  };
  downloadBlob(JSON.stringify(payload, null, 2), 'mylife-study.json', 'application/json');
}
function exportStudyCsv() {
  const rows = [['Subject', 'Topic', 'Date', 'Start Time', 'Duration (min)', 'Priority', 'Difficulty', 'Status']];
  (currentData.study || []).forEach((s) => rows.push([s.title, s.topic, s.date, s.startTime, s.duration, s.priority, s.difficulty, s.status]));
  const csv = rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  downloadBlob(csv, 'mylife-study-sessions.csv', 'text/csv');
}
function printStudyView() { window.print(); }

// ─── Global listeners (bound once) ──────────────────────────────────────────
function bindStudyGlobalListeners() {
  if (window.__studyGlobalBound) return;
  window.__studyGlobalBound = true;
  document.addEventListener('keydown', (e) => {
    if (document.querySelector('[data-std-modal]')) return;
    if (e.key === 'Escape') {
      if (studyState.focusMode) { closeFocusMode(); return; }
      if (studyState.filtersOpen) { studyState.filtersOpen = false; refreshStudy(); }
    }
  });
  document.addEventListener('click', (e) => {
    if (studyState.filtersOpen && !e.target.closest('[data-std-filter-wrap]')) { studyState.filtersOpen = false; refreshStudy(); }
    document.querySelectorAll('.std-quickadd-wrap.open, .std-export-wrap.open').forEach((wrap) => {
      if (!wrap.contains(e.target)) wrap.classList.remove('open');
    });
  });
}

function bindStudyRootEvents(root) {
  const q = (sel) => root.querySelector(sel);
  const qa = (sel) => root.querySelectorAll(sel);

  const searchInput = q('#std-search-input');
  if (searchInput) {
    let t;
    searchInput.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(() => { studyState.search = searchInput.value; studyState._focusRestore = '#std-search-input'; refreshStudy(); }, 250);
    });
  }

  const filterToggle = q('[data-std-filter-toggle]');
  if (filterToggle) filterToggle.addEventListener('click', (e) => { e.stopPropagation(); studyState.filtersOpen = !studyState.filtersOpen; refreshStudy(); });
  qa('[data-std-filter]').forEach((sel) => sel.addEventListener('change', () => { studyState.filters[sel.dataset.stdFilter] = sel.value; refreshStudy(); }));

  const quickToggle = q('[data-std-quickadd-toggle]');
  if (quickToggle) quickToggle.addEventListener('click', (e) => { e.stopPropagation(); q('[data-std-quickadd-wrap]').classList.toggle('open'); });
  qa('[data-std-add]').forEach((btn) => btn.addEventListener('click', () => { openStudyModal(btn.dataset.stdAdd); }));

  const exportToggle = q('[data-std-export-toggle]');
  if (exportToggle) exportToggle.addEventListener('click', (e) => { e.stopPropagation(); q('[data-std-export-wrap]').classList.toggle('open'); });
  qa('[data-std-export]').forEach((btn) => btn.addEventListener('click', () => {
    const kind = btn.dataset.stdExport;
    if (kind === 'json') exportStudyJson();
    else if (kind === 'csv') exportStudyCsv();
    else printStudyView();
  }));

  qa('[data-std-session-action]').forEach((btn) => btn.addEventListener('click', () => handleSessionAction(btn.dataset.stdSessionAction, btn.dataset.stdId)));
  qa('[data-std-focus-mode]').forEach((btn) => btn.addEventListener('click', openFocusMode));

  qa('[data-std-edit]').forEach((el) => el.addEventListener('click', () => {
    const [type, id] = el.dataset.stdEdit.split(':');
    openStudyModal(type, id);
  }));
  qa('[data-std-delete]').forEach((btn) => btn.addEventListener('click', () => {
    const [type, id] = btn.dataset.stdDelete.split(':');
    deleteEntityById(type, id);
  }));

  qa('[data-std-assignment-toggle]').forEach((chk) => chk.addEventListener('change', () => {
    const a = (currentData.assignments || []).find((x) => x.id === chk.dataset.stdAssignmentToggle);
    if (!a) return;
    a.status = chk.checked ? 'Completed' : 'Not Started';
    a.completed = chk.checked;
    a.progress = chk.checked ? 100 : a.progress;
    a.updatedAt = nowStamp();
    refreshStudy({ persistData: true });
  }));

  qa('[data-std-project-task]').forEach((chk) => chk.addEventListener('change', () => {
    const [pid, tid] = chk.dataset.stdProjectTask.split(':');
    const p = (currentData.projects || []).find((x) => x.id === pid);
    if (!p) return;
    const t = (p.tasks || []).find((x) => x.id === tid);
    if (t) t.done = chk.checked;
    p.progress = p.tasks.length ? Math.round((p.tasks.filter((x) => x.done).length / p.tasks.length) * 100) : p.progress;
    refreshStudy({ persistData: true });
  }));
  qa('[data-std-project-task-add]').forEach((form) => form.addEventListener('submit', (e) => {
    e.preventDefault();
    const pid = form.dataset.stdProjectTaskAdd;
    const input = form.querySelector('input[name="title"]');
    const title = input.value.trim();
    if (!title) return;
    const p = (currentData.projects || []).find((x) => x.id === pid);
    if (!p) return;
    p.tasks = p.tasks || [];
    p.tasks.push({ id: makeId(), title, done: false });
    refreshStudy({ persistData: true });
  }));

  qa('[data-std-note-pin]').forEach((btn) => btn.addEventListener('click', () => {
    const n = (currentData.studyNotes || []).find((x) => x.id === btn.dataset.stdNotePin);
    if (n) { n.pinned = !n.pinned; n.updatedAt = nowStamp(); refreshStudy({ persistData: true }); }
  }));
  qa('[data-std-note-archive]').forEach((btn) => btn.addEventListener('click', () => {
    const n = (currentData.studyNotes || []).find((x) => x.id === btn.dataset.stdNoteArchive);
    if (n) { n.archived = !n.archived; n.updatedAt = nowStamp(); refreshStudy({ persistData: true }); }
  }));
  const archiveToggle = q('[data-std-notes-toggle-archive]');
  if (archiveToggle) archiveToggle.addEventListener('click', () => { studyState.notesShowArchived = !studyState.notesShowArchived; refreshStudy(); });

  qa('[data-std-pomo-mode]').forEach((btn) => btn.addEventListener('click', () => {
    const p = currentData.pomodoro;
    p.mode = btn.dataset.stdPomoMode;
    if (POMODORO_PRESETS[p.mode]) { p.workMin = POMODORO_PRESETS[p.mode].work; p.breakMin = POMODORO_PRESETS[p.mode].break; }
    pomodoro.running = false;
    pomodoro.phase = 'work';
    pomodoro.remaining = p.workMin * 60;
    refreshStudy({ persistData: true });
  }));
  const workInput = q('#std-pomo-work');
  const breakInput = q('#std-pomo-break');
  if (workInput) workInput.addEventListener('change', () => { currentData.pomodoro.workMin = Number(workInput.value || 25); if (!pomodoro.running && pomodoro.phase === 'work') pomodoro.remaining = currentData.pomodoro.workMin * 60; persist(); });
  if (breakInput) breakInput.addEventListener('change', () => { currentData.pomodoro.breakMin = Number(breakInput.value || 5); if (!pomodoro.running && pomodoro.phase === 'break') pomodoro.remaining = currentData.pomodoro.breakMin * 60; persist(); });

  qa('[data-std-pomo-action]').forEach((btn) => btn.addEventListener('click', () => {
    const action = btn.dataset.stdPomoAction;
    if (action === 'start') pomodoro.running = true;
    else if (action === 'pause') pomodoro.running = false;
    else if (action === 'reset') { pomodoro.running = false; pomodoro.phase = 'work'; pomodoro.remaining = (currentData.pomodoro.mode === 'Custom' ? currentData.pomodoro.workMin : POMODORO_PRESETS[currentData.pomodoro.mode]?.work || currentData.pomodoro.workMin) * 60; }
    else if (action === 'skip') handlePomodoroPhaseEnd();
    refreshStudy();
  }));
}
