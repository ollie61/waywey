import {norm} from "./search.js";

export function legacySlug(d){return norm(d.en+" "+(d.loc||"")).replace(/ /g,"-");}
export function visitorDestinationKey(d){return d.id||legacySlug(d);}

export function resolveVisitorDestination(data,key){
  if(!key)return null;
  const exact=data.filter(d=>d.id===key);
  if(exact.length===1)return exact[0];
  const matches=data.filter(d=>(d.legacySlugs||[]).includes(key)||legacySlug(d)===key||norm(d.en).replace(/ /g,"-")===key);
  // Never choose an arbitrary record for an ambiguous old department-only link.
  return matches.length===1?matches[0]:null;
}
