import test from 'node:test';
import assert from 'node:assert/strict';
import {createVoicePlayback, selectVoice} from '../js/voice-playback.js';
import {I18N, PLAYBACK_UI} from '../js/i18n.js';

function mock(voices = []) {
  const events = {}, spoken = [], states = [], errors = [];
  let cancelled = 0;
  const synth = {getVoices: () => voices, addEventListener: (name, fn) => events[name] = fn,
    cancel: () => cancelled++, speak: u => spoken.push(u)};
  const controller = createVoicePlayback({scope: {speechSynthesis: synth, SpeechSynthesisUtterance: class {constructor(text) {this.text = text;}}},
    onState: s => states.push(s), onError: e => errors.push(e)});
  return {controller, synth, spoken, states, errors, events, cancelled: () => cancelled,
    setVoices: list => {voices = list; events.voiceschanged();}};
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

test('delayed voices are used on the next user request without automatic playback', () => {
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
});
