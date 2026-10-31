import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const sw=await fs.readFile(new URL("../service-worker.js",import.meta.url),"utf8");
const manifest=JSON.parse(await fs.readFile(new URL("../manifest.webmanifest",import.meta.url),"utf8"));

test("service worker shell does not pre-cache hospital datasets",()=>{
  const match=sw.match(/const SHELL_ASSETS=\[([\s\S]*?)\];/);
  assert.ok(match,"SHELL_ASSETS must exist");
  assert.doesNotMatch(match[1],/hospitals\//);
});

test("service worker caches hospital data separately on demand",()=>{
  assert.match(sw,/waywey-hospital-data-1/);
  assert.match(sw,/CACHE_HOSPITAL/);
  assert.match(sw,/networkFirstHospital/);
});

test("service worker uses explicit update activation",()=>{
  assert.match(sw,/SKIP_WAITING/);
  const installBlock=sw.match(/self\.addEventListener\("install"[\s\S]*?\n\}\);/);
  assert.ok(installBlock);
  assert.doesNotMatch(installBlock[0],/skipWaiting/);
});

test("manifest is multi-hospital and has an install icon",()=>{
  assert.equal(manifest.short_name,"WayWey");
  assert.match(manifest.description,/hospital wayfinding/i);
  assert.ok(Array.isArray(manifest.icons)&&manifest.icons.length>0);
  assert.equal(manifest.icons[0].src,"./icons/waywey.svg");
});
