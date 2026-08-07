import { initHabitsPage, disposeHabitsPage } from '../habits.js';

document.addEventListener('DOMContentLoaded', () => {
  if (bootShell('habits') && typeof initHabitsPage === 'function') {
    initHabitsPage();
    window.__pageContentReinit = initHabitsPage;
  }
});
window.addEventListener('beforeunload', () => disposeHabitsPage());
