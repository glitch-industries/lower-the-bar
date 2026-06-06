/* Movement Plan — service worker
   Caches the app shell so it opens in airplane mode after one online load.
   Bump CACHE (e.g. v2, v3) whenever you upload a new version so the old
   cache is cleared and users get the update. */
var CACHE = "movement-plan-v1";
var ASSETS = ["/lower-the-bar/", "/lower-the-bar/index.html"];

self.addEventListener("install", function(e){
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      return c.addAll(ASSETS).catch(function(){
        // If "./" and "index.html" double-resolve on some hosts, cache what we can.
        return c.add("index.html").catch(function(){});
      });
    })
  );
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){
        if(k !== CACHE) return caches.delete(k);
      }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(e){
  if(e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(function(hit){
      if(hit) return hit;
      return fetch(e.request).then(function(res){
        var copy = res.clone();
        caches.open(CACHE).then(function(c){ try { c.put(e.request, copy); } catch(_){} });
        return res;
      }).catch(function(){
        // Offline and not cached — fall back to the app shell for navigations.
        if(e.request.mode === "navigate") return caches.match("/lower-the-bar/index.html");
      });
    })
  );
});
