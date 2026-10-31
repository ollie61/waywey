# WayWey search quality and automated audit

WayWey search is treated as a release-critical subsystem. A hospital dataset is
not considered ready merely because a few hand-entered examples work.

The CI workflow runs:

```bash
node scripts/audit_search_all_hospitals.mjs
```

against **every hospital package**.

## What the audit checks

For every destination record, the audit exercises:

- every available canonical name in English, French, Hebrew and Arabic;
- every configured alias;
- unique short aliases/acronyms;
- unique exact locations;
- compact room-number forms with spaces/punctuation removed;
- Latin-diacritic folding for localized canonical names;
- unique four-character prefixes for partial typing;
- deterministic one-edit fuzzy typos;
- negative garbage queries in Latin, Hebrew and Arabic scripts.

Fuzzy testing uses four independent typo classes:

1. one-character deletion;
2. one-character insertion;
3. one-character substitution;
4. adjacent-character transposition.

A generated typo is used for ranking only when the intended token is uniquely
closest. If another destination has an equally close legitimate token, the
query is genuinely ambiguous and is excluded from the ranking assertion rather
than forcing an arbitrary expected result.

Each hospital must achieve broad generated-fuzzy coverage: at least 35% of its
destinations (and at least 20 records where the dataset is large enough) for
**each** typo class.

## Ranking expectations

The audit requires:

- canonical names to rank near the top;
- unique aliases and acronyms to rank in the top results;
- unique locations/room codes to resolve directly;
- unambiguous fuzzy typos to place the intended destination within the top 5;
- garbage queries not to be rescued into false-positive results.

Exact room/address queries retain strong weighting. Purely alphabetic location
labels such as `ICFP` are intentionally weaker than an exact service
name/alias, so a location-area code cannot crowd out the service a visitor
actually named.

## Fuzzy algorithm

WayWey uses conservative bounded edit matching.

The edit distance supports:

- insertion/deletion;
- substitution;
- one adjacent transposition as a single edit.

Short input remains deliberately conservative. Very short acronyms are expected
to work because they are present as exact aliases; fuzzy expansion is not used
to guess arbitrary two- or three-character input.

## v0.2.0 RC3 audit snapshot

Current dataset size: **636 destinations across 5 hospitals**.

| Hospital | Dest. | Canonical | Aliases | Acronyms | Accent-fold | Prefix | Locations | Compact rooms | Delete | Insert | Substitute | Transpose |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| JGH | 190 | 380 | 654 | 50 | 102 | 100 | 112 | 107 | 152 | 153 | 153 | 153 |
| CHUM | 119 | 238 | 412 | 29 | 74 | 68 | 40 | 31 | 85 | 85 | 85 | 85 |
| Glen | 106 | 212 | 383 | 38 | 82 | 42 | 89 | 89 | 59 | 59 | 59 | 59 |
| Verdun | 66 | 132 | 338 | 39 | 35 | 56 | 26 | 17 | 62 | 62 | 62 | 62 |
| Hadassah Ein Kerem | 155 | 465 | 801 | 24 | 0 | 103 | 45 | 25 | 129 | 130 | 130 | 130 |
| **Total** | **636** | **1,427** | **2,588** | **180** | **293** | **369** | **312** | **269** | **487** | **489** | **489** | **489** |

This corresponds to **1,954 fuzzy-mutation ranking checks** across the four typo
classes. Including canonical names, aliases, acronyms, accent folding, unique
prefixes, locations, compact-room forms and negative garbage queries, the
current audit performs **7,407 automated search checks/assertions**.

The audit is data-driven. Adding or changing a hospital automatically expands
the search test surface; it does not depend on somebody remembering to add a
manual test for a common term such as MRI.

## Release policy

Any all-hospital search-audit failure blocks the release candidate.

A failure must be classified as one of:

- missing/incorrect hospital data or alias;
- ranking defect;
- fuzzy-matching defect;
- genuinely ambiguous generated query;
- test defect.

The correct category is fixed explicitly. The audit threshold is not lowered
simply to make CI green.
