const CACHE_NAME = 'sanstech-pwa-v1';
const urlsToCache = [
    './',
    './index.html',
    './manifest.json'
];

// Instalasi Service Worker & Menyimpan Cache dasar
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// Bypass fetch agar iFrame Google Script tidak terganggu caching
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Kembalikan dari cache lokal (untuk HTML & Manifest)
                if (response) {
                    return response;
                }
                // Izinkan koneksi langsung ke server Google untuk sisanya
                return fetch(event.request);
            })
    );
});

// Update Service worker jika ada versi baru
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
