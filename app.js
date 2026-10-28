const APP_VERSION="0.1.0";
let HOSPITAL={};
let DATA=[];
let GRAPH={};
let PAV_LABELS={en:{},fr:{}};
let NOTE_TRANSLATIONS={};
let QUICK_GUIDE={};

const I18N={
en:{to:"Go to",room:"Room",floor:"Floor",from:"From",stay:"Stay in",elev:"Use the elevators to reach",follow:"Follow the indoor signs through",hk1:"Take the Pavilion H elevators to the 3rd floor.",hk2:"Use the indoor H–K connector to the Pavilion K lobby.",kh1:"From the Pavilion K lobby, use the indoor H–K connector to Pavilion H, 3rd floor.",final:"Then follow signs to",listen:"Listen",back:"Back to Ambassador"},
fr:{to:"Rendez-vous à",room:"Salle",floor:"Étage",from:"À partir de",stay:"Restez dans",elev:"Prenez les ascenseurs jusqu'à",follow:"Suivez les indications intérieures en passant par",hk1:"Prenez les ascenseurs du pavillon H jusqu'au 3e étage.",hk2:"Empruntez le passage intérieur H–K jusqu'au hall du pavillon K.",kh1:"Depuis le hall du pavillon K, empruntez le passage intérieur H–K jusqu'au pavillon H, 3e étage.",final:"Suivez ensuite les indications vers",listen:"Écouter",back:"Retour à l'ambassadeur"},
es:{to:"Vaya a",room:"Sala",floor:"Piso",from:"Desde",stay:"Permanezca en",elev:"Use los ascensores para llegar a",follow:"Siga las señales interiores pasando por",hk1:"Tome los ascensores del Pabellón H hasta el 3.er piso.",hk2:"Use el pasillo interior H–K hasta el vestíbulo del Pabellón K.",kh1:"Desde el vestíbulo del Pabellón K, use el pasillo interior H–K hasta el Pabellón H, 3.er piso.",final:"Luego siga las señales hacia",listen:"Escuchar",back:"Volver al embajador"},
pt:{to:"Vá para",room:"Sala",floor:"Andar",from:"A partir de",stay:"Permaneça no",elev:"Use os elevadores para chegar ao",follow:"Siga as placas internas passando por",hk1:"Pegue os elevadores do Pavilhão H até o 3º andar.",hk2:"Use a passagem interna H–K até o saguão do Pavilhão K.",kh1:"Do saguão do Pavilhão K, use a passagem interna H–K até o Pavilhão H, 3º andar.",final:"Depois, siga as placas para",listen:"Ouvir",back:"Voltar ao embaixador"},
ar:{to:"اذهب إلى",room:"الغرفة",floor:"الطابق",from:"من",stay:"ابقَ في",elev:"استخدم المصاعد للوصول إلى",follow:"اتبع اللافتات الداخلية مروراً بـ",hk1:"استخدم مصاعد الجناح H إلى الطابق الثالث.",hk2:"استخدم الممر الداخلي H–K للوصول إلى بهو الجناح K.",kh1:"من بهو الجناح K، استخدم الممر الداخلي H–K إلى الجناح H، الطابق الثالث.",final:"ثم اتبع اللافتات إلى",listen:"استمع",back:"العودة إلى السفير"},
he:{to:"גשו אל",room:"חדר",floor:"קומה",from:"מ־",stay:"הישארו ב",elev:"השתמשו במעליות כדי להגיע אל",follow:"עקבו אחר השילוט הפנימי דרך",hk1:"עלו במעליות של בניין H לקומה 3.",hk2:"השתמשו במעבר הפנימי H–K אל הלובי של בניין K.",kh1:"מהלובי של בניין K השתמשו במעבר הפנימי H–K אל בניין H, קומה 3.",final:"לאחר מכן עקבו אחר השילוט אל",listen:"האזנה",back:"חזרה לשגריר"},
ru:{to:"Идите в",room:"Кабинет",floor:"Этаж",from:"От",stay:"Оставайтесь в",elev:"Поднимитесь на лифте на",follow:"Следуйте указателям внутри здания через",hk1:"Поднимитесь на лифте павильона H на 3-й этаж.",hk2:"По внутреннему переходу H–K пройдите в вестибюль павильона K.",kh1:"Из вестибюля павильона K по переходу H–K пройдите в павильон H, на 3-й этаж.",final:"Затем следуйте указателям к",listen:"Прослушать",back:"Назад к волонтёру"},
vi:{to:"Đi đến",room:"Phòng",floor:"Tầng",from:"Từ",stay:"Ở lại",elev:"Dùng thang máy để đến",follow:"Đi theo biển chỉ dẫn bên trong qua",hk1:"Đi thang máy của Khu H lên tầng 3.",hk2:"Dùng lối nối trong nhà H–K để đến sảnh Khu K.",kh1:"Từ sảnh Khu K, dùng lối nối trong nhà H–K đến Khu H, tầng 3.",final:"Sau đó đi theo biển chỉ dẫn đến",listen:"Nghe",back:"Quay lại tình nguyện viên"},
sw:{to:"Nenda",room:"Chumba",floor:"Ghorofa",from:"Kutoka",stay:"Baki katika",elev:"Tumia lifti kufika",follow:"Fuata alama za ndani kupitia",hk1:"Tumia lifti za Jengo H hadi ghorofa ya 3.",hk2:"Tumia njia ya ndani ya H–K hadi ukumbi wa Jengo K.",kh1:"Kutoka ukumbi wa Jengo K, tumia njia ya ndani ya H–K hadi Jengo H, ghorofa ya 3.",final:"Kisha fuata alama kuelekea",listen:"Sikiliza",back:"Rudi kwa balozi"},
bg:{to:"Отидете до",room:"Стая",floor:"Етаж",from:"От",stay:"Останете в",elev:"Използвайте асансьора до",follow:"Следвайте вътрешните указателни табели през",hk1:"Вземете асансьора в павилион H до 3-тия етаж.",hk2:"Използвайте вътрешната връзка H–K до фоайето на павилион K.",kh1:"От фоайето на павилион K използвайте връзката H–K до павилион H, 3-ти етаж.",final:"След това следвайте табелите към",listen:"Слушай",back:"Назад към посланика"}
};

