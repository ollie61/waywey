# WayWey 1.0 — Controlled Rebuild Plan

Status: Phase 1 initiated. Branch: `rebuild/waywey-1.0`. Production `main` is not to be modified until explicit approval.

## Baseline observations (2026-11-13)
- `app.js` still identifies the app as v0.3.3 and imports `createVoiceSearch`.
- `index.html` still exposes speech-recognition controls.
- `service-worker.js` uses `waywey-cache-29` and precaches `js/voice-search.js`.
- Hospital datasets, route graphs, translations, provenance and regression tests should be preserved and audited, not rewritten blindly.
- Successful CI alone does not establish what is served on the live site or what a device has cached.
- Android Arabic text-to-speech remains a physical-device verification item.

## Architecture principles
1. Ambassador-first: select station once per shift; persistent ambassador language; French default at Quebec hospitals.
2. Visitor language independent of ambassador language; names shown in their native scripts; proper RTL support.
3. Text search with validated aliases/fuzzy matching; **no speech recognition or microphone permissions**.
4. Optional speech synthesis for visitor directions; clear unsupported-voice status, with Android Arabic testing required.
5. Preserve stable hospital and destination identifiers and existing visitor/QR links; validate migration compatibility.
6. Routing must never invent a floor, pavilion, corridor, elevator, room side, or staff-only connector.
7. Source-backed, auditable destination and route data separate from UI.
8. Predictable cache invalidation and visibly verifiable build/version metadata; explicit rollback procedure.
9. Mobile-first accessible interface, including optional visual guidance with camera/gallery upload, accept/retry/replace and evidence review.
10. No patient identifiers, unnecessary data collection or implied hospital endorsement.

## Work stages and review gates
### Gate A — Inventory and baseline
- Catalogue all hospital packages, schemas, language keys, route datasets, scripts, tests, dependencies and entrypoints.
- Record the exact `main` commit and recovery point, existing deployment configuration, known failing behaviors and verified data.
- Establish a baseline regression matrix for every hospital and visitor language.
- **Approval required before major architecture replacement.**

### Gate B — New application shell
- Modularize hospital selection, station persistence, search, route display, visitor handoff and accessibility.
- Remove recognition code, markup, imports, translations and precache entries; retain speech synthesis.
- Add build manifest and diagnostics displaying product version, source commit, cache revision and deployment channel.
- Preserve existing hospital data contracts and stable URLs.
- Test all UI state transitions, including returning to hospital selection.

### Gate C — Search, localization and routing
- All-hospital fuzzy/alias search assertions (including MRI/cancer).
- French-first Quebec defaults, persistent ambassador language, independent visitor language, RTL.
- Route instructions for direction, pavilion, elevator, floor and correct room side, only where verified.
- Mark uncertain JGH Pavilion E → elevator → RC routes for on-site confirmation, not fabricated instructions.

### Gate D — Visual guidance and device validation
- Camera/gallery image workflow with accept, retry and replace; no patient images.
- Evidence links and timestamps; explicit review of JGH route photos and wording.
- Real Android checks for Arabic speech, offline update, QR sharing and cache migration.

### Gate E — Release
- Automated tests and browser journeys pass; all hospital packages validated.
- Staging served version, commit and cache revision verified.
- Public production update only after approval, with rollback instructions and prior SHA recorded.
- Post-deployment live-asset verification and phone testing.

## Release policy
A green GitHub Actions run is necessary but insufficient. Production readiness requires matching source, deployed files, service-worker cache and observed device behavior. Arabic Android speech is separately marked *unverified* until tested on a real device.

## Immediate next task
Complete Gate A inventory and produce a risk-ranked architecture audit. Do not alter production or delete existing hospital datasets.
