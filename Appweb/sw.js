const CACHE_NAME = 'fleet-cache-v28';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    return caches.delete(key);
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // NUNCA interceptar ou cachear chamadas de API ou dados.json
    if (url.pathname.startsWith('/api') || url.pathname.includes('/api/') || url.pathname.endsWith('dados.json') || url.search.includes('_t=')) {
        return;
    }

    if (event.request.method === 'GET') {
        event.respondWith(
            fetch(event.request).then((networkResponse) => {
                return networkResponse;
            }).catch(() => {
                return caches.match(event.request);
            })
        );
    }
});
