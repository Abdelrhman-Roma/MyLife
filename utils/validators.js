/**
 * utils/validators.js
 * ---------------------------------------------------------------------------
 * Small, dependency-free validation helpers shared by every repository.
 * These exist so ownership/shape checks aren't copy-pasted into eight
 * different Repository files (Todo, Habit, Goal, Calendar, Workout, Study,
 * Prayer, Nutrition) with eight slightly-different bugs.
 */

/**
 * Throws if `uid` is missing/empty. Every repository call must have a
 * signed-in user's UID before touching Firestore — this is the client-side
 * half of "never assume unrestricted database access"; the Firestore
 * Security Rules (see firestore.rules) are the half that can't be bypassed.
 * @param {string|null|undefined} uid
 */
export function assertUid(uid) {
  if (!uid || typeof uid !== 'string') {
    throw new Error('assertUid: a signed-in user UID is required for this operation.');
  }
}

/**
 * Throws if a document fetched from Firestore doesn't belong to `uid`.
 * Defense in depth: Security Rules should already prevent cross-user reads,
 * but repositories double-check client-side too, since a rules mistake or a
 * migration bug should fail loudly here rather than silently leak data
 * cross-user in the UI.
 * @param {{ ownerId?: string }|null} data
 * @param {string} uid
 */
export function assertOwnership(data, uid) {
  if (data && data.ownerId && data.ownerId !== uid) {
    throw new Error('assertOwnership: document does not belong to the current user.');
  }
}

/**
 * Throws if `id` is missing/empty — used before any get/update/delete by ID.
 * @param {string|null|undefined} id
 * @param {string} [label]
 */
export function assertId(id, label = 'id') {
  if (!id || typeof id !== 'string') {
    throw new Error(`assertId: a valid ${label} is required.`);
  }
}

/**
 * Shallow-validates that `data` is a plain, JSON-serializable object before
 * it's sent to Firestore (catches accidental `undefined` values, functions,
 * class instances, and circular references early, with a clear error,
 * instead of a cryptic Firestore SDK error at write time).
 * @param {unknown} data
 */
export function assertPlainObject(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('assertPlainObject: expected a plain object payload.');
  }
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) {
      throw new Error(`assertPlainObject: field "${key}" is undefined \u2014 Firestore rejects undefined values (use null or omit the field).`);
    }
  }
  try {
    JSON.stringify(data);
  } catch {
    throw new Error('assertPlainObject: payload is not JSON-serializable (check for functions, class instances, or circular references).');
  }
}
