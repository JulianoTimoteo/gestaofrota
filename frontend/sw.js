const CACHE_NAME = 'fleet-cache-v4';
const OFFLINE_URL = './index.html';
const ASSETS_TO_CACHE = [
    './index.html',
    './manifest.json',
    './android-chrome-192x192.png',
    './android-chrome-512x512.png',
    './favicon.ico'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        (async () => {
            const cache = await caches.open(CACHE_NAME);
            for (const asset of ASSETS_TO_CACHE) {
                try {
                    await cache.add(asset);
                } catch (e) {
                    // Skip non-critical assets
                }
            }
        })()
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames.map((name) => {
                    if (name !== CACHE_NAME) {
                        return caches.delete(name);
                    }
                })
            );
            await clients.claim();
        })()
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Nao interceptar a raiz /, /monitor ou chamadas de API (permite abrir o DataServer monitor.html em http://${window.location.hostname}:8000/)
    if (url.pathname === '/' || url.pathname === '/monitor' || url.pathname === '/dataserver' || url.pathname.startsWith('/api')) {
        return;
    }

    if (event.request.method === 'GET') {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(event.request).catch(() => {
                    if (event.request.mode === 'navigate') {
                        return caches.match(OFFLINE_URL);
                    }
                });
            })
        );
    }
});
