import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const source = await fs.readFile(new URL('../service-worker.js', import.meta.url), 'utf8');
function worker(fetch, {openFails = false} = {}) {
  const stale = new Response('stale');
  const cache = {put: async () => {throw Error('quota');}, match: async () => stale.clone()};
  const scope = vm.createContext({
    URL, Response, fetch,
    caches: {open: async () => {if (openFails) throw Error('storage disabled'); return cache;}, match: async () => stale.clone()},
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

for (const [handler, url] of [
  ['networkFirstHospital', 'https://waywey.example/hospitals/jgh/config.json'],
  ['shellResponse', 'https://waywey.example/app.js'],
  ['navigationResponse', 'https://waywey.example/?hospital=jgh']
]) {
  test(`${handler} still reaches the network when cache storage cannot open`, async () => {
    let requests = 0;
    const scope = worker(async () => {requests++; return new Response('fresh');}, {openFails: true});
    assert.equal(await (await scope[handler](new Request(url))).text(), 'fresh');
    assert.equal(requests, 1);
  });
}
