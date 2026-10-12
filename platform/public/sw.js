/* Only cache the app's own assets. Never retain proxied pages or API responses. */
const CACHE='inkrush-shell-v1';
const OFFLINE='/offline.html';
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll([OFFLINE,'/icons/icon-192.png','/icons/icon-512.png'])).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('inkrush-shell-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const {request}=event,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
  if(request.mode==='navigate'){
    event.respondWith(fetch(request).catch(async()=>await caches.match(OFFLINE)||Response.error()));return;
  }
  if(!url.pathname.startsWith('/_next/static/')&&!url.pathname.startsWith('/icons/'))return;
  event.respondWith((async()=>{
    let cache;
    try{cache=await caches.open(CACHE);const cached=await cache.match(request);if(cached)return cached;}catch{}
    const response=await fetch(request);
    // A full/disabled device cache must not break a successful network response.
    if(response.ok&&cache)try{await cache.put(request,response.clone());const keys=await cache.keys();const chunks=keys.filter(key=>new URL(key.url).pathname.startsWith('/_next/static/'));for(const key of chunks.slice(0,Math.max(0,chunks.length-80)))await cache.delete(key);}catch{}
    return response;
  })());
});
