# Token equivalence verification results

## Snapshot history and current-source verification

The completion synchronization brought in other approved tasks after the
measurements below. **23 original manifest paths now differ from the measured
snapshot**, including closing-disclosure-history.ts used by the Documents
fixtures. The five token-map source files and accepted dependency files still
match, but the full current tree is no longer the verified copy.
Exact paths and before/current hashes are in
`token-equivalence-evidence/post-sync-drift.json`.

The memory-only merge conflicts were resolved by preserving both sets of
notes. No production source was changed by this task to resolve them.
The preservation and browser results below apply to the recorded **pre-sync
snapshot only**, not to the subsequently merged application. The strict runner
will reject current whole-tree drift. No historical manifest or expected hash
has been overwritten to bypass that gate.

The user explicitly chose **Verify the newly merged source**, rather than
accepting this older snapshot alone. The separately pinned current baseline
contains the original 174 paths plus 11 newly added client/server source files
so the CSS scan includes the full current source tree. The historical evidence
below is retained without replacing its measurements or its four failures.
See [token-equivalence-current-results.md](token-equivalence-current-results.md)
for the authorized current-source rerun. Authorizing a newer source snapshot
does not authorize dependency/token changes, image tolerances or production
repairs.

## Historical run: authority and completed scope

The user approved the map and exemptions in
[token-equivalence-specification.md](token-equivalence-specification.md).
Only verification code, reports and project memory were added/updated.
No application source, CSS, token, caption, asset, dependency or runtime
configuration changed. No production fixes are authorized by these results.

**Verification outcome: authored checks pass; strict browser pixel acceptance
fails in four capture states.** All planned matrix categories were exercised.
This is a delivered verification finding, **not** clean visual sign-off.
No tolerance, token repair or expected-image refresh was applied.

Run from the project root:

```sh
python verification/tokens/run.py
# Use the disposable directory printed above:
python verification/tokens/prepare-fonts.py <work>/fonts
python verification/tokens/browser.py <work>
python verification/tokens/pixel-differences.py <work>/browser
```

The runner uses a fresh disposable directory with the accepted lock,
`npm ci --ignore-scripts --no-audit --no-fund`, no inherited secrets/user npm
configuration, and UTC. The existing shared Node network guard is active
for all checking and CSS-emission commands. The user separately authorized
downloading and pinning the already-referenced font resources during preparation.
No live App is mounted. Authored checks parse TypeScript AST/PostCSS without
executing production modules; browser fixtures mount unchanged controls with
synthetic records and disposable storage. They fix Date, randomness and UTC,
embed font bytes locally, block external URLs and browser transport APIs, and
use CDP pipes/file URLs without a server. No actual loan record, financial
endpoint, GitHub call, workflow restart or deployment is involved.

## Measured results

Node v24.13.0. Disposable evidence directory for this run:
`/tmp/token-verification-aqg01ccr`. Browser: Chrome/152.0.7977.64.
Durable raw evidence is in `token-equivalence-evidence/`.

| Requirement | Actual result |
|---|---|
| Explicit equivalence map and exemptions | Approved; encoded in owned AST checks |
| Accepted dependency installation | Exit 0; installed package versions match lock, absent entries permitted only when marked optional |
| Mapped authored values and references | Pass: 219 explicit equality assertions; additional parser uniqueness assertions also executed |
| TS catalog insertion order | Typography and spacing order explicitly checked; showcase entries checked in authored order |
| Intentional differences | CSS-only tokens/typography, missing Tailwind entries, independent status/radius values explicitly asserted |
| Semantic HSL, dark overrides, captions, fallback declaration order | Preserved by exact source-byte hashes, **not** claimed equal to ROADS values or browser output |
| CSS emission | Both Tailwind CLI invocations exit 0; unchanged full production content scan |
| Emitted CSS bytes/order | Both SHA-256 `29e55adcb65a4f442fc4fe082c33647a537f94322be5e4336a927750dd4e579d` |
| Source, assets, configuration and dependency preservation | All 174 manifest paths byte-identical before/after in project and disposable copy |
| Type check / unrelated suites | Not rerun; accepted baseline report's 15 diagnostics remain historical, not a new pass |
| Shared consumers | All 47 UI wrapper modules, both ROADS controls, and real Documents Sheet/status popover mounted with synthetic inputs |
| DOM/computed styles/geometry/focus/state | All 1,602 paired state comparisons match exactly |
| Pixel output | 572 of 576 PNG pairs match; four fail exact pixel equality, detailed below |
| Hover/focus/disabled/error, keyboard and overlays | Exercised in isolated matrix; exact ordered DOM, values, active focus and computed styles compared; not a general accessibility audit |
| Font-loaded / font-blocked states | Both exercised; loaded runs assert actual Source Sans Pro and Inter faces; blocked runs assert no loaded downloaded face |
| Viewports and below-fold | 228 scene pairs across 15 viewport sizes and both font modes; full-page captures plus explicit Sheet-body scrolling |
| External requests / uncaught browser errors | Zero observed in the matrix |
| App workflows / accessibility compliance / performance | Not certified; full App was never mounted |

