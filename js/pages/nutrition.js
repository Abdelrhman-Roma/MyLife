document.addEventListener('DOMContentLoaded', () => {
  if (bootShell('nutrition') && typeof initNutritionPage === 'function') {
    initNutritionPage();
    window.__pageContentReinit = initNutritionPage;
  }
});
