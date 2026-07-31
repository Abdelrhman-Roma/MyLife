/**
 * utils/LocalStorageService.js
 * ---------------------------------------------------------------------------
 * Per the brief: "Business data MUST NOT remain in LocalStorage. LocalStorage
 * should only store: Theme, Language, Temporary cache, Recently opened page,
 * Offline cache if needed. Nothing else."
 *
 * This is now the ONLY file in the project allowed to call
 * `localStorage.getItem/setItem/removeItem` directly. Everywhere else that
 * used to reach into LocalStorage for tasks/habits/goals/etc. now goes
 * through a Repository instead (see repositories/). Real business-data
 * offline support comes from Firestore's own persistent local cache
 * (see firebase/firebase.js), not from hand-rolled LocalStorage caching.
 */

const KEYS = /** @type {const} */ ({
  THEME: 'mylife.theme',
  PALETTE: 'mylife.palette',
  LANGUAGE: 'mylife.language',
  LAST_PAGE: 'mylife.lastPage',
});

function safeGet(key, fallback = null) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value;
  } catch {
    return fallback; // private browsing / storage disabled — degrade gracefully
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export const LocalStorageService = {
  getTheme: () => safeGet(KEYS.THEME, 'dark'),
  setTheme: (theme) => safeSet(KEYS.THEME, theme),

  getPalette: () => safeGet(KEYS.PALETTE, 'deep-space'),
  setPalette: (palette) => safeSet(KEYS.PALETTE, palette),

  getLanguage: () => safeGet(KEYS.LANGUAGE, 'English'),
  setLanguage: (language) => safeSet(KEYS.LANGUAGE, language),

  getLastPage: () => safeGet(KEYS.LAST_PAGE, null),
  setLastPage: (page) => safeSet(KEYS.LAST_PAGE, page),

  /**
   * Namespaced temporary cache for small, non-business, re-fetchable data
   * only (e.g. a "don't show this tip again" flag, a scroll position). Not
   * for tasks/habits/goals/etc. — those live in Firestore repositories now.
   */
  cache: {
    get(key, fallback = null) {
      const raw = safeGet(`mylife.cache.${key}`);
      if (raw === null) return fallback;
      try { return JSON.parse(raw); } catch { return fallback; }
    },
    set(key, value) {
      return safeSet(`mylife.cache.${key}`, JSON.stringify(value));
    },
  },
};
