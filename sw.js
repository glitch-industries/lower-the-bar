/* Lower the Bar — service worker.
   Bump CACHE when you deploy changes so phones pull the new version. */
var CACHE = "ltb-v17";
var BASE = "/lower-the-bar/";
var ASSETS = [
  BASE, BASE+"index.html", BASE+"app.js",
  BASE+"data/exercises.json", BASE+"data/phases.json",
  BASE+"data/templates.json", BASE+"data/schedule.json",
  BASE+"data/ifit-series.json", BASE+"icon.png"
];

self.addEventListener("install", function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){
    return Promise.all(ASSETS.map(function(u){ return c.add(u).catch(function(){}); }));
  }));
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(keys){ return Promise.all(keys.map(function(k){ if(k!==CACHE) return caches.delete(k); })); })
      .then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(e){
  if(e.request.method!=="GET") return;
  e.respondWith(
    caches.match(e.request).then(function(hit){
      if(hit) return hit;
      return fetch(e.request).then(function(res){
        var copy=res.clone();
        caches.open(CACHE).then(function(c){ try{ c.put(e.request,copy); }catch(_){} });
        return res;
      }).catch(function(){
        if(e.request.mode==="navigate") return caches.match(BASE+"index.html");
      });
    })
  );
});
