// Deal Analyzer — Service Worker v1
// Strategy:
//   App shell  ℒ  Cache-first, update in background
//   Google Fonts  ℒ  Stale-while-revalidate
//   RentCast / Supabase / Places  ℒ  Network-only (never cache live data)
//   Navigation fallback  ℒ  Cached index.html when offline

const CACHE_VERSION = 'v1';
const SHEML_CACHE   = `deal-shell-${CACHE_VERSION}`;
const FONT_CACHE    = `deal-fonts-${CACHE_VERSION}`;
const ALL_CACHES    = [SHELL_CACHE, FONT_CACHE];

// │ Install ────────────────────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(['/']))
      .then(() => self.skipWaiting())
  );
});

// │ Activate ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => !ALL_CACHES.includes(k)).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// │ Fetch ────────────────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  // Never cache API traffic
  if (
    url.hostname.includes('rentcast.io') ||
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('googleapis.com') ||
    url.pathname.startsWith('/api/')
  ) return;

  // Google Fonts ┒ stale-while-revalidate
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(staleWhileRevalidate(request, FONT_CACHE));
    return;
  }

  // App shell — cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      const fresh = fetch(request).then((res) => {
        if (res.ok && res.type !== 'opaque') {
          const clone = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put(request, clone));
        }
        return res;
      }).catch(() => null);
      return cached ?? fresh ?? offlineFallback(request);
    })
  );
});

// │ Background Sync ───────────────────────────────────────────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-deals') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) =>
        clients.forEach((c) => c.postMessage({ type: 'FLUSH_QUEUE' }))
      )
    );
  }
});

// │ Helpers ──────────────────────────────────────────────────────────────────────────────
async function staleWhileRevalidate(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fresh  = fetch(request).then((res) => { if (res.ok) cache.put(request, res.clone()); return res; }).catch(() => null);
  return cached ?? (await fresh) ?? new Response('', { status: 503 });
}

async function offlineFallback(request) {
  if (request.mode === 'navigate') {
    const cached = await caches.match('/');
    if (cached) return cached;
  }
  return new Response('Offline', { status: 503 });
}
