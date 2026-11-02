// Pure routing helpers. These functions never invent a missing route.

export function findRoute(graph,a,b){
  if(a===b)return[a];
  let q=[[a]],seen=new Set([a]);
  while(q.length){
    const path=q.shift(),n=path[path.length-1];
    for(const x of (graph[n]||[])){
      if(seen.has(x))continue;
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
  if(Object.prototype.hasOwnProperty.call(aliases,p))return aliases[p];
  if(graph[p])return p;
  if(p.includes("/")){
    for(const x of p.split("/").map(s=>s.trim()))if(graph[x])return x;
  }
  return null;
}