The two emissions use identical unchanged production inputs; this demonstrates
stable output from those inputs, not a before/after style migration or browser
computed-style equivalence. Fixtures are outside `client/src` and are not
added to Tailwind's content scope. Exact source hashing intentionally catches
unapproved independent-semantic or caption edits too; do not refresh hashes
automatically to make failures disappear.

## Reconciled historical departures

The original 174-file audit has 170 matching paths. Four inherited differences
are explicitly pinned by the owned runner, not silently accepted as new
baseline values:

- package-lock.json: matches the dependency snapshot explicitly accepted for
  disposable validation in `validation-baseline.md`.
- SETUP.md and replit.md: match hashes already recorded in approved
  documentation work and existing History/Decisioning verification runners.
- server/index.ts: the current metadata-only logging implementation is the
  approved logging change. In memory only, reinserting the preserved original
  middleware reconstructs the exact historical SHA-256
  `9b0f5a62495c0af6eb24993b8545bbd4043034cb7a2c2c0e8f25fd8ca46648e2`.

Neither the historical manifest nor shared verification runner was edited.

## Browser matrix, failures and acceptance boundary

Main viewports: 1440×900, 1024×768, 390×844. Additional widths:
599/600/601, 639/640, 767/768, 1023, 1279/1280, 1535/1536.
The main viewports run all 18 scenes in each font state; edge widths run the
five form/collection/navigation/sidebar/normal-Documents scenes in both states.
Actual innerWidth/innerHeight are asserted rather than inferred from window
size. Full-page capture may exceed viewport width when existing synthetic
table content overflows; no clipping/normalization hides that overflow.
See `verification/tokens/README.md` for exact controls, actions and limits.

The final matrix reports these **failed** PNG comparisons:

| Capture | Changed pixels | Maximum color-channel delta |
|---|---:|---:|
| 390×844, blocked font, Documents Sheet below fold | 8 | 1 |
| 601×844, loaded font, Documents Sheet below fold | 42 | 1 |
| 1536×900, blocked font, Documents Sheet open | 17 | 1 |
| 1536×900, blocked font, Documents Sheet below fold | 17 | 1 |

Every corresponding DOM/computed-style/geometry hash matches. Differences
occur in rendering identical, hash-preserved sources; small rounded-edge
rasterization differences are a hypothesis, not permission to label failures
as passes. The runner exits nonzero and preserves all failure labels/hashes.
**Strict visual acceptance remains blocked.** Resolving the browser-rendering
variance or approving any comparison policy change needs an explicit separate
decision; do not repair production styles or introduce tolerances implicitly.

Initial fixture attempts also exposed inconsistent resolved auto-margins on
the fixture's own centered main element after datepicker focus, despite equal
rectangles. Longhand reads alone did not fix it. Removing unnecessary
fixture-only auto-centering resolved that issue, without app edits or style
tolerances. The first mobile pixel failure stopped the run; it was reproduced,
then the runner was changed to retain pixel failures and continue collecting
the remaining matrix instead of stopping at the first failed comparison.
Completed scene results were carried forward; only the interrupted scene and
remaining matrix were resumed. No expected production snapshot was edited.

The authorized font preparation captured 26 resources from the existing HTML
font reference. Public URLs and exact byte hashes are pinned in
`token-equivalence-evidence/font-manifest.json`; later remote drift is rejected.
Preparation is separate from tests, which load embedded data URLs only.

Durable evidence includes authored results, accepted installed versions,
pre/post production hashes, font manifest, browser bundle/CSS hashes, all 1,602
comparison hashes and pixel-difference counts. Large PNGs, font bytes and browser
profiles remain in the disposable directory, not Git. Those temporary files
may not survive a workspace reset; the pinned runner reproduces the evidence
or fails explicitly if required font bytes are no longer available.

Stable-state captures finish finite animations and pause infinite animations;
transition trajectories are not measured. Dark-theme/browser-engine expansion
and full showcase behavior are not inferred from this light-theme Chromium
matrix. No runtime, accessibility or performance improvement is claimed.
Two separate follow-ups were proposed for automatic token gating and dark-theme
shared-control checks, not for normalizing the approved differences.
