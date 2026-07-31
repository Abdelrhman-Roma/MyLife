// MyLife — Prayer module (Phase 3 + Worship Module Quran integration).
// currentData.prayers is now a real 5-daily-prayer log (auto-generated for
// each new day by normalizeData() in shared.js), not free-form entries.
//
// Quran data is loaded from this project's own bundled files
// (../quran.json, ../chapters/{id}.json — sourced from risan/quran-json)
// rather than fetched from a CDN. Important honesty note: these local files
// contain Arabic text + transliteration only — no English translation is
// bundled. The reader below is built around that real constraint rather
// than silently pretending translations exist.
//
// Note on Hadith: ../api-1.json, despite its name, is the AlAdhan Prayer
// Times API's OpenAPI spec, not hadith content — there is no hadith data
// anywhere in this project. No Hadith section is built here; fabricating
// hadith text is not an option. See QuranService for the loader pattern
// this reuses.

const PRAYER_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const HIJRI_MONTHS = [
  'Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Thani", 'Jumada al-Awwal', 'Jumada al-Thani',
  'Rajab', "Sha'ban", 'Ramadan', 'Shawwal', "Dhu al-Qi'dah", 'Dhu al-Hijjah',
];

let prayerState = { hadithModal: false, quranModal: false, tab: 'prayers', azkar: null, azkarLoading: false };
const PRAYER_TIMES = { Fajr: '05:10', Dhuhr: '12:30', Asr: '15:45', Maghrib: '18:20', Isha: '19:45' };

// ─── Hijri (tabular/civil calendar) conversion ─────────────────────────────
// Verified against reference conversions (e.g. 18 Feb 2026 = 1 Ramadan 1447)
// before shipping. This is the standard arithmetic/tabular Islamic calendar
// used by most software calendars — it can differ by 1-2 days from the
// moon-sighting-based date your local mosque/authority announces, especially
// for Ramadan, Shawwal (Eid al-Fitr), and Dhu al-Hijjah (Eid al-Adha/Hajj).
function gregorianToJDN(y, m, d) {
  const a = Math.floor((14 - m) / 12);
  const y2 = y + 4800 - a;
  const m2 = m + 12 * a - 3;
  return d + Math.floor((153 * m2 + 2) / 5) + 365 * y2 + Math.floor(y2 / 4) - Math.floor(y2 / 100) + Math.floor(y2 / 400) - 32045;
}
function jdnToHijri(jdn) {
  let l = jdn - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  l = l - 10631 * n + 354;
  const j = Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) + Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l = l - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const month = Math.floor((24 * l) / 709);
  const day = l - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;
  return { year, month, day };
}
function todayHijri() {
  const d = new Date();
  const jdn = gregorianToJDN(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return jdnToHijri(jdn);
}

function hijriToJDN(y, m, d) {
  return d + Math.ceil(29.5 * (m - 1)) + (y - 1) * 354 + Math.floor((3 + 11 * y) / 30) + 1948440 - 1;
}
function jdnToGregorianDate(jdn) {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d2 = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d2) / 4);
  const m2 = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m2 + 2) / 5) + 1;
  const month = m2 + 3 - 12 * Math.floor(m2 / 10);
  const year = 100 * b + d2 - 4800 + Math.floor(m2 / 10);
  return new Date(year, month - 1, day);
}
// Returns the Gregorian [start, end] date range of the next upcoming (or
// currently active) Ramadan, using the same verified tabular Hijri method.
function nextRamadanRange() {
  const h = todayHijri();
  let ry = h.year;
  if (h.month > 9 || (h.month === 9 && h.day > 1)) ry += 1;
  const start = jdnToGregorianDate(hijriToJDN(ry, 9, 1));
  const end = jdnToGregorianDate(hijriToJDN(ry, 10, 1) - 1);
  return { start, end };
}

function prayerTodayIso() { return new Date().toISOString().slice(0, 10); }

// ─── Streaks & insights ─────────────────────────────────────────────────────
function dailyPrayerCompletion() {
  // Map date -> { total, completed } across every date that has entries.
  const byDate = {};
  currentData.prayers.forEach((p) => {
    if (!p.date) return;
    const e = byDate[p.date] || (byDate[p.date] = { total: 0, completed: 0 });
    e.total++;
    if (p.status === 'Completed') e.completed++;
  });
  return byDate;
}

function prayerStreaks() {
  const byDate = dailyPrayerCompletion();
  const fullDays = new Set(Object.entries(byDate).filter(([, v]) => v.total >= 5 && v.completed >= v.total).map(([d]) => d));
  const today = new Date();
  let current = 0;
  let cursor = fullDays.has(prayerTodayIso()) ? today : new Date(today.getTime() - 86400000);
  const iso = (d) => d.toISOString().slice(0, 10);
  while (fullDays.has(iso(cursor))) { current++; cursor = new Date(cursor.getTime() - 86400000); }

  const days = [...fullDays].sort();
  let best = 0, run = 0, prev = null;
  days.forEach((d) => {
    if (prev) {
      const gap = Math.round((new Date(d) - new Date(prev)) / 86400000);
      run = gap === 1 ? run + 1 : 1;
    } else run = 1;
    best = Math.max(best, run);
    prev = d;
  });
  return { current, best: Math.max(best, current) };
}

function missedPrayerInsights(windowDays = 30) {
  const cutoff = new Date(Date.now() - windowDays * 86400000).toISOString().slice(0, 10);
  const missed = currentData.prayers.filter((p) => p.date >= cutoff && p.date < prayerTodayIso() && p.status === 'Missed');
  const byName = {};
  missed.forEach((p) => { byName[p.prayer] = (byName[p.prayer] || 0) + 1; });
  const worst = Object.entries(byName).sort((a, b) => b[1] - a[1])[0];
  return { total: missed.length, worst: worst ? { name: worst[0], count: worst[1] } : null };
}

// ─── Root render ────────────────────────────────────────────────────────────
function initPrayerPage() {
  quranState.fontSize = currentData.quranProgress.readingSettings.fontSize || 'md';
  renderArt('prayer');
  renderPrayerRoot();
}

