/**
 * repositories/TodoRepository.js
 * ---------------------------------------------------------------------------
 * Repository for the Todo module. All Todo data lives at
 * todos/{uid}/items/{itemId} (see BaseRepository for why).
 *
 * This file is intentionally thin: module-specific query helpers belong
 * here, but generic CRUD/realtime/batch/transaction logic stays in
 * BaseRepository so it is implemented, tested, and fixed exactly once.
 */

import { BaseRepository } from './BaseRepository.js';

export class TodoRepository extends BaseRepository {
  /** @param {string} uid */
  constructor(uid) {
    super('todos', uid);
  }

  /** Fetches only incomplete tasks, oldest due date first. */
  getIncomplete() {
    return this.getAll({ where: [['completed', '==', false]], orderBy: ['dueDate', 'asc'] });
  }

  /** Subscribes to incomplete tasks only (e.g. for a dashboard "up next" widget). */
  subscribeIncomplete(callback, onError) {
    return this.subscribe(callback, onError, { where: [['completed', '==', false]], orderBy: ['dueDate', 'asc'] });
  }
}
