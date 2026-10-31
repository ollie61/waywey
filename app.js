import {I18N,QR_UI,APP_UI,PWA_UI,PROVENANCE_UI,ACCESSIBILITY_UI,OUTDOOR_UI,VOICE_UI,LANGUAGE_NAMES,routeNoticeText} from "./js/i18n.js";
import {norm,rankResults,inferQueryLanguage} from "./js/search.js";
import {findRoute,resolveTargetNode} from "./js/routing.js";
import {destinationName,destinationSecondary as getDestinationSecondary,appIsRtl,locationFor,formatPavilion,strengthBadge} from "./js/ui.js";
import {hospitalIdFromUrl,fetchJson} from "./js/data.js";
import {initPwa} from "./js/pwa.js";
import {formatAuditDate,sourceLinks,hospitalSourceLinks} from "./js/provenance.js";
import {setupDialog,openDialog,closeDialog,announce} from "./js/accessibility.js";
import {outdoorMapUrl} from "./js/outdoor-map.js";
import {createVoiceSearch} from "./js/voice-search.js";

const APP_VERSION="0.2.0";
let HOSPITAL={};
let DATA=[];
let GRAPH={};
let PAV_LABELS={en:{},fr:{}};
let NOTE_TRANSLATIONS={};
let QUICK_GUIDE={};

function hospitalLanguages(){return (HOSPITAL.ambassadorLanguages&&HOSPITAL.ambassadorLanguages.length)?HOSPITAL.ambassadorLanguages:["en","fr"];}
function destinationSecondary(d,lang){return getDestinationSecondary(d,lang,hospitalLanguages());}
function queryLanguage(q,d){return inferQueryLanguage(q,d,hospitalLanguages(),appLang);}
function pavilionFor(p,lang){return formatPavilion(p,lang,HOSPITAL,PAV_LABELS);}
function bfs(a,b){return findRoute(GRAPH,a,b);}
function targetNode(d){return resolveTargetNode(d,HOSPITAL,GRAPH);}

function provenanceText(){return PROVENANCE_UI[appLang]||PROVENANCE_UI.en;}
function a11yText(){return ACCESSIBILITY_UI[appLang]||ACCESSIBILITY_UI.en;}
function templateText(value,vars={}){
  return Object.entries(vars).reduce((text,[key,replacement])=>text.replace("{"+key+"}",replacement),value||"");
}
function motionBehavior(){
  return window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth";
}
function outdoorText(lang=appLang){return OUTDOOR_UI[lang]||OUTDOOR_UI.en;}

function renderOutdoorMapLink(d){
  const link=$("openMap");if(!link)return;
  const url=d&&!targetNode(d)?outdoorMapUrl(d):null;
  link.hidden=!url;
  if(url){link.href=url;link.textContent="↗ "+outdoorText(appLang).open;}
  else link.removeAttribute("href");
}

function renderVisitorOutdoorMapLink(d,lang){
  const link=$("openVisitorMap");if(!link)return;
  const url=d&&!targetNode(d)?outdoorMapUrl(d):null;
  link.hidden=!url;
  if(url){link.href=url;link.textContent="↗ "+outdoorText(lang).open;}
  else link.removeAttribute("href");
}

function appendSourceLinks(container,links,destinationOnly=false){
  const t=provenanceText();
  links.forEach((link,index)=>{
    if(index)container.appendChild(document.createTextNode(" · "));
    const a=document.createElement("a");
    a.href=link.url;
    a.target="_blank";
    a.rel="noopener noreferrer";
    a.textContent=link.label||(destinationOnly?t.destinationSource:(link.kind==="destination"?t.destinationSource:link.url));
    container.appendChild(a);
  });
}

