# Historical reset consumption

## Explicitly approved difference

The user approved the narrow exception: consume each reset once per Origination
section within the current loan provider's mounted lifetime. Collateral and
Pricing must handle a pending reset even if absent when it was broadcast. After
handling it, remounting must not erase a newer saved subject address or override
a newer rate-lock status.

Before: any nonzero reset version re-cleared Collateral's saved address and
unlocked Pricing every time the section mounted.

After: a provider-owned, in-memory claim records the consumed version separately
for Collateral and Pricing. Each new reset version remains eligible. The effect
still applies on first visit after an absent reset; it does not simply skip
the first effect. StrictMode effect replay does not reclaim an already handled
reset.

Reload and loan-switch lifetime are deliberately unchanged. Provider replacement
discards pending resets and consumption claims. If Collateral was absent during
reset and the user reloads before visiting it, its old stored address may remain.
No persistent reset metadata, storage migration, new toast, label, style or
pricing snapshot was introduced. Ordinary pricing remount still reseeds its
product, term and expiration defaults; only historical reset interference with
the newer lock status is fixed.

## Identity and ownership

The existing provider's loan storage key and `demoResetVersion` remain the reset
identity. The provider owns the claim interface; only Collateral and Pricing
consume it. The route's conditional mounts are unchanged. The existing reset
broadcaster, its disclosure-history subscription, task reset ordering, failure
handling and asynchronous completion are untouched.

This does not consolidate the subscription and completion notifications into
one logical reset, change partial-success semantics, protect edits made while
a reset is still pending, or implement the separately queued partial-reset and
pricing-persistence changes. Disclosure-only resets remain isolated.

## Baseline, isolation and reproduction

Run `python verification/reset-consumption/run.py`.

The runner verifies all 174 historical manifest entries, with only the existing
accepted lock/documentation exceptions, the three owned candidate files, and
the user-approved task-specific `server/index.ts` logging exception:
`2eee6c655d508e045a980256d4aa57624ce3c336ac9fe0758d6b0b003fc6d64d`.
It does not rewrite the shared runner or historical manifest.

For the three changed files, the local pre-edit snapshot is verified against
the original manifest SHA-256 values before use. The pinned local snapshot is
only a way to reproduce these verified bytes; no remote fetch, pull, reset or
sync is performed.

The runner copies files into a disposable temporary directory, installs the
accepted unchanged lock with `npm ci --ignore-scripts --no-audit --no-fund`,
and executes baseline then candidate with the existing network guard. The
environment excludes project secrets, uses disposable HOME/cache/storage,
UTC and the existing fixed clock. Fixtures mount the real route with synthetic
cached loans and inert admin transport, never the live App or server.
The browser uses the same synthetic fixture and original CSS/assets, with
external requests blocked.

## Component and interaction results

- Baseline: **49/49 existing Origination tests passed**, including the four
  historical-defect cases.
- Candidate: **14 new reset cases passed**. **45 unchanged applicable cases
  passed across the candidate run and the focused retry described below**.
  Exactly four old desired-defect assertions are excluded on the candidate,
  by their explicit names, and replaced by approved mounted/absent preservation
  journeys. They remain intact and passing against the baseline.
- Original Collateral and Pricing suites remain unmodified and pass: task
  progression/nonregression, six collateral activities, timestamps, information
  toasts, cancellation, reset, estimate re-fire, TRID and activity persistence.
- All eleven product rates/terms, local edit/save/discard, retained Cancel date
  behavior, static PDF open arguments and bytes, split/delete evaluation
  behavior, borrower/details/fee lifetimes and route/query/loading/error
  contracts remain covered by the unchanged applicable suite.

| Reset proof | Result |
|---|---|
| Reset → save → Fees → Collateral | Pass, mounted and absent at reset; newer address and task progress survive |
| Reset → lock → Fees → Pricing | Pass, mounted and absent; locked icon, Update Rate Lock, disabled Edit and complete status agree |
| Both sections absent → first visits | Pass; independent claims; first address visit clears, later save survives |
| Cancel/repeat | Pass; cancelled toolbar confirmation does not change version; a new reset clears previously claimed sections again |
| Reload before/after handling | Pass by provider replacement with retained disposable localStorage; existing absent-address behavior preserved |
| Reload after relock | Pass; complete checklist initializes locked display without historical override |
| Loan A/B | Pass through actual router/provider keys; no pending reset or claim crosses loans |
| Address storage denied | Pass; failed write does not cause a handled reset to replay after recovery |
| Broad reset storage denied | Pass; no reset notification is invented, newer lock remains intact |
| Asynchronous completion | Pass; no claim before completion, absent consumer handles completed reset once, newer save survives |
| Asynchronous rejection | Pass; no notification/claim invented, locked state preserved |
| Disclosure-only reset | Pass; version and unrelated address/lock state unchanged |

The initial candidate invocation used an outdated copied fixture button ID;
the fixture was corrected to the actual existing `toolbar-checklist`. No
production repair or expected outcome change was made for that fixture error.
The subsequent candidate invocation passed 58 cases but timed out the unchanged
borrower test at its existing 5-second limit while other verification processes
were running. The unchanged three-case forms file passed on focused retry
(3.52 seconds total). Timeouts were not raised, tests were not weakened, and
this is not presented as a single clean 59-case invocation.

Non-emitting TypeScript checks on baseline and candidate both exit 2 with
**byte-identical 15-line diagnostics**: the pre-existing GitHubSyncPanel call
arity and server iteration/target errors. No new diagnostic was introduced,
but the repository type check is not a pass. No compiler/dependency fix is
included. The existing deliberate fee-key collision fixture still emits its
baseline React warning.

## Browser evidence and limits

See `reset-consumption-browser.md` for the isolated browser's actual results,
screen sizes, screenshots and limits. Component tests are not a claim of
browser pixel equivalence, loaded-font acceptance or performance improvement.
The corrected scoped browser checks passed: baseline reproduced both defects,
candidate preserved the newer Subject Property and rate lock, absent-section
handling worked, and repeat/cancel outcomes remained correct. Bounded
text/order/style/geometry and screenshot comparisons covered 1440×900,
1024×768 and 390×844 with no candidate-specific visual difference observed.
The existing narrow-screen clipping is unchanged. Modal/overlay initial focus
matched; full Tab traversal and exhaustive pixel diffs were not performed.
No JSX, CSS, control event handlers other than the two reset effects, or
component mount placement changed. Thus unchanged keyboard/control semantics
also have source-equivalence evidence, not a claimed exhaustive browser pass.

The tester's initial failure was an out-of-scope borrower personal-address
check, not Collateral Subject Property. It was withdrawn after the same tester
used the correct Subject Property controls; no source change was needed.
No live financial, document delivery, GitHub, database or publication operation
was performed.

## Follow-on scope

The already queued partial Reset Demo and pricing-persistence recommendations
cover the next shared-reset and pricing policy work. They are not implemented
or implicitly approved here, and no overlapping follow-up tasks are proposed.
