# WayWey release checklist

Use this checklist for a product milestone or any release that changes the shared application engine.

## 1. Freeze a recovery point

Before release work:

- [ ] Record the exact current production commit.
- [ ] Create/confirm a recovery branch for the pre-release state.
- [ ] Confirm the release branch can be reverted without reconstructing files manually.

Do not rely only on “Git history exists.” A named recovery point makes rollback immediate and unambiguous.

## 2. Version discipline

WayWey uses semantic product versions independently from service-worker cache revisions.

### Product version

Update `APP_VERSION` when this is a genuine user-visible release milestone.

Examples:

- bug/data fix with no planned release boundary: usually patch or no version change until bundled;
- backward-compatible feature milestone: minor version;
- incompatible public behaviour/data contract: major version.

Before release:

- [ ] `APP_VERSION` matches the intended release.
- [ ] README/milestone documentation references the correct version.
- [ ] The root hospital selector displays the correct version.
- [ ] No stale prior-version text remains in user-facing documentation.

### Cache versions

- `SHELL_CACHE` may advance whenever shell assets change inside the same product version.
- `DATA_CACHE` should advance only when existing cached hospital data must be invalidated because its format/semantics changed.
- Pure hospital JSON changes normally need neither a shell-cache bump nor data-cache invalidation.

## 3. Automated validation

Required:

```bash
python scripts/validate_hospitals.py
node --test tests/*.test.mjs
```

GitHub Actions must be green for the release head.

Confirm:

- [ ] hospital schemas pass;
- [ ] cross-file routing/config checks pass;
- [ ] application modules parse;
- [ ] service worker parses;
- [ ] search tests pass;
- [ ] routing tests pass;
- [ ] PWA tests pass;
- [ ] provenance tests pass;
- [ ] accessibility tests pass.

## 4. Manual smoke test

Use at least one LTR hospital and Hadassah for RTL/multilingual coverage.

### Root and selection

- [ ] Root opens the hospital selector.
- [ ] Every hospital card opens the correct hospital.
- [ ] Clean paths such as `/jgh/` preserve deep-link query parameters.

### Search

- [ ] Exact service search.
- [ ] Alias search.
- [ ] Room code with punctuation.
- [ ] Room code without punctuation.
- [ ] Plausible typo.
- [ ] Verify result is visually obvious.
- [ ] Search works in every configured ambassador language for the sampled hospital.
- [ ] Voice search appears only when the browser exposes compatible speech recognition.
- [ ] Voice capture starts only after the user activates the microphone control.
- [ ] A spoken query populates the existing search field/results rather than bypassing ranking.
- [ ] Voice capture is single-shot/non-continuous and can be stopped.
- [ ] The microphone/browser-provider privacy notice is visible when voice search is available.
- [ ] Unsupported browsers retain normal typed search without an error or dead microphone control.

### Routing

- [ ] Same-area route.
- [ ] Known validated cross-building route.
- [ ] No-route case shows a warning and does not invent a path.
- [ ] Off-site/unmapped destination behaves correctly.
- [ ] Verify route warning remains visible.

### Visitor handoff

- [ ] Visitor dialog opens.
- [ ] Visitor language switch works.
- [ ] QR opens the same destination/start station/language.
- [ ] Share/deep link works.
- [ ] Text-to-speech starts with the selected visitor language where the browser supports it.
- [ ] Outdoor-map handoff appears only for a destination with explicit `outdoorMap.query`.
- [ ] A similar unrouted destination without outdoor-map metadata does not show the map action.
- [ ] The external map opens only after the user activates the link.

### RTL and accessibility

- [ ] Hebrew interface direction is RTL.
- [ ] Arabic interface direction is RTL.
- [ ] Keyboard skip link works.
- [ ] Search results can be activated by keyboard.
- [ ] Dialog focus stays inside the open dialog.
- [ ] Closing a dialog returns focus sensibly.
- [ ] Touch controls are usable on a narrow phone viewport.

### PWA

- [ ] First online visit loads current hospital data.
- [ ] Revisit works with that hospital offline.
- [ ] An unvisited hospital is not assumed to be available offline.
- [ ] Offline indicator appears when offline.
- [ ] Waiting service-worker update shows an Update action instead of silently replacing the current session.

## 5. Production merge and deployment

- [ ] Draft PR is reviewed.
- [ ] Final release head is known.
- [ ] Merge only the reviewed milestone/feature branch into `main`.
- [ ] Inspect the final GitHub Pages deployment/Actions result.
- [ ] Do not treat cancelled intermediate deployments as a production failure if a later final deployment succeeds.
- [ ] Confirm the public site reports the intended product version.

## 6. Post-release

After the final deployment succeeds:

- [ ] Perform a short production smoke test.
- [ ] Create a version tag such as `v0.2.0` for a true release milestone.
- [ ] Keep the pre-release recovery branch until the release has been proven stable.
- [ ] Record any discovered regressions before starting the next milestone.
- [ ] If rollback is required, restore the named recovery point rather than attempting ad-hoc partial edits under time pressure.
