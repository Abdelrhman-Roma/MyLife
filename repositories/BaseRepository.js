/**
 * repositories/BaseRepository.js
 * ---------------------------------------------------------------------------
 * Generic Firestore repository. Every per-module repository (TodoRepository,
 * HabitRepository, GoalRepository, ...) extends this instead of re-implementing
 * get/getAll/create/update/delete/subscribe/batch/transaction from scratch.
 *
 * DATA LAYOUT
 * -----------
 * Per the brief's "use UID as root ownership" requirement, every module's
 * data lives at:
 *     users/{uid}/{moduleName}/{itemId}
 * e.g. users/abc123/todos/xYz, users/abc123/habits/qRs. This keeps each
 * user's data in its own document subtree, which is exactly what makes a
 * simple, auditable Firestore Security Rule possible (see firestore.rules):
 * a single `request.auth.uid == uid` check at the `{moduleName}/{uid}/**`
 * level secures every module at once, with no per-document `ownerId` field
 * required for the security boundary itself (repositories still stamp an
 * `ownerId` field on every document as defense-in-depth — see
 * utils/validators.js `assertOwnership`).
 *
 * UI code should never import this class directly — it should go through a
 * concrete repository (e.g. `new TodoRepository(uid)`), which is what "never
 * let UI directly communicate with Firestore" means in practice.
 */

import {
  collectionRef, docRef, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, orderBy, limit, startAfter, writeBatch, runTransaction, serverTimestamp,
} from '../firebase/firestore.js';
import { tryFirebase, mapFirebaseError } from '../core/ErrorMapper.js';
import { assertUid, assertId, assertPlainObject } from '../utils/validators.js';

/**
 * @template T
 */
export class BaseRepository {
  /**
   * @param {string} moduleName - e.g. 'todos', 'habits', 'goals'
   * @param {string} uid - the signed-in user's Firebase Auth UID
   */
  constructor(moduleName, uid) {
    assertUid(uid);
    this.moduleName = moduleName;
    this.uid = uid;
  }

  /** @returns {import('firebase/firestore').CollectionReference} the `users/{uid}/{module}` collection */
  get itemsCollection() {
    return collectionRef('users', this.uid, this.moduleName);
  }

  /** @param {string} id @returns {import('firebase/firestore').DocumentReference} */
  itemDoc(id) {
    assertId(id);
    return docRef('users', this.uid, this.moduleName, id);
  }

  /**
   * Fetches a single document by id.
   * @param {string} id
   * @returns {Promise<{ ok: true, data: (T & {id: string})|null } | { ok: false, error: import('../core/ErrorMapper.js').MappedError }>}
   */
  get(id) {
    return tryFirebase(async () => {
      const snap = await getDoc(this.itemDoc(id));
      return snap.exists() ? { id: snap.id, ...snap.data() } : null;
    });
  }

  /** Alias for `get()` — Phase 2's spec names this method `getById()`. @param {string} id */
  getById(id) {
    return this.get(id);
  }

  /**
   * Fetches every document for this user in this module.
   * @param {{ where?: [string, import('firebase/firestore').WhereFilterOp, unknown][], orderBy?: [string, ('asc'|'desc')?], limit?: number }} [options]
   * @returns {Promise<{ ok: true, data: (T & {id: string})[] } | { ok: false, error: import('../core/ErrorMapper.js').MappedError }>}
   */
  getAll(options = {}) {
    return tryFirebase(async () => {
      const constraints = [
        ...(options.where || []).map(([field, op, value]) => where(field, op, value)),
        ...(options.orderBy ? [orderBy(...options.orderBy)] : []),
        ...(options.limit ? [limit(options.limit)] : []),
      ];
      const q = constraints.length ? query(this.itemsCollection, ...constraints) : this.itemsCollection;
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    });
  }

