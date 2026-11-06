import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';

const root=path.resolve(import.meta.dirname,'../..');
let server,browser,origin;
const baseRevision=Number((await fs.readFile(path.join(root,'service-worker.js'),'utf8')).match(/waywey-cache-(\d+)/)[1]);
let workerRevision=baseRevision;
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
      if(file===path.join(root,'service-worker.js'))content=Buffer.from(content.toString().replace(`waywey-cache-${baseRevision}`,`waywey-cache-${workerRevision}`));
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

for(const constructorName of ['SpeechRecognition','webkitSpeechRecognition']){
test(`Voix fills JGH search after recognition with ${constructorName}`,async()=>contextTest(async page=>{
  await page.addInitScript(name=>{
    window.recognitionTest={instances:[],aborts:0};
    const Recognition=class{
      constructor(){window.recognitionTest.instances.push(this);}
      start(){this.onstart();}
      stop(){this.onend();}
      abort(){window.recognitionTest.aborts++;}
    };
    Object.defineProperty(window,'SpeechRecognition',{value:name==='SpeechRecognition'?Recognition:undefined});
    Object.defineProperty(window,'webkitSpeechRecognition',{value:name==='webkitSpeechRecognition'?Recognition:undefined});
  },constructorName);
  await page.goto(origin+'/?hospital=jgh');await ready(page);
  await page.fill('#q','existing search');await page.click('#voiceSearch');
  assert.equal(await page.evaluate(()=>window.recognitionTest.instances[0].lang),'fr-CA');
  await page.evaluate(()=>{
    Object.defineProperty(document,'hidden',{configurable:true,value:true});
    document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document,'hidden',{configurable:true,value:false});
    document.dispatchEvent(new Event('visibilitychange'));
    const r=window.recognitionTest.instances[0];
    r.onresult({resultIndex:0,results:[Object.assign([{transcript:'cardiologie'}],{isFinal:true})]});
    r.onend();
  });
  assert.equal(await page.evaluate(()=>window.recognitionTest.aborts),0);
  assert.equal(await page.locator('#q').inputValue(),'cardiologie');
  assert.ok(await page.locator('#results button').count()>0);
  assert.match(await page.locator('#voiceStatus').innerText(),/Entendu : cardiologie/);
  await page.click('#voiceSearch');
  await page.evaluate(()=>window.recognitionTest.instances.at(-1).onend());
  assert.match(await page.locator('#voiceStatus').innerText(),/Aucune parole/);
  assert.equal(await page.locator('#q').inputValue(),'cardiologie');
  assert.equal(await page.locator('#voiceSearch').getAttribute('aria-pressed'),'false');
  await page.click('#voiceSearch');
  await page.evaluate(()=>{const r=window.recognitionTest.instances.at(-1);r.onerror({error:'not-allowed'});r.onend();});
  assert.match(await page.locator('#voiceStatus').innerText(),/autorisation/);
  await page.selectOption('#appLang','en');await page.click('#voiceSearch');
  assert.equal(await page.evaluate(()=>window.recognitionTest.instances.at(-1).lang),'en-CA');
  await page.evaluate(()=>{const r=window.recognitionTest.instances.at(-1);r.onresult({results:[[{transcript:'cardiology'}]]});r.onend();});
  assert.equal(await page.locator('#q').inputValue(),'cardiology');
  await page.selectOption('#appLang','fr');
  await page.selectOption('#voiceLanguage','en');await page.click('#voiceSearch');
  assert.equal(await page.evaluate(()=>window.recognitionTest.instances.at(-1).lang),'en-CA');
  assert.equal(await page.locator('#appLang').inputValue(),'fr');
  await page.evaluate(()=>{const r=window.recognitionTest.instances.at(-1);r.onresult({results:[[{transcript:'cancer'}]]});r.onend();});
  assert.equal(await page.locator('#q').inputValue(),'cancer');
  assert.ok(await page.locator('#results button').count()>0);
  // Fuzzy ranking must be identical for speech and typing, regardless of
  // interface or microphone language; never restrict it to literal matches.
  await page.fill('#q','cancre');
  const typedFuzzy=await page.locator('#results button').allTextContents();
  assert.ok(typedFuzzy.length>0);
  await page.click('#voiceSearch');
  await page.evaluate(()=>{const r=window.recognitionTest.instances.at(-1);r.onresult({results:[[{transcript:'cancre'}]]});r.onend();});
  assert.deepEqual(await page.locator('#results button').allTextContents(),typedFuzzy);
  assert.equal(await page.locator('#q').inputValue(),'cancre');
  await page.click('#voiceSearch');
  const aborts=await page.evaluate(()=>window.recognitionTest.aborts);
  await page.selectOption('#voiceLanguage','fr');
  assert.equal(await page.evaluate(()=>window.recognitionTest.aborts),aborts+1);
  await page.click('#voiceSearch');
  assert.equal(await page.evaluate(()=>window.recognitionTest.instances.at(-1).lang),'fr-CA');
  await page.evaluate(()=>{const r=window.recognitionTest.instances.at(-1);r.onresult({results:[[{transcript:'cancer'}]]});r.onend();});
  assert.equal(await page.locator('#q').inputValue(),'cancer');
  await page.selectOption('#appLang','en');
  assert.equal(await page.locator('#voiceLanguage').inputValue(),'fr');
  await page.selectOption('#voiceLanguage','');await page.click('#voiceSearch');
  assert.equal(await page.evaluate(()=>window.recognitionTest.instances.at(-1).lang),'en-CA');
}));
}

