import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

async function load(path){
  const source=await fs.readFile(new URL("../"+path,import.meta.url),"utf8");
  return import("data:text/javascript;charset=utf-8,"+encodeURIComponent(source));
}
const voice=await load("js/voice-search.js");

test('recognition constructor failures report an error without breaking typed search',()=>{
  const errors=[];
  class Recognition{constructor(){throw Error('unavailable');}}
  const controller=voice.createVoiceSearch({scope:{SpeechRecognition:Recognition},onError:e=>errors.push(e)});
  assert.equal(controller.start(),false);
  assert.equal(controller.isActive(),false);
  assert.deepEqual(errors,['start']);
});

test("cancel discards late microphone events before playback or language changes",()=>{
  let instance,aborted=false,result=null;
  class Recognition{
    constructor(){instance=this;}
    start(){this.onstart();}
    abort(){aborted=true;}
  }
  const controller=voice.createVoiceSearch({scope:{SpeechRecognition:Recognition},onResult:t=>result=t});
  controller.start();
  const lateResult=instance.onresult,lateEnd=instance.onend;
  controller.cancel();
  lateResult({results:[[{transcript:"queued before cancellation"}]]});
  lateEnd();
  instance.onresult?.({results:[[{transcript:"late"}]]});
  assert.equal(aborted,true);
  assert.equal(result,null);
  assert.equal(controller.isActive(),false);
  assert.equal(controller.start(),true);
  lateEnd();
  assert.equal(controller.isActive(),true);
});

test("voice locale follows ambassador language",()=>{
  assert.equal(voice.voiceLocale("en"),"en-CA");
  assert.equal(voice.voiceLocale("fr"),"fr-CA");
  assert.equal(voice.voiceLocale("he"),"he-IL");
  assert.equal(voice.voiceLocale("ar"),"ar-IL");
});

test("recognition uses the changed final result rather than an older result",()=>{
  let instance,transcript;
  class Recognition{constructor(){instance=this;}start(){this.onstart();}}
  const controller=voice.createVoiceSearch({scope:{SpeechRecognition:Recognition},onResult:t=>transcript=t});
  controller.start();
  const interim=Object.assign([{transcript:"unfinished"}],{isFinal:false});
  instance.onresult({resultIndex:0,results:[interim]});
  assert.equal(transcript,undefined);
  instance.onresult({resultIndex:1,results:[interim,Object.assign([{transcript:" cardiologie "}],{isFinal:true})]});
  assert.equal(transcript,"cardiologie");
});

test("empty recognition reports no speech, while service errors are not overwritten",()=>{
  let instance;
  const errors=[];
  class Recognition{constructor(){instance=this;}start(){this.onstart();}}
  const controller=voice.createVoiceSearch({scope:{SpeechRecognition:Recognition},onError:e=>errors.push(e)});
  controller.start();instance.onend();
  assert.deepEqual(errors,["no-speech"]);
  controller.start();instance.onerror({error:"network"});instance.onend();
  assert.deepEqual(errors,["no-speech","network"]);
  assert.equal(controller.isActive(),false);
});

test("unsupported browsers fail closed",()=>{
  assert.equal(voice.voiceSearchSupported({}),false);
  const controller=voice.createVoiceSearch({scope:{}});
  assert.equal(controller.supported,false);
  assert.equal(controller.start(),false);
});

test("webkit-prefixed recognition is supported",()=>{
  function MockRecognition(){}
  assert.equal(voice.voiceSearchSupported({webkitSpeechRecognition:MockRecognition}),true);
});

test("recognition is single-shot and returns transcript",()=>{
  let instance=null;
  function MockRecognition(){
    instance=this;
    this.start=()=>this.onstart();
    this.stop=()=>this.onend();
  }
  let transcript=null;
  const states=[];
  const controller=voice.createVoiceSearch({
    scope:{SpeechRecognition:MockRecognition},
    getLanguage:()=>"fr",
    onState:s=>states.push(s),
    onResult:t=>{transcript=t;}
  });
  assert.equal(controller.start(),true);
  assert.equal(instance.lang,"fr-CA");
  assert.equal(instance.continuous,false);
  assert.equal(instance.interimResults,false);
  assert.equal(instance.maxAlternatives,1);
  instance.onresult({results:[[{transcript:"  cardiologie  "}]]});
  assert.equal(transcript,"cardiologie");
  instance.onend();
  assert.deepEqual(states,["starting","listening","idle"]);
});

test("errors are surfaced without inventing a transcript",()=>{
  let instance=null;
  function MockRecognition(){
    instance=this;
    this.start=()=>{};
    this.stop=()=>{};
  }
  let error=null;
  let transcript=null;
  const controller=voice.createVoiceSearch({
    scope:{SpeechRecognition:MockRecognition},
    onError:e=>{error=e;},
    onResult:t=>{transcript=t;}
  });
  controller.start();
  instance.onerror({error:"not-allowed"});
  assert.equal(error,"not-allowed");
  assert.equal(transcript,null);
});
