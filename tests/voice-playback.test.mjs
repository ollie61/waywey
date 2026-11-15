import test from 'node:test';
import assert from 'node:assert/strict';
import {createVoicePlayback, selectVoice, prepareSpeechText} from '../js/voice-playback.js';
import {I18N, PLAYBACK_UI} from '../js/i18n.js';

function mock(voices = [], {autoStart = true} = {}) {
  const events = {}, spoken = [], states = [], errors = [], diagnostics = [];
  let cancelled = 0;
  const timers = new Map();
  let now = 0, nextTimer = 0;
  const synth = {getVoices: () => voices, addEventListener: (name, fn) => events[name] = fn,
    cancel: () => cancelled++, speak: u => {spoken.push(u); if (autoStart) u.onstart();}};
  const controller = createVoicePlayback({scope: {
    speechSynthesis: synth, SpeechSynthesisUtterance: class {constructor(text) {this.text = text;}},
    setTimeout(fn, delay) {const id = nextTimer++; timers.set(id, {fn, at: now + delay}); return id;},
    clearTimeout(id) {timers.delete(id);}
  },
    onState: s => states.push(s), onError: (e, details) => {errors.push(e); diagnostics.push(details);}});
  return {controller, synth, spoken, states, errors, diagnostics, events, cancelled: () => cancelled,
    timers, advance(ms) {
      now += ms;
      for (const [id, timer] of [...timers]) {
        if (timer.at <= now && timers.delete(id)) timer.fn();
      }
    },
    setVoices: list => {
      voices = list; events.voiceschanged();
      // Flush only the cancellation-settling task, not the startup deadline.
      for (const [id, timer] of [...timers]) {
        if (timer.at <= now && timers.delete(id)) timer.fn();
      }
    }};
}
const french = {lang: 'fr-FR', name: 'French', default: true};
const canadian = {lang: 'fr-CA', name: 'Canadian French'};

test('French prefers Canada even when France is default, then falls back to French', () => {
  assert.equal(selectVoice([french, canadian], 'fr'), canadian);
  assert.equal(selectVoice([french], 'fr'), french);
  assert.equal(selectVoice([{lang: 'en-US'}], 'fr'), null);
  const m = mock([french, canadian]);
  m.controller.speak('Prenez les ascenseurs.', 'fr');
  assert.equal(m.spoken[0].voice, canadian);
  assert.equal(m.spoken[0].lang, 'fr-CA');
  assert.equal(m.spoken[0].rate, 0.95);
});

test('all visitor languages retain their text, pacing and matching voices', () => {
  for (const lang of Object.keys(I18N)) {
    assert.ok(PLAYBACK_UI[lang].stop && PLAYBACK_UI[lang].unavailable);
    const voice = {lang: lang + '-XX'};
    const m = mock([voice]);
    m.controller.speak('Directions', lang);
    assert.equal(m.spoken[0].text, 'Directions');
    assert.equal(m.spoken[0].voice, voice);
    assert.equal(m.spoken[0].rate, lang === 'fr' ? 0.95 : 0.78);
  }
});

test('missing matching voices do not select an unrelated language', () => {
  const m = mock([{lang: 'en-US', default: true}]);
  assert.equal(m.controller.speak('Bonjour', 'fr'), false);
  assert.equal(m.spoken.length, 0);
  assert.deepEqual(m.errors, ['unavailable']);
});

test('voices arriving after speech starts do not replay the directions', () => {
  const m = mock();
  m.controller.speak('Bonjour', 'fr');
  assert.equal(m.spoken[0].lang, 'fr-CA');
  m.setVoices([canadian]);
  assert.equal(m.spoken.length, 1);
  m.controller.speak('Bonjour', 'fr');
  assert.equal(m.spoken[1].voice, canadian);
});

test('replacement and stop ignore stale callbacks; real errors and end restore idle', () => {
  const m = mock([canadian]);
  m.controller.speak('A', 'fr');
  const old = m.spoken[0];
  m.controller.speak('B', 'fr');
  old.onerror(); old.onend();
  assert.equal(m.controller.isActive(), true);
  assert.deepEqual(m.errors, []);
  m.controller.stop();
  assert.equal(m.cancelled(), 2);
  m.spoken[1].onerror();
  assert.deepEqual(m.errors, []);
  m.controller.speak('C', 'fr'); m.spoken[2].onerror();
  assert.equal(m.controller.isActive(), false);
  assert.deepEqual(m.errors, ['unavailable']);
  m.controller.speak('D', 'fr'); m.spoken[3].onend();
  assert.equal(m.controller.isActive(), false);
});

