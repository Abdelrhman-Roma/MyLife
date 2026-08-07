// MOMENTUM — Weather page controller (Firestore migration, Phase 6).
// The user's preferred location now lives at weatherPreferences/{uid} (a
// singleton document — see repositories/SingletonDocRepository.js) instead
// of being purely device-local via WeatherLocationService's localStorage.
// WeatherLocationService's own localStorage cache is kept as an offline/
// instant-load fallback (same "local cache + Firestore sync" pattern used
// for theme), and its PERMISSION_KEY (whether the browser granted/denied
// geolocation) is intentionally left device-local — that's real browser
// permission state, not a cross-device user preference.

import { WeatherPreferencesRepository } from '../../repositories/WeatherPreferencesRepository.js';
import { AuthService } from '../../services/AuthService.js';

let weatherPageState = { weather: null };
let weatherPrefsRepo = null;
let weatherPrefsUnsubscribe = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (!bootShell('weather')) return;
  window.__pageContentReinit = () => renderWeatherPage(weatherPageState.weather);
  startWeatherPrefsSync();
  if (new URLSearchParams(location.search).get('search') === '1' && !WeatherLocationService.get()) { openWeatherSearch(); return; }
  await loadWeatherPage();
});
window.addEventListener('beforeunload', () => { if (weatherPrefsUnsubscribe) weatherPrefsUnsubscribe(); });

async function startWeatherPrefsSync() {
  const user = await AuthService.waitUntilReady();
  if (!user) return; // bootShell() already redirects unauthenticated visitors
  weatherPrefsRepo = new WeatherPreferencesRepository(user.uid);
  if (weatherPrefsUnsubscribe) weatherPrefsUnsubscribe();
  weatherPrefsUnsubscribe = weatherPrefsRepo.subscribe(
    (data) => {
      // A location saved on another device should take over here too —
      // but only apply it if it's actually different, so we don't stomp on
      // a location the user is actively viewing (e.g. a manual search
      // still awaiting its own write to finish).
      if (data && data.location && JSON.stringify(data.location) !== JSON.stringify(WeatherLocationService.get())) {
        WeatherLocationService.set(data.location);
        loadWeatherPage(true);
      }
    },
    (error) => { console.error('[weather/preferences] realtime sync failed', error); }
  );
}

async function loadWeatherPage(force = false) {
  const root = byId('weather-root'); root.innerHTML = WeatherUI.skeleton();
  try {
    const existing = WeatherLocationService.get();
    const location = existing || await WeatherLocationService.locate();
    if (!existing && weatherPrefsRepo) weatherPrefsRepo.update({ location });
    const weather = await WeatherService.fetchWeather(location, force);
    weatherPageState.weather = weather;
    renderWeatherPage(weather);
  }
  catch (error) { root.innerHTML = WeatherUI.error(error); bindWeatherFallback(root); }
}
function renderWeatherPage(weather) {
  const root = byId('weather-root'); if (!weather) return;
  const recs = WeatherRecommendationService.apply(weather);
  root.innerHTML = `${WeatherUI.hero(weather)}${WeatherUI.hourly(weather)}${WeatherUI.daily(weather)}${WeatherUI.details(weather)}${WeatherUI.recommendations(recs)}<section class="weather-section"><h2>${t('Trends')}</h2>${WeatherCharts.render(weather)}</section>`;
  recs.forEach((item) => { const key = `weather-${item.type}-${new Date().toISOString().slice(0,10)}`; if (!window.currentData.reminderLog[key]) { window.currentData.reminderLog[key] = true; addNotification('Weather', item.text, { browser: false }); } });
  persist();
}
function bindWeatherFallback(root) { root.querySelector('[data-weather-retry]')?.addEventListener('click', () => loadWeatherPage(true)); root.querySelector('[data-weather-search]')?.addEventListener('click', () => openWeatherSearch()); }
function openWeatherSearch() {
  openModal({ title: t('Choose a city'), body: `<form class="weather-search-form" data-weather-search-form><label>${t('Search city')}<input name="query" autocomplete="off" required autofocus></label><div class="weather-search-results" data-weather-results></div><div class="modal-actions"><button class="secondary-btn" type="button" data-modal-cancel>${t('Cancel')}</button><button class="primary-btn" type="submit">${t('Search')}</button></div></form>`, onConfirm: () => {}, onCancel: () => {} });
  const layer = byId('modal-layer'); const form = layer.querySelector('[data-weather-search-form]');
  layer.querySelector('[data-modal-confirm]')?.remove();
  form.addEventListener('submit', async (event) => { event.preventDefault(); const results = layer.querySelector('[data-weather-results]'); results.textContent = t('Searching…'); try { const places = await WeatherGeocodingService.search(new FormData(form).get('query')); results.innerHTML = places.length ? places.map((place,index)=>`<button class="weather-location-result" type="button" data-weather-place="${index}">${escapeHtml(place.name)}${place.admin1 ? `, ${escapeHtml(place.admin1)}` : ''} · ${escapeHtml(place.country||'')}</button>`).join('') : `<p>${t('No cities found.')}</p>`; results.querySelectorAll('[data-weather-place]').forEach(button=>button.addEventListener('click',()=>{ const loc = WeatherLocationService.fromSearch(places[Number(button.dataset.weatherPlace)]); if (weatherPrefsRepo) weatherPrefsRepo.update({ location: loc }); closeModal(); loadWeatherPage(true); })); } catch (error) { results.textContent = error.message; } });
}
