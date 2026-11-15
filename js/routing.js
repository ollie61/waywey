// Pure routing helpers. These functions never invent a missing route.

export function findRoute(graph,a,b){
  if(!Object.hasOwn(graph,a)||!Object.hasOwn(graph,b))return null;
  if(a===b)return[a];
  let q=[[a]],seen=new Set([a]);
  while(q.length){
    const path=q.shift(),n=path[path.length-1];
    for(const x of (graph[n]||[])){
      if(!Object.hasOwn(graph,x)||seen.has(x))continue;
      const p=[...path,x];
      if(x===b)return p;
      seen.add(x);q.push(p);
    }
  }
  return null;
}

export function resolveTargetNode(d,hospital,graph){
  const p=(d.p||"").trim();
  const aliases=hospital.nodeAliases||{};
  if(Object.hasOwn(aliases,p))return Object.hasOwn(graph,aliases[p])?aliases[p]:null;
  if(Object.hasOwn(graph,p))return p;
  if(p.includes("/")){
    for(const x of p.split("/").map(s=>s.trim())){
      const node=Object.hasOwn(aliases,x)?aliases[x]:x;
      if(Object.hasOwn(graph,node))return node;
    }
  }
  return null;
}

// Only replace the generic path when every directed edge has documented steps.
export function routeInstructions(path,instructions,lang){
  if(!path||path.length<2)return null;
  const steps=[];
  for(let i=1;i<path.length;i++){
    const edge=instructions[path[i-1]+">"+path[i]];
    // Missing translations use the caller's generic localized route. Mixing
    // English instructions into another language also gives TTS the wrong text.
    const text=edge&&edge[lang];
    if(!text||!text.length)return null;
    steps.push(...text);
  }
  return steps;
}

// Floor labels are opaque: RC, S1 and 01 are never treated as equivalent.
// Unknown levels stay unknown, including the numbered level of K's lobby.
const FLOOR_TEXT={
 en:{e:'In Pavilion {p}, take the elevator from [{a}] to [{b}].',r:'Follow indoor signs on level [{f}]: {a} → {b}.',w:'Verification required: confirm the floor connection in Pavilion {p} with hospital staff or current signage.'},
 fr:{e:'Dans le pavillon {p}, prenez l’ascenseur du niveau [{a}] au niveau [{b}].',r:'Suivez les indications intérieures au niveau [{f}] : {a} → {b}.',w:'Vérification requise : confirmez la liaison entre les niveaux du pavillon {p} auprès du personnel ou sur la signalisation actuelle.'},
 es:{e:'En el Pabellón {p}, tome el ascensor de [{a}] a [{b}].',r:'Siga las señales interiores en [{f}]: {a} → {b}.',w:'Verificación necesaria: confirme la conexión entre pisos del Pabellón {p} con el personal o la señalización actual.'},
 pt:{e:'No Pavilhão {p}, pegue o elevador de [{a}] até [{b}].',r:'Siga as placas internas em [{f}]: {a} → {b}.',w:'Verificação necessária: confirme a ligação entre andares do Pavilhão {p} com os funcionários ou a sinalização atual.'},
 he:{e:'בבניין {p}, השתמשו במעלית ממפלס [{a}] למפלס [{b}].',r:'עקבו אחר השילוט הפנימי במפלס [{f}]: {a} → {b}.',w:'נדרש אימות: בדקו את המעבר בין המפלסים בבניין {p} עם הצוות או לפי השילוט העדכני.'},
 ar:{e:'في الجناح {p}، استخدم المصعد من المستوى [{a}] إلى [{b}].',r:'اتبع اللافتات الداخلية في المستوى [{f}]: {a} → {b}.',w:'يلزم التحقق: تأكد من الاتصال بين الطوابق في الجناح {p} مع الموظفين أو اللافتات الحالية.'},
 ru:{e:'В павильоне {p} воспользуйтесь лифтом с уровня [{a}] на [{b}].',r:'Следуйте внутренним указателям на уровне [{f}]: {a} → {b}.',w:'Требуется проверка: уточните переход между этажами в павильоне {p} у персонала или по актуальным указателям.'},
 vi:{e:'Tại Khu {p}, đi thang máy từ tầng [{a}] đến [{b}].',r:'Đi theo biển chỉ dẫn bên trong ở tầng [{f}]: {a} → {b}.',w:'Cần xác minh: hỏi nhân viên hoặc xem biển chỉ dẫn hiện tại về lối nối giữa các tầng tại Khu {p}.'},
 fa:{e:'در ساختمان {p}، با آسانسور از طبقه [{a}] به [{b}] بروید.',r:'تابلوهای داخل ساختمان در طبقه [{f}] را دنبال کنید: {a} → {b}.',w:'نیاز به تأیید: ارتباط بین طبقات ساختمان {p} را از کارکنان یا تابلوهای فعلی بررسی کنید.'},
 sw:{e:'Katika Jengo {p}, tumia lifti kutoka [{a}] hadi [{b}].',r:'Fuata alama za ndani kwenye [{f}]: {a} → {b}.',w:'Uthibitisho unahitajika: hakikisha njia kati ya ghorofa katika Jengo {p} kwa wafanyakazi au alama za sasa.'},
 bg:{e:'В павилион {p} вземете асансьора от ниво [{a}] до [{b}].',r:'Следвайте вътрешните табели на ниво [{f}]: {a} → {b}.',w:'Необходима е проверка: потвърдете връзката между етажите в павилион {p} с персонала или актуалните табели.'}
};
export function floorAwareSteps({path,entrance,destination,policy,specialRoutes={},edgeInstructions={},lang}){
 if(!policy||!path?.length||!entrance)return null;
 const t=FLOOR_TEXT[lang];
 if(!t)throw new Error('Missing floor translation: '+lang);
 const format=(key,values)=>t[key].replace(/\{(\w+)\}/g,(_,k)=>values[k]);
 const steps=[];let level=entrance.entranceLevel;
 const move=(p,to)=>{
   if(!level||!to)steps.push(format('w',{p}));
   else if(level!==to)steps.push(format('e',{p,a:level,b:to}));
   level=to;
 };
 for(let i=1;i<path.length;i++){
   const a=path[i-1],b=path[i],key=a+'>'+b,exception=policy.exceptions[key];
   if(exception){
     // H>K's existing instructions already include the departure elevator.
     if(key!=='H>K')move(a,exception.departureLevel);
     const documented=specialRoutes[key]?.[lang];
     if(documented)steps.push(...documented);
     else steps.push(format('w',{p:a+' / '+b}));
     level=exception.arrivalLevel;
   }else{
     move(a,policy.transferLevel);
     const documented=edgeInstructions[key]?.[lang];
     steps.push(...(documented||[format('r',{f:policy.transferLevel,a,b})]));
     level=policy.transferLevel;
   }
 }
 move(path.at(-1),destination.floor);
 return steps;
}
