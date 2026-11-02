import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

async function loadModule(path){
  const source=await fs.readFile(new URL("../"+path,import.meta.url),"utf8");
  return import("data:text/javascript;charset=utf-8,"+encodeURIComponent(source));
}

const search=await loadModule("js/search.js");
const destinations=JSON.parse(
  await fs.readFile(new URL("../hospitals/glen/destinations.json",import.meta.url),"utf8")
);

test("Glen MRI is directly searchable by MRI",()=>{
  const ranked=search.rankResults(destinations,"MRI",12);
  assert.ok(ranked.length>0);
  assert.match(ranked[0][0].en,/^MRI \/ Magnetic Resonance Imaging/);
  assert.equal(ranked[0][0].loc,"C 02.5022");
});

test("Glen MRI is directly searchable by French IRM",()=>{
  const ranked=search.rankResults(destinations,"IRM",12);
  assert.ok(ranked.length>0);
  assert.match(ranked[0][0].fr,/^IRM \/ Imagerie par résonance magnétique/);
});
