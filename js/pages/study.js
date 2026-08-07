import { initStudyPage, disposeStudyPage } from '../study.js';

document.addEventListener('DOMContentLoaded', () => {
  if (bootShell('study') && typeof initStudyPage === 'function') {
    initStudyPage();
    window.__pageContentReinit = initStudyPage;
  }
});
window.addEventListener('beforeunload', () => disposeStudyPage());
