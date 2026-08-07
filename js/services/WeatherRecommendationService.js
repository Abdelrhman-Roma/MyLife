const WeatherRecommendationService = (() => ({
  get(weather) {
    const c = weather.data.current; const d = weather.data.daily; const result = [];
    if (c.temperature_2m > 35) result.push({ type:'heat', text:t('Hot conditions: increase today’s water goal.'), action:'water' });
    if ((d.uv_index_max?.[0] || 0) >= 6) result.push({ type:'uv', text:t('High UV: use sunscreen and seek shade.'), action:'sun' });
    if ((d.precipitation_probability_max?.[0] || 0) >= 70) result.push({ type:'rain', text:t('Rain is likely: consider an indoor workout.'), action:'rain' });
    if (c.temperature_2m < 10) result.push({ type:'cold', text:t('Cold weather: wear warm layers.'), action:'cold' });
    return result;
  },
  apply(weather) { const recs = WeatherRecommendationService.get(weather); if (weather.data.current.temperature_2m > 35) currentData.settings.waterGoal = Math.max(currentData.settings.waterGoal || 8, 10); return recs; },
}));
window.WeatherRecommendationService = WeatherRecommendationService;
