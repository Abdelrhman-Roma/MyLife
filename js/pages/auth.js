// ─── Auth page: presentation & motion layer only ────────────────────────
// All real authentication logic (validation, session storage, redirect
// target) lives in shared.js's login()/register()/getSessionUser(). This
// file only makes the experience feel premium — nothing here decides
// whether a login/register attempt succeeds.

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
const MIN_LOADING_MS = 420;
document.addEventListener('DOMContentLoaded', () => {
  // Registered before initAuth() so these fire first on 'submit'.
  wireSubmitLoading('login-form', 'login-message');
  wireSubmitLoading('register-form', 'register-message');

  initAuth(); // shared.js — attaches the authoritative login/register handlers

  const langSlot = document.getElementById('auth-lang-switch');
  if (langSlot) { langSlot.innerHTML = languageSwitcherHtml(); bindLanguageSwitchers(langSlot); }
  applyTranslations(document);

  wirePasswordToggles();
  wireCapsLockHints();
  wireStrengthMeter();
  wireModeSwitch();
  wireCursorGlow();
  wireCardTilt();
  wireFieldLiveValidation();
  wireMotivationalMotto();

  document.addEventListener('mylife:i18n-change', () => {
    const page = document.getElementById('auth-page');
    applyAuthMode((page && page.dataset.mode) || 'login');
  });

  window.onAuthSuccess = handleAuthSuccess;
});

// ─── Loading state, wired ahead of the real submit handler ──────────────
function wireSubmitLoading(formId, msgId) {
  const form = document.getElementById(formId);
  if (!form) return;
  const btn = form.querySelector('.auth-submit');
  const msgEl = document.getElementById(msgId);
  let lastMsg = msgEl ? msgEl.textContent : '';
  let loadingStartedAt = 0;

  form.addEventListener('submit', () => {
    // The form deliberately uses novalidate so shared.js can provide the
    // authoritative validation. Do not leave the submit button spinning when
    // that validation rejects incomplete or malformed input.
    if (!form.checkValidity()) {
      setButtonState(btn, 'idle');
      return;
    }
    loadingStartedAt = Date.now();
    setButtonState(btn, 'loading');
  });

  if (!msgEl) return;
  const observer = new MutationObserver(() => {
    if (msgEl.textContent && msgEl.textContent !== lastMsg) {
      lastMsg = msgEl.textContent;
      const elapsed = Date.now() - loadingStartedAt;
      const wait = Math.max(0, MIN_LOADING_MS - elapsed);
      setTimeout(() => {
        setButtonState(btn, 'idle');
        const panel = form.closest('.auth-panel');
        const card = document.getElementById('auth-card');
        if (card) {
          card.classList.remove('is-shaking');
          void card.offsetWidth; // restart animation
          card.classList.add('is-shaking');
        }
        markInvalidFieldsFromMessage(panel, msgEl.textContent);
      }, wait);
    }
  });
  observer.observe(msgEl, { childList: true, characterData: true, subtree: true });
}

function setButtonState(btn, state) {
  if (!btn) return;
  btn.classList.remove('is-loading', 'is-success');
  if (state === 'loading') btn.classList.add('is-loading');
  if (state === 'success') btn.classList.add('is-success');
}

// Best-effort mapping of the authoritative error message to a field, purely
// for the shake/red-glow visual — the message itself is unchanged and is
// still what screen readers announce via role="alert".
function markInvalidFieldsFromMessage(panel, message) {
  if (!panel) return;
  panel.querySelectorAll('.field.is-invalid').forEach((f) => f.classList.remove('is-invalid'));
  const lower = message.toLowerCase();
  let target = null;
  if (lower.includes('email') || lower.includes('password')) {
    target = panel.querySelector('[data-field="password"]') || panel.querySelector('[data-field="email"]');
  }
  if (lower.includes('match')) target = panel.querySelector('[data-field="confirm"]');
  if (lower.includes('registered')) target = panel.querySelector('[data-field="email"]');
  if (target) {
    target.classList.add('is-invalid');
    setTimeout(() => target.classList.remove('is-invalid'), 700);
  }
}

// ─── Success: button morph → subtle confetti → page veil → navigate ────
function handleAuthSuccess(targetUrl) {
  const panel = document.querySelector('.auth-panel:not(.hidden)');
  const btn = panel ? panel.querySelector('.auth-submit') : null;
  setButtonState(btn, 'success');
  if (!prefersReducedMotion) launchConfetti();

  const veil = document.getElementById('page-veil');
  setTimeout(() => {
    if (veil) veil.classList.add('active');
    setTimeout(() => { window.location.href = targetUrl; }, prefersReducedMotion ? 0 : 380);
  }, prefersReducedMotion ? 0 : 620);
}

// ─── Password show/hide ─────────────────────────────────────────────────
function wirePasswordToggles() {
  document.querySelectorAll('.field-eye').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.eyeFor);
      if (!input) return;
      const showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      btn.classList.toggle('is-visible', !showing);
      btn.setAttribute('aria-label', showing ? t('Show password') : t('Hide password'));
      input.focus({ preventScroll: true });
    });
  });
}

// ─── Caps Lock hint ─────────────────────────────────────────────────────
function wireCapsLockHints() {
  document.querySelectorAll('[data-capslock-for]').forEach((hint) => {
    const input = document.getElementById(hint.dataset.capslockFor);
    if (!input) return;
    const check = (e) => {
      const on = typeof e.getModifierState === 'function' && e.getModifierState('CapsLock');
      hint.hidden = !on;
    };
    input.addEventListener('keyup', check);
    input.addEventListener('keydown', check);
    input.addEventListener('blur', () => { hint.hidden = true; });
  });
}

