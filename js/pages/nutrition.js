import { initNutritionPage, disposeNutritionPage } from '../nutrition.js';

document.addEventListener('DOMContentLoaded', () => {
  if (bootShell('nutrition') && typeof initNutritionPage === 'function') {
    initNutritionPage();
    window.__pageContentReinit = initNutritionPage;
  }
});
window.addEventListener('beforeunload', () => disposeNutritionPage());
