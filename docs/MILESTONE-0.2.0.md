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
7. Maintenance/documentation layer: multi-hospital README, hospital audit workflow and release checklist.
8. Outdoor-map handoff for explicit unrouted/off-site destinations.
9. Optional single-shot browser voice search.
10. Optional location assistance and other product features.

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


### Step 6 — Accessibility and mobile/touch UX — COMPLETE
- Added a visible keyboard skip link and an explicit main-content landmark target.
- Added a polite screen-reader announcement region for search-result counts and selected destinations.
- Search results are now native buttons rather than clickable divs, preserving pointer behavior while adding keyboard activation automatically.
- Search input now exposes search semantics, result relationships and mobile search-key hints.
- Dialogs now have accessible names, explicit Tab focus trapping, initial focus placement and focus return to the invoking control.
- Dialog-to-dialog transitions (visitor directions ↔ QR) suppress incorrect intermediate focus restoration.
- Added localized accessibility labels and screen-reader announcements in English, French, Hebrew and Arabic.
- Increased core touch targets to at least 44px and primary mobile actions to 50px.
- Improved one-handed phone layout by stacking action controls at narrow widths and widening visitor controls.
- Added strong visible keyboard focus indicators, reduced-motion handling and higher-contrast mode support.
- Darkened the shared muted-text colour from `#64777d` to `#5d7076` so normal text on the application background clears WCAG AA contrast.
- Added accessibility regression checks for landmarks, dialog naming, semantic search controls, keyboard-native search results, touch targets, focus styling, focus trapping and core text-colour contrast.
- Working milestone remains `v0.2.0`; shared shell cache advanced independently to `waywey-cache-12`.


### Step 7 — Maintenance and documentation layer — COMPLETE
- Rewrote the root README around the current multi-hospital v0.2 architecture rather than the original JGH-only prototype.
- Documented all current hospital package IDs, ambassador languages, repository structure, local development, validation, privacy posture and version/cache policy.
- Replaced the outdated hospital-package README with the current package contract, including required audit metadata, official/verify meaning, routing evidence rules, multilingual guides, clean paths and PWA data caching.
- Added `docs/HOSPITAL-MAINTENANCE.md` as the operating procedure for adding, auditing and updating hospitals.
- Defined official-source precedence, conflict handling, completeness limits, alias/translation rules, conservative routing, human review and data-only version/cache rules.
- Added `docs/RELEASE-CHECKLIST.md` covering rollback points, semantic product versioning, independent cache revisions, automated validation, manual smoke testing, production deployment and post-release tagging.
- Updated `docs/ARCHITECTURE.md` through the search, PWA, provenance and accessibility modules introduced during this milestone.
- No runtime application code or hospital data was changed in Step 7.
- Working milestone remains `v0.2.0`; shell cache remains `waywey-cache-12`.


### Step 8 — Explicit outdoor-map handoff — COMPLETE
- Added `js/outdoor-map.js` to generate external map links only from explicit `outdoorMap.query` metadata.
- Added optional `outdoorMap.query` support to the destination schema.
- Added ambassador and visitor map actions; they remain hidden for ordinary indoor destinations and for unrouted destinations without explicit map metadata.
- The handoff is user-initiated, opens an external Google Maps search, and does not request device GPS permission inside WayWey.
- Added multilingual outdoor-map labels for all current visitor languages.
- Added source-backed outdoor map metadata to eight confirmed-address destinations across JGH, Glen and Verdun, including off-site clinics and exterior parking.
- No map metadata was added to uncertain/Verify street locations.
- Added automated tests proving map links require explicit metadata and encode the address safely.
- Updated hospital-maintenance, package-contract, architecture and release documentation to prohibit inferred outdoor map destinations or embedded third-party tracking.
- Working milestone remains `v0.2.0`; shared shell cache advanced independently to `waywey-cache-13`.


### Step 9 — Optional browser voice search — COMPLETE
- Added `js/voice-search.js` as a progressive-enhancement controller for the standard/WebKit browser speech-recognition API.
- Voice search is always user-initiated, single-shot, non-continuous and limited to one recognition result.
- Recognized speech is inserted into the existing search field and processed by the same fuzzy/ranking engine as typed text.
- Added explicit speech locales for English (Canada), French (Canada), Hebrew (Israel) and Arabic (Israel).
- The microphone button is hidden when browser speech recognition is unavailable, leaving normal typed search unchanged.
- Added Stop behavior, listening/recognized/error status messages and screen-reader announcements.
- Added localized voice-search UI and privacy disclosure in English, French, Hebrew and Arabic.
- The UI explicitly states that browser/provider audio handling may vary and that WayWey does not store the recording.
- Changing the application language stops any active voice capture before switching recognition language.
- Added voice-search tests covering browser support detection, locale mapping, single-shot settings, transcript trimming and error propagation.
- Updated architecture, privacy and release documentation.
- Working milestone remains `v0.2.0`; shared shell cache advanced independently to `waywey-cache-14`.


### Release candidate review — RC1
- Added a static release-candidate invariant checker covering product version documentation, hospital selector completeness, clean hospital redirects, query-parameter preservation, service-worker shell assets, imported module caching and manifest icon presence.
- Enabled JSON Schema format checking so configured audit dates and URI fields are actually validated, rather than treated as annotations only.
- Destination `sourceUrl` fields now require valid URI format.
- CI now also triggers on `styles.css`-only changes and uses a general regression-test step name.
- The RC checker caught a real drift issue before release: Hadassah Ein Kerem was level 3 in its audited configuration but still displayed level 2 on the hospital selector.
- Corrected the Hadassah selector to level 3 with the explicit label “Expanded — route validation needed”.
- Full CI then passed, including hospital validation, JS/service-worker syntax, all regression tests and the new release-candidate invariants.
- Target product version remains `v0.2.0`; shell cache advanced independently to `waywey-cache-15`.
- Location/nearest-entrance assistance remains intentionally deferred from v0.2.0.
- RC1 is suitable for final browser/device smoke testing before production merge.
