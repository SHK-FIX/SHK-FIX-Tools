const CACHE='shkfix-aufmass-v10';
const ASSETS=['./','./index.html?v=10','./styles.css?v=10','./app.js?v=10','./workflow-v4.js?v=10','./pdf-unicode.js?v=10','./photo-store.js?v=10','./photo-ui.js?v=10','./pdf-photos.js?v=10','./manifest.json?v=10'];

self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  const request=event.request;
  const isNavigation=request.mode==='navigate';
  if(isNavigation){
    event.respondWith(fetch(request).catch(()=>caches.match('./index.html?v=10')));
    return;
  }
  event.respondWith(fetch(request).then(response=>{
    const copy=response.clone();
    caches.open(CACHE).then(cache=>cache.put(request,copy));
    return response;
  }).catch(()=>caches.match(request)));
});
