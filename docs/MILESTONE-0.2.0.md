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


### Step 3 — Search quality and formal routing/search tests — COMPLETE
- Added conservative typo-tolerant fuzzy matching.
- Added weighted ranking for canonical names, aliases and locations.
- Room/location codes now match even when punctuation/spaces are omitted (for example, E-959 vs E959).
- Official records receive only a small tie-break preference; an exact Verify match still outranks an unrelated official fuzzy match.
- Stable ranking preserves dataset order when scores are equal.
- Added formal Node unit tests for search normalization, aliases, fuzzy matching, room numbers, status ranking and query-language detection.
- Added formal Node unit tests for shortest-path routing, missing-route safety, aliases, null/unmapped nodes and slash-separated pavilion resolution.
- CI runs all new tests with no added runtime or testing framework dependency.
- Working milestone remains `v0.2.0`; service-worker cache advanced independently to `waywey-cache-9`.


### Step 4 — PWA caching, offline state and updates — COMPLETE
- Replaced all-hospital precaching with a small shared application-shell cache.
- Hospital JSON is now network-first and stored in a separate persistent data cache only after that hospital is used.
- The selected hospital package is explicitly warmed after load so first-time online use prepares it for later offline use.
- Clean hospital redirect pages are cached with the selected hospital package for offline return visits.
- Added a visible localized offline indicator in English, French, Hebrew and Arabic.
- Added controlled service-worker update handling: new workers wait until the user chooses Update, then activate and reload once.
- Removed automatic install-time `skipWaiting()` to avoid silently replacing code mid-session.
- Added a generic multi-hospital PWA manifest and WayWey install icon.
- Added PWA regression tests confirming hospital datasets are not in the shell precache, dynamic hospital caching exists, update activation is explicit and the manifest contains an icon.
- CI now syntax-checks the service worker as well as application modules.
- Working milestone remains `v0.2.0`.
- Shared shell cache advanced to `waywey-cache-10`; hospital data uses the independent `waywey-hospital-data-1` cache so app-shell updates do not discard already visited hospital data.


### Step 5 — Trust, audit provenance and Verify presentation — COMPLETE
- Every hospital configuration now records a required `lastSourceAudit` date and at least one official `sourceLinks` entry.
- The hospital UI shows the last source-audit date and official source links.
- Selected destinations show destination-specific source URLs when the dataset contains them, then fall back to hospital-level official sources.
- Added a dedicated provenance module to extract, deduplicate and safely expose HTTP(S) source links.
- Added localized provenance labels and Verify guidance in English, French, Hebrew and Arabic.
- Verify search results now have a distinct warning border and badge.
- Selected Verify destinations now show a prominent warning panel and stronger route-card treatment.
- Existing visitor-facing Verify warnings remain in place.
- Configuration schema now requires audit metadata for all future hospital packages.
- Added provenance unit tests for date handling, source extraction, deduplication and web-link filtering.
- Working milestone remains `v0.2.0`; shared shell cache advanced independently to `waywey-cache-11`.
