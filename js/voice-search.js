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

    recognition.onstart=()=>setState("listening");
    recognition.onresult=event=>{
      const transcript=event&&event.results&&event.results[0]&&event.results[0][0]&&event.results[0][0].transcript;
      if(typeof transcript==="string"&&transcript.trim())onResult(transcript.trim());
    };
    recognition.onerror=event=>{
      onError((event&&event.error)||"unknown");
    };
    recognition.onend=()=>{
      recognition=null;
      setState("idle");
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

  return {
    supported:true,
    start,
    stop,
    isActive:()=>active
  };
}
