import { startRepoAggregatorSync } from '../../services/RepoAggregatorSync.js';

let disposeAggregatorSync = () => {};

document.addEventListener('DOMContentLoaded', () => {
  initPage('dashboard');
  initDashboardWeather();
  startRepoAggregatorSync(() => {
    if (typeof window.__pageContentReinit === 'function') window.__pageContentReinit();
  }).then((dispose) => { disposeAggregatorSync = dispose; });
});
window.addEventListener('beforeunload', () => disposeAggregatorSync());
