document.addEventListener('DOMContentLoaded', () => {
  if (bootShell('workout') && typeof initWorkoutPage === 'function') {
    initWorkoutPage();
  }
});

