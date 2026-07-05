const CACHE_NAME = "nutripilot-v18";
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./favicons/favicon.ico",
  "./favicons/favicon-16x16.png",
  "./favicons/favicon-32x32.png",
  "./favicons/favicon-48x48.png",
  "./icons/icon-48x48.png",
  "./icons/icon-96x96.png",
  "./icons/icon-light-48x48.png",
  "./icons/icon-light-96x96.png",
  "./icons/icon-192x192.png",
  "./icons/icon-512x512.png",
  "./icons/maskable-192x192.png",
  "./icons/maskable-512x512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const requestUrl = new URL(event.request.url);
  if (event.request.method !== "GET") return;
  if (requestUrl.origin !== location.origin) return;
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then(cached => cached || caches.match("./index.html")))
  );
});
