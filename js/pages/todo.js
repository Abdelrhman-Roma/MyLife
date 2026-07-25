document.addEventListener('DOMContentLoaded', () => {
  if (bootShell('todo') && typeof initTodoPage === 'function') {
    initTodoPage();
    window.__pageContentReinit = initTodoPage;
  }
});
