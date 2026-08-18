/**
 * Todo Service Tests
 * Unit tests for business logic functions
 */

import { describe, it, expect } from 'vitest';
import {
  enrichTasksWithMeta,
  smartOrder,
  applyFiltersAndSort,
  calculateTodoStats,
  extractUniqueTags,
  detectScheduleConflicts,
} from './todoService';
import type { Task } from '../types/todo';

const createTask = (overrides: Partial<Task> = {}): Task => ({
  id: Math.random().toString(36).substring(7),
  title: 'Test Task',
  notes: '',
  priority: 'Medium',
  tags: [],
  dueDate: '',
  time: '',
  recurring: null,
  reminder: '',
  reminderFired: false,
  dependsOn: [],
  subtasks: [],
  attachments: [],
  completed: false,
  completedAt: null,
  completionLog: [],
  createdAt: new Date().toISOString(),
  order: 0,
  ...overrides,
});

describe('todoService', () => {
  describe('enrichTasksWithMeta', () => {
    it('adds metadata to tasks', () => {
      const tasks = [createTask({ id: 't1', dueDate: '2026-08-20' })];
      const enriched = enrichTasksWithMeta(tasks);
      expect(enriched[0]).toHaveProperty('isOverdue');
      expect(enriched[0]).toHaveProperty('isToday');
      expect(enriched[0]).toHaveProperty('isUpcoming');
      expect(enriched[0]).toHaveProperty('isBlocked');
    });

    it('detects overdue tasks', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tasks = [
        createTask({
          id: 't1',
          dueDate: yesterday.toISOString().split('T')[0],
          completed: false,
        }),
      ];
      const enriched = enrichTasksWithMeta(tasks);
      expect(enriched[0].isOverdue).toBe(true);
    });

    it('does not mark completed tasks as overdue', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tasks = [
        createTask({
          id: 't1',
          dueDate: yesterday.toISOString().split('T')[0],
          completed: true,
        }),
      ];
      const enriched = enrichTasksWithMeta(tasks);
      expect(enriched[0].isOverdue).toBe(false);
    });

    it('detects blocked tasks', () => {
      const tasks = [
        createTask({ id: 'dep', completed: false }),
        createTask({ id: 't1', dependsOn: ['dep'] }),
      ];
      const enriched = enrichTasksWithMeta(tasks);
      const blocked = enriched.find(t => t.id === 't1');
      expect(blocked?.isBlocked).toBe(true);
    });
  });

  describe('smartOrder', () => {
    it('sorts tasks by smart algorithm', () => {
      const tasks = [
        createTask({ id: 't1', title: 'Task 1', dueDate: '2026-08-20', priority: 'Low' }),
        createTask({ id: 't2', title: 'Task 2', dueDate: '2026-08-19', priority: 'High' }),
      ];
      const enriched = enrichTasksWithMeta(tasks);
      const sorted = smartOrder(enriched, tasks);
      expect(sorted).toHaveLength(2);
      expect(sorted[0].id).toBe('t2');
    });

    it('places unblocked tasks before blocked', () => {
      const tasks = [
        createTask({ id: 'dep', completed: false }),
        createTask({ id: 'blocked', dependsOn: ['dep'], title: 'Blocked' }),
        createTask({ id: 'unblocked', title: 'Unblocked' }),
      ];
      const enriched = enrichTasksWithMeta(tasks);
      const sorted = smartOrder(enriched, tasks);
      const unblockedIndex = sorted.findIndex(t => t.id === 'unblocked');
      const blockedIndex = sorted.findIndex(t => t.id === 'blocked');
      expect(unblockedIndex).toBeLessThan(blockedIndex);
    });

    it('prioritizes overdue tasks', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tasks = [
        createTask({ id: 'future', dueDate: tomorrow.toISOString().split('T')[0] }),
        createTask({ id: 'overdue', dueDate: yesterday.toISOString().split('T')[0] }),
      ];
      const enriched = enrichTasksWithMeta(tasks);
      const sorted = smartOrder(enriched, tasks);
      expect(sorted[0].id).toBe('overdue');
    });

    it('sorts by due date within same priority', () => {
      const tasks = [
        createTask({ id: 't1', dueDate: '2026-08-22', priority: 'High' }),
        createTask({ id: 't2', dueDate: '2026-08-20', priority: 'High' }),
      ];
      const enriched = enrichTasksWithMeta(tasks);
      const sorted = smartOrder(enriched, tasks);
      expect(sorted[0].id).toBe('t2');
    });

    it('sorts by time when dates are equal', () => {
      const tasks = [
        createTask({ id: 't1', dueDate: '2026-08-20', time: '14:00' }),
        createTask({ id: 't2', dueDate: '2026-08-20', time: '09:00' }),
      ];
      const enriched = enrichTasksWithMeta(tasks);
      const sorted = smartOrder(enriched, tasks);
      expect(sorted[0].id).toBe('t2');
    });

    it('sorts by priority when no dates', () => {
      const tasks = [
        createTask({ id: 't1', priority: 'Low' }),
        createTask({ id: 't2', priority: 'High' }),
      ];
      const enriched = enrichTasksWithMeta(tasks);
      const sorted = smartOrder(enriched, tasks);
      expect(sorted[0].id).toBe('t2');
    });
  });

  describe('applyFiltersAndSort', () => {
    it('filters active tasks', () => {
      const tasks = [
        createTask({ id: 't1', completed: false }),
        createTask({ id: 't2', completed: true }),
      ];
      const enriched = enrichTasksWithMeta(tasks);
      const filtered = applyFiltersAndSort(enriched, 'active', 'all', '', 'smart');
      expect(filtered.every(t => !t.completed)).toBe(true);
    });

    it('filters completed tasks', () => {
      const tasks = [
        createTask({ id: 't1', completed: false }),
        createTask({ id: 't2', completed: true }),
      ];
      const enriched = enrichTasksWithMeta(tasks);
      const filtered = applyFiltersAndSort(enriched, 'completed', 'all', '', 'smart');
      expect(filtered.every(t => t.completed)).toBe(true);
    });

    it('filters overdue tasks', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tasks = [
        createTask({ id: 'overdue', dueDate: yesterday.toISOString().split('T')[0], completed: false }),
        createTask({ id: 'future', dueDate: tomorrow.toISOString().split('T')[0], completed: false }),
      ];
      const enriched = enrichTasksWithMeta(tasks);
      const filtered = applyFiltersAndSort(enriched, 'overdue', 'all', '', 'smart');
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.some(t => t.id === 'overdue')).toBe(true);
    });

    it('filters by tag', () => {
      const tasks = [
        createTask({ id: 't1', tags: ['work', 'urgent'] }),
        createTask({ id: 't2', tags: ['personal'] }),
      ];
      const enriched = enrichTasksWithMeta(tasks);
      const filtered = applyFiltersAndSort(enriched, 'all', 'work', '', 'smart');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('t1');
    });

    it('searches task titles', () => {
      const tasks = [
        createTask({ id: 't1', title: 'Buy groceries' }),
        createTask({ id: 't2', title: 'Fix bug' }),
      ];
      const enriched = enrichTasksWithMeta(tasks);
      const filtered = applyFiltersAndSort(enriched, 'all', 'all', 'groceries', 'smart');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('t1');
    });

    it('searches task notes', () => {
      const tasks = [
        createTask({ id: 't1', title: 'Task 1', notes: 'Remember to buy milk' }),
        createTask({ id: 't2', title: 'Task 2', notes: 'Fix the login issue' }),
      ];
      const enriched = enrichTasksWithMeta(tasks);
      const filtered = applyFiltersAndSort(enriched, 'all', 'all', 'milk', 'smart');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('t1');
    });
  });

  describe('calculateTodoStats', () => {
    it('calculates correct stats', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const tasks = [
        createTask({ id: 't1', completed: false }),
        createTask({ id: 't2', completed: true }),
        createTask({ id: 't3', dueDate: yesterday.toISOString().split('T')[0], completed: false }),
        createTask({ id: 't4', dueDate: today }),
        createTask({ id: 't5', dueDate: tomorrow.toISOString().split('T')[0], completed: false }),
      ];
      const enriched = enrichTasksWithMeta(tasks);
      const stats = calculateTodoStats(enriched);

      expect(stats.total).toBe(5);
      expect(stats.completed).toBe(1);
      expect(stats.overdue).toBe(1);
      expect(stats.today).toBeGreaterThanOrEqual(1);
      expect(stats.upcoming).toBeGreaterThanOrEqual(1);
    });

    it('returns zero stats for empty array', () => {
      const stats = calculateTodoStats([]);
      expect(stats.total).toBe(0);
      expect(stats.completed).toBe(0);
      expect(stats.overdue).toBe(0);
      expect(stats.today).toBe(0);
      expect(stats.upcoming).toBe(0);
    });
  });

  describe('extractUniqueTags', () => {
    it('extracts unique tags from tasks', () => {
      const tasks = [
        createTask({ id: 't1', tags: ['work', 'urgent'] }),
        createTask({ id: 't2', tags: ['work', 'personal'] }),
        createTask({ id: 't3', tags: [] }),
      ];
      const enriched = enrichTasksWithMeta(tasks);
      const tags = extractUniqueTags(enriched);
      expect(tags).toContain('work');
      expect(tags).toContain('urgent');
      expect(tags).toContain('personal');
      expect(tags).toHaveLength(3);
    });

    it('returns empty array when no tags', () => {
      const tasks = [
        createTask({ id: 't1', tags: [] }),
        createTask({ id: 't2', tags: [] }),
      ];
      const enriched = enrichTasksWithMeta(tasks);
      const tags = extractUniqueTags(enriched);
      expect(tags).toEqual([]);
    });

    it('sorts tags alphabetically', () => {
      const tasks = [
        createTask({ id: 't1', tags: ['zebra', 'apple', 'banana'] }),
      ];
      const enriched = enrichTasksWithMeta(tasks);
      const tags = extractUniqueTags(enriched);
      expect(tags).toEqual(['apple', 'banana', 'zebra']);
    });
  });

  describe('detectScheduleConflicts', () => {
    it('detects conflicts when same date and time', () => {
      const tasks = [
        createTask({ id: 't1', dueDate: '2026-08-20', time: '09:00' }),
        createTask({ id: 't2', dueDate: '2026-08-20', time: '09:00' }),
      ];
      const conflicts = detectScheduleConflicts(tasks);
      expect(conflicts.length).toBeGreaterThan(0);
    });

    it('returns empty array when no conflicts', () => {
      const tasks = [
        createTask({ id: 't1', dueDate: '2026-08-20', time: '09:00' }),
        createTask({ id: 't2', dueDate: '2026-08-20', time: '10:00' }),
      ];
      expect(detectScheduleConflicts(tasks)).toEqual([]);
    });

    it('ignores tasks without time', () => {
      const tasks = [
        createTask({ id: 't1', dueDate: '2026-08-20', time: '' }),
        createTask({ id: 't2', dueDate: '2026-08-20', time: '' }),
      ];
      expect(detectScheduleConflicts(tasks)).toEqual([]);
    });

    it('ignores tasks without due date', () => {
      const tasks = [
        createTask({ id: 't1', dueDate: '', time: '09:00' }),
        createTask({ id: 't2', dueDate: '', time: '09:00' }),
      ];
      expect(detectScheduleConflicts(tasks)).toEqual([]);
    });

    it('ignores completed tasks', () => {
      const tasks = [
        createTask({ id: 't1', dueDate: '2026-08-20', time: '09:00', completed: true }),
        createTask({ id: 't2', dueDate: '2026-08-20', time: '09:00' }),
      ];
      expect(detectScheduleConflicts(tasks)).toEqual([]);
    });

    it('detects multiple conflicts', () => {
      const tasks = [
        createTask({ id: 't1', dueDate: '2026-08-20', time: '09:00' }),
        createTask({ id: 't2', dueDate: '2026-08-20', time: '09:00' }),
        createTask({ id: 't3', dueDate: '2026-08-20', time: '09:00' }),
      ];
      const conflicts = detectScheduleConflicts(tasks);
      expect(conflicts.length).toBeGreaterThan(0);
    });

    it('returns conflict with correct task IDs', () => {
      const tasks = [
        createTask({ id: 't1', dueDate: '2026-08-20', time: '09:00' }),
        createTask({ id: 't2', dueDate: '2026-08-20', time: '09:00' }),
      ];
      const conflicts = detectScheduleConflicts(tasks);
      expect(conflicts[0].taskIds).toContain('t1');
      expect(conflicts[0].taskIds).toContain('t2');
    });

    it('returns conflict with correct dateTime', () => {
      const tasks = [
        createTask({ id: 't1', dueDate: '2026-08-20', time: '09:00' }),
        createTask({ id: 't2', dueDate: '2026-08-20', time: '09:00' }),
      ];
      const conflicts = detectScheduleConflicts(tasks);
      expect(conflicts[0].dateTime).toBe('2026-08-20 09:00');
    });
  });
});