function renderDatasetProvenance(){
  const box=$("datasetMeta");if(!box)return;
  const t=provenanceText();
  box.innerHTML="";
  const audit=document.createElement("span");
  audit.className="dataset-audit";
  const formatted=formatAuditDate(HOSPITAL.lastSourceAudit,appLang);
  audit.textContent=t.auditLabel+": "+(formatted||HOSPITAL.lastSourceAudit||"—");
  box.appendChild(audit);
  const links=hospitalSourceLinks(HOSPITAL);
  if(links.length){
    const sources=document.createElement("span");
    sources.className="dataset-sources";
    const label=document.createElement("strong");
    label.textContent=t.sourcesLabel+": ";
    sources.appendChild(label);
    appendSourceLinks(sources,links);
    box.appendChild(sources);
  }
}

function renderRouteProvenance(d){
  const t=provenanceText();
  const verify=$("verifyAlert");
  const route=$("route");
  const isVerify=d&&d.status==="verify";
  route.classList.toggle("verify-active",isVerify);
  verify.hidden=!isVerify;
  verify.textContent=isVerify?"⚠ "+t.verifyAlert:"";

  const box=$("routeSources");
  const links=sourceLinks(d,HOSPITAL);
  box.hidden=!links.length;
  box.innerHTML="";
  if(links.length){
    const label=document.createElement("strong");
    label.textContent=t.sourcesLabel+": ";
    box.appendChild(label);
    links.forEach((link,index)=>{
      if(index)box.appendChild(document.createTextNode(" · "));
      const a=document.createElement("a");
      a.href=link.url;a.target="_blank";a.rel="noopener noreferrer";
      a.textContent=link.label||(link.kind==="destination"?t.destinationSource:link.url);
      box.appendChild(a);
    });
  }
}

function populateAppLanguages(){
 const sel=$("appLang");if(!sel)return;sel.innerHTML="";
 for(const lang of hospitalLanguages()){
   const o=document.createElement("option");o.value=lang;o.textContent=LANGUAGE_NAMES[lang]||lang;sel.appendChild(o);
 }
}
const $=id=>document.getElementById(id);
let selected=null;
let selectedQueryLang=null;
let appLang="en";
let pwaController=null;
let voiceController=null;
function pwaLabels(){return PWA_UI[appLang]||PWA_UI.en;}
function ensurePwa(){
  if(!pwaController)pwaController=initPwa({labels:pwaLabels});
  else pwaController.refreshLabels();
  return pwaController;
}
function voiceText(){return VOICE_UI[appLang]||VOICE_UI.en;}

function voiceErrorMessage(code){
  const t=voiceText();
  if(code==="not-allowed"||code==="service-not-allowed")return t.denied;
  if(code==="no-speech")return t.noSpeech;
  if(code==="audio-capture")return t.audio;
  if(code==="network")return t.network;
  return t.error;
}

function renderVoiceButton(state="idle"){
  const btn=$("voiceSearch");if(!btn||!voiceController||!voiceController.supported)return;
  const active=state==="starting"||state==="listening"||voiceController.isActive();
  btn.hidden=false;
  btn.setAttribute("aria-pressed",active?"true":"false");
  btn.textContent=active?"■ "+voiceText().stop:"🎙 "+voiceText().button;
}

function refreshVoiceUi(){
  const btn=$("voiceSearch"),privacy=$("voicePrivacy");
  if(!btn||!privacy)return;
  if(!voiceController||!voiceController.supported){
    btn.hidden=true;privacy.hidden=true;return;
  }
  privacy.hidden=false;
  privacy.textContent=voiceText().privacy;
  renderVoiceButton(voiceController.isActive()?"listening":"idle");
}

