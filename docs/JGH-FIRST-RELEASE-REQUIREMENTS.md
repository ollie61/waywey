# WayWey 1.0 — JGH-first release requirements

Decision: JGH is the sole active hospital in the first WayWey 1.0 release.

## Entry point
- Visiting https://waywey.gobleuer.com/ must open the Jewish General Hospital ambassador experience directly, without a hospital picker.
- Preserve the ability to restore a multi-hospital entry point in a later release without losing the existing hospital datasets.
- Verify the domain's actual DNS, hosting and routing configuration before any cutover. Do not presume DNS changes are needed: the desired behavior may be an application route change.
- Do not change the current production domain or GitHub Pages configuration until staging is tested and the owner approves release.

## JGH workflow
- French is the default ambassador language; English remains available.
- Ambassador station is remembered per shift; language selection remains consistent across navigation.
- Visitor language is independent, displayed in its native script, with appropriate RTL behavior.
- No microphone-based search or speech-recognition controls.
- Visitor text-to-speech is optional, with Arabic speech explicitly requiring Android device verification.
- Search handles synonyms, fuzzy matches, MRI and common service queries.
- Routing must not invent turns, pavilion changes, elevators, floors, or room sides. Source-backed and on-site-verified facts are distinguished.
- Support JGH route-photo workflow: camera/gallery, accept, retry, replace; avoid identifiable patients.

## Release gate
- Complete JGH dataset/search/route regression tests and browser journeys.
- Check production served version, cache revision, domain entry behavior and rollback.
- Require explicit owner approval before production cutover.
