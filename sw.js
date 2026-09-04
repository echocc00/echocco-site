// echocc00 service worker — cache strategy
const VERSION = 'v3-2026-09-03';
const CACHE_STATIC = `echocco-static-${VERSION}`;
const CACHE_RUNTIME = `echocco-runtime-${VERSION}`;

const STATIC_ASSETS = [
  '/',
  '/about/',
  '/now/',
  '/uses/',
  '/colophon/',
  '/projects/',
  '/zh/',
  '/zh/about/',
  '/zh/now/',
  '/zh/uses/',
  '/zh/colophon/',
  '/zh/projects/',
  '/manifest.webmanifest',
  '/icon.svg',
  '/apple-touch-icon.png',
  '/assets/css/main.css',
  '/assets/css/motion.css',
  '/assets/js/motion.js',
  '/assets/webgl/strands.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_STATIC).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_STATIC && k !== CACHE_RUNTIME).map((k) => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Skip service worker for SVG demo files (they're loaded dynamically by content)
  // Cache-first for known static assets
  if (STATIC_ASSETS.some((a) => url.pathname === a)) {
    e.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_STATIC).then((c) => c.put(req, copy));
        return res;
      }))
    );
    return;
  }

  // Network-first for HTML pages, fall back to cache
  if (req.headers.get('accept')?.includes('text/html')) {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_RUNTIME).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then((c) => c || caches.match('/')))
    );
    return;
  }

  // Stale-while-revalidate for everything else (images, fonts)
  e.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_RUNTIME).then((c) => c.put(req, copy));
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
