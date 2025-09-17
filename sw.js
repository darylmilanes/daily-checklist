// Simple cache-first service worker for offline use
const CACHE = 'daily-checklist-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  // Only handle GET
  if (request.method !== 'GET') return;
  e.respondWith(
    caches.match(request).then(res => {
      if (res) return res;
      return fetch(request)
        .then(netRes => {
          const copy = netRes.clone();
          caches.open(CACHE).then(c => c.put(request, copy));
          return netRes;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
