# CHUM dataset sources and audit notes

Initial WayWey CHUM dataset created 2026-10-27.

## Primary official sources

- CHUM, *Guide des services et des ressources*, January 2026 — service/clinic floor codes, inpatient unit locations, campus layout and public circulation rules.
- CHUM online directory — current clinic/service pages used to refine exact rooms for high-use destinations.
- CHUM, *Se rendre au CHUM* — main entrance and access information.
- CHUM, *Urgence* — Emergency location and entrance.
- CHUM campus map / *Nos espaces* — pavilion functions and public landmarks.

## Directly refined destinations

Current CHUM directory/patient pages were used to refine:

- Centre de prélèvements — D.01.4100
- Physiothérapie — C0562
- Urologie (clinique) — C0261
- Ophtalmologie — D0120
- Clinique dentaire — C0362
- Urgence — RC20
- Centre des naissances — D09 Sud
- Radiologie / IRM — D0350, with access through Pavilion C
- ORL — C0961
- Préadmission — D0140

## Routing policy

The public routing graph is deliberately conservative.

Included:
- C ↔ D — public circulation documented at the 1st, 2nd and 8th floors.
- D ↔ R — public underground passage at basement level 1, also serving access to Champ-de-Mars métro.

Not included as public routes:
- C ↔ F — documented staff-only / restricted passages.
- E ↔ F — documented staff/physician/escorted-patient passage.
- Other pavilion connections unless a public route is confirmed.

WayWey should never infer a public route from building adjacency alone.

## Current coverage

The initial CHUM package contains 119 searchable destinations. It is suitable for prototype testing, but it is not yet a complete transcription of all 202 entries in the CHUM online directory. Additional entries should be added only after their locations are confirmed from current official sources.