  /**
   * Creates a new document. If `id` is omitted, Firestore assigns one.
   * Every document is stamped with `ownerId`, `createdAt`, and `updatedAt`.
   * @param {T} data
   * @param {string} [id]
   * @returns {Promise<{ ok: true, data: string } | { ok: false, error: import('../core/ErrorMapper.js').MappedError }>} resolves with the new document's id
   */
  create(data, id) {
    assertPlainObject(data);
    return tryFirebase(async () => {
      const ref = id ? this.itemDoc(id) : docRef('users', this.uid, this.moduleName, crypto.randomUUID());
      await setDoc(ref, { ...data, ownerId: this.uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      return ref.id;
    });
  }

  /**
   * Partially updates an existing document. Always bumps `updatedAt`.
   * @param {string} id
   * @param {Partial<T>} patch
   * @returns {Promise<{ ok: true, data: null } | { ok: false, error: import('../core/ErrorMapper.js').MappedError }>}
   */
  update(id, patch) {
    assertPlainObject(patch);
    return tryFirebase(async () => {
      await updateDoc(this.itemDoc(id), { ...patch, updatedAt: serverTimestamp() });
      return null;
    });
  }

  /**
   * Deletes a document.
   * @param {string} id
   * @returns {Promise<{ ok: true, data: null } | { ok: false, error: import('../core/ErrorMapper.js').MappedError }>}
   */
  delete(id) {
    return tryFirebase(async () => {
      await deleteDoc(this.itemDoc(id));
      return null;
    });
  }

  /**
   * Subscribes to realtime changes across the whole collection (or a
   * filtered subset). UI pages should call this rather than importing
   * `onSnapshot` from Firestore directly.
   * @param {(items: (T & {id: string})[]) => void} callback
   * @param {(error: import('../core/ErrorMapper.js').MappedError) => void} [onError]
   * @param {{ where?: [string, import('firebase/firestore').WhereFilterOp, unknown][], orderBy?: [string, ('asc'|'desc')?] }} [options]
   * @returns {() => void} unsubscribe function
   */
  subscribe(callback, onError, options = {}) {
    const constraints = [
      ...(options.where || []).map(([field, op, value]) => where(field, op, value)),
      ...(options.orderBy ? [orderBy(...options.orderBy)] : []),
    ];
    const q = constraints.length ? query(this.itemsCollection, ...constraints) : this.itemsCollection;
    return onSnapshot(
      q,
      (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (error) => { if (onError) onError(mapFirebaseError(error)); }
    );
  }

  /**
   * Cursor-based pagination. Even though today's UI renders full lists (via
   * `subscribe`), large collections (Study session history, Workout history,
   * Quran reading log) will eventually need this rather than fetching
   * everything — so the method exists and is tested now, ready to wire into
   * a "Load more" control whenever a page needs it.
   * @param {{ pageSize: number, cursor?: import('firebase/firestore').QueryDocumentSnapshot, orderByField?: string, direction?: 'asc'|'desc', where?: [string, import('firebase/firestore').WhereFilterOp, unknown][] }} options
   * @returns {Promise<{ ok: true, data: { items: (T & {id:string})[], nextCursor: import('firebase/firestore').QueryDocumentSnapshot|null } } | { ok: false, error: import('../core/ErrorMapper.js').MappedError }>}
   */
  paginate({ pageSize, cursor, orderByField = 'createdAt', direction = 'desc', where: whereClauses = [] }) {
    return tryFirebase(async () => {
      const constraints = [
        ...whereClauses.map(([field, op, value]) => where(field, op, value)),
        orderBy(orderByField, direction),
        ...(cursor ? [startAfter(cursor)] : []),
        limit(pageSize),
      ];
      const snap = await getDocs(query(this.itemsCollection, ...constraints));
      return {
        items: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
        nextCursor: snap.docs.length === pageSize ? snap.docs[snap.docs.length - 1] : null,
      };
    });
  }

  /**
   * Server-side "starts with" search on a single field, using the standard
   * Firestore range-query trick (`>= term` and `<= term + '\uf8ff'`). This is
   * intentionally narrow (prefix match on one field, case-sensitive) — true
   * full-text/fuzzy search is out of scope for Firestore itself. For
   * already-realtime-synced lists, prefer filtering the local array your
   * `subscribe()` callback already received (see utils/QueryUtils.js) rather
   * than round-tripping to the server on every keystroke; use this method
   * specifically when you have NOT already loaded the full collection
   * (e.g. searching Study/Workout history beyond what's paginated locally).
   * @param {string} field @param {string} term
   */
  searchByPrefix(field, term) {
    return tryFirebase(async () => {
      const snap = await getDocs(query(
        this.itemsCollection,
        where(field, '>=', term),
        where(field, '<=', `${term}\uf8ff`),
      ));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    });
  }

  /**
   * Runs several create/update/delete operations atomically. `operations` is
   * an array of `{ type: 'create'|'update'|'delete', id?, data? }`. All-or-
   * nothing: either every operation is applied, or none are.
   * @param {{ type: 'create'|'update'|'delete', id?: string, data?: Partial<T> }[]} operations
   */
  batch(operations) {
    return tryFirebase(async () => {
      const b = writeBatch(this.itemsCollection.firestore);
      for (const op of operations) {
        if (op.type === 'create') {
          const ref = op.id ? this.itemDoc(op.id) : docRef('users', this.uid, this.moduleName, crypto.randomUUID());
          b.set(ref, { ...op.data, ownerId: this.uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        } else if (op.type === 'update') {
          assertId(op.id);
          b.update(this.itemDoc(op.id), { ...op.data, updatedAt: serverTimestamp() });
        } else if (op.type === 'delete') {
          assertId(op.id);
          b.delete(this.itemDoc(op.id));
        }
      }
      await b.commit();
      return null;
    });
  }

  /**
   * Alias for `batch()` — Phase 2's spec names this method `batchUpdate()`.
   * Kept as a thin alias rather than a second implementation so there is
   * still exactly one batch-write code path to test and fix.
   * @param {{ type: 'create'|'update'|'delete', id?: string, data?: Partial<T> }[]} operations
   */
  batchUpdate(operations) {
    return this.batch(operations);
  }

  /**
   * Runs a read-modify-write transaction, guarding against lost updates when
   * two clients edit the same document concurrently (the Firestore-native
   * fix for the multi-tab last-write-wins data-loss bug documented against
   * the old LocalStorage architecture in the Phase 4 audit).
   *
   * `updater(current)` must return the PATCH to write (not the full new
   * document) — this method applies it with `txn.update()` inside the same
   * transaction that read `current`, so the read and the write are
   * guaranteed atomic against concurrent edits to the same document.
   * @param {string} id
   * @param {(current: (T & {id: string})|null) => Partial<T>} updater
   * @returns {Promise<{ ok: true, data: Partial<T> } | { ok: false, error: import('../core/ErrorMapper.js').MappedError }>}
   */
  transaction(id, updater) {
    return tryFirebase(() => runTransaction(this.itemsCollection.firestore, async (txn) => {
      const ref = this.itemDoc(id);
      const snap = await txn.get(ref);
      const current = snap.exists() ? { id: snap.id, ...snap.data() } : null;
      const patch = updater(current);
      txn.update(ref, { ...patch, updatedAt: serverTimestamp() });
      return patch;
    }));
  }

  /**
   * Optimistic update helper: applies `optimisticPatch` to the caller's local
   * UI state immediately (via `applyLocally`), fires the real Firestore
   * update in the background, and calls `rollback` with the pre-update state
   * if the write fails — so the UI can snap back rather than silently
   * drifting out of sync with the server.
   * @param {string} id
   * @param {Partial<T>} patch
   * @param {{ applyLocally: (patch: Partial<T>) => (T & {id:string}) , rollback: (previous: (T & {id:string})) => void }} handlers
   */
  async optimisticUpdate(id, patch, { applyLocally, rollback }) {
    const previous = applyLocally(patch);
    const result = await this.update(id, patch);
    if (!result.ok) rollback(previous);
    return result;
  }
}
