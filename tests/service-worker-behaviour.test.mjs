import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';
const source=await fs.readFile(new URL('../service-worker.js',import.meta.url),'utf8');
function runtime(){
 const events={},stores=new Map(),base='https://waywey.test/',state={offline:false,body:'fresh',skips:0,claims:0};
 const key=x=>new URL(typeof x==='string'?x:x.url,base).href;
 const caches={
  async open(name){if(!stores.has(name))stores.set(name,new Map());const m=stores.get(name);return {
   async put(req,res){m.set(key(req),res.clone());},
   async match(req,opts={}){const u=new URL(key(req));if(opts.ignoreSearch)u.search='';for(const [k,v] of m){const ku=new URL(k);if(opts.ignoreSearch)ku.search='';if(ku.href===u.href)return v.clone();}},
   async addAll(urls){for(const u of urls)m.set(key(u),new Response('shell:'+u));}
  };},
  async keys(){return [...stores.keys()];},async delete(k){return stores.delete(k);},
  async match(req,opts){for(const n of stores.keys()){const r=await (await this.open(n)).match(req,opts);if(r)return r;}}
 };
 const self={location:{origin:base.slice(0,-1)},clients:{claim(){state.claims++;}},skipWaiting(){state.skips++;},addEventListener(n,f){events[n]=f;}};
 vm.runInNewContext(source,{self,caches,URL,Response,fetch:async()=>{if(state.offline)throw Error('offline');return new Response(state.body);}});
 async function event(type,data={}){let pending;events[type]({...data,waitUntil(p){pending=p;},respondWith(p){pending=p;}});return await pending;}
 const request=(path,mode='cors')=>({url:new URL(path,base).href,method:'GET',mode});
 return {state,stores,caches,event,request};
}
test('visited hospital refreshes online and remains available offline; unvisited hospital fails',async()=>{
 const r=runtime(),req=r.request('/hospitals/jgh/destinations.json');
 assert.equal(await (await r.event('fetch',{request:req})).text(),'fresh');
 r.state.body='updated';assert.equal(await (await r.event('fetch',{request:req})).text(),'updated');
 r.state.offline=true;assert.equal(await (await r.event('fetch',{request:req})).text(),'updated');
 await assert.rejects(r.event('fetch',{request:r.request('/hospitals/chum/destinations.json')}),/offline/);
});
test('offline deep link falls back to shell and retains request routing parameters',async()=>{
 const r=runtime();await r.event('install');r.state.offline=true;
 const req=r.request('/?hospital=jgh&dest=mri&visitor=1','navigate');
 assert.equal(await (await r.event('fetch',{request:req})).text(),'shell:./');
 assert.match(req.url,/hospital=jgh&dest=mri&visitor=1/);
});
test('hospital cache is on demand and limited to requested hospital',async()=>{
 const r=runtime();await r.event('install');assert.equal(r.stores.has('waywey-hospital-data-1'),false);
 await r.event('message',{data:{type:'CACHE_HOSPITAL',id:'jgh'}});
 const entries=[...r.stores.get('waywey-hospital-data-1').keys()];assert.equal(entries.length,6);assert.ok(entries.every(x=>x.includes('/jgh/')));
});
test('install waits for explicit activation; activation retains data and unrelated caches',async()=>{
 const r=runtime();await r.caches.open('waywey-cache-16');await r.caches.open('waywey-hospital-data-1');await r.caches.open('unrelated');
 await r.event('install');assert.equal(r.state.skips,0);
 await r.event('message',{data:{type:'SKIP_WAITING'}});assert.equal(r.state.skips,1);
 await r.event('activate');assert.equal(r.state.claims,1);assert.equal(r.stores.has('waywey-cache-16'),false);
 for(const n of ['waywey-cache-17','waywey-hospital-data-1','unrelated'])assert.ok(r.stores.has(n));
});
