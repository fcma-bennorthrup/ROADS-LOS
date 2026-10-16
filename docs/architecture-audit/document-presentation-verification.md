# Document presentation and local timing

## Scope and authority

The user accepted current local source as this extraction's before-refactor
reference, retaining dependency lock SHA-256
`caf5cbce73ec535033e36984f2c5d00e080a7a91c1575750b7008f7c52e9107e`.
The historical manifest remains unchanged.

Only `DisclosureDocumentsContent.tsx` changes production code. Its existing
DocumentSection entry point now composes a local controller hook, a retained
timestamp adapter, and a presentation function. They stay in the same module;
neither callers nor the package persistence hook need modification. Local hooks
remain mounted in retained mode, including their reset effects, so switching
modes does not introduce a new mount boundary. The animated ellipsis remains
in the same rendered position.

Unchanged: JSX structure, labels, classes/styles, focusable aria-disabled buttons,
callback-before-delivery-stamp ordering, scheduled callback capture, five-second
local delay, local cancellation, old delivery during regeneration, package
deadline persistence, storage errors and PDF access, activity/checklist policies.
The retained adapter forwards methods to their original receiver. No persistence,
validation, dependencies, routes, CSS, assets or package/disclosure coordination
policy was changed. No speed claim.

## Safe environment

Before editing, local source was copied to `/tmp/document-presentation-before`.
`verification/document-presentation/run.py <before-directory>` creates two
disposable copies, checks both dependency locks and reuses installed dependencies
read-only. Node transports are denied by the existing baseline guard; fixtures
use synthetic data, UTC/fixed clocks and disposable storage. The browser drivers
reuse the existing routed Documents fixture and package capture harness, never
App, with fake API/admin/PDF transports, CSP, blocked networking and a disposable
Chromium profile. No real delivery, GitHub, financial, server startup, publishing
or live preview operation was performed.

Browser commands from the disposable parent:

```
node capture.mjs
```

Prepare local captures from the workspace, then run from the disposable parent:

```
node verification/document-presentation/prepare-browser.mjs <disposable-parent>
node local-capture.mjs
```

## Results

- Existing relevant suites plus initial lifecycle characterization: **99 passed,
  1 failed in each copy** (100 total). The identical failure is
  `ClosingPackageProgress.test.tsx` → “reports failed reset removal and retains
  the displayed package progress”: it expects the old “Demo could not be reset”
  toast instead of current “Demo reset incomplete”. No expectation was changed
  or test excluded.
- Final dedicated lifecycle suite: **4/4 pass in each copy**. Covers captured
  callback, local unmount/reset cancellation, delivery ordering/repetition,
  aria-disabled focusability/guards, retained-error PDF access, and switching
  local/retained display while local generation is pending.
- Existing routed/package suites cover local cancellation versus retained
  deadline resumption, reset during generation, loan isolation, idempotent
  activity callbacks, hidden force-mounted Closing Disclosure progress and
  package storage failures.
- Non-emitting type check: **15 identical existing diagnostics**, exit 2,
  both copies; not a clean type-check pass. The first disposable run omitted
  `vite.config.ts`, causing a sixteenth diagnostic. The runner was corrected,
  and the complete-source type check was rerun. Diagnostics are retained here.
- Browser package comparison: **30/30 equal**: idle, generating, generated,
  delivered, load-error and delivery-write-error at 1440×900, 1024×768,
  390×844, 767×844 and 768×844.
- Browser local comparison: **25/25 equal**: both local categories in idle,
  generating, generated, delivered and regenerating states at the same sizes.
- Each browser pair compares exact screenshot bytes at top and scrolled bottom,
  ordered element text/tags, measured font/color/background/padding/margin/
  display/overflow/geometry/scroll sizes, disabled attributes, focus text and PDF
  open arguments. Package checks use keyboard tab selection and Enter to view;
  local checks use Enter for At-App PDF and scripted clicks for other actions.
- The first local browser attempt compared body text as focus while no control
  was focused, inadvertently including the different inline JavaScript source.
  The driver now focuses the same Generate button in both copies before capture.
  No UI styles or pixel tolerance changed.
- Inspected the delivered desktop local screenshot directly. PDF hashes and
  unchanged package hook/caller hashes are recorded in `integrity.json`.
- After captures, the adapter's method forwarding was made explicitly receiver-
  preserving (no markup change); the final lifecycle suite passes on that version.

Small browser result/hash ledgers are in `document-presentation-evidence/`.
PNG files remain disposable `/tmp` output, not committed assets.

## Remaining acceptance limits

External fonts were blocked, so these are fallback-font comparisons, not
font-loaded certification. Scripted clicks and selected keyboard actions are
not exhaustive pointer/Tab/Space traversal. Real background-browser-tab
throttling was not exercised; fake-clock deadline/resumption and force-mounted
panel behavior are covered separately. No live PDF viewer was opened.
No overlays were changed; their existing routed tests ran, but this capture
matrix does not claim new visual coverage of every inherited overlay.

The inherited test/type failures remain explicitly failed. The user explicitly
accepted these bounded evidence limits after reviewing the results. Acceptance
does not turn unverified checks or inherited failures into passes.
