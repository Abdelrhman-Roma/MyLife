/**
 * Todo Feature Type Definitions
 * Schema matches Firestore: todos/{uid}/items/{itemId}
 */

export type TodoPriority = 'Low' | 'Medium' | 'High';
export type TodoRecurFreq = 'Daily' | 'Weekly' | 'Monthly';
export type TodoFilter = 'all' | 'active' | 'today' | 'upcoming' | 'overdue' | 'completed';
export type TodoSort = 'smart' | 'dueDate' | 'priority' | 'created' | 'title' | 'alpha' | 'custom';

// Aliases for component compatibility
export type TaskPriority = TodoPriority;
export type RecurringFrequency = TodoRecurFreq;

/**
 * Subtask within a Task
 */
export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

/**
 * Attachment within a Task
 */
export interface Attachment {
  id: string;
  name: string;
  url: string;
}

/**
 * Recurring configuration
 */
export interface RecurringConfig {
  freq: TodoRecurFreq;
  frequency: TodoRecurFreq; // Alias for component compatibility
}

/**
 * Main Task document (Firestore schema)
 */
export interface Task {
  id: string;
  title: string;
  notes: string;
  priority: TodoPriority;
  tags: string[];
  dueDate: string; // ISO date 'YYYY-MM-DD'
  time: string; // Time 'HH:MM'
  recurring: RecurringConfig | null;
  reminder: string; // ISO datetime
  reminderFired: boolean;
  dependsOn: string[]; // Array of task IDs
  subtasks: Subtask[];
  attachments: Attachment[];
  completed: boolean;
  completedAt: string | null; // ISO datetime
  completionLog: string[]; // Array of ISO datetimes (max 60)
  createdAt: string; // ISO datetime
  order: number; // For custom sort
}

/**
 * Partial task data for creation (id, createdAt, completedAt auto-generated)
 */
export interface TaskInput {
  title: string;
  notes?: string;
  priority?: TodoPriority;
  tags?: string[];
  dueDate?: string;
  time?: string;
  recurring?: RecurringConfig | null;
  reminder?: string;
  dependsOn?: string[];
  subtasks?: Subtask[];
  attachments?: Attachment[];
}

/**
 * UI state for Todo feature
 */
export interface TodoState {
  filter: TodoFilter;
  tag: string; // 'all' or specific tag
  search: string;
  sort: TodoSort;
  expandedSubtasks: Set<string>; // Task IDs with expanded subtasks
  modalTask: Task | null; // Task being edited, null for new task
  draggedTaskId: string | null;
}

/**
 * Computed stats for Todo header
 */
export interface TodoStats {
  total: number;
  completed: number;
  overdue: number;
  today: number;
  upcoming: number;
}

/**
 * Schedule conflict (multiple tasks same date/time)
 */
export interface ScheduleConflict {
  dateTime: string; // 'YYYY-MM-DD HH:MM'
  taskIds: string[];
}

/**
 * Task with computed metadata
 */
export interface TaskWithMeta extends Task {
  isBlocked: boolean;
  isOverdue: boolean;
  isConflict: boolean;
  blockedBy: Task[]; // Tasks that block this one
  subtaskProgress: number; // 0-100
}
