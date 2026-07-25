document.addEventListener('DOMContentLoaded', () => {
  if (bootShell('habits') && typeof initHabitsPage === 'function') {
    initHabitsPage();
    window.__pageContentReinit = initHabitsPage;
  }
});
