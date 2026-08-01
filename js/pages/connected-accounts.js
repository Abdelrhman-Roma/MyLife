// js/pages/connected-accounts.js — Phase 5.
// Self-contained "Connected accounts" panel on the Profile page (see
// pages/account.html's header comment for why this is separate from
// account.js). Renders avatar/verified badge/provider badges and
// connect/disconnect actions using the real services/AuthService.js.
import { AuthService } from '../../services/AuthService.js';

const PROVIDER_META = {
  email: { label: 'Email', icon: '\u2709\ufe0f' },
  google: { label: 'Google', icon: 'G' },
  github: { label: 'GitHub', icon: '\u2325' },
};

document.addEventListener('DOMContentLoaded', async () => {
  const root = document.getElementById('connected-accounts-root');
  if (!root) return;

  await AuthService.waitUntilReady();
  render(root);
  AuthService.onAuthStateChange(() => render(root));
});

function render(root) {
  const user = AuthService.getCurrentUser();

  if (!user) {
    // Signed in only through the old local session bridge (see
    // js/pages/auth-oauth.js), not through Firebase Auth directly (e.g. a
    // plain email/password account that has never used a Google/GitHub
    // button) — nothing to manage here yet, and saying so plainly beats
    // silently rendering nothing.
    root.innerHTML = `
      <h3>${t ? t('Connected accounts') : 'Connected accounts'}</h3>
      <p class="muted">${t ? t('Sign in with Google or GitHub at least once to manage connected accounts here.') : 'Sign in with Google or GitHub at least once to manage connected accounts here.'}</p>
    `;
    return;
  }

  const avatar = AuthService.getAvatar();
  const providers = AuthService.getConnectedProviders();
  const created = user.metadata?.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : '\u2014';
  const lastLogin = user.metadata?.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleString() : '\u2014';

  root.innerHTML = `
    <h3>${t ? t('Connected accounts') : 'Connected accounts'}</h3>
    <div class="ca-identity">
      <span class="ca-avatar">${avatar.type === 'photo'
        ? `<img src="${escapeAttr(avatar.url)}" alt="" referrerpolicy="no-referrer" data-ca-avatar-fallback-initials="${escapeAttr(avatar.initials || '?')}" />`
        : `<span class="ca-avatar-fallback" style="background:${escapeAttr(avatar.color)}">${escapeHtml(avatar.initials)}</span>`}
      </span>
      <div>
        <p class="ca-name">${escapeHtml(user.displayName || '(no name set)')} ${user.emailVerified ? `<span class="ca-verified-badge" title="${t ? t('Verified') : 'Verified'}">\u2713</span>` : ''}</p>
        <p class="ca-email muted">${escapeHtml(user.email || '')}</p>
        <p class="ca-meta muted">${t ? t('Joined') : 'Joined'} ${created} \u00b7 ${t ? t('Last login') : 'Last login'}: ${lastLogin}</p>
      </div>
    </div>
    <div class="ca-provider-list">
      ${providers.map((p) => providerRowHtml(p, providers)).join('')}
    </div>
    <p class="form-message" id="ca-message" role="alert"></p>
  `;

  root.querySelectorAll('[data-ca-connect]').forEach((btn) => btn.addEventListener('click', () => onConnect(root, btn.dataset.caConnect)));
  root.querySelectorAll('[data-ca-disconnect]').forEach((btn) => btn.addEventListener('click', () => onDisconnect(root, btn.dataset.caDisconnect)));
  const avatarImg = root.querySelector('[data-ca-avatar-fallback-initials]');
  if (avatarImg) {
    avatarImg.addEventListener('error', () => {
      const fallback = document.createElement('span');
      fallback.className = 'ca-avatar-fallback';
      fallback.textContent = avatarImg.dataset.caAvatarFallbackInitials || '?'; // safe: .textContent, never HTML-parsed
      avatarImg.replaceWith(fallback);
    }, { once: true });
  }
}

function providerRowHtml(provider, allProviders) {
  const meta = PROVIDER_META[provider.id];
  const isLastMethod = provider.connected && allProviders.filter((p) => p.connected).length <= 1;
  return `
    <div class="ca-provider-row">
      <span class="ca-provider-icon" aria-hidden="true">${meta.icon}</span>
      <span class="ca-provider-label">${meta.label}</span>
      <span class="ca-provider-status ${provider.connected ? 'is-connected' : ''}">${provider.connected ? (t ? t('Connected') : 'Connected') : (t ? t('Not connected') : 'Not connected')}</span>
      ${provider.id === 'email'
        ? '' // Email connect/disconnect isn't handled by this OAuth-focused panel; see AUTHENTICATION.md
        : provider.connected
          ? `<button type="button" class="secondary-btn" data-ca-disconnect="${provider.id}" ${isLastMethod ? 'disabled title="' + (t ? t('You can\u2019t remove your only sign-in method') : 'You can\u2019t remove your only sign-in method') + '"' : ''}>${t ? t('Disconnect') : 'Disconnect'}</button>`
          : `<button type="button" class="secondary-btn" data-ca-connect="${provider.id}">${t ? t('Connect') : 'Connect'}</button>`}
    </div>
  `;
}

async function onConnect(root, providerId) {
  const msg = root.querySelector('#ca-message');
  if (msg) msg.textContent = '';
  const result = await AuthService.linkProvider(providerId);
  if (!result.ok) { if (msg) msg.textContent = result.error.message; return; }
  render(root);
}

async function onDisconnect(root, providerId) {
  const msg = root.querySelector('#ca-message');
  if (msg) msg.textContent = '';
  const result = await AuthService.unlinkProvider(providerId);
  if (!result.ok) { if (msg) msg.textContent = result.error.message; return; }
  render(root);
}
