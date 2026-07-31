// Dashboard integration: cached content is instant, a fresh request is silent.
async function initDashboardWeather() {
  const slot = document.querySelector('[data-dashboard-weather]'); if (!slot || !currentData) return;
  const cached = WeatherCacheService.get(); if (cached) slot.innerHTML = WeatherUI.widget(cached); else slot.innerHTML = WeatherUI.skeleton();
  try {
    let location = WeatherLocationService.get();
    if (!location) {
      try { location = await WeatherLocationService.locate(); }
      catch (error) { if (error.code === 1 || error.code === 'denied' || error.code === 'unsupported') { window.location.href = 'weather.html?search=1'; return; } throw error; }
    }
    const weather = await WeatherService.fetchWeather(location); slot.innerHTML = WeatherUI.widget(weather);
    const recs = WeatherRecommendationService.apply(weather); if (recs.length) persist();
    if (!window.__dashboardWeatherRefresh) window.__dashboardWeatherRefresh = window.setInterval(() => initDashboardWeather(), 30 * 60 * 1000);
  } catch (error) { console.warn('Weather widget failed:', error); if (!cached) { slot.innerHTML = WeatherUI.error(error); bindDashboardWeatherFallback(slot); } }
}
function bindDashboardWeatherFallback(slot) { slot.querySelector('[data-weather-retry]')?.addEventListener('click', () => initDashboardWeather()); slot.querySelector('[data-weather-search]')?.addEventListener('click', () => location.href='weather.html?search=1'); }
