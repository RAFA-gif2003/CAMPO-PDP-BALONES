'use strict';
/* Service worker · Campo PDP Balones
   - Página y recursos propios: red primero (4 s) y, si falla, la copia guardada.
   - Teselas: solo se sirven de la caché 'pdp-tiles' si ya están descargadas; nunca se guardan respuestas opacas.
   - Servidor (Apps Script): nunca pasa por la caché. */
const CACHE = 'pdp-balones-v1';
const TILES = 'pdp-tiles';
const BASE = [
  './', './index.html', './capas.json', './manifest.webmanifest', './icon-192.png', './icon-512.png',
  './leaflet/leaflet.js', './leaflet/leaflet.css'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(BASE.map(u => c.add(new Request(u, {cache:'reload'})).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== TILES).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

function conTiempo(req, ms){
  return new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('tiempo')), ms);
    fetch(req).then(r => { clearTimeout(t); res(r); }, err => { clearTimeout(t); rej(err); });
  });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.indexOf('script.google') >= 0 || url.hostname.indexOf('googleusercontent') >= 0) return;
  if (url.origin === location.origin){
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      try {
        const r = await conTiempo(req, 4000);
        if (r && r.ok) c.put(req, r.clone());
        return r;
      } catch(err){
        const m = await c.match(req, {ignoreSearch:true}) || (req.mode === 'navigate' ? await c.match('./index.html') : null);
        return m || Response.error();
      }
    })());
    return;
  }
  if (/ign\.es\/wmts/.test(url.href)){
    e.respondWith((async () => {
      const t = await caches.open(TILES);
      const m = await t.match(req.url);
      if (m) return m;
      return fetch(req);
    })());
  }
});
