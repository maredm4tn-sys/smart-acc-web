const CACHE_NAME = 'smart-acc-v4'; // New version
const ASSETS_TO_CACHE = [
    '/',
    '/dashboard',
    '/manifest.json',
    '/logo.png',
    '/globals.css',
];

// Install Event
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
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

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // 1. If in cache, return it (Fastest experience)
            if (cachedResponse) return cachedResponse;

            // 2. Otherwise fetch from network
            return fetch(event.request).then((networkResponse) => {
                // If it's a valid response, cache a copy
                if (networkResponse && networkResponse.status === 200) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // 3. OFFLINE FALLBACK
                // For navigation (opening pages)
                if (event.request.mode === 'navigate') {
                    return caches.match('/dashboard') || caches.match('/');
                }

                // For Next.js data requests (_next/data)
                if (url.pathname.includes('_next/data')) {
                    // Try to find any cached version of this data or similar
                    return new Response(JSON.stringify({ offline: true }), {
                        headers: { 'Content-Type': 'application/json' }
                    });
                }

                return null;
            });
        })
    );
});
