/**
 * core/UndoManager.js
 * ---------------------------------------------------------------------------
 * Generic, timed "undo buffer" shared by every module. Rather than every
 * module inventing its own undo/soft-delete scheme (and getting the timing
 * or the rollback slightly different each time), a page calls:
 *
 *   const token = undoManager.register(async () => {
 *     await todoRepo.create(deletedTask, deletedTask.id); // the undo action
 *   });
 *   showToast('Task deleted', 'default', 6000, { undoToken: token });
 *
 * and shows an "Undo" affordance that calls `undoManager.undo(token)` if the
 * user clicks it before the window expires. If they don't, `dispose()` is
 * called automatically and the buffered action is forgotten.
 *
 * DESIGN NOTE: this deliberately restores a deleted document by re-creating
 * it (same id, same data) rather than a permanent server-side "trash"
 * collection. That is a simpler, honest trade-off for a client-side app: if
 * the user closes the tab before the undo window elapses, the undo option is
 * lost — acceptable for "support undo whenever possible," not a guarantee of
 * permanent recoverability.
 */

const DEFAULT_WINDOW_MS = 8000;

class UndoManagerImpl {
  constructor() {
    /** @type {Map<string, { action: () => Promise<void>|void, timer: ReturnType<typeof setTimeout> }>} */
    this._pending = new Map();
  }

  /**
   * Buffers an undo action for `windowMs` (default 8s). Returns a token to
   * pass to `undo()`.
   * @param {() => Promise<void>|void} action
   * @param {number} [windowMs]
   * @returns {string} token
   */
  register(action, windowMs = DEFAULT_WINDOW_MS) {
    const token = crypto.randomUUID();
    const timer = setTimeout(() => this._pending.delete(token), windowMs);
    this._pending.set(token, { action, timer });
    return token;
  }

  /**
   * Executes the buffered action for `token`, if it hasn't expired yet.
   * @param {string} token
   * @returns {Promise<boolean>} true if an action was found and run
   */
  async undo(token) {
    const entry = this._pending.get(token);
    if (!entry) return false;
    clearTimeout(entry.timer);
    this._pending.delete(token);
    await entry.action();
    return true;
  }

  /** Cancels a pending undo without running it (e.g. the user navigated away and confirmed the action). */
  dispose(token) {
    const entry = this._pending.get(token);
    if (entry) { clearTimeout(entry.timer); this._pending.delete(token); }
  }
}

/** Singleton — import this, don't construct your own. */
export const undoManager = new UndoManagerImpl();
