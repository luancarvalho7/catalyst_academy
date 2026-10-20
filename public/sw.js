/*
 * Catalyst Academy service worker.
 * - Pages: network first, falling back to the last cached copy (then /home) when offline.
 * - Hashed build assets (/_next/static) and local images: cache first; they never change in place.
 * - Cross-origin requests (YouTube embeds, Google Fonts) are left to the browser.
 * Bump CACHE_VERSION to drop every old cache on the next activation.
 */

const CACHE_VERSION = "v1";
const PAGES = `catalyst-pages-${CACHE_VERSION}`;
const ASSETS = `catalyst-assets-${CACHE_VERSION}`;
const SHELL = ["/home", "/", "/assessment"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGES)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== PAGES && key !== ASSETS).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

function isStaticAsset(url) {
  return url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/_next/image") || /\.(png|jpg|jpeg|webp|svg|ico|woff2)$/.test(url.pathname);
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(PAGES).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request, { ignoreSearch: true }).then((cached) => cached || caches.match("/home"))),
    );
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(ASSETS).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
  }
});
