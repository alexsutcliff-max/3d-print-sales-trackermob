self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open('print-tracker-v1');
    await cache.addAll(['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png']);
  })());
});
self.addEventListener('activate', (e) => { self.clients.claim(); });
self.addEventListener('fetch', (e) => {
  e.respondWith((async () => {
    const r = await caches.match(e.request);
    if (r) return r;
    const resp = await fetch(e.request);
    const cache = await caches.open('print-tracker-v1');
    cache.put(e.request, resp.clone());
    return resp;
  })());
});