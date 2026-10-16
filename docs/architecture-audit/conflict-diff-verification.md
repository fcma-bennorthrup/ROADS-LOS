# Conflict diff memoization verification

## Scope and authorization

Only `DiffViewer` in `client/src/components/ConflictResolutionDialog.tsx`
changes: splitting and maximum-length calculation move inside the existing
memo callback, whose dependencies become the two content strings. Row
construction, JSX, classes, keys, state ownership and transports are unchanged.
No semantic diff, virtualization, dependency change or sync-policy repair.

The user explicitly approved proceeding with focused checks despite the
accepted baseline's 15 unrelated TypeScript diagnostics and unavailable
font-loaded visual acceptance. Those limits remain; no overall clean static
check or production font equivalence is claimed.

## Reproduction

`python verification/conflict-diff/run.py`

The runner makes a disposable copy, installs the accepted lock with scripts
disabled, uses the existing shared Node network guard during bundling, and
runs Chromium against file-only fixtures over CDP pipes. It never mounts App
or starts the backend. Synthetic content, a fixed Date, UTC timezone, isolated
browser profile, denied network URLs, CSP and throwing browser transports
prevent real GitHub/financial operations. CSS is compiled from the unchanged
project styles. External fonts are blocked in both variants.

The baseline is reconstructed from the candidate by reversing only the
memoization edit; its complete source must match the audited SHA-256
`4917b3326a59a715199fc8fc304b2536b0faa9cefdaa505a64e8a8f59db33a51`.
Fixture-only instrumentation counts memo callback executions. The production
file has no counters or test exports.

## Results

The disposable installation succeeded. The final browser pass reported:

| Viewport | Exact state comparisons | Original selection computations | Candidate |
|---|---:|---:|---:|
| 1440×900 | 11 | 3 | 0 |
| 1024×768 | 11 | 3 | 0 |
| 390×844 | 11 | 3 | 0 |
| 639×844 | 11 | 3 | 0 |
| 640×844 | 11 | 3 | 0 |

All 55 comparisons passed exact dialog DOM, row text/order, computed styles
and element geometry, scroll dimensions/position, focused element and PNG
hash equality. Fixtures cover both null, both empty, missing either side,
changed lines, trailing newlines, unequal lengths and 400/403 long lines.
Long-file states include scrolling below the fold, Keep Mine, Take Theirs,
manual editor opening and Tab focus. Literal expected row assertions protect
the positional comparison and empty-line behavior independently of equivalence.
Switching files checks content changes invalidate the memo.

Initial captures failed because capture timing did not consistently allow
the existing transitions to settle (first a geometry/pixel difference, then
a small mobile pixel difference). The harness now waits 800 ms after state
changes; no CSS, animation, screenshot threshold or expected image was altered.
The final complete comparison passed without masking differences.

## Limits and evidence retention

- Counts demonstrate avoided row construction in the measured selection
  sequence, not faster overall rendering. No timings or speed claim.
- Existing mobile clipping/overlap is preserved, not fixed.
- This is bounded viewer/selection verification, not exhaustive mutation,
  query, loading/error, dismiss, manual-save or backend-sync characterization.
  Those paths are textually unchanged and broader sync verification is already
  assigned separately. No real resolve/dismiss operation was exercised.
- The 15 pre-existing TypeScript diagnostics were not repaired or rerun.
- Font-loaded rendering remains unverified, as approved.
- Screenshots and detailed results were written to disposable `/tmp` storage
  and inspected during execution. That directory was no longer available at
  final handoff; binary evidence is not retained in Git. Console pass results
  above are recorded from the run, and the committed harness reproduces them.
- The final runner additionally checks installed versions and copied-file
  preservation. Those final bookkeeping assertions were added after the
  successful capture pass and were not rerun; they are not claimed as measured
  passes. The application and capture code did not change after the pass.
- The live workflow was not started/restarted and the live preview was not
  opened, honoring the isolated-only boundary.

No new follow-up is proposed: broader conflict interaction and transport
coverage belongs to the existing sync-characterization task, and dependency
and font acceptance remain explicitly reported limits rather than new scope.

## Integration note

During completion, the main branch supplied the independently approved
blocked-conflict cancellation branch in this same component. It does not change
DiffViewer or the synthetic non-blocked path measured here. The harness also
accepts that precisely identified baseline hash
`258f0e8fae840c00d5ba55a4e6a4bbb7c4e3298e4b5bbec4990109dab53ab05d`;
this is not a screenshot update. The blocked branch is retained unchanged and
was not browser-tested by this task. Only the notes index needed manual merge
resolution; both sets of notes were preserved.
