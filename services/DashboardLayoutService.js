/**
 * services/DashboardLayoutService.js
 * ---------------------------------------------------------------------------
 * Persists the Custom Dashboard's layout at users/{uid}/dashboard/layout —
 * exactly the path the brief specifies. This is a single document (a user
 * has exactly one dashboard layout), not a `{module}/{uid}/items/{id}`
 * collection, so — same reasoning as UserService and the Statistics/
 * Dashboard aggregators — it's a dedicated service rather than a
 * BaseRepository subclass.
 *
 * @typedef {Object} WidgetPlacement
 * @property {string} widgetId
 * @property {number} order
 * @property {'sm'|'md'|'lg'} size
 * @property {boolean} hidden
 * @property {boolean} pinned
 * @property {boolean} collapsed
 *
 * @typedef {Object} DashboardPersonalization
 * @property {string} accentColor - a hex color, applied as a CSS custom property scoped to the dashboard grid only
 * @property {'sharp'|'md'|'round'} cornerRadius
 * @property {number} transparency - 0-100
 * @property {boolean} compactMode
 * @property {boolean} animations
 *
 * @typedef {Object} DashboardLayout
 * @property {WidgetPlacement[]} widgets
 * @property {DashboardPersonalization} personalization
 */

import { docRef, getDoc, setDoc, onSnapshot, serverTimestamp } from '../firebase/firestore.js';
import { tryFirebase } from '../core/ErrorMapper.js';
import { assertUid } from '../utils/validators.js';

/** @type {DashboardLayout} */
export const DEFAULT_LAYOUT = {
  widgets: [
    { widgetId: 'todo', order: 0, size: 'md', hidden: false, pinned: true, collapsed: false },
    { widgetId: 'habits', order: 1, size: 'sm', hidden: false, pinned: false, collapsed: false },
    { widgetId: 'weather', order: 2, size: 'sm', hidden: false, pinned: false, collapsed: false },
    { widgetId: 'quote', order: 3, size: 'sm', hidden: false, pinned: false, collapsed: false },
  ],
  personalization: {
    accentColor: '', // '' = inherit the app's current theme accent, not overridden
    cornerRadius: 'md',
    transparency: 0,
    compactMode: false,
    animations: true,
  },
};

function ref(uid) {
  assertUid(uid);
  return docRef('users', uid, 'dashboard', 'layout');
}

export const DashboardLayoutService = {
  /** @param {string} uid @returns {Promise<{ok:true,data:DashboardLayout}|{ok:false,error:import('../core/ErrorMapper.js').MappedError}>} */
  async getLayout(uid) {
    return tryFirebase(async () => {
      const snap = await getDoc(ref(uid));
      return snap.exists() ? mergeWithDefaults(snap.data()) : DEFAULT_LAYOUT;
    });
  },

  /** @param {string} uid @param {DashboardLayout} layout */
  async saveLayout(uid, layout) {
    return tryFirebase(() => setDoc(ref(uid), { ...layout, updatedAt: serverTimestamp() }));
  },

  /**
   * Realtime cross-device sync: a layout change made on another device
   * reflects here automatically, no refresh needed.
   * @param {string} uid @param {(layout: DashboardLayout) => void} callback
   * @returns {() => void} unsubscribe
   */
  subscribeLayout(uid, callback) {
    return onSnapshot(ref(uid), (snap) => callback(snap.exists() ? mergeWithDefaults(snap.data()) : DEFAULT_LAYOUT));
  },
};

/** Merges a saved layout with DEFAULT_LAYOUT's shape so a future new field/widget never crashes on an old saved doc. */
function mergeWithDefaults(saved) {
  return {
    widgets: Array.isArray(saved.widgets) && saved.widgets.length ? saved.widgets : DEFAULT_LAYOUT.widgets,
    personalization: { ...DEFAULT_LAYOUT.personalization, ...(saved.personalization || {}) },
  };
}
