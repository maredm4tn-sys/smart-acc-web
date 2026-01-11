const CACHE_NAME = 'smart-acc-v6';
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
            console.log('Pre-caching assets V6');
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

    // Skip non-app origins (chrome extensions, analytics, etc)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

    // Strategy for Next.js Data Requests: NetworkFirst, fallback to App Shell
    if (url.pathname.includes('/_next/data/')) {
        event.respondWith(
            fetch(event.request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                        return networkResponse;
                    }
                    return networkResponse;
                })
                .catch(async () => {
                    // CRITICAL FIX: Return HTML Shell instead of failing JSON request
                    // This forces Next.js to perform a hard reload and use cached HTML
                    const cache = await caches.open(CACHE_NAME);
                    return (await cache.match('/dashboard')) || (await cache.match('/'));
                })
        );
        return;
    }

    // Default strategy: Stale-While-Revalidate for other assets
    event.respondWith(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.match(event.request).then((cachedResponse) => {
                const fetchPromise = fetch(event.request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch((error) => {
                    // Offline navigation fallback
                    if (event.request.mode === 'navigate') {
                        return cache.match(event.request) || cache.match('/dashboard') || cache.match('/');
                    }

                    if (cachedResponse) return cachedResponse;
                    throw error;
                });

                return cachedResponse || fetchPromise;
            });
        })
    );
});
