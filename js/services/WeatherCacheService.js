// Small per-user cache: instant paint, 30-minute freshness, and no duplicate requests.
const WeatherCacheService = (() => {
  const TTL = 30 * 60 * 1000;
  const key = () => `mylife.weather.${currentUser?.email || 'guest'}`;
  return {
    get() { try { const value = JSON.parse(localStorage.getItem(key()) || 'null'); return value; } catch (_) { return null; } },
    fresh(value) { return !!value && Date.now() - value.cachedAt < TTL; },
    set(weather) { localStorage.setItem(key(), JSON.stringify({ ...weather, cachedAt: Date.now() })); },
    clear() { localStorage.removeItem(key()); },
  };
})();
