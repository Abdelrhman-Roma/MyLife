import { AuthService } from '../../services/AuthService.js';

function logAuthFailure(flow, error) {
  console.error(`[auth-page] ${flow} failed`, {
    code: error?.code || 'NO_CODE',
    message: error?.message || String(error),
    stack: error?.stack || '(no stack provided)',
  });
}

function message(id, text) {
  const element = document.getElementById(id);
  if (element) element.textContent = text;
}

function bridgeIntoLegacySession(user, remember) {
  const email = (user.email || '').trim().toLowerCase();
  if (!email) throw new Error('Firebase did not return an email address for this account.');
  const users = getUsers();
  let legacyUser = users.find((entry) => entry.email === email);
  if (!legacyUser) {
    legacyUser = {
      id: makeId(),
      name: user.displayName || email.split('@')[0],
      email,
      createdAt: new Date().toISOString(),
      firebaseUid: user.uid,
      oauthOnly: !user.providerData?.some((provider) => provider.providerId === 'password'),
    };
    users.push(legacyUser);
    saveUsers(users);
    saveData(email, emptyData(legacyUser.name));
  }
  if (remember) {
    localStorage.setItem(SESSION_KEY, email);
    sessionStorage.removeItem(SESSION_KEY);
  } else {
    sessionStorage.setItem(SESSION_KEY, email);
    localStorage.removeItem(SESSION_KEY);
  }
}

async function login(email, password, remember) {
  message('login-message', '');
  const result = await AuthService.signIn(email, password);
  if (!result.ok) {
    logAuthFailure('email login', result.error.original || result.error);
    message('login-message', result.error.message);
    return false;
  }
  try {
    bridgeIntoLegacySession(result.data, remember);
  } catch (error) {
    logAuthFailure('email login session bridge', error);
    message('login-message', `Signed in, but the dashboard session could not be prepared: ${error.message}`);
    return false;
  }
  navigateAfterAuth('pages/dashboard.html');
  return true;
}

async function register(displayName, email, password, confirmPassword) {
  message('register-message', '');
  if (!displayName) { message('register-message', 'Please enter your name.'); return false; }
  if (password !== confirmPassword) { message('register-message', 'Passwords do not match.'); return false; }
  const result = await AuthService.register(email, password, { displayName });
  if (!result.ok) {
    logAuthFailure('email registration', result.error.original || result.error);
    message('register-message', result.error.message);
    return false;
  }
  try {
    bridgeIntoLegacySession(result.data, true);
  } catch (error) {
    logAuthFailure('registration session bridge', error);
    message('register-message', `Account created, but the dashboard session could not be prepared: ${error.message}`);
    return false;
  }
  navigateAfterAuth('pages/dashboard.html');
  return true;
}

// Exposed before DOMContentLoaded so the classic shared.js submit handlers
// delegate to Firebase instead of the retired browser-only account store.
window.MomentumFirebaseAuth = { login, register, bridgeIntoLegacySession };
