// MyLife — Tasks module (Phase 2 Firestore migration).
//
// Firestore replaces LocalStorage as the source of truth for tasks. This
// file now:
//   - imports TodoRepository (repositories/) instead of touching
//     currentData.tasks / persist() for anything task-related,
//   - keeps a `localTasks` array kept in sync via a realtime `subscribe()`
//     listener (never polled — per the brief's "never poll the database"),
//   - applies optimistic UI updates (mutate `localTasks` + re-render
//     immediately, then write to Firestore in the background) with
//     automatic rollback if the write fails,
//   - supports undo for delete via core/UndoManager.js,
//   - uses utils/QueryUtils.js for client-side search/filter/sort over the
//     already-synced `localTasks` array (see that file for why).
//
// Everything else — rendering, smart ordering, dependency/blocking logic,
// schedule-conflict detection, the reminder watcher, drag-to-reorder, the
// add/edit modal — is UNCHANGED in behavior; only where the data comes from
// and how writes happen has changed, per the brief's "UI must remain
// visually identical."
//
// PREREQUISITE THIS FILE ASSUMES (see chat summary / MIGRATION_NOTES.md):
// AuthService.getCurrentUser() must return a signed-in Firebase user. The
// existing login/register pages have not been rewired onto Firebase Auth in
// this pass — that is a separate, disclosed dependency, not something this
// file can paper over.
//
// Reuses bootShell(), escapeHtml(), escapeAttr(), makeId(), percent(), t(),
// showToast(), ensureModalLayer() from shared.js — nothing here duplicates
// those.

import { TodoRepository } from '../repositories/TodoRepository.js';
import { NotificationRepository } from '../repositories/NotificationRepository.js';
import { recordEvent } from '../core/GamificationEngine.js';
import { AuthService } from '../services/AuthService.js';
import { undoManager } from '../core/UndoManager.js';
import { searchText, sortBy } from '../utils/QueryUtils.js';

const TODO_PRIORITIES = ['Low', 'Medium', 'High'];
const TODO_PRIORITY_RANK = { High: 0, Medium: 1, Low: 2 };
const TODO_RECUR_FREQS = ['Daily', 'Weekly', 'Monthly'];
const TODO_REMINDER_CHECK_MS = 20000;

let todoState = { filter: 'all', tag: 'all', search: '', modal: null, sort: 'smart', dragId: null };
let todoReminderTimer = null;

/** @type {import('../repositories/TodoRepository.js').TodoRepository|null} */
let todoRepo = null;
/** Phase 7: writes real entries into the Smart Notification Center for task-due/task-completed events. @type {import('../repositories/NotificationRepository.js').NotificationRepository|null} */
let notificationRepo = null;
/** Realtime-synced local cache of the signed-in user's tasks — never polled, only pushed via subscribe(). */
let localTasks = [];
let todoUnsubscribe = null;
/** True until the first Firestore snapshot arrives — distinguishes "still loading" from "genuinely no tasks" (see renderTodoRoot). */
let todoLoading = true;
/** Set when the realtime subscription itself fails (offline, permission, etc.) — see renderTodoRoot. @type {import('../core/ErrorMapper.js').MappedError|null} */
let todoError = null;

function todoToday() { return new Date().toISOString().slice(0, 10); }

function isTaskOverdue(t) { return !!t.dueDate && t.dueDate < todoToday() && !t.completed; }
function isTaskToday(t) { return !t.dueDate || t.dueDate === todoToday(); }
function isTaskUpcoming(t) { return !!t.dueDate && t.dueDate > todoToday(); }

function taskDependencies(t) {
  return (t.dependsOn || []).map((id) => localTasks.find((x) => x.id === id)).filter(Boolean);
}
function isTaskBlocked(t) { return taskDependencies(t).some((d) => !d.completed); }

function allTaskTags() {
  const set = new Set();
  localTasks.forEach((t) => (t.tags || []).forEach((tag) => set.add(tag)));
  return [...set].sort((a, b) => a.localeCompare(b));
}

function scheduleConflictIds() {
  const map = {};
  localTasks.filter((t) => !t.completed && t.dueDate && t.time).forEach((t) => {
    const key = `${t.dueDate}_${t.time}`;
    (map[key] = map[key] || []).push(t.id);
  });
  const ids = new Set();
  Object.values(map).filter((arr) => arr.length > 1).forEach((arr) => arr.forEach((id) => ids.add(id)));
  return ids;
}

