const CACHE_NAME = 'tama-pwa-v9';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/config/petConfig.js',
  '/engine/timeEngine.js',
  '/engine/evolutionResolver.js',
  '/ui/LcdMatrix.js',
  '/ui/sprites.js',
  '/ui/StatusRenderer.js',
  '/ui/GameRenderer.js',
  '/audio/TamagotchiAudio.js',
  '/constants/menu.js',
  '/constants/i18n.js',
  '/controllers/MenuController.js',
  '/controllers/MiniGameController.js',
  '/storage/SaveManager.js',
  '/app.js',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      // Pre-cache root HTML directly and seed both '/' and '/index.html'
      try {
        const rootResponse = await fetch('/', { cache: 'no-cache' });
        if (rootResponse && rootResponse.ok) {
          const bodyBlob = await rootResponse.blob();
          const cloneResponse = () => new Response(bodyBlob, {
            status: 200,
            statusText: 'OK',
            headers: rootResponse.headers
          });
          await Promise.all([
            cache.put('/', cloneResponse()),
            cache.put('./', cloneResponse()),
            cache.put('/index.html', cloneResponse()),
            cache.put('./index.html', cloneResponse())
          ]);
        }
      } catch (err) {
        console.warn('[SW] Root document pre-cache failed:', err);
      }

      // Pre-cache remaining static assets individually
      await Promise.all(
        ASSETS.map(async (url) => {
          try {
            const res = await fetch(url, { cache: 'no-cache' });
            if (res && res.ok && !res.redirected) {
              await cache.put(url, res);
            }
          } catch (err) {
            console.warn(`[SW] Failed to cache ${url}:`, err);
          }
        })
      );
    })()
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  // Navigation requests (opening or refreshing the PWA)
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      (async () => {
        // Look up cached shell first (ignore query params like ?utm_source=homescreen)
        const cached = (await caches.match('/', { ignoreSearch: true }))
          || (await caches.match('/index.html', { ignoreSearch: true }))
          || (await caches.match(event.request, { ignoreSearch: true }));

        if (cached) {
          // Asynchronously update cache in the background (stale-while-revalidate)
          fetch(event.request).then(async (networkRes) => {
            if (networkRes && networkRes.ok && !networkRes.redirected) {
              const cache = await caches.open(CACHE_NAME);
              await cache.put('/', networkRes.clone());
              await cache.put('/index.html', networkRes.clone());
            }
          }).catch(() => {});
          return cached;
        }

        // If not yet in cache, fetch from network
        try {
          const networkRes = await fetch(event.request);
          if (networkRes && networkRes.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put('/', networkRes.clone());
            cache.put('/index.html', networkRes.clone());
          }
          return networkRes;
        } catch (err) {
          // If offline and fetch failed, try any cached root fallback
          const fallback = (await caches.match('/', { ignoreSearch: true }))
            || (await caches.match('/index.html', { ignoreSearch: true }));
          if (fallback) return fallback;
          throw err;
        }
      })()
    );
    return;
  }

  // Non-navigation asset requests (scripts, images, etc.)
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(event.request);
    })
  );
});
