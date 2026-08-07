// MyLife — Goals realtime sync (Firestore migration).
//
// The Goals page still renders through shared.js's generic renderGoals()/
// initPage('goals') machinery (currentData.goals), but that array is now
// populated from goals/{uid}/items/* via GoalRepository instead of the
// legacy appData blob, and writes (see addEntry/toggleComplete/deleteEntry
// in shared.js) go straight to Firestore. window.__goalsRepo is how those
// classic-script functions reach this module's repository instance.

import { GoalRepository } from '../repositories/GoalRepository.js';
import { AuthService } from '../services/AuthService.js';

let goalsUnsubscribe = null;

async function startGoalsSync() {
  const user = await AuthService.waitUntilReady();
  if (!user) return; // bootShell() already redirects unauthenticated visitors
  const repo = new GoalRepository(user.uid);
  window.__goalsRepo = repo;
  if (goalsUnsubscribe) goalsUnsubscribe();
  goalsUnsubscribe = repo.subscribe(
    (items) => {
      window.currentData.goals = items;
      if (window.__pageLoading) window.__pageLoading['goals'] = false;
      if (typeof window.__pageContentReinit === 'function') window.__pageContentReinit();
    },
    (error) => { console.error('[goals] realtime sync failed', error); }
  );
}

function disposeGoalsSync() {
  if (goalsUnsubscribe) { goalsUnsubscribe(); goalsUnsubscribe = null; }
  window.__goalsRepo = null;
}

export { startGoalsSync, disposeGoalsSync };