test('unsupported and throwing engines leave text usable and report failure', () => {
  const errors = [];
  const c = createVoicePlayback({scope: {}, onError: e => errors.push(e)});
  assert.equal(c.speak('Bonjour', 'fr'), false);
  assert.deepEqual(errors, ['unsupported']);
  const m = mock([canadian]);
  m.synth.speak = () => {throw Error('failed');};
  assert.equal(m.controller.speak('Bonjour', 'fr'), false);
  assert.equal(m.controller.isActive(), false);
  assert.deepEqual(m.errors, ['unavailable']);
});

test('French enhancement can be rolled back to legacy voice selection and rate', () => {
  let utterance;
  const c = createVoicePlayback({enhancedFrench: false, scope: {
    speechSynthesis: {getVoices: () => [canadian], speak: u => utterance = u, cancel() {}},
    SpeechSynthesisUtterance: class {}
  }});
  c.speak('Bonjour', 'fr');
  assert.equal(utterance.lang, 'fr');
  assert.equal(utterance.voice, undefined);
  assert.equal(utterance.rate, 0.78);
  c.stop();
});

test('spoken route arrows become localized sequence words without modifying visible route data',()=>{
  const route='Pavillon A → Pavillon B → Urologie.';
  assert.equal(prepareSpeechText(route,'fr'),'Pavillon A, puis Pavillon B, puis Urologie.');
  assert.equal(route,'Pavillon A → Pavillon B → Urologie.');
  const link='Continuez tout droit puis tournez à droite.';
  assert.equal(prepareSpeechText(link,'fr'),link);
  const transitions={en:'then',fr:'puis',es:'luego',pt:'depois',ar:'ثم',he:'ואז',ru:'затем',vi:'sau đó',fa:'سپس',bg:'след това'};
  assert.deepEqual(Object.keys(transitions).sort(),Object.keys(I18N).sort());
  for(const [lang,transition] of Object.entries(transitions)){
    const result=prepareSpeechText('A → B',lang);
    assert.equal(result,`A, ${transition} B`,lang);
    assert.equal(result.includes('→'),false,lang);
  }
  assert.equal(prepareSpeechText('A → B','fr-CA'),'A, puis B');
});

test('speech engine receives natural French wording, not the displayed arrow symbol',()=>{
  const m=mock([canadian]);
  const visible='Suivez les indications : pavillon A → pavillon B.';
  m.controller.speak(visible,'fr');
  assert.equal(m.spoken[0].text,'Suivez les indications : pavillon A, puis pavillon B.');
  assert.equal(m.spoken[0].voice,canadian);
  assert.equal(m.spoken[0].rate,0.95);
  assert.equal(visible,'Suivez les indications : pavillon A → pavillon B.');
});


test('Arabic prefers ar-SA, Persian prefers fa-IR, and both preserve speech locale',()=>{
 const ar={lang:'ar-SA'},other={lang:'ar-EG'},fa={lang:'fa-IR'};
 assert.equal(selectVoice([other,ar],'ar'),ar);
 assert.equal(selectVoice([fa],'fa'),fa);
 const m=mock([ar]);assert.equal(m.controller.speak('اتبع الإشارات','ar'),true);
 assert.equal(m.spoken[0].lang,'ar-SA');
 const p=mock([fa]);assert.equal(p.controller.speak('مسیر را دنبال کنید','fa'),true);
 assert.equal(p.spoken[0].lang,'fa-IR');
});

test('a silent locale attempt retries once when delayed Android voices arrive', () => {
  const m = mock([], {autoStart: false});
  m.controller.speak('اتبع الإشارات', 'ar');
  const first = m.spoken[0];
  assert.equal(first.lang, 'ar');
  assert.equal(m.states.at(-1), 'loading');
  m.setVoices([{lang: 'ar-SA'}]);
  assert.equal(m.spoken.length, 2);
  assert.equal(m.cancelled(), 1);
  first.onstart(); first.onerror(); first.onend();
  assert.equal(m.states.at(-1), 'loading');
  assert.equal(m.controller.isActive(), true);
  assert.deepEqual(m.errors, []);
  m.setVoices([{lang: 'ar-SA'}]);
  assert.equal(m.spoken.length, 2);
  m.spoken[1].onstart();
  m.advance(6000);
  assert.equal(m.controller.isActive(), true);
  assert.equal(m.timers.size, 0);
  m.spoken[1].onend();
  assert.equal(m.controller.isActive(), false);
});

