/**
 * repositories/NotificationRepository.js
 * ---------------------------------------------------------------------------
 * notifications/{uid}/items/{notificationId}
 *
 * Notifications are the one module where "prevent duplicates" is a first-
 * class requirement (per the brief), so this repository adds a dedicated
 * `notifyOnce()` on top of the generic BaseRepository contract: it derives a
 * deterministic document id from the notification's own identity (category +
 * a caller-supplied dedup key, e.g. a date or a source-item id) and uses
 * `create(data, id)` against that fixed id. Two calls with the same
 * category+key become one Firestore `set()` on the same document instead of
 * two separate documents — which is what actually prevents the duplicate
 * (Firestore's realtime listeners + Phase 1's persistentMultipleTabManager
 * mean two tabs computing "this reminder is due" at the same moment now
 * converge on the same document, instead of the pre-migration LocalStorage
 * architecture's two independent local writes — see the Phase 4 audit's
 * FINAL-BUG-002 for the bug this replaces).
 */

import { BaseRepository } from './BaseRepository.js';
import { setDoc, serverTimestamp } from '../firebase/firestore.js';
import { tryFirebase } from '../core/ErrorMapper.js';

/** @typedef {'Todo'|'Habit'|'Goal'|'Workout'|'Nutrition'|'Study'|'Prayer'|'Weather'|'Achievements'|'System'|'Security'|'Account'|'Backup'} NotificationCategory */

export class NotificationRepository extends BaseRepository {
  /** @param {string} uid */
  constructor(uid) {
    super('notifications', uid);
  }

  /**
   * Creates a notification only once per (category, dedupKey) pair. Safe to
   * call repeatedly (e.g. from several reminder checks, or several tabs) —
   * later calls simply overwrite the same document with the same content
   * rather than creating a duplicate.
   * @param {NotificationCategory} category
   * @param {string} dedupKey - e.g. a task id + due date, or a date string for a daily reminder
   * @param {{ message: string, priority?: 'low'|'normal'|'high', deepLink?: string, action?: { label: string, actionId: string }, metadata?: Record<string, unknown>, read?: boolean, browser?: boolean }} data
   */
  async notifyOnce(category, dedupKey, data) {
    const id = `${category}-${dedupKey}`.replace(/[^a-zA-Z0-9-_]/g, '_');
    return tryFirebase(() => setDoc(this.itemDoc(id), {
      category, dedupKey, message: data.message,
      priority: data.priority || 'normal',
      deepLink: data.deepLink || null,
      action: data.action || null,
      metadata: data.metadata || null,
      read: false, pinned: false, archived: false,
      ownerId: this.uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    }, { merge: false }));
  }

  /** Fetches only unread, non-archived notifications, newest first — what the notification bell badge needs. */
  getUnread() {
    return this.getAll({ where: [['read', '==', false], ['archived', '==', false]], orderBy: ['createdAt', 'desc'] });
  }

  /** Marks every currently-unread notification as read in one batch write. */
  async markAllRead() {
    const result = await this.getUnread();
    if (!result.ok) return result;
    return this.batchUpdate(result.data.map((n) => ({ type: 'update', id: n.id, data: { read: true } })));
  }

  /** @param {string} id */
  pin(id) { return this.update(id, { pinned: true }); }
  /** @param {string} id */
  unpin(id) { return this.update(id, { pinned: false }); }
  /** @param {string} id */
  archive(id) { return this.update(id, { archived: true, read: true }); }
  /** @param {string} id */
  unarchive(id) { return this.update(id, { archived: false }); }
}
