# WayWey

**The Ambassador Magic**

WayWey is a browser-first, multilingual hospital wayfinding platform designed for ambassador-assisted navigation. One shared application engine can support many hospitals while each hospital keeps its own destinations, languages, source history and validated routing data.

Current development milestone: **v0.2.0**.

## What WayWey does

- Lets an ambassador select and remember a starting station.
- Searches department/service names, aliases and room numbers with typo-tolerant ranking.
- Offers optional single-shot voice search when the browser exposes a compatible speech-recognition API.
- Keeps hospital data separate from the shared application engine.
- Shows indoor directions only when the public route has been validated.
- Clearly flags uncertain locations as **Verify / À vérifier / לאימות / بحاجة للتحقق**.
- Creates visitor-facing directions and QR handoff links.
- Provides browser text-to-speech for visitor directions.
- Supports RTL interfaces for Hebrew and Arabic.
- Works as a PWA and caches only the hospital that has actually been used.
- Shows dataset audit dates and official source links.
- Hands off to an external outdoor map only for destinations with explicit source-backed outdoor address metadata.
- Includes keyboard, screen-reader, reduced-motion, contrast and mobile/touch accessibility work.

## Safety model

WayWey is deliberately conservative.

1. **Never invent a route, building, floor, room or connector.**
2. A public connector is added only when a sufficiently current official source supports it.
3. Staff-only or restricted passages are never treated as visitor routes.
4. Conflicting, incomplete or visibly older location information is marked **Verify** rather than silently resolved.
5. A destination may still be searchable even when it is not part of the validated indoor routing graph.
6. Hospital signage, appointment paperwork and current staff instructions take precedence over WayWey when there is a discrepancy.

Unless formally approved by the relevant hospital, WayWey must continue to be presented as **unofficial**.

## Multi-hospital model

Current hospital packages:

| Package ID | Hospital | Ambassador languages |
| --- | --- | --- |
| `jgh` | Jewish General Hospital | English, French |
| `chum` | Centre hospitalier de l’Université de Montréal | French, English |
| `glen` | MUHC Glen site | French, English |
| `verdun` | Hôpital de Verdun | French, English |
| `hadassah-ein-kerem` | Hadassah Ein Kerem Medical Center | Hebrew, English, Arabic |

The root URL is the hospital selector. Clean hospital paths such as `/jgh/` and `/hadassah-ein-kerem/` redirect into the shared engine with the appropriate hospital package.

## Repository structure

```text
index.html                 shared application shell
app.js                     application orchestration
styles.css                 shared responsive/RTL/accessibility styles
service-worker.js          PWA shell + selected-hospital caching
manifest.webmanifest       installable multi-hospital manifest
js/
  data.js                  hospital URL/data loading
  search.js                normalization, fuzzy search and ranking
  routing.js               validated graph routing
  ui.js                    shared display formatting
  i18n.js                  shared interface/visitor language resources
  pwa.js                   offline/update UX
  provenance.js            audit/source presentation
  accessibility.js         dialog focus and screen-reader helpers
hospitals/
  <hospital-id>/
    config.json
    destinations.json
    routes.json
    guide.json
    SOURCES.md              recommended audit/source log
schemas/                    JSON schemas for hospital data
scripts/                    validation/smoke utilities
tests/                      dependency-free Node tests
docs/                       architecture, maintenance and release guidance
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the application architecture and [`docs/HOSPITAL-MAINTENANCE.md`](docs/HOSPITAL-MAINTENANCE.md) before adding or changing hospital data.

## Running locally

WayWey uses ES modules and a service worker, so serve the repository over HTTP rather than opening `index.html` directly.

For example:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000/
```

Hospital examples:

```text
http://localhost:8000/jgh/
http://localhost:8000/?hospital=verdun
http://localhost:8000/hadassah-ein-kerem/
```

## Validation

Hospital JSON is protected by schemas and cross-file checks.

```bash
python -m pip install "jsonschema==4.23.0"
python scripts/validate_hospitals.py
node --test tests/*.test.mjs
```

GitHub Actions also checks hospital schemas, JavaScript syntax, service-worker syntax and the regression tests on relevant code/data changes.

## Versioning and cache revisions

WayWey separates the product version from internal cache identifiers.

- `APP_VERSION` is the user-visible semantic product version, such as **0.2.0**.
- `SHELL_CACHE` is an internal service-worker cache revision and may change several times during one product version.
- `DATA_CACHE` is independent and should change only when the cached hospital-data format/semantics require invalidation.

A normal hospital JSON update does **not** require a shell-cache revision because hospital JSON is network-first and cached separately.

Before a major code or data step, create a recovery branch or equivalent immutable recovery point. See [`docs/RELEASE-CHECKLIST.md`](docs/RELEASE-CHECKLIST.md).

## Privacy and deployment posture

WayWey does not require a visitor account or patient identity to provide directions. QR/deep links contain navigation context, not a patient record. Avoid introducing patient data, condition-based targeting, third-party trackers or other unnecessary sensitive-data collection.

Voice search is user-initiated and single-shot. WayWey does not store the microphone recording, but the browser or speech-recognition provider may process audio according to its own implementation/privacy rules. The voice button is hidden when compatible browser support is unavailable.

## Maintenance

The hospital-data workflow, source precedence rules, `official` versus `verify` criteria, routing evidence rules and audit checklist are documented in:

- [Hospital maintenance workflow](docs/HOSPITAL-MAINTENANCE.md)
- [Hospital package contract](hospitals/README.md)
- [Release checklist](docs/RELEASE-CHECKLIST.md)

