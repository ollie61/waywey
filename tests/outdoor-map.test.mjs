import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

async function load(path){
  const source=await fs.readFile(new URL("../"+path,import.meta.url),"utf8");
  return import("data:text/javascript;charset=utf-8,"+encodeURIComponent(source));
}
const maps=await load("js/outdoor-map.js");

test("outdoor map requires explicit dataset metadata",()=>{
  assert.equal(maps.outdoorMapUrl({loc:"55 rue de l'Église"}),null);
});

test("outdoor map query is encoded into a user-initiated maps link",()=>{
  const url=maps.outdoorMapUrl({outdoorMap:{query:"55 rue de l'Église, Verdun, QC"}});
  assert.match(url,/^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/);
  assert.match(url,/%C3%89glise/);
});

test("blank map metadata is ignored",()=>{
  assert.equal(maps.hasOutdoorMap({outdoorMap:{query:"   "}}),false);
});
