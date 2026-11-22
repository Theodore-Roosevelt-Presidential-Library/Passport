// Offline support: many parks have little or no signal, so the passport,
// stickers and fonts are cached for use in the field.
const CACHE = "trpassport-v4";
const CORE = [
  "./", "index.html", "css/app.css", "js/app.js", "js/cancel.js", "js/store.js", "js/geo.js", "js/stats.js", "assets/badges/_generic.webp", "data/sites.json",
  "assets/fonts/DharmaGothicE-Bold.woff2", "assets/fonts/FrutigerNextCom-Regular.woff2", "assets/fonts/FrutigerNextCom-Bold.woff2",
  "assets/brand/trpl-tr-brand-mark-sunset-yellow.svg", "assets/brand/trpl-tr-brand-mark-night-sky.svg",
  "assets/brand/trpl-logo-horizontal-white.svg", "assets/brand/trpl-logo-horizontal-black.svg",
];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  // network first, fall back to cache; cache everything we fetch (stickers included)
  e.respondWith(
    fetch(e.request).then((r) => {
      const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return r;
    }).catch(() => caches.match(e.request))
  );
});
