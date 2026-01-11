const CACHE_NAME = 'smart-acc-v3';
const ASSETS_TO_CACHE = [
    '/',
    '/dashboard',
    '/dashboard/pos',
    '/dashboard/inventory',
    '/dashboard/customers',
    '/dashboard/suppliers',
    '/manifest.json',
    '/logo.png',
    '/globals.css',
];

// Install Event
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Pre-caching offline shell');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Fetch Event
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);

    // Skip chrome extensions and analytics
    if (url.protocol === 'chrome-extension:' || url.hostname.includes('google-analytics')) return;

    // For navigation requests (opening pages)
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    // Update cache with the latest version of the page
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
                    return response;
                })
                .catch(() => {
                    // If network fails, try to find a match in cache or return the default dashboard
                    return caches.match(event.request).then((cached) => {
                        return cached || caches.match('/dashboard') || caches.match('/');
                    });
                })
        );
        return;
    }

    // For other assets (JS, CSS, Images, API results)
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;

            return fetch(event.request).then((networkResponse) => {
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }

                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });

                return networkResponse;
            }).catch(() => null);
        })
    );
});
