// ─── MOMENTUM i18n engine ──────────────────────────────────────────────────
// Lightweight, dependency-free i18n for a static multi-page app.
//
// Design choices, and why:
// - Translations are loaded as plain JS objects (locales/en.js, locales/ar.js
//   set window.MOMENTUM_LOCALES.en / .ar) instead of fetched JSON files. Most
//   people will open this app straight from a file:// URL (double-clicking
//   index.html) rather than through a dev server, and Chrome blocks
//   fetch()/XHR of local JSON under file:// due to CORS. Plain <script>
//   tags always work regardless of how the app is opened, and both
//   language packs are tiny, so loading both eagerly costs nothing and
//   makes switching instant (no network round-trip at all).
// - t(str) looks the ENGLISH STRING up as the dictionary key (rather than
//   introducing a new key namespace like t('nav.dashboard')). This app's
//   UI strings are already scattered as literals through ~14 JS files;
//   keying off the English text lets every call site be wrapped with
//   minimal, low-risk changes, and anything not yet translated just
//   falls back to the original English string — never a blank or broken UI.

const I18N_KEY = 'mylife.lang';
const RTL_LANGS = ['ar'];

function getLang() {
  return localStorage.getItem(I18N_KEY) || 'en';
}

function isRtl(lang) {
  return RTL_LANGS.includes(lang || getLang());
}

// t(str, vars?) — translate an English source string into the active
// language. Supports {placeholder} interpolation. Falls back to the
// English string itself (never throws, never returns blank).
function t(str, vars) {
  if (!str) return str;
  const lang = getLang();
  const dict = (window.MOMENTUM_LOCALES && window.MOMENTUM_LOCALES[lang]) || {};
  let out = Object.prototype.hasOwnProperty.call(dict, str) ? dict[str] : str;
  if (vars) {
    Object.keys(vars).forEach((k) => { out = out.replace(new RegExp(`\\{${k}\\}`, 'g'), vars[k]); });
  }
  return out;
}

// Format a date/number using the active language's locale — replaces any
// hard-coded en-US date formatting so numbers/dates read naturally in Arabic.
function formatDateLocalized(date, opts = { month: 'short', day: 'numeric', year: 'numeric' }) {
  const lang = getLang();
  try {
    return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-US', opts).format(new Date(date));
  } catch (_e) {
    return String(date);
  }
}

// Walk the DOM applying declarative translations:
//   data-i18n="English text"              → sets textContent
//   data-i18n-html="English text"         → sets innerHTML (rare; only for
//                                             short trusted strings with markup)
//   data-i18n-attr="placeholder:Email"    → translates and sets an attribute
//                                             ("attr:English text", multiple
//                                             pairs separated by "|")
function applyTranslations(root) {
  const scope = root || document;
  scope.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.getAttribute('data-i18n')); });
  scope.querySelectorAll('[data-i18n-html]').forEach((el) => { el.innerHTML = t(el.getAttribute('data-i18n-html')); });
  scope.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    el.getAttribute('data-i18n-attr').split('|').forEach((pair) => {
      const idx = pair.indexOf(':');
      if (idx === -1) return;
      const attr = pair.slice(0, idx).trim();
      const text = pair.slice(idx + 1);
      el.setAttribute(attr, t(text));
    });
  });
}

// Apply <html lang/dir>, persist choice, retranslate the DOM, and let every
// page's own content re-render itself in the new language — all without a
// page refresh.
function setLanguage(lang) {
  localStorage.setItem(I18N_KEY, lang);
  const rtl = isRtl(lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = rtl ? 'rtl' : 'ltr';
  document.documentElement.dataset.lang = lang;
  applyTranslations(document);
  document.querySelectorAll('[data-lang-switch]').forEach((btn) => {
    btn.setAttribute('aria-pressed', String(btn.dataset.langSwitch === lang));
  });
  document.dispatchEvent(new CustomEvent('mylife:i18n-change', { detail: { lang } }));
}

// Apply the persisted language as early as possible (called at the very top
// of every page, before other rendering) so there's no flash of the wrong
// language/direction.
function initI18n() {
  const lang = getLang();
  document.documentElement.lang = lang;
  document.documentElement.dir = isRtl(lang) ? 'rtl' : 'ltr';
  document.documentElement.dataset.lang = lang;
}

// Builds a small, reusable language-switcher control. Any container can call
// renderLanguageSwitcher() and get a working EN/AR toggle.
function languageSwitcherHtml() {
  const lang = getLang();
  const langs = [['en', 'EN'], ['ar', 'AR'], ['fr', 'FR'], ['de', 'DE']];
  return `
    <div class="lang-switch" role="group" aria-label="${t('Language')}">
      ${langs.map(([code, label]) => `<button type="button" class="lang-switch-btn" data-lang-switch="${code}" aria-pressed="${lang === code}">${label}</button>`).join('')}
    </div>
  `;
}

function bindLanguageSwitchers(root) {
  const scope = root || document;
  scope.querySelectorAll('[data-lang-switch]').forEach((btn) => {
    if (btn.dataset.langBound) return;
    btn.dataset.langBound = 'true';
    btn.addEventListener('click', () => setLanguage(btn.dataset.langSwitch));
  });
}

initI18n();