function renderPrayerRoot() {
  const root = byId('prayer-root');
  if (!root) return;

  if (prayerState.tab === 'quran') {
    root.innerHTML = `${prayerTabsHtml()}${quranReaderRootHtml()}`;
    bindPrayerTabEvents(root);
    bindQuranRootEvents(root);
    return;
  }

  const today = currentData.prayers.filter((p) => p.date === prayerTodayIso())
    .sort((a, b) => PRAYER_NAMES.indexOf(a.prayer) - PRAYER_NAMES.indexOf(b.prayer));
  const streaks = prayerStreaks();
  const missed = missedPrayerInsights();
  const hijri = todayHijri();

  root.innerHTML = `
    ${prayerTabsHtml()}
    ${worshipDashboardHtml()}
    <section class="panel pr-hero">
      <div>
        <p class="eyebrow">${t('Islamic calendar')} \u00b7 ${t('tabular estimate')}</p>
        <h2>${hijri.day} ${t(HIJRI_MONTHS[hijri.month - 1])} ${hijri.year} AH</h2>
        <p class="muted">${t('Approximate \u2014 local moon-sighting dates for your mosque may differ by a day, especially around Ramadan and Eid.')}</p>
      </div>
      <div class="pr-hero-stats">
        <div class="pr-hero-stat"><strong>\ud83d\udd25 ${streaks.current}</strong><small>${t('Day streak')}</small></div>
        <div class="pr-hero-stat"><strong>\ud83c\udfc6 ${streaks.best}</strong><small>${t('Best streak')}</small></div>
      </div>
    </section>

    <section class="panel">
      <p class="eyebrow">${t('Today')}</p>
      <h2>${t('Five daily prayers')}</h2>
      <div class="pr-today-row">
        ${today.map((p) => `
          <label class="pr-prayer-toggle${p.status === 'Completed' ? ' is-done' : ''}${p.status === 'Missed' ? ' is-missed' : ''}">
            <input type="checkbox" ${p.status === 'Completed' ? 'checked' : ''} data-pr-toggle="${p.id}" />
            <span>${t(p.prayer)}</span>
            ${p.time ? `<small>${escapeHtml(p.time)}</small>` : ''}
          </label>
        `).join('')}
      </div>
    </section>

    ${missed.total ? `
      <section class="panel pr-insight-panel">
        <p class="eyebrow">${t('Insight')}</p>
        <p>${t('You missed')} <strong>${missed.total}</strong> ${t('prayer(s) in the last 30 days')}${missed.worst ? ` \u2014 ${t('most often')}: <strong>${t(missed.worst.name)}</strong> (${missed.worst.count})` : ''}.</p>
      </section>
    ` : ''}

    <section class="dash-columns">
      <div class="panel">
        ${quranTrackerHtml()}
      </div>
      <div class="panel">
        ${hadithRotationHtml()}
      </div>
    </section>
  `;

  bindPrayerTabEvents(root);
  bindPrayerRootEvents(root);
  bindWorshipEvents(root);
  renderHadithModal();
  renderQuranModal();
  ensureDailyAzkar();
}

