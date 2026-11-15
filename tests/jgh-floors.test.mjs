import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {findRoute,floorAwareSteps} from '../js/routing.js';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
const config=read('hospitals/jgh/config.json'),routes=read('hospitals/jgh/routes.json');
const destinations=read('hospitals/jgh/destinations.json');
const languages=['en','fr','es','pt','he','ar','ru','vi','fa','sw','bg'];
function plan(from,p,floor,lang='en'){
 const entrance=config.entrances.find(e=>e.id===from);
 return floorAwareSteps({path:findRoute(routes.graph,entrance.node,p),entrance,destination:{floor},policy:routes.floorRouting,specialRoutes:routes.specialRoutes,lang});
}
test('E S1 to B 01 uses starting elevator before unchanged pavilion path',()=>{
 const steps=plan('e','B','01');
 assert.match(steps[0],/Pavilion E.*\[S1\].*\[01\]/);
 assert.match(steps.slice(1).join(' '),/E → D.*D → B/);
 assert.equal(steps.filter(s=>/elevator/.test(s)).length,1);
});
test('E S1 to B 03 adds destination elevator last',()=>{
 const steps=plan('e','B','03');assert.match(steps.at(-1),/Pavilion B.*\[01\].*\[03\]/);
 assert.equal(steps.filter(s=>/elevator/.test(s)).length,2);
});
test('B 01 to E S1 uses only the destination elevator',()=>{
 const steps=plan('main','E','S1');assert.match(steps.at(-1),/Pavilion E.*\[01\].*\[S1\]/);
 assert.equal(steps.filter(s=>/elevator/.test(s)).length,1);
});
test('same pavilion never detours through transfer floor; same floor needs no elevator',()=>{
 assert.deepEqual(plan('e','E','S1'),[]);
 assert.deepEqual(plan('main','B','01'),[]);
 assert.deepEqual(plan('e','E','03'),['In Pavilion E, take the elevator from [S1] to [03].']);
 assert.match(plan('h','H','01')[0],/\[RC\].*\[01\]/);
});
test('H K exception directions are preserved, including on intermediate edges',()=>{
 for(const lang of languages){
  const hk=plan('h','K','03',lang);
  assert.deepEqual(hk.slice(0,2),routes.specialRoutes['H>K'][lang]);
  assert.equal(hk.length,3); // unverified K lobby level warning, no invented elevator
  assert.equal(plan('k','H','03',lang)[1],routes.specialRoutes['K>H'][lang][0]);
  assert.ok(plan('h','B','01',lang).includes(routes.specialRoutes['H>K'][lang][1]));
  assert.ok(plan('main','H','02',lang).includes(routes.specialRoutes['K>H'][lang][0]));
 }
});
test('unknown levels warn; room numbers are never parsed at runtime',()=>{
 assert.match(plan('e','E',null)[0],/Verification required/);
 assert.match(plan('e','B',null).at(-1),/Verification required/);
 const d=destinations.find(d=>d.loc==='B-304');assert.equal(d.floor,null);
});
test('all 11 languages have complete translated transitions, routes and warnings',()=>{
 for(const lang of languages){
  const steps=plan('e','B','03',lang);
  assert.equal(steps.length,4,lang);
  assert.match(steps[0],/\[S1\].*\[01\]/,lang);
  assert.match(steps.at(-1),/\[01\].*\[03\]/,lang);
  if(lang!=='en')assert.doesNotMatch([...steps,...plan('e','E',null,lang)].join(' '),/take the elevator|Verification required|Follow the validated/);
 }
});
test('IDs, route geometry, special directions and room directions retain main baseline',()=>{
 const baseline=p=>JSON.parse(execFileSync('git',['show','2392e102fd783964223280386df060caff3775be:'+p],{encoding:'utf8'}));
 const oldRoutes=baseline('hospitals/jgh/routes.json');
 for(const key of Object.keys(oldRoutes))assert.deepEqual(routes[key],oldRoutes[key],key);
 const old=baseline('hospitals/jgh/destinations.json');
 assert.deepEqual(destinations.map(({floor,...d})=>d),old);
 assert.deepEqual(config.entrances.map(({id,node})=>({id,node})),baseline('hospitals/jgh/config.json').entrances.map(({id,node})=>({id,node})));
 for(const a of Object.keys(routes.graph))for(const b of Object.keys(routes.graph))assert.deepEqual(findRoute(routes.graph,a,b),findRoute(oldRoutes.graph,a,b));
});
