// ============================================
// SERVICE WORKER - ChefManager PWA
// ============================================

const CACHE_NAME = 'chefmanager-v2.0';
const urlsToCache = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/js/config.js',
    '/js/supabase-client.js',
    '/js/auth.js',
    '/js/state.js',
    '/js/ui.js',
    '/js/pedidos.js',
    '/js/recepcion.js',
    '/js/inventario.js',
    '/js/consumo.js',
    '/js/admin.js',
    '/js/app.js',
    '/manifest.json'
];

// Instalar Service Worker
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Cache abierto');
                return cache.addAll(urlsToCache);
            })
            .then(() => self.skipWaiting())
    );
});

// Activar Service Worker
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Eliminando cache antiguo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Interceptar requests
self.addEventListener('fetch', (event) => {
    // No cachear requests a Supabase
    if (event.request.url.includes('supabase.co')) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Devolver desde cache si existe
                if (response) {
                    return response;
                }
                
                // Sino, hacer fetch y cachear
                return fetch(event.request).then((response) => {
                    // No cachear si no es válido
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                    
                    return response;
                });
            })
            .catch(() => {
                // Offline fallback
                if (event.request.mode === 'navigate') {
                    return caches.match('/index.html');
                }
            })
    );
});

// Manejar notificaciones push (para futuras notificaciones)
self.addEventListener('push', (event) => {
    const options = {
        body: event.data?.text() || 'Nueva notificación',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-72.png',
        vibrate: [100, 50, 100]
    };
    
    event.waitUntil(
        self.registration.showNotification('ChefManager', options)
    );
});
