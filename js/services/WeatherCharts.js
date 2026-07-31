const WeatherCharts = (() => {
  function line(values, color, label) {
    const width = 560, height = 130, pad = 12, min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
    const points = values.map((value, index) => `${pad + index * (width - pad * 2) / Math.max(values.length - 1, 1)},${height - pad - ((value - min) / span) * (height - pad * 2)}`).join(' ');
    return `<svg viewBox="0 0 ${width} ${height}" class="weather-chart" role="img" aria-label="${escapeAttr(label)}"><polyline points="${points}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }
  return { render(weather) { const h = weather.data.hourly; return `<div class="weather-chart-grid"><section><h3>${t('Temperature')}</h3>${line(h.temperature_2m, 'var(--orange)', t('Temperature chart'))}</section><section><h3>${t('Humidity')}</h3>${line(h.relative_humidity_2m, 'var(--blue)', t('Humidity chart'))}</section><section><h3>${t('Wind')}</h3>${line(h.wind_speed_10m, 'var(--purple)', t('Wind chart'))}</section></div>`; } };
})();
