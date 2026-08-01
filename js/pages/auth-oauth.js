// js/pages/auth-oauth.js — Phase 5: real Google/GitHub sign-in.
//
// This is a genuine ES module (imports AuthService directly) loaded
// alongside the existing plain-script auth.js — the email login/register
// flow on this page is UNCHANGED and still the pre-Firebase local system;
// this file only adds the two new OAuth buttons, using the real
// services/AuthService.js built in Phase 1.
//
// IMPORTANT, DISCLOSED INTEGRATION SEAM: every other page's session guard
// (shared.js's bootShell()) still checks the OLD local session
// (getSessionUser()/localStorage), synchronously, at page load — it has no
// knowledge of Firebase Auth. Rewiring bootShell() itself onto Firebase
// Auth (which restores its session asynchronously) across all 12 pages is
// a real, separate migration this phase does not attempt. Instead, after a
// successful Google/GitHub sign-in, this file ALSO creates/updates a local
// "bridge" user record and local session marker in the exact shape login()/
// register() already produce (see shared.js) — so navigating to any
// unmigrated page continues to work today. This is a pragmatic bridge, not
// a claim that the whole app now runs on Firebase Auth end to end; see
// AUTHENTICATION.md for the follow-up this sets up.
import { AuthService } from '../../services/AuthService.js';

document.addEventListener('DOMContentLoaded', async () => {
  document.querySelectorAll('[data-oauth]').forEach((btn) => {
    btn.addEventListener('click', (event) => { event.preventDefault(); handleOAuthClick(btn); });
  });
  await completeRedirectOAuth();
});

async function handleOAuthClick(btn) {
  const providerId = btn.dataset.oauth; // 'google' | 'github'
  const mode = btn.dataset.oauthMode; // 'login' | 'register' — identical behavior either way, per the brief
  const messageEl = document.getElementById(mode === 'register' ? 'register-oauth-message' : 'login-oauth-message');
  const row = btn.closest('.auth-oauth-row');

  setOAuthLoading(row, btn, true);
  if (messageEl) messageEl.textContent = '';

  const remember = document.getElementById('remember-me')?.checked ?? true;
  const result = await AuthService.signInWithProvider(providerId, { remember });

  if (!result.ok) {
    console.error(`[auth] ${providerId} popup sign-in failed.`, result.error.original);
    if (result.error.code === 'auth/popup-blocked') {
      // A popup blocker is the only recoverable popup failure that should
      // automatically navigate away. A user closing a popup should remain
      // here with a clear retry message.
      const redirectResult = await AuthService.signInWithProviderRedirect(providerId, { remember });
      if (redirectResult.ok) return;
      console.error(`[auth] ${providerId} redirect sign-in could not start.`, redirectResult.error.original);
      if (messageEl) messageEl.textContent = redirectResult.error.message;
      setOAuthLoading(row, btn, false);
      return;
    }
    setOAuthLoading(row, btn, false);
    if (messageEl) messageEl.textContent = result.error.message; // already a friendly, mapped message — see core/ErrorMapper.js
    return;
  }

  try {
    bridgeIntoLocalSession(result.data);
  } catch (error) {
    console.error('[auth] Firebase sign-in succeeded but the local session bridge failed.', error);
    if (messageEl) messageEl.textContent = 'Sign-in completed, but Momentum could not finish setting up this device. Please try again.';
    setOAuthLoading(row, btn, false);
    return;
    // If the bridge itself fails for some reason, the user is still validly
    // signed in with Firebase — better to continue than to strand them on
    // the auth page with a successful sign-in and no error to show.
  }

  // Reuse the existing page's success transition (button morph, confetti,
  // page-veil) exactly the way email login/register already does.
  if (typeof window.onAuthSuccess === 'function') window.onAuthSuccess('pages/dashboard.html');
  else window.location.href = 'pages/dashboard.html';
}

async function completeRedirectOAuth() {
  const result = await AuthService.completeProviderRedirect();
  if (!result.ok) {
    console.error('[auth] OAuth redirect completion failed.', result.error.original);
    const messageEl = document.getElementById('login-oauth-message');
    if (messageEl) messageEl.textContent = result.error.message;
    return;
  }
  if (!result.data) return;
  bridgeIntoLocalSession(result.data);
  if (typeof window.onAuthSuccess === 'function') window.onAuthSuccess('pages/dashboard.html');
  else window.location.href = 'pages/dashboard.html';
}

function setOAuthLoading(row, activeBtn, loading) {
  row.querySelectorAll('.auth-oauth-btn').forEach((b) => {
    b.disabled = loading && b !== activeBtn ? true : loading; // both buttons disable; only the clicked one shows its spinner
    b.classList.toggle('is-loading', loading && b === activeBtn);
    b.setAttribute('aria-busy', loading && b === activeBtn ? 'true' : 'false');
  });
}

/**
 * Bridges a real Firebase Auth user into the existing local-session system
 * (see file header) so bootShell() on unmigrated pages recognizes the user
 * as signed in without itself being rewired this phase.
 * @param {import('firebase/auth').User} fbUser
 */
function bridgeIntoLocalSession(fbUser) {
  const email = (fbUser.email || '').toLowerCase();
  if (!email) return;
  const users = getUsers(); // global from shared.js
  let user = users.find((u) => u.email === email);
  if (!user) {
    user = {
      id: makeId(), // global from shared.js
      name: fbUser.displayName || email.split('@')[0],
      email,
      createdAt: new Date().toISOString(),
      oauthOnly: true, // no local password — email/password login for this user goes through Firebase, not verifyPassword()
    };
    users.push(user);
    saveUsers(users); // global from shared.js
    saveData(email, emptyData(user.name)); // global from shared.js — same "seed a fresh account" path register() uses
  }
  localStorage.setItem(SESSION_KEY, email); // global constant from shared.js — same key login()/register() use
  sessionStorage.removeItem(SESSION_KEY);
}
