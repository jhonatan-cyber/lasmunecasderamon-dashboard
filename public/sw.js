// Service Worker para cacheo offline
// Versión: 1.0.0

const CACHE_NAME = 'admin-dashboard-v1';
const RUNTIME_CACHE = 'runtime-cache-v1';

// Recursos críticos para cachear en la instalación
const PRECACHE_URLS = [
  '/',
  '/dashboard',
  '/offline',
  '/img/system/logo1.png',
];

// Instalar el service worker y cachear recursos críticos
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Precaching critical resources');
      return cache.addAll(PRECACHE_URLS);
    })
  );
  // Activar inmediatamente
  self.skipWaiting();
});

// Activar el service worker y limpiar cachés antiguos
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Tomar control inmediatamente
  return self.clients.claim();
});

// Estrategia de cacheo: Network First con fallback a Cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Solo cachear requests GET del mismo origen
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // No cachear APIs (siempre ir a la red)
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Estrategia: Network First, fallback a Cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Si la respuesta es válida, cachearla
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Si falla la red, intentar desde el cache
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Si no hay cache, mostrar página offline
          if (request.mode === 'navigate') {
            return caches.match('/offline');
          }
        });
      })
  );
});

// Limpiar cache antiguo periódicamente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            return caches.delete(cacheName);
          })
        );
      })
    );
  }
});
