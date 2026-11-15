import {I18N,QR_UI,APP_UI,PWA_UI,PROVENANCE_UI,ACCESSIBILITY_UI,OUTDOOR_UI,LANGUAGE_NAMES,VISITOR_LINK_UI,routeNoticeText} from "./js/i18n.js";
import {rankResults,inferQueryLanguage} from "./js/search.js";
import {findRoute,resolveTargetNode,routeInstructions,floorAwareSteps} from "./js/routing.js";
import {destinationName,destinationSecondary as getDestinationSecondary,appIsRtl,locationFor,formatPavilion} from "./js/ui.js";
import {hospitalIdFromUrl,fetchJson} from "./js/data.js";
import {initPwa} from "./js/pwa.js";
import {formatAuditDate,sourceLinks,hospitalSourceLinks} from "./js/provenance.js";
import {setupDialog,openDialog,closeDialog,announce} from "./js/accessibility.js";
import {outdoorMapUrl} from "./js/outdoor-map.js";
import {visitorDestinationKey,resolveVisitorDestination} from "./js/visitor-links.js";
import {createVoicePlayback} from "./js/voice-playback.js";
import {PLAYBACK_UI} from "./js/i18n.js";

const APP_VERSION="1.1.2";
let HOSPITAL={};
let DATA=[];
let GRAPH={};
let PAV_LABELS={en:{},fr:{}};
let NOTE_TRANSLATIONS={};
let QUICK_GUIDE={};
let EDGE_INSTRUCTIONS={};
let STATION_DESTINATION_DIRECTIONS={};
let pendingVisitor=null;

