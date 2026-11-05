// WayWey PWA registration, network state and update UX.
// Hospital datasets are cached by the service worker only after that hospital
// is actually used.

let controller=null;

function ensureUi(){
  let host=document.getElementById("pwaNotices");
  if(host)return host;
  host=document.createElement("div");
  host.id="pwaNotices";
  host.className="pwa-notices";
  host.innerHTML=
    '<div id="offlineNotice" class="pwa-notice pwa-offline" role="status" aria-live="polite" hidden></div>'+
    '<div id="updateNotice" class="pwa-notice pwa-update" role="status" aria-live="polite" hidden>'+
      '<span id="updateText"></span>'+
      '<button id="applyUpdate" class="pwa-update-btn" type="button"></button>'+
    '</div>';
  document.body.appendChild(host);
  return host;
}

export function initPwa({labels}={}){
  if(controller)return controller;

  let registration=null;
  let updateRequested=false;
  let reloading=false;
  const getLabels=()=>typeof labels==="function"?labels():({});

  function refreshLabels(){
    ensureUi();
    const t=getLabels()||{};
    const offline=document.getElementById("offlineNotice");
    const updateText=document.getElementById("updateText");
    const updateButton=document.getElementById("applyUpdate");
    if(offline)offline.textContent=t.offline||"Offline — using cached data";
    if(updateText)updateText.textContent=t.updateReady||"A WayWey update is ready.";
    if(updateButton)updateButton.textContent=t.updateButton||"Update";
    renderNetworkState();
  }

  function renderNetworkState(){
    ensureUi();
    const offline=document.getElementById("offlineNotice");
    if(!offline)return;
    offline.hidden=navigator.onLine!==false;
  }

  function hideUpdate(){
    const notice=document.getElementById("updateNotice");
    if(notice)notice.hidden=true;
  }

  function showUpdate(){
    ensureUi();
    const notice=document.getElementById("updateNotice");
    if(notice)notice.hidden=false;
    refreshLabels();
  }

  async function cacheHospital(id){
    if(!("serviceWorker" in navigator)||!/^[a-z0-9-]+$/i.test(id||""))return;
    try{
      const reg=registration||await navigator.serviceWorker.ready;
      const worker=reg.active||navigator.serviceWorker.controller;
      if(worker)worker.postMessage({type:"CACHE_HOSPITAL",id:String(id).toLowerCase()});
    }catch(e){}
  }

  async function register(){
    if(!("serviceWorker" in navigator))return;
    try{
      registration=await navigator.serviceWorker.register("./service-worker.js");

      if(registration.waiting&&navigator.serviceWorker.controller)showUpdate();
      else hideUpdate();

      registration.addEventListener("updatefound",()=>{
        const worker=registration.installing;
        if(!worker)return;
        worker.addEventListener("statechange",()=>{
          if(worker.state==="installed"&&navigator.serviceWorker.controller)showUpdate();
        });
      });

      // One inexpensive freshness check per application load.
      registration.update().catch(()=>{});
    }catch(e){}
  }

  ensureUi();
  window.addEventListener("online",renderNetworkState);
  window.addEventListener("offline",renderNetworkState);

  document.getElementById("applyUpdate").addEventListener("click",async()=>{
    const button=document.getElementById("applyUpdate");
    if(button.disabled)return;
    button.disabled=true;
    try{
      if(!registration)registration=await navigator.serviceWorker.getRegistration("./");
      if(registration)await registration.update();
      if(!registration||!registration.waiting){
        hideUpdate();
        return;
      }
      updateRequested=true;
      registration.waiting.postMessage({type:"SKIP_WAITING"});
      // A worker can fail to activate; do not leave a permanently inert button.
      setTimeout(()=>{
        if(!reloading){
          updateRequested=false;
          button.disabled=false;
          if(!registration.waiting)hideUpdate();
          else {
            const status=document.getElementById("updateText");
            if(status)status.textContent="Update could not finish. Please try again.";
          }
        }
      },8000);
    }catch(e){
      updateRequested=false;
      const status=document.getElementById("updateText");
      if(status)status.textContent="Update check failed. Check your connection and try again.";
      button.disabled=false;
    }
  });

  if("serviceWorker" in navigator){
    navigator.serviceWorker.addEventListener("controllerchange",()=>{
      hideUpdate();
      if(!reloading){
        reloading=true;
        window.location.reload();
      }
    });
  }

  controller={refreshLabels,cacheHospital};
  refreshLabels();
  register();
  return controller;
}
