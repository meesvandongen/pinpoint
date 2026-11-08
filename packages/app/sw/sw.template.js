/*
 * Pinpoint's service worker: the game keeps working without a connection.
 *
 * - The files that start the app are cached when the worker installs (the list below is filled in at
 *   build time). The map and the editor are cached the first time they are opened.
 * - Quest files are served from the cache and refreshed in the background, so a quest added since
 *   the last visit shows up the next time.
 * - Map tiles and map fonts are cached as they are used, within a limit.
 * - Everything else (weather lookups, GitHub) always goes to the network.
 */
const VERSION = '__VERSION__'
const SHELL = `pinpoint-shell-${VERSION}`
const CONTENT = 'pinpoint-content-v1'
const TILES = 'pinpoint-tiles-v1'
const KEEP = [SHELL, CONTENT, TILES]
const MAX_TILES = 500
const PRECACHE = __PRECACHE__

// Some servers send `Vary: Origin`, which would stop a cached script from matching a module request.
const ANY = { ignoreVary: true }

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((name) => !KEEP.includes(name)).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  )
})

/**
 * A missing file on a host that falls back to the app's page answers 200 with HTML. That must not be
 * stored as if it were the script, quest or tile that was asked for.
 */
function cacheable(request, response) {
  if (!response.ok) return false
  const type = response.headers.get('content-type') ?? ''
  return request.destination === 'document' || !type.includes('text/html')
}

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  // Oldest first: the order entries were added in.
  for (const key of keys.slice(0, Math.max(0, keys.length - max))) await cache.delete(key)
}

/** The cached copy at once, and a fresh one fetched for next time. */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  // A copy fetched since installing beats the one cached at install.
  const cached = (await cache.match(request, ANY)) ?? (await caches.match(request, { ...ANY, cacheName: SHELL }))
  const fresh = fetch(request)
    .then((response) => {
      if (cacheable(request, response)) void cache.put(request, response.clone())
      return response
    })
    .catch(() => undefined)
  return cached ?? (await fresh) ?? Response.error()
}

async function cacheFirst(request, cacheName, max) {
  const cache = await caches.open(cacheName)
  const cached = (await cache.match(request, ANY)) ?? (cacheName === CONTENT ? await caches.match(request, { ...ANY, cacheName: SHELL }) : undefined)
  if (cached) return cached
  const response = await fetch(request)
  if (cacheable(request, response)) {
    void cache.put(request, response.clone()).then(() => (max ? trim(cacheName, max) : undefined))
  }
  return response
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  try {
    const response = await fetch(request)
    if (cacheable(request, response)) void cache.put(request, response.clone())
    return response
  } catch {
    return (await cache.match(request, ANY)) ?? Response.error()
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET' || request.headers.has('range')) return
  const url = new URL(request.url)

  // Pages: the network when there is one, otherwise the app shell. Every route is the same single page.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => (await caches.match('/index.html', { ...ANY, cacheName: SHELL })) ?? Response.error()),
    )
    return
  }

  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith('/content/')) {
      // Photos and sounds do not change under the same name; quest files do.
      event.respondWith(url.pathname.endsWith('.json') ? staleWhileRevalidate(request, CONTENT) : cacheFirst(request, CONTENT))
      return
    }
    // The app's own files have the hash of their content in their name, so a cached copy is never stale.
    event.respondWith(cacheFirst(request, SHELL))
    return
  }

  if (url.hostname === 'tiles.openfreemap.org') {
    // The tile list names the current tile version, so it is always asked for first.
    event.respondWith(url.pathname === '/planet' ? networkFirst(request, TILES) : cacheFirst(request, TILES, MAX_TILES))
    return
  }
})
