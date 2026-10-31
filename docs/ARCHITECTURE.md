# WayWey application architecture — v0.2 milestone

WayWey remains a browser-first static application. Hospital content is data-driven and is kept separate from shared application logic.

## Shared application shell

- `index.html` — accessible application shell and dialogs.
- `styles.css` — shared visual design, responsive layout and RTL rules.
- `app.js` — orchestration/bootstrapping only: state, DOM events, hospital rendering and visitor handoff.
- `qrcode.min.js` — vendored QR generator.
- `service-worker.js` — PWA cache/service worker.

## JavaScript modules

### `js/data.js`
Hospital identifier parsing and JSON loading.

### `js/search.js`
Pure search utilities:
- text normalization;
- field scoring;
- query-language detection;
- current baseline ranking.

Search improvements can now be developed/tested without touching routing or UI code.

### `js/routing.js`
Pure routing utilities:
- breadth-first graph routing;
- destination-to-routing-node resolution;
- explicit support for intentionally unmapped/null node aliases.

The routing helper returns `null` when no validated route exists. It does not manufacture a path.

### `js/ui.js`
Shared presentation/formatting helpers:
- destination labels;
- secondary-language labels;
- RTL detection;
- location formatting;
- pavilion formatting;
- dataset-strength badge rendering.

### `js/i18n.js`
Shared application and visitor strings:
- visitor direction terminology;
- QR labels;
- ambassador UI labels;
- language names;
- route-unavailable notices.

Hospital-specific guides and labels remain in hospital data packages.

## Hospital packages

Each hospital lives under:

`hospitals/<hospital-id>/`

and contains:

- `config.json`
- `destinations.json`
- `routes.json`
- `guide.json`
- optional source documentation such as `SOURCES.md`

The shared engine must not hard-code hospital-specific routing facts when those facts belong in a hospital package.

## Change safety

The v0.2 milestone began from:

- baseline commit: `0cd3bc919378b76e09f94ee1168009f52fef8880`
- frozen baseline branch: `backup/pre-v0.2.0-2026-10-30`
- Step 1 recovery branch: `backup/v0.2.0-step1`

Every major milestone step receives a recovery branch before the following step starts.

## Validation

GitHub Actions now performs:
- JSON/schema and cross-file hospital validation;
- ES-module syntax checks;
- dependency-free modularisation smoke checks.

Production `main` is unchanged until reviewed milestone changes are intentionally merged.
