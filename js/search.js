// Pure search and query-language helpers.
//
// Ranking policy:
// - exact room/location matches are strongest;
// - canonical names rank ahead of aliases at the same match quality;
// - aliases are first-class searchable terms;
// - "official" is a small tie-breaker, never enough to hide a strong Verify match;
// - fuzzy matching is deliberately conservative and only applies to plausible typos.

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
  // In a Hebrew/Arabic/English hospital package, Latin-script queries are English.
  if(langs.includes("he")&&langs.includes("ar")&&langs.includes("en"))return "en";
  if(/[àâçéèêëîïôûùüÿœæ]/i.test(q)&&langs.includes("fr"))return "fr";
  if(d&&langs.includes("fr")&&langs.includes("en")){
    const fr=fieldMatchScore(d.fr,q),en=fieldMatchScore(d.en,q);
    if(fr>en)return "fr";if(en>fr)return "en";
  }
  return langs.includes(appLang)?appLang:(langs[0]||"en");
}

function compact(s){return norm(s).replace(/\s+/g,"");}

export function editDistance(a,b,maxDistance=Infinity){
  const aa=Array.from(a||""),bb=Array.from(b||"");
  if(Math.abs(aa.length-bb.length)>maxDistance)return maxDistance+1;
  let prev=Array.from({length:bb.length+1},(_,i)=>i);
  for(let i=1;i<=aa.length;i++){
    const cur=[i];
    let rowMin=cur[0];
    for(let j=1;j<=bb.length;j++){
      const cost=aa[i-1]===bb[j-1]?0:1;
      cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+cost);
      rowMin=Math.min(rowMin,cur[j]);
    }
    if(rowMin>maxDistance)return maxDistance+1;
    prev=cur;
  }
  return prev[bb.length];
}

function fuzzyThreshold(n){
  const len=Array.from(n).length;
  if(len<4)return 0;
  if(len<=6)return 1;
  return 2;
}

function fuzzyScore(value,q){
  const f=norm(value),n=norm(q);
  if(!f||!n)return 0;
  const threshold=fuzzyThreshold(n);
  if(!threshold)return 0;

  const qTokens=n.split(" ").filter(Boolean);
  const fTokens=f.split(" ").filter(Boolean);
  const candidates=new Set([f,...fTokens]);

  // For multi-word queries, compare against same-size token windows too.
  if(qTokens.length>1&&fTokens.length>=qTokens.length){
    for(let i=0;i<=fTokens.length-qTokens.length;i++){
      candidates.add(fTokens.slice(i,i+qTokens.length).join(" "));
    }
  }

  let best=0;
  for(const candidate of candidates){
    if(Math.abs(Array.from(candidate).length-Array.from(n).length)>threshold)continue;
    const d=editDistance(candidate,n,threshold);
    if(d<=threshold)best=Math.max(best,64-(d*9));
  }
  return best;
}

function literalScore(value,q,kind){
  const f=norm(value),n=norm(q);if(!f||!n)return 0;
  const weights={
    name:{exact:130,start:100,contains:75,fuzzy:1},
    alias:{exact:125,start:95,contains:70,fuzzy:0.95},
    location:{exact:145,start:115,contains:95,fuzzy:0}
  }[kind];

  let score=0;
  if(f===n)score=weights.exact;
  else if(f.startsWith(n))score=weights.start;
  else if(f.includes(n))score=weights.contains;
  else if(weights.fuzzy)score=Math.round(fuzzyScore(value,q)*weights.fuzzy);

  // Token coverage helps multi-word natural-language searches without
  // overpowering exact or strong prefix matches.
  const qTokens=n.split(" ").filter(t=>Array.from(t).length>=3);
  if(qTokens.length){
    let exactTokens=0,fuzzyTokens=0;
    const fTokens=f.split(" ").filter(Boolean);
    for(const qt of qTokens){
      if(fTokens.some(ft=>ft===qt||ft.includes(qt))){exactTokens++;continue;}
      const threshold=fuzzyThreshold(qt);
      if(threshold&&fTokens.some(ft=>editDistance(ft,qt,threshold)<=threshold))fuzzyTokens++;
    }
    score+=exactTokens*6+fuzzyTokens*3;
  }
  return score;
}

function locationScore(location,q){
  if(!location)return 0;
  let score=literalScore(location,q,"location");
  const n=norm(q);
  // Room numbers are commonly typed without punctuation or spaces (E959,
  // N1612, B1404). Compact comparison preserves that intent.
  if(/\d/.test(n)){
    const lc=compact(location),qc=compact(q);
    if(lc&&qc){
      if(lc===qc)score=Math.max(score,155);
      else if(lc.startsWith(qc))score=Math.max(score,122);
      else if(lc.includes(qc))score=Math.max(score,102);
    }
  }
  return score;
}

export function score(d,q){
  const n=norm(q);if(!n)return 0;

  let best=0;
  for(const name of [d.en,d.fr,d.he,d.ar].filter(Boolean)){
    best=Math.max(best,literalScore(name,q,"name"));
  }
  for(const alias of (d.aliases||[])){
    best=Math.max(best,literalScore(alias,q,"alias"));
  }
  best=Math.max(best,locationScore(d.loc,q));

  if(best<=0)return 0;

  // A small status preference resolves otherwise-equivalent results while
  // preserving a strong exact/fuzzy match to a Verify record.
  if(d.status==="official")best+=4;

  return best;
}

export function rankResults(data,q,limit=12){
  return (data||[])
    .map((d,index)=>({d,index,score:score(d,q)}))
    .filter(x=>x.score>0)
    .sort((a,b)=>b.score-a.score||a.index-b.index)
    .slice(0,limit)
    .map(x=>[x.d,x.score]);
}