test('an early unavailable error can recover after voiceschanged', () => {
  const m = mock([], {autoStart: false});
  m.controller.speak('راهنما', 'fa');
  m.spoken[0].onerror();
  m.setVoices([{lang: 'fa-IR'}]);
  assert.equal(m.spoken.length, 2);
  m.spoken[1].onstart();
  assert.deepEqual(m.errors, []);
  assert.equal(m.timers.size, 0);
});

test('silent startup expires once and late voices cannot restart cancelled speech', () => {
  for (const voices of [[], [{lang: 'ar-SA'}]]) {
    const m = mock(voices, {autoStart: false});
    m.controller.speak('اتبع الإشارات', 'ar');
    m.advance(5000);
    assert.equal(m.controller.isActive(), false);
    assert.deepEqual(m.errors, ['unavailable']);
    m.setVoices([{lang: 'ar-SA'}]);
    m.spoken[0].onstart(); m.spoken[0].onerror(); m.spoken[0].onend();
    m.advance(10000);
    assert.equal(m.spoken.length, 1);
    assert.deepEqual(m.errors, ['unavailable']);
  }
});

test('Stop and replacement invalidate pending retries and watchdogs', () => {
  const m = mock([], {autoStart: false});
  m.controller.speak('old', 'ar');
  m.controller.stop();
  m.setVoices([{lang: 'ar-SA'}]);
  assert.equal(m.spoken.length, 1);
  assert.equal(m.timers.size, 0);
  m.controller.speak('new', 'ar');
  m.spoken[0].onstart(); m.spoken[0].onerror();
  m.advance(5000);
  assert.deepEqual(m.errors, ['unavailable']);
  assert.equal(m.controller.isActive(), false);
});

test('retries do not extend the startup deadline and voices-list errors are contained', () => {
  const m = mock([], {autoStart: false});
  m.synth.getVoices = () => {throw Error('engine initializing');};
  assert.equal(m.controller.speak('راهنما', 'fa'), true);
  m.advance(4000);
  m.synth.getVoices = () => [{lang: 'fa-IR'}];
  m.events.voiceschanged();
  m.advance(0);
  assert.equal(m.spoken.length, 2);
  m.advance(1000);
  assert.deepEqual(m.errors, ['unavailable']);
});

test('synchronous start clears the watchdog and locale tags are normalized', () => {
  const voice = {lang: 'ar_SA'};
  const m = mock([voice]);
  assert.equal(selectVoice([voice], 'AR_sa'), voice);
  m.controller.speak('اتبع الإشارات', 'AR_sa');
  assert.equal(m.timers.size, 0);
  m.advance(6000);
  assert.deepEqual(m.errors, []);
});

test('a partial browser voice list still attempts Arabic and Persian during the tap', () => {
  for (const lang of ['ar', 'fa']) {
    const m = mock([{lang: 'fr-CA', default: true}]);
    assert.equal(m.controller.speak('Directions', lang), true);
    assert.equal(m.spoken.length, 1);
    assert.equal(m.spoken[0].lang, lang);
    assert.equal(m.spoken[0].voice, undefined);
    assert.deepEqual(m.errors, []);
  }
});

test('a compatible voice arriving after a partial list is retried after cancellation settles', () => {
  const m = mock([{lang: 'fr-CA'}], {autoStart: false});
  m.controller.speak('راهنما', 'fa');
  const first = m.spoken[0];
  m.synth.getVoices = () => [{lang: 'fr-CA'}, {lang: 'fa_IR'}];
  m.events.voiceschanged();
  assert.equal(m.cancelled(), 1);
  assert.equal(m.spoken.length, 1);
  first.onend(); first.onerror({error: 'canceled'});
  m.advance(0);
  assert.equal(m.spoken.length, 2);
  assert.equal(m.spoken[1].lang, 'fa-IR');
  m.spoken[1].onstart(); m.advance(5000);
  assert.deepEqual(m.errors, []);
});

