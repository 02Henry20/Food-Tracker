const CACHE_NAME = "nutripilot-v59-offline-shell";
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
  "./icons/icon-16x16.png",
  "./icons/icon-32x32.png",
  "./icons/icon-48x48.png",
  "./icons/icon-64x64.png",
  "./icons/icon-72x72.png",
  "./icons/icon-96x96.png",
  "./icons/icon-128x128.png",
  "./icons/icon-144x144.png",
  "./icons/icon-152x152.png",
  "./icons/icon-167x167.png",
  "./icons/icon-180x180.png",
  "./icons/icon-192x192.png",
  "./icons/icon-256x256.png",
  "./icons/icon-384x384.png",
  "./icons/icon-512x512.png",
  "./icons/icon-1024x1024.png",
  "./icons/android-circle-192x192.png",
  "./icons/android-circle-512x512.png",
  "./icons/android-circle-1024x1024.png",
  "./icons/maskable-192x192.png",
  "./icons/maskable-512x512.png",
  "./icons/maskable-1024x1024.png",
  "./icons/apple-touch-icon.png"
];
const EXTERNAL_ASSETS = [
  "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js",
  "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js",
  "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js",
  "https://cdn.jsdelivr.net/npm/chart.js@4.4.9/dist/chart.umd.min.js",
  "https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js"
];
const CACHEABLE_EXTERNAL_PREFIXES = [
  "https://www.gstatic.com/firebasejs/",
  "https://cdn.jsdelivr.net/npm/chart.js",
  "https://cdn.jsdelivr.net/npm/@zxing/"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      await cache.addAll(STATIC_ASSETS);
      await Promise.allSettled(EXTERNAL_ASSETS.map(url => cache.add(new Request(url, { mode: "cors" }))));
    })
  );
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
  const isSameOrigin = requestUrl.origin === location.origin;
  const isCacheableExternal = CACHEABLE_EXTERNAL_PREFIXES.some(prefix => event.request.url.startsWith(prefix));
  if (!isSameOrigin && !isCacheableExternal) return;
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then(cached => {
        if (cached) return cached;
        if (isSameOrigin && event.request.mode === "navigate") return caches.match("./index.html");
        return Response.error();
      }))
  );
});