function prayerTimeToday(name) {
  const [hours, minutes] = PRAYER_TIMES[name].split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function nextPrayerInfo() {
  const now = new Date();
  const entries = PRAYER_NAMES.map((name) => ({ name, date: prayerTimeToday(name) }));
  let next = entries.find((entry) => entry.date > now);
  if (!next) {
    next = { name: 'Fajr', date: new Date(prayerTimeToday('Fajr').getTime() + 86400000) };
  }
  const remaining = Math.max(0, next.date - now);
  return { ...next, hours: Math.floor(remaining / 3600000), minutes: Math.floor((remaining % 3600000) / 60000) };
}

function worshipDashboardHtml() {
  const next = nextPrayerInfo();
  const today = currentData.prayers.filter((p) => p.date === prayerTodayIso());
  const completed = today.filter((p) => p.status === 'Completed').length;
  const tasbeeh = currentData.tasbeeh || { count: 0, target: 33 };
  const hadithItems = currentData.hadithCollection || [];
  const hadith = hadithItems.length ? hadithItems[dayOfYearPrayer() % hadithItems.length] : null;
  const azkar = prayerState.azkar && prayerState.azkar[dayOfYearPrayer() % prayerState.azkar.length];
  return `
    <section class="pr-worship-hero">
      <div class="pr-worship-heading">
        <p class="eyebrow">${t('Worship dashboard')}</p>
        <h1>${t('A quieter space for worship')}</h1>
        <p>${t('Keep today close: prayer, remembrance, and a steady return to the Quran.')}</p>
      </div>
      <div class="pr-next-prayer">
        <span class="eyebrow">${t('Next prayer')}</span>
        <strong>${t(next.name)}</strong>
        <span>${PRAYER_TIMES[next.name]} · ${next.hours}h ${next.minutes}m</span>
      </div>
    </section>
    <section class="pr-worship-grid">
      <article class="panel pr-time-card">
        <div class="pr-card-heading"><div><p class="eyebrow">${t('Prayer times')}</p><h2>${t('Today')}</h2></div><span class="pr-card-mark">${completed}/5</span></div>
        <div class="pr-time-list">${PRAYER_NAMES.map((name) => `<div><span>${t(name)}</span><time>${PRAYER_TIMES[name]}</time></div>`).join('')}</div>
      </article>
      <article class="panel pr-quran-card"><p class="eyebrow">${t('Return to the book')}</p><h2>${t('Continue Quran')}</h2><p class="muted">${currentData.quranProgress.lastSurah ? `${t('Surah')} ${currentData.quranProgress.lastSurah}, ${t('ayah')} ${currentData.quranProgress.lastAyah || 1}` : t('Begin your first reading.')}</p><button type="button" class="primary-btn" data-pr-open-quran>${t('Open reader')}</button></article>
      <article class="panel pr-remembrance-card"><p class="eyebrow">${t('Daily azkar')}</p><h2>${azkar ? escapeHtml(String(azkar.category || t('Remembrance'))) : t('Preparing remembrance')}</h2><p dir="rtl" class="pr-azkar-text">${azkar ? escapeHtml(String(azkar.zekr || '').slice(0, 150)) : t('Loading from your bundled collection...')}</p><small>${azkar ? `${azkar.count || 1} ${t('repetitions')}` : ''}</small></article>
      <article class="panel pr-hadith-card"><p class="eyebrow">${t('Daily hadith')}</p>${hadith ? `<blockquote class="pr-hadith-quote"><p>${escapeHtml(hadith.text)}</p><footer>${escapeHtml(hadith.source || t('Personal collection'))}</footer></blockquote>` : `<p class="muted">${t('No Hadith text is bundled. Add a sourced entry to your collection to show one here.')}</p>`}</article>
      <article class="panel pr-tasbeeh-card"><div class="pr-card-heading"><div><p class="eyebrow">${t('Tasbeeh')}</p><h2>${tasbeeh.count}/${tasbeeh.target}</h2></div><button type="button" class="tasbeeh-orb" data-pr-tasbeeh aria-label="${t('Count Tasbeeh')}">+</button></div><div class="td-subtask-bar"><i style="width:${Math.min(100, Math.round((tasbeeh.count / Math.max(1, tasbeeh.target)) * 100))}%"></i></div><button type="button" class="text-btn" data-pr-tasbeeh-reset>${t('Reset counter')}</button></article>
      <article class="panel pr-stats-card"><p class="eyebrow">${t('Worship statistics')}</p><div class="pr-stat-row"><strong>${completed}/5</strong><span>${t('prayers completed today')}</span></div><div class="pr-stat-row"><strong>${prayerStreaks().current}</strong><span>${t('day streak')}</span></div><div class="pr-stat-row"><strong>${(currentData.quranProgress.readLog[prayerTodayIso()] || { verses: 0 }).verses}</strong><span>${t('verses read today')}</span></div></article>
    </section>
    <section class="dash-columns pr-lower-grid"><article class="panel"><p class="eyebrow">${t('Prayer history')}</p><h2>${t('Recent days')}</h2>${prayerHistoryHtml()}</article><article class="panel"><p class="eyebrow">${t('Achievements')}</p><h2>${t('Small acts, kept visible')}</h2><div class="pr-achievements"><span class="${completed === 5 ? 'is-unlocked' : ''}">${t('Five prayers today')}</span><span class="${prayerStreaks().current >= 3 ? 'is-unlocked' : ''}">${t('Three day return')}</span><span class="${currentData.quranProgress.readLog[prayerTodayIso()] ? 'is-unlocked' : ''}">${t('Quran opened')}</span></div></article></section>
  `;
}

function prayerHistoryHtml() {
  const byDate = dailyPrayerCompletion();
  const dates = Object.keys(byDate).sort().reverse().slice(0, 5);
  return `<div class="pr-history-list">${dates.map((date) => `<div><span>${escapeHtml(date)}</span><strong>${byDate[date].completed}/${byDate[date].total}</strong></div>`).join('') || `<p class="muted">${t('Your completed prayers will appear here.')}</p>`}</div>`;
}

async function ensureDailyAzkar() {
  if (prayerState.azkar || prayerState.azkarLoading) return;
  prayerState.azkarLoading = true;
  try { prayerState.azkar = await AzkarService.getAll(); } catch (_err) { prayerState.azkar = []; }
  prayerState.azkarLoading = false;
  if (prayerState.tab === 'prayers') renderPrayerRoot();
}

function bindWorshipEvents(root) {
  const openQuran = root.querySelector('[data-pr-open-quran]');
  if (openQuran) openQuran.addEventListener('click', () => { prayerState.tab = 'quran'; renderPrayerRoot(); });
  const tasbeeh = root.querySelector('[data-pr-tasbeeh]');
  if (tasbeeh) tasbeeh.addEventListener('click', () => { currentData.tasbeeh.count = (currentData.tasbeeh.count || 0) + 1; currentData.tasbeeh.updatedAt = new Date().toISOString(); persist(); renderPrayerRoot(); });
  const reset = root.querySelector('[data-pr-tasbeeh-reset]');
  if (reset) reset.addEventListener('click', () => { currentData.tasbeeh.count = 0; persist(); renderPrayerRoot(); });
}

function prayerTabsHtml() {
  const tabs = [['prayers', t('Prayers')], ['quran', t('Quran')]];
  return `
    <section class="td-filter-row">
      <div class="td-filter-chips" role="tablist">
        ${tabs.map(([k, label]) => `<button type="button" class="td-chip${prayerState.tab === k ? ' active' : ''}" data-pr-tab="${k}" role="tab" aria-selected="${prayerState.tab === k}">${label}</button>`).join('')}
      </div>
    </section>
  `;
}

function bindPrayerTabEvents(root) {
  root.querySelectorAll('[data-pr-tab]').forEach((btn) => btn.addEventListener('click', () => {
    if (prayerState.tab === btn.dataset.prTab) return;
    prayerState.tab = btn.dataset.prTab;
    renderPrayerRoot();
  }));
}

function bindPrayerRootEvents(root) {
  root.querySelectorAll('[data-pr-toggle]').forEach((el) => el.addEventListener('change', () => togglePrayer(el.dataset.prToggle)));
  const quranBtn = root.querySelector('[data-pr-quran-add]');
  if (quranBtn) quranBtn.addEventListener('click', () => { prayerState.quranModal = true; renderQuranModal(); });
  root.querySelectorAll('[data-pr-quran-delete]').forEach((btn) => btn.addEventListener('click', () => {
    currentData.quranLog = currentData.quranLog.filter((q) => q.id !== btn.dataset.prQuranDelete);
    persist();
    renderPrayerRoot();
  }));
  const hadithBtn = root.querySelector('[data-pr-hadith-add]');
  if (hadithBtn) hadithBtn.addEventListener('click', () => { prayerState.hadithModal = true; renderHadithModal(); });
  root.querySelectorAll('[data-pr-hadith-delete]').forEach((btn) => btn.addEventListener('click', () => {
    currentData.hadithCollection = currentData.hadithCollection.filter((h) => h.id !== btn.dataset.prHadithDelete);
    persist();
    renderPrayerRoot();
  }));
}

function togglePrayer(id) {
  const p = currentData.prayers.find((x) => x.id === id);
  if (!p) return;
  p.status = p.status === 'Completed' ? 'Pending' : 'Completed';
  p.completedAt = p.status === 'Completed' ? new Date().toISOString() : null;
  persist();
  renderPrayerRoot();
}

// ─── Quran tracker (reference log only — never reproduces Qur'an text) ─────
function quranTrackerHtml() {
  const log = [...currentData.quranLog].sort((a, b) => b.date.localeCompare(a.date));
  const totalPages = log.reduce((s, q) => s + (Number(q.pages) || 0), 0);
  return `
    <p class="eyebrow">${t('Reading log')}</p>
    <h2>${t('Quran tracker')}</h2>
    <p class="muted">${totalPages} ${t('pages logged total')}</p>
    <button type="button" class="secondary-btn" data-pr-quran-add>+ ${t('Log reading')}</button>
    <div class="pr-log-list">
      ${log.slice(0, 6).map((q) => `
        <div class="pr-log-row">
          <div>
            <strong>${escapeHtml(q.surah || t('Reading'))}</strong>
            ${q.fromAyah || q.toAyah ? `<small>${escapeHtml(q.fromAyah || '')}${q.toAyah ? `\u2013${escapeHtml(q.toAyah)}` : ''}</small>` : ''}
            <small>${escapeHtml(q.date)}${q.pages ? ` \u00b7 ${q.pages}p` : ''}</small>
          </div>
          <button type="button" class="std-icon-btn std-icon-danger" data-pr-quran-delete="${q.id}" aria-label="${t('Delete')}">\u2715</button>
        </div>
      `).join('') || emptyStateHtml('book', t('No readings logged yet.'))}
    </div>
  `;
}

function renderQuranModal() {
  const existing = document.querySelector('[data-pr-quran-modal]');
  if (existing) existing.remove();
  if (!prayerState.quranModal) return;
  document.body.insertAdjacentHTML('beforeend', `
    <div class="td-modal-overlay" data-pr-quran-modal role="dialog" aria-modal="true" aria-label="${t('Log reading')}">
      <div class="td-modal-backdrop" data-pr-quran-close></div>
      <div class="panel td-modal-card">
        <div class="td-modal-head">
          <div><p class="eyebrow">${t('New')}</p><h2>${t('Quran reading')}</h2></div>
          <button type="button" class="std-icon-btn" data-pr-quran-close aria-label="${t('Close')}">\u2715</button>
        </div>
        <form class="form-stack" data-pr-quran-form novalidate>
          <label class="full-field">${t('Surah (chapter)')}
            <input type="text" name="surah" placeholder="${t('e.g. Al-Baqarah')}" required />
          </label>
          <div class="form-grid">
            <label>${t('From ayah')}<input type="number" min="1" name="fromAyah" /></label>
            <label>${t('To ayah')}<input type="number" min="1" name="toAyah" /></label>
            <label>${t('Pages read')}<input type="number" min="0" step="0.5" name="pages" /></label>
            <label>${t('Date')}<input type="date" name="date" value="${prayerTodayIso()}" required /></label>
          </div>
          <div class="td-modal-actions">
            <span></span>
            <div class="td-modal-actions-right">
              <button type="button" class="secondary-btn" data-pr-quran-close>${t('Cancel')}</button>
              <button type="submit" class="primary-btn">${t('Save')}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  `);
  const overlay = document.querySelector('[data-pr-quran-modal]');
  overlay.querySelectorAll('[data-pr-quran-close]').forEach((b) => b.addEventListener('click', () => { prayerState.quranModal = false; overlay.remove(); }));
  overlay.querySelector('[data-pr-quran-form]').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const surah = String(fd.get('surah') || '').trim();
    if (!surah) return;
    currentData.quranLog.push({
      id: makeId(), surah, date: String(fd.get('date') || prayerTodayIso()),
      fromAyah: fd.get('fromAyah') || '', toAyah: fd.get('toAyah') || '', pages: Number(fd.get('pages')) || 0,
    });
    persist();
    prayerState.quranModal = false;
    renderPrayerRoot();
  });
}

