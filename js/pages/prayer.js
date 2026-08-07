import { initPrayerPage, disposePrayerPage } from '../prayer.js';

document.addEventListener('DOMContentLoaded', () => {
  if (bootShell('prayer') && typeof initPrayerPage === 'function') {
    initPrayerPage();
    window.__pageContentReinit = initPrayerPage;
  }
});
window.addEventListener('beforeunload', () => disposePrayerPage());
