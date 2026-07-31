// MyLife — DataService (shared loading primitive for Quran/Azkar/Hadith services)
// Centralizes fetch + retry + timeout + localStorage caching + console
// logging so each dataset service only has to describe *what* to load, not
// *how* to load it reliably.
const DataService = (() => {
  // Phase 4 note (previously flagged as TECH-004 in the technical audit):
  // this prefix IS the cache-invalidation mechanism — bump the version
  // suffix (v1 -> v2) any time data/quran.json, data/azkar.json, or
  // data/hadith.json content changes. Every cached entry lives under the
  // old prefix and is simply never read again once the constant changes,
  // so a user with a stale cached copy picks up the new content on their
  // next fetch with no other code changes needed. This was previously
  // undocumented, which is the actual gap — the mechanism itself was
  // already correct.
  const CACHE_PREFIX = 'mylife_data_cache_v1_';

  function cacheGet(key) {
    try {
      const raw = localStorage.getItem(CACHE_PREFIX + key);
      return raw ? JSON.parse(raw) : null;
    } catch (_e) {
      return null;
    }
  }

  function cacheSet(key, value) {
    try {
      localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(value));
    } catch (_e) {
      // Storage full or unavailable (e.g. private browsing) — degrade
      // gracefully by just refetching next time. Not fatal.
        // Storage is optional; the current request remains usable.
    }
  }

  function clearCache(key) {
    try { localStorage.removeItem(CACHE_PREFIX + key); } catch (_e) { /* optional storage */ }
  }

  // Classifies a fetch failure into a specific, explainable reason instead
  // of surfacing the browser's generic "Failed to fetch".
  function describeError(err, url) {
    if (PathResolver.isFileProtocol()) {
      return {
        code: 'FILE_PROTOCOL',
        message: 'This page was opened directly as a file (file://). Browsers block JSON loading in that mode. Serve the project with a local web server (e.g. VS Code "Live Server", or `python3 -m http.server`) and open it via http://localhost instead.',
      };
    }
    if (err && err.name === 'AbortError') {
      return { code: 'TIMEOUT', message: `Timed out loading ${url}.` };
    }
    if (err instanceof TypeError) {
      return { code: 'NETWORK', message: `Network error loading ${url}. The file may not exist at that path, or the local server isn't running.` };
    }
    return { code: 'UNKNOWN', message: err && err.message ? err.message : String(err) };
  }

  async function fetchJson(url, { retries = 3, timeoutMs = 12000, label = url } = {}) {
    const cached = cacheGet(url);
    if (cached) {
      return cached;
    }

    let lastErr;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);
        }
        let data;
        try {
          data = await res.json();
        } catch (parseErr) {
          throw new Error(`Invalid JSON in ${url}: ${parseErr.message}`);
        }
        cacheSet(url, data);
        return data;
      } catch (err) {
        lastErr = err;
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 350 * attempt));
        }
      }
    }
    const described = describeError(lastErr, url);
    const finalErr = new Error(described.message);
    finalErr.code = described.code;
    throw finalErr;
  }

  return { fetchJson, cacheGet, cacheSet, clearCache };
})();