// ─── Hadith rotation (user-supplied text only) ─────────────────────────────
function hadithRotationHtml() {
  const items = currentData.hadithCollection;
  const today = items.length ? items[dayOfYearPrayer() % items.length] : null;
  return `
    <p class="eyebrow">${t('Rotates daily from your own collection')}</p>
    <h2>${t('Hadith')}</h2>
    ${today ? `
      <blockquote class="pr-hadith-quote">
        <p>${escapeHtml(today.text)}</p>
        ${today.source ? `<footer>\u2014 ${escapeHtml(today.source)}</footer>` : ''}
      </blockquote>
    ` : emptyStateHtml('moon', t('Add hadith you\u2019d like to rotate through \u2014 MyLife doesn\u2019t include pre-loaded text, so accuracy and sourcing stay in your hands.'))}
    <button type="button" class="secondary-btn" data-pr-hadith-add>+ ${t('Add hadith')}</button>
    ${items.length ? `
      <div class="pr-log-list">
        ${items.map((h) => `
          <div class="pr-log-row">
            <div><strong>${escapeHtml(h.text.slice(0, 60))}${h.text.length > 60 ? '\u2026' : ''}</strong>${h.source ? `<small>${escapeHtml(h.source)}</small>` : ''}</div>
            <button type="button" class="std-icon-btn std-icon-danger" data-pr-hadith-delete="${h.id}" aria-label="${t('Delete')}">\u2715</button>
          </div>
        `).join('')}
      </div>
    ` : ''}
  `;
}

function dayOfYearPrayer() {
  const d = new Date();
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d - start) / 86400000);
}

function renderHadithModal() {
  const existing = document.querySelector('[data-pr-hadith-modal]');
  if (existing) existing.remove();
  if (!prayerState.hadithModal) return;
  document.body.insertAdjacentHTML('beforeend', `
    <div class="td-modal-overlay" data-pr-hadith-modal role="dialog" aria-modal="true" aria-label="${t('Add hadith')}">
      <div class="td-modal-backdrop" data-pr-hadith-close></div>
      <div class="panel td-modal-card">
        <div class="td-modal-head">
          <div><p class="eyebrow">${t('New')}</p><h2>${t('Hadith')}</h2></div>
          <button type="button" class="std-icon-btn" data-pr-hadith-close aria-label="${t('Close')}">\u2715</button>
        </div>
        <form class="form-stack" data-pr-hadith-form novalidate>
          <label class="full-field">${t('Text')}
            <textarea name="text" required placeholder="${t('Paste the hadith text you want to rotate through')}"></textarea>
          </label>
          <label class="full-field">${t('Source / citation')}
            <input type="text" name="source" placeholder="${t('e.g. Sahih al-Bukhari 1')}" />
          </label>
          <div class="td-modal-actions">
            <span></span>
            <div class="td-modal-actions-right">
              <button type="button" class="secondary-btn" data-pr-hadith-close>${t('Cancel')}</button>
              <button type="submit" class="primary-btn">${t('Save')}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  `);
  const overlay = document.querySelector('[data-pr-hadith-modal]');
  overlay.querySelectorAll('[data-pr-hadith-close]').forEach((b) => b.addEventListener('click', () => { prayerState.hadithModal = false; overlay.remove(); }));
  overlay.querySelector('[data-pr-hadith-form]').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const text = String(fd.get('text') || '').trim();
    if (!text) return;
    currentData.hadithCollection.push({ id: makeId(), text, source: String(fd.get('source') || '').trim(), addedAt: new Date().toISOString() });
    persist();
    prayerState.hadithModal = false;
    renderPrayerRoot();
  });
}

// QuranService is now a standalone module: js/services/QuranService.js
// (built on PathResolver + DataService), loaded before this script on
// prayer.html. This file only consumes it — no fetch() calls live here.

// ─── Quran reader state ─────────────────────────────────────────────────────
let quranState = { view: 'list', search: '', currentSurah: null, jumpAyah: null, loading: false, error: null, searchResults: null, searching: false, fontSize: 'md' };

function quranTodayIso() { return new Date().toISOString().slice(0, 10); }

function quranReaderRootHtml() {
  if (quranState.loading) {
    return `
      <section class="panel">
        <div class="pr-skeleton-grid">
          ${Array.from({ length: 6 }).map(() => '<div class="skeleton" style="height:64px;border-radius:12px"></div>').join('')}
        </div>
      </section>
    `;
  }
  if (quranState.error) {
    const isFileProtocol = typeof PathResolver !== 'undefined' && PathResolver.isFileProtocol();
    return `
      <section class="panel">
        <div class="empty-state">
          <p><strong>${isFileProtocol ? t('A local web server is required') : t('Could not load Quran data')}</strong></p>
          <p>${escapeHtml(quranState.error)}</p>
          <button type="button" class="secondary-btn empty-state-cta" data-qr-retry>${t('Retry')}</button>
        </div>
      </section>
    `;
  }
  if (quranState.view === 'read' && quranState.currentSurah) return quranReadViewHtml();
  if (quranState.view === 'bookmarks') return quranListPanelHtml('bookmarks');
  if (quranState.view === 'favorites') return quranListPanelHtml('favorites');
  if (quranState.view === 'stats') return quranStatsViewHtml();
  if (quranState.view === 'history') return quranHistoryViewHtml();
  if (quranState.view === 'goal') return quranGoalViewHtml();
  return quranListViewHtml();
}

function quranNoteBannerHtml() {
  return `<p class="pr-quran-note">${t('This dataset includes Arabic text and transliteration only \u2014 no English translation is bundled with the project.')}</p>`;
}

// ─── List / browse view ─────────────────────────────────────────────────────
let quranChapterListCache = null;

