// WMO weather interpretation codes returned by Open-Meteo. UI owns no raw codes.
const WeatherCodes = (() => {
  const groups = {
    0:['Clear sky','clear'], 1:['Mainly clear','clear'], 2:['Partly cloudy','partly'], 3:['Overcast','cloudy'],
    45:['Fog','fog'], 48:['Rime fog','fog'], 51:['Light drizzle','drizzle'], 53:['Drizzle','drizzle'], 55:['Heavy drizzle','drizzle'],
    56:['Freezing drizzle','drizzle'], 57:['Heavy freezing drizzle','drizzle'], 61:['Light rain','rain'], 63:['Rain','rain'], 65:['Heavy rain','rain'],
    66:['Freezing rain','rain'], 67:['Heavy freezing rain','rain'], 71:['Light snow','snow'], 73:['Snow','snow'], 75:['Heavy snow','snow'],
    77:['Snow grains','snow'], 80:['Rain showers','rain'], 81:['Rain showers','rain'], 82:['Violent rain showers','rain'],
    85:['Snow showers','snow'], 86:['Heavy snow showers','snow'], 95:['Thunderstorm','storm'], 96:['Thunderstorm with hail','storm'], 99:['Thunderstorm with hail','storm'],
  };
  return { get(code, isDay = 1) { const [label, kind] = groups[code] || ['Unknown conditions','cloudy']; return { label: t(label), kind, night: kind === 'clear' && !isDay }; } };
})();
window.WeatherCodes = WeatherCodes;
