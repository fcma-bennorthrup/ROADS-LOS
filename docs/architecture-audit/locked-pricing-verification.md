# Locked pricing: approved persistence exception

## Refreshed workspace and authority

The user explicitly approved the locked-pricing retention/recovery policy, then
requested restarting from current main-project code rather than the stale task
snapshot. The local `main-repl/main` reference was inspected and merged without
any remote fetch, push, pull, application sync operation or deployment. Its tip
was `0d5357e`; the pre-edit local baseline is merge `d059558`.
The only merge conflict was the memory index, resolved by retaining both sets
of entries. Application sources merged without conflicts.

Verified present **before source edits**:
- Routed Documents verification and fixtures.
- Per-store partial Reset Demo coordination, manual retry, queued cancellation,
  and immediate package-reset notifications/timer invalidation.
- Loan-provider-lifetime reset consumption.
- Confirmed versus draft rate-lock expiration with discard-on-dialog-close.

The approved dependency lock remains
`caf5cbce73ec535033e36984f2c5d00e080a7a91c1575750b7008f7c52e9107e`.
No dependencies, CSS, fonts, PDFs, routes, query policies or financial endpoints
were changed.

## Exact intentional difference

Before: the checklist could retain Rate Lock completion while a remounted
Pricing section displayed default product, term, rates and expiration.

After: successful Lock Rate/Update Rate Lock stores the exact confirmed product,
label, catalog term, term override (including blank), rates and expiration per
loan, alongside checklist statuses. Navigation, provider remount, reload and
loan return restore those terms. Locking an unsaved product edit remains allowed.
No borrower details are added to the snapshot; no server request is made.

Status, terms and completed Loan Estimate re-fire are serialized in one
localStorage write before changing the displayed lock or recording activity.
A failed write retains the old state and shows:
“Rate lock could not be saved. Enable browser storage and try again.”
The first successful lock toast and fixed-ID activity deduplication are retained.

A complete legacy lock with absent, invalid or unreadable snapshot never uses
default terms as historical values. It keeps checklist history, displays blank
product fields/dashes for unknown rates, disables updating the unknown lock, and
shows “Locked pricing terms unavailable. Reset Demo to start again.”
The existing static rate-lock PDF action remains available.

Reset clears the snapshot in the **existing checklist write**, not as another
independent storage operation. Failed package/disclosure/checklist steps retain
the locked terms. Successful checklist clearing removes the terms even if the
later activity clear fails. Clearing works with Pricing absent, and the merged
one-time consumption prevents a historical reset from clearing a subsequent lock.
Disclosure-only reset remains independent.

## Package-progress reassessment

Current package reset removes storage, then synchronously notifies mounted
consumers. The package hook clears its progress ref immediately, cancels the
timer through effect cleanup, checks its pending deadline before timer writes,
and prevents generate/deliver while Reset Demo is pending.

These protections are now part of the comparison baseline, not missing features
to reimplement. General stale-consumer/cross-window package coordination remains
owned by the separate package-progress task. No package source was edited here.
The current partial-reset and Documents regression suites passed with the pricing
change; no claim is made that this proves arbitrary multi-window concurrency.

## Verification

Only disposable `/tmp/locked-pricing-*` copies were executed. Synthetic records,
disposable browser profiles/storage, UTC and a fixed
`2026-10-14T16:00:00Z` Date were used. The existing Node network guard and browser
request interception blocked external transports; the real App was never mounted.
The existing isolated Origination route fixture supplies cached synthetic loans
and an inert admin panel. No live workflow was restarted.

| Check | Result |
|---|---|
| Refreshed baseline regression suites | **71 tests passed**, 5 files |
| Candidate regression suites plus pricing | **94 tests passed**, 6 files |
| Final pricing-specific rerun after additional assertions | **23 tests passed** |
| All 11 products | Exact base/final rates, unsaved blank term, section/provider remount |
| Nondefault terms and expiration | Retained across section navigation, reload and loan return |
| Lock update | Re-fires a newly completed Loan Estimate again; activity remains deduplicated |
| Legacy/missing/corrupt/read-denied snapshot | Explicit unavailable state, no historical defaults, recovery via Reset Demo |
| Write-denied initial lock and update | No status, storage, activity or estimate mutation; exact error text |
| Captured numeric rates | Restored independently of current catalog; invalid/inconsistent records rejected |
| Reset | Partial failures, absent section, relock, checklist failure, later activity failure, disclosure-only isolation |
| Date cancellation | Existing cancellation/native-picker regression suite passes unchanged |
| Routed Documents | Existing route/storage/overlay/PDF-argument suite passes unchanged |
| Browser 1440×900, 1024×768, 390×844 | Exact screenshot bytes and measured DOM/style equivalence in five unaffected states |
| Browser changed lifetime | Nondefault product/term and custom expiration retained after section remount/reload |
| Browser Escape | Same modal/calendar dismissal and focus result as refreshed baseline |
| Type check | **Fails with the same 15 diagnostics** on complete baseline and candidate; no new diagnostics |
| Source integrity | Final candidate copies match delivered production changes; unrelated source remains pinned to refreshed baseline |

The five compared browser states are default page, initial lock dialog, edit
dialog, open calendar, and confirmed custom expiration. DOM measurements include
text/order/value/disabled flags, bounding boxes, font family/size/weight, colors,
padding/margins, overflow and border radius. Existing narrow-screen clipping and
calendar behavior are preserved, not repaired. Main page and modal contain the
affected pricing controls; hidden/offscreen DOM geometry is measured too.

Reproduce with:

```sh
python verification/locked-pricing/run.py
node verification/locked-pricing/browser.mjs /tmp/locked-pricing-<printed-directory>
```

The browser driver reuses the existing dependency-free CDP fixture driver and
requires the already available Chromium executable. It starts/stops isolated
fixture servers only. Screenshots/logs are temporary evidence, not committed
assets; the runner and browser driver are retained for reproduction.

### Honest limits and fixture corrections

The first candidate run preceded two small validation/display refinements;
its integrity flag correctly reported source changes during the run. The final
candidate run used the completed production bytes. The first disposable type
copy omitted server sources used by existing tests; both copies were corrected
and type checks repeated. Only the complete-copy, identical 15-diagnostic result
above is the final type result. Existing compiler errors were not repaired.

Completion sync subsequently incorporated main-project package coordination
commit `7c0a54d`. Only the memory index conflicted; all notes were retained.
The pricing/checklist implementation merged without source conflicts. The
disposable candidate was updated with the incoming package implementation and
all **94 tests passed again**. The reproduction runner now pins that newer
baseline. The earlier browser comparisons remain evidence against the stated
pre-edit baseline; the incoming change did not modify Pricing markup or styles.

Browser pixel equivalence covers the named states and sizes, not every possible
browser/font environment. The new unavailable/save-error states are asserted in
DOM tests, not claimed pixel-equivalent to the old misleading display. Live
financial behavior, performance, screen readers and simultaneous cross-window
pricing edits were not tested or changed. Browser storage is not a transaction
across checklist and activity stores; the merged partial-reset policy is retained.