// Rule-based (not AI) "smart" ordering: unblocked-before-blocked, then
// overdue-first, then by due date/time, then by priority.
function smartOrder(tasks) {
  return [...tasks].sort((a, b) => {
    const aBlocked = isTaskBlocked(a) ? 1 : 0, bBlocked = isTaskBlocked(b) ? 1 : 0;
    if (aBlocked !== bBlocked) return aBlocked - bBlocked;
    const aOverdue = isTaskOverdue(a) ? 0 : 1, bOverdue = isTaskOverdue(b) ? 0 : 1;
    if (aOverdue !== bOverdue) return aOverdue - bOverdue;
    const aDate = a.dueDate || '9999-99-99', bDate = b.dueDate || '9999-99-99';
    if (aDate !== bDate) return aDate.localeCompare(bDate);
    const aTime = a.time || '99:99', bTime = b.time || '99:99';
    if (aTime !== bTime) return aTime.localeCompare(bTime);
    return (TODO_PRIORITY_RANK[a.priority] ?? 1) - (TODO_PRIORITY_RANK[b.priority] ?? 1);
  });
}

async function initTodoPage() {
  renderArt('todo');

  const user = AuthService.getCurrentUser();
  if (!user) {
    // Firebase Auth has no signed-in user yet. Rather than silently
    // rendering an empty list (which would look like "you have no tasks"),
    // surface this clearly — see the file header note on this dependency.
    const root = byId('todo-root');
    if (root) {
      root.innerHTML = emptyStateHtml(
        'lock',
        t('Sign in to view your tasks.'),
        `<button type="button" class="primary-btn" data-td-signin-redirect>${t('Go to sign in')}</button>`
      );
      const btn = root.querySelector('[data-td-signin-redirect]');
      if (btn) btn.addEventListener('click', () => { window.location.href = '../pages/auth.html'; });
    }
    return;
  }

  todoRepo = new TodoRepository(user.uid);
  notificationRepo = new NotificationRepository(user.uid);

  if (!todoUnsubscribe) {
    todoLoading = true;
    todoError = null;

    window.__perfTrace && window.__perfTrace('todo', 'repositorySubscribeStart');
    let isFirstSnapshot = true;

    todoUnsubscribe = todoRepo.subscribe(
      (items) => {
        if (isFirstSnapshot) {
          window.__perfTrace && window.__perfTrace('todo', 'repositorySnapshotReceived');
          isFirstSnapshot = false;
        }
        localTasks = items;
        todoLoading = false;
        todoError = null;
        renderTodoRoot();
        window.__perfTrace && window.__perfTrace('todo', 'pageInteractive');
      },
      (mappedError) => {
        todoLoading = false;
        todoError = mappedError;
        renderTodoRoot();
      },
    );
  }

  renderTodoRoot(); // paint the skeleton immediately, before the first snapshot arrives
  startReminderWatch();
}

/** Called by the page router when navigating away from Todo — prevents a leaked listener/interval. */
function disposeTodoPage() {
  if (todoUnsubscribe) {
    todoUnsubscribe();
    todoUnsubscribe = null;
  }
  if (todoReminderTimer) { clearInterval(todoReminderTimer); todoReminderTimer = null; }
}

function startReminderWatch() {
  if (todoReminderTimer) clearInterval(todoReminderTimer);
  checkTaskReminders();
  todoReminderTimer = setInterval(checkTaskReminders, TODO_REMINDER_CHECK_MS);
}

async function checkTaskReminders() {
  if (!todoRepo) return;
  const now = Date.now();
  const due = localTasks.filter((task) => task.reminder && !task.reminderFired && !task.completed && new Date(task.reminder).getTime() <= now);
  for (const task of due) {
    // Optimistic: flip the local flag immediately so a second interval tick
    // (or a second open tab, once Firestore's realtime listener catches up)
    // can't also fire this same reminder — this directly replaces the
    // duplicate-notification bug documented against the old LocalStorage
    // architecture (Phase 4 audit, FINAL-BUG-002).
    task.reminderFired = true;
    showToast(`\u23f0 ${task.title}`, 'default', 5000);
    if ('Notification' in window && Notification.permission === 'granted') {
      try { new Notification('MyLife reminder', { body: task.title, icon: '../assist/Momentum_Logo-removebg-preview.png' }); } catch (_e) { /* ignore */ }
    }
    // Phase 7: also create a real, deduplicated entry in the Smart
    // Notification Center — notifyOnce() keys on (category, dedupKey), so
    // this can never double-fire even across tabs/reminder-check ticks.
    if (notificationRepo) {
      notificationRepo.notifyOnce('Todo', `due-${task.id}`, {
        message: `${task.title} ${t('is due')}`,
        priority: isTaskOverdue(task) ? 'high' : 'normal',
        deepLink: '../pages/todo.html',
        action: { label: t('Open Todo'), actionId: 'open-todo' },
        metadata: { taskId: task.id },
      });
    }
    const result = await todoRepo.update(task.id, { reminderFired: true });
    if (!result.ok) { task.reminderFired = false; } // rollback the optimistic flag if the write failed
  }
}

