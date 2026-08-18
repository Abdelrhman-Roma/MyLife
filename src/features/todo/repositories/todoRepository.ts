/**
 * Todo Repository
 * Extends BaseRepository with Todo-specific queries
 * Collection path: todos/{uid}/items/{itemId}
 */

import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  runTransaction,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../../../services/firebase/firestore';
import type { Task } from '../types/todo';

export interface RepositoryResult<T> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

export class TodoRepository {
  private moduleName = 'todos';
  private uid: string;

  constructor(uid: string) {
    if (!uid) throw new Error('TodoRepository requires uid');
    this.uid = uid;
  }

  /** Get reference to items collection */
  private get itemsCollection() {
    return collection(db, this.moduleName, this.uid, 'items');
  }

  /** Get reference to specific document */
  private itemDoc(id: string) {
    return doc(db, this.moduleName, this.uid, 'items', id);
  }

  /** Map Firebase error to user-friendly format */
  private mapError(error: any): RepositoryResult<never> {
    const code = error?.code || 'unknown';
    const retryable = ['unavailable', 'deadline-exceeded', 'resource-exhausted'].some(c => code.includes(c));

    return {
      ok: false,
      error: {
        code,
        message: error?.message || 'An error occurred',
        retryable,
      },
    };
  }

  /** Wrap async operation with error handling */
  private async tryFirebase<T>(fn: () => Promise<T>): Promise<RepositoryResult<T>> {
    try {
      const data = await fn();
      return { ok: true, data };
    } catch (error) {
      return this.mapError(error);
    }
  }

  /**
   * Get single task by ID
   */
  async get(id: string): Promise<RepositoryResult<Task | null>> {
    return this.tryFirebase(async () => {
      const snap = await getDoc(this.itemDoc(id));
      return snap.exists() ? ({ id: snap.id, ...snap.data() } as Task) : null;
    });
  }

  /**
   * Get all tasks for user
   */
  async getAll(): Promise<RepositoryResult<Task[]>> {
    return this.tryFirebase(async () => {
      const snap = await getDocs(this.itemsCollection);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Task));
    });
  }

  /**
   * Get incomplete tasks ordered by due date (for dashboard widget)
   */
  async getIncomplete(): Promise<RepositoryResult<Task[]>> {
    return this.tryFirebase(async () => {
      const q = query(
        this.itemsCollection,
        where('completed', '==', false),
        orderBy('dueDate', 'asc')
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Task));
    });
  }

  /**
   * Create new task
   */
  async create(data: Omit<Task, 'id' | 'createdAt' | 'completedAt'>): Promise<RepositoryResult<string>> {
    return this.tryFirebase(async () => {
      const id = crypto.randomUUID();
      const ref = this.itemDoc(id);
      await setDoc(ref, {
        ...data,
        ownerId: this.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return id;
    });
  }

  /**
   * Update existing task
   */
  async update(id: string, patch: Partial<Task>): Promise<RepositoryResult<null>> {
    return this.tryFirebase(async () => {
      await updateDoc(this.itemDoc(id), {
        ...patch,
        updatedAt: serverTimestamp(),
      });
      return null;
    });
  }

  /**
   * Delete task
   */
  async delete(id: string): Promise<RepositoryResult<null>> {
    return this.tryFirebase(async () => {
      await deleteDoc(this.itemDoc(id));
      return null;
    });
  }

  /**
   * Batch update multiple tasks (for reordering)
   */
  async batchUpdate(
    operations: Array<{ type: 'create' | 'update' | 'delete'; id?: string; data?: Partial<Task> }>
  ): Promise<RepositoryResult<null>> {
    return this.tryFirebase(async () => {
      const batch = writeBatch(db);

      for (const op of operations) {
        if (op.type === 'create') {
          const id = op.id || crypto.randomUUID();
          const ref = this.itemDoc(id);
          batch.set(ref, {
            ...op.data,
            ownerId: this.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } else if (op.type === 'update' && op.id) {
          batch.update(this.itemDoc(op.id), {
            ...op.data,
            updatedAt: serverTimestamp(),
          });
        } else if (op.type === 'delete' && op.id) {
          batch.delete(this.itemDoc(op.id));
        }
      }

      await batch.commit();
      return null;
    });
  }

  /**
   * Transaction-based toggle (prevents race conditions)
   */
  async transaction(
    id: string,
    updater: (current: Task | null) => Partial<Task>
  ): Promise<RepositoryResult<Partial<Task>>> {
    return this.tryFirebase(async () => {
      return await runTransaction(db, async (txn) => {
        const ref = this.itemDoc(id);
        const snap = await txn.get(ref);
        const current = snap.exists() ? ({ id: snap.id, ...snap.data() } as Task) : null;
        const patch = updater(current);
        txn.update(ref, { ...patch, updatedAt: serverTimestamp() });
        return patch;
      });
    });
  }

  /**
   * Subscribe to all tasks (realtime)
   */
  subscribe(
    callback: (tasks: Task[]) => void,
    onError?: (error: { code: string; message: string; retryable: boolean }) => void
  ): Unsubscribe {
    let lastSerialized: string | null = null;

    return onSnapshot(
      this.itemsCollection,
      (snap) => {
        const tasks = snap.docs.map(d => ({ id: d.id, ...d.data() } as Task));
        const serialized = JSON.stringify(tasks);

        // Skip duplicate snapshots (cache + server with same data)
        if (serialized === lastSerialized) return;
        lastSerialized = serialized;

        callback(tasks);
      },
      (error) => {
        if (onError) {
          const mapped = this.mapError(error);
          if (mapped.error) onError(mapped.error);
        }
      }
    );
  }

  /**
   * Subscribe to incomplete tasks only (for dashboard widget)
   */
  subscribeIncomplete(
    callback: (tasks: Task[]) => void,
    onError?: (error: { code: string; message: string; retryable: boolean }) => void
  ): Unsubscribe {
    const q = query(
      this.itemsCollection,
      where('completed', '==', false),
      orderBy('dueDate', 'asc')
    );

    let lastSerialized: string | null = null;

    return onSnapshot(
      q,
      (snap) => {
        const tasks = snap.docs.map(d => ({ id: d.id, ...d.data() } as Task));
        const serialized = JSON.stringify(tasks);

        if (serialized === lastSerialized) return;
        lastSerialized = serialized;

        callback(tasks);
      },
      (error) => {
        if (onError) {
          const mapped = this.mapError(error);
          if (mapped.error) onError(mapped.error);
        }
      }
    );
  }
}
