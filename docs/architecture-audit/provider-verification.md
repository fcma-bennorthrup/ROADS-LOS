# Shared provider rendering: unchanged-source measurement

## Current status and explicit baseline approval

**Refreshed successfully against the user-approved merged snapshot.** After
other approved changes modified both providers and reset behavior, the user
explicitly selected **“Yes—profile the merged code (recommended)”**.
`verification/providers/accepted-source.json` records that source snapshot:
the original 174 audit paths plus 14 new source/test files covering the merged
tree. The dependency snapshot is unchanged.

The current measurements below supersede the earlier run. Historical ledgers
and measurements are retained under `provider-evidence/pre-merge/`, not used
as current-tree evidence. No production source was changed by this task.

## Decision and scope

SHARED-011B / approval-register entry 13, verification only.
**No memoization change is proposed on this evidence.** Consumer notifications
are measurable, but a material production bottleneck or achievable speedup is
not established. No production callbacks, context values, subscriptions, resets,
storage models, styles, dependencies, or runtime configuration were changed.

The original identity observation remains true in the current local source:
both providers create fresh callback/value identities when they render; both
key their state providers by loan storage key. Checklist updates generally map
to a new array, even for an already-completed action. Activity deduplication
returns the prior array. These distinctions are retained, not repaired.

## Baseline and safe execution

- The current accepted validation lock is
  `caf5cbce73ec535033e36984f2c5d00e080a7a91c1575750b7008f7c52e9107e`;
  see `validation-baseline.md` for the user's limited acceptance.
- Before execution all 188 accepted paths were checked against the explicit
  merged-source capture, including added local imports. Unexpected changed or
  missing paths and additional client/server/shared source modules fail closed.
  The runner never updates expected hashes automatically.
- After the final run, all **188/188 final-run entry hashes remained unchanged in
  both workspace and disposable copy**, including source, styles, assets,
  dependency files and runtime configuration. The complete ledger is in
  `provider-evidence/preservation.json`.
- Disposable copy: `/tmp/provider-verification-z5wvyozu/copy`.
  Node v24.13.0; `npm ci --ignore-scripts --no-audit --no-fund` exited 0.
  All installed versions matched the accepted lock, with absent optional
  platform packages distinguished from installed packages.
- Reused the existing baseline Vitest configuration, storage/clock setup and
  network preload without modifying them. No competing shared harness was added.
  Only the task-local runner/config/scenario and report/evidence are new.
- Environment allowlist excludes secrets and user npm configuration.
  UTC, fixed Date `2026-10-14T16:00:00.000Z`, disposable jsdom localStorage,
  unique deterministic reset UUIDs, real performance clock.
- Node sockets/HTTP(S)/UDP/fetch/WebSocket and browser fetch/XHR/WebSocket/open
  are denied during execution. The GitHub panel alone is an inert component.
  Package installation is the only intended external retrieval.
- Never imported/mounted App, started a server, visited live preview, accessed
  a database, opened a PDF, delivered a document or called a financial/GitHub
  endpoint. The guards are trusted-fixture defenses, not an OS security sandbox.

## Workload and instrumentation

Five fresh mounts, each with 16 serial actions: **80 action observations**.
The first sequence is retained as cold data; the following four are used for
the table below. This small sample is descriptive, not a statistical benchmark.
React 18.3.1 development build, jsdom 29.1.1, Vitest 4.1.11, no StrictMode.

The fixture mounts real LoanHeader, ChecklistPanel, LoanActivityPanel,
CollateralContent (including its nested task consumer), ProductPricingContent,
DecisioningSummaryContent, and DisclosureDocumentsContent's exported
DocumentsContent. It also mounts a small output component running the actual
useClosingDisclosures and useClosingPackage hooks. Thus each direct production
context-consuming module identified by local search is represented, including
the consumers reached by the header/toolbar and Documents containers.

These surfaces are mounted **together**, unlike mutually exclusive production
pages. ChecklistPanel stays mounted, including during Activity toggles. Header
props stay synthetic and stable. Wouter memory location drives same-loan tab
and cross-loan transitions; window pathname is synchronized for the hook
fixture. This isolates context propagation but is deliberately not a claim
about route mount costs or a typical real user's workload.

Two memoized probes count context-consumer function executions; their stable
props prevent incidental parent rendering from explaining these counts.
They also retain previous context/callback references. These are **consumer
render counts**, not direct instrumentation inside the unchanged private
provider functions. A provider can execute and bail out without notifying a
consumer; zero notifications does not prove zero provider invocations.

