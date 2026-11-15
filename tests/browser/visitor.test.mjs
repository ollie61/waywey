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
const jgh=JSON.parse(await fs.readFile(path.join(root,'hospitals/jgh/destinations.json')));
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
async function contextTest(run,options={}){
  const context=await browser.newContext(options);
  const page=await context.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try{await run(page,context);assert.deepEqual(errors,[]);}finally{await context.close();}
}

test('JGH root opens directly without accessing microphone recognition',async()=>contextTest(async page=>{
  await page.addInitScript(()=>{
    for(const name of ['SpeechRecognition','webkitSpeechRecognition']){
      Object.defineProperty(window,name,{get(){throw Error('Recognition must not be accessed');}});
    }
  });
  await page.goto(origin+'/');await ready(page);
  assert.equal(await page.locator('#appLang').inputValue(),'fr');
  assert.equal(await page.locator('#voiceSearch,#voiceLanguageControl,#voiceStatus').count(),0);
  assert.equal(await page.locator('.hospital-card').count(),0);
  await page.fill('#q','cardiologie');
  assert.ok(await page.locator('#results button').count()>0);
}));

test('shift language choices survive reload independently and QR language wins',async()=>contextTest(async page=>{
  await page.goto(origin+'/');await ready(page);
  await page.getByRole('button',{name:'EN',exact:true}).click();
  await page.fill('#q','urology');await page.locator('#results button').first().click();
  await page.click('#showVisitor');await page.selectOption('#visitorLang','fa');
  await page.reload();await ready(page);
  assert.equal(await page.locator('#appLang').inputValue(),'en');
  await page.fill('#q','urology');await page.locator('#results button').first().click();
  await page.click('#showVisitor');
  assert.equal(await page.locator('#visitorLang').inputValue(),'fa');
  await page.selectOption('#visitorLang','ar');await page.click('#showQr');
  const qr=await page.locator('#qrCode').getAttribute('title');
  await page.evaluate(()=>sessionStorage.setItem('waywey.jgh.visitorLang','es'));
  await page.goto(qr);await page.locator('#visitorDialog[open]').waitFor();
  assert.equal(await page.locator('#visitorLang').inputValue(),'ar');
  assert.equal(await page.locator('#appLang').inputValue(),'en');
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
  await page.getByRole('button',{name:'EN',exact:true}).click();
  await page.fill('#q',destination.en);
  await page.locator('#results button').first().focus();await page.keyboard.press('Enter');
  assert.match(await page.locator('#steps').innerText(),/floor 1, 2 or 8/);
  if(!(await page.locator('#station').isVisible()))await page.locator('#stationDetails summary').click();await page.selectOption('#station','emergency');
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
  await page.click('#closeVisitor');await page.getByRole('button',{name:'EN',exact:true}).click();
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
    if(!(await page.locator('#station').isVisible()))await page.locator('#stationDetails summary').click();await page.selectOption('#station','main');await page.click('#recoverVisitor');
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

test('Persian directions and QR controls work across all five hospitals',async()=>contextTest(async page=>{
  for(const id of ['jgh','chum','glen','verdun','hadassah-ein-kerem']){
    const config=JSON.parse(await fs.readFile(path.join(root,`hospitals/${id}/config.json`)));
    const data=JSON.parse(await fs.readFile(path.join(root,`hospitals/${id}/destinations.json`)));
    const d=data.find(d=>d.status==='official'&&d.p);
    await page.goto(origin+'/?'+new URLSearchParams({hospital:id,visitor:'1',dest:d.id,from:config.entrances[0].id,lang:'fa'}));
    await page.locator('#visitorDialog[open]').waitFor();
    assert.equal(await page.locator('#visitorPanel').getAttribute('dir'),'rtl');
    assert.equal(await page.locator('#listen').innerText(),'🔊 گوش دادن به راهنما');
    assert.equal(await page.locator('#showQr').innerText(),'▦ نمایش کد QR');
    assert.doesNotMatch(await page.locator('#vSteps').innerText(),/undefined|Take the|Follow the|Use a public|From the/);
    await page.click('#showQr');
    assert.equal(await page.locator('#qrDialog').getAttribute('dir'),'rtl');
    assert.equal(await page.locator('#qrDialog').getAttribute('lang'),'fa');
    assert.equal(await page.locator('#qrTitle').innerText(),'اسکن برای دریافت مسیر');
    assert.match(await page.locator('#qrInstruction').innerText(),/تلفن/);
    const url=await page.locator('#qrCode').getAttribute('title');
    assert.equal(new URL(url).searchParams.get('lang'),'fa');
  }
}));

test('all visitor languages render complete controls in every hospital',async()=>contextTest(async page=>{
  for(const id of ['jgh','chum','glen','verdun','hadassah-ein-kerem']){
    const config=JSON.parse(await fs.readFile(path.join(root,`hospitals/${id}/config.json`)));
    const data=JSON.parse(await fs.readFile(path.join(root,`hospitals/${id}/destinations.json`)));
    const d=data.find(d=>d.status==='official'&&d.p);
    await page.goto(origin+'/?'+new URLSearchParams({hospital:id,visitor:'1',dest:d.id,from:config.entrances[0].id,lang:'en'}));
    await page.locator('#visitorDialog[open]').waitFor();
    for(const lang of ['en','fr','ar','he','es','pt','ru','vi','fa','bg']){
      await page.selectOption('#visitorLang',lang);
      assert.doesNotMatch(await page.locator('#visitorPanel').innerText(),/undefined|\bNaN\b/,`${id}/${lang}`);
      for(const selector of ['#listen','#showQr','#back','#vSteps']){
        assert.ok((await page.locator(selector).innerText()).trim(),`${id}/${lang}/${selector}`);
      }
    }
  }
}));

async function mockDelayedPlayback(page, lang='ar'){
  await page.clock.install();
  await page.addInitScript(()=>{
    window.voiceTest={voices:[],spoken:[],events:{},cancelled:0,warnings:[]};
    console.warn=(...args)=>window.voiceTest.warnings.push(args);
    Object.defineProperty(window,'SpeechSynthesisUtterance',{value:class{constructor(text){this.text=text;}}});
    Object.defineProperty(window,'speechSynthesis',{value:{
      getVoices:()=>window.voiceTest.voices,
      addEventListener:(name,fn)=>window.voiceTest.events[name]=fn,
      cancel:()=>window.voiceTest.cancelled++,
      speak:u=>window.voiceTest.spoken.push(u)
    }});
  });
  await page.goto(link({lang}));
  await page.locator('#visitorDialog[open]').waitFor();
}

test('Android-style delayed voices retry once and successful start survives the timeout',async()=>contextTest(async page=>{
  await mockDelayedPlayback(page);
  await page.click('#listen');
  assert.equal(await page.evaluate(()=>window.voiceTest.spoken[0].lang),'ar');
  await page.evaluate(()=>{
    const t=window.voiceTest;t.voices=[{lang:'ar-SA'}];t.events.voiceschanged();
    t.spoken[0].onerror();t.spoken[0].onend();
    t.events.voiceschanged();
  });
  await page.clock.fastForward(1);
  await page.evaluate(()=>window.voiceTest.spoken[1].onstart());
  await page.clock.fastForward(6000);
  assert.equal(await page.evaluate(()=>window.voiceTest.spoken.length),2);
  assert.equal(await page.locator('#listen').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('#playbackStatus').innerText(),'');
  await page.click('#listen');
  assert.equal(await page.locator('#listen').getAttribute('aria-pressed'),'false');
}));

test('silent Android-style speech surfaces feedback and Stop cancels delayed retries',async()=>contextTest(async page=>{
  await mockDelayedPlayback(page);
  const before=await page.locator('#vSteps').innerText();
  await page.click('#listen');await page.clock.fastForward(5000);
  assert.match(await page.locator('#playbackStatus').innerText(),/الصوت/);
  assert.equal(await page.locator('#listen').getAttribute('aria-pressed'),'false');
  assert.equal(await page.locator('#vSteps').innerText(),before);
  await page.click('#listen');await page.click('#listen');
  await page.evaluate(()=>{
    const t=window.voiceTest;t.voices=[{lang:'ar-SA'}];t.events.voiceschanged();
  });
  await page.clock.fastForward(6000);
  assert.equal(await page.evaluate(()=>window.voiceTest.spoken.length),2);
  assert.equal(await page.locator('#playbackStatus').innerText(),'');
}));

for(const lang of ['ar','fa']){
  test(`${lang}: partial Android voice list attempts locale and end-before-start leaves a visible error`,async()=>contextTest(async page=>{
    await mockDelayedPlayback(page,lang);
    await page.evaluate(()=>window.voiceTest.voices=[{lang:'fr-CA',default:true}]);
    const before=await page.locator('#vSteps').innerText();
    await page.click('#listen');
    assert.deepEqual(await page.evaluate(()=>{
      const u=window.voiceTest.spoken[0];return {lang:u.lang,voice:u.voice||null};
    }),{lang,voice:null});
    await page.evaluate(()=>window.voiceTest.spoken[0].onend());
    assert.equal(await page.locator('#listen').getAttribute('aria-pressed'),'false');
    assert.equal(await page.locator('#playbackStatus').isVisible(),true);
    const message=await page.locator('#playbackStatus').innerText();
    assert.match(message,lang==='ar'?/المتصفح/:/مرورگر/);
    await page.clock.fastForward(6000);
    assert.equal(await page.locator('#playbackStatus').innerText(),message);
    assert.equal(await page.locator('#vSteps').innerText(),before);
    const warning=await page.evaluate(()=>window.voiceTest.warnings[0]);
    assert.equal(warning[1].reason,'end-before-start');
    assert.deepEqual(warning[1].availableLanguages,['fr-ca']);
    assert.equal(warning[1].language,lang);
    assert.equal('text' in warning[1],false);
  }));

  test(`${lang}: listed voice failure tries locale once, blocked retry shows feedback and new tap can recover`,async()=>contextTest(async page=>{
    await mockDelayedPlayback(page,lang);
    await page.evaluate(lang=>window.voiceTest.voices=[{lang:lang+'-XX'}],lang);
    await page.click('#listen');
    await page.evaluate(()=>window.voiceTest.spoken[0].onerror({error:'voice-unavailable'}));
    assert.deepEqual(await page.evaluate(()=>{
      const u=window.voiceTest.spoken[1];return {lang:u.lang,voice:u.voice||null};
    }),{lang,voice:null});
    await page.evaluate(()=>window.voiceTest.spoken[1].onerror({error:'not-allowed'}));
    assert.equal(await page.locator('#listen').getAttribute('aria-pressed'),'false');
    assert.ok((await page.locator('#playbackStatus').innerText()).length>30);
    assert.equal(await page.evaluate(()=>window.voiceTest.warnings[0][1].reason),'not-allowed');
    await page.clock.fastForward(6000);
    assert.equal(await page.evaluate(()=>window.voiceTest.spoken.length),2);
    await page.click('#listen');
    await page.evaluate(()=>window.voiceTest.spoken[2].onstart());
    await page.clock.fastForward(6000);
    await page.evaluate(()=>window.voiceTest.spoken[2].onend());
    assert.equal(await page.locator('#playbackStatus').innerText(),'');
    assert.equal(await page.locator('#listen').getAttribute('aria-pressed'),'false');
  }));
}

test('visitor Tab order excludes controls inside hidden ancestors',async()=>contextTest(async page=>{
  await page.goto(link());await page.locator('#visitorDialog[open]').waitFor();
  await page.evaluate(()=>{
    const back=document.getElementById('back'),hidden=document.createElement('div');
    hidden.hidden=true;back.before(hidden);hidden.append(back);
  });
  await page.locator('#shareVisitor').focus();await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'visitorLang');
}));

const photoFile={name:'sign.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1kAAAAASUVORK5CYII=','base64')};
test('photo saves commit once, survive reload and require a new file for replacement',async()=>contextTest(async page=>{
  await page.goto(origin+'/jgh/photos.html');
  await page.waitForFunction(()=>document.getElementById('status').textContent.includes('Local storage ready'));
  await page.setInputFiles('#uploadInput',photoFile);
  await page.fill('#room','B-114');
  await page.evaluate(()=>{const button=document.getElementById('accept');button.click();button.click();});
  await page.waitForFunction(()=>document.getElementById('status').textContent.includes('Photo saved'));
  assert.match(await page.locator('#counter').innerText(),/^1 accepted photos/);
  await page.reload();
  await page.waitForFunction(()=>document.querySelectorAll('#gallery .thumb').length===1);
  assert.match(await page.locator('#gallery').innerText(),/B-114/);
  await page.setInputFiles('#uploadInput',{...photoFile,name:'unrelated.png'});
  assert.equal(await page.locator('#accept').isEnabled(),true);
  await page.locator('#gallery button').click();
  assert.equal(await page.locator('#accept').isDisabled(),true);
  assert.equal(await page.locator('#preview').isHidden(),true);
  await page.setInputFiles('#uploadInput',{...photoFile,name:'replacement.png'});
  await page.fill('#room','B-115');await page.click('#accept');
  await page.waitForFunction(()=>document.getElementById('status').textContent.includes('Photo saved'));
  assert.match(await page.locator('#counter').innerText(),/^1 accepted photos/);
  assert.match(await page.locator('#gallery').innerText(),/B-115/);
}));

test('aborted photo transactions keep the preview and never report a saved photo',async()=>contextTest(async page=>{
  await page.addInitScript(()=>{
    const put=IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put=function(...args){
      const request=put.apply(this,args);
      if(this.name==='photos')request.addEventListener('success',()=>this.transaction.abort());
      return request;
    };
  });
  await page.goto(origin+'/jgh/photos.html');
  await page.waitForFunction(()=>document.getElementById('status').textContent.includes('Local storage ready'));
  await page.setInputFiles('#uploadInput',photoFile);await page.click('#accept');
  await page.waitForFunction(()=>document.getElementById('status').textContent.includes('Save failed'));
  assert.match(await page.locator('#counter').innerText(),/^0 accepted photos/);
  assert.equal(await page.locator('#preview').isVisible(),true);
  assert.equal(await page.locator('#accept').isEnabled(),true);
  assert.equal(await page.locator('#gallery .thumb').count(),0);
}));

test('1.1 ambassador toggle works by keyboard and persists independently across tabs',async()=>contextTest(async(page,context)=>{
  await page.goto(origin+'/');await ready(page);
  assert.equal(await page.locator('#appLang').isVisible(),false);
  assert.equal(await page.getByRole('button',{name:'FR',exact:true}).getAttribute('aria-pressed'),'true');
  await page.getByRole('button',{name:'EN',exact:true}).focus();await page.keyboard.press('Space');
  assert.equal(await page.locator('#searchHeading').innerText(),'Where to?');
  const other=await context.newPage();await other.goto(origin+'/');await ready(other);
  assert.equal(await other.getByRole('button',{name:'EN',exact:true}).getAttribute('aria-pressed'),'true');
  await other.close();
  await page.getByRole('button',{name:'FR',exact:true}).click();
  assert.equal(await page.locator('#searchHeading').innerText(),'Où allez-vous?');
}));

test('1.1 starting point edits with native disclosure and survives reopening',async()=>contextTest(async page=>{
  await page.goto(origin+'/');await ready(page);
  assert.equal(await page.locator('#station').isVisible(),false);
  await page.locator('#stationDetails summary').click();
  const options=await page.locator('#station option').evaluateAll(nodes=>nodes.map(n=>({value:n.value,text:n.textContent})));
  await page.selectOption('#station',options[1].value);
  assert.equal(await page.locator('#stationDetails').getAttribute('open'),null);
  const shortName=options[1].text.replace(/\s+[—–-]\s+(?=\d{1,6}\b).*$/u,'').trim();
  assert.equal((await page.locator('#stationSummary').innerText()).trim(),shortName);
  assert.equal(await page.locator('#station option:checked').textContent(),options[1].text);
  await page.reload();await ready(page);
  assert.equal(await page.locator('#station').inputValue(),options[1].value);
  assert.equal((await page.locator('#stationSummary').innerText()).trim(),shortName);
}));

test('1.1 visitor primary action, sources and RTL fit narrow and enlarged layouts',async()=>contextTest(async page=>{
  for(const width of [320,390,1280]){
    await page.setViewportSize({width,height:900});
    await page.goto(link({lang:'fa'}));await page.locator('#visitorDialog[open]').waitFor();
    assert.equal(await page.locator('#visitorPanel').getAttribute('dir'),'rtl');
    assert.match(await page.locator('#listen').getAttribute('class'),/primary/);
    assert.match(await page.locator('#showQr').getAttribute('class'),/secondary/);
    await page.locator('#visitorSourceDetails summary').click();
    assert.ok(await page.locator('#visitorSources a').count()>0);
    await page.evaluate(()=>document.documentElement.style.fontSize='200%');
    assert.ok(await page.locator('#visitorDialog').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
    await page.click('#closeVisitor');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  }
}));

test('JGH floor transitions reach visitors in all languages and fit mobile screens',async()=>contextTest(async page=>{
 const admissions=jgh.find(d=>d.loc==='B-114');
 for(const lang of ['en','fr','es','pt','he','ar','ru','vi','fa','bg']){
  await page.setViewportSize({width:390,height:844});
  await page.goto(link({hospital:'jgh',dest:admissions.id,from:'e',lang}));
  await page.locator('#visitorDialog[open]').waitFor();
  const text=await page.locator('#vSteps').innerText();
  assert.match(text,/\[S1\].*\[01\]/,lang);
  assert.match(text,/E → D/,lang);assert.match(text,/D → B/,lang);
  assert.ok(text.indexOf('[S1]')<text.indexOf('E → D'),lang);
  assert.ok(await page.locator('#visitorDialog').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
  await page.click('#closeVisitor');
 }
}));
test('JGH ambassador shares floor logic; same pavilion and unknown floors are safe',async()=>contextTest(async page=>{
 await page.goto(origin+'/?hospital=jgh');await ready(page);
 await page.getByRole('button',{name:'EN',exact:true}).click();
 await page.locator('#stationDetails summary').click();await page.selectOption('#station','e');
 await page.fill('#q','Admissions');await page.locator('#results button').first().click();
 assert.match(await page.locator('#steps').innerText(),/Pavilion E.*\[S1\].*\[01\]/);
 const emergency=jgh.find(d=>d.loc==='S2');
 await page.goto(link({hospital:'jgh',dest:emergency.id,from:'emergency',lang:'en'}));
 await page.locator('#visitorDialog[open]').waitFor();
 assert.doesNotMatch(await page.locator('#vSteps').innerText(),/elevator|\[01\]/);
 const unknown=jgh.find(d=>d.loc==='B-304');
 await page.goto(link({hospital:'jgh',dest:unknown.id,from:'main',lang:'en'}));
 await page.locator('#visitorDialog[open]').waitFor();
 assert.match(await page.locator('#vSteps').innerText(),/Verification required/);
}));

// The [03] fixture tests UI composition without claiming B-304's floor is verified.
test('JGH composes destination elevator after transfer and preserves reverse entrance level',async()=>contextTest(async page=>{
 const room=jgh.find(d=>d.loc==='B-304');
 await page.route('**/hospitals/jgh/destinations.json',route=>route.fulfill({json:jgh.map(d=>d.id===room.id?{...d,floor:'03'}:d)}));
 await page.goto(link({hospital:'jgh',dest:room.id,from:'e',lang:'en'}));
 await page.locator('#visitorDialog[open]').waitFor();
 const steps=await page.locator('#vSteps li').allTextContents();
 assert.match(steps[0],/Pavilion E.*\[S1\].*\[01\]/);
 assert.match(steps.at(-2),/Pavilion B.*\[01\].*\[03\]/);
 assert.match(steps.at(-1),/B-304/);
 const entrance=jgh.find(d=>d.loc==='5757 Légaré');
 await page.goto(link({hospital:'jgh',dest:entrance.id,from:'main',lang:'en'}));
 await page.locator('#visitorDialog[open]').waitFor();
 assert.match(await page.locator('#vSteps').innerText(),/Pavilion E.*\[01\].*\[S1\]/);
}));

test('1.1.2 short prompts, hospital language buttons and RTL work in Hebrew and Arabic',async()=>contextTest(async page=>{
 await page.setViewportSize({width:320,height:820});
 await page.goto(origin+'/?hospital=hadassah-ein-kerem');await ready(page);
 assert.equal(await page.locator('#searchHeading').innerText(),'לאן?');
 assert.deepEqual(await page.locator('[data-app-lang]').allTextContents(),['HE','EN','AR']);
 assert.equal(await page.locator('html').getAttribute('dir'),'rtl');
 await page.getByRole('button',{name:'AR',exact:true}).click();
 assert.equal(await page.locator('#searchHeading').innerText(),'إلى أين؟');
 assert.equal(await page.locator('html').getAttribute('dir'),'rtl');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.getByRole('button',{name:'EN',exact:true}).click();
 assert.equal(await page.locator('#searchHeading').innerText(),'Where to?');
 assert.equal(await page.locator('html').getAttribute('dir'),'ltr');
 assert.equal(await page.locator('#clear').count(),0);
}));
test('1.1.2 visitor defaults and available languages come from the selected hospital',async()=>contextTest(async page=>{
 const config=JSON.parse(await fs.readFile(path.join(root,'hospitals/jgh/config.json')));
 await page.route('**/hospitals/jgh/config.json',route=>route.fulfill({json:{...config,defaultAppLanguage:'en',defaultVisitorLanguage:'fr',visitorLanguages:['fr','en']}}));
 await page.goto(origin+'/?hospital=jgh');await ready(page);
 assert.equal(await page.locator('#appLang').inputValue(),'en');
 assert.deepEqual(await page.locator('#visitorLang option').evaluateAll(nodes=>nodes.map(n=>n.value)),['fr','en']);
 await page.fill('#q','Admissions');await page.locator('#results button').first().click();
 await page.click('#showVisitor');
 assert.equal(await page.locator('#visitorLang').inputValue(),'fr');
 await page.goto(link({hospital:'jgh',dest:jgh.find(d=>d.loc==='B-114').id,lang:'he'}));
 await page.locator('#visitorDialog[open]').waitFor();
 assert.equal(await page.locator('#visitorLang').inputValue(),'fr');
},{serviceWorkers:'block'}));
test('1.1.2 remembered choices stay within their own hospital',async()=>contextTest(async page=>{
 await page.goto(origin+'/?hospital=jgh');await ready(page);
 await page.getByRole('button',{name:'EN',exact:true}).click();
 await page.fill('#q','Admissions');await page.locator('#results button').first().click();await page.click('#showVisitor');
 await page.selectOption('#visitorLang','fa');
 await page.goto(origin+'/?hospital=hadassah-ein-kerem');await ready(page);
 assert.equal(await page.locator('#appLang').inputValue(),'he');
 assert.equal(await page.locator('#visitorLang').inputValue(),'he');
 await page.goto(origin+'/?hospital=jgh');await ready(page);
 assert.equal(await page.locator('#appLang').inputValue(),'en');
 assert.equal(await page.locator('#visitorLang').inputValue(),'fa');
}));

test('JGH 0## rooms use RC and 00## rooms use S1 in visitor instructions',async()=>contextTest(async page=>{
 for(const [loc,floor] of [['E-005','RC'],['E-0012','S1']]){
 const room=jgh.find(d=>d.loc===loc);
 for(const [from,level] of [['main','01'],['e','S1']]){
  await page.goto(link({hospital:'jgh',dest:room.id,from,lang:'en'}));
  await page.locator('#visitorDialog[open]').waitFor();
  const steps=await page.locator('#vSteps li').allTextContents();
  if(from==='e'&&floor==='S1'){assert.equal(steps.length,1);assert.doesNotMatch(steps[0],/elevator/);}
  else assert.match(steps.at(-2),new RegExp('Pavilion E.*\\['+level+'\\].*\\['+floor+'\\]'));
  assert.ok(steps.at(-1).includes(loc));
  if(from==='e'&&floor==='RC')assert.equal(steps.length,2);
 }
 }
}));
