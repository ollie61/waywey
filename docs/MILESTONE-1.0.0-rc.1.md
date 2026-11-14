# WayWey 1.0.0-rc.1 — review candidate

Date: November 13, 2026. Not deployed. Production remains v0.3.3.

## Scope freeze

JGH is the default entry. No hospital selector or microphone search is shipped.
Other hospital datasets, stable destination IDs, legacy QR links and redirects
remain compatible. No new hospital routes, turns, floors or room sides are inferred.
Optional speech synthesis and the existing JGH photo workflow remain.

## Changes and architecture audit

The candidate starts at PR #20 commit `8447d8a49151742e7d6af1ef3039694615f3ab8b`,
which is based on current main `bfd4ddedc5354371895e87f969d7f1f2f6b9e2c9`.
Its first-party review coverage and coordinated fixes are recorded in
[the logic review](LOGIC-REVIEW-2026-11-13.md). Those fixes are inherited, not new
work claimed by this audit.

Additional fixes:
- Cache-open failures cannot prevent fresh online hospital, shell or root requests.
- Multilingual Python validator tests explicitly read/write UTF-8 on Windows.
- Remove obsolete recognition module, resources, controls, tests and cache entry.
- Remove obsolete hospital-picker rendering, badges and styling.
- Default root/PWA entry to JGH while retaining explicit hospital links.
- Keep ambassador and visitor choices in separate per-hospital session storage;
  a new session starts from the configured French default. Explicit QR visitor
  language and guide-language links take precedence. Station storage is unchanged.
- Shell cache advances to 31; hospital-data cache stays at 1.
- Add a read-only full-file deployment verification tool.

The existing module boundaries for search, routing, data, display, translations,
PWA, accessibility and photos are suitable for this release. A framework rewrite
would add migration risk without resolving a demonstrated blocker. App
orchestration remains concentrated in app.js; defer further extraction until
release-critical behavior is stable. Vendored QR code is integration-tested,
not independently security-audited.

## Verified production baseline

Checked November 13 using public GitHub API and HTTPS responses:
- Main: `bfd4ddedc5354371895e87f969d7f1f2f6b9e2c9`, product 0.3.3, shell cache 29.
- [Main validation](https://github.com/ollie61/waywey/actions/runs/43333855741): success.
- [Pages deployment](https://github.com/ollie61/waywey/actions/runs/43333854182): success.
- Deployment 7753112383 records that same commit and success.
- Live app.js, service-worker.js, js/i18n.js and hospitals/jgh/routes.json matched
  main after line-ending normalization. A subsequent byte-for-byte check of all
  44 shell, redirect and hospital-package files passed; see
  [saved production evidence](evidence/production-baseline-2026-11-13.json). This verifies fetched files, not a phone's
  existing service-worker cache or audible speech.
- No published GitHub releases returned by the releases API.

Merged PRs: #1–7, #10–12, #18–19. Open: #8, #9, #16, #20.
PR #20 incorporates the replacement speech implementation for #16 and the generic
localized-fallback correction from #8; #8 also contains separate Spanish CHUM data.
This candidate implements the microphone removal requested in #9. Do not merge
old branches wholesale into this candidate; review any remaining unique changes.
Existing PRs are left untouched.

## Automated verification

Local checks pass: 71 Node tests, 19 Chrome browser journeys, four Python validator
tests, five hospital schemas, syntax, modularisation smoke and release invariants.
See the draft PR for the final CI head.
All-hospital search covers 636 destinations and 1,954 generated typo cases.
Schema validation retains seven unmapped-node warnings: CHUM B (two entries),
JGH M (three), I and F. These locations remain unrouted and require review.

Speech browser tests use mocks. They establish lifecycle behavior, cancellation,
retry limits and UI feedback; they do not establish actual Android audio quality.

## Blocking release evidence still needed

1. Green CI for the final candidate commit and review of its diff.
2. HTTPS staging candidate with all files verified against that exact commit:
   `node scripts/verify_deployment.mjs STAGING_URL CANDIDATE_SHA`.
3. Owner Android test: Arabic and Persian installed voices; cold Listen tap,
   audible correct-language output, Stop/replay, language switch, unavailable-voice
   feedback and no delayed replay after cancellation. Record phone, OS, browser,
   TTS engine/voice and candidate commit. Repeat French on the same phone.
4. JGH field review: starting stations, H–K wording, Admissions B-114 right turn
   then room on the left, and Pavilion E/elevator/RC paths. Distinguish verified
   wording from generic pavilion routing; do not invent missing directions.
5. Android installed-PWA update from cache 29 to 31: consent, preserved context,
   QR handoff, offline reopening and correct served candidate version.
6. Owner production cutover approval, immutable recovery ref, final 1.0.0 version
   change and new shell revision, final CI, Pages success, full live-file check
   and post-deployment device smoke. Tag 1.0.0 only after these checks.

## Earliest defensible release

No evidence supports a fixed calendar date yet. This is an event-gated release:
stage and test the candidate first; release can follow as soon as device/field
checks pass, resulting corrections pass CI and the owner approves cutover.
There is no technical reason in the audit to reserve the previous two–three weeks,
but device availability, route discrepancies and staging review determine timing.
The owner has agreed to perform Android and JGH checks when a candidate is available.

## Rollback

Existing recovery ref `backup/pre-audio-logic-review-20261113` preserves baseline
`bfd4dde`. No production files or hosting settings are changed by this candidate.
Before cutover reconfirm main and create a named recovery ref for its exact head.
If a deployed release regresses, revert the reviewed release changes on main,
advance the shell revision again (do not reuse an old cache name), pass CI and
verify Pages/live files. Preserve hospital data and photo database/store names.
An old phone cache needs its own update/reopen verification after rollback.
