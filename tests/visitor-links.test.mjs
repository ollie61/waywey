import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {resolveVisitorDestination,visitorDestinationKey} from '../js/visitor-links.js';

test('permanent links survive department and location corrections',()=>{
  const d={id:'dest-123',en:'New name',loc:'New room',legacySlugs:['old-name-old-room']};
  assert.equal(visitorDestinationKey(d),'dest-123');
  assert.equal(resolveVisitorDestination([d],'dest-123'),d);
  assert.equal(resolveVisitorDestination([d],'old-name-old-room'),d);
});
test('legacy links remain supported but ambiguous or missing links never pick a destination',()=>{
  const a={en:'Clinic',loc:'A'},b={en:'Clinic',loc:'B'};
  assert.equal(resolveVisitorDestination([a,b],'clinic-a'),a);
  assert.equal(resolveVisitorDestination([a,b],'clinic'),null);
  assert.equal(resolveVisitorDestination([a],'missing'),null);
  assert.equal(resolveVisitorDestination([a],null),null);
});
test('all hospital destinations have unique permanent IDs and preserved legacy links',async()=>{
  for(const hospital of ['jgh','chum','glen','verdun','hadassah-ein-kerem']){
    const data=JSON.parse(await fs.readFile(new URL(`../hospitals/${hospital}/destinations.json`,import.meta.url)));
    assert.equal(new Set(data.map(d=>d.id)).size,data.length);
    for(const d of data){
      assert.match(d.id,/^dest-[a-z0-9-]+$/);
      assert.equal(resolveVisitorDestination(data,d.id),d);
      assert.ok(d.legacySlugs.length);
    }
  }
});
