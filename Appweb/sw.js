const CACHE_NAME = 'fleet-cache-v22';

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

    // NUNCA interceptar ou cachear chamadas de API
    if (url.pathname.startsWith('/api') || url.pathname.includes('/api/')) {
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