const QR_UI={
en:{button:"Show QR",title:"Scan for directions",instruction:"Scan this QR code with your phone to open these directions.",back:"Back to directions"},
fr:{button:"Afficher le QR",title:"Scanner pour obtenir les directions",instruction:"Scannez ce code QR avec votre téléphone pour ouvrir ces directions.",back:"Retour aux directions"},
ar:{button:"إظهار رمز QR",title:"امسح للحصول على الاتجاهات",instruction:"امسح رمز QR هذا بهاتفك لفتح هذه الاتجاهات.",back:"العودة إلى الاتجاهات"},
he:{button:"הצג קוד QR",title:"סרקו לקבלת הוראות",instruction:"סרקו את קוד ה-QR בטלפון כדי לפתוח את ההוראות.",back:"חזרה להוראות"},
es:{button:"Mostrar QR",title:"Escanee para ver las indicaciones",instruction:"Escanee este código QR con su teléfono para abrir estas indicaciones.",back:"Volver a las indicaciones"},
pt:{button:"Mostrar QR",title:"Escaneie para ver as direções",instruction:"Escaneie este código QR com o seu telefone para abrir estas direções.",back:"Voltar às direções"},
ru:{button:"Показать QR",title:"Сканируйте для маршрута",instruction:"Отсканируйте этот QR-код телефоном, чтобы открыть эти указания.",back:"Назад к указаниям"},
vi:{button:"Hiện mã QR",title:"Quét để xem chỉ đường",instruction:"Quét mã QR này bằng điện thoại để mở các chỉ dẫn này.",back:"Quay lại chỉ dẫn"},
sw:{button:"Onyesha QR",title:"Changanua kupata maelekezo",instruction:"Changanua msimbo huu wa QR kwa simu yako ili kufungua maelekezo haya.",back:"Rudi kwenye maelekezo"},
bg:{button:"Покажи QR",title:"Сканирайте за указания",instruction:"Сканирайте този QR код с телефона си, за да отворите указанията.",back:"Назад към указанията"}
};

