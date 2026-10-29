/* MangAfrik service worker: installable app shell + chapters downloaded for offline reading.
 *
 * - Pages of the site (navigations): network first, cached copy when offline.
 * - Built assets (/assets/*, icons): cache first (their names change on every build).
 * - API catalog reads (/api/v1/manga/...): network first, then the copy saved by "Télécharger".
 * - Page images (/api/v1/storage/...): the downloaded copy first, otherwise the network.
 * Downloads are written by src/services/offline.js into OFFLINE_CACHE; this file only reads them.
 */
const SHELL_CACHE = 'mangafric-shell-v1';
const OFFLINE_CACHE = 'mangafric-offline-v1';
const SHELL_URLS = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/magafrik-logo.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL_URLS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((k) => k.startsWith('mangafric-shell-') && k !== SHELL_CACHE)
        .map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request, cacheName, fallbackKey) {
  try {
    const response = await fetch(request);
    if (cacheName && response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(fallbackKey || request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(fallbackKey || request, { ignoreVary: true });
    if (cached) return cached;
    throw err;
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) (await caches.open(cacheName)).put(request, response.clone());
  return response;
}

async function downloadedFirst(request) {
  const cache = await caches.open(OFFLINE_CACHE);
  // ignoreSearch: a page downloaded in data-saver mode (?lite=1) also serves the full-size URL.
  const cached = await cache.match(request.url, { ignoreVary: true })
    || await cache.match(request.url, { ignoreVary: true, ignoreSearch: true });
  return cached || fetch(request);
}

async function catalogRead(request) {
  try {
    return await fetch(request);
  } catch (err) {
    const cache = await caches.open(OFFLINE_CACHE);
    const cached = await cache.match(request.url, { ignoreVary: true });
    if (cached) return cached;
    throw err;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (request.mode === 'navigate' && url.origin === self.location.origin) {
    event.respondWith(networkFirst(request, SHELL_CACHE, '/'));
    return;
  }
  if (url.origin === self.location.origin && (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/'))) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }
  if (url.pathname.includes('/api/v1/storage/')) {
    event.respondWith(downloadedFirst(request));
    return;
  }
  if (url.pathname.includes('/api/v1/manga/')) {
    event.respondWith(catalogRead(request));
  }
});
