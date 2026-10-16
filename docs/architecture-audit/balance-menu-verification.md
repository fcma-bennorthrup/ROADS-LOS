# Balance-menu lifecycle extraction

## Scope and baseline

Only the duplicated local state/ref/outside-mousedown effect in
`BalanceSheetSection.tsx` was extracted to a file-local hook. Asset and liability
cards each call it independently. JSX, SVG triggers, delete callbacks and their
`onDelete(); setMenuOpen(false)` ordering are unchanged. No adjacent defect,
accessibility behavior, dependency, style or persistence change is included.

The user explicitly accepted the six current source differences identified by
the initial gate for this task-only comparison. Their exact hashes, the accepted
documentation exceptions and unchanged disposable-validation lock are pinned in
`verification/balance-menu/run.py`. The historical manifest and shared runner
remain unchanged. The runner reconstructs the pre-extraction component by
reversing only the mechanical extraction and requires its SHA-256 to match
the original audit manifest. Thus all remaining component bytes, including
markup and delete order, are checked, not merely assumed unchanged.

## Reproduction and measured results

Run `python verification/balance-menu/run.py`.

The runner creates a disposable `/tmp/decisioning-verification-menu-*` copy,
installs the accepted lock with scripts disabled, and reuses the accepted
Decisioning fixtures, fixed clock, UTC timezone, network guard, inert admin
boundary, original CSS and blocked-font browser policy. No live App, backend,
workflow, external financial/document operations or GitHub transport is started.
The browser capture driver is derived in the disposable copy; shared fixtures
are never rewritten.

Final run: `/tmp/decisioning-verification-menu-rw392i00`.

| Check | Result |
|---|---|
| Baseline targeted tests | 35 passed across 3 files |
| Candidate targeted tests | 35 passed across 3 files |
| Browser captures per version | 18: six states at 1440×900, 1024×768, 390×844 |
| Screenshot bytes | All 18 baseline/candidate PNGs exactly equal |
| DOM/text/order | Exact equality in all captured states |
| Computed styles, geometry, scrolling, active focus | Exact equality in all captured states |
| Actual viewport dimensions | Asserted against requested dimensions |
| Uncaught browser exceptions | None |
| Workspace source preservation during verification | All 174 entry hashes unchanged |
| Whole-project type check/build | Not rerun; no claim existing diagnostics are repaired |

The focused lifecycle tests exercise both card kinds in both current/non-current
categories: toggle; inside mousedown; outside click alone (no dismissal);
outside mousedown dismissal; Escape no-op; borrower switch while open; another
card being edited; independent simultaneous opens via programmatic clicks;
deletion on click, not mousedown; focused delete control; and open-menu unmount.
Each registered mousedown callback must be removed exactly once, with the same
callback identity. Existing Decisioning tests also cover sidebar remount, raw
save/discard values, household-like drafts, empty/unequal columns and the
unchanged known earlier-row-deletion defect.

Browser states cover income, below-fold liability menu with asset editing,
both menus, hover, focused delete button, and checklist/activity overlays.
The desktop focused-menu image was also visually inspected.

## Initial comparison failure and correction

The first run passed both 35-test suites and all 18 screenshot byte comparisons,
but failed raw computed-style equality: Chromium enumerated custom CSS property
names in a different order, and the unrelated checklist animation was still
moving during geometry sampling. The driver now sorts property names (without
dropping values) and waits for existing animations to finish. The complete
comparison then passed; no application code, CSS or expected screenshot was
changed to conceal a difference.

## Limits

The user explicitly accepted the following browser-verification limits and
authorized completion. This acceptance is scoped to this extraction, not future
refactors.

External font bytes are deliberately blocked, as in the existing isolated
fixtures. Font-loaded rendering is not certified. Scripted mouse events and
programmatic focus do not certify physical pointer hit-testing, full keyboard
traversal or assistive technology behavior. The SVG remains unfocusable and
Escape remains a no-op. Narrow-screen clipping is retained, not repaired.
No new balance-specific breakpoint exists; only the three required default
viewports were measured. No performance gain or general memory-leak claim is
made; listener assertions concern only the exercised lifecycles.

No PDFs, network-query implementation, loading/error branches, calculations or
storage implementations were modified. Existing route characterization was
rerun, but unrelated full-route document operations were not duplicated.
Generated screenshots/bundles/full computed-style captures remain in disposable
storage rather than Git. Re-run the command to regenerate them.

Existing financial-identity and accessibility recommendations cover adjacent
issues; no duplicate follow-up or adjacent fix is included.
