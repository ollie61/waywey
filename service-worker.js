const SHELL_CACHE="waywey-cache-16";
const DATA_CACHE="waywey-hospital-data-1";

const SHELL_ASSETS=[
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/waywey.svg",
  "./qrcode.min.js",
  "./styles.css",
  "./app.js",
  "./js/i18n.js",
  "./js/search.js",
  "./js/routing.js",
  "./js/ui.js",
  "./js/data.js",
  "./js/pwa.js",
  "./js/provenance.js",
  "./js/accessibility.js",
  "./js/outdoor-map.js",
  "./js/voice-search.js"
];

self.addEventListener("install",event=>{
  event.waitUntil(caches.open(SHELL_CACHE).then(cache=>cache.addAll(SHELL_ASSETS)));
});

self.addEventListener("activate",event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(
        keys
          .filter(key=>key.startsWith("waywey-cache-")&&key!==SHELL_CACHE)
          .map(key=>caches.delete(key))
      ))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener("message",event=>{
  const data=event.data||{};
  if(data.type==="SKIP_WAITING"){
    self.skipWaiting();
    return;
  }
  if(data.type==="CACHE_HOSPITAL"&&/^[a-z0-9-]+$/i.test(data.id||"")){
    event.waitUntil(cacheHospital(String(data.id).toLowerCase()));
  }
});

function hospitalAssets(id){
  return [
    `./hospitals/${id}/config.json`,
    `./hospitals/${id}/destinations.json`,
    `./hospitals/${id}/routes.json`,
    `./hospitals/${id}/guide.json`,
    `./${id}/`,
    `./${id}/index.html`
  ];
}

async function cacheHospital(id){
  const cache=await caches.open(DATA_CACHE);
  await Promise.all(hospitalAssets(id).map(async url=>{
    try{
      const response=await fetch(url,{cache:"no-cache"});
      if(response.ok)await cache.put(url,response.clone());
    }catch(e){}
  }));
}

function isHospitalJson(url){
  return url.origin===self.location.origin &&
    /\/hospitals\/[a-z0-9-]+\/(?:config|destinations|routes|guide)\.json$/i.test(url.pathname);
}

async function networkFirstHospital(request){
  const cache=await caches.open(DATA_CACHE);
  try{
    const response=await fetch(request);
    if(response.ok)await cache.put(request,response.clone());
    return response;
  }catch(e){
    const cached=await cache.match(request);
    if(cached)return cached;
    throw e;
  }
}

async function navigationResponse(request){
  try{
    return await fetch(request);
  }catch(e){
    const exact=await caches.match(request,{ignoreSearch:true});
    if(exact)return exact;
    return (await caches.match("./index.html")) || Response.error();
  }
}

async function shellResponse(request){
  const cached=await caches.match(request);
  if(cached)return cached;
  return fetch(request);
}

self.addEventListener("fetch",event=>{
  const request=event.request;
  if(request.method!=="GET")return;

  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;

  if(request.mode==="navigate"){
    event.respondWith(navigationResponse(request));
    return;
  }

  if(isHospitalJson(url)){
    event.respondWith(networkFirstHospital(request));
    return;
  }

  event.respondWith(shellResponse(request));
});
