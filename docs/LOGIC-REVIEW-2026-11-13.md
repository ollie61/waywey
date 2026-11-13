# Persian, Android speech and application logic review

Baseline: `bfd4ddedc5354371895e87f969d7f1f2f6b9e2c9` (`main`, v0.3.3).
Recovery branch: `backup/pre-audio-logic-review-20261113`.
Review branch: `fix/persian-android-logic-review-20261113`.

This branch is for review. It does not merge or deploy production. Product
version remains 0.3.3 pending a release decision; shell cache advances to 30 so
the changed JavaScript can be offered as an explicit update when deployed.

## Corrections

- Restore Persian route, QR and outdoor-map resources to their correct tables;
  validate every required key for each of the ten selectable visitor languages.
  Add Persian invalid-link recovery labels and preserve RTL in the QR dialog.
- Retain synchronous user-initiated speech with locale fallback, then retry at
  most once if matching voices arrive before speech starts. Bound the complete
  startup attempt to five seconds. Cancelled or replaced requests cannot restart
  through late callbacks; successful `onstart` cancels the watchdog, including
  synchronous callbacks. This replaces the unmerged proposal in PR #16 rather
  than copying its timer races or blocking browsers with empty voice lists.
- Do not substitute English detailed instructions for a different visitor
  language. Use the existing localized generic route when no translation of
  the detailed route is supplied. Add Persian translations of the existing JGH
  H–K and Admissions instructions; no turns, rooms, floors or graph edges change.
- Reject unknown route endpoints and invalid aliases. Resolve station aliases
  consistently with the hospital validator. Preserve explicit unmapped aliases.
- Preserve a successful network response even if caching fails, avoiding a
  fallback to older hospital data solely because device storage is full.
- Build destination pills with text nodes. Restore the ambassador route behind
  a directly opened visitor link. Exclude controls in hidden ancestors from
  dialog focus order; do not focus a dialog that closed before its animation frame.
- Reject impossible calendar dates instead of silently rolling them forward.
  Contain speech-recognition constructor errors so typed search stays usable.
- Extract photo capture from its dense inline script into a readable module.
  Report save success only after IndexedDB commits; prevent double saves and
  destination changes during writes; require a fresh image when replacing a
  saved photo. Keep failed-save previews available to retry, preserve original
  creation timestamps, and release thumbnail URLs even when images fail to load.
  Keep existing database/store names and export format compatible.
- Let the hospital validator accept Persian route instructions. Skip cross-file
  assumptions after schema errors, and reject unknown aliases/duplicate starting
  point IDs. Include photo/redirect edits and Python validator tests in CI.

## Review coverage

| Area | Files reviewed and outcome |
| --- | --- |
| App orchestration | `app.js`, `index.html`, `styles.css`; targeted state, label, RTL and DOM corrections above. |
| Voice | `js/voice-playback.js`, `js/voice-search.js`; lifecycle and error handling corrections, deterministic timer tests. Voice-recognition removal in open PR #9 remains a separate product change. |
| Routing and search | `js/routing.js`, `js/search.js`, `js/visitor-links.js`; routing corrections above, permanent/legacy links and search scoring retained and regression-tested. |
| Display and data | `js/i18n.js`, `js/ui.js`, `js/data.js`, `js/provenance.js`, `js/outdoor-map.js`, `js/accessibility.js`; targeted fixes above. Explicit outdoor-map metadata and source-link handling retained. |
| Offline/update lifecycle | `js/pwa.js`, `service-worker.js`, manifest, icon and five hospital redirects; update consent and per-hospital caching retained, cache-write correction and photo module packaging added. |
| Photo collection | `jgh/photos.html`, extracted `js/photo-capture.js`; persistence and replacement fixes above, with browser tests for aborted transactions and duplicate clicks. |
| Validation/tooling | All four scripts, four schemas, workflow, package/lock files and existing unit/browser tests reviewed. Five hospital packages validated; no inferred hospital facts introduced. |
| Vendored code | `qrcode.min.js` treated as third-party code: integration and generated links are browser-tested; no handwritten changes to the minified library. This is not an independent cryptographic/security audit of that library. |

## Validation and release limits

Run the existing hospital/schema validation, JavaScript syntax checks, smoke
checks, all-hospital search audit, release invariants, Node tests and browser
journeys, plus `python -m unittest discover -s tests -p 'test_*.py'`.

New browser coverage includes Persian route/QR controls in five hospitals, all
ten visitor languages in each hospital, delayed/never-starting Android-style
speech, cancellation, hidden focus targets and photo storage failures.
Mocked browser speech verifies control flow, not audible system TTS.

The local execution environment blocks Chromium's process-singleton socket;
use the branch's GitHub Actions browser results for browser validation.

Before any production release, verify on the affected Android phone/browser:
the intended commit is loaded, its Arabic voice is enumerated, a cold-start
Listen tap produces audible Arabic, Stop/replay works, silent or unavailable
speech shows feedback, and delayed callbacks cannot replay cancelled directions.
Persian speech requires its own installed voice. Translated route wording still
requires normal language/field review; generic fallback cannot supply missing
hospital-specific directions. Existing unmapped-data warnings remain visible.

No finite review proves the absence of every defect. This pass covers the
first-party executable code and corrects the reproducible issues identified;
real-device audio and hospital route facts remain separate verification tasks.