function quranListViewHtml() {
  const progress = currentData.quranProgress;
  return `
    <section class="panel">
      <div class="td-header-top">
        <div>
          <p class="eyebrow">${t('Worship \u2192 Quran')}</p>
          <h2>${t('Quran')}</h2>
        </div>
      </div>
      ${quranNoteBannerHtml()}
      ${quranGoalBannerHtml()}
      <div class="pr-quran-quicklinks">
        ${progress.lastSurah ? `<button type="button" class="secondary-btn" data-qr-continue>\u25b6 ${t('Continue reading')}</button>` : ''}
        <button type="button" class="secondary-btn" data-qr-daily>${t('Daily verse')}</button>
        <button type="button" class="secondary-btn" data-qr-random>${t('Random verse')}</button>
        <button type="button" class="secondary-btn" data-qr-view="bookmarks">\ud83d\udd16 ${t('Bookmarks')} (${currentData.quranBookmarks.length})</button>
        <button type="button" class="secondary-btn" data-qr-view="favorites">\u2605 ${t('Favorites')} (${currentData.quranFavorites.length})</button>
        <button type="button" class="secondary-btn" data-qr-view="history">${t('Reading history')}</button>
        <button type="button" class="secondary-btn" data-qr-view="stats">${t('Reading stats')}</button>
        <button type="button" class="secondary-btn" data-qr-view="goal">\ud83c\udfaf ${t('Reading goal')}</button>
      </div>
      <div class="td-search-row">
        <input type="search" class="td-search" placeholder="${t('Search surah name, or search verse text/transliteration')}" value="${escapeAttr(quranState.search)}" data-qr-search aria-label="${t('Search Quran')}" />
      </div>
      ${quranState.searching ? `<p class="muted">${t('Searching all surahs (first time only \u2014 cached after)\u2026')}</p>` : ''}
      ${quranState.searchResults ? quranSearchResultsHtml() : quranSurahGridHtml()}
    </section>
  `;
}

function quranSurahGridHtml() {
  if (!quranChapterListCache) return `<div class="empty-state">${t('Loading surah list\u2026')}</div>`;
  const q = quranState.search.trim().toLowerCase();
  const list = quranChapterListCache.filter((c) => !q
    || c.transliteration.toLowerCase().includes(q)
    || c.name.includes(quranState.search.trim())
    || String(c.id) === q);
  return `
    <div class="pr-surah-grid">
      ${list.map((c) => `
        <button type="button" class="pr-surah-card" data-qr-open="${c.id}">
          <span class="pr-surah-num">${c.id}</span>
          <span class="pr-surah-info">
            <strong>${escapeHtml(c.transliteration)}</strong>
            <small>${t(c.type === 'meccan' ? 'Meccan' : 'Medinan')} \u00b7 ${c.total_verses} ${t('verses')}</small>
          </span>
          <span class="pr-surah-arabic">${escapeHtml(c.name)}</span>
        </button>
      `).join('')}
    </div>
    ${!list.length ? `<div class="empty-state">${t('No surahs match your search.')}</div>` : ''}
  `;
}

function quranSearchResultsHtml() {
  const results = quranState.searchResults;
  if (!results.length) return `<div class="empty-state">${t('No verses matched.')}</div>`;
  return `
    <div class="pr-search-results">
      <p class="muted">${results.length} ${t('matches')}</p>
      ${results.slice(0, 60).map((r) => `
        <button type="button" class="pr-search-row" data-qr-open="${r.surahId}" data-qr-ayah="${r.ayahId}">
          <strong>${escapeHtml(r.surahName)} ${r.surahId}:${r.ayahId}</strong>
          <span dir="rtl" class="pr-search-arabic">${escapeHtml(r.text)}</span>
          ${r.transliteration ? `<small>${escapeHtml(r.transliteration)}</small>` : ''}
        </button>
      `).join('')}
    </div>
  `;
}

// ─── Reader view ─────────────────────────────────────────────────────────────
function quranReadViewHtml() {
  const ch = quranState.currentSurah;
  const settings = currentData.quranProgress.readingSettings;
  const bookmarked = new Set(currentData.quranBookmarks.map((b) => `${b.surah}:${b.ayah}`));
  const favorited = new Set(currentData.quranFavorites.map((f) => `${f.surah}:${f.ayah}`));
  const list = quranChapterListCache || [];
  const idx = list.findIndex((c) => c.id === ch.id);
  const prev = idx > 0 ? list[idx - 1] : null;
  const next = idx >= 0 && idx < list.length - 1 ? list[idx + 1] : null;

  return `
    <section class="panel pr-reader-head">
      <button type="button" class="text-btn" data-qr-view="list">\u2190 ${t('All surahs')}</button>
      <div class="pr-reader-title">
        <h2>${ch.id}. ${escapeHtml(ch.transliteration)}</h2>
        <p class="muted">${t(ch.type === 'meccan' ? 'Meccan' : 'Medinan')} \u00b7 ${ch.total_verses} ${t('verses')}</p>
      </div>
      <span class="pr-reader-arabic-title">${escapeHtml(ch.name)}</span>
      <div class="pr-font-size-row">
        ${['sm', 'md', 'lg', 'xl'].map((sz) => `<button type="button" class="pr-font-btn${quranState.fontSize === sz ? ' active' : ''}" data-qr-fontsize="${sz}" aria-label="${t('Font size')} ${sz}">${sz === 'sm' ? 'A' : sz === 'md' ? 'A' : sz === 'lg' ? 'A' : 'A'}<sup>${sz}</sup></button>`).join('')}
      </div>
      <div class="pr-reading-tools" role="toolbar" aria-label="${t('Reading settings')}">
        <select data-qr-reading-mode aria-label="${t('Reading mode')}">${['light', 'sepia', 'night'].map((mode) => `<option value="${mode}" ${settings.mode === mode ? 'selected' : ''}>${t(mode === 'light' ? 'Light' : mode === 'sepia' ? 'Sepia' : 'Night')}</option>`).join('')}</select>
        <select data-qr-font-family aria-label="${t('Font family')}">${['amiri', 'noto', 'system'].map((font) => `<option value="${font}" ${settings.fontFamily === font ? 'selected' : ''}>${t(font === 'amiri' ? 'Amiri' : font === 'noto' ? 'Noto Arabic' : 'System')}</option>`).join('')}</select>
        <select data-qr-line-height aria-label="${t('Line height')}">${['compact', 'comfortable', 'spacious'].map((height) => `<option value="${height}" ${settings.lineHeight === height ? 'selected' : ''}>${t(height)}</option>`).join('')}</select>
        <button type="button" class="secondary-btn" data-qr-focus>${settings.focus ? t('Exit focus') : t('Focus')}</button>
        <button type="button" class="secondary-btn" data-qr-autoscroll>${settings.autoScroll ? t('Stop scroll') : t('Auto scroll')}</button>
        <button type="button" class="secondary-btn" data-qr-fullscreen>${t('Fullscreen')}</button>
      </div>
    </section>
    ${quranNoteBannerHtml()}
    <section class="pr-ayah-list pr-reading-${settings.mode} pr-reading-font-${settings.fontFamily} pr-reading-line-${settings.lineHeight}${settings.focus ? ' pr-focus-mode' : ''}" data-qr-fontsize-target style="--pr-ayah-size:${{ sm: '1.5rem', md: '1.9rem', lg: '2.3rem', xl: '2.7rem' }[quranState.fontSize || 'md']}" >
      ${ch.verses.map((v) => {
        const key = `${ch.id}:${v.id}`;
        return `
        <article class="panel pr-ayah-card" id="ayah-${v.id}" data-qr-ayah-card="${v.id}">
          <div class="pr-ayah-top">
            <span class="pr-ayah-badge">${ch.id}:${v.id}</span>
            <div class="pr-ayah-actions">
              <button type="button" class="std-icon-btn${bookmarked.has(key) ? ' is-active' : ''}" data-qr-bookmark="${v.id}" aria-label="${t('Bookmark')}" title="${t('Bookmark')}">\ud83d\udd16</button>
              <button type="button" class="std-icon-btn${favorited.has(key) ? ' is-active' : ''}" data-qr-favorite="${v.id}" aria-label="${t('Favorite')}" title="${t('Favorite')}">\u2605</button>
              <button type="button" class="std-icon-btn" data-qr-copy="${v.id}" aria-label="${t('Copy')}" title="${t('Copy')}">\ud83d\udccb</button>
              <button type="button" class="std-icon-btn" data-qr-share="${v.id}" aria-label="${t('Share')}" title="${t('Share')}">\u2197</button>
            </div>
          </div>
          <p class="pr-ayah-arabic" dir="rtl">${escapeHtml(v.text)}</p>
          ${v.transliteration ? `<p class="pr-ayah-translit">${escapeHtml(v.transliteration)}</p>` : ''}
        </article>
      `;
      }).join('')}
    </section>
    <section class="panel pr-reader-nav">
      ${prev ? `<button type="button" class="secondary-btn" data-qr-open="${prev.id}">\u2190 ${escapeHtml(prev.transliteration)}</button>` : '<span></span>'}
      ${next ? `<button type="button" class="secondary-btn" data-qr-open="${next.id}">${escapeHtml(next.transliteration)} \u2192</button>` : '<span></span>'}
    </section>
  `;
}

