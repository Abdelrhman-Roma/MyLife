import { startGoalsSync, disposeGoalsSync } from '../goals.js';

document.addEventListener('DOMContentLoaded', () => {
  initPage('goals');
  startGoalsSync();
});
window.addEventListener('beforeunload', () => disposeGoalsSync());
