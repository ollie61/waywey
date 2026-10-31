# WayWey hospital dataset contract

WayWey uses one shared application engine and one independent package per hospital.

A hospital package lives at:

```text
hospitals/<hospital-id>/
```

and must contain:

- `config.json` — identity, languages, entrances, source audit metadata and hospital-specific labels.
- `destinations.json` — searchable destinations, aliases, locations, status and optional direct source information.
- `routes.json` — validated public routing graph, pavilion labels and directional special routes.
- `guide.json` — in-app user/ambassador guide for every configured ambassador language.
- `SOURCES.md` — strongly recommended audit log documenting source hierarchy, conflicts, route evidence and remaining gaps.

The full schemas are in `/schemas`. Do not treat this README as a substitute for schema validation.

## Package identifier

The folder name and `config.json.id` must match and use:

```text
^[a-z0-9-]+$
```

Example:

```text
hospitals/hadassah-ein-kerem/
config.json -> "id": "hadassah-ein-kerem"
```

## `config.json`

Required configuration includes:

- localized `name`, `shortName`, `pageTitle` and `description`;
- `defaultAppLanguage`;
- `defaultVisitorLanguage`;
- `ambassadorLanguages`;
- at least one `entrances` entry;
- `datasetStrength`;
- `lastSourceAudit` in `YYYY-MM-DD` format;
- at least one official `sourceLinks` entry.

Optional configuration can include:

- hospital-specific UI overrides;
- `nodeAliases`;
- localized `specialPavilionLabels`.

A `nodeAliases` value may intentionally be `null` to identify a known destination area that is not part of the validated indoor routing graph.

## `destinations.json`

Every destination requires:

- `en` — English canonical name; this also provides a stable fallback;
- `p` — pavilion/building/routing-area code, or an empty string when not established;
- `loc` — floor/room/location text, or an empty string when not established;
- `aliases` — common search terms and abbreviations;
- `status` — either `official` or `verify`.

Additional localized canonical names may include `fr`, `he` and `ar`.

Optional evidence fields:

- `source` — source description and, where useful, one or more source URLs;
- `sourceUrl` — direct source URL for the specific destination;
- `note` — general note;
- `notes` — localized notes.
- `outdoorMap.query` — an explicit source-backed street address or outdoor landmark query used for external-map handoff.

### Outdoor map handoff

Do not derive an outdoor map destination from `loc`, pavilion adjacency or an indoor route failure.

Add `outdoorMap.query` only when the dataset has a sufficiently clear published outdoor address/landmark. The current shared engine opens a Google Maps search link only after the user chooses the map action; WayWey itself does not request GPS permission.

For a `verify` destination, do not add outdoor map metadata unless the outdoor address itself is independently safe to present. A prominent Verify warning does not make an uncertain street address safe.

### Status meaning

**`official`** means a sufficiently current official source explicitly supports the destination and the location information WayWey displays. It does **not** mean the hospital has endorsed WayWey or that an on-site staff member independently confirmed the record.

**`verify`** is required when any material location detail is conflicting, incomplete, visibly old, inferred rather than stated, or otherwise not safe to present as settled.

Never upgrade `verify` to `official` merely because several unofficial websites agree.

## `routes.json`

The routing graph is an evidence model, not a geometric map.

- Graph nodes represent building/area routing points.
- Add a graph edge only when public movement between the nodes is supported by reliable evidence.
- Do not infer a connector because buildings touch on a map.
- Do not encode staff-only/restricted connectors.
- Do not assume a route is bidirectional when the evidence is direction-specific.
- Use `specialRoutes` for validated directional instructions that need explicit wording.
- Leave nodes disconnected when a safe public route has not been established.

When no validated path exists, the engine returns no route and shows a warning instead of manufacturing directions.

## `guide.json`

Every language in `ambassadorLanguages` must have a guide entry containing:

- `title`
- `html`

Guides should explain the actual workflow, including station selection, search, Verify handling, visitor handoff and any hospital-specific route limitations.

For RTL languages, the shared application handles page direction; write the guide content naturally in that language.

## Clean hospital path

Each hospital should also have a lightweight clean redirect at:

```text
/<hospital-id>/index.html
```

which redirects to:

```text
../?hospital=<hospital-id>
```

Preserve incoming query parameters so visitor/deep links continue to work.

## PWA caching

Do not add individual hospital JSON files to the shared service-worker shell cache.

The service worker caches the shared app shell globally and warms/caches the selected hospital dynamically. Hospital JSON is network-first so data changes can refresh without a product-shell cache bump.

## Validation

Run:

```bash
python scripts/validate_hospitals.py
node --test tests/*.test.mjs
```

The validator checks required files, schemas, folder/config identity, ambassador guides, graph references, entrance-node validity and duplicate canonical destination records.

Warnings about unmapped pavilions are not automatically errors because off-site and intentionally unrouted destinations are valid.

## Full maintenance process

Before adding or updating hospital content, follow:

[`docs/HOSPITAL-MAINTENANCE.md`](../docs/HOSPITAL-MAINTENANCE.md)

That document defines the source hierarchy, audit process, routing evidence standard, multilingual search rules, rollback procedure and release checklist.
