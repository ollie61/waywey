# WayWey v0.3.1 — Speech-only route separator refinement

Status: **release candidate / unmerged**. Production `main` remains unchanged.

## Scope

- Browser speech no longer reads the visual `→` arrow in fallback route sequences.
- Speech-only route transitions are localized for all ten supported visitor languages.
- For French, `A → B → C` is spoken as `A, puis B, puis C`. This preserves the same verified sequence, without inventing a right turn.
- The on-screen steps, QR/visitor content, hospital data, search, route calculation, warnings, spoken-language selection and Canadian French voice preference are unchanged.
- No cloud speech service or new permission is introduced.

## Baseline and rollback

Branch: `fix/v0.3.1-spoken-route-arrows`.
Production baseline: `54a8ff808d58dbc89f58e5a835252f58c364c85d` (2026-11-10).
Candidate version: `0.3.1`. Shell cache: `waywey-cache-27` (from 26).
Since `main` is not modified, abandoning the branch provides immediate rollback.
If released, revert the speech formatting changes and advance the service-worker
shell revision again rather than reusing an older cache revision.
The existing pre-v0.3.0 recovery branch is not a substitute for the exact v0.3.1 baseline.

## Validation plan

GitHub Actions `Validate WayWey` should execute:
1. Hospital schema checks, JavaScript syntax, modularization smoke checks.
2. Unit regressions including all ten spoken sequence languages.
3. All-hospital fuzzy-search audit and release-candidate invariants.
4. Playwright visitor-browser journeys.

Human device checks remain required: JGH main entrance to Urology, any route with
pavilion-arrow fallback, a validated detailed route and a verification warning;
Canadian French on Android Chrome and iOS Safari; check that spoken directions
do not imply incorrect turns or omit any documented warning.

Merge gate: **HOLD** until CI and human audio checks complete.
