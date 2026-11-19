// echocc00 service worker — cache strategy
const VERSION = 'v14-2026-11-20';
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
  '/assets/css/console.css',
  '/assets/js/motion.js',
  '/assets/js/console.js',
  '/assets/js/hero-anim.js',
  '/assets/webgl/strands.js',
  '/assets/fonts/ibm-plex-sans-400.woff2',
  '/assets/fonts/ibm-plex-sans-500.woff2',
  '/assets/fonts/ibm-plex-sans-600.woff2',
  '/assets/fonts/jetbrains-mono-400.woff2',
  '/assets/fonts/jetbrains-mono-700.woff2',
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

  /* A versioned URL — /assets/css/main.css?v=<hash> — is a different file
     from everything the cache has seen. The version query exists for one
     reason: to make the edge and the cache hand back the NEW file after a
     deploy. So a versioned request must never be answered from a copy that
     was made before that version existed.

     The old code fell back to caches.match(url.pathname) here — the bare
     path, whose precached entry is the PREVIOUS file. So a visitor with the
     service worker installed kept the old CSS for as long as the old cache
     lived, however new the URL in the HTML was. Network first for a
     versioned request; the cache is only the offline fallback. */
  if (url.search.length > 0) {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_RUNTIME).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then((c) => c || caches.match(url.pathname)))
    );
    return;
  }

  // Cache-first for known static assets
  if (STATIC_ASSETS.some((a) => url.pathname === a)) {
    e.respondWith(
      caches.match(req).then((cached) => cached
        || caches.match(url.pathname)
      ).then((cached) => cached || fetch(req).then((res) => {
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
