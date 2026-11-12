# WayWey v0.3.2 — JGH verified Admissions directions

## Scope
- From the JGH Main Entrance at 3755 Côte-Sainte-Catherine to Admissions and Patient Accounts (B-114), on-site ambassador observation confirms: turn right toward Admissions; room B-114 will be on the right.
- New station-and-destination-specific direction entries are used **only** for the main station and canonical Admissions destination. Other starting stations and destinations continue to use existing routes.
- Instructions are available in all 10 supported visitor languages and the ambassador's selected language.
- Photos are **not** published; the on-site source image includes identifiable people.

## Data safety
- No inferred indoor turns, elevator banks, floors, or room changes were introduced.
- Routing schema and hospital validation now verify destination IDs and station IDs referenced by these instructions.
- Automated tests verify the specific direction, room number, and visitor translations.

## Release and rollback
- Version: 0.3.2; service-worker shell cache: waywey-cache-28.
- Baseline: main commit a8be7ae2989752f948d02d2444e96f33aba0ca38.
- Earlier backup branch: backup/pre-jgh-photo-capture-2026-11-12. The precise v0.3.2 pre-merge baseline is the commit above.
- Required before merge: full GitHub Actions validation and browser journey checks, then on-site review.

## Real-world verification
- Captured turn and destination side are based on the ambassador's 2026-11-12 on-site report. No precise hallway distances or further turns were asserted.
