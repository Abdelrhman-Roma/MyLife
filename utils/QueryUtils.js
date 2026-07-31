/**
 * utils/QueryUtils.js
 * ---------------------------------------------------------------------------
 * Search / filter / sort helpers that operate on an in-memory array — the
 * array a page already has after subscribing to a repository's `subscribe()`
 * realtime listener.
 *
 * WHY THIS EXISTS INSTEAD OF MORE FIRESTORE QUERIES:
 * Every module page keeps a realtime-synced local copy of its full
 * collection (that's what `subscribe()` is for). Once that local copy
 * exists, running search/filter/sort against it is instant and free, while
 * re-querying Firestore on every keystroke of a search box would be slower
 * AND cost a read per keystroke. `BaseRepository.searchByPrefix()` still
 * exists for the specific case where a page has NOT loaded a full
 * collection locally (e.g. paginated history views).
 */

/**
 * Case-insensitive substring search across one or more string fields.
 * @template T
 * @param {T[]} items
 * @param {string} term
 * @param {(keyof T)[]} fields
 * @returns {T[]}
 */
export function searchText(items, term, fields) {
  const needle = term.trim().toLowerCase();
  if (!needle) return items;
  return items.filter((item) =>
    fields.some((field) => String(item[field] ?? '').toLowerCase().includes(needle))
  );
}

/**
 * Applies a set of named predicate filters. `filters` is an object like
 * `{ completed: (t) => t.completed, today: (t) => t.dueDate === todayIso }`;
 * `active` is the list of filter names currently turned on (AND-combined).
 * @template T
 * @param {T[]} items
 * @param {Record<string, (item: T) => boolean>} filters
 * @param {string[]} active
 * @returns {T[]}
 */
export function applyFilters(items, filters, active) {
  const predicates = active.map((name) => filters[name]).filter(Boolean);
  if (!predicates.length) return items;
  return items.filter((item) => predicates.every((predicate) => predicate(item)));
}

/**
 * Sorts by one of a set of named comparators, e.g.
 * `sortBy(tasks, { newest: (a,b) => b.createdAt - a.createdAt, alphabetical: (a,b) => a.title.localeCompare(b.title) }, 'newest')`.
 * @template T
 * @param {T[]} items
 * @param {Record<string, (a: T, b: T) => number>} comparators
 * @param {string} activeKey
 * @returns {T[]}
 */
export function sortBy(items, comparators, activeKey) {
  const comparator = comparators[activeKey];
  return comparator ? [...items].sort(comparator) : items;
}

/** Common ready-made comparators reused across modules (Todo/Habit/Goal/Study/Workout all sort by these). */
export const COMMON_COMPARATORS = {
  newest: (a, b) => new Date(b.createdAt?.toDate?.() ?? b.createdAt ?? 0) - new Date(a.createdAt?.toDate?.() ?? a.createdAt ?? 0),
  oldest: (a, b) => new Date(a.createdAt?.toDate?.() ?? a.createdAt ?? 0) - new Date(b.createdAt?.toDate?.() ?? b.createdAt ?? 0),
  alphabetical: (a, b) => String(a.title ?? a.name ?? '').localeCompare(String(b.title ?? b.name ?? '')),
};
