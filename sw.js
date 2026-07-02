const CACHE = 'nebulus-v2';
const ASSETS = [
  '/nebulus/nebulus-dashboard.html',
  '/nebulus/nebulus-clientes.html',
  '/nebulus/nebulus-historico.html',
  '/nebulus/nebulus-relatorio.html',
  '/nebulus/nebulus-catalogo.html',
  '/nebulus/nebulus-wiki.html',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Sempre busca da rede primeiro, cai no cache se offline
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
