# French browser playback

Review branch: `improve-french-playback`.
Baseline: `4331bd38d573e2b1ade8457f185741152cf89009`.

## Behavior

Visitor Listen uses the existing validated direction text, including verification
warnings. French prefers an available `fr-CA` voice, then another French voice,
and plays at rate 0.95 instead of 0.78. This selects an existing browser/OS voice;
it does not install a voice or guarantee identical sound on every device.
Other languages retain rate 0.78 and use a matching available voice. No route
translation, destination data or RTL behavior is changed. Visitor directions
start in the current interface language, then preserve the visitor's selection
through reopening and destination changes within the page. An explicit QR
language takes precedence. JGH no longer resets a French selection to its English
hospital default whenever the panel is opened. French location formatting also
converts English floor labels (for example, `3rd floor` to `3e étage`) while
preserving explicit `locFr` values and room codes.
JGH's default interface and visitor languages are now French. A saved interface
preference or explicit visitor/QR language still takes precedence; English
remains selectable.

The voice list is refreshed on `voiceschanged` and each user request. If the
list is still empty, the browser is asked to resolve the requested locale.
If a populated list has no matching language, or speech reports an error,
localized feedback directs the visitor to the visible directions or an
ambassador. There is no explicit fallback to an unrelated language.

Listen becomes Stop during playback. Language changes, destination/start
changes, visitor dialog closure (including Escape and QR handoff), page hiding
and microphone activation cancel playback. Opening visitor directions or
starting playback cancels recognition and discards late recognition callbacks.

No new remote speech service, credentials or audio storage is introduced.
Browser-provided voices may themselves depend on network services; offline
speech is not guaranteed. Existing untranslated route components remain a
separate content issue.

## Rollback

Set `ENHANCED_FRENCH = false` in `js/voice-playback.js` to restore French's
legacy browser-selected voice, `fr` locale and rate 0.78 while retaining Stop,
cancellation and feedback. Advance the shell cache revision when releasing
either direction. Revision 25 packages release v0.3.0 (revision 20 was previously
used by the update regression fixture).

For a complete rollback, revert the voice change commit and publish the restored
assets with a fresh shell cache revision. Keep the existing explicit update
acceptance behavior; do not reuse revision 19 or an already deployed revision.
No hospital data migration is required. The release recovery branch and baseline
are recorded in `MILESTONE-0.3.0.md`.

## Acceptance

Automated coverage includes all ten visitor languages; French Canada/France
selection; delayed and missing voices; unsupported and failing engines; stale
callbacks; Stop; language changes; QR handoff; Escape; existing offline visitor
links, controlled updates and RTL journeys. Run the existing validation workflow
before merging.

Before release, listen on iPhone Safari, Android Chrome and Windows browsers.
Check Canadian French pronunciation of pavilion letters, room numbers, floor
ordinals, hospital names and verification warnings. Compare 0.95 against the
baseline with French-speaking ambassadors. These listening checks cannot be
established by mocked browser speech tests.

Local verification on 2026-11-06: 59 unit tests and thirteen Chrome browser journeys
passed. Hospital schema validation passed for five packages (zero errors and
seven existing unmapped-node warnings). Modularisation, all-hospital search
audit, release-candidate invariants, JavaScript syntax and diff whitespace checks
passed. Real-device listening remains outstanding. No cloud voice was auditioned.

## Microphone-to-search follow-up

Recognition now reads changed final results using `resultIndex` and reports the
existing localized no-speech message if the service ends without a transcript
or error. The query is preserved on empty/failed recognition. Transient page
visibility changes stop playback but no longer cancel recognition, avoiding an
interruption if a native microphone/permission surface hides the page.
Navigation, explicit language changes and visitor playback still cancel it.
Browser tests simulate both recognition constructors, page visibility changes,
French/English transcript insertion, search results, empty recognition, denied
permission and retry. These tests do not establish the cause of a failure on a
particular Android device; its live microphone/service behavior needs a retest
after deployment. Release v0.3.0 promotes the tested changes to production; see
`MILESTONE-0.3.0.md` for the recovery reference and release validation.

## Independent spoken language

The microphone now has a visible Spoken language / Langue parlée selector,
independent of the ambassador interface and visitor playback language. The
default follows the interface; explicit French, English, Hebrew and Arabic
choices use the existing recognition locales. Changing this choice cancels
active recognition without clearing the query. An explicit choice stays selected
when the interface language changes within the page. The selector is hidden
alongside the microphone when recognition is unsupported.

This lets an ambassador use a French interface while requesting English
recognition for English pronunciation of words such as `cancer`. It does not
automatically detect language or run multiple microphone sessions. Browser tests
verify French and English recognition locale selection and query insertion for
`cancer` with both standard and WebKit-prefixed recognition constructors; they
do not evaluate live pronunciation accuracy.

If available device voices remain inadequate, separately audition a consistent
neural Canadian French voice with exact-text versioned audio and browser French
fallback. That service integration is outside this browser-only change.