// ─── Password strength meter (register only) ───────────────────────────
function wireStrengthMeter() {
  const meter = document.querySelector('[data-strength-for="register-password"]');
  const label = document.querySelector('[data-strength-label-for="register-password"]');
  const input = document.getElementById('register-password');
  if (!meter || !input) return;

  const labels = ['Too short', 'Weak', 'Okay', 'Good', 'Strong'];

  input.addEventListener('input', () => {
    const v = input.value;
    let score = 0;
    if (v.length >= 6) score++;
    if (v.length >= 10) score++;
    if (/[A-Z]/.test(v) && /[a-z]/.test(v)) score++;
    if (/[0-9]/.test(v) || /[^A-Za-z0-9]/.test(v)) score++;
    score = v.length === 0 ? 0 : Math.max(1, Math.min(4, score));
    meter.dataset.score = v.length === 0 ? '0' : String(score);
    label.textContent = v.length === 0 ? '' : labels[score];
  });
}

function applyAuthMode(mode) {
  const page = document.getElementById('auth-page');
  const headline = document.querySelector('.auth-headline');
  const subline = document.querySelector('.auth-subline');
  if (page) page.dataset.mode = mode;
  document.body.dataset.authMode = mode;
  if (headline) headline.innerHTML = t(headline.dataset[mode + 'Text'] || headline.innerHTML);
  if (subline) subline.textContent = t(subline.dataset[mode + 'Text'] || subline.textContent);
  replayReveal(document.querySelector(`#${mode}-panel`));
}

function wireMotivationalMotto() {
  const motto = document.getElementById('auth-motto');
  if (!motto || prefersReducedMotion) return;
  const lines = ['Build Better Habits.', 'Stay Consistent.', 'Progress Beats Perfection.', 'Unlock Your Potential.', 'Become Better Than Yesterday.'];
  let current = 0;
  window.setInterval(() => {
    let next = current;
    while (next === current) next = Math.floor(Math.random() * lines.length);
    motto.classList.add('is-changing');
    window.setTimeout(() => { motto.textContent = lines[next]; current = next; motto.classList.remove('is-changing'); }, 180);
  }, 10000);
}

// ─── Login ⇄ Register: swap headline/subline personality + aurora mode ─
function wireModeSwitch() {
  const showRegister = document.getElementById('show-register');
  const showLogin = document.getElementById('show-login');
  if (showRegister) showRegister.addEventListener('click', () => applyAuthMode('register'));
  if (showLogin) showLogin.addEventListener('click', () => applyAuthMode('login'));
}

function replayReveal(panel) {
  if (!panel || prefersReducedMotion) return;
  panel.querySelectorAll('.reveal').forEach((el) => {
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
  });
}

// ─── Cursor spotlight (desktop, pointer:fine only) ──────────────────────
function wireCursorGlow() {
  if (isCoarsePointer || prefersReducedMotion) return;
  const glow = document.getElementById('cursor-glow');
  if (!glow) return;
  let raf = null;
  document.addEventListener('mousemove', (e) => {
    glow.classList.add('active');
    if (raf) return;
    raf = requestAnimationFrame(() => {
      glow.style.setProperty('--mx', e.clientX + 'px');
      glow.style.setProperty('--my', e.clientY + 'px');
      raf = null;
    });
  });
  document.addEventListener('mouseleave', () => glow.classList.remove('active'));
}

// ─── Subtle card tilt on mouse move (desktop only) ──────────────────────
function wireCardTilt() {
  if (isCoarsePointer || prefersReducedMotion) return;
  const card = document.getElementById('auth-card');
  if (!card) return;
  let raf = null;

  card.addEventListener('mousemove', (e) => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `rotateY(${px * 4}deg) rotateX(${-py * 4}deg) translateZ(0)`;
      raf = null;
    });
  });

  card.addEventListener('mouseleave', () => {
    card.style.transform = 'rotateY(0deg) rotateX(0deg)';
  });
}

// ─── Live inline validation (cosmetic only — real checks stay in shared.js) ─
function wireFieldLiveValidation() {
  document.querySelectorAll('.field input').forEach((input) => {
    input.addEventListener('blur', () => {
      const field = input.closest('.field');
      if (!field || !input.value) { if (field) field.classList.remove('is-valid', 'is-invalid'); return; }
      const ok = input.checkValidity();
      field.classList.toggle('is-valid', ok);
      field.classList.toggle('is-invalid', !ok);
    });
    input.addEventListener('input', () => {
      const field = input.closest('.field');
      if (field) field.classList.remove('is-invalid');
    });
  });
}

// ─── Tiny, self-contained confetti burst (no external asset/library) ───
function launchConfetti() {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;z-index:9998;pointer-events:none;';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const colors = ['#2563eb', '#059669', '#7c3aed', '#d97706'];
  const originX = window.innerWidth / 2;
  const originY = window.innerHeight / 2;

  const particles = Array.from({ length: 36 }, () => ({
    x: originX,
    y: originY,
    vx: (Math.random() - 0.5) * 9,
    vy: (Math.random() - 1.4) * 9,
    size: 4 + Math.random() * 4,
    color: colors[Math.floor(Math.random() * colors.length)],
    life: 1,
  }));

  let frame = 0;
  function tick() {
    frame++;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    particles.forEach((p) => {
      p.vy += 0.22;
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.014;
      if (p.life > 0) {
        alive = true;
        ctx.globalAlpha = Math.max(p.life, 0);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
    });
    ctx.globalAlpha = 1;
    if (alive && frame < 140) requestAnimationFrame(tick);
    else canvas.remove();
  }
  requestAnimationFrame(tick);
}
