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
