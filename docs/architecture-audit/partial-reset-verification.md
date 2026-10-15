# Coordinated partial Reset Demo

## Approved difference

The user approved explicit per-store results and manual retry, then accepted the
current local source solely as this change's isolated baseline, and explicitly
approved checklist/activity write failures and cancellation on loan-provider
replacement. No dependency or historical manifest changes were approved.

Before, package removal could precede a queued/failed disclosure reset, activity
cleared immediately regardless of the result, and mounted package timers could
restore removed progress. A disclosure subscription and completion callback
could each broadcast the same local reset.

After:

1. A cancelled confirmation does nothing. A pending operation rejects duplicate
   reset requests; the existing button is disabled until it settles.
2. Package removal is attempted first. Only a successful removal synchronously
   clears mounted package state and invalidates its old generation timer.
3. Disclosure clearing uses its existing Web Lock (or synchronous fallback).
   Each successful document clear reconciles only its checklist task if that
   checklist write succeeds. No unrelated section reset is broadcast here.
4. After documents succeed, checklist storage is written before mounted tasks
   change. Its successful commit broadcasts one local reset. Activity storage
   is then cleared before mounted activity changes.
5. Failures stop subsequent stages. Successful earlier clears remain; no rollback
   or automatic retry occurs. The error toast lists cleared/not-cleared stores.
   A successful checklist reset can coexist with retained activity if its write
   fails, as explicitly approved. Only complete success dismisses prior toasts
   and collapses the panel's expanded task.
6. Provider replacement cancels remaining queued work. A guard inside the actual
   storage callback prevents late writes even if a lock implementation still
   invokes that callback. A successful disclosure write is recorded synchronously
   before promise settlement, so cancellation cannot misreport it as retained.
   Closing/remounting just the panel does not cancel its provider's operation.

No durable reset journal, multi-key transaction, new reset lifetime, stylesheet,
PDF, route, dependency, or Closing/Booking behavior is introduced. Ordinary
non-reset prototype persistence remains unchanged. The disclosure-only reset
path retains its isolated notification behavior.

## Reproduction and safety

Run `python verification/partial-reset/run.py`. The runner pins the accepted
pre-edit local revision and hashes, rejects non-owned source drift, and checks
the unchanged accepted lock hash. It copies only enumerated source/configuration,
test and asset paths into disposable baseline/candidate directories, uses
`npm ci --ignore-scripts --no-audit --no-fund`, strips project environment
secrets, fixes timezone to UTC and the fixture clock, and blocks external
transports for tests. Neither live App nor the application server is mounted.

The existing shared gate and historical manifest remain intact. The sole
candidate-only historical test exclusion is the exact test
“reports failed reset removal and retains the displayed package progress,”
which asserts the replaced toast. It remains unchanged and runs on baseline;
new tests assert approved wording, retained generated/delivered state and exact
storage on candidate. No snapshot was changed to hide a regression.

The browser fixture reuses the synthetic Documents route, existing CSS and
assets, inert admin context, and fake loan transport. It exposes failure/lock
controls only in verification code. Browser comparison covers success/cancel
screens and approved pending/failure differences, not production data.

## Executed component/storage checks

Disposable run: `/tmp/partial-reset-3wlr0dtd`.
Accepted pre-edit revision: `f798a1628e9a4a7884ff23e69398883ef0ef672e`.
Accepted lock SHA-256:
`caf5cbce73ec535033e36984f2c5d00e080a7a91c1575750b7008f7c52e9107e`.

- Expanded baseline: **143 passed**, 12 files.
- Candidate: **157 passed, 1 explicitly superseded assertion skipped**, 13 files.
  This includes **15 new reset cases** and the unchanged applicable checklist,
  activity, document, Origination reset-consumption, Decisioning and
  Closing/Booking cases.
- Baseline and candidate non-emitting TypeScript checks both fail with the
  **same 15 diagnostic lines**: the existing sync-panel argument mismatch and
  server Map/Set iteration target errors. No new diagnostic or type suppression.
- Both isolated browser fixture builds passed.
- Runner confirmed source hashes unchanged by execution; the dependency lock
  was not edited. `git diff --check` passed.

| Required scenario | Component/storage result |
|---|---|
| Deny package removal | Exact storage unchanged; package generation/delivery retained; no full notification or activity clear; explicit error |
| Remove package, reject disclosure write | Package and its checklist task clear; disclosure, decision and activity remain; explicit result; manual retry succeeds |
| Web Lock queue/succeed/fail | Pending button disabled; duplicate requests coalesced by rejection; one full notification on success, none on failure |
| Synchronous lock rejection | Prior package clear retained; disclosure/activity/unrelated tasks preserved |
| Cancel/repeat | Confirmation cancellation preserves expansion/storage/state/toasts; each successful repeat emits one reset |
| Panel remount | In-flight reset remains coordinated; closing the panel does not abandon it |
| Provider unmount/remount | Remaining work cancels; a late queued callback cannot write; prior package clear survives remount |
| Commit immediately before unmount | Committed disclosure is reported cleared even before its promise settles; no later full reset |
| Package timer | Cleared progress stays absent beyond its old deadline, including during queued/failing reset |
| Alternate loans | A cancellation cannot write B or resume A's queued write on return |
| Checklist/activity write failures | Failed store remains unchanged; earlier successful commits are retained and listed; no false full-success toast dismissal |
| Disclosure-only | Package/activity/unrelated tasks and full-reset version remain unchanged |
| Closing/Booking | Existing isolated characterization suite passes unchanged |

## Browser comparison

See [partial-reset-browser.md](partial-reset-browser.md) for measured evidence.
The initial responsive mismatch was traced to unequal resize/open sequences,
not candidate styling. With viewport set before navigation/open on both builds,
successful and cancelled screens matched at 1440×900, 1024×768 and 390×844:
text/order, sampled computed typography/colors, header/first-task geometry,
scroll metrics and focus. Both retain the same existing stale panel position
when an already-open panel is resized; that unrelated behavior was not repaired.

The browser exercised cancellation, complete reset, package-removal denial,
disclosure-write denial and manual retry, queued success/failure, and the pending
package timer. Browser loan-switch cancellation was not exercised; the automated
component/storage test covers it. Full pixel-byte comparison was unavailable;
later paired results use direct DOM measurements because screenshot capture
could select another active page. No exhaustive child-style, keyboard traversal,
remote-font-loading or cross-window race claim is made.

The temporary managed fixture workflow failed to start without diagnostic
output; it was removed, restoring `.replit` exactly. Separate disposable static
fixture servers returned HTTP 200 and supported the browser checks. The live
application workflow was not restarted or used as the test target.

No new follow-up proposals duplicate the already queued package stale-consumer,
disclosure cross-window coordination, or document timing tasks.

## Remaining boundaries

This is not a general cross-window package subscription or cross-window reset
transaction. Existing separate package-concurrency and disclosure-fallback
tasks retain that ownership. Cancellation is scoped to the current provider,
not durable across reloads. Native browser storage denial is simulated with
throwing adapters; no browser permission policy or production storage is changed.
Do not infer performance gains, a clean repository-wide type check, or
unmeasured accessibility/font-loading equivalence from these checks.