// ─── Bookmarks / Favorites list panel ──────────────────────────────────────
function quranListPanelHtml(kind) {
  const items = kind === 'bookmarks' ? currentData.quranBookmarks : currentData.quranFavorites;
  const title = kind === 'bookmarks' ? t('Bookmarks') : t('Favorites');
  return `
    <section class="panel">
      <button type="button" class="text-btn" data-qr-view="list">\u2190 ${t('All surahs')}</button>
      <h2>${title}</h2>
      <div class="pr-log-list">
        ${items.length ? items.slice().reverse().map((it) => `
          <div class="pr-log-row">
            <button type="button" class="pr-search-row" data-qr-open="${it.surah}" data-qr-ayah="${it.ayah}" style="border:0;padding:0;text-align:left">
              <strong>${escapeHtml(it.surahName || '')} ${it.surah}:${it.ayah}</strong>
              ${it.text ? `<span dir="rtl" class="pr-search-arabic">${escapeHtml(it.text)}</span>` : ''}
            </button>
            <button type="button" class="std-icon-btn std-icon-danger" data-qr-remove="${kind}:${it.id}" aria-label="${t('Delete')}">\u2715</button>
          </div>
        `).join('') : emptyStateHtml('book', t('Nothing saved yet.'))}
      </div>
    </section>
  `;
}

// ─── Reading stats ──────────────────────────────────────────────────────────
// ─── Reading Goal ───────────────────────────────────────────────────────────
const QURAN_TOTAL_VERSES = 6236; // standard total ayah count across all 114 surahs
const QURAN_GOAL_PRESETS = [7, 15, 30, 60, 90];

function versesReadSince(isoDate) {
  const p = currentData.quranProgress;
  return Object.entries(p.readLog)
    .filter(([d]) => d >= isoDate)
    .reduce((s, [, v]) => s + (v.verses || 0), 0);
}

function startQuranGoal(type, days) {
  const p = currentData.quranProgress;
  const start = quranTodayIso();
  let endDate;
  if (type === 'ramadan') {
    const { end } = nextRamadanRange();
    endDate = quranIsoFromDate(end);
  } else {
    const d = new Date();
    d.setDate(d.getDate() + (days - 1));
    endDate = quranIsoFromDate(d);
  }
  p.goal = { type, startDate: start, endDate };
  persist();
}

function cancelQuranGoal() {
  currentData.quranProgress.goal = null;
  persist();
}

function quranIsoFromDate(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }

function quranGoalStats() {
  const goal = currentData.quranProgress.goal;
  if (!goal) return null;
  const today = quranTodayIso();
  const readSinceStart = versesReadSince(goal.startDate);
  const remaining = Math.max(0, QURAN_TOTAL_VERSES - readSinceStart);
  const totalDays = Math.max(1, Math.round((new Date(`${goal.endDate}T00:00:00`) - new Date(`${goal.startDate}T00:00:00`)) / 86400000) + 1);
  const daysElapsed = Math.max(0, Math.round((new Date(`${today}T00:00:00`) - new Date(`${goal.startDate}T00:00:00`)) / 86400000));
  const daysRemaining = Math.max(1, totalDays - daysElapsed);
  const dailyTarget = Math.ceil(remaining / daysRemaining);
  const completionRatio = Math.min(1, readSinceStart / QURAN_TOTAL_VERSES);
  const dailyPages = Math.ceil((604 * (1 - completionRatio)) / daysRemaining);
  const dailySurahs = Math.ceil((114 * (1 - completionRatio)) / daysRemaining);
  const todayLog = currentData.quranProgress.readLog[today];
  const todayVerses = todayLog ? todayLog.verses : 0;
  const pct = Math.min(100, Math.round((readSinceStart / QURAN_TOTAL_VERSES) * 100));
  const overdue = today > goal.endDate && remaining > 0;
  return { goal, readSinceStart, remaining, totalDays, daysRemaining, dailyTarget, dailyPages, dailySurahs, todayVerses, pct, overdue };
}

function quranGoalBannerHtml() {
  const stats = quranGoalStats();
  if (!stats) return '';
  return `
    <div class="pr-goal-banner${stats.overdue ? ' is-overdue' : ''}">
      <div>
        <strong>${t('Today\u2019s target')}: ${stats.dailyTarget} ${t('verses')}</strong>
        <span class="muted"> \u00b7 ${stats.dailyPages} ${t('pages')} \u00b7 ${stats.dailySurahs} ${t('surahs')} \u00b7 ${stats.todayVerses}/${stats.dailyTarget} ${t('so far today')} \u00b7 ${stats.daysRemaining} ${t('days left')}</span>
      </div>
      <div class="td-subtask-bar"><i style="width:${stats.pct}%"></i></div>
    </div>
  `;
}

