# Issue #22: Samsung Android speech

November 14, 2026. Based on main 4032be123968126ef0996bc6d99faeeec654968c.

## Confirmed reports and limits

The owner's latest results supersede the issue's original laptop report: French,
Arabic and Persian are audible on the laptop. Samsung Android Chrome plays French
but not Arabic or Persian. Google's Arabic voice plays in its native preview.
No Samsung voice inventory, Chrome version or speech event trace has been captured
by this change. A precise device-level root cause is therefore still unconfirmed.
No deployment, merge, production setting or device setting was changed.

## Investigation

Three application behaviors were verified in source and reproduced with mocks:

- A nonempty browser voice list missing the requested language immediately rejected
  speech; an empty list instead received a locale attempt. Partial readiness could
  thus behave worse than no enumeration at all.
- An utterance ending without an onstart event silently restored idle without an
  unavailable message. This matches a possible event sequence behind the brief
  Stop-button report; it has not been observed directly on the Samsung.
- A delayed-voice retry cancelled and re-enqueued speech in the same task; error
  codes were discarded, making engine, permission and voice failures indistinguishable.

Browser voice discovery is not equivalent to the engine's native preview.
[Chromium's Android bridge](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/content/public/android/java/src/org/chromium/content/browser/TtsPlatformImpl.java),
inspected on this date, enumerates locales using the default engine's
`isLanguageAvailable(locale) > 0`, builds a browser-specific list, and asynchronously
announces voices. Android also defines language-only availability as zero; see
[Android's API contract](https://developer.android.com/reference/android/speech/tts/TextToSpeech#isLanguageAvailable(java.util.Locale)).
This supplies a concrete reason enumeration can differ from native playback, but
does not establish the installed Samsung Chrome implementation or its actual list.

The [Web Speech API contract](https://webaudio.github.io/web-speech-api/#tts-section)
provides browser voice discovery, locale selection and speech error events. A page
cannot install or guarantee access to an Android engine voice. Native-preview
success must not be treated as proof that Chrome exposes the same voice.

## Targeted changes

- Arabic and Persian get a language-only attempt (`ar` / `fa`, no explicit voice)
  during the Listen tap when Chrome has no matching voice, including partial lists.
  A matching listed voice retains its own locale; underscore separators are
  normalized. French selection and all pacing remain unchanged.
- A listed Arabic/Persian voice that reports a pre-start voice/language/engine
  failure gets at most one unbound language-only retry. No unrelated voice is
  explicitly selected. There is no automatic retry after speech starts or after
  permission, network, audio-device or cancellation errors.
- Empty and partial lists can recover once via voiceschanged. Cancellation callbacks
  are invalidated before cancellation; re-enqueueing waits until the next task.
  Stop, replacement, language changes, dialog closure and page hiding invalidate
  pending retries. The original five-second startup deadline is never extended.
- End without start is a failure. Failed or timed-out playback leaves written
  directions visible and an unavailable message in place. English, French, Arabic
  and Persian messages explain that installed device voices may be unavailable
  to the browser; other languages retain their existing localized fallback.
- A local console warning records only reason, requested/available/selected language
  tags, locale-only mode and start state. No route text, destination, voice name,
  patient data, browser identifier or telemetry is added. Engine error codes are
  retained; a timeout without a prior engine error is marked start-timeout.
- Shell cache advances from 32 to 33 so an eventual approved release offers the
  changed modules. Product version, hospital datasets, DNS and hosting are untouched.

## Verification

- 78 Node regression tests pass, including seven additional speech tests.
- 23 installed-Chrome browser journeys pass, including four additional Arabic and
  Persian journeys covering retained feedback, fallback, permission failure and
  recovery on a fresh user tap.
- Four Python validator tests and all five hospital schemas pass (zero errors,
  seven existing unmapped-location warnings).
- Release-candidate invariants, modularisation smoke, syntax and diff checks pass.

Browser speech is mocked. Tests exercise events, language/voice arguments, timing,
stale callbacks and visible feedback, not sound generation or real Android engines.

## Real-device acceptance still required

Use the exact reviewed commit in an approved isolated test environment; do not
repeatedly change the owner's Android settings or clear old cache evidence.

1. Record Samsung model, Android/Chrome versions, URL and app version. Test French,
   Arabic and Persian on the same device and distinguish audible output from an
   onstart event. Keep the already-working laptop as the comparison.
2. If a language fails, capture the local `WayWey speech unavailable` warning.
   It identifies whether Chrome lists the language and whether it failed before
   start, refused access, ended without start or timed out. Do not include route
   text or personal information in an issue attachment.
3. Verify correct-language audio, Stop/replay, language switching, closing the
   dialog and no delayed replay after cancellation. If the browser cannot synthesize
   Arabic/Persian, verify the localized explanation remains visible with written
   directions and a fresh tap can retry. Do not substitute French for Persian.
4. An engine may emit start/end despite inaudible output. JavaScript cannot certify
   sound at the speaker; that case still requires a real-device event/audio trace.

Keep this PR unmerged and undeployed pending owner approval and device acceptance.
