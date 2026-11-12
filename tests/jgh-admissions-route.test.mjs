import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const routes=JSON.parse(readFileSync(new URL("../hospitals/jgh/routes.json",import.meta.url),"utf8"));
const destinations=JSON.parse(readFileSync(new URL("../hospitals/jgh/destinations.json",import.meta.url),"utf8"));
test("JGH Admissions B-114 directions are specific and multilingual",()=>{
 const d=destinations.find(x=>x.id==="dest-120dd63f48a25241");
 assert.equal(d.loc,"B-114");
 const item=routes.stationDestinationDirections["main>"+d.id];
 assert.ok(item);
 for(const lang of ["en","fr","es","pt","he","ar","ru","vi","sw","bg"]){
  assert.ok(Array.isArray(item[lang]) && item[lang].length===2,lang);
  assert.match(item[lang].join(" "),/B-114/,lang);
 }
 assert.match(item.en.join(" "),/turn right/i);
 assert.match(item.fr.join(" "),/tournez à droite/i);
 assert.match(item.en[1],/on your left/i);
 assert.match(item.fr[1],/à votre gauche/i);
 assert.doesNotMatch(item.en[1],/on your right/i);
 assert.doesNotMatch(item.fr[1],/à votre droite/i);
 assert.equal(routes.stationDestinationDirections["a>"+d.id],undefined);
});
