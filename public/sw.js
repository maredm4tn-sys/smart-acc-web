const CACHE_NAME = 'smart-acc-v7';
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
            console.log('Pre-caching assets V7');
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

    // INTERCEPT NEXT.JS DATA REQUESTS
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
                    // CRITICAL FIX: Instead of failing JSON, return the HTML Shell
                    // This prevents Next.js from crashing and forces a hard navigation to the cached page
                    const cache = await caches.open(CACHE_NAME);
                    return (await cache.match('/dashboard')) || (await cache.match('/'));
                })
        );
        return;
    }

    // DEFAULT STRATEGY: Stale-While-Revalidate
    event.respondWith(
        caches.open(CACHE_NAME).then((cache) => {
            // Use ignoreSearch to handle Next.js query params during offline
            return cache.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
                const fetchPromise = fetch(event.request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch((error) => {
                    // Navigation fallback
                    if (event.request.mode === 'navigate') {
                        // Return the cached version of the requested page, or fallback to dashboard
                        return cache.match(event.request, { ignoreSearch: true }) ||
                            cache.match('/dashboard') ||
                            cache.match('/');
                    }

                    if (cachedResponse) return cachedResponse;
                    throw error;
                });

                return cachedResponse || fetchPromise;
            });
        })
    );
});
