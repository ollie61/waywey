# Hospital data maintenance workflow

This is the operating procedure for adding, auditing or updating a WayWey hospital package.

The objective is not to maximize the number of directions. The objective is to maximize **useful directions that are supportable by evidence**, while making uncertainty obvious.

## 1. Non-negotiable rules

1. Never invent a room, floor, building, entrance or connector.
2. Never infer a public indoor route from visual/map proximity alone.
3. Never encode staff-only, restricted or escorted-only passages as public routes.
4. Prefer a current, destination-specific official source over a broad or older official source.
5. Preserve unresolved conflicts as `verify`; do not silently choose the most convenient value.
6. Record material source conflicts in `SOURCES.md`.
7. Keep hospital-specific facts in the hospital package, not in the shared engine.
8. Keep the hospital unofficial unless formal approval changes that status.

## 2. Change safety before editing

Before a major hospital audit or code/data step:

1. Record the current branch/commit.
2. Create a recovery branch or equivalent immutable recovery point.
3. Perform work on a dedicated milestone/feature branch rather than directly on production `main`.
4. Keep each major logical step in separable commits.
5. Do not delete recovery branches until the released version has been stable and independently recoverable.

The v0.2 milestone uses branches such as:

```text
backup/pre-v0.2.0-2026-10-30
backup/v0.2.0-step1
backup/v0.2.0-step2
...
```

The exact naming can evolve, but the recovery principle should not.

## 3. Source hierarchy

Use the most specific and current authoritative source available.

Preferred order:

1. Current official page for the exact department/service/location.
2. Current official hospital directory or department index.
3. Current official hospital map, patient guide or wayfinding PDF.
4. Current official health-system or parent-organization page.
5. Older official material, only with an explicit age/conflict note.
6. On-site human confirmation supplied by an authorized hospital source, documented as such.

Third-party directories, search-result snippets, map pins and crowd-sourced sites may help discover a lead but should not establish a WayWey location or indoor route on their own.

### Conflict rule

When official sources disagree:

- prefer the more current and more destination-specific source only when that preference is defensible;
- otherwise keep the record `verify`;
- identify the conflicting values and sources in `SOURCES.md`;
- never hide the conflict by merging incompatible locations into one apparently certain direction.

## 4. Adding a new hospital

### 4.1 Establish scope first

Define:

- hospital/campus name;
- whether multiple campuses must be separate packages;
- ambassador languages;
- default application and visitor languages;
- official source domains;
- public entrances/start stations;
- expected routing evidence quality.

Separate campuses should normally be separate hospital IDs when their maps, entrances and routing graphs differ.

### 4.2 Create the package

Create:

```text
hospitals/<id>/config.json
hospitals/<id>/destinations.json
hospitals/<id>/routes.json
hospitals/<id>/guide.json
hospitals/<id>/SOURCES.md
```

Then create the clean redirect:

```text
<id>/index.html
```

and add the hospital to the selector in the shared landing page only after the package validates.

### 4.3 Configuration

Populate `config.json` with:

- localized names and page metadata;
- `ambassadorLanguages`;
- default app/visitor language;
- entrances with stable IDs and routing nodes;
- dataset strength and a factual basis;
- `lastSourceAudit`;
- official `sourceLinks`;
- aliases/special labels only where needed.

Do not exaggerate dataset strength. It reflects coverage, verification depth and routing maturity, not a guarantee of correctness.

### 4.4 Destination inventory

Work systematically through the official directory rather than adding only obvious/high-profile departments.

For each destination capture:

- canonical names in relevant hospital languages;
- common visitor aliases and abbreviations;
- pavilion/building code;
- floor/room/location exactly as supported;
- `official` or `verify`;
- source name;
- direct `sourceUrl` when available;
- localized notes for meaningful ambiguity.

Useful aliases include the words visitors actually say: specialty variants, common abbreviations, test names and local terminology. Avoid aliases that are merely speculative synonyms.

Room/location strings are searchable already, so do not duplicate every room number into `aliases` unless it materially improves recognition.

### 4.5 Multilingual coverage

For each ambassador language:

- use the institution's official terminology when available;
- add natural-language aliases visitors are likely to use;
- preserve medically meaningful distinctions;
- do not translate a department into a broader/different service just to create a match;
- test RTL languages visually and through search.

Latin transliterations can be useful aliases when visitors commonly use them, but they should not replace the native-script canonical name.

### 4.6 Routing graph

Build routing separately from destination inventory.

A destination can be valid/searchable even if no indoor route to it has been established.

For every proposed connector, record:

