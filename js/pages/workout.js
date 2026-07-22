document.addEventListener('DOMContentLoaded', () => {
  if (bootShell('workout') && typeof initWorkoutPage === 'function') {
    initWorkoutPage();
    window.__pageContentReinit = initWorkoutPage;
  }
});