const APP_UI={
en:{
 brand:"Ambassador Wayfinding Tool · Unofficial",quickGuide:"Quick Guide",
 stationHeading:"1. Your ambassador station",stationLabel:"Starting point",stationStatus:"Your selection is remembered on this device.",
 searchHeading:"2. Search for a department or service",searchLabel:"English or French",placeholder:"e.g. urology, cancer, dentiste, MRI, accouchement",clear:"Clear",
 resultHeading:"3. Check the result",showVisitor:"Show Visitor",newSearch:"New Search",
 noMatch:"No match found. Try a shorter term, French/English equivalent, or room number.",
 disclaimer:"Prototype reference for ambassadors. Verify appointment paperwork or current hospital signage when an exact room is uncertain.",
 pavilion:"Pavilion",remain:"Remain in",appropriate:"Use the appropriate elevator or level access for",followRoom:"Follow signs to room",followDest:"Follow signs to",
 indoor:"Follow the indoor signs:",outsideMapped:"Destination is outside the mapped indoor route. Address / location: ",unknownLocation:"The current source does not state an exact location. Check appointment paperwork or signage.",noRoute:"WayWey does not yet have a validated public indoor route between this starting point and destination. Follow current hospital signage.",verify:"Verify",close:"Close",hToK1:"Take the Pavilion H elevators to the 3rd floor.",hToK2:"Use the indoor H–K connector to the Pavilion K lobby.",kToH:"From the Pavilion K lobby, use the indoor H–K connector to Pavilion H, 3rd floor."
},
fr:{
 brand:"Outil d’orientation des ambassadeurs · Non officiel",quickGuide:"Guide rapide",
 stationHeading:"1. Votre poste d’ambassadeur",stationLabel:"Point de départ",stationStatus:"Votre sélection est mémorisée sur cet appareil.",
 searchHeading:"2. Rechercher un service ou un département",searchLabel:"Anglais ou français",placeholder:"p. ex. urologie, cancer, dentiste, IRM, accouchement",clear:"Effacer",
 resultHeading:"3. Vérifier le résultat",showVisitor:"Montrer au visiteur",newSearch:"Nouvelle recherche",
 noMatch:"Aucun résultat. Essayez un terme plus court, l’équivalent français/anglais ou un numéro de local.",
 disclaimer:"Outil de référence prototype pour les ambassadeurs. Vérifiez les documents de rendez-vous ou la signalisation actuelle de l’hôpital lorsqu’un local précis est incertain.",
 pavilion:"Pavillon",remain:"Restez dans",appropriate:"Utilisez l’ascenseur ou l’accès de niveau approprié pour",followRoom:"Suivez les indications jusqu’au local",followDest:"Suivez les indications vers",
 indoor:"Suivez les indications intérieures :",outsideMapped:"Destination hors du parcours intérieur cartographié. Adresse / emplacement : ",unknownLocation:"Le site exact n’est pas indiqué dans la source actuelle. Vérifiez les documents du rendez-vous ou la signalisation.",noRoute:"Aucun itinéraire intérieur public n’est encore validé dans WayWey entre ce point de départ et cette destination. Suivez la signalisation actuelle de l’hôpital.",verify:"À vérifier",close:"Fermer",
 hToK1:"Prenez les ascenseurs du pavillon H jusqu’au 3e étage.",hToK2:"Empruntez le passage intérieur H–K jusqu’au hall du pavillon K.",kToH:"Depuis le hall du pavillon K, empruntez le passage intérieur H–K jusqu’au pavillon H, 3e étage."
},
he:{
 brand:"כלי הכוונה לשגרירי בית החולים · לא רשמי",quickGuide:"מדריך מהיר",
 stationHeading:"1. עמדת השגריר שלך",stationLabel:"נקודת התחלה",stationStatus:"הבחירה נשמרת במכשיר זה.",
 searchHeading:"2. חיפוש מחלקה או שירות",searchLabel:"עברית, אנגלית או ערבית",placeholder:"לדוגמה: מיון, לב, MRI, ילדים, אונקולוגיה",clear:"ניקוי",
 resultHeading:"3. בדיקת התוצאה",showVisitor:"הצג למבקר",newSearch:"חיפוש חדש",
 noMatch:"לא נמצאה התאמה. נסו מונח קצר יותר, שפה אחרת או מספר חדר.",
 disclaimer:"כלי אב-טיפוס לשגרירי בית החולים. כאשר מיקום מדויק אינו ודאי, יש לבדוק את מסמכי התור או את השילוט העדכני בבית החולים.",
 pavilion:"בניין",remain:"הישארו ב",appropriate:"השתמשו במעלית או בגישה המתאימה לקומה עבור",followRoom:"עקבו אחר השילוט לחדר",followDest:"עקבו אחר השילוט אל",
 indoor:"עקבו אחר השילוט בתוך בית החולים:",outsideMapped:"היעד נמצא מחוץ למסלול הפנימי שמופה. כתובת / מיקום: ",unknownLocation:"המיקום המדויק אינו מצוין במקור הנוכחי. בדקו את מסמכי התור או את השילוט.",noRoute:"ב-WayWey עדיין אין מסלול פנימי ציבורי מאומת בין נקודת ההתחלה ליעד. עקבו אחר השילוט העדכני בבית החולים.",verify:"לאימות",close:"סגירה"
},
ar:{
 brand:"أداة إرشاد سفراء المستشفى · غير رسمية",quickGuide:"دليل سريع",
 stationHeading:"1. موقع السفير",stationLabel:"نقطة البداية",stationStatus:"يتم حفظ اختيارك على هذا الجهاز.",
 searchHeading:"2. ابحث عن قسم أو خدمة",searchLabel:"العبرية أو الإنجليزية أو العربية",placeholder:"مثال: الطوارئ، القلب، MRI، الأطفال، الأورام",clear:"مسح",
 resultHeading:"3. تحقق من النتيجة",showVisitor:"اعرض للزائر",newSearch:"بحث جديد",
 noMatch:"لم يتم العثور على نتيجة. جرّب مصطلحاً أقصر أو لغة أخرى أو رقم الغرفة.",
 disclaimer:"أداة تجريبية لدعم سفراء المستشفى. عند عدم التأكد من الموقع الدقيق، تحقّق من مستندات الموعد أو من لافتات المستشفى الحالية.",
 pavilion:"المبنى",remain:"ابقَ في",appropriate:"استخدم المصعد أو الوصول المناسب للطابق لـ",followRoom:"اتبع اللافتات إلى الغرفة",followDest:"اتبع اللافتات إلى",
 indoor:"اتبع اللافتات داخل المستشفى:",outsideMapped:"الوجهة خارج المسار الداخلي المرسوم. العنوان / الموقع: ",unknownLocation:"الموقع الدقيق غير مذكور في المصدر الحالي. تحقّق من مستندات الموعد أو اللافتات.",noRoute:"لا يوجد في WayWey حتى الآن مسار داخلي عام موثّق بين نقطة البداية والوجهة. اتبع لافتات المستشفى الحالية.",verify:"بحاجة للتحقق",close:"إغلاق"
}
};
const LANGUAGE_NAMES={en:"English",fr:"Français",he:"עברית",ar:"العربية"};
function hospitalLanguages(){return (HOSPITAL.ambassadorLanguages&&HOSPITAL.ambassadorLanguages.length)?HOSPITAL.ambassadorLanguages:["en","fr"];}
function destinationName(d,lang){return (d&&d[lang])||d.en||d.he||d.ar||d.fr||"";}
function destinationSecondary(d,lang){
 const primary=destinationName(d,lang);
 const preferred=[...hospitalLanguages(),"en","he","ar","fr"];
 for(const l of [...new Set(preferred)]){if(l!==lang&&d[l]&&d[l]!==primary)return d[l];}
 return "";
}
function appIsRtl(lang=appLang){return lang==="he"||lang==="ar";}
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

