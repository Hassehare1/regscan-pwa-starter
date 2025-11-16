const CACHE = 'regscan-v1'
const OFFLINE_URLS = ['/', '/index.html', '/src/main.jsx']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(OFFLINE_URLS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    ))
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  // Network-first for JS/CSS, cache-first for others
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request).then(r => {
        const copy = r.clone()
        caches.open(CACHE).then(c => c.put(request, copy))
        return r
      }).catch(() => caches.match(request).then(r => r || caches.match('/')))
    )
  } else {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(r => {
        const copy = r.clone()
        caches.open(CACHE).then(c => c.put(request, copy))
        return r
      }))
    )
  }
})
