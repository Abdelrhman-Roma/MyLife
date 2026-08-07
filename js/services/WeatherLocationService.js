const WeatherLocationService = (() => {
  const KEY = 'mylife.weather.location';
  const PERMISSION_KEY = 'mylife.weather.locationPreference';
  const DEFAULT_FALLBACK_LOCATION = {
    latitude: 30.0444,
    longitude: 31.2357,
    name: "Cairo",
    country: "Egypt",
    source: "fallback"
  };
  const get = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (_) { return null; } };
  const set = (location) => localStorage.setItem(KEY, JSON.stringify(location));
  return {
    get, set,
    async locate() {
      const saved = get(); if (saved) return saved;
      if (localStorage.getItem(PERMISSION_KEY) === 'denied') return DEFAULT_FALLBACK_LOCATION;
      if (!navigator.geolocation) return DEFAULT_FALLBACK_LOCATION;
      let pos;
      try { pos = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: false, timeout: 5000, maximumAge: 1800000 })); }
      catch (error) {
        console.warn('Weather location fallback triggered:', error);
        return DEFAULT_FALLBACK_LOCATION;
      }
      const latitude = Number(pos.coords.latitude.toFixed(4)); const longitude = Number(pos.coords.longitude.toFixed(4));
      let place;
      try {
        place = await WeatherGeocodingService.reverse(latitude, longitude);
      } catch (err) {
        console.warn('Geocoding failed, using coordinates:', err);
      }
      const location = { latitude, longitude, name: place?.name || `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`, country: place?.country || '', source: 'geolocation' };
      localStorage.setItem(PERMISSION_KEY, 'granted'); set(location); return location;
    },
    fromSearch(result) { const location = { latitude: result.latitude, longitude: result.longitude, name: result.name, country: result.country || '', timezone: result.timezone || '', source: 'search' }; localStorage.setItem(PERMISSION_KEY, 'manual'); set(location); return location; },
  };
})();
window.WeatherLocationService = WeatherLocationService;
