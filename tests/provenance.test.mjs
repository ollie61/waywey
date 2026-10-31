import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

async function load(path){
  const source=await fs.readFile(new URL("../"+path,import.meta.url),"utf8");
  return import("data:text/javascript;charset=utf-8,"+encodeURIComponent(source));
}
const p=await load("js/provenance.js");

test("audit dates format only valid ISO-like dates",()=>{
  const formatted=p.formatAuditDate("2026-10-29","en");
  assert.ok(formatted&&formatted.includes("2026"));
  assert.equal(p.formatAuditDate("unknown","en"),null);
});

test("destination sources extract and deduplicate URLs",()=>{
  const links=p.destinationSourceLinks({
    sourceUrl:"https://example.org/a",
    source:"Primary https://example.org/a ; secondary https://example.org/b"
  });
  assert.deepEqual(links.map(x=>x.url),["https://example.org/a","https://example.org/b"]);
});

test("hospital source links are restricted to web URLs",()=>{
  const links=p.hospitalSourceLinks({sourceLinks:[
    {label:"Official",url:"https://example.org"},
    {label:"Bad",url:"javascript:alert(1)"}
  ]});
  assert.equal(links.length,1);
  assert.equal(links[0].label,"Official");
});

test("destination links precede hospital fallback sources",()=>{
  const links=p.sourceLinks(
    {sourceUrl:"https://example.org/destination"},
    {sourceLinks:[{label:"Hospital",url:"https://example.org/hospital"}]}
  );
  assert.equal(links[0].kind,"destination");
  assert.equal(links[1].kind,"hospital");
});
