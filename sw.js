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

const CACHE_VERSION = 'mylife-v3';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const OFFLINE_URL = './offline.html';
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
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(
      names
        .filter((name) => name.startsWith('mylife-') && name !== STATIC_CACHE)
        .map((name) => caches.delete(name))
    )).then(() => self.clients.claim())
  );
});

function isSameOrigin(url) {
  try { return new URL(url, self.location.origin).origin === self.location.origin; }
  catch { return false; }
}

function isAssetRequest(request) {
  const url = new URL(request.url);
  return request.method === 'GET' && request.mode !== 'navigate' && isSameOrigin(url.href) && /\.(?:js|css|png|jpe?g|gif|webp|svg|ico|woff2?|ttf|mp4|webm|json)(?:\?|$)/i.test(url.pathname);
}

function isFingerprintedAsset(request) {
  const { pathname } = new URL(request.url);
  return /^\/assets\/.+-[A-Za-z0-9_-]{8}\.(?:js|css|png|jpe?g|gif|webp|svg|woff2?)$/i.test(pathname);
}

function cacheResponse(request, response) {
  if (!response.ok || response.type !== 'basic') return response;
  const copy = response.clone();
  caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
  return response;
}

function networkFirst(request) {
  return fetch(request)
    .then((response) => cacheResponse(request, response))
    .catch(() => caches.match(request).then((cached) => cached || Response.error()));
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (!isSameOrigin(request.url)) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          if (response.ok && request.url.startsWith(self.location.origin)) {
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => (await caches.match(request)) || (await caches.match(OFFLINE_URL)))
    );
    return;
  }

  if (isAssetRequest(request) && isFingerprintedAsset(request)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchFromNetwork = fetch(request).then((response) => {
          return cacheResponse(request, response);
        }).catch(() => cached || Response.error());

        return cached || fetchFromNetwork;
      })
    );
    return;
  }

  if (isAssetRequest(request)) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(fetch(request).catch(() => caches.match(request).then((cached) => cached || caches.match(OFFLINE_URL))));
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