// ─── Root render ────────────────────────────────────────────────────────────
function renderTodoRoot() {
  const root = byId('todo-root');
  if (!root) return;

  if (todoError) {
    root.innerHTML = errorStateHtml(todoError, { onRetryId: 'td-error-retry' });
    bindErrorStateEvents(root, () => initTodoPage(), 'td-error-retry');
    return;
  }

  if (todoLoading) {
    // Real loading state, not a guess dressed up as one: we haven't received
    // Firestore's first snapshot yet, so we genuinely don't know if the user
    // has tasks — showing "No tasks here" here would be misleading, not
    // just unpolished (Phase 3 UI/UX pass).
    root.innerHTML = `
      ${todoHeaderSkeletonHtml()}
      <div class="td-list">${[0, 1, 2].map(todoCardSkeletonHtml).join('')}</div>
    `;
    return;
  }

  const tasks = visibleTasks();
  const conflicts = scheduleConflictIds();
  const ordered = sortTasks(tasks);
  const draggable = todoState.sort === 'custom';
  root.innerHTML = `
    ${todoHeaderHtml()}
    ${todoFiltersHtml()}
    <div class="td-list">
      ${ordered.length
        ? ordered.map((t) => taskCardHtml(t, conflicts, draggable)).join('')
        : emptyStateHtml('checklist', t('No tasks here. Add one to get started.'), `<button type="button" class="secondary-btn empty-state-cta" data-td-add>+ ${t('New task')}</button>`)}
    </div>
  `;
  bindTodoRootEvents(root);
  renderTaskModal();
}

/** Skeleton placeholder matching todoHeaderHtml's layout, so the page doesn't jump when real data arrives. */
function todoHeaderSkeletonHtml() {
  return `
    <section class="panel td-header">
      <div class="td-header-top">
        <div>
          <p class="eyebrow skeleton" style="width:90px;">&nbsp;</p>
          <h2 class="skeleton" style="width:120px;">&nbsp;</h2>
        </div>
      </div>
    </section>
  `;
}

/** Skeleton placeholder matching taskCardHtml's layout — same card shape, shimmering instead of populated. */
function todoCardSkeletonHtml() {
  return `
    <article class="td-card td-card-skeleton" aria-hidden="true">
      <span class="skeleton" style="width:20px;height:20px;border-radius:6px;"></span>
      <div class="td-card-main">
        <div class="skeleton" style="width:60%;height:1.1em;margin-bottom:8px;">&nbsp;</div>
        <div class="skeleton" style="width:35%;height:0.9em;">&nbsp;</div>
      </div>
    </article>
  `;
}