function quranGoalViewHtml() {
  const stats = quranGoalStats();
  return `
    <section class="panel">
      <button type="button" class="text-btn" data-qr-view="list">\u2190 ${t('All surahs')}</button>
      <h2>${t('Reading goal')}</h2>
      ${stats ? `
        <div class="dash-grid">
          ${dashCard('goal-pct', t('Overall'), 'green', stats.readSinceStart, QURAN_TOTAL_VERSES, `${stats.pct}% \u00b7 ${stats.readSinceStart}/${QURAN_TOTAL_VERSES}`, '#')}
          ${dashCard('goal-today', t('Today'), 'blue', stats.todayVerses, stats.dailyTarget, `${stats.todayVerses}/${stats.dailyTarget} ${t('verses')}`, '#')}
        </div>
        <p class="muted" style="margin-top:10px">${t('Goal')}: ${escapeHtml(stats.goal.type)} \u00b7 ${escapeHtml(stats.goal.startDate)} \u2192 ${escapeHtml(stats.goal.endDate)} (${stats.daysRemaining} ${t('days left')})</p>
        <p>${stats.dailyPages} ${t('pages')} \u00b7 ${stats.dailySurahs} ${t('surahs')} \u00b7 ${stats.dailyTarget} ${t('verses')} ${t('required today')}</p>
        ${stats.overdue ? `<p class="pr-goal-overdue">${t('Your target date has passed with reading remaining \u2014 consider setting a new goal.')}</p>` : ''}
        <button type="button" class="danger-btn" data-qr-goal-cancel>${t('Cancel goal')}</button>
      ` : `
        <p class="muted">${t('I want to finish the Quran in')}\u2026</p>
        <div class="pr-goal-presets">
          ${QURAN_GOAL_PRESETS.map((d) => `<button type="button" class="secondary-btn" data-qr-goal-start="${d}">${d} ${t('Days')}</button>`).join('')}
          <button type="button" class="secondary-btn" data-qr-goal-start="ramadan">${t('Ramadan')}</button>
        </div>
        <form class="form-grid" data-qr-goal-custom style="margin-top:12px">
          <label>${t('Custom (days)')}<input type="number" min="1" max="1000" name="customDays" value="30" /></label>
          <button type="submit" class="secondary-btn">${t('Start')}</button>
        </form>
      `}
    </section>
  `;
}

// ─── Reading History ────────────────────────────────────────────────────────
function quranHistoryViewHtml() {
  const p = currentData.quranProgress;
  const list = quranChapterListCache || [];
  const byName = Object.fromEntries(list.map((c) => [c.id, c.transliteration]));
  const days = Object.keys(p.readLog).sort().reverse();
  return `
    <section class="panel">
      <button type="button" class="text-btn" data-qr-view="list">\u2190 ${t('All surahs')}</button>
      <h2>${t('Reading history')}</h2>
      <div class="pr-log-list">
        ${days.length ? days.map((d) => `
          <div class="pr-log-row">
            <div>
              <strong>${escapeHtml(d)}</strong>
              <small>${p.readLog[d].surahs.map((id) => escapeHtml(byName[id] || `#${id}`)).join(', ')} \u00b7 ${p.readLog[d].verses} ${t('verses')}</small>
            </div>
          </div>
        `).join('') : emptyStateHtml('book', t('No reading history yet.'))}
      </div>
    </section>
  `;
}

function quranStatsViewHtml() {
  const p = currentData.quranProgress;
  const days = Object.keys(p.readLog).sort();
  const totalVerses = days.reduce((s, d) => s + (p.readLog[d].verses || 0), 0);
  const today = p.readLog[quranTodayIso()] || { verses: 0, surahs: [] };
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
  const values = last7.map((d) => (p.readLog[d] ? p.readLog[d].verses : 0));
  const labels = last7.map((d) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(`${d}T00:00:00`).getDay()]);
  return `
    <section class="panel">
      <button type="button" class="text-btn" data-qr-view="list">\u2190 ${t('All surahs')}</button>
      <h2>${t('Reading statistics')}</h2>
      <div class="dash-grid">
        ${dashCard('quran-today', t('Today'), 'green', today.verses, p.dailyGoal, `${today.verses}/${p.dailyGoal} ${t('verses')}`, '#')}
        ${dashCard('quran-total', t('All time'), 'blue', totalVerses, Math.max(totalVerses, 1), `${totalVerses} ${t('verses read')}`, '#')}
      </div>
      <h3 style="margin-top:16px">${t('Last 7 days')}</h3>
      ${statsBarChartSvg(labels, values, 'green')}
    </section>
  `;
}

// ─── Data loading + navigation ──────────────────────────────────────────────
async function ensureQuranChapterList() {
  if (quranChapterListCache) return quranChapterListCache;
  quranChapterListCache = await QuranService.getChapterList();
  return quranChapterListCache;
}

async function openSurah(id, ayahToJump) {
  quranState.loading = true;
  quranState.error = null;
  renderPrayerRoot();
  try {
    await ensureQuranChapterList();
    const ch = await QuranService.getChapter(id);
    quranState.currentSurah = ch;
    quranState.view = 'read';
    quranState.loading = false;
    logQuranReading(ch);
    renderPrayerRoot();
    if (ayahToJump) {
      window.requestAnimationFrame(() => {
        const el = document.getElementById(`ayah-${ayahToJump}`);
        if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('is-highlighted'); }
      });
    }
  } catch (err) {
    quranState.loading = false;
    quranState.error = err && err.message ? err.message : String(err);
    renderPrayerRoot();
  }
}

function logQuranReading(ch) {
  const p = currentData.quranProgress;
  const today = quranTodayIso();
  const entry = p.readLog[today] || (p.readLog[today] = { verses: 0, surahs: [] });
  if (!entry.surahs.includes(ch.id)) {
    entry.surahs.push(ch.id);
    entry.verses += ch.total_verses;
  }
  p.lastSurah = ch.id;
  p.lastAyah = 1;
  p.lastReadAt = new Date().toISOString();
  persist();
}

