# WayWey RC3 test report — 2026-10-31

Tested commit: 5245ede5a28ff4054b1bee9badbde98d4735d939 (release/v0.2.0-rc3).
Production main at inspection: 0cd3bc919378b76e09f94ee1168009f52fef8880 (v0.1.0).
Recovery branches confirmed: backup/v0.2.0-rc3 and backup/pre-v0.2.0-2026-10-30.
No application changes or production deployment made during this test pass.

## Automated results

- Hospital schema and cross-file validation: 5 packages, 0 errors, 7 warnings.
- Node regression suite: 44 passed, 0 failed.
- Module and service-worker syntax: passed.
- Modularisation smoke checks: passed.
- All-hospital search audit: 7,407 assertions passed over 636 destinations, including 1,954 fuzzy mutations (487 deletions, 489 insertions, 489 substitutions, 489 transpositions).
- Release-candidate invariants: passed.
- GitHub Actions run 41209454202: completed successfully for the exact tested commit.
- Additional independent all-pairs routing check: 268 pairs passed. Compared findRoute output lengths with Floyd-Warshall distances and checked every returned edge exists in the graph.

| Hospital | Destinations | Routing pairs checked | Reachable distinct-node pairs | Unavailable distinct-node pairs |
| --- | ---: | ---: | ---: | ---: |
| JGH | 190 | 64 | 56 | 0 |
| CHUM | 119 | 9 | 6 | 0 |
| Glen | 106 | 25 | 12 | 8 |
| Verdun | 66 | 49 | 2 | 40 |
| Hadassah | 155 | 121 | 1 | 109 |

These figures test encoded data and algorithm behaviour, not physical access or completeness of real hospital routes.

## Real-browser observations

Used cloud Chrome with a raw.githack.com preview pinned to the tested commit. The cloud browser could not reach the workspace localhost server. This is preview testing, not production certification.

- Root selector displayed all five hospitals and v0.2.0.
- All five hospital clean paths redirected to the correct hospital and loaded their expected destination counts.
- MRI returned results in all five hospital UIs:
  - JGH: MRI, Pavilion D, D-205.
  - CHUM: Radiology and MRI, D0350 (Radiology appeared first).
  - Glen: Adult MRI, C 02.5022.
  - Verdun: MRI radiology reception, B1-404; examination room still requires confirmation.
  - Hadassah: MRI Center, Clinics Building, floor -1.
- JGH typo cardiolgy returned Cardiology, E-206.
- Glen same-building MRI directions rendered; visitor dialog opened.
- Glen visitor language changed to Hebrew with dir=rtl.
- QR dialog rendered a link preserving hospital, destination, starting station and Hebrew language. Opening that exact URL restored the visitor dialog and expected directions. Physical QR scanning was not tested.
- Hadassah MRI from Main displayed an explicit missing-route warning. Selecting results from English, Hebrew and Arabic queries produced warnings in the corresponding query language.
- Hadassah Main to Delivery Rooms displayed the documented Main-to-Mother-and-Child instructions.
- Hadassah Arabic quick guide opened correctly.
- Voice control and provider privacy notice were visible; recording was not activated.
- An update-ready action was visible in this preview; update activation and cache migration were not tested.

## Findings and remaining release gates

1. Search passes the implemented automated requirements. This does not establish every conceivable typo or missing synonym.
2. Hadassah route coverage remains limited to MAIN -> MC. The other 109 distinct-node ordered pairs have no encoded path. Missing-route warnings are correct, but inter-building coverage is still incomplete. Relevant file: hospitals/hadassah-ein-kerem/routes.json.
3. Verdun has only 2 reachable distinct-node pairs and 40 unavailable pairs. Glen has 8 unavailable pairs. Missing paths must not be filled without validated route evidence.
4. Hadassah quick guide has Hebrew, English and Arabic only. No French guide button was available, and hospitals/hadassah-ein-kerem/guide.json lacks a fr entry. This is a gap relative to the previously requested four-language guide scope.
5. Validator warnings: CHUM records 60 and 76 reference B; JGH records 35, 145 and 154 reference M, record 75 references I, and record 146 references F (zero-based indices). These are intentionally unmapped or need review, not schema errors.
6. Physical Android/iOS narrow-screen usability, actual speech recognition, text-to-speech output, offline revisit, unvisited-hospital offline behaviour, service-worker upgrade, and complete keyboard/focus behaviour remain unverified in this pass. The browser control surface does not provide device/offline emulation here.
7. Production remains v0.1.0. The passing release-candidate results must not be presented as proof that the live version contains these fixes.

Release decision: automated gates pass; partial real-browser smoke coverage passes. Do not mark the complete release checklist finished.
