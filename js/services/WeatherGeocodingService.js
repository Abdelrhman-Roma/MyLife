const WeatherGeocodingService = (() => {
  const base = 'https://geocoding-api.open-meteo.com/v1';
  async function request(path, params) {
    const url = new URL(`${base}/${path}`); Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    const response = await fetch(url); if (!response.ok) throw new Error(`Geocoding request failed (${response.status})`); return response.json();
  }
  return {
    async search(query) { if (!query.trim()) return []; const data = await request('search', { name: query.trim(), count: 8, language: getLang(), format: 'json' }); return data.results || []; },
    async reverse(latitude, longitude) {
      try { const data = await request('reverse', { latitude, longitude, language: getLang(), format: 'json' }); return data.results?.[0] || null; }
      catch (_) { return null; } // Coordinate label is a reliable offline-safe fallback when reverse lookup is unavailable.
    },
  };
})();
