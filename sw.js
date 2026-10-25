const CACHE_NAME = 'tama-pwa-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './config/petConfig.js',
  './engine/timeEngine.js',
  './engine/evolutionResolver.js',
  './ui/LcdMatrix.js',
  './ui/sprites.js',
  './ui/StatusRenderer.js',
  './ui/GameRenderer.js',
  './audio/TamagotchiAudio.js',
  './constants/menu.js',
  './controllers/MenuController.js',
  './controllers/MiniGameController.js',
  './storage/SaveManager.js',
  './app.js',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
