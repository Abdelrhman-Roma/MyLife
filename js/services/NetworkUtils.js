// js/services/NetworkUtils.js
// Phase 4 production-hardening: the earlier technical audit (TECH-003) found
// that WeatherService called `fetch()` directly with no timeout and no
// retry, unlike DataService (used for Quran/Azkar/Hadith), which has both.
// Rather than duplicating DataService's timeout/retry logic a second time
// with a second set of bugs, this extracts that same pattern into one
// reusable helper that WeatherService (below) now uses too. DataService
// itself is left untouched — it already works and this phase's brief says
// not to rewrite the architecture, so there's no reason to touch a file
// that isn't broken.
const NetworkUtils = (() => {
  /**
   * Fetches `url`, aborting after `timeoutMs` and retrying up to `retries`
   * times with a short linear backoff between attempts — identical
   * strategy to DataService.fetchJson, minus its localStorage caching
   * (callers that want caching layer that on top, e.g. WeatherCacheService).
   * @param {string|URL} url
   * @param {{ retries?: number, timeoutMs?: number, fetchOptions?: RequestInit }} [options]
   * @returns {Promise<Response>}
   */
  async function fetchWithRetry(url, { retries = 3, timeoutMs = 10000, fetchOptions = {} } = {}) {
    let lastErr;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const response = await fetch(url, { ...fetchOptions, signal: controller.signal });
          return response;
        } finally {
          clearTimeout(timer);
        }
      } catch (err) {
        lastErr = err;
        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, 350 * attempt));
        }
      }
    }
    if (lastErr && lastErr.name === 'AbortError') {
      const timeoutError = new Error(`Request timed out after ${timeoutMs}ms: ${url}`);
      timeoutError.code = 'TIMEOUT';
      throw timeoutError;
    }
    throw lastErr;
  }

  return { fetchWithRetry };
})();
window.NetworkUtils = NetworkUtils;
