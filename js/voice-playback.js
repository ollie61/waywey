// Set false to restore legacy browser voice selection and pacing.
export const ENHANCED_FRENCH = true;
const START_TIMEOUT_MS = 5000;

function languageTag(lang) {
  return String(lang || '').toLowerCase().replaceAll('_', '-');
}

export function selectVoice(voices, lang) {
  const base = languageTag(lang).split('-')[0];
  const matching = voices.filter(v => languageTag(v.lang).split('-')[0] === base);
  const preferred = {ar: 'ar-sa', fa: 'fa-ir', fr: 'fr-ca'}[base];
  return matching.find(v => languageTag(v.lang) === preferred)
    || matching.find(v => v.default) || matching[0] || null;
}

// Route arrows are visual separators, not words for a screen reader-style TTS voice.
// Preserve the displayed route verbatim and describe only its existing sequence;
// do not infer turns, landmarks, or floors from the arrow.
const SPOKEN_SEQUENCE={
  en:"then",fr:"puis",es:"luego",pt:"depois",ar:"ثم",
  he:"ואז",ru:"затем",vi:"sau đó",fa:"سپس",bg:"след това"
};

export function prepareSpeechText(text,lang){
  const sequence=SPOKEN_SEQUENCE[languageTag(lang).split("-")[0]];
  if(!sequence)return text;
  return text.replace(/\s*→\s*/g,`, ${sequence} `);
}

export function createVoicePlayback({scope = globalThis, enhancedFrench = ENHANCED_FRENCH, onState = () => {}, onError = () => {}} = {}) {
  const synth = scope.speechSynthesis;
  const supported = Boolean(synth && scope.SpeechSynthesisUtterance);
  let current = null;
  let voices = [];
  let startTimer = null;
  const schedule = (scope.setTimeout || globalThis.setTimeout).bind(scope);
  const unschedule = (scope.clearTimeout || globalThis.clearTimeout).bind(scope);

  function clearStartTimer() {
    if (startTimer !== null) unschedule(startTimer);
    startTimer = null;
  }
  function refreshVoices() {
    try { voices = synth.getVoices() || []; } catch { voices = []; }
  }
  if (supported) {
    refreshVoices();
    synth.addEventListener?.('voiceschanged', () => {
      refreshVoices();
      const request = current;
      if (!request || request.started || !request.awaitingVoices || request.retried) return;
      if (!selectVoice(voices, request.lang)) return;
      request.retried = true;
      request.utterance = null; // Ignore cancellation callbacks from the first attempt.
      try { synth.cancel(); } catch {}
      play(request);
    });
  }
  function stop() {
    const wasActive = Boolean(current);
    current = null; // Invalidate the entire request, including delayed voice retries.
    clearStartTimer();
    if (wasActive) {
      try { synth.cancel(); } catch {}
      onState('idle');
    }
  }
  function fail(request) {
    if (current !== request) return;
    stop();
    onError('unavailable');
  }
  function play(request) {
    const {text, lang} = request;
    const base = languageTag(lang).split('-')[0];
    const enhanced = base === 'fr' && enhancedFrench;
    const voice = selectVoice(voices, lang);
    if (voices.length && !voice) { fail(request); return false; }
    request.awaitingVoices = !voices.length;
    try {
      const utterance = new scope.SpeechSynthesisUtterance(prepareSpeechText(text, lang));
      utterance.lang = enhanced ? 'fr-CA' : ({ar: 'ar-SA', fa: 'fa-IR'}[base] || lang);
      if (voice && (base !== 'fr' || enhanced)) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      }
      utterance.rate = enhanced ? 0.95 : 0.78;
      utterance.pitch = 1;
      const isCurrent = () => current === request && request.utterance === utterance;
      utterance.onstart = () => {
        if (!isCurrent()) return;
        request.started = true;
        clearStartTimer();
        onState('speaking');
      };
      utterance.onend = () => {
        if (!isCurrent()) return;
        current = null;
        clearStartTimer();
        onState('idle');
      };
      utterance.onerror = () => {
        if (!isCurrent()) return;
        // An empty initial list may settle after an early engine error. Keep
        // that one request pending until voices arrive or its deadline expires.
        if (!request.started && request.awaitingVoices && !request.retried) {
          request.utterance = null;
          return;
        }
        fail(request);
      };
      request.utterance = utterance;
      onState('loading');
      // Invoke speech during the user's click, even when the voice list is
      // empty. Some engines can resolve the locale without enumerating voices.
      synth.speak(utterance);
      return true;
    } catch {
      fail(request);
      return false;
    }
  }
  function speak(text, lang) {
    stop();
    if (!supported) { onError('unsupported'); return false; }
    if (typeof text !== 'string' || !text.trim()) return false;
    refreshVoices();
    const request = {text, lang, started: false, retried: false, utterance: null};
    current = request;
    // Arm before speak: engines/mocks may call onstart synchronously. A retry
    // uses the same deadline, so repeated voiceschanged events cannot extend it.
    startTimer = schedule(() => fail(request), START_TIMEOUT_MS);
    return play(request);
  }
  return {supported, speak, stop, isActive: () => Boolean(current)};
}