function hospitalLanguages(){return (HOSPITAL.ambassadorLanguages&&HOSPITAL.ambassadorLanguages.length)?HOSPITAL.ambassadorLanguages:["en","fr"];}
function visitorLanguages(){return HOSPITAL.visitorLanguages||Object.keys(I18N);}
function defaultVisitorLanguage(){return visitorLanguages().includes(HOSPITAL.defaultVisitorLanguage)?HOSPITAL.defaultVisitorLanguage:visitorLanguages()[0];}
function populateVisitorLanguages(){
 const sel=$("visitorLang");sel.replaceChildren();
 for(const lang of visitorLanguages()){
  const option=document.createElement("option");option.value=lang;option.textContent=LANGUAGE_NAMES[lang]||lang;option.lang=lang;sel.appendChild(option);
 }
 sel.value=defaultVisitorLanguage();
}
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
const SIMPLE_UI={
 fr:{prompt:"Où allez-vous?",example:"Service, département ou numéro de salle",change:"Changer",from:"Départ : ",show:"Montrer les indications au visiteur",sources:"Sources et informations",routeSources:"Sources du parcours"},
 en:{prompt:"Where to?",example:"Department, service or room number",change:"Change",from:"From: ",show:"Show Visitor Directions",sources:"Sources and information",routeSources:"Route sources"},
 he:{prompt:"לאן?",example:"מחלקה, שירות או מספר חדר",change:"שינוי",show:"הצגת הוראות למבקר",sources:"מקורות ומידע",routeSources:"מקורות המסלול"},
 ar:{prompt:"إلى أين؟",example:"القسم أو الخدمة أو رقم الغرفة",change:"تغيير",show:"عرض الإرشادات للزائر",sources:"المصادر والمعلومات",routeSources:"مصادر المسار"}
};
const SHARE_LABELS={en:["Share","Link copied","Copy this link"],fr:["Partager","Lien copié","Copiez ce lien"],he:["שיתוף","הקישור הועתק","העתיקו את הקישור"],ar:["مشاركة","تم نسخ الرابط","انسخ هذا الرابط"],es:["Compartir","Enlace copiado","Copie este enlace"],pt:["Compartilhar","Link copiado","Copie este link"],ru:["Поделиться","Ссылка скопирована","Скопируйте ссылку"],vi:["Chia sẻ","Đã sao chép liên kết","Sao chép liên kết này"],fa:["اشتراک‌گذاری","پیوند کپی شد","این پیوند را کپی کنید"],bg:["Споделяне","Връзката е копирана","Копирайте тази връзка"]};
const LISTEN_LABELS={en:"Listen to Directions",fr:"Écouter les indications",ar:"استمع إلى الإرشادات",fa:"گوش دادن به راهنما",he:"האזנה להוראות",es:"Escuchar las indicaciones",pt:"Ouvir as instruções",ru:"Прослушать указания",vi:"Nghe chỉ đường",bg:"Чуйте указанията"};
const $=id=>document.getElementById(id);
function refreshStationSummary(){
 const simple=SIMPLE_UI[appLang]||SIMPLE_UI.en;
 const fullLabel=$("station").selectedOptions[0]?.textContent||"";
 const shortLabel=fullLabel.replace(/\s+[—–-]\s+(?=\d{1,6}\b).*$/u,"").trim();
 $("stationSummary").textContent=shortLabel||fullLabel;
 $("stationDetails").querySelector("summary").setAttribute("aria-label",(simple.change||"Change")+" — "+$("stationSummary").textContent);
}
let selected=null;
let selectedQueryLang=null;
let appLang="en";
let pwaController=null;
let playbackController=null;
let visitorLanguageChosen=false;
function refreshPlaybackUi(){
 const lang=$("visitorLang").value,t=PLAYBACK_UI[lang]||PLAYBACK_UI.en;
 const active=playbackController&&playbackController.isActive();
 $("listen").textContent=active?"■ "+t.stop:"🔊 "+(LISTEN_LABELS[lang]||(I18N[lang]||I18N.en).listen);
 $("listen").setAttribute("aria-pressed",active?"true":"false");
}
function stopPlayback(){
 playbackController?.stop();
 $("playbackStatus").textContent="";
 refreshPlaybackUi();
}
function initVoicePlayback(){
 playbackController=createVoicePlayback({
   scope:window,
   onState:refreshPlaybackUi,
   onError:(code,details)=>{
     const lang=$("visitorLang").value;
     $("playbackStatus").textContent=(PLAYBACK_UI[lang]||PLAYBACK_UI.en).unavailable;
     // Local troubleshooting only: never log route text, destination or patient data.
     console.warn("WayWey speech unavailable",details||{reason:code,language:lang});
   }
 });
 $("visitorDialog").addEventListener("close",stopPlayback);
 $("visitorDialog").addEventListener("cancel",stopPlayback);
 window.addEventListener("pagehide",()=>{stopPlayback();});
 document.addEventListener("visibilitychange",()=>{if(document.hidden)stopPlayback();});
}
function pwaLabels(){return PWA_UI[appLang]||PWA_UI.en;}
function ensurePwa(){
  if(!pwaController)pwaController=initPwa({labels:pwaLabels});
  else pwaController.refreshLabels();
  return pwaController;
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
 const node=o?(o.dataset.node||o.value):"";
 return Object.hasOwn(HOSPITAL.nodeAliases||{},node)?HOSPITAL.nodeAliases[node]:node;
}
function stationDestinationSteps(d,lang){
 const key=$("station").value+">"+d.id;
 const route=STATION_DESTINATION_DIRECTIONS[key];
 return route?.[lang]||null;
}
function specialRouteSteps(start,target,lang){
 const key=start+">"+target;
 const r=HOSPITAL.specialRoutes&&HOSPITAL.specialRoutes[key];
 if(!r)return null;
 return r[lang]||null;
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
 HOSPITAL.floorRouting=routes.floorRouting;
 EDGE_INSTRUCTIONS=routes.edgeInstructions||{};
 STATION_DESTINATION_DIRECTIONS=routes.stationDestinationDirections||{};
 populateAppLanguages();
 populateVisitorLanguages();
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
 stopPlayback();
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
 $("brandSubtitle").textContent=(HOSPITAL.name?.[appLang]||HOSPITAL.name?.en||HOSPITAL.id||"WayWey");$("releaseVersion").textContent="WayWey "+APP_VERSION;$("quickGuideBtn").setAttribute("aria-label",t.quickGuide);$("quickGuideBtn").setAttribute("title",t.quickGuide);
 $("stationHeading").textContent=t.stationHeading;$("stationLabel").textContent=t.stationLabel;$("stationStatus").textContent=t.stationStatus;
 $("searchHeading").textContent=t.searchHeading;$("searchLabel").textContent=t.searchLabel;$("q").placeholder=t.placeholder;
 $("resultHeading").textContent=t.resultHeading;$("showVisitor").textContent=t.showVisitor;$("newSearch").textContent=t.newSearch;$("disclaimer").textContent=t.disclaimer;
 [...$("station").options].forEach(o=>o.textContent=o.dataset[appLang]||o.dataset.en||o.textContent);
 const simple=SIMPLE_UI[appLang]||SIMPLE_UI.en;
 if(SIMPLE_UI[appLang]){
   $("searchHeading").textContent=simple.prompt;$("searchLabel").textContent=simple.prompt;
   $("q").placeholder=simple.example;$("showVisitor").textContent=simple.show;
 }
 $("stationHeading").textContent=t.stationLabel;$("resultHeading").textContent=t.resultHeading.replace(/^\d+\.\s*/,"");
 $("informationLabel").textContent=simple.sources;$("routeSourceLabel").textContent=simple.routeSources;
 const compact=allowed.length<=3;
 $("appLang").hidden=compact;$("languageToggle").hidden=!compact;
 $("languageToggle").setAttribute("aria-label",a.appLanguage);
 if([...$("languageToggle").querySelectorAll("[data-app-lang]")].map(b=>b.dataset.appLang).join(",")!==allowed.join(",")){
 $("languageToggle").replaceChildren();
 for(const code of allowed){
  const button=document.createElement("button");button.type="button";button.dataset.appLang=code;button.lang=code;
  button.textContent=code.toUpperCase();button.title=LANGUAGE_NAMES[code]||code;
  button.setAttribute("aria-pressed",String(code===appLang));button.onclick=()=>setAppLanguage(code);$("languageToggle").appendChild(button);
 }
 }
 for(const button of $("languageToggle").querySelectorAll("[data-app-lang]"))button.setAttribute("aria-pressed",String(button.dataset.appLang===appLang));
 refreshStationSummary();
 $("appLang").value=appLang;
 try{sessionStorage.setItem(storageKey("appLang"),appLang)}catch(e){}
 try{localStorage.setItem(storageKey("appLang"),appLang)}catch(e){}
 if($("q").value.trim())search();
 if(selected)choose(selected,false);
 if($("guideDialog").open)renderQuickGuide();
 renderDatasetProvenance();
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
 if(HOSPITAL.floorRouting){
   const entrance=HOSPITAL.entrances.find(e=>e.id===$("station").value);
   const plan=floorAwareSteps({path:bfs(start,target),entrance,destination:d,policy:HOSPITAL.floorRouting,specialRoutes:HOSPITAL.specialRoutes,edgeInstructions:EDGE_INSTRUCTIONS,lang:appLang});
   if(plan){
     const verified=stationDestinationSteps(d,appLang);
     return [...out,...plan,...(verified||[(I18N[appLang]||I18N.en).final+" "+(d.loc?locationFor(d,appLang):destinationName(d,appLang))+"."])];
   }
 }
 const verified=stationDestinationSteps(d,appLang);
 if(verified)return [...out,...verified];
 const path=bfs(start,target),special=specialRouteSteps(start,target,appLang);
 const detailed=routeInstructions(path,EDGE_INSTRUCTIONS,appLang);
 if(special&&special.length){out.push(...special);}
 else if(detailed){out.push(...detailed);}
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
 if(HOSPITAL.floorRouting){
   const entrance=HOSPITAL.entrances.find(e=>e.id===$("station").value);
   const plan=floorAwareSteps({path:bfs(start,target),entrance,destination:d,policy:HOSPITAL.floorRouting,specialRoutes:HOSPITAL.specialRoutes,edgeInstructions:EDGE_INSTRUCTIONS,lang:lang});
   if(plan){
     const verified=stationDestinationSteps(d,lang);
     return [...out,...plan,...(verified||[(I18N[lang]||I18N.en).final+" "+(d.loc?locationFor(d,lang):destinationName(d,lang))+"."])];
   }
 }
 const verified=stationDestinationSteps(d,lang);
 if(verified)return [...out,...verified];
 const path=bfs(start,target),labels=PAV_LABELS[lang]||PAV_LABELS.en||{},special=specialRouteSteps(start,target,lang);
 const detailed=routeInstructions(path,EDGE_INSTRUCTIONS,lang);
 if(special&&special.length){out.push(...special);}
 else if(detailed){out.push(...detailed);}
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
function renderSteps(id,steps){
 const items=steps.map(text=>{const li=document.createElement("li");li.dir="auto";li.textContent=text;return li;});
 $(id).replaceChildren(...items);
}
function choose(d,scroll=true,queryLang=null){
 stopPlayback();
 pendingVisitor=null;$("visitorLinkNotice").hidden=true;selected=d;if(queryLang)selectedQueryLang=queryLang;const primary=destinationName(d,appLang),secondary=destinationSecondary(d,appLang);
 $("destName").textContent=primary;$("destWhere").textContent=displayWhere(d);
 $("pills").replaceChildren();
 for(const [text,verify] of [[d.p&&pavilionFor(d.p,appLang),false],[d.loc,false],[d.status==="verify"&&"⚠ "+((APP_UI[appLang]&&APP_UI[appLang].verify)||APP_UI.en.verify),true]]){
   if(!text)continue;
   const pill=document.createElement("span");pill.className="pill"+(verify?" verify-pill":"");pill.textContent=text;$("pills").append(pill);
 }
 renderSteps("steps",ambassadorSteps(d));
 const note=noteFor(d);$("note").style.display=note?"block":"none";$("note").textContent=note;
 renderRouteProvenance(d);
 renderOutdoorMapLink(d);
 $("route").classList.add("active");
 announce(templateText(a11yText().destinationSelected,{name:primary}));
 if(scroll)$("route").scrollIntoView({behavior:motionBehavior(),block:"start"});
}
function makeVisitorUrl(){
 if(!selected)return window.location.href;
 const u=new URL(window.location.href);
 u.search="";u.hash="";
 u.searchParams.set("hospital",HOSPITAL.id||hospitalIdFromUrl());
 u.searchParams.set("visitor","1");
 u.searchParams.set("dest",visitorDestinationKey(selected));
 u.searchParams.set("from",$("station").value);
 u.searchParams.set("lang",$("visitorLang").value);
 return u.toString();
}
function showVisitorQr(){
 if(!selected)return;
 const lang=$("visitorLang").value,qrt=QR_UI[lang]||QR_UI.en,url=makeVisitorUrl();
 $("qrDialog").lang=lang;$("qrDialog").dir=appIsRtl(lang)?"rtl":"ltr";
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
   b.textContent="✓ "+(SHARE_LABELS[lang]||SHARE_LABELS.en)[1];
   setTimeout(()=>b.textContent=old,1800);
 }catch(e){
   window.prompt((SHARE_LABELS[lang]||SHARE_LABELS.en)[2]+" :",url);
 }
}
function showVisitor(){
 if(!selected)return;
 if(!visitorLanguageChosen){
   const preferred=defaultVisitorLanguage();
   if([...$("visitorLang").options].some(o=>o.value===preferred))$("visitorLang").value=preferred;
   visitorLanguageChosen=true;
 }
 openDialog($("visitorDialog"),{initialFocus:"#visitorLang"});renderVisitor();
}
function renderVisitor(){
 stopPlayback();
 const lang=$("visitorLang").value,t=I18N[lang]||I18N.en,p=$("visitorPanel");
 p.lang=lang;
 $("visitorLangLabel").textContent=(ACCESSIBILITY_UI[lang]||ACCESSIBILITY_UI.en).visitorLanguage;
 $("closeVisitor").setAttribute("aria-label",(APP_UI[lang]||APP_UI.en).close);
 $("shareVisitor").textContent="↗ "+(SHARE_LABELS[lang]||SHARE_LABELS.en)[0];
 p.dir=appIsRtl(lang)?"rtl":"ltr";
 $("vName").textContent=destinationName(selected,lang);
 $("vWhere").textContent=displayWhere(selected,lang);
 renderSteps("vSteps",localizedSteps(selected,lang));
 const provenance=PROVENANCE_UI[lang]||PROVENANCE_UI.en;
 $("visitorVerify").hidden=selected.status!=="verify";
 $("visitorVerify").textContent=selected.status==="verify"?"⚠ "+provenance.verifyAlert:"";
 $("visitorSourceLabel").textContent=provenance.sourcesLabel;
 $("visitorSources").replaceChildren(...[...$("routeSources").childNodes].map(node=>node.cloneNode(true)));
 $("visitorSourceDetails").hidden=$("routeSources").hidden;
 const qrt=QR_UI[lang]||QR_UI.en;renderVisitorOutdoorMapLink(selected,lang);$("showQr").textContent="▦ "+qrt.button;$("listen").textContent="🔊 "+(LISTEN_LABELS[lang]||t.listen);$("back").textContent=t.back;
}
function renderVisitorLinkNotice(kind,lang){
 const t=VISITOR_LINK_UI[lang]||VISITOR_LINK_UI.en;
 const box=$("visitorLinkNotice");box.hidden=false;box.lang=VISITOR_LINK_UI[lang]?lang:"en";box.dir=appIsRtl(box.lang)?"rtl":"ltr";
 $("visitorLinkMessage").textContent=t[kind];
 const button=$("recoverVisitor");button.textContent=t.open;button.hidden=kind!=="station";button.disabled=true;
 if(kind==="station"){
   const option=document.createElement("option");option.value="";option.disabled=true;option.textContent=t.choose;
   $("station").prepend(option);$("station").value="";$("showVisitor").disabled=true;
   $("stationDetails").open=true;$("station").focus();
 }
}
function openLinkedVisitor(d){
 choose(d,false);
 openDialog($("visitorDialog"),{initialFocus:"#visitorLang"});renderVisitor();
}