Eight sibling React Profilers record committed subtree `actualDuration`, ID,
and phase. The duration sum below does not double-count nested Profilers
(none are nested), but includes all rendering within each subtree and may
include multiple commits per action. It does not measure browser layout,
paint, network, frame rate or end-user latency. The separately recorded
`elapsedMs` wraps act/effects and has different semantics; neither duration
is a production performance promise.

## Measurements

Warm counts were identical across all four measured sequences. C/A = checklist
and activity probe renders. Durations are milliseconds, rounded to three decimals.

| Action | C/A | Subtree duration median | Subtree duration max | act/effects elapsed median |
|---|---:|---:|---:|---:|
| Activity open | 0/1 | 7.026 | 8.115 | 8.420 |
| Activity close | 0/1 | 2.334 | 2.859 | 2.956 |
| Activity close when closed | 0/0 | 0 | 0 | 0.099 |
| Complete Loan Estimate generation | 1/0 | 3.615 | 4.108 | 4.171 |
| Repeat already-complete action | 1/0 | 3.241 | 4.016 | 3.659 |
| Complete delivery | 1/0 | 3.267 | 3.395 | 3.934 |
| Re-fire completed Loan Estimate | 1/0 | 3.576 | 4.113 | 4.174 |
| Complete generation during re-fire | 1/0 | 3.218 | 3.503 | 3.752 |
| Add synthetic activity | 0/1 | 2.498 | 4.313 | 2.900 |
| Duplicate activity ID | 0/0 | 0 | 0 | 0.092 |
| Document history generated event | 0/0 | 0.050 | 0.058 | 0.376 |
| Disclosure-only reset event | 1/0 | 3.049 | 3.364 | 3.710 |
| Same-loan tab navigation | 1/1 | 2.987 | 3.264 | 3.630 |
| Reset Demo plus activity reset | 1/1 | 4.431 | 4.782 | 6.282 |
| Loan A → B | 1/1 | 29.346 | 38.477 | 34.822 |
| Loan B → A | 1/1 | 27.311 | 31.060 | 34.092 |

Per-consumer commit phases/durations, exact unrounded numbers, reference-change
flags and output hashes for all 80 observations are retained in
`provider-evidence/measurements.json`.

Observed fan-out:

- Activity changes reach header, checklist, activity panel, collateral, pricing,
  decisioning and disclosures, but not the checklist-only hook probe.
- Checklist changes reach header, checklist, collateral, pricing, decisioning,
  disclosures and document hooks; the activity-only probe/panel are not notified.
- Generation history with unchanged reset token reaches the document hook
  subscriber without a checklist/activity context notification.
- Same-loan navigation changes both context values/callback identities.
- Cross-loan navigation remounts keyed subtrees; its greater measured work must
  not be classified as avoidable rerendering. Memoizing callbacks cannot remove
  an intentional remount.
- The initial Activity-open action also includes an extra pricing commit;
  Reset Demo includes secondary local-state/effect commits, and loan transitions
  include hook refresh commits. Raw profiler records retain these rather than
  attributing every millisecond solely to context identity.

## Characterized outputs and tests

The final profiling test passes. It checks current outcomes after every action,
and compares **exact rendered text, task state, reset version, activity IDs/open
state and sorted storage key/value contents** against the first run for each
subsequent run. There is no candidate implementation or future-behavior snapshot.
Hashes in the evidence refer to these combined outputs, not to pixel images.

Confirmed:

- Checklist completion advances the next action to in-progress.
- A repeat completed action leaves output unchanged but still notifies consumers.
- Re-fire changes both Loan Estimate actions; completing generation preserves
  delivery's re-fire status.
- Activity toggles retain activities; duplicate IDs are not appended.
- Document generation updates the actual subscribed hook's visible record count.
- Disclosure-only reset preserves broader demo-reset version and unrelated
  Loan Estimate state.
- Same-loan navigation retains task/activity state.
- Successful Reset Demo returns `outcome: "complete"`, resets tasks and runtime
  activity through the approved coordinator, increments the version **once**,
  and settles `demoResetPending` to false. This differs from the historical
  twice-incrementing implementation because of independently approved reset
  changes, not a profiling repair.
- Loan change closes Activity and resets the nonpersisted reset version;
  returning to A reloads its persisted reset tasks.
- All 15 no-op output comparisons (three cases × five sequences) have identical
  combined hashes: close-closed, repeat-completed and duplicate-activity.

