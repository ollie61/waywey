# WayWey milestone v0.2.0

## Purpose

This branch is the controlled engineering milestone for the next WayWey release.

The public production application remains on `main` until reviewed changes are explicitly merged.

## Rollback baseline

- Baseline branch: `backup/pre-v0.2.0-2026-10-30`
- Baseline commit: `0cd3bc919378b76e09f94ee1168009f52fef8880`
- Working branch: `milestone/v0.2.0`

The backup branch is a point-in-time copy of WayWey immediately before milestone work began. It should not receive milestone changes.

## Change-control rule

Each major step should:

1. be committed separately on the milestone branch;
2. preserve current behaviour unless the step explicitly changes it;
3. include validation/tests appropriate to the change;
4. be reviewed before the next major step begins;
5. identify a rollback commit or branch.

## Planned order

1. Data-integrity foundation: JSON schemas, validator and CI.
2. Modularise the application engine and extract i18n.
3. Search/ranking improvements and automated search/routing tests.
4. PWA caching/update/offline improvements.
5. Trust/data provenance UI (audit dates, source links, Verify treatment).
6. Accessibility and mobile UX pass.
7. Optional enhancements (voice search, outdoor maps, location assistance).

The order may be adjusted after review, but later steps should not be started before the preceding major step is accepted.


## Step status

### Step 1 — Data-integrity foundation — COMPLETE
- JSON schemas added for config, destinations, routes and guides.
- Cross-file validator added.
- GitHub Actions validation added.
- Existing data-model exceptions documented rather than altered.
- CI passes across all current hospital packages.

### Step 2 — Application modularisation — COMPLETE
- Shared language resources moved to `js/i18n.js`.
- Search logic moved to `js/search.js`.
- Routing logic moved to `js/routing.js`.
- Shared formatting/presentation helpers moved to `js/ui.js`.
- Data-loading helpers moved to `js/data.js`.
- `app.js` reduced from roughly 540 lines to roughly 360 lines and now serves mainly as the orchestration layer.
- `index.html` now loads the app as an ES module.
- Service worker updated to cache the module files.
- JavaScript module syntax and dependency-free refactor smoke checks added to CI.
- Working milestone version set to `v0.2.0`.
- Production `main` remains unchanged pending review.
