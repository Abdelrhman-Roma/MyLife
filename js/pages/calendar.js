import { initCalendarPage, disposeCalendarPage } from '../calendar.js';

document.addEventListener('DOMContentLoaded', () => {
  if (bootShell('calendar') && typeof initCalendarPage === 'function') {
    initCalendarPage();
    window.__pageContentReinit = initCalendarPage;
  }
});
window.addEventListener('beforeunload', () => disposeCalendarPage());
