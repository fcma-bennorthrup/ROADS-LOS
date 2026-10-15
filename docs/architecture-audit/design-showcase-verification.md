# Dormant showcase verification

## Scope and authority

Verification only. The user explicitly accepted current local source as the
reference **for this task only**, retaining the accepted dependency snapshot.
Historical reports/manifests and the shared runner were not changed. No routing,
component, token, style, asset, dependency, runtime or production behavior changes.
No live App, workflow, service, GitHub operation or financial endpoint was run.

The showcase and its five direct primitives still match the historical audit;
unrelated merged source differences required the explicit scoped acceptance.
Token-equivalence work remains separate; literal captions are preserved, not
normalized to computed colors.

## Results

- Locked disposable installation passed; installed versions were checked against
  every lock entry, permitting only absent optional packages.
- Node `v24.13.0`; accepted lock SHA-256:
  `caf5cbce73ec535033e36984f2c5d00e080a7a91c1575750b7008f7c52e9107e`.
- The 169-file task-local preservation set (client/server/shared and ordinary
  root files) remained unchanged in both workspace and disposable copy.
  Aggregate: `59b37913f17fd274db127fa2e2a95f4434493063ca2d5d1262e95b3b64d8e39f`.
  Definition: sorted path + NUL + SHA-256 + newline, then SHA-256.
- Browser matrix: **28 passing states**: widths 375, 390, 639, 640, 1023,
  1024, 1440; light/dark ancestry; blocked/loaded fonts. Heights respectively
  844, 844, 900, 900, 768, 768, 900. Actual viewport dimensions asserted.
- **260 below-fold capture pairs** were byte-identical in their respective
  settled state. Additional focus, hover and active captures were saved.
- Existing declared font stylesheet and 26 referenced files were acquired using
  the existing bounded font downloader. Source Sans Pro loaded status was
  asserted in each loaded-font state. Blocked states omit font bytes and deny
  font loads. Original CSS and font declaration source remained unchanged.

## Proof inventory

| Contract | Result |
|---|---|
| Exact copy and DOM test-ID order | Fixed SHA-256 fingerprints of full rendered text and ordered IDs; no automatic snapshot update |
| 22 swatches, 9 typography rows, 10 spacing rows, 3 radii | Exact ordered IDs asserted, including component-s after component-l |
| 8 buttons, 2 inputs, 4 badges, 2 cards, 6 tiles | Exact order/count asserted; current names/copy retained |
| Native buttons | Every button pointer-clicked and activated with Enter and Space; unchanged DOM and URL, no form exists |
| Enabled input | Starts empty, label pointer activation focuses it, native character typing and clipboard Ctrl+V paste work, selection/Backspace clears |
| Disabled input / focus | Disabled and empty after pointer attempt; native traversal is eight buttons then enabled input; next Tab skips disabled input |
| Remount | New uncontrolled input is empty; complete measured geometry/computed style returns to initial settled output |
| Responsive CSS | Palette grid is 1/2/3 columns at existing sm/lg boundaries; typography switches column/row at sm; all section geometry recorded |
| Below fold | Every section tiled at viewport-height-minus-80 intervals; no initial-viewport-only claim |
| Colors, typography, spacing, radii | Computed styles and child geometry recorded in every matrix state; no cross-representation equivalence claim |
| Route absence | App read as text only; exact existing route path order asserted and showcase import/name absent |
| Isolation/imports | Bundled input graph excludes App, contexts, hooks and server; fixture lives outside production Tailwind content scan and entry graph |

## Failure history and limitations

The first browser run passed the seven blocked-font light states, then failed
on dark badge colors: the fixture measured immediately after toggling ancestry,
before existing color transitions completed. The corrected fixture waits 250ms
without disabling or editing transitions. The full subsequent matrix passed.
This was a fixture-timing correction, not a production repair or changed expected
color. The initial command result is retained in the first results ledger rather
than rewritten to disguise the failed attempt.

Screenshot equality here is **consecutive settled-capture repeatability**,
not independent baseline/candidate builds. There is no changed production
candidate. Measured geometry/style equivalence across remount is stronger than
a static screenshot but does not certify animation trajectories.

At 375px, document height was 6568px with blocked fonts and 6480px with loaded
fonts in both light and dark states; this existing font-dependent wrapping is
recorded, not repaired. Selected actual captures were visually inspected:
loaded desktop Components, blocked dark mobile palette, and loaded 640px
semantic mapping. This is not a claim of manual inspection of every PNG.

Clipboard proof is Chromium's disposable-profile clipboard, not every operating
system/browser integration. Browser autofill, assistive technology, Firefox/WebKit,
performance, live routing and repository-wide static checks are not certified.
No task scope requires those broader certifications. Known historical static
check failures were not repaired or hidden. Guards are defense for trusted local
fixtures, not an OS-level security sandbox.

## Reproduction and evidence

See `verification/design-showcase/README.md`. Initial disposable evidence was
`/tmp/design-showcase-frhulpsh`; the corrected browser run updated its browser
log and capture evidence, not the original runner failure ledger.

The final complete runner executed successfully in
`/tmp/design-showcase-az8c9leg`: **install 0, fonts 0, browser 0;
source unchanged true, copy unchanged true**. Its `results.json` includes the
per-file preservation ledger, installed versions and exit statuses; its
`captures/evidence.json` contains all 28 states and 260 paired-capture hashes.
Evidence files are generated outside Git; the permanent deliverable is the
bounded reproducible fixture plus this report.
