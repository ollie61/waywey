// Hospital package loading helpers.

export function hospitalIdFromUrl(){
  const p=new URLSearchParams(window.location.search);
  const q=p.get("hospital");
  if(q&&/^[a-z0-9-]+$/i.test(q))return q.toLowerCase();
  // Backward compatibility for visitor links created before hospital datasets.
  if(p.get("visitor")==="1")return "jgh";
  return null;
}

export async function fetchJson(url){
  const r=await fetch(url,{cache:"no-cache"});
  if(!r.ok)throw new Error("Could not load "+url+" ("+r.status+")");
  return r.json();
}
