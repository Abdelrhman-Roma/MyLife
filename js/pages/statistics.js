import { startRepoAggregatorSync } from '../../services/RepoAggregatorSync.js';

let disposeAggregatorSync = () => {};

document.addEventListener('DOMContentLoaded', () => {
  initPage('statistics');
  startRepoAggregatorSync(() => {
    if (typeof window.__pageContentReinit === 'function') window.__pageContentReinit();
  }).then((dispose) => { disposeAggregatorSync = dispose; });
});
window.addEventListener('beforeunload', () => disposeAggregatorSync());
