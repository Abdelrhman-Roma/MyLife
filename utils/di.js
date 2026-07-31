/**
 * utils/di.js
 * ---------------------------------------------------------------------------
 * Minimal dependency-injection container.
 *
 * The brief calls for "repositories receiving Firebase services through
 * dependency injection when possible" and "avoid hardcoded imports inside
 * business logic." In practice, `firebase/firestore.js` and `firebase/auth.js`
 * already centralize the *Firebase SDK* imports, so what DI actually buys us
 * here is:
 *   1. Repositories/services declare what they need as constructor
 *      parameters instead of importing the singleton directly, so...
 *   2. ...tests can construct a repository with a fake/in-memory Firestore
 *      double instead of hitting a real project, and
 *   3. swapping the persistence layer later (e.g. adding a Storage-backed
 *      repository) doesn't require touching every call site.
 *
 * This is deliberately NOT a full DI framework (no decorators, no reflection)
 * — that would be over-engineering for a client-side app of this size.
 */

/** @type {Map<string, unknown>} */
const registry = new Map();

/**
 * Registers a dependency under a string token. Call this once, near app
 * startup (see core/bootstrap.js), for each shared instance repositories
 * will need: the firestore db, the auth instance, the LoadingManager, etc.
 * @param {string} token
 * @param {unknown} instance
 */
export function provide(token, instance) {
  registry.set(token, instance);
}

/**
 * Resolves a previously-provided dependency. Throws a clear error if nothing
 * was registered for that token, rather than returning `undefined` and
 * failing confusingly three calls later.
 * @param {string} token
 * @returns {unknown}
 */
export function resolve(token) {
  if (!registry.has(token)) {
    throw new Error(`utils/di: no dependency registered for token "${token}". Call provide("${token}", ...) during app startup first.`);
  }
  return registry.get(token);
}

/** Clears all registered dependencies. Intended for test teardown only. */
export function resetRegistry() {
  registry.clear();
}

/** Well-known tokens, kept in one place so repositories don't hand-type strings. */
export const TOKENS = /** @type {const} */ ({
  FIRESTORE: 'firestore',
  AUTH: 'auth',
  LOADING_MANAGER: 'loadingManager',
});