Existing unchanged ChecklistPanel and LoanActivityPanel regression files:
**2 files / 22 tests passed**, including reset/checklist and activity search/sort
contracts. Logs are retained. No broader suite or type-check pass is claimed.

### Earlier evidence and final refresh

The original pre-merge fixture initially reused a reset UUID and incorrectly
suppressed a reset notification; a unique deterministic sequence fixed the
fixture without editing production or relaxing its then-current expectation.
The earlier run also needed explicit reconciliation of a merged logging change.
Historical measurements/ledgers remain in `pre-merge/`; they do not certify
the later reset implementation.

After explicit merged-baseline approval, source inspection confirmed the reset
coordinator's new activity callback and once-only broadcast contract. The
scenario was updated to call that actual API and assert its complete result,
once-only version and settled pending state before executing. The refreshed
run passed on its first attempt. `fixtures-final.txt`, `regressions.txt`,
`install.txt`, `preservation.json` and `measurements.json` describe this run.
Installation, profiling and all 22 regressions passed; both project and copy
preserved all captured file hashes. A further synchronization brought in approved
query, sync-mechanics and diff-viewer changes outside the measured providers.
The merged-source capture was reconciled again under the user's approval;
provider and dependency hashes were explicitly checked unchanged. The final
reproduction above passed with **188** paths, and all current evidence files and
table values refer to the final run. The subsequently merged disclosure
browser-support policy was also reconciled: its existing shared test setup
provides a synchronous immediately-granted Web Lock fake. This run therefore
models a supported browser, not the removed unlocked fallback. No fixture-owned
production or shared-setup change was made. The final full runner passed again
with the disclosure policy included; asynchronous lock queues, unsupported
browsers and cross-window serialization remain outside this measurement.

## Proof limits and blocked sign-offs

| Contract | Status |
|---|---|
| Source/dependency/configuration preservation | Pass: reconciled final-run entry hashes unchanged in project and copy |
| Requested action render/timing observations | Measured for the isolated workload above |
| Exact text/state/storage repeatability | Pass within this fixed fixture |
| Same-loan and cross-loan state outcomes | Pass within memory-router fixture; not full-route UI navigation |
| Existing checklist/activity regressions | Pass: 22 tests |
| DOM order, computed typography/colors/spacing | Not compared; text equivalence is not DOM/layout equivalence |
| Browser 1440×900, 1024×768, 390×844 and breakpoint edges | Not captured; jsdom has no layout engine |
| Fonts, overlays, scrolling, native keyboard/focus | Unverified here; existing CSS/assets unchanged, not rendered browser proof |
| PDF bytes/open arguments | Asset bytes unchanged; no document open exercised |
| Loading/error/empty queries, edit/save/cancel, validation/calculations | Not exercised by this provider workload; separately owned page characterization |
| Failed/queued resets, Web Locks, cross-window events | Not covered; shared reset/concurrency tasks remain separate |
| Production timing / speedup / broad performance pass | Unverified; no claim |
| Static validation baseline | Prior 15 diagnostics remain unresolved; unchanged check not rerun |

Browser/font-loaded G sign-off remains unavailable from these measurements and
must not be bypassed for a later production refactor. The existing accepted
baseline's failure and prior external-font restriction are not repaired here.
This verification delivers provider evidence, **not full visual equivalence or
production readiness**. No live screenshot or application restart was used to
substitute for an authorized isolated browser environment.

## Interpretation and next decision

The counts support the identity/fan-out hypothesis, but not a material-cost
conclusion. Several updates legitimately change context data. Memoizing only
callbacks/value objects would not prevent notification when tasks or Activity
open state changes; an already-complete checklist action creates a new tasks
array, and cross-loan remounts are intentional. Removing these would require
different scope and preservation evidence, not an automatic optimization.

**Recommendation: retain providers unchanged.** No bounded memoization proposal
is justified yet, and no new repair approval is requested. Existing route/page,
reset, key-parsing and document-lifetime tasks already own adjacent verification
and behavior decisions; no duplicate follow-ups are proposed.

Reproduce after acceptance of the documented snapshot:

```sh
python verification/providers/run.py
```

The runner fails closed on unexpected baseline drift, installation/version
mismatch or test failure. It writes measurements/logs into its printed temporary
directory. It does not register a route or alter a workflow. If independently
approved source changes merge later, the baseline gate must be reconciled
explicitly; do not overwrite expected hashes just to make it run.