test('spoken language control stays hidden without browser recognition',async()=>contextTest(async page=>{
  await page.addInitScript(()=>{
    Object.defineProperty(window,'SpeechRecognition',{value:undefined});
    Object.defineProperty(window,'webkitSpeechRecognition',{value:undefined});
  });
  await page.goto(origin+'/?hospital=jgh');await ready(page);
  assert.equal(await page.locator('#voiceLanguageControl').isVisible(),false);
  assert.equal(await page.locator('#voiceSearch').isVisible(),false);
}));

test('visitor playback selects French and stops on language change, Stop, QR and Escape',async()=>contextTest(async page=>{
  await page.addInitScript(()=>{
    const voices=[{lang:'en-US',default:true},{lang:'fr-FR'},{lang:'fr-CA'}];
    window.voiceTest={spoken:[],cancelled:0};
    Object.defineProperty(window,'SpeechSynthesisUtterance',{value:class{constructor(text){this.text=text;}}});
    Object.defineProperty(window,'speechSynthesis',{value:{
      getVoices:()=>voices,addEventListener(){},cancel(){window.voiceTest.cancelled++;},
      speak(u){window.voiceTest.spoken.push(u);}
    }});
  });
  await page.goto(link({lang:'fr'}));await page.locator('#visitorDialog[open]').waitFor();
  const steps=await page.locator('#vSteps li').allTextContents();
  await page.click('#listen');
  assert.equal(await page.locator('#listen').innerText(),'■ Arrêter');
  assert.deepEqual(await page.evaluate(()=>{
    const u=window.voiceTest.spoken[0];return {text:u.text,lang:u.lang,rate:u.rate};
  }),{text:steps.join(' '),lang:'fr-CA',rate:0.95});
  await page.selectOption('#visitorLang','en');
  assert.equal(await page.evaluate(()=>window.voiceTest.cancelled),1);
  await page.click('#listen');await page.click('#listen');
  assert.equal(await page.locator('#listen').getAttribute('aria-pressed'),'false');
  await page.click('#listen');await page.click('#showQr');
  assert.equal(await page.evaluate(()=>window.voiceTest.cancelled),3);
  await page.click('#qrBack');await page.click('#listen');await page.keyboard.press('Escape');
  await page.waitForFunction(()=>window.voiceTest.cancelled===4);
}));

