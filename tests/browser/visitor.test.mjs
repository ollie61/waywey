import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';

const root=path.resolve(import.meta.dirname,'../..');
let server,browser,origin;
let workerRevision=19;
const chum=JSON.parse(await fs.readFile(path.join(root,'hospitals/chum/destinations.json')));
const destination=chum.find(d=>d.p==='D'&&d.status==='official');
const mime={'.js':'text/javascript','.json':'application/json','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
before(async()=>{
  server=http.createServer(async(req,res)=>{
    try{
      let file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
      if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403).end();return;}
      if((await fs.stat(file)).isDirectory())file=path.join(file,'index.html');
      res.setHeader('Content-Type',mime[path.extname(file)]||'text/plain');
      let content=await fs.readFile(file);
      if(file===path.join(root,'service-worker.js'))content=Buffer.from(content.toString().replace('waywey-cache-19',`waywey-cache-${workerRevision}`));
      res.end(content);
    }catch{res.writeHead(404).end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  origin=`http://127.0.0.1:${server.address().port}`;
  browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
});
after(async()=>{await browser?.close();await new Promise(resolve=>server?.close(resolve));});
async function ready(page){await page.locator('#station option[value="main"]').waitFor({state:'attached'});}
function link(extra={}){return origin+'/?'+new URLSearchParams({hospital:'chum',visitor:'1',dest:destination.id,from:'main',lang:'en',...extra});}
async function contextTest(run){
  const context=await browser.newContext();
  const page=await context.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try{await run(page,context);assert.deepEqual(errors,[]);}finally{await context.close();}
}

test('keyboard search, station changes, QR generation and language changes',async()=>contextTest(async page=>{
  await page.goto(origin+'/?hospital=chum');await ready(page);
  await page.selectOption('#appLang','en');
  await page.fill('#q',destination.en);
  await page.locator('#results button').first().focus();await page.keyboard.press('Enter');
  assert.match(await page.locator('#steps').innerText(),/floor 1, 2 or 8/);
  await page.selectOption('#station','emergency');
  assert.doesNotMatch(await page.locator('#steps').innerText(),/public connector/);
  await page.click('#showVisitor');
  await page.selectOption('#visitorLang','ar');
  assert.equal(await page.locator('#visitorPanel').getAttribute('dir'),'rtl');
  assert.equal(await page.locator('#visitorPanel').getAttribute('lang'),'ar');
  await page.selectOption('#visitorLang','en');await page.click('#showQr');
  assert.equal(await page.locator('#qrDialog').evaluate(d=>d.open),true);
  const qr=await page.locator('#qrCode').getAttribute('title');
  assert.equal(new URL(qr).searchParams.get('dest'),destination.id);
  assert.equal(new URL(qr).searchParams.get('from'),'emergency');
  await page.click('#qrBack');
  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>document.activeElement.id==='showVisitor');
}));

test('permanent and old QR links open the intended department and starting station',async()=>contextTest(async page=>{
  for(const dest of [destination.id,destination.legacySlugs[0]]){
    await page.goto(link({dest}));
    await page.locator('#visitorDialog[open]').waitFor();
    assert.equal(await page.locator('#vName').innerText(),destination.en);
    assert.equal(await page.locator('#station').inputValue(),'main');
    assert.match(await page.locator('#vSteps').innerText(),/floor 1, 2 or 8/);
  }
}));

test('missing destinations show a useful recovery message',async()=>contextTest(async page=>{
  await page.goto(link({dest:'not-a-department'}));
  await page.locator('#visitorLinkNotice:not([hidden])').waitFor();
  assert.match(await page.locator('#visitorLinkMessage').innerText(),/Search for the department/);
  assert.equal(await page.locator('#visitorDialog').evaluate(d=>d.open),false);
}));

test('invalid or absent starts cannot silently use a saved station',async()=>contextTest(async page=>{
  await page.goto(origin+'/?hospital=chum');await ready(page);
  await page.evaluate(()=>localStorage.setItem('waywey.chum.station','emergency'));
  for(const from of ['removed-station','']){
    await page.goto(link({from}));await page.locator('#recoverVisitor:not([hidden])').waitFor();
    assert.equal(await page.locator('#station').inputValue(),'');
    assert.equal(await page.locator('#recoverVisitor').isDisabled(),true);
    assert.equal(await page.locator('#visitorDialog').evaluate(d=>d.open),false);
    await page.selectOption('#station','main');await page.click('#recoverVisitor');
    await page.locator('#visitorDialog[open]').waitFor();
    assert.match(await page.locator('#vSteps').innerText(),/public connector/);
  }
}));

test('first service-worker activation preserves directions and offline links reopen',async()=>contextTest(async(page,context)=>{
  let navigations=0;page.on('framenavigated',frame=>{if(frame===page.mainFrame())navigations++;});
  await page.goto(link());await page.locator('#visitorDialog[open]').waitFor();
  await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
  await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  await page.waitForFunction(async()=>{
    const cache=await caches.open('waywey-hospital-data-1');
    return (await Promise.all(['config','destinations','routes','guide'].map(name=>cache.match(`./hospitals/chum/${name}.json`)))).every(Boolean);
  });
  assert.equal(navigations,1);
  await context.setOffline(true);await page.reload();
  await page.locator('#visitorDialog[open]').waitFor();
  assert.equal(await page.locator('#vName').innerText(),destination.en);
  assert.equal(await page.locator('#offlineNotice').isVisible(),true);
}));


test('updates wait for consent and only the requesting tab reloads',async()=>contextTest(async(page,context)=>{
  workerRevision=19;
  await page.goto(link());await page.locator('#visitorDialog[open]').waitFor();
  await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  const other=await context.newPage();await other.goto(link());
  await other.locator('#visitorDialog[open]').waitFor();
  let navigations=0,otherNavigations=0;
  page.on('framenavigated',frame=>{if(frame===page.mainFrame())navigations++;});
  other.on('framenavigated',frame=>{if(frame===other.mainFrame())otherNavigations++;});
  workerRevision=20;
  await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update();});
  await page.waitForFunction(async()=>!!(await navigator.serviceWorker.getRegistration()).waiting);
  assert.equal(navigations,0);
  assert.equal(await page.locator('#visitorDialog').evaluate(d=>d.open),true);
  await page.click('#closeVisitor');await page.click('#applyUpdate');
  await page.waitForFunction(async()=>(await caches.keys()).includes('waywey-cache-20'));
  await page.locator('#visitorDialog[open]').waitFor();
  assert.equal(navigations,1);
  assert.equal(otherNavigations,0);
  assert.equal(await other.locator('#visitorDialog').evaluate(d=>d.open),true);
  workerRevision=19;
}));

test('Hebrew hospital interface and Arabic visitor directions retain RTL and verification warnings',async()=>contextTest(async page=>{
  const data=JSON.parse(await fs.readFile(path.join(root,'hospitals/hadassah-ein-kerem/destinations.json')));
  const d=data.find(d=>d.status==='verify');
  const config=JSON.parse(await fs.readFile(path.join(root,'hospitals/hadassah-ein-kerem/config.json')));
  await page.setViewportSize({width:390,height:844});
  await page.goto(origin+'/?'+new URLSearchParams({hospital:config.id,visitor:'1',dest:d.id,from:config.entrances[0].id,lang:'ar'}));
  await page.locator('#visitorDialog[open]').waitFor();
  assert.equal(await page.locator('html').getAttribute('dir'),'rtl');
  assert.equal(await page.locator('#visitorPanel').getAttribute('lang'),'ar');
  assert.equal(await page.locator('#visitorPanel').getAttribute('dir'),'rtl');
  assert.ok((await page.locator('#vSteps li').first().innerText()).length>0);
  assert.equal(await page.locator('#vName').innerText(),d.ar||d.en);
}));