// ─── Events ─────────────────────────────────────────────────────────────────
function bindQuranRootEvents(root) {
  if (!quranChapterListCache && !quranState.loading && !quranState.error) {
    quranState.loading = true;
    ensureQuranChapterList().then(() => { quranState.loading = false; renderPrayerRoot(); })
      .catch((err) => { quranState.loading = false; quranState.error = err.message || String(err); renderPrayerRoot(); });
    return;
  }

  root.querySelectorAll('[data-qr-fontsize]').forEach((btn) => btn.addEventListener('click', () => {
    quranState.fontSize = btn.dataset.qrFontsize;
    currentData.quranProgress.readingSettings.fontSize = quranState.fontSize;
    persist();
    renderPrayerRoot();
  }));

  const settings = currentData.quranProgress.readingSettings;
  const saveReadingSetting = (key, value) => { settings[key] = value; persist(); renderPrayerRoot(); };
  const modeSelect = root.querySelector('[data-qr-reading-mode]');
  if (modeSelect) modeSelect.addEventListener('change', () => saveReadingSetting('mode', modeSelect.value));
  const fontSelect = root.querySelector('[data-qr-font-family]');
  if (fontSelect) fontSelect.addEventListener('change', () => saveReadingSetting('fontFamily', fontSelect.value));
  const lineSelect = root.querySelector('[data-qr-line-height]');
  if (lineSelect) lineSelect.addEventListener('change', () => saveReadingSetting('lineHeight', lineSelect.value));
  const focusButton = root.querySelector('[data-qr-focus]');
  if (focusButton) focusButton.addEventListener('click', () => saveReadingSetting('focus', !settings.focus));
  const scrollButton = root.querySelector('[data-qr-autoscroll]');
  if (scrollButton) scrollButton.addEventListener('click', () => {
    settings.autoScroll = !settings.autoScroll;
    if (quranState.autoScrollTimer) clearInterval(quranState.autoScrollTimer);
    quranState.autoScrollTimer = settings.autoScroll ? setInterval(() => window.scrollBy({ top: 1, behavior: 'smooth' }), 120) : null;
    persist();
    renderPrayerRoot();
  });
  const fullscreenButton = root.querySelector('[data-qr-fullscreen]');
  if (fullscreenButton) fullscreenButton.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
  });

  const retryBtn = root.querySelector('[data-qr-retry]');
  if (retryBtn) retryBtn.addEventListener('click', () => {
    quranState.error = null;
    quranChapterListCache = null;
    if (typeof DataService !== 'undefined' && typeof PathResolver !== 'undefined') DataService.clearCache(PathResolver.quranChapterIndex());
    renderPrayerRoot();
  });

  root.querySelectorAll('[data-qr-view]').forEach((btn) => btn.addEventListener('click', () => {
    quranState.view = btn.dataset.qrView;
    renderPrayerRoot();
  }));

  root.querySelectorAll('[data-qr-goal-start]').forEach((btn) => btn.addEventListener('click', () => {
    const val = btn.dataset.qrGoalStart;
    if (val === 'ramadan') startQuranGoal('ramadan', null);
    else startQuranGoal(`${val} ${t('Days')}`, Number(val));
    renderPrayerRoot();
    showToast(t('Reading goal started'), 'success');
  }));
  const goalCustomForm = root.querySelector('[data-qr-goal-custom]');
  if (goalCustomForm) goalCustomForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const days = Math.max(1, Number(new FormData(e.currentTarget).get('customDays')) || 30);
    startQuranGoal(`${days} ${t('Days')}`, days);
    renderPrayerRoot();
    showToast(t('Reading goal started'), 'success');
  });
  const goalCancelBtn = root.querySelector('[data-qr-goal-cancel]');
  if (goalCancelBtn) goalCancelBtn.addEventListener('click', () => { cancelQuranGoal(); renderPrayerRoot(); });
  root.querySelectorAll('[data-qr-open]').forEach((btn) => btn.addEventListener('click', () => {
    openSurah(Number(btn.dataset.qrOpen), btn.dataset.qrAyah ? Number(btn.dataset.qrAyah) : null);
  }));

  const searchInput = root.querySelector('[data-qr-search]');
  if (searchInput) {
    let timer = null;
    searchInput.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        quranState.search = searchInput.value;
        quranState.searchResults = null;
        renderPrayerRoot();
        if (quranState.search.trim().length >= 3) runQuranTextSearch(quranState.search.trim());
      }, 250);
    });
  }

  const continueBtn = root.querySelector('[data-qr-continue]');
  if (continueBtn) continueBtn.addEventListener('click', () => {
    const p = currentData.quranProgress;
    if (p.lastSurah) openSurah(p.lastSurah, p.lastAyah);
  });
  const dailyBtn = root.querySelector('[data-qr-daily]');
  if (dailyBtn) dailyBtn.addEventListener('click', () => openRandomOrDailyVerse(true));
  const randomBtn = root.querySelector('[data-qr-random]');
  if (randomBtn) randomBtn.addEventListener('click', () => openRandomOrDailyVerse(false));

  root.querySelectorAll('[data-qr-bookmark]').forEach((btn) => btn.addEventListener('click', () => toggleQuranSaved('quranBookmarks', Number(btn.dataset.qrBookmark))));
  root.querySelectorAll('[data-qr-favorite]').forEach((btn) => btn.addEventListener('click', () => toggleQuranSaved('quranFavorites', Number(btn.dataset.qrFavorite))));
  root.querySelectorAll('[data-qr-copy]').forEach((btn) => btn.addEventListener('click', () => copyAyah(Number(btn.dataset.qrCopy))));
  root.querySelectorAll('[data-qr-share]').forEach((btn) => btn.addEventListener('click', () => shareAyah(Number(btn.dataset.qrShare))));
  root.querySelectorAll('[data-qr-remove]').forEach((btn) => btn.addEventListener('click', () => {
    const [kind, id] = btn.dataset.qrRemove.split(':');
    const key = kind === 'bookmarks' ? 'quranBookmarks' : 'quranFavorites';
    currentData[key] = currentData[key].filter((x) => x.id !== id);
    persist();
    renderPrayerRoot();
  }));
}

function toggleQuranSaved(collection, ayahId) {
  const ch = quranState.currentSurah;
  if (!ch) return;
  const verse = ch.verses.find((v) => v.id === ayahId);
  if (!verse) return;
  const existingIdx = currentData[collection].findIndex((x) => x.surah === ch.id && x.ayah === ayahId);
  if (existingIdx >= 0) {
    currentData[collection].splice(existingIdx, 1);
  } else {
    currentData[collection].push({
      id: makeId(), surah: ch.id, ayah: ayahId, surahName: ch.transliteration,
      text: verse.text, createdAt: new Date().toISOString(),
    });
  }
  persist();
  renderPrayerRoot();
}

function copyAyah(ayahId) {
  const ch = quranState.currentSurah;
  const verse = ch && ch.verses.find((v) => v.id === ayahId);
  if (!verse) return;
  const text = `${verse.text}\n${verse.transliteration || ''}\n\u2014 ${ch.transliteration} ${ch.id}:${ayahId}`;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => showToast(t('Copied'), 'success')).catch(() => showToast(t('Could not copy'), 'danger'));
  } else {
    showToast(t('Copy is not supported in this browser'), 'danger');
  }
}

function shareAyah(ayahId) {
  const ch = quranState.currentSurah;
  const verse = ch && ch.verses.find((v) => v.id === ayahId);
  if (!verse) return;
  const text = `${verse.text}\n${verse.transliteration || ''}\n\u2014 ${ch.transliteration} ${ch.id}:${ayahId}`;
  if (navigator.share) {
    navigator.share({ text }).catch(() => {});
  } else {
    copyAyah(ayahId);
    showToast(t('Sharing isn\u2019t supported here \u2014 copied instead'), 'default');
  }
}

async function openRandomOrDailyVerse(isDaily) {
  quranState.loading = true;
  renderPrayerRoot();
  try {
    const list = await ensureQuranChapterList();
    let seed;
    if (isDaily) {
      const d = new Date();
      const start = new Date(d.getFullYear(), 0, 0);
      seed = Math.floor((d - start) / 86400000);
    } else {
      seed = Math.floor(Math.random() * 100000);
    }
    const totalVerses = list.reduce((s, c) => s + c.total_verses, 0);
    let n = seed % totalVerses;
    let chosen = list[0];
    for (const c of list) {
      if (n < c.total_verses) { chosen = c; break; }
      n -= c.total_verses;
    }
    quranState.loading = false;
    openSurah(chosen.id, n + 1);
  } catch (err) {
    quranState.loading = false;
    quranState.error = err.message || String(err);
    renderPrayerRoot();
  }
}

async function runQuranTextSearch(query) {
  quranState.searching = true;
  renderPrayerRoot();
  try {
    const chapters = await QuranService.getAllChapters();
    const q = query.toLowerCase();
    const results = [];
    chapters.forEach((ch) => {
      ch.verses.forEach((v) => {
        const hay = `${v.text} ${v.transliteration || ''}`.toLowerCase();
        if (hay.includes(q) || v.text.includes(query)) {
          results.push({ surahId: ch.id, surahName: ch.transliteration, ayahId: v.id, text: v.text, transliteration: v.transliteration });
        }
      });
    });
    quranState.searching = false;
    quranState.searchResults = results;
    renderPrayerRoot();
  } catch (err) {
    quranState.searching = false;
    quranState.error = err.message || String(err);
    renderPrayerRoot();
  }
}
