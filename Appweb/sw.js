const CACHE_NAME = 'fleet-cache-v33';

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

// Listener de Notificações Web Push (Ativa o celular mesmo com o App Fechado)
self.addEventListener('push', (event) => {
    let data = {};
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data = { title: '🚨 Alerta de Frota', body: event.data.text() };
        }
    }
    const title = data.title || '🚨 ALERTA CRÍTICO DE FROTA';
    const options = {
        body: data.body || 'Uma equipe atingiu o limite de disponibilidade configurado.',
        icon: 'img/logo_pitangueiras.png',
        badge: 'img/logo_pitangueiras.png',
        vibrate: [500, 250, 500, 250, 1000],
        tag: 'alarme-frota-critico',
        renotify: true,
        requireInteraction: true,
        data: { url: './#tab-alarmes' }
    };
    event.waitUntil(self.registration.showNotification(title, options));
});

// Clique na notificação abre o app diretamente na aba Alarmes
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (let client of clientList) {
                if (client.url && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow('./#tab-alarmes');
            }
        })
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
