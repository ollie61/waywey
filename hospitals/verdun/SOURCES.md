# Verdun Hospital — WayWey 2026 completeness audit
Audited: 2026-10-28. Official Santé Québec / CCSMTL public sources only. Shared app engine unchanged; public WayWey version 0.1.0.

## Priority sources and verified facts
- [Expansion project](https://ciusss-centresudmtl.gouv.qc.ca/revergrand): Black Block N1 outpatient/day medicine/nuclear medicine; N2 internal medicine, N3 clinical teaching (UEC) and palliative care, N4 geriatric medicine, N5 surgery; 36 beds per unit; family lounge each floor; project describes bridge on each level but does not establish public wayfinding.
- [Surgery transfer, 24 February 2026](https://ciusss-centresudmtl.gouv.qc.ca/actualite/un-transfert-de-patients-et-patientes-historique-pour-lhopital-de-verdun): N5 opened 17 February 2026.
- [Door 26 works notice, 9 October 2026](https://ciusss-centresudmtl.gouv.qc.ca/actualite/hopital-de-verdun-fermeture-temporaire-de-lentree-du-nouveau-pavillon-porte-26): patients on N2–N5, Door 26 at LaSalle/rue de l’Église; closure was temporary on 13 October 08:00–12:00; main entrance at 4000 boulevard LaSalle.
- [Accueil clinique](https://ciusss-centresudmtl.gouv.qc.ca/soins-et-services/accueil-clinique): N1 612; documented Emergency entrance → Yellow J1 corridor → Black N1 route.
- [Imaging and Nuclear Medicine](https://ciusss-centresudmtl.gouv.qc.ca/soins-et-services/imagerie-medicale-radiologie-rayons-x-et-medecine-nucleaire): radiology reception B1-404, nuclear medicine reception N1-661; official modalities include MRI, CT, ultrasound, fluoroscopy, guided biopsies and nuclear scans.
- [Respiratory Physiology](https://ciusss-centresudmtl.gouv.qc.ca/soins-et-services/consultation-avec-un-medecin-ou-une-infirmiere/consultation-avec-un-medecin-specialiste/physiologie-respiratoire): V2 corridor, 2nd floor via elevator 4, registration kiosk opposite elevator.
- [Urology](https://ciusss-centresudmtl.gouv.qc.ca/soins-et-services/consultation-avec-un-medecin-ou-une-infirmiere/consultation-avec-un-medecin-specialiste/urologie): integrated urology clinic V4-242.
- [Billing, updated 15 May 2026](https://ciusss-centresudmtl.gouv.qc.ca/informations-pratiques/frais-de-soins-et-services-pour-les-personnes-non-assurees-par-la-ramq): Patient Accounts V1-277.
- [Hospital page](https://ciusss-centresudmtl.gouv.qc.ca/etablissement/hopital-de-verdun): visitor parking lots 433/434, gravel lot, cafeteria hours; no cafeteria room given.
- [Blood collection, updated 15 May 2026](https://ciusss-centresudmtl.gouv.qc.ca/soins-et-services/prises-de-sang-prelevements-et-depistage): service confirmed but exact room unspecified.
- [Medical records, updated 3 August 2026](https://ciusss-centresudmtl.gouv.qc.ca/soins-et-services/demande-dacces-au-dossier-de-lusager-et-registre-de-vaccination): service confirmed but public counter room unspecified.
- [Current address directory](https://ciusss-centresudmtl.gouv.qc.ca/adresses-et-coordonnees): CUMF-GMF de Verdun at 55 rue de l’Église, off hospital campus.
- [Electrophysiology](https://ciusss-centresudmtl.gouv.qc.ca/soins-et-services/consultation-avec-un-medecin-ou-une-infirmiere/consultation-avec-un-medecin-specialiste/electrophysiologie): explicitly **not offered at Verdun**. Removed previous erroneous destination.

## Conflicts and human confirmation needed
1. **Mauve M1-252 versus Black N1 612:** [Cardiology](https://ciusss-centresudmtl.gouv.qc.ca/soins-et-services/consultation-avec-un-medecin-ou-une-infirmiere/consultation-avec-un-medecin-specialiste/cardiologie), [Dermatology](https://ciusss-centresudmtl.gouv.qc.ca/soins-et-services/consultation-avec-un-medecin-ou-une-infirmiere/consultation-avec-un-medecin-specialiste/dermatologie), [Nephrology](https://ciusss-centresudmtl.gouv.qc.ca/soins-et-services/consultation-avec-un-medecin-ou-une-infirmiere/consultation-avec-un-medecin-specialiste/nephrologie), [Orthopedics](https://ciusss-centresudmtl.gouv.qc.ca/soins-et-services/consultation-avec-un-medecin-ou-une-infirmiere/consultation-avec-un-medecin-specialiste/orthopedie) and Plastic Surgery pages still cite M1-252, whereas updated detailed specialty pages cite N1 612. Preserve older specialty locations as Verify; do not transfer every specialty to N1 without a direct source.
2. **Patient Accounts:** project describes ground-floor location near main entrance; more specific May 2026 billing page gives V1-277. Use V1-277.
3. **Door 4 / 3950 boulevard LaSalle:** historical hospital entrance; current access role not confirmed. Current GMF is at 55 rue de l’Église, not Door 4.
4. **Main versus Emergency:** 4000 boulevard LaSalle main entrance is separate from Emergency on boulevard Gaétan-Laberge. Only Emergency/Yellow J1 ↔ Black N1 corridor is documented. MAIN has no invented graph edge.
5. **Public upper-floor connections:** project describes bridge connections at every level, but does not verify which are public or their wayfinding instructions. No N2–N5 graph edges.
6. **Other blocks:** Green V, Mauve M, B and Orange O have no verified public cross-block routing; keep disconnected.
7. **Missing exact rooms:** Blood Collection, Cafeteria, Spiritual Care, Medical Records, Day Surgery, Cardiology, Plastic Surgery, Dermatology, Gastroenterology, Nephrology, Orthopedics, Hemato-Oncology and the historical Mauve external-clinic counter. Verify at hospital before use.
8. **Diagnostic rooms:** B1-404 and N1-661 are documented **reception/check-in** locations, not necessarily the procedure rooms. Individual test locations must be confirmed from appointment paperwork.
9. **Atrium and family lounges:** project confirms planned features, not current room numbers, public access or opening. Marked Verify.
10. **Door 26:** 13 October closure was a one-off four-hour interruption, not an ongoing closure.

## Regression and integrity
- Shared app.js and version v0.1.0 preserved.
- 66 distinct destination records (48 official service/registration/location records, 18 Verify), including 25 additions and one removal relative to the initial 42 records.
- Unique slugs for all 66 records; bilingual search tests; node validation; conservative MAIN and J separation.
- Cache revision advanced separately to waywey-cache-4.
