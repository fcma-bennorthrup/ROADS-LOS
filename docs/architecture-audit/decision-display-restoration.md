# Decision display restoration

## Approved scope

The user explicitly approved:

- Restore **Loan Approved** on Summary mount only when this loan's existing
  Loan Decision action 0 is complete.
- Restore View/Deliver Decision Letter access only when this loan's existing
  Decision Letter action 0 is complete.
- Apply this to sidebar return, route return, reload and returning to a loan.
- Retain the existing per-loan checklist storage lifetime. No new storage.
  Missing, invalid or unreadable saved statuses do not establish completion.
- Credit remains local and returns to `--` on remount; approval does not imply
  a credit pull.
- Restoration produces no toast, activity, new timestamp or workflow transition.
  Preserve Reset Demo, PDF target, styling and workflow action ordering.

The user separately approved **current local source** as the task-only
before-change snapshot, with the previously accepted lock
`caf5cbce73ec535033e36984f2c5d00e080a7a91c1575750b7008f7c52e9107e`.
The historical audit and shared runners are not modified. The older Decisioning
runner rejected local Collateral changes before executing tests; this is not
treated as a failing application test or silently bypassed.

## Implementation boundary

Only `DecisioningSummaryContent.tsx` changes in application source.
Its two local flags initialize from checklist action completion. A local ref
records the reset version observed at mount so initialization is not immediately
cleared by the initial reset effect. Later reset broadcasts still clear all
three flags. This also permits completion established after a previous reset
to restore on return, without replaying that older reset.

Flags remain local after initialization: making them continuously derived
would change the currently mounted generation-before-approval behavior.
That ordering regression is explicitly left to the separately scoped work.
Providers, storage parsers, event handlers, JSX, styles, document bytes and
route/query code are unchanged.

## Verification method

Run `python verification/decisioning-restoration/run.py`.

The task-owned runner copies current client/shared code and fixtures into
disposable storage, installs the accepted lock with lifecycle scripts disabled,
and uses the existing baseline test setup and transport guard. No secrets,
backend, live App, GitHub operations, real delivery or live financial endpoints
are used. Node environments are allowlisted; fixtures use synthetic loans,
disposable localStorage, a fixed Date and UTC.

The original component is reconstructed only in the disposable copy and checked
against its entry SHA-256
`49309fe5038d847025ac29354e3a6caa83e26d03a02abd7ddf6a0c16fdfe10df`.
Everything else is identical across baseline and candidate. The source and
copy hashes are checked after execution, including the existing PDF assets.

Browser fixtures render the actual Decisioning route, sidebar and providers
with an inert admin component and fake loan responses, never the live App.
Chromium uses file URLs, a disposable profile, blocked DNS, CSP denying
connections and remote fonts, and fake PDF opens. Captures assert actual
1440×900, 1024×768 and 390×844 content dimensions.

For each approve/generate/deliver stage, browser checks cover sidebar return,
route return, loan A→B→A, real document reload, unchanged activity storage,
no restoration toast, exact PDF open arguments and native Tab focus into the
aria-disabled View control. Fresh and mounted states compare exact DOM,
computed styles/rectangles and full-viewport screenshot hashes between versions.
Returned states are captured separately as approved differences.

The component/unit fixtures additionally cover all checklist statuses,
malformed storage, denied reads/writes, provider reload, mounted/unmounted
reset, post-reset completion, failed package-removal reset, disclosure-only
reset and the intentionally unchanged generation-before-approval regression.
Existing Summary wiring and real-route characterization suites remain included.

## Verification caveats and initial attempts

The first runner attempt stopped after installation because the new runner
omitted a return value. This fixture-only issue was corrected.

The first full comparison passed 30 baseline and 30 candidate tests and all
browser behavior assertions, but failed screenshot equality: an unchanged
approval toast was captured partway through its exit animation. Inspection
showed the toast at the right edge of one image. The fixture now waits for
actual toast removal; it does not hide elements, change CSS, relax pixel
equality or alter application code.

Two additional reset tests passed in a supplemental candidate run (20 owned
tests total). Adding these tests while the first run was active invalidated
that run's fixture-source preservation result; it is not presented as a clean
full-run result.

## Final verification result

The final disposable run completed with exit **0**:

| Check | Result |
|---|---|
| Accepted-lock installation, scripts disabled | Pass |
| Baseline unit/route suites | 3 files, **32 tests passed** |
| Candidate unit/route suites | 3 files, **32 tests passed** |
| Baseline browser assertions | Pass, 27 captures |
| Candidate browser assertions | Pass, 27 captures |
| Fresh and mounted screenshot/DOM/computed-style equality | **18 exact pairs passed** |
| Returned-state captures | 9 pairs; approved differences, not equality assertions |
| Current workspace/copy preservation | Both true |

The browser pass exercised all three workflow stages at each of the three
specified viewport sizes. No uncaught browser exceptions were observed.
Desktop restored-state and mobile captures were visually inspected; mobile
clipping is the existing behavior. The initial failed capture is not hidden:
the passing comparison uses the corrected toast-settling fixture described
above. Final logs, manifests and browser metadata are retained in
`decision-display-restoration-evidence/`; large PNGs remain disposable.

## Remaining limits

External fonts remain blocked consistently in both versions; font-loaded visual
acceptance is not claimed. Existing narrow-screen clipping is preserved, not
redesigned. No new breakpoint-dependent markup or styles were introduced.
Browser action clicks are DOM clicks; native Tab focus is tested, not all
pointer hit targets or assistive-technology behavior.

No whole-repository type-check repair, performance claim, cross-window checklist
synchronization, storage migration, partial-reset recovery change or workflow
ordering fix is included. Reset-failure and action-order policies already have
separate tasks; no overlapping follow-up was proposed.

The live workflow was deliberately not restarted or previewed: the task forbids
using the live App as evidence. Both browser bundles are built afresh in the
isolated environment. Generated images and bundles remain outside Git.
