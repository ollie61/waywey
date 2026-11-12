# WayWey v0.3.3 — JGH Admissions room-side correction

## On-site correction
The ambassador clarified on November 12, 2026 that, from the JGH Main Entrance, the visitor turns right toward Admissions and room B-114 is on the **left** side of the hallway. The previous v0.3.2 phrasing incorrectly stated the room was on the right.

## Scope
- Corrected the second Admissions direction in all ten supported visitor languages.
- Preserved the confirmed initial right turn from the main entrance.
- Added English and French automated assertions for the corrected left side.
- No other JGH routes, floor instructions, or destinations were changed.
- No patient-identifying photo was published.

## Release and rollback
- Version: v0.3.3; service-worker cache: waywey-cache-29.
- Previous production baseline: 9ecd6a0fcce29fee523ed2820e558e0b10782103 (v0.3.2).
- Review all hospital data, multilingual search, regressions and browser visitor tests before merging.