function initVoiceSearch(){
  const btn=$("voiceSearch"),status=$("voiceStatus");
  if(!btn||!status)return;
  voiceController=createVoiceSearch({
    getLanguage:()=>appLang,
    onState:state=>{
      renderVoiceButton(state);
      if(state==="starting"||state==="listening"){
        status.textContent=voiceText().listening;
        announce(voiceText().listening);
      }
    },
    onResult:transcript=>{
      $("q").value=transcript;
      search();
      const message=templateText(voiceText().recognized,{text:transcript});
      status.textContent=message;
      announce(message);
      $("q").focus();
    },
    onError:code=>{
      const message=voiceErrorMessage(code);
      status.textContent=message;
      announce(message);
    }
  });
  refreshVoiceUi();
  btn.onclick=()=>{
    if(!voiceController||!voiceController.supported)return;
    if(voiceController.isActive())voiceController.stop();
    else{
      status.textContent="";
      voiceController.start();
    }
  };
}

function showHospitalLanding(){
 document.documentElement.lang="fr";
 document.documentElement.dir="ltr";
 document.title="WayWey — Choisir un hôpital / Select a hospital";
 const meta=document.querySelector('meta[name="description"]');
 if(meta)meta.content="WayWey — choisissez un hôpital / select a hospital";
 document.body.innerHTML=`
 <a class="skip-link" href="#mainContent">Skip to main content / Aller au contenu principal</a>
 <div id="srStatus" class="sr-only" aria-live="polite" aria-atomic="true"></div>
 <header class="landing-header">
   <div class="landing-wrap">
     <div>
       <div class="landing-brand">WayWey</div>
       <div class="landing-kicker">Orientation hospitalière · Hospital wayfinding · v${APP_VERSION}</div>
     </div>
   </div>
 </header>
 <main id="mainContent" class="landing-wrap landing-main" tabindex="-1">
   <section class="landing-intro">
     <h1>Choisir un hôpital</h1>
     <p class="landing-en">Select a hospital</p>
     <p>Sélectionnez l’établissement où vous travaillez. / Select the hospital where you are working.</p>
   </section>
   <h2 class="region-heading">Canada · Montréal</h2>
   <section class="hospital-grid" aria-label="Hôpitaux disponibles à Montréal / Available hospitals in Montréal">
     <a class="hospital-card" href="./jgh/">
       <span class="hospital-code">HGJ · JGH</span>
       <strong>Hôpital général juif</strong>
       <span>Jewish General Hospital</span>
       ${strengthBadge(4,"Très forte","Very strong")}
       <small>Montréal</small>
     </a>
     <a class="hospital-card" href="./chum/">
       <span class="hospital-code">CHUM</span>
       <strong>Centre hospitalier de l’Université de Montréal</strong>
       <span>Centre hospitalier de l’Université de Montréal</span>
       ${strengthBadge(3,"Forte","Strong")}
       <small>Montréal</small>
     </a>
     <a class="hospital-card" href="./glen/">
       <span class="hospital-code">CUSM · MUHC</span>
       <strong>Site Glen</strong>
       <span>Glen site</span>
       ${strengthBadge(3,"Forte","Strong")}
       <small>Montréal</small>
     </a>
     <a class="hospital-card" href="./verdun/">
       <span class="hospital-code">VERDUN</span>
       <strong>Hôpital de Verdun</strong>
       <span>Verdun Hospital</span>
       ${strengthBadge(2,"En développement","Developing")}
       <small>Montréal</small>
     </a>
   </section>
   <h2 class="region-heading" dir="ltr">ישראל · Israel · إسرائيل</h2>
   <section class="hospital-grid" aria-label="Hospitals in Israel">
     <a class="hospital-card" href="./hadassah-ein-kerem/">
       <span class="hospital-code">HADASSAH · EIN KEREM</span>
       <strong dir="rtl">הדסה עין כרם</strong>
       <span>Hadassah Ein Kerem</span>
       <span dir="rtl">هداسا عين كارم</span>
       ${strengthBadge(3,"Élargi — validation des itinéraires requise","Expanded — route validation needed")}
       <small>ירושלים · Jerusalem · القدس</small>
     </a>
   </section>
   <div class="strength-legend">
     <span><strong>Force du jeu de données / Dataset strength</strong></span>
     <span>▮ = initial · ▮▮ = en développement · ▮▮▮ = forte · ▮▮▮▮ = très forte</span>
     <small>Indique la couverture, le niveau de vérification et la maturité du routage — pas une garantie absolue d’exactitude.</small>
   </div>
   <div class="landing-note">WayWey est actuellement un outil non officiel de soutien à l’orientation. / WayWey is currently an unofficial wayfinding support tool.</div>
 </main>`;
}
function storageKey(name){return "waywey."+(HOSPITAL.id||hospitalIdFromUrl())+"."+name}
function populateStations(){
 const sel=$("station");sel.innerHTML="";
 for(const s of (HOSPITAL.entrances||[])){
   const o=document.createElement("option");
   o.value=s.id;o.dataset.node=s.node||"";
   const labels=s.labels||{};
   for(const lang of [...new Set([...hospitalLanguages(),"en","fr","he","ar"])])if(labels[lang])o.dataset[lang]=labels[lang];
   if(!o.dataset.en)o.dataset.en=labels.en||labels.he||labels.ar||labels.fr||s.id;
   o.textContent=o.dataset[appLang]||o.dataset.en;
   sel.appendChild(o);
 }
}
function stationNode(){
 const o=$("station").selectedOptions[0];
 return o?(o.dataset.node||o.value):"";
}
function specialRouteSteps(start,target,lang){
 const key=start+">"+target;
 const r=HOSPITAL.specialRoutes&&HOSPITAL.specialRoutes[key];
 if(!r)return null;
 return r[lang]||r.en||null;
}
async function loadHospital(){
 const id=hospitalIdFromUrl(),base="./hospitals/"+id+"/";
 const [cfg,dest,routes,guide]=await Promise.all([
   fetchJson(base+"config.json"),
   fetchJson(base+"destinations.json"),
   fetchJson(base+"routes.json"),
   fetchJson(base+"guide.json")
 ]);
 HOSPITAL=cfg;DATA=dest;GRAPH=routes.graph||{};
 PAV_LABELS=routes.pavilionLabels||{en:{},fr:{}};
 NOTE_TRANSLATIONS=routes.noteTranslations||{};
 QUICK_GUIDE=guide||{};
 HOSPITAL.specialRoutes=routes.specialRoutes||{};
 populateAppLanguages();
 if(cfg.ui){
   for(const lang of Object.keys(cfg.ui)){
     if(APP_UI[lang]&&cfg.ui[lang]){
       APP_UI[lang]={...APP_UI[lang],...cfg.ui[lang]};
     }
   }
 }
 document.title=(cfg.pageTitle&&cfg.pageTitle[cfg.defaultAppLanguage||"en"])||"WayWey";
 const meta=document.querySelector('meta[name="description"]');
 if(meta&&cfg.description)meta.content=cfg.description[cfg.defaultAppLanguage||"en"]||cfg.description.en||"WayWey hospital wayfinding";
 populateStations();
}


