// Pure search and query-language helpers.

export function norm(s){
  return (s||"").toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9\u0400-\u04ff\u0590-\u05ff\u0600-\u06ff]+/g," ")
    .trim();
}

export function fieldMatchScore(value,q){
  const f=norm(value),n=norm(q);if(!f||!n)return 0;
  if(f===n)return 100;if(f.startsWith(n))return 70;if(f.includes(n))return 45;return 0;
}

export function inferQueryLanguage(q,d,languages,appLang){
  if(/[\u0590-\u05ff]/.test(q))return "he";
  if(/[\u0600-\u06ff]/.test(q))return "ar";
  const langs=languages||[];
  if(langs.includes("he")&&langs.includes("ar")&&langs.includes("en"))return "en";
  if(/[àâçéèêëîïôûùüÿœæ]/i.test(q)&&langs.includes("fr"))return "fr";
  if(d&&langs.includes("fr")&&langs.includes("en")){
    const fr=fieldMatchScore(d.fr,q),en=fieldMatchScore(d.en,q);
    if(fr>en)return "fr";if(en>fr)return "en";
  }
  return langs.includes(appLang)?appLang:(langs[0]||"en");
}

export function score(d,q){
  const n=norm(q);if(!n)return 0;
  const fields=[d.en,d.fr,d.he,d.ar,d.loc,...(d.aliases||[])].filter(Boolean).map(norm);
  let s=0;
  for(const f of fields){
    if(f===n)s=Math.max(s,100);
    else if(f.startsWith(n))s=Math.max(s,70);
    else if(f.includes(n))s=Math.max(s,45);
  }
  for(const part of n.split(" "))if(part.length>2&&fields.some(f=>f.includes(part)))s+=5;
  return s;
}