- source;
- whether it is public;
- levels/floors involved;
- directionality;
- limitations (hours, security, escorts, temporary closures).

Only then add the graph edge or `specialRoutes` instructions.

If evidence is insufficient, leave nodes disconnected. A no-route warning is a correct result.

### 4.7 User guide

Provide a guide for every `ambassadorLanguages` entry.

At minimum explain:

- how to choose the actual starting station;
- how to search;
- how to interpret Verify;
- how to use visitor display/QR/audio;
- hospital-specific routing limitations;
- that current signage/appointment material prevails when information conflicts.

## 5. Updating an existing hospital

Use the smallest defensible change.

1. Identify the official source(s) that changed.
2. Determine whether the change affects one destination, aliases, entrance data, routing, guide text or the wider audit.
3. Update only the affected records.
4. Re-check adjacent/related records when a shared building or service moved.
5. Update direct `sourceUrl` values where available.
6. Update `SOURCES.md` with the evidence and any conflict resolution.
7. Update `lastSourceAudit` **only to the date actually audited**. Do not advance it merely because a file was edited.
8. Re-run validation and relevant regression searches.
9. Create a recovery point before beginning the next major step.

### Data-only cache/version rule

Hospital JSON is network-first and cached separately from the app shell.

Therefore:

- a routine hospital-data correction normally does **not** require a `SHELL_CACHE` change;
- a data-only correction does not automatically require a product-version bump;
- bump the user-visible version when the change is a real product release/milestone according to the release plan;
- change `DATA_CACHE` only when its format/semantics require invalidating existing cached hospital data.

## 6. Outdoor map handoff

Outdoor map links are a deliberate exception to indoor routing and must remain evidence-based.

- Add `outdoorMap.query` only for a published street address, parking location, off-site clinic or other explicit outdoor destination.
- Do not generate it automatically from `loc`.
- Do not infer a street location from campus-map proximity.
- Prefer not to expose an outdoor-map link on a `verify` record unless the outdoor address itself is confirmed.
- WayWey does not request GPS permission for this feature.
- The external map service may independently offer its own location/directions features after the user leaves WayWey.
- The handoff must remain user-initiated; do not embed third-party map trackers in the WayWey page.

Representative regression test: an unrouted destination with no `outdoorMap.query` must show no external-map button.

## 7. `official` versus `verify`

Use `official` only when the displayed location is explicitly supported by a sufficiently current official source.

Use `verify` when:

- official sources conflict;
- only an older source supplies the location;
- the exact building/floor/room is absent;
- the service is confirmed but its current public reception location is not;
- a source describes a future/planned move;
- wording could describe a department headquarters rather than the patient reception;
- equipment/amenities may move;
- on-site confirmation is still needed.

A `verify` record is not a failure. It is an explicit trust state.

## 8. Source documentation

Each substantial package should maintain `SOURCES.md` with:

- audit date and scope;
- primary official sources;
- count/coverage summary where useful;
- conflicts and how they were handled;
- routing evidence;
- unresolved gaps requiring human confirmation;
- temporary closures/detours with dates;
- older sources that were intentionally rejected or downgraded.

Do not claim “complete” simply because the destination count exceeds the hospital's published department count: a WayWey inventory can contain subclinics, diagnostic desks and amenities as separate searchable records.

## 9. Validation and regression

Before review:

```bash
python scripts/validate_hospitals.py
node --test tests/*.test.mjs
```

Then manually test representative queries:

- exact canonical department name;
- common alias;
- abbreviation;
- room number with punctuation;
- room number without punctuation;
- one plausible typo;
- each ambassador language;
- at least one `verify` result;
- at least one unmapped/no-route result.

For routing, test:

- same-node destination;
- validated cross-node route;
- disconnected nodes;
- directional `specialRoutes` where used;
- off-site/null node aliases.

## 10. Human review checklist

Before approving a hospital audit:

- [ ] Scope/campus is unambiguous.
- [ ] All sources are official or clearly identified as secondary evidence.
- [ ] `lastSourceAudit` is truthful.
- [ ] Source links are usable.
- [ ] Verify conflicts are visible and documented.
- [ ] No public route was inferred from adjacency.
- [ ] Staff-only connectors are excluded.
- [ ] All ambassador languages have guides.
- [ ] Search aliases cover common visitor language.
- [ ] RTL content has been checked where applicable.
- [ ] Validator and tests pass.
- [ ] Recovery point exists.
- [ ] Production is not changed until the review step is accepted.

## 11. Release handoff

When a hospital/data step is approved, follow [`RELEASE-CHECKLIST.md`](RELEASE-CHECKLIST.md) before merging to production.