function hospitalIdFromUrl(){
 const p=new URLSearchParams(window.location.search);
 const q=p.get("hospital");
 if(q&&/^[a-z0-9-]+$/i.test(q))return q.toLowerCase();
 // Backward compatibility for older JGH visitor links created before hospital datasets.
 if(p.get("visitor")==="1")return "jgh";
 return null;
}
function strengthBadge(level,labelFr,labelEn){
 const n=Math.max(1,Math.min(4,Number(level)||1));
 let bars="";
 for(let i=1;i<=4;i++)bars+='<span class="strength-bar '+(i<=n?'on':'')+'"></span>';
 return '<div class="dataset-strength" aria-label="Force du jeu de données : '+labelFr+' / Dataset strength: '+labelEn+'"><span class="strength-icon" aria-hidden="true">'+bars+'</span><span><strong>'+labelFr+'</strong><small>'+labelEn+'</small></span></div>';
}
function showHospitalLanding(){
 document.documentElement.lang="fr";
 document.documentElement.dir="ltr";
 document.title="WayWey — Choisir un hôpital / Select a hospital";
 const meta=document.querySelector('meta[name="description"]');
 if(meta)meta.content="WayWey — choisissez un hôpital / select a hospital";
 document.body.innerHTML=`
 <header class="landing-header">
   <div class="landing-wrap">
     <div>
       <div class="landing-brand">WayWey</div>
       <div class="landing-kicker">Orientation hospitalière · Hospital wayfinding · v${APP_VERSION}</div>
     </div>
   </div>
 </header>
 <main class="landing-wrap landing-main">
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
       ${strengthBadge(2,"En développement","Developing")}
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
async function fetchJson(url){
 const r=await fetch(url,{cache:"no-cache"});
 if(!r.ok)throw new Error("Could not load "+url+" ("+r.status+")");
 return r.json();
}
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


function floorFor(f,lang){
 if(!f||lang!=="fr")return f;
 const map={"1st floor":"1er étage","2nd floor":"2e étage","3rd floor":"3e étage","4th floor":"4e étage","5th floor":"5e étage","6th floor":"6e étage","7th floor":"7e étage","8th floor":"8e étage","9th floor":"9e étage","10th floor":"10e étage","8th or 9th floor":"8e ou 9e étage"};
 return map[f]||f;
}
function pavilionFor(p,lang){
 if(!p)return "";
 const special=HOSPITAL.specialPavilionLabels||{};
 if(special[p])return special[p][lang]||special[p].en||special[p].he||special[p].ar||special[p].fr||p;
 if(p.includes("/"))return p.split("/").map(x=>pavilionFor(x.trim(),lang)).join(" / ");
 const labels=PAV_LABELS[lang]||PAV_LABELS.en||{};
 return labels[p]||((lang==="fr"?"Pavillon ":"Pavilion ")+p);
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
 $("guideTitle").textContent=g.title;
 $("guideContent").innerHTML=g.html;
 $("closeGuide").setAttribute("aria-label",(APP_UI[appLang]&&APP_UI[appLang].close)||"Close");
}
function openQuickGuide(){renderQuickGuide();$("guideDialog").showModal();}
function setAppLanguage(lang){
 const allowed=hospitalLanguages();
 appLang=allowed.includes(lang)?lang:(HOSPITAL.defaultAppLanguage&&allowed.includes(HOSPITAL.defaultAppLanguage)?HOSPITAL.defaultAppLanguage:allowed[0]||"en");
 document.documentElement.lang=appLang;
 document.documentElement.dir=appIsRtl(appLang)?"rtl":"ltr";
 const t=APP_UI[appLang]||APP_UI.en;
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
}

function norm(s){return (s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9\u0400-\u04ff\u0590-\u05ff\u0600-\u06ff]+/g," ").trim()}
function fieldMatchScore(value,q){
 const f=norm(value),n=norm(q);if(!f||!n)return 0;
 if(f===n)return 100;if(f.startsWith(n))return 70;if(f.includes(n))return 45;return 0;
}
function queryLanguage(q,d){
 if(/[\u0590-\u05ff]/.test(q))return "he";
 if(/[\u0600-\u06ff]/.test(q))return "ar";
 const langs=hospitalLanguages();
 // In Israeli datasets, Latin-script queries are English by definition.
 if(langs.includes("he")&&langs.includes("ar")&&langs.includes("en"))return "en";
 if(/[àâçéèêëîïôûùüÿœæ]/i.test(q)&&langs.includes("fr"))return "fr";
 if(d&&langs.includes("fr")&&langs.includes("en")){
   const fr=fieldMatchScore(d.fr,q),en=fieldMatchScore(d.en,q);
   if(fr>en)return "fr";if(en>fr)return "en";
 }
 return langs.includes(appLang)?appLang:(langs[0]||"en");
}
function routeNoticeText(key,lang){
 const table={
   en:{
     outsideMapped:"Destination is outside the mapped indoor route. Address / location: ",
     unknownLocation:"The current source does not state an exact location. Check appointment paperwork or signage.",
     noRoute:"WayWey does not yet have a validated public indoor route between this starting point and destination. Follow current hospital signage."
   },
   fr:{
     outsideMapped:"Destination hors du parcours intérieur cartographié. Adresse / emplacement : ",
     unknownLocation:"Le site exact n’est pas indiqué dans la source actuelle. Vérifiez les documents du rendez-vous ou la signalisation.",
     noRoute:"Aucun itinéraire intérieur public n’est encore validé dans WayWey entre ce point de départ et cette destination. Suivez la signalisation actuelle de l’hôpital."
   },
   he:{
     outsideMapped:"היעד נמצא מחוץ למסלול הפנימי שמופה. כתובת / מיקום: ",
     unknownLocation:"המיקום המדויק אינו מצוין במקור הנוכחי. בדקו את מסמכי התור או את השילוט.",
     noRoute:"ב-WayWey עדיין אין מסלול פנימי ציבורי מאומת בין נקודת ההתחלה ליעד. עקבו אחר השילוט העדכני בבית החולים."
   },
   ar:{
     outsideMapped:"الوجهة خارج المسار الداخلي المرسوم. العنوان / الموقع: ",
     unknownLocation:"الموقع الدقيق غير مذكور في المصدر الحالي. تحقّق من مستندات الموعد أو اللافتات.",
     noRoute:"لا يوجد في WayWey حتى الآن مسار داخلي عام موثّق بين نقطة البداية والوجهة. اتبع لافتات المستشفى الحالية."
   }
 };
 const set=table[lang]||table.en;
 return set[key]||table.en[key];
}
function displayWhere(d,lang=appLang){return [d.p?pavilionFor(d.p,lang):"",d.loc||""].filter(Boolean).join(" · ")}
function bfs(a,b){
 if(a===b)return[a];
 let q=[[a]],seen=new Set([a]);
 while(q.length){let path=q.shift(),n=path[path.length-1];for(const x of (GRAPH[n]||[])){if(seen.has(x))continue;let p=[...path,x];if(x===b)return p;seen.add(x);q.push(p)}}
 return null;
}
function targetNode(d){
 const p=(d.p||"").trim();
 const aliases=HOSPITAL.nodeAliases||{};
 if(Object.prototype.hasOwnProperty.call(aliases,p))return aliases[p];
 if(GRAPH[p])return p;
 if(p.includes("/")){for(const x of p.split("/").map(s=>s.trim()))if(GRAPH[x])return x;}
 return null;
}
function ambassadorSteps(d){
 const t=APP_UI[appLang]||APP_UI.en,start=stationNode(),target=targetNode(d),out=[],labels=PAV_LABELS[appLang]||PAV_LABELS.en||{};
 const noticeLang=selectedQueryLang||appLang;
 if(!target){
   if(d.loc)out.push(routeNoticeText("outsideMapped",noticeLang)+d.loc+".");
   else out.push(routeNoticeText("unknownLocation",noticeLang));
   return out;
 }
 const path=bfs(start,target),special=specialRouteSteps(start,target,appLang);
 if(special&&special.length){out.push(...special);}
 else if(start===target){out.push(t.remain+" "+(labels[target]||pavilionFor(target,appLang))+".");}
 else if(path){out.push(t.indoor+" "+path.map(x=>labels[x]||pavilionFor(x,appLang)).join(" → ")+".");}
 else{out.push(routeNoticeText("noRoute",noticeLang));}
 if(d.loc)out.push(t.followDest+" "+d.loc+".");
 else out.push(t.followDest+" "+destinationName(d,appLang)+".");
 return out;
}
function localizedSteps(d,lang){
 const t=I18N[lang]||I18N.en,start=stationNode(),target=targetNode(d),out=[];
 if(!target){
   if(d.loc)out.push((lang==="fr"?"Adresse / emplacement : ":"Location: ")+d.loc+".");
   else out.push(lang==="fr"?"Vérifiez les documents du rendez-vous ou la signalisation pour l’emplacement exact.":"Check appointment paperwork or signage for the exact location.");
   return out;
 }
 const path=bfs(start,target),labels=PAV_LABELS[lang]||PAV_LABELS.en||{},special=specialRouteSteps(start,target,lang);
 if(special&&special.length){out.push(...special);}
 else if(start===target){out.push(t.stay+" "+(labels[target]||pavilionFor(target,lang))+".");}
 else if(path){out.push(t.follow+" "+path.map(x=>labels[x]||pavilionFor(x,lang)).join(" → ")+".");}
 else{
   const msg=lang==="fr"?"Aucun itinéraire intérieur public n’est encore validé dans WayWey entre ce point de départ et cette destination. Suivez la signalisation actuelle de l’hôpital.":"WayWey does not yet have a validated public indoor route between this starting point and destination. Follow current hospital signage.";
   out.push(msg);
 }
 if(d.loc)out.push(t.final+" "+d.loc+"."); else out.push(t.final+" "+destinationName(d,lang)+".");
 return out;
}
function score(d,q){
 const n=norm(q); if(!n)return 0;
 const fields=[d.en,d.fr,d.he,d.ar,d.loc,...(d.aliases||[])].filter(Boolean).map(norm);
 let s=0; for(const f of fields){if(f===n)s=Math.max(s,100);else if(f.startsWith(n))s=Math.max(s,70);else if(f.includes(n))s=Math.max(s,45);}
 for(const part of n.split(" ")){if(part.length>2&&fields.some(f=>f.includes(part)))s+=5}
 return s;
}
function search(){
 const q=$("q").value.trim(),box=$("results");box.innerHTML="";
 if(!q)return;
 const hits=DATA.map(d=>[d,score(d,q)]).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]).slice(0,12);
 if(!hits.length){box.innerHTML='<div class="status">'+APP_UI[appLang].noMatch+'</div>';return}
 hits.forEach(([d])=>{const el=document.createElement("div");el.className="result";const primary=destinationName(d,appLang),secondary=destinationSecondary(d,appLang);el.innerHTML="<strong>"+primary+"</strong>"+(secondary?"<small>"+secondary+"</small>":"")+"<div class='where'>"+displayWhere(d)+"</div>";el.onclick=()=>choose(d,true,queryLanguage(q,d));box.appendChild(el)});
}
function choose(d,scroll=true,queryLang=null){
 selected=d;if(queryLang)selectedQueryLang=queryLang;const primary=destinationName(d,appLang),secondary=destinationSecondary(d,appLang);
 $("destName").textContent=primary+(secondary&&secondary!==primary?" / "+secondary:"");$("destWhere").textContent=displayWhere(d);
 $("pills").innerHTML=(d.p?"<span class='pill'>"+pavilionFor(d.p,appLang)+"</span>":"")+(d.loc?"<span class='pill'>"+d.loc+"</span>":"")+(d.status==="verify"?"<span class='pill'>"+((APP_UI[appLang]&&APP_UI[appLang].verify)||APP_UI.en.verify)+"</span>":"");
 $("steps").innerHTML=ambassadorSteps(d).map(s=>"<li dir=\"auto\">"+s+"</li>").join("");
 const note=noteFor(d);$("note").style.display=note?"block":"none";$("note").textContent=note;
 $("route").classList.add("active");if(scroll)$("route").scrollIntoView({behavior:"smooth",block:"start"});
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
 $("visitorDialog").close();
 $("qrDialog").showModal();
}
function closeVisitorQr(){
 $("qrDialog").close();
 try{$("visitorDialog").showModal();renderVisitor();}catch(e){}
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
 $("visitorDialog").showModal();renderVisitor();
}
function renderVisitor(){
 const lang=$("visitorLang").value,t=I18N[lang]||I18N.en,p=$("visitorPanel");
 p.dir=(lang==="ar"||lang==="he")?"rtl":"ltr";
 $("vName").textContent=destinationName(selected,lang);
 $("vWhere").textContent=displayWhere(selected,lang);
 $("vSteps").innerHTML=localizedSteps(selected,lang).map(s=>"<li>"+s+"</li>").join("");
 const qrt=QR_UI[lang]||QR_UI.en;$("showQr").textContent="▦ "+qrt.button;$("listen").textContent="🔊 "+t.listen;$("back").textContent=t.back;
}
async function bootstrap(){
 const requestedHospital=hospitalIdFromUrl();
 if(!requestedHospital){
   showHospitalLanding();
   if("serviceWorker" in navigator)navigator.serviceWorker.register("./service-worker.js").catch(()=>{});
   return;
 }
 try{
   await loadHospital();
 }catch(e){
   console.error(e);
   $("brandSubtitle").textContent="Unable to load hospital data";
   $("disclaimer").textContent="WayWey could not load this hospital dataset. Please reload or check the hospital link.";
   return;
 }

 $("appLang").onchange=()=>setAppLanguage($("appLang").value);
 $("quickGuideBtn").onclick=openQuickGuide;
 $("closeGuide").onclick=()=>$("guideDialog").close();
 $("q").addEventListener("input",search);
 $("clear").onclick=()=>{$("q").value="";$("results").innerHTML="";$("q").focus()};
 $("newSearch").onclick=()=>{$("q").value="";$("results").innerHTML="";$("route").classList.remove("active");selectedQueryLang=null;$("q").focus();window.scrollTo({top:0,behavior:"smooth"})};
 $("showVisitor").onclick=showVisitor;
 $("visitorLang").onchange=renderVisitor;
 $("showQr").onclick=showVisitorQr;
 $("shareVisitor").onclick=shareVisitorDirections;
 $("closeQr").onclick=closeVisitorQr;
 $("qrBack").onclick=closeVisitorQr;
 $("closeVisitor").onclick=()=>$("visitorDialog").close();
 $("back").onclick=()=>$("visitorDialog").close();
 $("listen").onclick=()=>{if(!selected||!("speechSynthesis" in window))return;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(localizedSteps(selected,$("visitorLang").value).join(" "));u.lang=$("visitorLang").value;u.rate=0.78;u.pitch=1;speechSynthesis.speak(u)};

 let saved=null,savedLang=null;
 try{saved=localStorage.getItem(storageKey("station"));savedLang=localStorage.getItem(storageKey("appLang"))}catch(e){}
 if(saved&&[...$("station").options].some(o=>o.value===saved)){
   $("station").value=saved;
 }else if(saved){
   const legacy=(HOSPITAL.entrances||[]).find(x=>x.node===saved);
   if(legacy)$("station").value=legacy.id;
 }
 setAppLanguage(hospitalLanguages().includes(savedLang)?savedLang:(HOSPITAL.defaultAppLanguage||hospitalLanguages()[0]||"en"));
 $("station").onchange=()=>{try{localStorage.setItem(storageKey("station"),$("station").value)}catch(e){};if(selected)choose(selected,false)};

 const p=new URLSearchParams(window.location.search);
 if(p.get("visitor")==="1"){
   const from=p.get("from"),lang=p.get("lang")||"en",dest=p.get("dest");
   if(from&&[...$("station").options].some(o=>o.value===from))$("station").value=from;
   if([...$("visitorLang").options].some(o=>o.value===lang))$("visitorLang").value=lang;
   const d=DATA.find(x=>slugFor(x)===dest||norm(x.en).replace(/ /g,"-")===dest);
   if(d){selected=d;setTimeout(()=>{try{$("visitorDialog").showModal();renderVisitor()}catch(e){}},60);}
 }

 if("serviceWorker" in navigator)navigator.serviceWorker.register("./service-worker.js").catch(()=>{});
}
bootstrap();