function noteFor(d){
 if(d.notes&&d.notes[appLang])return d.notes[appLang];
 const direct=d["note"+appLang.charAt(0).toUpperCase()+appLang.slice(1)];
 if(direct)return direct;
 const translated=NOTE_TRANSLATIONS[appLang]&&NOTE_TRANSLATIONS[appLang][d.en];
 return translated||d.note||"";
}
function renderQuickGuide(){
 const g=QUICK_GUIDE[appLang]||QUICK_GUIDE.en;
 const langs=hospitalLanguages().filter(l=>QUICK_GUIDE[l]);
 $("guideDialog").dir=appIsRtl(appLang)?"rtl":"ltr";
 $("guideTitle").textContent=g.title;
 const nav=langs.length>1?'<div class="guide-lang-nav" aria-label="Guide language">'+langs.map(l=>'<button type="button" class="guide-lang-btn'+(l===appLang?' active':'')+'" data-guide-lang="'+l+'">'+(LANGUAGE_NAMES[l]||l)+'</button>').join("")+'</div>':"";
 $("guideContent").innerHTML=nav+g.html;
 [...$("guideContent").querySelectorAll("[data-guide-lang]")].forEach(b=>b.onclick=()=>setAppLanguage(b.dataset.guideLang));
 $("closeGuide").setAttribute("aria-label",(APP_UI[appLang]&&APP_UI[appLang].close)||"Close");
}
function openQuickGuide(){renderQuickGuide();openDialog($("guideDialog"),{initialFocus:".guide-lang-btn, #closeGuide"});}
function setAppLanguage(lang){
 if(voiceController&&voiceController.isActive())voiceController.stop();
 const allowed=hospitalLanguages();
 appLang=allowed.includes(lang)?lang:(HOSPITAL.defaultAppLanguage&&allowed.includes(HOSPITAL.defaultAppLanguage)?HOSPITAL.defaultAppLanguage:allowed[0]||"en");
 document.documentElement.lang=appLang;
 document.documentElement.dir=appIsRtl(appLang)?"rtl":"ltr";
 const t=APP_UI[appLang]||APP_UI.en;
 const a=a11yText();
 if($("skipLink"))$("skipLink").textContent=a.skip;
 if($("appLang"))$("appLang").setAttribute("aria-label",a.appLanguage);
 if($("visitorLangLabel"))$("visitorLangLabel").textContent=a.visitorLanguage;
 if($("results"))$("results").setAttribute("aria-label",a.searchResults);
 if($("qrCode"))$("qrCode").setAttribute("aria-label",a.qrCode);
 $("brandSubtitle").textContent=t.brand+" · "+DATA.length+" destinations · v"+APP_VERSION;$("quickGuideBtn").textContent=t.quickGuide;
 $("stationHeading").textContent=t.stationHeading;$("stationLabel").textContent=t.stationLabel;$("stationStatus").textContent=t.stationStatus;
 $("searchHeading").textContent=t.searchHeading;$("searchLabel").textContent=t.searchLabel;$("q").placeholder=t.placeholder;$("clear").textContent=t.clear;
 $("resultHeading").textContent=t.resultHeading;$("showVisitor").textContent=t.showVisitor;$("newSearch").textContent=t.newSearch;$("disclaimer").textContent=t.disclaimer;
 [...$("station").options].forEach(o=>o.textContent=o.dataset[appLang]||o.dataset.en||o.textContent);
 $("appLang").value=appLang;
 try{localStorage.setItem(storageKey("appLang"),appLang)}catch(e){}
 if($("q").value.trim())search();
 if(selected)choose(selected,false);
 if($("guideDialog").open)renderQuickGuide();
 renderDatasetProvenance();
 refreshVoiceUi();
 if(pwaController)pwaController.refreshLabels();
}

