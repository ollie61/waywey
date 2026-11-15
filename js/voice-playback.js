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
  // Brackets are visual level delimiters, never spoken punctuation in any locale.
  text=String(text??"").replace(/[\[\]]/g,"");
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
  let retryTimer = null;
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
      // Let cancellation settle before enqueueing a replacement on Android.
      retryTimer = schedule(() => {
        retryTimer = null;
        if (current === request) play(request);
      }, 0);
    });
  }
  function stop() {
    const wasActive = Boolean(current);
    current = null; // Invalidate the entire request, including delayed voice retries.
    clearStartTimer();
    if (retryTimer !== null) unschedule(retryTimer);
    retryTimer = null;
    if (wasActive) {
      try { synth.cancel(); } catch {}
      onState('idle');
    }
  }
  function fail(request, reason = request.lastError || 'start-timeout') {
    if (current !== request) return;
    const details = {
      reason, language: languageTag(request.lang),
      availableLanguages: [...new Set(voices.map(v => languageTag(v.lang)))].sort(),
      selectedLanguage: request.utterance?.lang || null,
      localeOnly: Boolean(request.localeOnly), started: request.started
    };
    stop();
    onError('unavailable', details);
  }
  function play(request) {
    const {text, lang} = request;
    const base = languageTag(lang).split('-')[0];
    const enhanced = base === 'fr' && enhancedFrench;
    const selected = selectVoice(voices, lang);
    // Android Chrome's language enumeration can omit an installed voice.
    // Give Arabic/Persian one locale-only attempt during the user's tap,
    // without falling back to an unrelated default voice.
    const allowLocale = base === 'ar' || base === 'fa';
    const voice = request.forceLocale ? null : selected;
    if (voices.length && !voice && !allowLocale) { fail(request, 'language-unavailable'); return false; }
    request.localeOnly = allowLocale && !voice;
    request.awaitingVoices = !selected && !request.forceLocale;
    try {
      const utterance = new scope.SpeechSynthesisUtterance(prepareSpeechText(text, lang));
      utterance.lang = enhanced ? 'fr-CA' : (request.localeOnly ? base : lang);
      if (voice && (base !== 'fr' || enhanced)) {
        utterance.voice = voice;
        utterance.lang = String(voice.lang).replaceAll('_', '-');
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
        // Some engines finish an unsupported request without ever starting it.
        // Do not silently clear the button as if directions were spoken.
        if (!request.started) { fail(request, 'end-before-start'); return; }
        current = null;
        clearStartTimer();
        onState('idle');
      };
      utterance.onerror = event => {
        if (!isCurrent()) return;
        const reason = event?.error || 'synthesis-failed';
        request.lastError = reason;
        // A listed voice may be unusable. Retry only a pre-start engine/voice
        // failure once, without binding that voice. The failed utterance has
        // ended, so cancel() here would only risk cancelling its replacement.
        if (allowLocale && voice && !request.started && !request.retried &&
            ['voice-unavailable', 'language-unavailable', 'synthesis-unavailable', 'synthesis-failed'].includes(reason)) {
          request.retried = true;
          request.forceLocale = true;
          request.utterance = null;
          play(request);
          return;
        }
        // An incomplete initial list may settle after an early engine error. Keep
        // that one request pending until voices arrive or its deadline expires.
        if (!request.started && request.awaitingVoices && !request.retried &&
            !['not-allowed', 'canceled', 'interrupted', 'audio-busy', 'audio-hardware', 'network'].includes(reason)) {
          request.utterance = null;
          return;
        }
        fail(request, reason);
      };
      request.utterance = utterance;
      onState('loading');
      // Invoke speech during the user's click, even when the voice list is
      // empty. Some engines can resolve the locale without enumerating voices.
      synth.speak(utterance);
      return true;
    } catch {
      fail(request, 'speak-exception');
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
