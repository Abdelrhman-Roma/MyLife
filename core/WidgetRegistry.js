/**
 * core/WidgetRegistry.js
 * ---------------------------------------------------------------------------
 * The Widget API for the Custom Dashboard (Phase 8). Every widget is a
 * plain metadata object registered here — the drag-and-drop grid
 * (js/pages/custom-dashboard.js) only ever iterates this registry and calls
 * a widget's `render(ctx)` function. Adding a future widget means adding one
 * entry here; nothing about the grid, persistence, or "Add Widget" dialog
 * needs to change — this is what "future widgets can be installed without
 * changing dashboard architecture" means in practice.
 *
 * @typedef {Object} WidgetContext
 * @property {HTMLElement} root - the widget's content container to render into
 * @property {import('firebase/auth').User} user - the signed-in Firebase user
 * @property {'sm'|'md'|'lg'} size - the widget's current size
 * @property {boolean} compactMode
 *
 * @typedef {Object} WidgetDefinition
 * @property {string} id - stable, unique (e.g. 'todo', 'weather')
 * @property {string} title - display name (passed through t() by the grid)
 * @property {string} icon - a key from shared.js's EMPTY_ICONS/ICON set, or a literal emoji fallback
 * @property {'productivity'|'wellness'|'insight'|'utility'} category
 * @property {'sm'|'md'|'lg'} defaultSize
 * @property {('sm'|'md'|'lg')[]} allowedSizes
 * @property {'firestore-live'|'local-snapshot'|'static'} dataSource - see NOTE below
 * @property {(ctx: WidgetContext) => (void | (() => void))} render - returns an optional cleanup/unsubscribe function
 *
 * NOTE on `dataSource`, an intentionally honest field: 'firestore-live'
 * widgets (Todo, Weather, Notifications, Quick Notes) subscribe to real
 * realtime data. 'local-snapshot' widgets (Habits, Goals, Workout,
 * Nutrition, Study, Prayer, Calendar, Statistics, Achievements, Water,
 * Sleep) read once from the existing in-memory `currentData` object (their
 * modules aren't migrated to Firestore yet — see MIGRATION_NOTES_PHASE2.md)
 * and label themselves accordingly rather than silently pretending to be
 * realtime. 'static' widgets (Quote, Pomodoro) need no backend at all.
 */

/** @type {Map<string, WidgetDefinition>} */
const registry = new Map();

/** @param {WidgetDefinition} definition */
export function registerWidget(definition) {
  if (!definition.id) throw new Error('registerWidget: a widget must have an id.');
  registry.set(definition.id, definition);
}

/** @param {string} id @returns {WidgetDefinition|undefined} */
export function getWidget(id) {
  return registry.get(id);
}

/** @returns {WidgetDefinition[]} every registered widget, in registration order */
export function getAllWidgets() {
  return [...registry.values()];
}

/** @param {string} category @returns {WidgetDefinition[]} */
export function getWidgetsByCategory(category) {
  return getAllWidgets().filter((w) => w.category === category);
}
