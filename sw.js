// MyLife service worker.
//
// Phase 4 production-hardening: this previously only handled Web Push
// notifications (install/activate/push/notificationclick) and had NO
// `fetch` handler at all — meaning zero offline capability despite being a
// registered, active worker (flagged as TECH-001 in the earlier technical
// audit). This version adds a real, deliberately conservative caching
// strategy on top of the existing push logic, which is UNCHANGED below.
//
// STRATEGY, AND WHY:
//   - Navigations (loading an actual page): network-first, falling back to
//     a cached copy of that exact page, and finally to offline.html. Pages
//     are TEXT you want fresh whenever possible — cache is the fallback,
//     not the default.
//   - Same-origin static assets (css/js/images/fonts): cache-first, then
//     network (and cache the network response for next time). These don't
//     change on every deploy in a way that matters moment-to-moment, so
//     serving instantly from cache is the right trade-off; CACHE_VERSION
//     below is bumped on deploys that DO change them, which busts this.
//   - Firebase/Firestore requests, the Open-Meteo weather API, and any
//     other cross-origin request are NEVER intercepted — passed straight to
//     the network untouched. This is deliberate and important: Firestore's
//     own offline persistence (configured in firebase/firebase.js) already
//     handles that layer, and a service worker intercepting Firestore's
//     realtime streaming/long-polling connections is a well-known way to
//     break realtime sync in subtle, hard-to-debug ways. Don't do it.

// Bump this after changing cache behavior so clients discard previously
// cached responses. In development Vite may return a CSS module as JavaScript
// to a generic fetch (such as cache.addAll), which must never be served to a
// stylesheet link on a later request.
const CACHE_VERSION = 'mylife-v2';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const OFFLINE_URL = './offline.html';
const IS_DEVELOPMENT_HOST = ['localhost', '127.0.0.1', '::1'].includes(self.location.hostname);

// Deliberately small and conservative: the true app shell plus the offline
// fallback itself. Page-specific JS/CSS/images are cached opportunistically
// at runtime instead (see the fetch handler) rather than risking a large
// atomic `addAll` that fails entirely if any single URL 404s.
const PRECACHE_URLS = [
  './',
  './index.html',
  './offline.html',
  './manifest.json',
  './css/variables.css',
  './css/shared.css',
  './css/momentum.css',
  './css/responsive.css',
  './js/shared.js',
  './js/i18n.js',
  './assist/icons/icon-192.png',
  './assist/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  // Do not cache Vite's development responses. Vite conditionally transforms
  // CSS requests into JavaScript modules for generic fetches, so a cache-first
  // worker can otherwise return JavaScript with HTTP 200 for <link rel=stylesheet>.
  if (IS_DEVELOPMENT_HOST) {
    event.waitUntil(self.skipWaiting());
    return;
  }
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch((err) => {
        // A single missing precache URL shouldn't brick installation of the
        // whole worker — log and continue; the runtime cache-as-you-go path
        // still fills in whatever didn't get precached.
        console.warn('[sw] precache partially failed:', err);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names
          .filter((name) => name.startsWith('mylife-') && name !== STATIC_CACHE)
          .map((name) => caches.delete(name)) // clear outdated cache versions automatically
      ))
      .then(() => self.clients.claim())
  );
});

function isSameOrigin(url) {
  return new URL(url, self.location.origin).origin === self.location.origin;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (IS_DEVELOPMENT_HOST) return; // let Vite serve the correct asset type directly
  if (request.method !== 'GET') return; // never cache non-GET; let it pass through untouched
  if (!isSameOrigin(request.url)) return; // Firebase/Firestore/Open-Meteo/fonts — never intercepted, see header note

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Refresh the cached copy of this page in the background so the
          // next offline visit has something reasonably current.
          const copy = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => (await caches.match(request)) || (await caches.match(OFFLINE_URL)))
    );
    return;
  }

  // Same-origin static asset: cache-first, then network (and backfill the cache).
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      }).catch(() => cached); // offline and not cached: let the request fail naturally
    })
  );
});

// ─── Web Push (unchanged from the pre-Phase-4 version) ─────────────────────
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) { data = { body: event.data?.text() || '' }; }
  const title = data.title || 'Momentum';
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || 'You have a new reminder.', icon: 'assist/Momentum_Logo-removebg-preview.png',
    tag: data.tag || 'momentum-reminder', data: { url: data.url || './pages/dashboard.html' },
  }));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || './pages/dashboard.html'));
});
