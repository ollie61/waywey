# WayWey application architecture — v0.2

WayWey is a browser-first static application. Shared application behaviour is separated from hospital-specific data so the same engine can support multiple hospitals and languages without embedding hospital facts in code.

## Shared application shell

- `index.html` — accessible application shell, search/results, route panel and dialogs.
- `styles.css` — shared visual design, responsive layout, RTL, focus, contrast and touch rules.
- `app.js` — orchestration: state, hospital rendering, DOM events and visitor handoff.
- `qrcode.min.js` — vendored QR generator.
- `manifest.webmanifest` — multi-hospital installable PWA metadata.
- `service-worker.js` — shell caching and selected-hospital offline caching.

## JavaScript modules

### `js/data.js`
Hospital identifier parsing and JSON loading.

### `js/search.js`
Pure search utilities:
- text normalization;
- conservative typo/fuzzy matching;
- weighted names/aliases/location ranking;
- compact room-number matching;
- query-language detection.

### `js/routing.js`
Pure routing utilities:
- breadth-first shortest-path routing;
- destination-to-node resolution;
- explicit support for intentionally unmapped/null node aliases.

A missing validated route returns `null`. The routing layer does not manufacture a path.

### `js/ui.js`
Shared formatting helpers:
- destination labels;
- secondary-language labels;
- RTL detection;
- location formatting;
- pavilion formatting;
- dataset-strength badge rendering.

### `js/i18n.js`
Shared language resources:
- visitor direction terminology;
- ambassador UI labels;
- QR labels;
- PWA status labels;
- provenance/Verify text;
- accessibility labels/announcements;
- route-unavailable notices.

Hospital-specific guides and labels stay in hospital packages.

### `js/pwa.js`
- service-worker registration;
- online/offline UI state;
- explicit update acceptance;
- selected-hospital cache warm-up.

### `js/provenance.js`
- audit-date formatting;
- destination source URL extraction;
- hospital source links;
- source deduplication.

### `js/accessibility.js`
- dialog initial focus;
- explicit Tab focus trapping;
- return focus;
- dialog-to-dialog transition handling;
- screen-reader announcements.

## Hospital packages

Each hospital lives under:

```text
hospitals/<hospital-id>/
```

Required data files:

- `config.json`
- `destinations.json`
- `routes.json`
- `guide.json`

A substantial package should also maintain `SOURCES.md`.

The shared engine must not hard-code hospital-specific rooms, connectors or directions when those facts belong in the hospital package.

## Routing model

WayWey uses a conservative graph, not a geometric indoor-positioning model.

- nodes are public routing areas/buildings;
- edges exist only for validated public connectors;
- special routes can carry directional instructions;
- staff-only connections are excluded;
- disconnected nodes are valid;
- no route is preferable to an inferred route.

This is intentionally compatible with ambassador-assisted navigation and does not require beacon infrastructure, blue-dot indoor positioning or collection of patient identity.

## Search model

Search runs entirely in the browser against the selected hospital dataset.

Ranking considers:

1. room/location codes;
2. canonical names;
3. aliases;
4. conservative fuzzy/typo matches;
5. a small `official` status tie-break.

The status tie-break is deliberately small so an exact `verify` record still beats a weak unrelated official match.

## PWA/cache model

Two cache concepts are intentionally separate:

- `SHELL_CACHE` — shared WayWey application assets.
- `DATA_CACHE` — hospital data/pages actually used by the device.

The shell does not pre-cache every hospital.

Hospital JSON is network-first: current network data updates the data cache, while offline use can fall back to the previously cached package.

New service workers wait for explicit user acceptance before taking over an active session.

## Provenance/trust model

Each hospital configuration has:

- `lastSourceAudit`;
- official `sourceLinks`.

Individual destinations can also carry direct source evidence.

The UI distinguishes `official` from `verify` and displays stronger warnings for unresolved source conflicts/incomplete locations.

## Accessibility model

The shared shell includes:

- skip navigation;
- semantic controls and landmarks;
- keyboard-native search results;
- dialog naming, focus trapping and focus return;
- screen-reader announcements;
- RTL support;
- minimum touch-target sizing;
- reduced-motion and higher-contrast preferences;
- automated core contrast checks.

## Change safety

The v0.2 milestone began from:

- baseline commit: `0cd3bc919378b76e09f94ee1168009f52fef8880`
- frozen baseline branch: `backup/pre-v0.2.0-2026-10-30`

A named recovery branch is created after every accepted major step before the following step begins.

See:

- [Hospital maintenance workflow](HOSPITAL-MAINTENANCE.md)
- [Release checklist](RELEASE-CHECKLIST.md)

## Validation

GitHub Actions performs:

- JSON/schema and cross-file hospital validation;
- ES-module syntax checks;
- service-worker syntax checks;
- dependency-free modularisation smoke checks;
- search/routing/PWA/provenance/accessibility tests.

Production `main` is changed only after reviewed milestone work is intentionally merged.
