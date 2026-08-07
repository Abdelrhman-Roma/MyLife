import { initWorkoutPage, disposeWorkoutPage } from '../workout.js';

document.addEventListener('DOMContentLoaded', () => {
  if (bootShell('workout') && typeof initWorkoutPage === 'function') {
    initWorkoutPage();
    window.__pageContentReinit = initWorkoutPage;
  }
});
window.addEventListener('beforeunload', () => disposeWorkoutPage());
