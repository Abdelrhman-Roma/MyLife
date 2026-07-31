/**
 * core/LoadingManager.js
 * ---------------------------------------------------------------------------
 * Reusable loading-state manager. Framework-agnostic (no React/Vue) since
 * MyLife's UI layer is plain DOM/JS — pages subscribe with a callback and
 * update the DOM themselves when notified.
 *
 * Supports four independent loading "channels" so a background sync doesn't
 * have to show the same full-page skeleton as an initial page load:
 *   - page:       full-page loading (first load / navigation)
 *   - background: silent sync, no skeleton, e.g. a realtime listener catching up
 *   - skeleton:   named per-component skeleton hooks (e.g. "todo-list", "dashboard-charts")
 *   - global:     true if ANY of the above is currently active
 *
 * Usage:
 *   import { loadingManager } from '../core/LoadingManager.js';
 *   const unsubscribe = loadingManager.subscribe((state) => { ... update DOM ... });
 *   loadingManager.setPageLoading(true);
 *   loadingManager.setSkeleton('todo-list', true);
 *   ...
 *   loadingManager.setPageLoading(false);
 */

class LoadingManager {
  constructor() {
    /** @type {{ page: boolean, background: boolean, skeletons: Record<string, boolean> }} */
    this.state = { page: false, background: false, skeletons: {} };
    /** @type {Set<(state: {page: boolean, background: boolean, skeletons: Record<string, boolean>, global: boolean}) => void>} */
    this.listeners = new Set();
  }

  /** @returns {boolean} true if page, background, or any named skeleton is active */
  get isGlobalLoading() {
    return this.state.page || this.state.background || Object.values(this.state.skeletons).some(Boolean);
  }

  _emit() {
    const snapshot = {
      page: this.state.page,
      background: this.state.background,
      skeletons: { ...this.state.skeletons },
      global: this.isGlobalLoading,
    };
    this.listeners.forEach((cb) => cb(snapshot));
  }

  /**
   * @param {(state: {page: boolean, background: boolean, skeletons: Record<string, boolean>, global: boolean}) => void} callback
   * @returns {() => void} unsubscribe
   */
  subscribe(callback) {
    this.listeners.add(callback);
    callback({ ...this.state, skeletons: { ...this.state.skeletons }, global: this.isGlobalLoading });
    return () => this.listeners.delete(callback);
  }

  /** @param {boolean} value */
  setPageLoading(value) { this.state.page = !!value; this._emit(); }

  /** @param {boolean} value */
  setBackgroundLoading(value) { this.state.background = !!value; this._emit(); }

  /** @param {string} key @param {boolean} value */
  setSkeleton(key, value) {
    if (value) this.state.skeletons[key] = true;
    else delete this.state.skeletons[key];
    this._emit();
  }

  /**
   * Convenience wrapper: runs an async function with a named skeleton (or
   * page-level, if no key given) flipped on for its duration, guaranteed to
   * flip back off even if it throws.
   * @template T
   * @param {() => Promise<T>} fn
   * @param {{ key?: string, background?: boolean }} [options]
   * @returns {Promise<T>}
   */
  async withLoading(fn, options = {}) {
    const { key, background = false } = options;
    if (key) this.setSkeleton(key, true);
    else if (background) this.setBackgroundLoading(true);
    else this.setPageLoading(true);
    try {
      return await fn();
    } finally {
      if (key) this.setSkeleton(key, false);
      else if (background) this.setBackgroundLoading(false);
      else this.setPageLoading(false);
    }
  }
}

/** Singleton instance — import this, don't construct your own. */
export const loadingManager = new LoadingManager();