function displayWhere(d,lang=appLang){return [d.p?pavilionFor(d.p,lang):"",locationFor(d,lang)].filter(Boolean).join(" · ")}
function ambassadorSteps(d){
 const t=APP_UI[appLang]||APP_UI.en,start=stationNode(),target=targetNode(d),out=[],labels=PAV_LABELS[appLang]||PAV_LABELS.en||{};
 const noticeLang=selectedQueryLang||appLang;
 if(!target){
   if(d.loc)out.push(routeNoticeText("outsideMapped",noticeLang)+locationFor(d,noticeLang)+".");
   else out.push(routeNoticeText("unknownLocation",noticeLang));
   return out;
 }
 const path=bfs(start,target),special=specialRouteSteps(start,target,appLang);
 if(special&&special.length){out.push(...special);}
 else if(start===target){out.push(t.remain+" "+(labels[target]||pavilionFor(target,appLang))+".");}
 else if(path){out.push(t.indoor+" "+path.map(x=>labels[x]||pavilionFor(x,appLang)).join(" → ")+".");}
 else{out.push(routeNoticeText("noRoute",noticeLang));}
 if(d.loc)out.push(t.followDest+" "+locationFor(d,appLang)+".");
 else out.push(t.followDest+" "+destinationName(d,appLang)+".");
 return out;
}
function localizedSteps(d,lang){
 const t=I18N[lang]||I18N.en,start=stationNode(),target=targetNode(d),out=[];
 if(d.status==="verify"){
   const label=(APP_UI[lang]&&APP_UI[lang].verify)||APP_UI.en.verify;
   const message=(d.notes&&(d.notes[lang]||d.notes.en))||routeNoticeText("unknownLocation",lang);
   out.push(label+": "+message);
 }
 if(!target){
   if(d.loc)out.push(routeNoticeText("outsideMapped",lang)+locationFor(d,lang)+".");
   else out.push(routeNoticeText("unknownLocation",lang));
   return out;
 }
 const path=bfs(start,target),labels=PAV_LABELS[lang]||PAV_LABELS.en||{},special=specialRouteSteps(start,target,lang);
 if(special&&special.length){out.push(...special);}
 else if(start===target){out.push(t.stay+" "+(labels[target]||pavilionFor(target,lang))+".");}
 else if(path){out.push(t.follow+" "+path.map(x=>labels[x]||pavilionFor(x,lang)).join(" → ")+".");}
 else{out.push(routeNoticeText("noRoute",lang));}
 if(d.loc)out.push(t.final+" "+locationFor(d,lang)+"."); else out.push(t.final+" "+destinationName(d,lang)+".");
 return out;
}
function search(){
 const q=$("q").value.trim(),box=$("results");box.innerHTML="";
 const a=a11yText();
 if(!q){announce("");return;}
 const hits=rankResults(DATA,q,12);
 if(!hits.length){
   const empty=document.createElement("div");
   empty.className="status";
   empty.textContent=APP_UI[appLang].noMatch;
   box.appendChild(empty);
   announce(a.noResults);
   return;
 }
 announce(templateText(a.resultsFound,{count:String(hits.length)}));
 hits.forEach(([d])=>{
   const el=document.createElement("button");
   el.type="button";
   el.className="result"+(d.status==="verify"?" verify-result":"");
   const primary=destinationName(d,appLang),secondary=destinationSecondary(d,appLang);

   const title=document.createElement("strong");
   title.textContent=primary;
   el.appendChild(title);

   if(d.status==="verify"){
     const badge=document.createElement("span");
     badge.className="verify-badge";
     badge.textContent="⚠ "+((APP_UI[appLang]&&APP_UI[appLang].verify)||APP_UI.en.verify);
     el.appendChild(badge);
   }

   if(secondary){
     const alt=document.createElement("small");
     alt.textContent=secondary;
     el.appendChild(alt);
   }

   const where=document.createElement("div");
   where.className="where";
   where.textContent=displayWhere(d);
   el.appendChild(where);

   el.onclick=()=>choose(d,true,queryLanguage(q,d));
   box.appendChild(el);
 });
}
function choose(d,scroll=true,queryLang=null){
 selected=d;if(queryLang)selectedQueryLang=queryLang;const primary=destinationName(d,appLang),secondary=destinationSecondary(d,appLang);
 $("destName").textContent=primary+(secondary&&secondary!==primary?" / "+secondary:"");$("destWhere").textContent=displayWhere(d);
 $("pills").innerHTML=(d.p?"<span class='pill'>"+pavilionFor(d.p,appLang)+"</span>":"")+(d.loc?"<span class='pill'>"+d.loc+"</span>":"")+(d.status==="verify"?"<span class='pill verify-pill'>⚠ "+((APP_UI[appLang]&&APP_UI[appLang].verify)||APP_UI.en.verify)+"</span>":"");
 $("steps").innerHTML=ambassadorSteps(d).map(s=>"<li dir=\"auto\">"+s+"</li>").join("");
 const note=noteFor(d);$("note").style.display=note?"block":"none";$("note").textContent=note;
 renderRouteProvenance(d);
 renderOutdoorMapLink(d);
 $("route").classList.add("active");
 announce(templateText(a11yText().destinationSelected,{name:primary}));
 if(scroll)$("route").scrollIntoView({behavior:motionBehavior(),block:"start"});
}
function slugFor(d){return norm(d.en+" "+(d.loc||"")).replace(/ /g,"-")}
function makeVisitorUrl(){
 if(!selected)return window.location.href;
 const u=new URL(window.location.href);
 u.search="";u.hash="";
 u.searchParams.set("hospital",HOSPITAL.id||hospitalIdFromUrl());
 u.searchParams.set("visitor","1");
 u.searchParams.set("dest",slugFor(selected));
 u.searchParams.set("from",$("station").value);
 u.searchParams.set("lang",$("visitorLang").value);
 return u.toString();
}
function showVisitorQr(){
 if(!selected)return;
 const lang=$("visitorLang").value,qrt=QR_UI[lang]||QR_UI.en,url=makeVisitorUrl();
 $("qrTitle").textContent=qrt.title;
 $("qrInstruction").textContent=qrt.instruction;
 $("qrBack").textContent=qrt.back;
 $("qrDestination").textContent=destinationName(selected,lang)+" · "+displayWhere(selected,lang);
 $("qrCode").innerHTML="";
 try{new QRCode($("qrCode"),{text:url,width:250,height:250,correctLevel:QRCode.CorrectLevel.M});}
 catch(e){$("qrCode").textContent=url;}
 closeDialog($("visitorDialog"),{restoreFocus:false});
 openDialog($("qrDialog"),{initialFocus:"#closeQr"});
}
function closeVisitorQr(){
 closeDialog($("qrDialog"),{restoreFocus:false});
 try{openDialog($("visitorDialog"),{initialFocus:"#visitorLang",preserveReturnFocus:true});renderVisitor();}catch(e){}
}

