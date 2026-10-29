// Guarda o app no iPhone para abrir mesmo sem internet.
// Ao publicar uma versão nova, troque o número abaixo para o iPhone baixar de novo.
const VERSAO = "alvo-1";
const ARQUIVOS = ["./", "index.html", "manifest.webmanifest", "icone-180.png", "icone-192.png", "icone-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  // página e arquivos do app: rede primeiro (pega versão nova), cache se estiver sem internet
  // fontes do Google: cache primeiro
  const url = new URL(e.request.url);
  const fonte = url.hostname.endsWith("googleapis.com") || url.hostname.endsWith("gstatic.com");
  if (fonte) {
    e.respondWith(caches.open(VERSAO).then(async c => {
      const hit = await c.match(e.request);
      if (hit) return hit;
      const r = await fetch(e.request); c.put(e.request, r.clone()); return r;
    }));
    return;
  }
  // "no-cache" pergunta ao servidor se há versão nova, sem usar a cópia velha guardada pelo navegador
  const req = url.origin === location.origin ? new Request(e.request, { cache: "no-cache" }) : e.request;
  e.respondWith(fetch(req).then(r => {
    if (r.ok && url.origin === location.origin) { const copia = r.clone(); caches.open(VERSAO).then(c => c.put(e.request, copia)); }
    return r;
  }).catch(() => caches.match(e.request).then(h => h || caches.match("index.html"))));
});
