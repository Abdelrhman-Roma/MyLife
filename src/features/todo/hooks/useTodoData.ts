/**
 * useTodoData Hook
 * Real-time subscription to Firestore todos with optimistic updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../../app/providers/AuthProvider';
import { TodoRepository } from '../repositories/todoRepository';
import type { Task, TaskWithMeta } from '../types/todo';
import { enrichTasksWithMeta } from '../services/todoService';

export interface TodoDataState {
  tasks: TaskWithMeta[];
  loading: boolean;
  error: string | null;
  syncing: boolean;
}

export interface TodoDataActions {
  createTask: (data: Omit<Task, 'id' | 'createdAt' | 'completedAt'>) => Promise<string | null>;
  updateTask: (id: string, patch: Partial<Task>) => Promise<boolean>;
  deleteTask: (id: string) => Promise<boolean>;
  toggleTask: (id: string) => Promise<boolean>;
  batchUpdate: (operations: Array<{ type: 'update'; id: string; data: Partial<Task> }>) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function useTodoData(): [TodoDataState, TodoDataActions] {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const repoRef = useRef<TodoRepository | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Initialize repository
  useEffect(() => {
    if (!user) {
      repoRef.current = null;
      setTasks([]);
      setLoading(false);
      return;
    }

    repoRef.current = new TodoRepository(user.uid);
  }, [user]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!repoRef.current) return;

    const repo = repoRef.current;

    const unsubscribe = repo.subscribe(
      (rawTasks) => {
        const enriched = enrichTasksWithMeta(rawTasks);
        setTasks(enriched);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Todo subscription error:', err);
        setError(err.message || 'Failed to sync tasks');
        setLoading(false);

        // Retry on retryable errors
        if (err.retryable) {
          setTimeout(() => {
            console.log('Retrying todo subscription...');
            setError(null);
          }, 3000);
        }
      }
    );

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [user]);

  // Create task with optimistic update
  const createTask = useCallback(
    async (data: Omit<Task, 'id' | 'createdAt' | 'completedAt'>): Promise<string | null> => {
      if (!repoRef.current) return null;

      setSyncing(true);
      const result = await repoRef.current.create(data);
      setSyncing(false);

      if (!result.ok) {
        setError(result.error?.message || 'Failed to create task');
        return null;
      }

      return result.data || null;
    },
    []
  );

  // Update task with optimistic update
  const updateTask = useCallback(
    async (id: string, patch: Partial<Task>): Promise<boolean> => {
      if (!repoRef.current) return false;

      // Optimistic update
      setTasks((prev) =>
        enrichTasksWithMeta(
          prev.map((t) => (t.id === id ? { ...t, ...patch } : t))
        )
      );

      setSyncing(true);
      const result = await repoRef.current.update(id, patch);
      setSyncing(false);

      if (!result.ok) {
        setError(result.error?.message || 'Failed to update task');
        // Rollback handled by real-time subscription
        return false;
      }

      return true;
    },
    []
  );

  // Delete task with optimistic update
  const deleteTask = useCallback(
    async (id: string): Promise<boolean> => {
      if (!repoRef.current) return false;

      // Optimistic removal
      const backup = tasks.slice();
      setTasks((prev) => enrichTasksWithMeta(prev.filter((t) => t.id !== id)));

      setSyncing(true);
      const result = await repoRef.current.delete(id);
      setSyncing(false);

      if (!result.ok) {
        setError(result.error?.message || 'Failed to delete task');
        setTasks(backup); // Rollback
        return false;
      }

      return true;
    },
    [tasks]
  );

  // Toggle task completion with transaction
  const toggleTask = useCallback(
    async (id: string): Promise<boolean> => {
      if (!repoRef.current) return false;

      // Optimistic toggle
      setTasks((prev) =>
        enrichTasksWithMeta(
          prev.map((t) =>
            t.id === id
              ? {
                  ...t,
                  completed: !t.completed,
                  completedAt: !t.completed ? new Date().toISOString() : null,
                }
              : t
          )
        )
      );

      setSyncing(true);
      const result = await repoRef.current.transaction(id, (current) => {
        if (!current) return {};

        const nowCompleted = !current.completed;
        const patch: Partial<Task> = {
          completed: nowCompleted,
          completedAt: nowCompleted ? new Date().toISOString() : null,
        };

        // Handle recurring tasks
        if (nowCompleted && current.recurring) {
          const now = new Date();
          patch.completionLog = [
            ...(current.completionLog || []),
            now.toISOString(),
          ];
        }

        return patch;
      });
      setSyncing(false);

      if (!result.ok) {
        setError(result.error?.message || 'Failed to toggle task');
        // Rollback handled by real-time subscription
        return false;
      }

      return true;
    },
    []
  );

  // Batch update (for reordering)
  const batchUpdate = useCallback(
    async (operations: Array<{ type: 'update'; id: string; data: Partial<Task> }>): Promise<boolean> => {
      if (!repoRef.current) return false;

      // Optimistic batch update
      setTasks((prev) => {
        const updated = prev.map((t) => {
          const op = operations.find((o) => o.id === t.id);
          return op ? { ...t, ...op.data } : t;
        });
        return enrichTasksWithMeta(updated);
      });

      setSyncing(true);
      const result = await repoRef.current.batchUpdate(operations);
      setSyncing(false);

      if (!result.ok) {
        setError(result.error?.message || 'Failed to update tasks');
        // Rollback handled by real-time subscription
        return false;
      }

      return true;
    },
    []
  );

  // Manual refresh
  const refresh = useCallback(async () => {
    if (!repoRef.current) return;

    setLoading(true);
    const result = await repoRef.current.getAll();

    if (result.ok && result.data) {
      setTasks(enrichTasksWithMeta(result.data));
      setError(null);
    } else {
      setError(result.error?.message || 'Failed to refresh tasks');
    }

    setLoading(false);
  }, []);

  return [
    { tasks, loading, error, syncing },
    { createTask, updateTask, deleteTask, toggleTask, batchUpdate, refresh },
  ];
}
