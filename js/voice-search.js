// Progressive-enhancement voice search using the browser Web Speech API.
//
// Voice search is always user-initiated, single-shot and optional. WayWey does
// not upload/store recordings itself. Browser/vendor handling of microphone
// audio is outside WayWey and may vary by browser.

const VOICE_LOCALES={
  en:"en-CA",
  fr:"fr-CA",
  he:"he-IL",
  ar:"ar-IL"
};

export function voiceLocale(lang){
  return VOICE_LOCALES[lang]||"en-CA";
}

export function recognitionConstructor(scope=globalThis){
  return scope&&((scope.SpeechRecognition)||(scope.webkitSpeechRecognition))||null;
}

export function voiceSearchSupported(scope=globalThis){
  return Boolean(recognitionConstructor(scope));
}

export function createVoiceSearch({
  scope=globalThis,
  getLanguage=()=>"en",
  onState=()=>{},
  onResult=()=>{},
  onError=()=>{}
}={}){
  const Ctor=recognitionConstructor(scope);
  if(!Ctor){
    return {
      supported:false,
      start:()=>false,
      stop:()=>{},
      cancel:()=>{},
      isActive:()=>false
    };
  }

  let recognition=null;
  let active=false;

  function setState(state){
    active=state==="starting"||state==="listening";
    onState(state);
  }

  function start(){
    if(active)return false;

    recognition=new Ctor();
    recognition.lang=voiceLocale(getLanguage());
    recognition.continuous=false;
    recognition.interimResults=false;
    recognition.maxAlternatives=1;

    const session=recognition;
    let receivedResult=false;
    let receivedError=false;
    recognition.onstart=()=>{if(recognition===session)setState("listening");};
    recognition.onresult=event=>{
      if(recognition!==session)return;
      const results=event&&event.results;
      if(!results)return;
      for(let i=event.resultIndex||0;i<results.length;i++){
        const result=results[i];
        if(result.isFinal===false)continue;
        const transcript=result[0]&&result[0].transcript;
        if(typeof transcript==="string"&&transcript.trim()){
          receivedResult=true;
          onResult(transcript.trim());
        }
      }
    };
    recognition.onerror=event=>{
      if(recognition!==session)return;
      receivedError=true;
      onError((event&&event.error)||"unknown");
    };
    recognition.onend=()=>{
      if(recognition!==session)return;
      recognition=null;
      setState("idle");
      if(!receivedResult&&!receivedError)onError("no-speech");
    };

    try{
      setState("starting");
      recognition.start();
      return true;
    }catch(error){
      recognition=null;
      setState("idle");
      onError("start");
      return false;
    }
  }

  function stop(){
    if(!recognition)return;
    try{recognition.stop();}catch(error){}
  }

  function cancel(){
    const previous=recognition;
    recognition=null;
    if(!previous)return;
    previous.onstart=previous.onresult=previous.onerror=previous.onend=null;
    try{previous.abort();}catch(error){}
    setState("idle");
  }

  return {
    supported:true,
    start,
    stop,
    cancel,
    isActive:()=>active
  };
}
