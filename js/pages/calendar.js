document.addEventListener('DOMContentLoaded', () => {
  if (bootShell('calendar') && typeof initCalendarPage === 'function') {
    initCalendarPage();
    window.__pageContentReinit = initCalendarPage;
  }
});
