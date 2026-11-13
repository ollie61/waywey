import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const source = await fs.readFile(new URL('../service-worker.js', import.meta.url), 'utf8');
function worker(fetch) {
  const stale = new Response('stale');
  const cache = {put: async () => {throw Error('quota');}, match: async () => stale.clone()};
  const scope = vm.createContext({
    URL, Response, fetch,
    caches: {open: async () => cache, match: async () => stale.clone()},
    self: {addEventListener() {}, location: {origin: 'https://waywey.example'}, registration: {scope: 'https://waywey.example/'}}
  });
  vm.runInContext(source, scope);
  return scope;
}

test('hospital requests keep fresh data even when cache writes fail', async () => {
  const scope = worker(async () => new Response('fresh'));
  assert.equal(await (await scope.networkFirstHospital(new Request('https://waywey.example/hospitals/jgh/config.json'))).text(), 'fresh');
});

test('non-shell requests keep successful network content when storage is full', async () => {
  const scope = worker(async () => new Response('fresh'));
  assert.equal(await (await scope.shellResponse(new Request('https://waywey.example/jgh/photos.html'))).text(), 'fresh');
});

test('offline hospital requests can still use cached data', async () => {
  const scope = worker(async () => {throw Error('offline');});
  assert.equal(await (await scope.networkFirstHospital(new Request('https://waywey.example/hospitals/jgh/config.json'))).text(), 'stale');
});
