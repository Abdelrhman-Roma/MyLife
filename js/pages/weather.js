let weatherPageState = { weather: null };
document.addEventListener('DOMContentLoaded', async () => {
  if (!bootShell('weather')) return;
  window.__pageContentReinit = () => renderWeatherPage(weatherPageState.weather);
  if (new URLSearchParams(location.search).get('search') === '1' && !WeatherLocationService.get()) { openWeatherSearch(); return; }
  await loadWeatherPage();
});
async function loadWeatherPage(force = false) {
  const root = byId('weather-root'); root.innerHTML = WeatherUI.skeleton();
  try { const location = WeatherLocationService.get() || await WeatherLocationService.locate(); const weather = await WeatherService.fetchWeather(location, force); weatherPageState.weather = weather; renderWeatherPage(weather); }
  catch (error) { root.innerHTML = WeatherUI.error(error); bindWeatherFallback(root); }
}
function renderWeatherPage(weather) {
  const root = byId('weather-root'); if (!weather) return;
  const recs = WeatherRecommendationService.apply(weather);
  root.innerHTML = `${WeatherUI.hero(weather)}${WeatherUI.hourly(weather)}${WeatherUI.daily(weather)}${WeatherUI.details(weather)}${WeatherUI.recommendations(recs)}<section class="weather-section"><h2>${t('Trends')}</h2>${WeatherCharts.render(weather)}</section>`;
  recs.forEach((item) => { const key = `weather-${item.type}-${new Date().toISOString().slice(0,10)}`; if (!currentData.reminderLog[key]) { currentData.reminderLog[key] = true; addNotification('Weather', item.text, { browser: false }); } });
  persist();
}
function bindWeatherFallback(root) { root.querySelector('[data-weather-retry]')?.addEventListener('click', () => loadWeatherPage(true)); root.querySelector('[data-weather-search]')?.addEventListener('click', () => openWeatherSearch()); }
function openWeatherSearch() {
  openModal({ title: t('Choose a city'), body: `<form class="weather-search-form" data-weather-search-form><label>${t('Search city')}<input name="query" autocomplete="off" required autofocus></label><div class="weather-search-results" data-weather-results></div><div class="modal-actions"><button class="secondary-btn" type="button" data-modal-cancel>${t('Cancel')}</button><button class="primary-btn" type="submit">${t('Search')}</button></div></form>`, onConfirm: () => {}, onCancel: () => {} });
  const layer = byId('modal-layer'); const form = layer.querySelector('[data-weather-search-form]');
  layer.querySelector('[data-modal-confirm]')?.remove();
  form.addEventListener('submit', async (event) => { event.preventDefault(); const results = layer.querySelector('[data-weather-results]'); results.textContent = t('Searching…'); try { const places = await WeatherGeocodingService.search(new FormData(form).get('query')); results.innerHTML = places.length ? places.map((place,index)=>`<button class="weather-location-result" type="button" data-weather-place="${index}">${escapeHtml(place.name)}${place.admin1 ? `, ${escapeHtml(place.admin1)}` : ''} · ${escapeHtml(place.country||'')}</button>`).join('') : `<p>${t('No cities found.')}</p>`; results.querySelectorAll('[data-weather-place]').forEach(button=>button.addEventListener('click',()=>{ WeatherLocationService.fromSearch(places[Number(button.dataset.weatherPlace)]); closeModal(); loadWeatherPage(true); })); } catch (error) { results.textContent = error.message; } });
}
