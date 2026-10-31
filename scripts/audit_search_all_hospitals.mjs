#!/usr/bin/env node
// Exhaustive data-driven search audit across every WayWey hospital package.
//
// Unlike a small hand-written smoke suite, this derives queries from the full
// destination inventories. It checks all canonical names and aliases, unique
// locations/room codes, short acronyms, and three deterministic typo classes:
// deletion, substitution and adjacent transposition.

import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const search=await import(pathToFileURL(path.join(ROOT,"js/search.js")).href);
const LANG_FIELDS=["en","fr","he","ar"];

function fail(message,failures){failures.push(message);}
function words(value){return search.norm(value).split(" ").filter(Boolean);}
function isWord(token){return /^\p{L}+$/u.test(token);}
function addOwner(map,key,d){
  if(!key)return;
  if(!map.has(key))map.set(key,new Set());
  map.get(key).add(d);
}
function holderCount(map,key){return map.get(key)?.size||0;}

function substitutionChar(token,current){
  if(/[\u0590-\u05ff]/u.test(token))return current==="ז"?"ט":"ז";
  if(/[\u0600-\u06ff]/u.test(token))return current==="ز"?"س":"ز";
  if(/[\u0400-\u04ff]/u.test(token))return current==="ж"?"ф":"ж";
  return current==="x"?"z":"x";
}

function mutationCandidates(token,type){
  const chars=Array.from(token);
  const indexes=[];
  const mid=Math.floor(chars.length/2);
  for(let offset=0;offset<chars.length;offset++){
    for(const i of [mid-offset,mid+offset]){
      if(i>0&&i<chars.length-1&&!indexes.includes(i))indexes.push(i);
    }
  }

  const out=[];
  for(const i of indexes){
    const copy=[...chars];
    if(type==="delete"){
      copy.splice(i,1);
    }else if(type==="substitute"){
      copy[i]=substitutionChar(token,copy[i]);
    }else if(type==="transpose"){
      if(i+1>=chars.length||copy[i]===copy[i+1])continue;
      [copy[i],copy[i+1]]=[copy[i+1],copy[i]];
    }
    const value=copy.join("");
    if(value&&value!==token&&!out.includes(value))out.push(value);
  }
  return out;
}

function variantAmbiguous(variant,target,tokenOwners){
  for(const [token,owners] of tokenOwners){
    if(!token.includes(variant))continue;
    for(const owner of owners)if(owner!==target)return true;
  }
  return false;
}

function exactFieldOwners(data){
  const names=new Map(),aliases=new Map(),locations=new Map(),tokens=new Map(),compactLocations=new Map();
  for(const d of data){
    for(const field of LANG_FIELDS){
      const value=d[field];
      if(value){
        addOwner(names,search.norm(value),d);
        for(const token of words(value))addOwner(tokens,token,d);
      }
    }
    for(const alias of d.aliases||[]){
      addOwner(aliases,search.norm(alias),d);
      for(const token of words(alias))addOwner(tokens,token,d);
    }
    if(d.loc){
      addOwner(locations,search.norm(d.loc),d);
      addOwner(compactLocations,search.norm(d.loc).replace(/\s+/g,""),d);
    }
  }
  return {names,aliases,locations,tokens,compactLocations};
}

function summaryLine(s){
  return [
    s.id.padEnd(22),
    String(s.destinations).padStart(4)+" dest",
    String(s.canonicalChecks).padStart(5)+" canonical",
    String(s.aliasChecks).padStart(5)+" aliases",
    String(s.acronymChecks).padStart(4)+" acronyms",
    String(s.locationChecks).padStart(4)+" locations",
    String(s.compactRoomChecks).padStart(4)+" rooms",
    String(s.fuzzyDelete).padStart(4)+" del",
    String(s.fuzzySubstitute).padStart(4)+" sub",
    String(s.fuzzyTranspose).padStart(4)+" swap"
  ].join(" | ");
}

const hospitalRoot=path.join(ROOT,"hospitals");
const entries=(await fs.readdir(hospitalRoot,{withFileTypes:true}))
  .filter(e=>e.isDirectory())
  .map(e=>e.name)
  .sort();

const allFailures=[];
const summaries=[];
let totalDestinations=0;
const totalFuzzy={delete:0,substitute:0,transpose:0};

