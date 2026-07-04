/* Nexus Nook service worker.
 *
 * Strategy: network-first for everything, falling back to cache when offline.
 * The app iterates quickly, so we never serve a stale bundle when the network
 * is available — the cache exists purely to keep the app openable offline.
 * API calls (our backend, UEX, SC Wiki, Discord) are never cached: live data
 * should fail loudly rather than show silently stale prices.
 */

const CACHE = 'nexus-nook-v1'

// Same-origin app shell requests only; everything else passes straight through.
function isAppShellRequest(request) {
  if (request.method !== 'GET') return false
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return false
  // Never cache anything that looks like an API call.
  if (url.pathname.includes('/api/')) return false
  return true
}

self.addEventListener('install', (event) => {
  self.skipWaiting()
  const scope = new URL(self.registration.scope)
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        cache.addAll([scope.pathname, `${scope.pathname}manifest.webmanifest`]),
      )
      .catch(() => {}),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (!isAppShellRequest(request)) return

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Keep a copy of good responses for offline use.
        if (response.ok) {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {})
        }
        return response
      })
      .catch(async () => {
        const cached = await caches.match(request)
        if (cached) return cached
        // SPA navigations can fall back to the cached app shell.
        if (request.mode === 'navigate') {
          const scope = new URL(self.registration.scope)
          const shell = await caches.match(scope.pathname)
          if (shell) return shell
        }
        return Response.error()
      }),
  )
})
