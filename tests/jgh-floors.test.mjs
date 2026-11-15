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

test('Pavilion A entrance is level 01 and needs no elevator before a level 01 transfer',()=>{
 const entrance=config.entrances.find(e=>e.id==='a');
 assert.equal(entrance.entranceLevel,'01');
 for(const label of Object.values(entrance.labels)){
  assert.match(label,/\[01\]/);assert.doesNotMatch(label,/\[S1\]/);assert.match(label,/5759/);
 }
 assert.equal(destinations.find(d=>d.id==='dest-1238a06b83f05dda').floor,'01');
 const steps=plan('a','B','01');assert.equal(steps.length,1);assert.match(steps[0],/A → B/);assert.doesNotMatch(steps.join(' '),/elevator|\[S1\]/);
 assert.deepEqual(plan('a','A','01'),[]);
});

test('owner-confirmed JGH 0## rooms, including subrooms, are explicitly on RC',()=>{
 const rooms=destinations.filter(d=>/^[A-Z]-0\d{2}(?:\.\d+)?(?: \(main floor\/RC\))?$/.test(d.loc));
 assert.ok(rooms.length>=20);
 for(const d of rooms)assert.equal(d.floor,'RC',d.loc);
 assert.equal(destinations.find(d=>d.loc==='G-050 / E-104').floor,null);
 assert.equal(destinations.find(d=>d.loc==='E-0014 (S1)').floor,'S1');
 assert.equal(destinations.find(d=>d.loc==='D-0002 (S1)').floor,'S1');
 assert.equal(destinations.find(d=>d.loc==='E-0012').floor,'S1');
});
test('RC room instructions include the actual required elevator transition in every route language',()=>{
 const d=destinations.find(d=>d.en==='Neurology'&&d.loc==='E-005');assert.equal(d.floor,'RC');
 for(const lang of languages){
  const cross=plan('main','E',d.floor,lang);assert.match(cross.at(-1),/\[01\].*\[RC\]/,lang);
  const same=plan('e','E',d.floor,lang);assert.equal(same.length,1,lang);assert.match(same[0],/\[S1\].*\[RC\]/,lang);assert.doesNotMatch(same[0],/\[01\]/,lang);
 }
 assert.deepEqual(plan('h','H','RC'),[]);
});


test('owner-confirmed 00## rooms are on S1, distinct from three-digit 0## rooms on RC',()=>{
 const rooms=destinations.filter(d=>/^[A-Z]-00\d{2}(?:\.\d+)?(?: \(S1\))?$/.test(d.loc));assert.ok(rooms.length>=6);
 for(const d of rooms)assert.equal(d.floor,'S1',d.loc);
 for(const lang of languages){
  const cross=plan('main','E','S1',lang);assert.match(cross.at(-1),/\[01\].*\[S1\]/,lang);
  assert.deepEqual(plan('e','E','S1',lang),[],lang);
 }
});
