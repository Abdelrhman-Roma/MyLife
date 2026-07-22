document.addEventListener('DOMContentLoaded', () => {
  if (bootShell('study') && typeof initStudyPage === 'function') {
    initStudyPage();
    window.__pageContentReinit = initStudyPage;
  }
});
