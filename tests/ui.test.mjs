import test from 'node:test';
import assert from 'node:assert/strict';
import {locationFor,appIsRtl,destinationName} from '../js/ui.js';

test('Persian is RTL and missing destinations have no invented label',()=>{
  assert.equal(appIsRtl('fa'),true);
  assert.equal(appIsRtl('fr'),false);
  assert.equal(destinationName(null,'fa'),'');
});

test('French formats English floor labels without changing room codes or explicit translations',()=>{
  for(const [loc,fr] of [['3rd floor','3e étage'],['1st floor','1er étage'],['6th floor','6e étage'],['Floor 2','2e étage'],['Ground floor','Rez-de-chaussée'],['K-123','K-123']]){
    assert.equal(locationFor({loc},'fr'),fr);
    assert.equal(locationFor({loc},'en'),loc);
  }
  assert.equal(locationFor({loc:'3rd floor',locFr:'Troisième étage'},'fr'),'Troisième étage');
});

test('RC floor references are bracketed once in every location language',async()=>{
 const {formatFloorLabels}=await import('../js/ui.js');
 assert.equal(formatFloorLabels('RC'),'[RC]');
 assert.equal(formatFloorLabels('[RC]'),'[RC]');
 assert.equal(formatFloorLabels('D-070 (main floor/RC)'),'D-070 (main floor/[RC])');
 assert.equal(formatFloorLabels('CRC ARC-001'),'CRC ARC-001');
 for(const lang of ['en','fr','he','ar','es','pt','ru','vi','fa','bg']){
  assert.equal(locationFor({loc:'RC'},lang),'[RC]',lang);
  assert.equal(locationFor({loc:'[RC]'},lang),'[RC]',lang);
 }
 assert.equal(locationFor({loc:'RC',locFr:'Niveau RC'},'fr'),'Niveau [RC]');
});
