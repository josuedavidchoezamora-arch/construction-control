/* Service worker de la versión web (lo copia build.mjs --web a dist-web/sw.js)
   - La página: primero la red (así siempre se ve la versión nueva); sin señal, la última guardada.
   - Librerías de los CDN (con versión fija en la dirección): se guardan la primera vez y luego se leen del equipo.
   - La nube (Supabase) NUNCA se guarda aquí: los datos siempre van y vienen en vivo. */
const VERSION = '1.1.3-mwtbml6r';
const CACHE = 'cc-web-' + VERSION;
const BASICOS = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
const CDN = /^https:\/\/(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|unpkg\.com|cdn\.sheetjs\.com)\//;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(BASICOS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('cc-web-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const url = r.url;
  if (/supabase\.co/.test(url)) return;                         // datos en vivo: sin caché
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).then((resp) => { const c = resp.clone(); caches.open(CACHE).then((k) => k.put('index.html', c)); return resp; })
      .catch(() => caches.match('index.html')));
    return;
  }
  if (CDN.test(url) || url.startsWith(self.location.origin)) {
    e.respondWith(caches.match(r).then((hit) => hit || fetch(r).then((resp) => {
      if (resp.ok || resp.type === 'opaque') { const c = resp.clone(); caches.open(CACHE).then((k) => k.put(r, c)); }
      return resp;
    })));
  }
});
