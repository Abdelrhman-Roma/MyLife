/**
 * useTodoLayout Hook
 * Manages UI state for Todo page (filters, search, sort, modal)
 */

import { useState, useCallback, useMemo } from 'react';
import type { TodoFilter, TodoSort, Task, TaskWithMeta } from '../types/todo';
import {
  applyFiltersAndSort,
  calculateTodoStats,
  extractUniqueTags,
} from '../services/todoService';

export interface TodoLayoutState {
  filter: TodoFilter;
  tag: string;
  search: string;
  sort: TodoSort;
  modalOpen: boolean;
  editingTask: Task | null;
  filteredTasks: TaskWithMeta[];
  stats: {
    total: number;
    completed: number;
    overdue: number;
    today: number;
    upcoming: number;
  };
  availableTags: string[];
}

export interface TodoLayoutActions {
  setFilter: (filter: TodoFilter) => void;
  setTag: (tag: string) => void;
  setSearch: (search: string) => void;
  setSort: (sort: TodoSort) => void;
  openAddModal: () => void;
  openEditModal: (task: Task) => void;
  closeModal: () => void;
}

export function useTodoLayout(tasks: TaskWithMeta[]): [TodoLayoutState, TodoLayoutActions] {
  const [filter, setFilter] = useState<TodoFilter>('all');
  const [tag, setTag] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [sort, setSort] = useState<TodoSort>('smart');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Calculate filtered tasks (memoized)
  const filteredTasks = useMemo(() => {
    return applyFiltersAndSort(tasks, filter, tag, search, sort) as TaskWithMeta[];
  }, [tasks, filter, tag, search, sort]);

  // Calculate stats (memoized)
  const stats = useMemo(() => {
    return calculateTodoStats(tasks);
  }, [tasks]);

  // Extract available tags (memoized)
  const availableTags = useMemo(() => {
    return extractUniqueTags(tasks);
  }, [tasks]);

  // Open add modal
  const openAddModal = useCallback(() => {
    setEditingTask(null);
    setModalOpen(true);
  }, []);

  // Open edit modal
  const openEditModal = useCallback((task: Task) => {
    setEditingTask(task);
    setModalOpen(true);
  }, []);

  // Close modal
  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingTask(null);
  }, []);

  return [
    {
      filter,
      tag,
      search,
      sort,
      modalOpen,
      editingTask,
      filteredTasks,
      stats,
      availableTags,
    },
    {
      setFilter,
      setTag,
      setSearch,
      setSort,
      openAddModal,
      openEditModal,
      closeModal,
    },
  ];
}
