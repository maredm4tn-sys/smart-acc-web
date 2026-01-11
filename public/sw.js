const CACHE_NAME = 'smart-acc-v5';
const PRE_CACHE_ASSETS = [
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
            console.log('Pre-caching assets');
            return cache.addAll(PRE_CACHE_ASSETS);
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

    // Skip non-app origins
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

    event.respondWith(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.match(event.request).then((cachedResponse) => {
                const fetchPromise = fetch(event.request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch((error) => {
                    // Offline handling
                    if (event.request.mode === 'navigate') {
                        // Return cached version of the route or fallback to dashboard
                        return cache.match(event.request) || cache.match('/dashboard') || cache.match('/');
                    }

                    if (cachedResponse) return cachedResponse;

                    if (url.pathname.includes('_next/data')) {
                        return new Response(JSON.stringify({ offline: true }), {
                            headers: { 'Content-Type': 'application/json' }
                        });
                    }

                    throw error;
                });

                // Return cache if available, otherwise fetch from network
                return cachedResponse || fetchPromise;
            });
        })
    );
});