test('missing French voice and speech errors leave directions visible with feedback',async()=>contextTest(async page=>{
  await page.addInitScript(()=>{
    window.voiceTest={voices:[{lang:'en-US'}],spoken:[]};
    Object.defineProperty(window,'SpeechSynthesisUtterance',{value:class{constructor(text){this.text=text;}}});
    Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>window.voiceTest.voices,
      addEventListener(){},cancel(){},speak(u){window.voiceTest.spoken.push(u);}}});
  });
  await page.goto(link({lang:'fr'}));await page.locator('#visitorDialog[open]').waitFor();
  const before=await page.locator('#vSteps').innerText();
  await page.click('#listen');
  assert.match(await page.locator('#playbackStatus').innerText(),/indisponible/);
  assert.equal(await page.evaluate(()=>window.voiceTest.spoken.length),0);
  await page.evaluate(()=>window.voiceTest.voices=[{lang:'fr-CA'}]);
  await page.click('#listen');await page.evaluate(()=>window.voiceTest.spoken[0].onerror());
  assert.equal(await page.locator('#listen').getAttribute('aria-pressed'),'false');
  assert.match(await page.locator('#playbackStatus').innerText(),/indisponible/);
  assert.equal(await page.locator('#vSteps').innerText(),before);
}));

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

test('JGH keeps French visitor directions across reopening, QR handoff and a different destination',async()=>contextTest(async page=>{
  const jgh=JSON.parse(await fs.readFile(path.join(root,'hospitals/jgh/destinations.json')));
  const d=jgh.find(d=>d.loc==='3rd floor');
  await page.goto(origin+'/?hospital=jgh');await ready(page);
  assert.equal(await page.locator('#appLang').inputValue(),'fr');
  assert.equal(await page.locator('html').getAttribute('lang'),'fr');
  await page.fill('#q',d.fr);await page.locator('#results button').first().click();
  await page.click('#showVisitor');
  assert.equal(await page.locator('#visitorLang').inputValue(),'fr');
  assert.match(await page.locator('#vSteps').innerText(),/3e étage/);
  assert.doesNotMatch(await page.locator('#vSteps').innerText(),/3rd floor/);
  await page.click('#closeVisitor');await page.selectOption('#appLang','en');
  await page.click('#showVisitor');
  assert.equal(await page.locator('#visitorLang').inputValue(),'fr');
  await page.selectOption('#visitorLang','es');await page.click('#closeVisitor');await page.click('#showVisitor');
  assert.equal(await page.locator('#visitorLang').inputValue(),'es');
  await page.selectOption('#visitorLang','fr');await page.click('#showQr');
  const url=await page.locator('#qrCode').getAttribute('title');
  assert.equal(new URL(url).searchParams.get('lang'),'fr');
  await page.goto(url);await page.locator('#visitorDialog[open]').waitFor();
  await page.click('#closeVisitor');
  const next=jgh.find(x=>x.id!==d.id&&x.status==='official');
  await page.fill('#q',next.en);await page.locator('#results button').first().click();
  await page.click('#showVisitor');
  assert.equal(await page.locator('#visitorLang').inputValue(),'fr');
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
  workerRevision=baseRevision;
  await page.goto(link());await page.locator('#visitorDialog[open]').waitFor();
  await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  const other=await context.newPage();await other.goto(link());
  await other.locator('#visitorDialog[open]').waitFor();
  let navigations=0,otherNavigations=0;
  page.on('framenavigated',frame=>{if(frame===page.mainFrame())navigations++;});
  other.on('framenavigated',frame=>{if(frame===other.mainFrame())otherNavigations++;});
  workerRevision=baseRevision+1;
  await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update();});
  await page.waitForFunction(async()=>!!(await navigator.serviceWorker.getRegistration()).waiting);
  assert.equal(navigations,0);
  assert.equal(await page.locator('#visitorDialog').evaluate(d=>d.open),true);
  await page.click('#closeVisitor');await page.click('#applyUpdate');
  await page.waitForFunction(async revision=>(await caches.keys()).includes(`waywey-cache-${revision}`),workerRevision);
  await page.locator('#visitorDialog[open]').waitFor();
  assert.equal(navigations,1);
  assert.equal(otherNavigations,0);
  assert.equal(await other.locator('#visitorDialog').evaluate(d=>d.open),true);
  workerRevision=baseRevision;
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
