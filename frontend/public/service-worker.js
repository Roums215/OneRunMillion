// OneRun Premium PWA - Service Worker
const CACHE_NAME = 'onerun-premium-v1';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/static/js/main.chunk.js',
  '/static/js/0.chunk.js',
  '/static/js/bundle.js',
  '/manifest.json',
  '/apple-touch-icon.png',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png',
  '/splash.png',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Montserrat:wght@300;400;500;600;700&display=swap'
];

// Installation et mise en cache des ressources essentielles
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache ouvert');
        return cache.addAll(URLS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activation et nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Stratégie de mise en cache : Network First avec fallback sur le cache
self.addEventListener('fetch', (event) => {
  // Exclure les requêtes API - toujours les récupérer depuis le réseau
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .catch((error) => {
          return caches.match('/offline.html');
        })
    );
    return;
  }

  // Pour les autres requêtes: d'abord réseau, puis cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone la réponse pour la mettre en cache
        const responseToCache = response.clone();
        
        // Mettre à jour le cache uniquement pour les requêtes réussies
        if (response.status === 200) {
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
        }
        
        return response;
      })
      .catch((error) => {
        // Si le réseau échoue, utiliser le cache
        return caches.match(event.request)
          .then((response) => {
            if (response) {
              return response;
            }
            
            // Si la ressource n'est pas en cache, retourner la page hors ligne
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('/offline.html');
            }
            
            // Pour les images non en cache, retourner une image par défaut
            if (event.request.url.match(/\.(jpg|jpeg|png|gif|svg)$/)) {
              return caches.match('/offline-image.png');
            }
            
            return new Response('Ressource non disponible hors ligne', {
              status: 503,
              statusText: 'Service indisponible',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});
