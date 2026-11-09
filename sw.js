// Offline support: always try the network first (so updates arrive), fall back to the saved copy.
const C = "fitness-tracker-v3";
const ASSETS = ["./", "index.html", "icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(C).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET" || new URL(r.url).origin !== location.origin) return;
  e.respondWith(new Promise(res => {
    let done = false;
    const give = x => { if (!done && x) { done = true; res(x); } };
    // slow or no signal in the gym: after 3 s use the saved copy
    const timer = setTimeout(() => caches.match(r, { ignoreSearch: true }).then(give), 3000);
    fetch(r).then(n => {
      clearTimeout(timer);
      if (n && n.ok) { const cp = n.clone(); caches.open(C).then(c => c.put(r, cp)); }
      give(n);
    }).catch(() => {
      clearTimeout(timer);
      caches.match(r, { ignoreSearch: true }).then(m => { if (m) give(m); else give(Response.error()); });
    });
  }));
});
