import { startRepoAggregatorSync } from '../../services/RepoAggregatorSync.js';
import { DashboardLayoutService, DEFAULT_LAYOUT } from '../../services/DashboardLayoutService.js';
import { AuthService } from '../../services/AuthService.js';

let disposeAggregatorSync = () => {};
let layoutUnsubscribe = () => {};

const WIDGET_TO_REPO_MAP = {
  todo: ['tasks'],
  habits: ['habits'],
  goals: ['goals'],
  calendar: ['events'],
  workout: ['workouts'],
  prayer: ['prayers'],
  nutrition: ['meals'],
  study: ['study'],
  water: ['water'],
  sleep: ['sleep'],
  statistics: ['tasks', 'habits', 'goals', 'workouts', 'prayers', 'meals', 'water', 'sleep', 'study'],
  achievements: ['profile'],
  'quick-notes': ['profile'],
};

/**
 * Maps the currently visible widgets on the dashboard to the minimal set
 * of repository keys required to sync from Cloud Firestore.
 */
function getKeysToSync(layout) {
  const keys = new Set();
  const widgets = layout?.widgets || DEFAULT_LAYOUT.widgets;

  for (const w of widgets) {
    if (!w.hidden && WIDGET_TO_REPO_MAP[w.widgetId]) {
      WIDGET_TO_REPO_MAP[w.widgetId].forEach(k => keys.add(keyMappingAlias(k)));
    }
  }
  return [...keys];
}

function keyMappingAlias(key) {
  // Map meals to meals, profile to profile, etc.
  return key;
}

document.addEventListener('DOMContentLoaded', async () => {
  initPage('dashboard');
  initDashboardWeather();

  await AuthService.waitUntilReady();
  const user = AuthService.getCurrentUser();
  if (!user) return; // bootShell() already handles redirect if unauthenticated

  // Retrieve current custom layout to determine initial sync keys
  let initialKeys = getKeysToSync(DEFAULT_LAYOUT);
  try {
    const layoutRes = await DashboardLayoutService.getLayout(user.uid);
    if (layoutRes.ok) {
      initialKeys = getKeysToSync(layoutRes.data);
    }
  } catch (err) {
    console.warn('[dashboard] Failed to load layout, using default keys', err);
  }

  // Initialize lazy-load repo aggregator sync with computed initial keys
  startRepoAggregatorSync(() => {
    if (typeof window.__pageContentReinit === 'function') window.__pageContentReinit();
  }, initialKeys).then((dispose) => {
    disposeAggregatorSync = dispose;

    // Realtime subscription to layout adjustments (cross-device or personalization)
    layoutUnsubscribe = DashboardLayoutService.subscribeLayout(user.uid, (remoteLayout) => {
      const activeKeys = getKeysToSync(remoteLayout);
      if (typeof disposeAggregatorSync.syncKeys === 'function') {
        disposeAggregatorSync.syncKeys(activeKeys);
      }
    });
  });
});

window.addEventListener('beforeunload', () => {
  layoutUnsubscribe();
  disposeAggregatorSync();
});
