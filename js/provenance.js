// Data provenance helpers for audit dates and official-source links.

const LOCALES={en:"en-CA",fr:"fr-CA",he:"he-IL",ar:"ar"};

export function formatAuditDate(value,lang="en"){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value||""))return null;
  const [y,m,d]=value.split("-").map(Number);
  const date=new Date(Date.UTC(y,m-1,d));
  if(Number.isNaN(date.getTime()))return null;
  try{
    return new Intl.DateTimeFormat(LOCALES[lang]||LOCALES.en,{
      year:"numeric",month:"short",day:"numeric",timeZone:"UTC"
    }).format(date);
  }catch(e){
    return value;
  }
}

function urlsIn(value){
  if(typeof value!=="string")return [];
  return value.match(/https?:\/\/[^\s;,)]+/g)||[];
}

export function destinationSourceLinks(destination){
  const d=destination||{};
  const urls=[...urlsIn(d.sourceUrl),...urlsIn(d.source)];
  return [...new Set(urls)].map(url=>({url,kind:"destination"}));
}

export function hospitalSourceLinks(hospital){
  return ((hospital&&hospital.sourceLinks)||[])
    .filter(link=>link&&typeof link.url==="string"&&/^https?:\/\//i.test(link.url))
    .map(link=>({url:link.url,label:link.label||link.url,kind:"hospital"}));
}

export function sourceLinks(destination,hospital){
  const merged=[...destinationSourceLinks(destination),...hospitalSourceLinks(hospital)];
  const seen=new Set();
  return merged.filter(link=>{
    if(seen.has(link.url))return false;
    seen.add(link.url);
    return true;
  });
}
