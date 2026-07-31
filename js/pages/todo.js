// Page bootstrap for pages/todo.html — now a real ES module (see js/todo.js
// header for why) importing initTodoPage/disposeTodoPage directly instead
// of assuming they're global. bootShell() itself stays a plain global
// function from shared.js (a real DOM-lookup helper still shared across
// every page, module or not — accessible here since ES modules run in the
// same window/global scope as ordinary <script> tags).
import { initTodoPage, disposeTodoPage } from '../todo.js';

document.addEventListener('DOMContentLoaded', () => {
  if (bootShell('todo')) {
    initTodoPage();
    window.__pageContentReinit = initTodoPage;
    window.addEventListener('beforeunload', disposeTodoPage, { once: true });
  }
});
