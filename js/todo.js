// MyLife — Tasks module (Phase 3).
// Reuses bootShell(), persist(), currentData, currentUser, escapeHtml(),
// escapeAttr(), makeId(), percent(), t(), showToast(), ensureModalLayer()
// from shared.js. currentData.tasks stays the same array/shape getCounts(),
// the Dashboard, Statistics, and workout.js's auto-generated tasks already
// depend on — every new field is additive with safe defaults.

const TODO_PRIORITIES = ['Low', 'Medium', 'High'];
const TODO_PRIORITY_RANK = { High: 0, Medium: 1, Low: 2 };
const TODO_RECUR_FREQS = ['Daily', 'Weekly', 'Monthly'];
const TODO_REMINDER_CHECK_MS = 20000;

let todoState = { filter: 'all', tag: 'all', search: '', modal: null };
let todoReminderTimer = null;

function todoToday() { return new Date().toISOString().slice(0, 10); }

function isTaskOverdue(t) { return !!t.dueDate && t.dueDate < todoToday() && !t.completed; }
function isTaskToday(t) { return !t.dueDate || t.dueDate === todoToday(); }
function isTaskUpcoming(t) { return !!t.dueDate && t.dueDate > todoToday(); }

function taskDependencies(t) {
  return (t.dependsOn || []).map((id) => currentData.tasks.find((x) => x.id === id)).filter(Boolean);
}
function isTaskBlocked(t) { return taskDependencies(t).some((d) => !d.completed); }

function allTaskTags() {
  const set = new Set();
  currentData.tasks.forEach((t) => (t.tags || []).forEach((tag) => set.add(tag)));
  return [...set].sort((a, b) => a.localeCompare(b));
}

