/**
 * core/ErrorMapper.js
 * ---------------------------------------------------------------------------
 * Centralized error handling. Every service/repository in this project should
 * catch raw Firebase errors and pass them through `mapFirebaseError()` before
 * they reach UI code, so pages never need to know a raw Firebase error code
 * (e.g. "auth/network-request-failed") — they just get a stable `category`
 * to branch on and a `message` that's safe to show a user.
 *
 * @typedef {'network'|'permission'|'not-found'|'timeout'|'unavailable'|'auth-expired'|'validation'|'unknown'} ErrorCategory
 *
 * @typedef {Object} MappedError
 * @property {ErrorCategory} category
 * @property {string} message      - safe to display to the user
 * @property {string} code         - the original Firebase error code, if any
 * @property {boolean} retryable   - whether a retry is likely to help
 * @property {unknown} original    - the original thrown error, for logging
 */

/** @type {Record<string, { category: ErrorCategory, message: string, retryable: boolean }>} */
const CODE_MAP = {
  // Network
  'unavailable': { category: 'unavailable', message: 'MyLife can\u2019t reach the server right now. Please try again in a moment.', retryable: true },
  'auth/network-request-failed': { category: 'network', message: 'You appear to be offline. Changes will sync once you\u2019re back online.', retryable: true },

  // Permission
  'permission-denied': { category: 'permission', message: 'You don\u2019t have permission to do that.', retryable: false },
  'auth/user-disabled': { category: 'permission', message: 'This account has been disabled. Contact support if you think this is a mistake.', retryable: false },

  // Not found
  'not-found': { category: 'not-found', message: 'That item no longer exists \u2014 it may have been deleted elsewhere.', retryable: false },
  'auth/user-not-found': { category: 'not-found', message: 'No account was found with that email.', retryable: false },

  // Timeout
  'deadline-exceeded': { category: 'timeout', message: 'That took too long to respond. Please try again.', retryable: true },

  // Auth expired / invalid credentials
  'auth/id-token-expired': { category: 'auth-expired', message: 'Your session has expired. Please sign in again.', retryable: false },
  'auth/requires-recent-login': { category: 'auth-expired', message: 'Please sign in again to complete this sensitive action.', retryable: false },
  'auth/wrong-password': { category: 'validation', message: 'Incorrect email or password.', retryable: false },
  'auth/invalid-credential': { category: 'validation', message: 'Incorrect email or password.', retryable: false },
  'auth/email-already-in-use': { category: 'validation', message: 'An account with that email already exists.', retryable: false },
  'auth/weak-password': { category: 'validation', message: 'Please choose a stronger password (at least 6 characters).', retryable: false },
  'auth/invalid-email': { category: 'validation', message: 'That doesn\u2019t look like a valid email address.', retryable: false },
  'auth/too-many-requests': { category: 'validation', message: 'Too many attempts. Please wait a moment before trying again.', retryable: true },
  'auth/operation-not-allowed': { category: 'validation', message: 'This sign-in method is not enabled in the Firebase project. Enable it in Firebase Authentication → Sign-in method.', retryable: false },
  'auth/unauthorized-domain': { category: 'validation', message: 'This domain is not authorized for Firebase sign-in. Add it in Firebase Authentication → Settings → Authorized domains.', retryable: false },
  'auth/invalid-api-key': { category: 'validation', message: 'Firebase rejected the API key. Check VITE_FIREBASE_API_KEY and restart the development server.', retryable: false },
  'auth/app-not-authorized': { category: 'permission', message: 'This application is not authorized to use the configured Firebase project. Check the Firebase web app configuration.', retryable: false },
  'auth/invalid-oauth-client-id': { category: 'validation', message: 'The OAuth client configuration is invalid. Check the Google or GitHub provider settings in Firebase.', retryable: false },
  'auth/web-storage-unsupported': { category: 'validation', message: 'Your browser is blocking the storage Firebase needs for sign-in. Allow site storage and try again.', retryable: false },
  'auth/internal-error': { category: 'unknown', message: 'Firebase returned an internal authentication error. Check the browser console entry for the Firebase code and message.', retryable: true },

  // Phase 5: OAuth provider sign-in / account-linking errors.
  'auth/popup-closed-by-user': { category: 'validation', message: 'Sign-in was closed before it finished. Please try again.', retryable: true },
  'auth/cancelled-popup-request': { category: 'validation', message: 'Sign-in was cancelled. Please try again.', retryable: true },
  'auth/popup-blocked': { category: 'validation', message: 'Your browser blocked the sign-in popup. Please allow popups for this site and try again.', retryable: true },
  'auth/account-exists-with-different-credential': { category: 'validation', message: 'An account already exists with this email using a different sign-in method. Try signing in with that method instead.', retryable: false },
  'auth/credential-already-in-use': { category: 'validation', message: 'That account is already linked to a different MyLife user.', retryable: false },
  'auth/provider-already-linked': { category: 'validation', message: 'This sign-in method is already connected to your account.', retryable: false },
  'auth/no-such-provider': { category: 'validation', message: 'That sign-in method isn\u2019t connected to your account.', retryable: false },
  'auth/user-token-expired': { category: 'auth-expired', message: 'Your session has expired. Please sign in again.', retryable: false },
  'auth/user-mismatch': { category: 'validation', message: 'That doesn\u2019t match the currently signed-in account.', retryable: false },
};

/**
 * Maps any thrown Firebase (or network) error into a stable, UI-safe shape.
 * Never throws itself — always returns a MappedError, even for totally
 * unrecognized errors (category: 'unknown').
 * @param {unknown} error
 * @returns {MappedError}
 */
export function mapFirebaseError(error) {
  const code = (error && typeof error === 'object' && 'code' in error) ? String(error.code) : '';
  const known = CODE_MAP[code];
  if (known) {
    return { category: known.category, message: known.message, code, retryable: known.retryable, original: error };
  }

  // Fall back to categorizing by common substrings when the SDK throws a
  // plain Error (e.g. a raw `fetch` failure) rather than a FirebaseError.
  const msg = String(error && error.message || error || '').toLowerCase();
  if (msg.includes('network') || msg.includes('offline') || msg.includes('fetch')) {
    return { category: 'network', message: 'You appear to be offline. Changes will sync once you\u2019re back online.', code, retryable: true, original: error };
  }
  if (msg.includes('timeout') || msg.includes('deadline')) {
    return { category: 'timeout', message: 'That took too long to respond. Please try again.', code, retryable: true, original: error };
  }

  const detail = String(error && error.message || '').trim();
  return {
    category: 'unknown',
    message: code
      ? `Authentication failed (${code})${detail ? `: ${detail}` : '.'}`
      : (detail || 'Authentication failed before Firebase returned an error code. Check the browser console for the logged cause.'),
    code,
    retryable: true,
    original: error,
  };
}

/**
 * Convenience helper: run an async function and, on failure, return a
 * `{ ok: false, error: MappedError }` result instead of throwing — useful in
 * repository methods that want to hand a predictable shape to the UI layer.
 * @template T
 * @param {() => Promise<T>} fn
 * @returns {Promise<{ ok: true, data: T } | { ok: false, error: MappedError }>}
 */
export async function tryFirebase(fn) {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: mapFirebaseError(error) };
  }
}
