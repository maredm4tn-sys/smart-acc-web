const CACHE_NAME = 'smart-acc-v2'; // Version bump
const ASSETS_TO_CACHE = [
    '/',
    '/manifest.json',
    '/logo.png',
    '/globals.css',
];

// Install Event - Cache essential shell
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// Activate Event - Clean old caches
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

// Fetch Event - Dynamic Caching Strategy
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    // Ignore internal chrome/browser extensions
    if (event.request.url.startsWith('chrome-extension') || event.request.url.includes('google-analytics')) return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // Return from cache if found
            if (cachedResponse) return cachedResponse;

            // Otherwise fetch from network and cache for next time
            return fetch(event.request).then((networkResponse) => {
                // Check if we received a valid response
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }

                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });

                return networkResponse;
            }).catch(() => {
                // If network fails (Offline)
                // If it's a page navigation, return the root page
                if (event.request.mode === 'navigate') {
                    return caches.match('/');
                }
                return null;
            });
        })
    );
});