async function bootstrap(){
 const requestedHospital=hospitalIdFromUrl();
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
 initVoicePlayback();
 for(const button of document.querySelectorAll("[data-app-lang]"))button.onclick=()=>setAppLanguage(button.dataset.appLang);
 $("appLang").onchange=()=>setAppLanguage($("appLang").value);
 $("quickGuideBtn").onclick=openQuickGuide;
 $("closeGuide").onclick=()=>closeDialog($("guideDialog"));
 $("q").addEventListener("input",search);
 $("newSearch").onclick=()=>{$("q").value="";$("results").innerHTML="";$("route").classList.remove("active");selected=null;selectedQueryLang=null;$("q").focus();window.scrollTo({top:0,behavior:motionBehavior()})};
 $("showVisitor").onclick=showVisitor;
 $("visitorLang").onchange=()=>{visitorLanguageChosen=true;try{sessionStorage.setItem(storageKey("visitorLang"),$("visitorLang").value);localStorage.setItem(storageKey("visitorLang"),$("visitorLang").value)}catch(e){};renderVisitor();};
 $("showQr").onclick=showVisitorQr;
 $("shareVisitor").onclick=shareVisitorDirections;
 $("closeQr").onclick=closeVisitorQr;
 $("qrBack").onclick=closeVisitorQr;
 $("closeVisitor").onclick=()=>closeDialog($("visitorDialog"));
 $("back").onclick=()=>closeDialog($("visitorDialog"));
 $("listen").onclick=()=>{
   if(!selected)return;
   if(playbackController.isActive()){stopPlayback();return;}
     $("playbackStatus").textContent="";
   playbackController.speak(localizedSteps(selected,$("visitorLang").value).join(" "),$("visitorLang").value);
 };

 let saved=null;
 try{saved=localStorage.getItem(storageKey("station"))}catch(e){}
 if(saved&&[...$("station").options].some(o=>o.value===saved)){
   $("station").value=saved;
 }else if(saved){
   const legacy=(HOSPITAL.entrances||[]).find(x=>x.node===saved);
   if(legacy)$("station").value=legacy.id;
 }
 const urlParams=new URLSearchParams(window.location.search);
 const requestedGuideLang=urlParams.get("guide");
 // Keep each shift's interface choice; a fresh session starts in French at JGH.
 let savedAppLang=null,savedVisitorLang=null;
 try{savedAppLang=sessionStorage.getItem(storageKey("appLang"));savedVisitorLang=sessionStorage.getItem(storageKey("visitorLang"))}catch(e){}
 try{savedAppLang=localStorage.getItem(storageKey("appLang"))||savedAppLang;savedVisitorLang=localStorage.getItem(storageKey("visitorLang"))||savedVisitorLang}catch(e){}
 setAppLanguage(hospitalLanguages().includes(requestedGuideLang)?requestedGuideLang:(hospitalLanguages().includes(savedAppLang)?savedAppLang:(HOSPITAL.defaultAppLanguage||hospitalLanguages()[0]||"en")));
 if([...$("visitorLang").options].some(o=>o.value===savedVisitorLang)){
   $("visitorLang").value=savedVisitorLang;visitorLanguageChosen=true;
 }
 $("station").onchange=()=>{refreshStationSummary();$("stationDetails").open=false;try{localStorage.setItem(storageKey("station"),$("station").value)}catch(e){};$("showVisitor").disabled=!$("station").value;if(selected)choose(selected,false);if(pendingVisitor)$("recoverVisitor").disabled=!$("station").value};
 $("recoverVisitor").onclick=()=>{if(pendingVisitor&&$("station").value)openLinkedVisitor(pendingVisitor)};
 if(requestedGuideLang&&QUICK_GUIDE[appLang])setTimeout(()=>{try{openQuickGuide()}catch(e){}},60);

 const p=urlParams;
 if(p.get("visitor")==="1"){
   const from=p.get("from"),lang=p.get("lang")||defaultVisitorLanguage(),dest=p.get("dest");
   if([...$("visitorLang").options].some(o=>o.value===lang)){
     $("visitorLang").value=lang;visitorLanguageChosen=true;
   }
   const d=resolveVisitorDestination(DATA,dest);
   const validFrom=from&&[...$("station").options].some(o=>o.value===from);
   if(!d)renderVisitorLinkNotice("missing",$("visitorLang").value);
   else if(!validFrom){pendingVisitor=d;renderVisitorLinkNotice("station",$("visitorLang").value);}
   else{$("station").value=from;refreshStationSummary();openLinkedVisitor(d);}
 }

 ensurePwa().cacheHospital(HOSPITAL.id||requestedHospital);
}
bootstrap();

