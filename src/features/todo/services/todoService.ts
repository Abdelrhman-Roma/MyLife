/**
 * Todo Service - Business Logic
 * Pure functions for task operations, sorting, filtering, and conflict detection
 */

import type {
  Task,
  TaskWithMeta,
  TodoFilter,
  TodoSort,
  TodoStats,
  ScheduleConflict,
} from '../types/todo';

/**
 * Check if task is blocked by incomplete dependencies
 */
export function isTaskBlocked(task: Task, allTasks: Task[]): boolean {
  if (!task.dependsOn || task.dependsOn.length === 0) return false;

  return task.dependsOn.some((depId) => {
    const depTask = allTasks.find((t) => t.id === depId);
    return depTask && !depTask.completed;
  });
}

/**
 * Check if task is overdue
 */
export function isTaskOverdue(task: Task): boolean {
  if (!task.dueDate || task.completed) return false;

  const now = new Date();
  const dueDateTime = task.time
    ? new Date(`${task.dueDate}T${task.time}`)
    : new Date(`${task.dueDate}T23:59:59`);

  return dueDateTime < now;
}

/**
 * Get tasks that block a specific task
 */
export function getBlockingTasks(task: Task, allTasks: Task[]): Task[] {
  if (!task.dependsOn || task.dependsOn.length === 0) return [];

  return task.dependsOn
    .map((depId) => allTasks.find((t) => t.id === depId))
    .filter((t): t is Task => t !== undefined && !t.completed);
}

/**
 * Calculate subtask completion progress (0-100)
 */
export function calculateSubtaskProgress(task: Task): number {
  if (!task.subtasks || task.subtasks.length === 0) return 0;

  const completed = task.subtasks.filter((st) => st.completed).length;
  return Math.round((completed / task.subtasks.length) * 100);
}

/**
 * Detect schedule conflicts (multiple tasks same date/time)
 */
export function detectScheduleConflicts(tasks: Task[]): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];
  const dateTimeMap = new Map<string, string[]>();

  // Group tasks by date/time
  tasks
    .filter((t) => !t.completed && t.dueDate && t.time)
    .forEach((t) => {
      const key = `${t.dueDate} ${t.time}`;
      const ids = dateTimeMap.get(key) || [];
      ids.push(t.id);
      dateTimeMap.set(key, ids);
    });

  // Find conflicts (2+ tasks same time)
  dateTimeMap.forEach((taskIds, dateTime) => {
    if (taskIds.length > 1) {
      conflicts.push({ dateTime, taskIds });
    }
  });

  return conflicts;
}

/**
 * Check if specific task has a schedule conflict
 */
export function hasScheduleConflict(task: Task, conflicts: ScheduleConflict[]): boolean {
  return conflicts.some((c) => c.taskIds.includes(task.id));
}

/**
 * Calculate next occurrence for recurring task
 */
export function calculateNextOccurrence(task: Task): string {
  if (!task.recurring || !task.dueDate) return task.dueDate;

  const current = new Date(task.dueDate);
  const { freq } = task.recurring;

  switch (freq) {
    case 'Daily':
      current.setDate(current.getDate() + 1);
      break;
    case 'Weekly':
      current.setDate(current.getDate() + 7);
      break;
    case 'Monthly':
      current.setMonth(current.getMonth() + 1);
      break;
  }

  return current.toISOString().split('T')[0]; // Return YYYY-MM-DD
}

/**
 * Smart ordering algorithm (rule-based)
 * Priority: unblocked > blocked, overdue > not overdue, due date, time, priority
 */
