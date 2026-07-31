/**
 * core/bootstrap.js
 * ---------------------------------------------------------------------------
 * Call `bootstrapApp()` once, at the top of each page's entry script, before
 * any repository or service is used. It:
 *   1. Registers shared singletons (Firestore db, Auth, LoadingManager) into
 *      the DI container so repositories/services can `resolve()` them
 *      instead of importing Firebase directly.
 *   2. Waits for AuthService's initial session-restore check to finish, so
 *      pages don't flash a "logged out" state for a split second on refresh
 *      while Firebase is still restoring the session from IndexedDB.
 *
 * This intentionally does NOT redirect/guard routes itself — that's a
 * page-level concern (different pages want different behavior for a signed-
 * out user) and out of scope for Phase 1's foundation work.
 */

import { db } from '../firebase/firebase.js';
import { auth } from '../firebase/auth.js';
import { provide, TOKENS } from '../utils/di.js';
import { loadingManager } from './LoadingManager.js';
import { AuthService } from '../services/AuthService.js';

let bootstrapped = false;

/**
 * @returns {Promise<import('firebase/auth').User|null>} the restored user, if any
 */
export async function bootstrapApp() {
  if (!bootstrapped) {
    provide(TOKENS.FIRESTORE, db);
    provide(TOKENS.AUTH, auth);
    provide(TOKENS.LOADING_MANAGER, loadingManager);
    bootstrapped = true;
  }
  return AuthService.waitUntilReady();
}
