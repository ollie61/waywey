// Shared presentation helpers. DOM orchestration remains in app.js.

export function destinationName(d,lang){
  return d?.[lang]||d?.en||d?.he||d?.ar||d?.fr||"";
}

export function destinationSecondary(d,lang,languages){
  const primary=destinationName(d,lang);
  const preferred=[...(languages||[]),"en","he","ar","fr"];
  for(const l of [...new Set(preferred)]){
    if(l!==lang&&d[l]&&d[l]!==primary)return d[l];
  }
  return "";
}

export function appIsRtl(lang){return ["he","ar","fa"].includes(lang);}

export function locationFor(d,lang){
  const key="loc"+lang.charAt(0).toUpperCase()+lang.slice(1);
  if(d[key])return d[key];
  let s=d.loc||"";
  if(lang==="fr")return s
    .replace(/\b(-?\d+)(?:st|nd|rd|th)?\s+floor\b/ig,(_,n)=>n+(n==="1"?"er":"e")+" étage")
    .replace(/\bFloor\s*(-?\d+)\b/ig,(_,n)=>n+(n==="1"?"er":"e")+" étage")
    .replace(/\bGround floor\b/ig,"Rez-de-chaussée")
    .replace(/\bEntrance floor\b/ig,"Niveau de l’entrée")
    .replace(/\bMezzanine floor\b/ig,"Mezzanine")
    .replace(/\bLobby\b/ig,"Hall");
  if(lang!=="he"&&lang!=="ar")return s;
  const words=lang==="he"
    ?{floor:"קומה",ground:"קומת קרקע",entrance:"קומת כניסה",mezzanine:"קומת ביניים",middle:"קומת ביניים",lobby:"לובי"}
    :{floor:"الطابق",ground:"الطابق الأرضي",entrance:"طابق المدخل",mezzanine:"الطابق النصفي",middle:"الطابق النصفي",lobby:"البهو"};
  s=s.replace(/Floor\s*(-?\d+)/ig,(_,n)=>words.floor+" "+n)
    .replace(/Ground floor/ig,words.ground)
    .replace(/Entrance floor/ig,words.entrance)
    .replace(/Mezzanine floor/ig,words.mezzanine)
    .replace(/Middle floor/ig,words.middle)
    .replace(/\bLobby\b/ig,words.lobby);
  return s;
}

export function formatPavilion(p,lang,hospital,pavLabels){
  if(!p)return "";
  const special=hospital.specialPavilionLabels||{};
  if(special[p])return special[p][lang]||special[p].en||special[p].he||special[p].ar||special[p].fr||p;
  if(p.includes("/"))return p.split("/").map(x=>formatPavilion(x.trim(),lang,hospital,pavLabels)).join(" / ");
  const labels=pavLabels[lang]||pavLabels.en||{};
  return labels[p]||((lang==="fr"?"Pavillon ":"Pavilion ")+p);
}
