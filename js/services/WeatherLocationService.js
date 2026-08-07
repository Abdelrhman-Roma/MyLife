const WeatherLocationService = (() => {
  const KEY = 'mylife.weather.location';
  const PERMISSION_KEY = 'mylife.weather.locationPreference';
  const get = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (_) { return null; } };
  const set = (location) => localStorage.setItem(KEY, JSON.stringify(location));
  return {
    get, set,
    async locate() {
      const saved = get(); if (saved) return saved;
      if (localStorage.getItem(PERMISSION_KEY) === 'denied') throw Object.assign(new Error('Location permission was previously declined.'), { code: 'denied' });
      if (!navigator.geolocation) throw Object.assign(new Error('Geolocation is unavailable.'), { code: 'unsupported' });
      let pos;
      try { pos = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: false, timeout: 10000, maximumAge: 1800000 })); }
      catch (error) { if (error?.code === 1) localStorage.setItem(PERMISSION_KEY, 'denied'); throw error; }
      const latitude = Number(pos.coords.latitude.toFixed(4)); const longitude = Number(pos.coords.longitude.toFixed(4));
      const place = await WeatherGeocodingService.reverse(latitude, longitude);
      const location = { latitude, longitude, name: place?.name || `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`, country: place?.country || '', source: 'geolocation' };
      localStorage.setItem(PERMISSION_KEY, 'granted'); set(location); return location;
    },
    fromSearch(result) { const location = { latitude: result.latitude, longitude: result.longitude, name: result.name, country: result.country || '', timezone: result.timezone || '', source: 'search' }; localStorage.setItem(PERMISSION_KEY, 'manual'); set(location); return location; },
  };
})();
window.WeatherLocationService = WeatherLocationService;