function scheduleConflictIds() {
  const map = {};
  currentData.tasks.filter((t) => !t.completed && t.dueDate && t.time).forEach((t) => {
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

function initTodoPage() {
  renderArt('todo');
  renderTodoRoot();
  startReminderWatch();
}

function startReminderWatch() {
  if (todoReminderTimer) clearInterval(todoReminderTimer);
  checkTaskReminders();
  todoReminderTimer = setInterval(checkTaskReminders, TODO_REMINDER_CHECK_MS);
}

function checkTaskReminders() {
  if (!currentData) return;
  const now = Date.now();
  let changed = false;
  currentData.tasks.forEach((t) => {
    if (!t.reminder || t.reminderFired || t.completed) return;
    const target = new Date(t.reminder).getTime();
    if (Number.isNaN(target) || target > now) return;
    t.reminderFired = true;
    changed = true;
    showToast(`\u23f0 ${t.title}`, 'default', 5000);
    if ('Notification' in window && Notification.permission === 'granted') {
      try { new Notification('MyLife reminder', { body: t.title, icon: '../assist/Momentum_Logo-removebg-preview.png' }); } catch (_e) { /* ignore */ }
    }
  });
  if (changed) persist();
}

// ─── Root render ────────────────────────────────────────────────────────────
function renderTodoRoot() {
  const root = byId('todo-root');
  if (!root) return;
  const tasks = visibleTasks();
  const conflicts = scheduleConflictIds();
  root.innerHTML = `
    ${todoHeaderHtml()}
    ${todoFiltersHtml()}
    <div class="td-list">
      ${tasks.length
        ? smartOrder(tasks).map((t) => taskCardHtml(t, conflicts)).join('')
        : emptyStateHtml('checklist', t('No tasks here. Add one to get started.'), `<button type="button" class="secondary-btn empty-state-cta" data-td-add>+ ${t('New task')}</button>`)}
    </div>
  `;
  bindTodoRootEvents(root);
  renderTaskModal();
}

function todoHeaderHtml() {
  const total = currentData.tasks.length;
  const done = currentData.tasks.filter((t) => t.completed).length;
  const overdue = currentData.tasks.filter(isTaskOverdue).length;
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
  const tags = allTaskTags();
  return `
    <section class="td-filter-row">
      <div class="td-filter-chips" role="tablist">
        ${filters.map(([k, label]) => `<button type="button" class="td-chip${todoState.filter === k ? ' active' : ''}" data-td-filter="${k}" role="tab" aria-selected="${todoState.filter === k}">${label}</button>`).join('')}
      </div>
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
  const q = todoState.search.trim().toLowerCase();
  return currentData.tasks.filter((t) => {
    if (todoState.filter === 'today' && !(isTaskToday(t) && !t.completed)) return false;
    if (todoState.filter === 'upcoming' && !isTaskUpcoming(t)) return false;
    if (todoState.filter === 'overdue' && !isTaskOverdue(t)) return false;
    if (todoState.filter === 'completed' && !t.completed) return false;
    if (todoState.filter === 'all' && t.completed) return false;
    if (todoState.tag !== 'all' && !(t.tags || []).includes(todoState.tag)) return false;
    if (q) {
      const hay = `${t.title} ${t.notes || ''} ${(t.tags || []).join(' ')}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

// ─── Task card ──────────────────────────────────────────────────────────────
function taskCardHtml(t, conflicts) {
  const blocked = isTaskBlocked(t);
  const overdue = isTaskOverdue(t);
  const subtasks = t.subtasks || [];
  const subDone = subtasks.filter((s) => s.completed).length;
  const hasConflict = conflicts.has(t.id);
  return `
    <article class="td-card${t.completed ? ' is-completed' : ''}${blocked ? ' is-blocked' : ''}${overdue ? ' is-overdue' : ''}" data-priority="${escapeAttr(t.priority || 'Medium')}">
      <label class="td-check">
        <input type="checkbox" ${t.completed ? 'checked' : ''} ${blocked ? 'disabled' : ''} data-td-toggle="${t.id}" aria-label="${t.completed ? t('Mark incomplete') : t('Mark complete')}" title="${blocked ? t('Blocked by an incomplete dependency') : ''}" />
      </label>
      <div class="td-card-main">
        <div class="td-card-top">
          <strong data-td-edit="${t.id}" role="button" tabindex="0">${escapeHtml(t.title)}</strong>
          <span class="td-badge td-badge-${(t.priority || 'Medium').toLowerCase()}">${t(t.priority || 'Medium')}</span>
          ${t.recurring ? `<span class="td-badge td-badge-recur" title="${t('Repeats')} ${t(t.recurring.freq)}">\u21bb ${t(t.recurring.freq)}</span>` : ''}
          ${t.reminder && !t.reminderFired ? `<span class="td-badge td-badge-reminder" title="${new Date(t.reminder).toLocaleString()}">\u23f0</span>` : ''}
          ${hasConflict ? `<span class="td-badge td-badge-conflict" title="${t('Another task shares this exact date and time')}">\u26a0 ${t('Conflict')}</span>` : ''}
        </div>
        <div class="td-card-meta">
          ${t.dueDate ? `<span class="td-meta-item">${overdue ? '\u26a0 ' : ''}${escapeHtml(t.dueDate)}${t.time ? ` \u00b7 ${escapeHtml(t.time)}` : ''}</span>` : ''}
          ${(t.tags || []).map((tag) => `<span class="td-tag-chip">#${escapeHtml(tag)}</span>`).join('')}
        </div>
        ${blocked ? `<p class="td-blocked-note">\u26d4 ${t('Blocked by')}: ${taskDependencies(t).filter((d) => !d.completed).map((d) => escapeHtml(d.title)).join(', ')}</p>` : ''}
        ${subtasks.length ? `
          <div class="td-subtasks">
            <div class="td-subtask-bar"><i style="width:${percent(subDone, subtasks.length)}%"></i></div>
            <button type="button" class="td-subtask-toggle" data-td-expand="${t.id}">${subDone}/${subtasks.length} ${t('subtasks')}</button>
            <div class="td-subtask-list" data-td-sublist="${t.id}" hidden>
              ${subtasks.map((s) => `
                <label class="td-subtask-row">
                  <input type="checkbox" ${s.completed ? 'checked' : ''} data-td-subtoggle="${t.id}:${s.id}" />
                  <span>${escapeHtml(s.title)}</span>
                </label>
              `).join('')}
            </div>
          </div>
        ` : ''}
        ${(t.attachments || []).length ? `
          <div class="td-attachments">
            ${t.attachments.map((a) => `<a class="td-attachment" href="${escapeAttr(a.url)}" target="_blank" rel="noopener">\ud83d\udd17 ${escapeHtml(a.name || a.url)}</a>`).join('')}
          </div>
        ` : ''}
      </div>
      <div class="td-actions">
        <button type="button" class="std-icon-btn" data-td-edit="${t.id}" title="${t('Edit')}" aria-label="${t('Edit')}">\u270e</button>
        <button type="button" class="std-icon-btn std-icon-danger" data-td-delete="${t.id}" title="${t('Delete')}" aria-label="${t('Delete')}">\u2715</button>
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
    searchTimer = setTimeout(() => { todoState.search = search.value; renderTodoRoot(); }, 200);
  });
  root.querySelectorAll('[data-td-filter]').forEach((btn) => btn.addEventListener('click', () => {
    todoState.filter = btn.dataset.tdFilter;
    renderTodoRoot();
  }));
  const tagSelect = root.querySelector('[data-td-tag]');
  if (tagSelect) tagSelect.addEventListener('change', () => { todoState.tag = tagSelect.value; renderTodoRoot(); });

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

function toggleTask(id) {
  const t = currentData.tasks.find((x) => x.id === id);
  if (!t || isTaskBlocked(t)) return;
  if (t.recurring && !t.completed) {
    // Recurring task: log this completion, then roll forward to the next
    // occurrence instead of leaving it permanently checked off.
    t.completionLog = (t.completionLog || []).concat(new Date().toISOString()).slice(-60);
    t.dueDate = nextOccurrenceDate(t.dueDate || todoToday(), t.recurring);
    t.completed = false;
    t.completedAt = null;
    t.reminderFired = false;
    showToast(`${t.title} \u2014 ${t('next occurrence')}: ${t.dueDate}`, 'success');
  } else {
    t.completed = !t.completed;
    t.completedAt = t.completed ? new Date().toISOString() : null;
  }
  persist();
  renderTodoRoot();
  syncDependentBlockedStates();
}

function syncDependentBlockedStates() {
  // No stored state to flip here (blocked is computed live), but re-render
  // so any task depending on the one just toggled reflects instantly.
  renderTodoRoot();
}

function nextOccurrenceDate(fromIso, recurring) {
  const d = new Date(`${fromIso}T00:00:00`);
  const step = recurring.freq === 'Weekly' ? 7 : recurring.freq === 'Monthly' ? 30 : 1;
  if (recurring.freq === 'Monthly') d.setMonth(d.getMonth() + 1);
  else d.setDate(d.getDate() + step);
  return d.toISOString().slice(0, 10);
}

function toggleSubtask(taskId, subId) {
  const t = currentData.tasks.find((x) => x.id === taskId);
  const s = t && (t.subtasks || []).find((x) => x.id === subId);
  if (!s) return;
  s.completed = !s.completed;
  persist();
  renderTodoRoot();
}

function deleteTask(id) {
  currentData.tasks = currentData.tasks.filter((x) => x.id !== id);
  // Clean up dangling dependency references in other tasks.
  currentData.tasks.forEach((x) => { if (x.dependsOn) x.dependsOn = x.dependsOn.filter((depId) => depId !== id); });
  persist();
  renderTodoRoot();
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
  const editing = todoState.modal === 'new' ? null : currentData.tasks.find((x) => x.id === todoState.modal);
  const otherTasks = currentData.tasks.filter((x) => x !== editing);
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

  overlay.querySelector('[data-td-form]').addEventListener('submit', (e) => {
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

    if (editing) {
      Object.assign(editing, data);
    } else {
      currentData.tasks.push({ id: makeId(), completed: false, createdAt: new Date().toISOString(), completedAt: null, reminderFired: false, ...data });
    }
    persist();
    closeTaskModal();
    renderTodoRoot();
  });
}
