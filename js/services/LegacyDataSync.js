/** Real-time Firestore persistence for legacy pages' shared `currentData`. */
import { AuthService } from '../../services/AuthService.js';
import { docRef, onSnapshot, runTransaction, serverTimestamp, setDoc } from '../../firebase/firestore.js';

const DATA_FIELD = 'appData';
let uid = null;
let unsubscribe = null;
let pending = null;
let writeTimer = null;

function cloneForFirestore(data) {
  // Firestore rejects undefined/functions; clone also detaches mutable UI state.
  return JSON.parse(JSON.stringify(data));
}
function ref() {
  if (!uid) throw new Error('Cannot sync data before Firebase authentication is ready.');
  return docRef('users', uid);
}
async function flush() {
  writeTimer = null;
  if (!pending || !uid) return;
  const data = pending;
  pending = null;
  try {
    await setDoc(ref(), { [DATA_FIELD]: data, appDataUpdatedAt: serverTimestamp() }, { merge: true });
    window.dispatchEvent(new CustomEvent('mylife:sync-status', { detail: { state: 'saved' } }));
  } catch (error) {
    pending = data;
    console.error('[data-sync] Firestore write failed', error);
    window.dispatchEvent(new CustomEvent('mylife:sync-status', { detail: { state: 'error', error } }));
  }
}
function save(data) {
  pending = cloneForFirestore(data);
  if (!uid) return;
  clearTimeout(writeTimer);
  writeTimer = window.setTimeout(flush, 80);
}
window.MomentumDataSync = { save, flush };

async function start() {
  const user = await AuthService.waitUntilReady();
  if (!user) return;
  uid = user.uid;
  const initial = window.MomentumLegacyData?.getInitialData?.();
  const stateRef = ref();
  // A pre-migration local payload can seed an empty Firestore profile once;
  // it can never overwrite data already stored for the same authenticated UID.
  await runTransaction(stateRef.firestore, async (transaction) => {
    const snap = await transaction.get(stateRef);
    if (!snap.exists() || !Object.prototype.hasOwnProperty.call(snap.data(), DATA_FIELD)) {
      transaction.set(stateRef, { [DATA_FIELD]: cloneForFirestore(initial || {}), appDataUpdatedAt: serverTimestamp() }, { merge: true });
    }
  });
  unsubscribe?.();
  unsubscribe = onSnapshot(stateRef, (snap) => {
    const remote = snap.data()?.[DATA_FIELD];
    if (remote && typeof remote === 'object') {
      window.MomentumLegacyData?.applyRemote?.(remote);
      window.dispatchEvent(new CustomEvent('mylife:sync-status', { detail: { state: 'synced' } }));
    }
  }, (error) => {
    console.error('[data-sync] Firestore listener failed', error);
    window.dispatchEvent(new CustomEvent('mylife:sync-status', { detail: { state: 'error', error } }));
  });
  if (pending) flush();
}
start().catch((error) => {
  console.error('[data-sync] Firestore initialization failed', error);
  window.dispatchEvent(new CustomEvent('mylife:sync-status', { detail: { state: 'error', error } }));
});
window.addEventListener('beforeunload', () => unsubscribe?.(), { once: true });
