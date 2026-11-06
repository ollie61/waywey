# WayWey v0.3.0 — Voice and language usability

Release date: 2026-11-06.

## Changes

- French visitor speech prefers Canadian French, then another available French
  voice, at rate 0.95. Other languages keep rate 0.78.
- Listen becomes Stop during speech; cancellation and localized failure feedback
  keep visible directions available.
- Visitor directions keep the selected language across reopening, new destinations
  and QR handoff. First opening follows the interface language.
- JGH defaults to French for both interface and visitor directions. Saved explicit
  preferences and QR languages still take precedence.
- French formatting converts English floor labels without altering room codes.
- Spoken search language can be selected independently of the interface, with
  French, English, Hebrew and Arabic recognition locales.
- Recognition handles changed final results and reports empty sessions. Temporary
  page hiding does not cancel microphone results; explicit cancellation discards
  stale events.
- Fuzzy search remains shared by typed and spoken input across available names
  and aliases. Automatic speech language detection is not included.

## Version policy

Increment the visible semantic version for each released bundle: patch for fixes,
minor for additive feature milestones, major for incompatible changes. Keep
service-worker cache revisions separate and advance them whenever shell assets
change. Record release notes and a named pre-release recovery branch each time.
This additive milestone advances 0.2.0 to 0.3.0; its shell cache revision is 25.

## Verification

59 unit tests and 13 browser journeys pass locally, including JGH defaults,
independent microphone languages, speech-to-search fuzzy ranking, QR handoff,
offline reopening, controlled updates and RTL. Recognition is mocked in browser
tests; actual microphone/pronunciation accuracy depends on the browser service.
GitHub Actions validates the release head before merge. See the release PR for
the CI result. A production deployment and smoke check are required after merge.

## Rollback

Named pre-release recovery branch: `backup/pre-v0.3.0-2026-11-06`.
Baseline production commit: `4331bd38d573e2b1ade8457f185741152cf89009`.

The recovery branch preserves the complete pre-release source and hospital data.
For a full rollback, create a new branch from current main, restore the tracked
files from that recovery branch, then advance `SHELL_CACHE` to a never-used
revision greater than the deployed revision before reviewing and merging the
rollback. Do not force-push main or reuse an older shell cache name. Keep the
existing explicit PWA update acceptance flow so active directions are not lost.
No data migration or data-cache reset is needed.

For a smaller French voice rollback, set `ENHANCED_FRENCH = false` in
`js/voice-playback.js` and advance the shell cache revision. That restores legacy
French voice selection and pacing while retaining Stop and failure feedback.

Keep the recovery branch and release tag after deployment. Before any future
release, create another named recovery point from the then-current production
commit. Never overwrite an existing recovery reference.