test('end without start reports failure instead of silently claiming success', () => {
  for (const lang of ['ar', 'fa', 'fr']) {
    const m = mock([{lang}], {autoStart: false});
    m.controller.speak('Private route text', lang);
    m.spoken[0].onend();
    assert.equal(m.controller.isActive(), false);
    assert.deepEqual(m.errors, ['unavailable']);
    assert.equal(m.diagnostics[0].reason, 'end-before-start');
    assert.ok(!JSON.stringify(m.diagnostics).includes('Private route text'));
    m.advance(10000);
    assert.equal(m.errors.length, 1);
  }
});

test('listed Arabic/Persian voice errors retry locale-only once within the original deadline', () => {
  for (const lang of ['ar', 'fa']) {
    for (const error of ['voice-unavailable', 'language-unavailable', 'synthesis-failed', 'synthesis-unavailable']) {
      const m = mock([{lang: lang + '-XX'}], {autoStart: false});
      m.controller.speak('Directions', lang);
      const first = m.spoken[0];
      m.advance(4000); first.onerror({error});
      assert.equal(m.spoken.length, 2);
      assert.equal(m.cancelled(), 0);
      assert.equal(m.spoken[1].lang, lang);
      assert.equal(m.spoken[1].voice, undefined);
      first.onstart(); first.onend(); first.onerror({error});
      assert.equal(m.states.at(-1), 'loading');
      m.advance(1000);
      assert.deepEqual(m.errors, ['unavailable']);
      assert.equal(m.diagnostics[0].reason, error);
      assert.equal(m.diagnostics[0].localeOnly, true);
    }
  }
});

test('locale fallback can start and complete, but never retries a post-start error', () => {
  const m = mock([{lang: 'ar-SA'}], {autoStart: false});
  m.controller.speak('Directions', 'ar');
  m.spoken[0].onerror({error: 'voice-unavailable'});
  m.spoken[1].onstart(); m.advance(6000); m.spoken[1].onend();
  assert.deepEqual(m.errors, []);
  assert.equal(m.controller.isActive(), false);
  m.controller.speak('Directions', 'ar');
  m.spoken[2].onstart(); m.spoken[2].onerror({error: 'synthesis-failed'});
  assert.equal(m.spoken.length, 3);
  assert.deepEqual(m.errors, ['unavailable']);
});

test('terminal errors are not hidden or retried even while voices are loading', () => {
  for (const voices of [[], [{lang: 'ar-SA'}]]) {
    for (const error of ['not-allowed', 'network', 'audio-busy', 'audio-hardware', 'canceled', 'interrupted']) {
      const m = mock(voices, {autoStart: false});
      m.controller.speak('Directions', 'ar');
      m.spoken[0].onerror({error});
      assert.equal(m.spoken.length, 1);
      assert.deepEqual(m.errors, ['unavailable']);
      assert.equal(m.diagnostics[0].reason, error);
      assert.equal(m.timers.size, 0);
    }
  }
});

test('Stop cancels a queued voice-readiness retry without later replay', () => {
  const m = mock([], {autoStart: false});
  m.controller.speak('Directions', 'ar');
  m.synth.getVoices = () => [{lang: 'ar-SA'}];
  m.events.voiceschanged();
  m.controller.stop(); m.advance(0); m.advance(6000);
  assert.equal(m.spoken.length, 1);
  assert.deepEqual(m.errors, []);
  assert.equal(m.timers.size, 0);
});

test('square brackets are visual only and never reach any speech locale',()=>{
 const visible='[01] → [RC] → [S1]. [03]';
 for(const lang of [...Object.keys(I18N),'sw','fr-CA','ar-SA','he-IL','fa-IR','xx']){
  const text=prepareSpeechText(visible,lang);
  assert.doesNotMatch(text,/[\[\]]/,lang);
  for(const level of ['01','RC','S1','03'])assert.ok(text.includes(level),lang);
  const m=mock([{lang}]);m.controller.speak(visible,lang);
  assert.equal(m.spoken.length,1,lang);assert.doesNotMatch(m.spoken[0].text,/[\[\]]/,lang);
 }
 assert.equal(visible,'[01] → [RC] → [S1]. [03]');
});
