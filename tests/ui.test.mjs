import test from 'node:test';
import assert from 'node:assert/strict';
import {locationFor} from '../js/ui.js';

test('French formats English floor labels without changing room codes or explicit translations',()=>{
  for(const [loc,fr] of [['3rd floor','3e étage'],['1st floor','1er étage'],['6th floor','6e étage'],['Floor 2','2e étage'],['Ground floor','Rez-de-chaussée'],['K-123','K-123']]){
    assert.equal(locationFor({loc},'fr'),fr);
    assert.equal(locationFor({loc},'en'),loc);
  }
  assert.equal(locationFor({loc:'3rd floor',locFr:'Troisième étage'},'fr'),'Troisième étage');
});
