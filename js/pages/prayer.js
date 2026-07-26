document.addEventListener('DOMContentLoaded', () => {
  if (bootShell('prayer') && typeof initPrayerPage === 'function') {
    initPrayerPage();
    window.__pageContentReinit = initPrayerPage;
  }
});
