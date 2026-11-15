# WayWey 1.1 — Interface Simplification candidate

Based on released 1.0.0 main commit 465d654. This feature branch does not update production.

Ambassador: compact FR / EN buttons for bilingual Quebec hospitals; search is the
main task, with a friendly prompt. The remembered starting station is a single
disclosure line with a native selector. Destination selection offers one primary
Show Visitor Directions action. Directions, verification alerts and notes remain
visible; source/audit information is accessible through native disclosures. Other
hospital interface languages remain available through their existing selector.

Ambassador language now persists per hospital in local storage across sessions,
with existing session preference as a migration fallback. Explicit guide links
still take priority. Visitor language retains its independent session preference
and explicit QR link priority. No storage keys or saved station/photo data are removed.

Visitor: separate modal surface with a full-screen mobile layout, destination,
large separated direction steps, primary localized Listen to Directions button,
secondary QR/share/back actions and source disclosure. Arabic, Persian and Hebrew
retain RTL, and all currently selectable languages remain. Verification alerts
are also explicit on the visitor surface. Speech controller and speech rates,
hospital JSON, routing/search logic, permanent links and photo workflow are unchanged.

Product version: 1.1.0-rc.1. Shell cache: 35; hospital-data cache remains 1.
No final 1.1 release is implied. Changes are for review and an isolated test preview.

Automated verification includes the existing regression/browser suite and new
checks for keyboard language toggle, cross-session persistence, station editing,
visitor primary action, source access, RTL and narrow/zoomed viewport overflow.
Speech events are mocked in automated tests; audible output needs device checks.

Before approval: Samsung Chrome and Windows visual/keyboard testing at large text
sizes; French/English preference and station restoration; every visitor language;
French/Arabic/Persian audio, Stop/replay and language-switch cancellation; QR/share
handoff and offline reopening; ambassador assessment of reduced cognitive load.
Route facts and existing unmapped-location warnings need their own field review.

An isolated public test preview was explicitly authorized by the owner. It contains
only public application code and hospital data; no patient records or uploads.
Production, its domain/DNS/access, and main are not modified by this work. Keep the
PR in draft and do not merge or deploy to production without explicit approval.