for(const id of entries){
  const data=JSON.parse(await fs.readFile(path.join(hospitalRoot,id,"destinations.json"),"utf8"));
  const {names,aliases,locations,tokens,compactLocations}=exactFieldOwners(data);
  const failures=[];
  const rankCache=new Map();

  function ranked(query){
    const key=search.norm(query);
    if(!rankCache.has(key))rankCache.set(key,search.rankResults(data,query,data.length));
    return rankCache.get(key);
  }
  function rankOf(query,target){
    const index=ranked(query).findIndex(([d])=>d===target);
    return index<0?Infinity:index+1;
  }

  const stats={
    id,destinations:data.length,
    canonicalChecks:0,aliasChecks:0,acronymChecks:0,
    locationChecks:0,compactRoomChecks:0,
    fuzzyDelete:0,fuzzySubstitute:0,fuzzyTranspose:0
  };

  for(const d of data){
    // Every localized canonical name must be searchable and rank near the top.
    for(const field of LANG_FIELDS){
      const q=d[field];
      if(!q)continue;
      stats.canonicalChecks++;
      if(search.score(d,q)<=0)fail(`${id}: canonical ${field} query not searchable: ${q} -> ${d.en}`,failures);
      const rank=rankOf(q,d);
      const allowed=Math.max(3,holderCount(names,search.norm(q)));
      if(rank>allowed)fail(`${id}: canonical query ranks #${rank} (allowed #${allowed}): ${q} -> ${d.en}`,failures);
    }

    // Every alias must score. A unique alias should rank in the top 3.
    for(const alias of d.aliases||[]){
      stats.aliasChecks++;
      if(search.score(d,alias)<=0)fail(`${id}: alias not searchable: ${alias} -> ${d.en}`,failures);
      const key=search.norm(alias);
      if(holderCount(aliases,key)===1){
        const rank=rankOf(alias,d);
        if(rank>3)fail(`${id}: unique alias ranks #${rank}: ${alias} -> ${d.en}`,failures);
      }

      // Short aliases/acronyms are especially important because fuzzy matching
      // intentionally does not broaden very short input.
      const compact=key.replace(/\s+/g,"");
      if(compact.length>=2&&compact.length<=4&&/^[a-z0-9]+$/.test(compact)&&holderCount(aliases,key)===1){
        stats.acronymChecks++;
        const rank=rankOf(alias.toUpperCase(),d);
        if(rank>3)fail(`${id}: short alias/acronym ranks #${rank}: ${alias} -> ${d.en}`,failures);
      }
    }

    // Unique locations and compact room codes must remain directly searchable.
    if(d.loc){
      const locKey=search.norm(d.loc);
      if(holderCount(locations,locKey)===1){
        stats.locationChecks++;
        const rank=rankOf(d.loc,d);
        if(rank>2)fail(`${id}: unique location ranks #${rank}: ${d.loc} -> ${d.en}`,failures);
      }

      const compact=locKey.replace(/\s+/g,"");
      if(/[0-9]/.test(compact)&&compact!==locKey&&compact.length>=3&&holderCount(compactLocations,compact)===1){
        stats.compactRoomChecks++;
        const rank=rankOf(compact,d);
        if(rank>3)fail(`${id}: compact room query ranks #${rank}: ${compact} -> ${d.en}`,failures);
      }
    }
  }

  // Fuzzy audit: use one unique long token per destination where possible, and
  // test three one-edit typo classes. Ambiguous generated mutations are skipped
  // rather than treating a legitimate competing literal match as a fuzzy bug.
  const mutationTypes=[
    ["delete","fuzzyDelete"],
    ["substitute","fuzzySubstitute"],
    ["transpose","fuzzyTranspose"]
  ];

  for(const d of data){
    const candidateTokens=[];
    for(const field of LANG_FIELDS)if(d[field])candidateTokens.push(...words(d[field]));
    for(const alias of d.aliases||[])candidateTokens.push(...words(alias));

    const unique=[...new Set(candidateTokens)]
      .filter(t=>isWord(t))
      .filter(t=>Array.from(t).length>=5)
      .filter(t=>Array.from(t).length<=18)
      .filter(t=>holderCount(tokens,t)===1)
      .sort((a,b)=>Array.from(b).length-Array.from(a).length);

    for(const [type,statKey] of mutationTypes){
      let tested=false;
      for(const token of unique){
        for(const typo of mutationCandidates(token,type)){
          if(holderCount(tokens,typo)>0)continue;
          if(variantAmbiguous(typo,d,tokens))continue;
          stats[statKey]++;
          const rank=rankOf(typo,d);
          if(rank>5)fail(`${id}: fuzzy ${type} ranks #${rank}: ${token} -> ${typo} -> ${d.en}`,failures);
          tested=true;
          break;
        }
        if(tested)break;
      }
    }
  }

  // Every hospital must receive broad fuzzy coverage for every typo class.
  const minimum=Math.min(data.length,Math.max(20,Math.ceil(data.length*0.35)));
  for(const [type,statKey] of mutationTypes){
    if(stats[statKey]<minimum){
      fail(`${id}: fuzzy ${type} coverage only ${stats[statKey]}/${data.length}; minimum ${minimum}`,failures);
    }
  }

  // Garbage in three scripts should not be rescued by fuzzy matching.
  for(const q of ["zzqxxqzz","זזזזזזז","زززززز"]){
    if(ranked(q).length)fail(`${id}: garbage query unexpectedly returned results: ${q}`,failures);
  }

  totalDestinations+=data.length;
  totalFuzzy.delete+=stats.fuzzyDelete;
  totalFuzzy.substitute+=stats.fuzzySubstitute;
  totalFuzzy.transpose+=stats.fuzzyTranspose;
  summaries.push(stats);
  allFailures.push(...failures);
}

console.log("\nWayWey all-hospital search audit");
console.log("=".repeat(170));
for(const s of summaries)console.log(summaryLine(s));
console.log("=".repeat(170));
console.log(
  `Total: ${totalDestinations} destinations; fuzzy checks — `+
  `delete ${totalFuzzy.delete}, substitute ${totalFuzzy.substitute}, transpose ${totalFuzzy.transpose}.`
);

if(allFailures.length){
  console.error(`\nSEARCH AUDIT FAILED: ${allFailures.length} issue(s)\n`);
  for(const issue of allFailures.slice(0,250))console.error(" - "+issue);
  if(allFailures.length>250)console.error(` - ... ${allFailures.length-250} additional issue(s) omitted`);
  process.exit(1);
}

console.log("\nSEARCH AUDIT PASSED.");
