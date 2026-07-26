// MyLife — Prayer module (Phase 3).
// currentData.prayers is now a real 5-daily-prayer log (auto-generated for
// each new day by normalizeData() in shared.js), not free-form entries.
//
// Note on content: this module deliberately does NOT ship any pre-written
// Hadith text. Misattributing or mis-transcribing a hadith is treated
// seriously in Islamic scholarship, and Claude can't guarantee the accuracy
// of a hardcoded hadith database from memory. Instead, the "rotation"
// feature rotates through hadith the person adds themselves (with their own
// source citation), which sidesteps that risk entirely. Same reasoning for
// the Quran tracker: it logs *references* (surah/ayah/pages), never
// reproduces Qur'an text.

const PRAYER_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const HIJRI_MONTHS = [
  'Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Thani", 'Jumada al-Awwal', 'Jumada al-Thani',
  'Rajab', "Sha'ban", 'Ramadan', 'Shawwal', "Dhu al-Qi'dah", 'Dhu al-Hijjah',
];

let prayerState = { hadithModal: false, quranModal: false };

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
  renderArt('prayer');
  renderPrayerRoot();
}

function renderPrayerRoot() {
  const root = byId('prayer-root');
  if (!root) return;
  const today = currentData.prayers.filter((p) => p.date === prayerTodayIso())
    .sort((a, b) => PRAYER_NAMES.indexOf(a.prayer) - PRAYER_NAMES.indexOf(b.prayer));
  const streaks = prayerStreaks();
  const missed = missedPrayerInsights();
  const hijri = todayHijri();

  root.innerHTML = `
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

  bindPrayerRootEvents(root);
  renderHadithModal();
  renderQuranModal();
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