async function shareVisitorDirections(){
 if(!selected)return;
 const lang=$("visitorLang").value;
 const title=destinationName(selected,lang)+" — WayWey";
 const url=makeVisitorUrl();
 try{
   if(navigator.share){await navigator.share({title:title,text:title,url:url});return;}
 }catch(e){if(e&&e.name==="AbortError")return;}
 try{
   await navigator.clipboard.writeText(url);
   const b=$("shareVisitor"),old=b.textContent;
   b.textContent="✓ Link copied / Lien copié";
   setTimeout(()=>b.textContent=old,1800);
 }catch(e){
   window.prompt("Copy this link / Copiez ce lien :",url);
 }
}
function showVisitor(){
 if(!selected)return;
 const preferred=HOSPITAL.defaultVisitorLanguage||HOSPITAL.defaultAppLanguage||"en";
 if([...$("visitorLang").options].some(o=>o.value===preferred))$("visitorLang").value=preferred;
 openDialog($("visitorDialog"),{initialFocus:"#visitorLang"});renderVisitor();
}
function renderVisitor(){
 const lang=$("visitorLang").value,t=I18N[lang]||I18N.en,p=$("visitorPanel");
 p.dir=(lang==="ar"||lang==="he")?"rtl":"ltr";
 $("vName").textContent=destinationName(selected,lang);
 $("vWhere").textContent=displayWhere(selected,lang);
 $("vSteps").innerHTML=localizedSteps(selected,lang).map(s=>"<li dir=\"auto\">"+s+"</li>").join("");
 const qrt=QR_UI[lang]||QR_UI.en;renderVisitorOutdoorMapLink(selected,lang);$("showQr").textContent="▦ "+qrt.button;$("listen").textContent="🔊 "+t.listen;$("back").textContent=t.back;
}
async function bootstrap(){
 const requestedHospital=hospitalIdFromUrl();
 if(!requestedHospital){
   showHospitalLanding();
   ensurePwa();
   return;
 }
 ensurePwa();
 try{
   await loadHospital();
 }catch(e){
   console.error(e);
   $("brandSubtitle").textContent="Unable to load hospital data";
   $("disclaimer").textContent="WayWey could not load this hospital dataset. Please reload or check the hospital link.";
   return;
 }

 ["guideDialog","visitorDialog","qrDialog"].forEach(id=>setupDialog($(id)));
 initVoiceSearch();
 $("appLang").onchange=()=>setAppLanguage($("appLang").value);
 $("quickGuideBtn").onclick=openQuickGuide;
 $("closeGuide").onclick=()=>closeDialog($("guideDialog"));
 $("q").addEventListener("input",search);
 $("clear").onclick=()=>{$("q").value="";$("results").innerHTML="";$("q").focus()};
 $("newSearch").onclick=()=>{$("q").value="";$("results").innerHTML="";$("route").classList.remove("active");selectedQueryLang=null;$("q").focus();window.scrollTo({top:0,behavior:motionBehavior()})};
 $("showVisitor").onclick=showVisitor;
 $("visitorLang").onchange=renderVisitor;
 $("showQr").onclick=showVisitorQr;
 $("shareVisitor").onclick=shareVisitorDirections;
 $("closeQr").onclick=closeVisitorQr;
 $("qrBack").onclick=closeVisitorQr;
 $("closeVisitor").onclick=()=>closeDialog($("visitorDialog"));
 $("back").onclick=()=>closeDialog($("visitorDialog"));
 $("listen").onclick=()=>{if(!selected||!("speechSynthesis" in window))return;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(localizedSteps(selected,$("visitorLang").value).join(" "));u.lang=$("visitorLang").value;u.rate=0.78;u.pitch=1;speechSynthesis.speak(u)};

 let saved=null,savedLang=null;
 try{saved=localStorage.getItem(storageKey("station"));savedLang=localStorage.getItem(storageKey("appLang"))}catch(e){}
 if(saved&&[...$("station").options].some(o=>o.value===saved)){
   $("station").value=saved;
 }else if(saved){
   const legacy=(HOSPITAL.entrances||[]).find(x=>x.node===saved);
   if(legacy)$("station").value=legacy.id;
 }
 const urlParams=new URLSearchParams(window.location.search);
 const requestedGuideLang=urlParams.get("guide");
 setAppLanguage(hospitalLanguages().includes(requestedGuideLang)?requestedGuideLang:(hospitalLanguages().includes(savedLang)?savedLang:(HOSPITAL.defaultAppLanguage||hospitalLanguages()[0]||"en")));
 $("station").onchange=()=>{try{localStorage.setItem(storageKey("station"),$("station").value)}catch(e){};if(selected)choose(selected,false)};
 if(requestedGuideLang&&QUICK_GUIDE[appLang])setTimeout(()=>{try{openQuickGuide()}catch(e){}},60);

 const p=urlParams;
 if(p.get("visitor")==="1"){
   const from=p.get("from"),lang=p.get("lang")||"en",dest=p.get("dest");
   if(from&&[...$("station").options].some(o=>o.value===from))$("station").value=from;
   if([...$("visitorLang").options].some(o=>o.value===lang))$("visitorLang").value=lang;
   const d=DATA.find(x=>slugFor(x)===dest||norm(x.en).replace(/ /g,"-")===dest);
   if(d){selected=d;setTimeout(()=>{try{openDialog($("visitorDialog"),{initialFocus:"#visitorLang"});renderVisitor()}catch(e){}},60);}
 }

 ensurePwa().cacheHospital(HOSPITAL.id||requestedHospital);
}
bootstrap();