export function smartOrder(tasks: Task[], allTasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    // 1. Unblocked before blocked
    const aBlocked = isTaskBlocked(a, allTasks) ? 1 : 0;
    const bBlocked = isTaskBlocked(b, allTasks) ? 1 : 0;
    if (aBlocked !== bBlocked) return aBlocked - bBlocked;

    // 2. Overdue before not overdue
    const aOverdue = isTaskOverdue(a) ? 1 : 0;
    const bOverdue = isTaskOverdue(b) ? 1 : 0;
    if (aOverdue !== bOverdue) return bOverdue - aOverdue; // Reverse: overdue first

    // 3. By due date (earlier first)
    if (a.dueDate && b.dueDate) {
      const dateCompare = a.dueDate.localeCompare(b.dueDate);
      if (dateCompare !== 0) return dateCompare;

      // 4. By time (earlier first)
      if (a.time && b.time) {
        const timeCompare = a.time.localeCompare(b.time);
        if (timeCompare !== 0) return timeCompare;
      }
      if (a.time && !b.time) return -1;
      if (!a.time && b.time) return 1;
    }
    if (a.dueDate && !b.dueDate) return -1;
    if (!a.dueDate && b.dueDate) return 1;

    // 5. By priority (High > Medium > Low)
    const priorityOrder = { High: 0, Medium: 1, Low: 2 };
    const aPrio = priorityOrder[a.priority] ?? 3;
    const bPrio = priorityOrder[b.priority] ?? 3;
    if (aPrio !== bPrio) return aPrio - bPrio;

    // 6. By title (alphabetical)
    return a.title.localeCompare(b.title);
  });
}

/**
 * Sort tasks by due date
 */
export function sortByDueDate(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;

    const dateCompare = a.dueDate.localeCompare(b.dueDate);
    if (dateCompare !== 0) return dateCompare;

    // Same date: sort by time
    if (a.time && b.time) return a.time.localeCompare(b.time);
    if (a.time) return -1;
    if (b.time) return 1;
    return 0;
  });
}

/**
 * Sort tasks by priority (High > Medium > Low)
 */
export function sortByPriority(tasks: Task[]): Task[] {
  const priorityOrder = { High: 0, Medium: 1, Low: 2 };
  return [...tasks].sort((a, b) => {
    const aPrio = priorityOrder[a.priority] ?? 3;
    const bPrio = priorityOrder[b.priority] ?? 3;
    if (aPrio !== bPrio) return aPrio - bPrio;
    return a.title.localeCompare(b.title);
  });
}

/**
 * Sort tasks alphabetically by title
 */
export function sortAlphabetically(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => a.title.localeCompare(b.title));
}

/**
 * Sort tasks by custom order field
 */
