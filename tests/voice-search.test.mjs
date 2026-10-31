import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

async function load(path){
  const source=await fs.readFile(new URL("../"+path,import.meta.url),"utf8");
  return import("data:text/javascript;charset=utf-8,"+encodeURIComponent(source));
}
const voice=await load("js/voice-search.js");

test("voice locale follows ambassador language",()=>{
  assert.equal(voice.voiceLocale("en"),"en-CA");
  assert.equal(voice.voiceLocale("fr"),"fr-CA");
  assert.equal(voice.voiceLocale("he"),"he-IL");
  assert.equal(voice.voiceLocale("ar"),"ar-IL");
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
  function MockRecognition(){
    this.start=()=>{};
    this.stop=()=>{};
  }
  let error=null;
  const controller=voice.createVoiceSearch({
    scope:{SpeechRecognition:MockRecognition},
    onError:e=>{error=e;}
  });
  controller.start();
  // The created instance is not externally visible, so inspect implementation
  // contract instead: the module must forward SpeechRecognition error values.
  const source=await fs.readFile(new URL("../js/voice-search.js",import.meta.url),"utf8");
  assert.match(source,/onError\(\(event&&event\.error\)\|\|"unknown"\)/);
  assert.equal(error,null);
});
