#!/usr/bin/env node
// Exhaustive data-driven search audit across every WayWey hospital package.
//
// This is deliberately broader than hand-written unit tests. It derives queries
// from every destination record, then tests canonical names, aliases, unique
// room/location codes, short acronyms and deterministic one-edit fuzzy typos.

import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const search=await import(pathToFileURL(path.join(ROOT,"js/search.js")).href);
const LANG_FIELDS=["en","fr","he","ar"];

function fail(message,failures){failures.push(message);}

function rankOf(data,query,target){
  const ranked=search.rankResults(data,query,data.length);
  const index=ranked.findIndex(([d])=>d===target);
  return index<0?Infinity:index+1;
}

function words(value){
  return search.norm(value).split(" ").filter(Boolean);
}

function isWord(token){
  return /^\p{L}+$/u.test(token);
}

function deleteOne(token){
  const chars=Array.from(token);
  if(chars.length<2)return token;
  const index=Math.max(1,Math.min(chars.length-2,Math.floor(chars.length/2)));
  chars.splice(index,1);
  return chars.join("");
}

function addOwner(map,key,d){
  if(!key)return;
  if(!map.has(key))map.set(key,new Set());
  map.get(key).add(d);
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

function holderCount(map,key){return map.get(key)?.size||0;}

function summaryLine(s){
  return [
    s.id.padEnd(22),
    String(s.destinations).padStart(4)+" dest",
    String(s.canonicalChecks).padStart(5)+" canonical",
    String(s.aliasChecks).padStart(5)+" aliases",
    String(s.acronymChecks).padStart(4)+" acronyms",
    String(s.locationChecks).padStart(4)+" locations",
    String(s.compactRoomChecks).padStart(4)+" compact-room",
    String(s.fuzzyChecks).padStart(4)+" fuzzy",
    Math.round(s.fuzzyCoverage*100).toString().padStart(3)+"% fuzzy coverage"
  ].join(" | ");
}

const hospitalRoot=path.join(ROOT,"hospitals");
const entries=(await fs.readdir(hospitalRoot,{withFileTypes:true}))
  .filter(e=>e.isDirectory())
  .map(e=>e.name)
  .sort();

const allFailures=[];
const summaries=[];
let totalDestinations=0,totalFuzzy=0;

for(const id of entries){
  const data=JSON.parse(await fs.readFile(path.join(hospitalRoot,id,"destinations.json"),"utf8"));
  const {names,aliases,locations,tokens,compactLocations}=exactFieldOwners(data);
  const failures=[];
  const stats={
    id,destinations:data.length,
    canonicalChecks:0,aliasChecks:0,acronymChecks:0,
    locationChecks:0,compactRoomChecks:0,fuzzyChecks:0,
    fuzzyCoverage:0
  };

  for(const d of data){
    // 1. Every localized canonical name must be searchable and rank near the top.
    for(const field of LANG_FIELDS){
      const q=d[field];
      if(!q)continue;
      stats.canonicalChecks++;
      const score=search.score(d,q);
      if(score<=0)fail(`${id}: canonical ${field} query not searchable: ${q} -> ${d.en}`,failures);
      const rank=rankOf(data,q,d);
      const shared=holderCount(names,search.norm(q));
      const allowed=Math.max(3,shared);
      if(rank>allowed)fail(`${id}: canonical query ranks #${rank} (allowed #${allowed}): ${q} -> ${d.en}`,failures);
    }

    // 2. Every alias must score. Unique aliases must rank in the top 3.
    for(const alias of d.aliases||[]){
      stats.aliasChecks++;
      if(search.score(d,alias)<=0)fail(`${id}: alias not searchable: ${alias} -> ${d.en}`,failures);
      const key=search.norm(alias);
      if(holderCount(aliases,key)===1){
        const rank=rankOf(data,alias,d);
        if(rank>3)fail(`${id}: unique alias ranks #${rank}: ${alias} -> ${d.en}`,failures);
      }

      // Short aliases/acronyms are high-value exact queries even though fuzzy
      // matching intentionally does not operate below four characters.
      const compact=key.replace(/\s+/g,"");
      if(compact.length>=2&&compact.length<=4&&/^[a-z0-9]+$/.test(compact)&&holderCount(aliases,key)===1){
        stats.acronymChecks++;
        const rank=rankOf(data,alias.toUpperCase(),d);
        if(rank>3)fail(`${id}: short alias/acronym ranks #${rank}: ${alias} -> ${d.en}`,failures);
      }
    }

    // 3. Exact unique locations/room codes must resolve directly.
    if(d.loc){
      const locKey=search.norm(d.loc);
      if(holderCount(locations,locKey)===1){
        stats.locationChecks++;
        const rank=rankOf(data,d.loc,d);
        if(rank>2)fail(`${id}: unique location ranks #${rank}: ${d.loc} -> ${d.en}`,failures);
      }

      const compact=locKey.replace(/\s+/g,"");
      if(/[0-9]/.test(compact)&&compact!==locKey&&compact.length>=3&&holderCount(compactLocations,compact)===1){
        stats.compactRoomChecks++;
        const rank=rankOf(data,compact,d);
        if(rank>3)fail(`${id}: compact room query ranks #${rank}: ${compact} -> ${d.en}`,failures);
      }
    }
  }

  // 4. Fuzzy audit: choose one unique, meaningful token per destination where
  // possible. Delete one interior character, reject mutations that become an
  // exact token elsewhere, and require the intended destination in top 5.
  let fuzzyEligible=0;
  for(const d of data){
    const candidateTokens=[];
    for(const field of LANG_FIELDS){
      if(d[field])candidateTokens.push(...words(d[field]));
    }
    for(const alias of d.aliases||[])candidateTokens.push(...words(alias));

    const unique=[...new Set(candidateTokens)]
      .filter(t=>isWord(t))
      .filter(t=>Array.from(t).length>=5)
      .filter(t=>Array.from(t).length<=18)
      .filter(t=>holderCount(tokens,t)===1)
      .sort((a,b)=>Array.from(b).length-Array.from(a).length);

    let tested=false;
    for(const token of unique){
      const typo=deleteOne(token);
      if(!typo||typo===token||holderCount(tokens,typo)>0)continue;
      fuzzyEligible++;
      stats.fuzzyChecks++;
      const rank=rankOf(data,typo,d);
      if(rank>5)fail(`${id}: fuzzy typo ranks #${rank}: ${token} -> ${typo} -> ${d.en}`,failures);
      tested=true;
      break;
    }
    // No unique long token means this destination cannot be assigned an
    // unambiguous generated typo without inventing a human query.
    void tested;
  }

  stats.fuzzyCoverage=data.length?stats.fuzzyChecks/data.length:0;

  // Require broad fuzzy coverage in every hospital, not merely one smoke case.
  const minFuzzy=Math.min(data.length,Math.max(20,Math.ceil(data.length*0.35)));
  if(stats.fuzzyChecks<minFuzzy){
    fail(`${id}: fuzzy audit covers only ${stats.fuzzyChecks}/${data.length} destinations; minimum is ${minFuzzy}`,failures);
  }

  // 5. Garbage queries should not produce fuzzy false positives.
  for(const q of ["zzqxxqzz","זזזזזזז","زززززز"]){
    if(search.rankResults(data,q,12).length){
      fail(`${id}: garbage query unexpectedly returned results: ${q}`,failures);
    }
  }

  totalDestinations+=data.length;
  totalFuzzy+=stats.fuzzyChecks;
  summaries.push(stats);
  allFailures.push(...failures);
}

console.log("\nWayWey all-hospital search audit");
console.log("=".repeat(150));
for(const s of summaries)console.log(summaryLine(s));
console.log("=".repeat(150));
console.log(`Total: ${totalDestinations} destinations; ${totalFuzzy} deterministic fuzzy-typo checks (${Math.round(totalFuzzy/totalDestinations*100)}% destination coverage).`);

if(allFailures.length){
  console.error(`\nSEARCH AUDIT FAILED: ${allFailures.length} issue(s)\n`);
  for(const issue of allFailures.slice(0,200))console.error(" - "+issue);
  if(allFailures.length>200)console.error(` - ... ${allFailures.length-200} additional issue(s) omitted`);
  process.exit(1);
}

console.log("\nSEARCH AUDIT PASSED.");