export function sortByCustomOrder(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/**
 * Apply sort method to tasks
 */
export function applySort(tasks: Task[], sort: TodoSort, allTasks: Task[]): Task[] {
  switch (sort) {
    case 'smart':
      return smartOrder(tasks, allTasks);
    case 'dueDate':
      return sortByDueDate(tasks);
    case 'priority':
      return sortByPriority(tasks);
    case 'alpha':
      return sortAlphabetically(tasks);
    case 'custom':
      return sortByCustomOrder(tasks);
    default:
      return tasks;
  }
}

/**
 * Filter tasks by status
 */
export function filterByStatus(tasks: Task[], filter: TodoFilter): Task[] {
  const today = new Date().toISOString().split('T')[0];

  switch (filter) {
    case 'all':
      return tasks.filter((t) => !t.completed);
    case 'today':
      return tasks.filter((t) => !t.completed && t.dueDate === today);
    case 'upcoming':
      return tasks.filter((t) => !t.completed && t.dueDate && t.dueDate > today);
    case 'overdue':
      return tasks.filter((t) => isTaskOverdue(t));
    case 'completed':
      return tasks.filter((t) => t.completed);
    default:
      return tasks;
  }
}

/**
 * Filter tasks by tag
 */
export function filterByTag(tasks: Task[], tag: string): Task[] {
  if (tag === 'all') return tasks;
  return tasks.filter((t) => t.tags.includes(tag));
}

/**
 * Search tasks by query (title, notes, tags)
 */
export function searchTasks(tasks: Task[], query: string): Task[] {
  if (!query.trim()) return tasks;

  const lowerQuery = query.toLowerCase();
  return tasks.filter(
    (t) =>
      t.title.toLowerCase().includes(lowerQuery) ||
      t.notes.toLowerCase().includes(lowerQuery) ||
      t.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Apply all filters (status, tag, search) and sort
 */
export function applyFiltersAndSort(
  tasks: Task[],
  filter: TodoFilter,
  tag: string,
  search: string,
  sort: TodoSort
): Task[] {
  let filtered = filterByStatus(tasks, filter);
  filtered = filterByTag(filtered, tag);
  filtered = searchTasks(filtered, search);
  return applySort(filtered, sort, tasks);
}

/**
 * Calculate todo stats for header
 */
export function calculateTodoStats(tasks: Task[]): TodoStats {
  const today = new Date().toISOString().split('T')[0];

  return {
    total: tasks.length,
    completed: tasks.filter((t) => t.completed).length,
    overdue: tasks.filter((t) => isTaskOverdue(t)).length,
    today: tasks.filter((t) => !t.completed && t.dueDate === today).length,
    upcoming: tasks.filter((t) => !t.completed && t.dueDate && t.dueDate > today).length,
  };
}

/**
 * Get all unique tags from tasks
 */
export function extractUniqueTags(tasks: Task[]): string[] {
  const tagSet = new Set<string>();
  tasks.forEach((t) => t.tags.forEach((tag) => tagSet.add(tag)));
  return Array.from(tagSet).sort();
}

/**
 * Enrich task with computed metadata
 */
export function enrichTaskWithMeta(task: Task, allTasks: Task[], conflicts: ScheduleConflict[]): TaskWithMeta {
  return {
    ...task,
    isBlocked: isTaskBlocked(task, allTasks),
    isOverdue: isTaskOverdue(task),
    isConflict: hasScheduleConflict(task, conflicts),
    blockedBy: getBlockingTasks(task, allTasks),
    subtaskProgress: calculateSubtaskProgress(task),
  };
}

/**
 * Enrich all tasks with metadata
 */
export function enrichTasksWithMeta(tasks: Task[]): TaskWithMeta[] {
  const conflicts = detectScheduleConflicts(tasks);
  return tasks.map((t) => enrichTaskWithMeta(t, tasks, conflicts));
}

/**
 * Parse comma-separated tags from input string
 */
export function parseTags(input: string): string[] {
  return input
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

/**
 * Parse attachments from textarea (one per line: "name | url")
 */
export function parseAttachments(input: string): Array<{ id: string; name: string; url: string }> {
  return input
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.includes('|'))
    .map((line) => {
      const [name, url] = line.split('|').map((s) => s.trim());
      return { id: crypto.randomUUID(), name, url };
    });
}

/**
 * Parse subtasks from textarea (one per line)
 */
export function parseSubtasks(input: string): Array<{ id: string; title: string; completed: boolean }> {
  return input
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => ({
      id: crypto.randomUUID(),
      title: line,
      completed: false,
    }));
}

/**
 * Format attachments for textarea display
 */
export function formatAttachments(attachments: Array<{ name: string; url: string }>): string {
  return attachments.map((a) => `${a.name} | ${a.url}`).join('\n');
}

/**
 * Format subtasks for textarea display
 */
export function formatSubtasks(subtasks: Array<{ title: string; completed: boolean }>): string {
  return subtasks.map((s) => s.title).join('\n');
}

/**
 * Check if reminder should fire
 */
export function shouldFireReminder(task: Task): boolean {
  if (!task.reminder || task.reminderFired || task.completed) return false;

  const reminderTime = new Date(task.reminder);
  const now = new Date();

  return reminderTime <= now;
}

/**
 * Get tasks with reminders ready to fire
 */
export function getTasksWithDueReminders(tasks: Task[]): Task[] {
  return tasks.filter((t) => shouldFireReminder(t));
}