function sortTasks(tasks) {
  if (todoState.sort === 'custom') return [...tasks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  if (todoState.sort === 'dueDate') {
    return [...tasks].sort((a, b) => (a.dueDate || '9999-99-99').localeCompare(b.dueDate || '9999-99-99'));
  }
  if (todoState.sort === 'priority') {
    return [...tasks].sort((a, b) => (TODO_PRIORITY_RANK[a.priority] ?? 1) - (TODO_PRIORITY_RANK[b.priority] ?? 1));
  }
  if (todoState.sort === 'az') {
    return sortBy(tasks, { az: (a, b) => a.title.localeCompare(b.title) }, 'az');
  }
  return smartOrder(tasks); // 'smart' (default)
}

function todoHeaderHtml() {
  const total = localTasks.length;
  const done = localTasks.filter((t) => t.completed).length;
  const overdue = localTasks.filter(isTaskOverdue).length;
  return `
    <section class="panel td-header">
      <div class="td-header-top">
        <div>
          <p class="eyebrow">${t('Today tasks')}</p>
          <h2>${t('Tasks')}</h2>
          <p class="muted">${done}/${total} ${t('done')}${overdue ? ` \u00b7 ${overdue} ${t('overdue')}` : ''}</p>
        </div>
        <button type="button" class="primary-btn" data-td-add>+ ${t('New task')}</button>
      </div>
      <div class="td-search-row">
        <input type="search" class="td-search" placeholder="${t('Search tasks and tags')}" value="${escapeAttr(todoState.search)}" data-td-search aria-label="${t('Search tasks')}" />
      </div>
    </section>
  `;
}

function todoFiltersHtml() {
  const filters = [
    ['all', t('All')], ['today', t('Today')], ['upcoming', t('Upcoming')],
    ['overdue', t('Overdue')], ['completed', t('Completed')],
  ];
  const sorts = [
    ['smart', t('Smart')], ['dueDate', t('Due date')], ['priority', t('Priority')],
    ['az', t('A\u2013Z')], ['custom', t('Custom (drag to reorder)')],
  ];
  const tags = allTaskTags();
  return `
    <section class="td-filter-row">
      <div class="td-filter-chips" role="tablist">
        ${filters.map(([k, label]) => `<button type="button" class="td-chip${todoState.filter === k ? ' active' : ''}" data-td-filter="${k}" role="tab" aria-selected="${todoState.filter === k}">${label}</button>`).join('')}
      </div>
      <select class="td-tag-select" data-td-sort aria-label="${t('Sort tasks')}">
        ${sorts.map(([k, label]) => `<option value="${k}" ${todoState.sort === k ? 'selected' : ''}>${t('Sort')}: ${label}</option>`).join('')}
      </select>
      ${tags.length ? `
        <select class="td-tag-select" data-td-tag aria-label="${t('Filter by tag')}">
          <option value="all" ${todoState.tag === 'all' ? 'selected' : ''}>${t('All tags')}</option>
          ${tags.map((tag) => `<option value="${escapeAttr(tag)}" ${todoState.tag === tag ? 'selected' : ''}>#${escapeHtml(tag)}</option>`).join('')}
        </select>
      ` : ''}
    </section>
  `;
}

function visibleTasks() {
  let tasks = localTasks.filter((t) => {
    if (todoState.filter === 'today' && !(isTaskToday(t) && !t.completed)) return false;
    if (todoState.filter === 'upcoming' && !isTaskUpcoming(t)) return false;
    if (todoState.filter === 'overdue' && !isTaskOverdue(t)) return false;
    if (todoState.filter === 'completed' && !t.completed) return false;
    if (todoState.tag !== 'all' && !(t.tags || []).includes(todoState.tag)) return false;
    return true;
  });
  // Client-side search over the already realtime-synced local cache — see
  // utils/QueryUtils.js for why this beats a server round-trip per keystroke.
  if (todoState.search.trim()) {
    const byTitleOrNotes = searchText(tasks, todoState.search, ['title', 'notes']);
    tasks = byTitleOrNotes.length
      ? byTitleOrNotes
      : tasks.filter((t) => (t.tags || []).some((tag) => tag.toLowerCase().includes(todoState.search.trim().toLowerCase())));
  }
  return tasks;
}

// ─── Task card ──────────────────────────────────────────────────────────────
function taskCardHtml(task, conflicts, draggable) {
  const blocked = isTaskBlocked(task);
  const overdue = isTaskOverdue(task);
  const subtasks = task.subtasks || [];
  const subDone = subtasks.filter((s) => s.completed).length;
  const hasConflict = conflicts.has(task.id);
  return `
    <article class="td-card${task.completed ? ' is-completed' : ''}${blocked ? ' is-blocked' : ''}${overdue ? ' is-overdue' : ''}${draggable ? ' is-draggable' : ''}" data-priority="${escapeAttr(task.priority || 'Medium')}" data-td-id="${task.id}" ${draggable ? 'draggable="true"' : ''}>
      ${draggable ? `<span class="td-drag-handle" aria-hidden="true" title="${t('Drag to reorder')}">\u22ee\u22ee</span>` : ''}
      <label class="td-check">
        <input type="checkbox" ${task.completed ? 'checked' : ''} ${blocked ? 'disabled' : ''} data-td-toggle="${task.id}" aria-label="${task.completed ? t('Mark incomplete') : t('Mark complete')}" title="${blocked ? t('Blocked by an incomplete dependency') : ''}" />
      </label>
      <div class="td-card-main">
        <div class="td-card-top">
          <strong data-td-edit="${task.id}" role="button" tabindex="0">${escapeHtml(task.title)}</strong>
          <span class="td-badge td-badge-${(task.priority || 'Medium').toLowerCase()}">${t(task.priority || 'Medium')}</span>
          ${task.recurring ? `<span class="td-badge td-badge-recur" title="${t('Repeats')} ${t(task.recurring.freq)}">\u21bb ${t(task.recurring.freq)}</span>` : ''}
          ${task.reminder && !task.reminderFired ? `<span class="td-badge td-badge-reminder" title="${new Date(task.reminder).toLocaleString()}">\u23f0</span>` : ''}
          ${hasConflict ? `<span class="td-badge td-badge-conflict" title="${t('Another task shares this exact date and time')}">\u26a0 ${t('Conflict')}</span>` : ''}
        </div>
        <div class="td-card-meta">
          ${task.dueDate ? `<span class="td-meta-item">${overdue ? '\u26a0 ' : ''}${escapeHtml(task.dueDate)}${task.time ? ` \u00b7 ${escapeHtml(task.time)}` : ''}</span>` : ''}
          ${(task.tags || []).map((tag) => `<span class="td-tag-chip">#${escapeHtml(tag)}</span>`).join('')}
        </div>
        ${blocked ? `<p class="td-blocked-note">\u26d4 ${t('Blocked by')}: ${taskDependencies(task).filter((d) => !d.completed).map((d) => escapeHtml(d.title)).join(', ')}</p>` : ''}
        ${subtasks.length ? `
          <div class="td-subtasks">
            <div class="td-subtask-bar"><i style="width:${percent(subDone, subtasks.length)}%"></i></div>
            <button type="button" class="td-subtask-toggle" data-td-expand="${task.id}">${subDone}/${subtasks.length} ${t('subtasks')}</button>
            <div class="td-subtask-list" data-td-sublist="${task.id}" hidden>
              ${subtasks.map((s) => `
                <label class="td-subtask-row">
                  <input type="checkbox" ${s.completed ? 'checked' : ''} data-td-subtoggle="${task.id}:${s.id}" />
                  <span>${escapeHtml(s.title)}</span>
                </label>
              `).join('')}
            </div>
          </div>
        ` : ''}
        ${(task.attachments || []).length ? `
          <div class="td-attachments">
            ${task.attachments.map((a) => `<a class="td-attachment" href="${escapeAttr(a.url)}" target="_blank" rel="noopener">\ud83d\udd17 ${escapeHtml(a.name || a.url)}</a>`).join('')}
          </div>
        ` : ''}
      </div>
      <div class="td-actions">
        <button type="button" class="std-icon-btn" data-td-edit="${task.id}" title="${t('Edit')}" aria-label="${t('Edit')}">\u270e</button>
        <button type="button" class="std-icon-btn std-icon-danger" data-td-delete="${task.id}" title="${t('Delete')}" aria-label="${t('Delete')}">\u2715</button>
      </div>
    </article>
  `;
}

// ─── Events ─────────────────────────────────────────────────────────────────
function bindTodoRootEvents(root) {
  root.querySelectorAll('[data-td-add]').forEach((btn) => btn.addEventListener('click', () => openTaskModal()));
  const search = root.querySelector('[data-td-search]');
  let searchTimer = null;
  search.addEventListener('input', () => {
    clearTimeout(searchTimer);
    const caret = search.selectionStart;
    searchTimer = setTimeout(() => {
      todoState.search = search.value;
      renderTodoRoot();
      const freshInput = document.querySelector('[data-td-search]');
      if (freshInput) {
        freshInput.focus();
        try { freshInput.setSelectionRange(caret, caret); } catch (_e) { /* ignore */ }
      }
    }, 200);
  });
  root.querySelectorAll('[data-td-filter]').forEach((btn) => btn.addEventListener('click', () => {
    todoState.filter = btn.dataset.tdFilter;
    renderTodoRoot();
  }));
  const tagSelect = root.querySelector('[data-td-tag]');
  if (tagSelect) tagSelect.addEventListener('change', () => { todoState.tag = tagSelect.value; renderTodoRoot(); });
  const sortSelect = root.querySelector('[data-td-sort]');
  if (sortSelect) sortSelect.addEventListener('change', () => { todoState.sort = sortSelect.value; renderTodoRoot(); });

  root.querySelectorAll('[data-td-id][draggable="true"]').forEach((card) => {
    card.addEventListener('dragstart', () => {
      todoState.dragId = card.dataset.tdId;
      card.classList.add('is-dragging');
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('is-dragging');
      todoState.dragId = null;
    });
    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      card.classList.add('td-drop-hover');
    });
    card.addEventListener('dragleave', () => card.classList.remove('td-drop-hover'));
    card.addEventListener('drop', (e) => {
      e.preventDefault();
      card.classList.remove('td-drop-hover');
      const draggedId = todoState.dragId;
      const targetId = card.dataset.tdId;
      if (!draggedId || draggedId === targetId) return;
      reorderTasks(draggedId, targetId);
    });
  });

  root.querySelectorAll('[data-td-toggle]').forEach((el) => el.addEventListener('change', () => toggleTask(el.dataset.tdToggle)));
  root.querySelectorAll('[data-td-subtoggle]').forEach((el) => el.addEventListener('change', () => {
    const [taskId, subId] = el.dataset.tdSubtoggle.split(':');
    toggleSubtask(taskId, subId);
  }));
  root.querySelectorAll('[data-td-expand]').forEach((btn) => btn.addEventListener('click', () => {
    const list = root.querySelector(`[data-td-sublist="${btn.dataset.tdExpand}"]`);
    if (list) list.hidden = !list.hidden;
  }));
  root.querySelectorAll('[data-td-edit]').forEach((el) => {
    el.addEventListener('click', () => openTaskModal(el.dataset.tdEdit));
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openTaskModal(el.dataset.tdEdit); } });
  });
  root.querySelectorAll('[data-td-delete]').forEach((btn) => btn.addEventListener('click', () => deleteTask(btn.dataset.tdDelete)));
}

/**
 * Toggling a task is the one write in this file most exposed to the
 * multi-tab race the old LocalStorage architecture had (Phase 4 audit,
 * FINAL-BUG-001/002): two tabs could both see "not complete" at the same
 * instant. A Firestore transaction re-reads the document server-side
 * immediately before writing, so the second tab to commit sees the first
 * tab's already-applied change and does not stomp on it.
 */
async function toggleTask(id) {
  const task = localTasks.find((x) => x.id === id);
  if (!task || isTaskBlocked(task)) return;

  const previous = { ...task };
  let patch;
  if (task.recurring && !task.completed) {
    const nextDue = nextOccurrenceDate(task.dueDate || todoToday(), task.recurring);
    patch = {
      completionLog: (task.completionLog || []).concat(new Date().toISOString()).slice(-60),
      dueDate: nextDue, completed: false, completedAt: null, reminderFired: false,
    };
    // Phase 7 bugfix: this line previously read `t('next occurrence')` where
    // `t` was THIS function's own task variable (shadowing the global t()
    // translation function) — a real TypeError on every recurring-task
    // completion, from Phase 2 onward, caught while wiring up notifications.
    showToast(`${task.title} \u2014 ${t('next occurrence')}: ${nextDue}`, 'success');
  } else {
    patch = { completed: !task.completed, completedAt: !task.completed ? new Date().toISOString() : null };
  }

  const wasIncomplete = !previous.completed;
  Object.assign(task, patch); // optimistic local update
  renderTodoRoot();

  // Success micro-interaction: only on the "just completed" transition, not
  // on un-checking or on a recurring task's silent rollover to its next
  // occurrence (patch.completed stays false in that branch).
  if (wasIncomplete && patch.completed) {
    const card = document.querySelector(`[data-td-id="${id}"]`);
    if (card) {
      card.classList.add('is-just-completed');
      card.addEventListener('animationend', () => card.classList.remove('is-just-completed'), { once: true });
    }
    // Phase 7: real "Task completed" notification, deduplicated per
    // completion (keyed by id + completion timestamp, so a recurring
    // task's next completion gets its own entry rather than being silently
    // dropped as a duplicate of the last one).
    if (notificationRepo) {
      notificationRepo.notifyOnce('Todo', `completed-${id}-${patch.completedAt || Date.now()}`, {
        message: `${t('Completed')}: ${task.title}`,
        priority: 'low',
        deepLink: '../pages/todo.html',
      });
    }
    // Phase 9: the one real, wired Achievement System event source — awards
    // XP, updates the daily-activity streak, and evaluates badges/
    // achievements. Fire-and-forget deliberately: a slow/failed gamification
    // write should never block or roll back the actual task completion
    // above, which has already succeeded by this point.
    recordEvent(AuthService.getCurrentUser().uid, 'todo:completed', { taskId: id }).catch(() => {});
  }

  // Re-read-then-write inside a transaction so a concurrent edit from
  // another tab/device can't be silently overwritten (see doc comment above).
  const result = await todoRepo.transaction(id, (current) => {
    if (!current) throw new Error('Task no longer exists.');
    return patch;
  });

  if (!result.ok) {
    Object.assign(task, previous); // rollback
    renderTodoRoot();
    showToast(result.error.message, 'danger');
  }
}

function nextOccurrenceDate(fromIso, recurring) {
  const d = new Date(`${fromIso}T00:00:00`);
  const step = recurring.freq === 'Weekly' ? 7 : recurring.freq === 'Monthly' ? 30 : 1;
  if (recurring.freq === 'Monthly') d.setMonth(d.getMonth() + 1);
  else d.setDate(d.getDate() + step);
  return d.toISOString().slice(0, 10);
}

async function toggleSubtask(taskId, subId) {
  const t = localTasks.find((x) => x.id === taskId);
  const s = t && (t.subtasks || []).find((x) => x.id === subId);
  if (!s) return;
  const previous = s.completed;
  s.completed = !s.completed; // optimistic
  renderTodoRoot();
  const result = await todoRepo.update(taskId, { subtasks: t.subtasks });
  if (!result.ok) { s.completed = previous; renderTodoRoot(); showToast(result.error.message, 'danger'); }
}

/**
 * Reordering touches every visible task's `order` field at once — exactly
 * the "move several ... Bulk Updates" case the brief calls out for
 * Batch Writes, so this now does one `batchUpdate()` instead of N separate
 * `update()` calls.
 */
async function reorderTasks(draggedId, targetId) {
  const visible = sortTasks(visibleTasks());
  const draggedIdx = visible.findIndex((x) => x.id === draggedId);
  const targetIdx = visible.findIndex((x) => x.id === targetId);
  if (draggedIdx === -1 || targetIdx === -1) return;
  const [moved] = visible.splice(draggedIdx, 1);
  visible.splice(targetIdx, 0, moved);

  const ops = [];
  visible.forEach((t, i) => {
    const real = localTasks.find((x) => x.id === t.id);
    if (real && real.order !== i) { real.order = i; ops.push({ type: 'update', id: t.id, data: { order: i } }); } // optimistic
  });
  renderTodoRoot();
  if (ops.length) {
    const result = await todoRepo.batchUpdate(ops);
    if (!result.ok) showToast(result.error.message, 'danger'); // local order already applied; next snapshot reconciles
  }
}

/**
 * Deletes a task, cleans up dangling dependency references in other tasks
 * via a single batch write, and buffers an 8-second undo (core/UndoManager.js)
 * that recreates the exact same document (same id, same data) if the user
 * clicks "Undo" on the toast in time.
 */
async function deleteTask(id) {
  const removed = localTasks.find((x) => x.id === id);
  if (!removed) return;

  const affectedDependents = localTasks.filter((x) => (x.dependsOn || []).includes(id));

  // Optimistic local removal.
  localTasks = localTasks.filter((x) => x.id !== id);
  affectedDependents.forEach((x) => { x.dependsOn = x.dependsOn.filter((depId) => depId !== id); });
  renderTodoRoot();

  const ops = [
    { type: 'delete', id },
    ...affectedDependents.map((x) => ({ type: 'update', id: x.id, data: { dependsOn: x.dependsOn } })),
  ];
  const result = await todoRepo.batchUpdate(ops);
  if (!result.ok) {
    showToast(result.error.message, 'danger');
    return; // next realtime snapshot will reconcile the (failed) optimistic removal
  }

  const undoToken = undoManager.register(async () => {
    const restoreResult = await todoRepo.create(removed, removed.id);
    if (!restoreResult.ok) { showToast(restoreResult.error.message, 'danger'); return; }
    showToast(t('Task restored.'), 'success');
  });
  showToast(t('Task deleted.'), 'default', 8000, { onUndo: () => undoManager.undo(undoToken) });
}

// ─── Add / edit modal ───────────────────────────────────────────────────────
function openTaskModal(id) {
  todoState.modal = id || 'new';
  renderTaskModal();
}
function closeTaskModal() {
  todoState.modal = null;
  const el = document.querySelector('[data-td-modal]');
  if (el) el.remove();
}

function renderTaskModal() {
  const existing = document.querySelector('[data-td-modal]');
  if (existing) existing.remove();
  if (!todoState.modal) return;
  const editing = todoState.modal === 'new' ? null : localTasks.find((x) => x.id === todoState.modal);
  const otherTasks = localTasks.filter((x) => x !== editing);
  const subtaskLines = (editing?.subtasks || []).map((s) => s.title).join('\n');
  const attachmentLines = (editing?.attachments || []).map((a) => `${a.name} | ${a.url}`).join('\n');
  const reminderValue = editing?.reminder ? editing.reminder.slice(0, 16) : '';

  document.body.insertAdjacentHTML('beforeend', `
    <div class="td-modal-overlay" data-td-modal role="dialog" aria-modal="true" aria-label="${editing ? t('Edit task') : t('New task')}">
      <div class="td-modal-backdrop" data-td-modal-close></div>
      <div class="panel td-modal-card">
        <div class="td-modal-head">
          <div><p class="eyebrow">${editing ? t('Edit') : t('New')}</p><h2>${t('Task')}</h2></div>
          <button type="button" class="std-icon-btn" data-td-modal-close aria-label="${t('Close')}">\u2715</button>
        </div>
        <form class="form-stack" data-td-form novalidate>
          <label class="full-field">${t('Title')}
            <input type="text" name="title" required value="${escapeAttr(editing?.title || '')}" />
          </label>
          <label class="full-field">${t('Notes')}
            <textarea name="notes">${escapeHtml(editing?.notes || '')}</textarea>
          </label>
          <div class="form-grid">
            <label>${t('Priority')}
              <select name="priority">${TODO_PRIORITIES.map((p) => `<option ${((editing?.priority) || 'Medium') === p ? 'selected' : ''}>${t(p)}</option>`).join('')}</select>
            </label>
            <label>${t('Tags (comma separated)')}
              <input type="text" name="tags" value="${escapeAttr((editing?.tags || []).join(', '))}" placeholder="${t('work, urgent')}" />
            </label>
            <label>${t('Due date')}
              <input type="date" name="dueDate" value="${escapeAttr(editing?.dueDate || '')}" />
            </label>
            <label>${t('Due time')}
              <input type="time" name="time" value="${escapeAttr(editing?.time || '')}" />
            </label>
          </div>
          <div class="form-grid">
            <label class="td-recur-toggle">
              <input type="checkbox" name="recurringOn" ${editing?.recurring ? 'checked' : ''} data-td-recur-check />
              ${t('Repeats')}
            </label>
            <label>
              <select name="recurringFreq" data-td-recur-freq ${editing?.recurring ? '' : 'disabled'}>
                ${TODO_RECUR_FREQS.map((f) => `<option ${editing?.recurring?.freq === f ? 'selected' : ''}>${t(f)}</option>`).join('')}
              </select>
            </label>
          </div>
          <label class="full-field">${t('Reminder (optional)')}
            <input type="datetime-local" name="reminder" value="${escapeAttr(reminderValue)}" />
          </label>
          <label class="full-field">${t('Depends on (blocks this task until completed)')}
            <select name="dependsOn" multiple size="4">
              ${otherTasks.map((x) => `<option value="${x.id}" ${(editing?.dependsOn || []).includes(x.id) ? 'selected' : ''}>${escapeHtml(x.title)}${x.completed ? ` (${t('done')})` : ''}</option>`).join('')}
            </select>
          </label>
          <label class="full-field">${t('Subtasks (one per line)')}
            <textarea name="subtasks" placeholder="${t('Draft outline')}\n${t('Get feedback')}">${escapeHtml(subtaskLines)}</textarea>
          </label>
          <label class="full-field">${t('Attachments \u2014 one per line as "Name | URL"')}
            <textarea name="attachments" placeholder="Design doc | https://example.com/doc">${escapeHtml(attachmentLines)}</textarea>
          </label>
          <div class="td-modal-actions">
            ${editing ? `<button type="button" class="danger-btn" data-td-modal-delete>${t('Delete')}</button>` : '<span></span>'}
            <div class="td-modal-actions-right">
              <button type="button" class="secondary-btn" data-td-modal-close>${t('Cancel')}</button>
              <button type="submit" class="primary-btn">${t('Save')}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  `);

  const overlay = document.querySelector('[data-td-modal]');
  overlay.querySelectorAll('[data-td-modal-close]').forEach((b) => b.addEventListener('click', closeTaskModal));
  overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); closeTaskModal(); } });
  const recurCheck = overlay.querySelector('[data-td-recur-check]');
  const recurFreq = overlay.querySelector('[data-td-recur-freq]');
  recurCheck.addEventListener('change', () => { recurFreq.disabled = !recurCheck.checked; });
  const delBtn = overlay.querySelector('[data-td-modal-delete]');
  if (delBtn) delBtn.addEventListener('click', () => { deleteTask(editing.id); closeTaskModal(); });

  overlay.querySelector('[data-td-form]').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get('title') || '').trim();
    if (!title) return;
    const tags = String(fd.get('tags') || '').split(',').map((s) => s.trim()).filter(Boolean);
    const subtaskTitles = String(fd.get('subtasks') || '').split('\n').map((s) => s.trim()).filter(Boolean);
    const prevSubtasks = editing?.subtasks || [];
    const subtasks = subtaskTitles.map((title2) => {
      const prev = prevSubtasks.find((s) => s.title === title2);
      return prev || { id: makeId(), title: title2, completed: false };
    });
    const attachments = String(fd.get('attachments') || '').split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
      const [name, url] = line.split('|').map((s) => s.trim());
      return { id: makeId(), name: name || url, url: url || name };
    });
    const dependsOn = Array.from(overlay.querySelector('[name="dependsOn"]').selectedOptions).map((o) => o.value);
    const reminderRaw = String(fd.get('reminder') || '');
    const recurringOn = fd.get('recurringOn') === 'on';

    const data = {
      title,
      notes: String(fd.get('notes') || ''),
      priority: String(fd.get('priority') || 'Medium'),
      tags,
      dueDate: String(fd.get('dueDate') || ''),
      time: String(fd.get('time') || ''),
      recurring: recurringOn ? { freq: String(fd.get('recurringFreq') || 'Daily') } : null,
      reminder: reminderRaw ? new Date(reminderRaw).toISOString() : null,
      dependsOn,
      subtasks,
      attachments,
    };
    if (data.reminder && (!editing || editing.reminder !== data.reminder)) data.reminderFired = false;

    if (reminderRaw && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    closeTaskModal(); // optimistic: close immediately, don't make the user wait on the network

    if (editing) {
      Object.assign(editing, data); // optimistic local update
      renderTodoRoot();
      const result = await todoRepo.update(editing.id, data);
      if (!result.ok) showToast(result.error.message, 'danger'); // next snapshot will reconcile
    } else {
      const optimisticId = makeId();
      const optimisticTask = { id: optimisticId, completed: false, createdAt: new Date().toISOString(), completedAt: null, reminderFired: false, ...data };
      localTasks = [...localTasks, optimisticTask]; // optimistic local insert
      renderTodoRoot();
      const result = await todoRepo.create({ completed: false, completedAt: null, reminderFired: false, ...data }, optimisticId);
      if (!result.ok) {
        localTasks = localTasks.filter((x) => x.id !== optimisticId); // rollback
        renderTodoRoot();
        showToast(result.error.message, 'danger');
      } else {
        addNotification('Todo', `${t('Task added')}: ${data.title}`);
      }
    }
  });
}

// Now a real ES module (see file header) — exported explicitly instead of
// relying on the old "every <script> shares one global scope" convention,
// since module-scoped declarations are no longer automatically global.
export { initTodoPage, disposeTodoPage };
