// Set false to restore legacy browser voice selection and pacing.
export const ENHANCED_FRENCH = true;

export function selectVoice(voices, lang) {
  const base = lang.toLowerCase().split('-')[0];
  const matching = voices.filter(v => v.lang.toLowerCase().replaceAll('_', '-').split('-')[0] === base);
  return (base === 'ar' && matching.find(v => v.lang.toLowerCase().replaceAll('_', '-') === 'ar-sa'))
    || (base === 'fa' && matching.find(v => v.lang.toLowerCase().replaceAll('_', '-') === 'fa-ir'))
    || (base === 'fr' && matching.find(v => v.lang.toLowerCase().replaceAll('_', '-') === 'fr-ca'))
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
  const sequence=SPOKEN_SEQUENCE[String(lang||"").toLowerCase().split("-")[0]];
  if(!sequence)return text;
  return text.replace(/\s*→\s*/g,`, ${sequence} `);
}

export function createVoicePlayback({scope = globalThis, enhancedFrench = ENHANCED_FRENCH, onState = () => {}, onError = () => {}} = {}) {
  const synth = scope.speechSynthesis;
  const supported = Boolean(synth && scope.SpeechSynthesisUtterance);
  let current = null;
  let voices = [];
  function refreshVoices() {
    try { voices = synth.getVoices() || []; } catch { voices = []; }
  }
  if (supported) {
    refreshVoices();
    synth.addEventListener?.('voiceschanged', refreshVoices);
  }
  function stop() {
    const wasActive = Boolean(current);
    current = null; // Ignore late end/error callbacks from cancelled utterances.
    if (wasActive) {
      try { synth.cancel(); } catch {}
      onState('idle');
    }
  }
  function speak(text, lang) {
    stop();
    if (!supported) { onError('unsupported'); return false; }
    if (!text.trim()) return false;
    refreshVoices();
    const enhanced = lang === 'fr' && enhancedFrench;
    const voice = selectVoice(voices, lang);
    // An empty list can mean that voices are still loading. Let the browser
    // resolve the requested locale; surface any language-unavailable error.
    if (voices.length && !voice) { onError('unavailable'); return false; }
    try {
      const utterance = new scope.SpeechSynthesisUtterance(prepareSpeechText(text, lang));
      utterance.lang = enhanced ? 'fr-CA' : (lang === 'ar' ? 'ar-SA' : lang === 'fa' ? 'fa-IR' : lang);
      if (voice && (lang !== 'fr' || enhanced)) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      }
      utterance.rate = enhanced ? 0.95 : 0.78;
      utterance.pitch = 1;
      utterance.onend = () => {
        if (current !== utterance) return;
        current = null;
        onState('idle');
      };
      utterance.onerror = () => {
        if (current !== utterance) return;
        current = null;
        onState('idle');
        onError('unavailable');
      };
      current = utterance;
      onState('speaking');
      synth.speak(utterance);
      return true;
    } catch {
      stop();
      onError('unavailable');
      return false;
    }
  }
  return {supported, speak, stop, isActive: () => Boolean(current)};
}
