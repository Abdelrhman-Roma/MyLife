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
   * @param {string} category - e.g. 'Todo', 'Habit', 'Prayer', 'Weather'
   * @param {string} dedupKey - e.g. a task id + due date, or a date string for a daily reminder
   * @param {{ message: string, read?: boolean, browser?: boolean }} data
   */
  async notifyOnce(category, dedupKey, data) {
    const id = `${category}-${dedupKey}`.replace(/[^a-zA-Z0-9-_]/g, '_');
    return tryFirebase(() => setDoc(this.itemDoc(id), {
      category, dedupKey, message: data.message, read: false,
      ownerId: this.uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    }, { merge: false }));
  }

  /** Fetches only unread notifications, newest first — what the notification bell badge needs. */
  getUnread() {
    return this.getAll({ where: [['read', '==', false]], orderBy: ['createdAt', 'desc'] });
  }

  /** Marks every currently-unread notification as read in one batch write. */
  async markAllRead() {
    const result = await this.getUnread();
    if (!result.ok) return result;
    return this.batchUpdate(result.data.map((n) => ({ type: 'update', id: n.id, data: { read: true } })));
  }
}
