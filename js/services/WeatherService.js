const WeatherService = (() => {
  const inflight = new Map();
  const current = 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m';
  const hourly = 'temperature_2m,relative_humidity_2m,dew_point_2m,apparent_temperature,precipitation_probability,weather_code,pressure_msl,cloud_cover,visibility,wind_speed_10m,wind_direction_10m';
  const daily = 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max,wind_speed_10m_max';
  async function fetchWeather(location, force = false) {
    const cached = WeatherCacheService.get();
    if (!force && cached?.location?.latitude === location.latitude && cached.location.longitude === location.longitude && WeatherCacheService.fresh(cached)) return cached;
    const requestKey = `${location.latitude},${location.longitude}`;
    if (inflight.has(requestKey)) return inflight.get(requestKey);
    const task = (async () => {
      const url = new URL('https://api.open-meteo.com/v1/forecast');
      Object.entries({ latitude: location.latitude, longitude: location.longitude, current, hourly, daily, timezone: location.timezone || 'auto', forecast_days: 7, forecast_hours: 24 }).forEach(([key, value]) => url.searchParams.set(key, value));
      const response = await NetworkUtils.fetchWithRetry(url, { retries: 3, timeoutMs: 10000 }); if (!response.ok) throw new Error(`Weather request failed (${response.status})`);
      const data = await response.json(); if (!data.current || !data.hourly || !data.daily) throw new Error('Weather response was incomplete.');
      const weather = { location, data, updatedAt: new Date().toISOString() }; WeatherCacheService.set(weather); return weather;
    })();
    inflight.set(requestKey, task); try { return await task; } finally { inflight.delete(requestKey); }
  }
  return { fetchWeather };
})();
window.WeatherService = WeatherService;
