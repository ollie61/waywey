# JGH Floor Routing — WayWey 1.1

The owner's confirmed rule (2026-11-15) sets the normal inter-pavilion transfer level to [01]. Each of the six entrance records now has a separate `entranceLevel`. The graph and existing route instructions remain unchanged.

Destination `floor` is an explicit level or null. Only explicit floor statements already in the location text, independently confirmed entrance locations, and the existing validated B-114 main-entrance journey receive known levels. Room numbers alone are not sufficient evidence. Null produces a localized verification warning; confirm and populate these records from hospital signage or appointment paperwork. This deliberately leaves many room-only destinations pending hospital verification.

The shared planner walks the existing pavilion path. It changes levels in the starting pavilion before normal transfer edges, and in the destination pavilion before the existing final directions. Same-pavilion journeys go directly to their destination floor; same-floor journeys need no elevator.

H–K retains the existing special instructions in every language. H is reached at [03]; the numbered level of K's lobby is unknown. The planner warns whenever a further connection to/from that unknown level is needed. It never equates RC, S1, 01 or the K lobby, and never invents elevator locations, turns or corridors.

Validation covers the requested synthetic E[S1]–B[03] transition, actual Admissions B[01], reverse E entrance[S1], same pavilion/floor, all 11 visitor languages and H–K as both a whole journey and intermediate edge. Baseline tests compare every existing data field (excluding new floor metadata), every graph path, special route and entrance ID/node against main commit 2392e102fd783964223280386df060caff3775be.

Hospital checks still required: elevator access from entrances, every unknown destination floor, K lobby connection level, current connector accessibility and signage. Real Samsung speech/cache behaviour requires device testing. Automated browser tests do not establish physical hospital validity.
