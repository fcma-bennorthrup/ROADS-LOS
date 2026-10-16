# Closing Package coordination — approved behavior exception

## Authority and current baseline

The user explicitly approved authoritative package updates, same-window subscriptions,
first-pending-deadline retention, and rejecting stale completion after reset/replacement.
They selected **best-effort cross-window updates without Web Locks**, accepting that
simultaneous writes in different tabs can still conflict. No blocking fallback,
disclosure concurrency repair, new UI or production service is approved.

The restarted checkout initially remained stale. Read-only inspection found the
merged main-project branch locally; it was merged without GitHub access. Baseline
`a2d52af0238ee832a6df418d11d6971d6e75ff88` includes the merged Documents fixtures,
partial Reset Demo coordination and loan-display extraction, plus the recorded
package approval. It is the refreshed current-local comparison point, not a
replacement for the immutable historical audit manifest.

Only the package hook and progress library change application behavior in this task.
No dependencies, styles, assets, routes, checklist/activity/reset orchestration,
disclosure schema, financial endpoints or document delivery operations are changed.

## Exact before/after

Before, every consumer replaced storage from its own ref; other consumers were not
notified. An idle stale consumer could erase an existing delivery when generating.
A pending timer could overwrite another deadline or restore a removed package.

After:

- Mutations read authoritative storage inside a loan-keyed Web Lock when available.
  Without it the read/modify/write is synchronous within one JS context, deliberately
  not advertised as atomic across windows.
- Same-window custom notifications and native storage notifications reread storage;
  payload snapshots are never adopted. Other loans/session storage are ignored.
- A competing generation keeps the existing deadline. Regeneration preserves
  authoritative generated/delivered timestamps rather than a stale local copy.
- New generations add an optional UUID `operationId` to the existing package object.
  Legacy three-field records remain readable and finish at their original due time.
  The identity distinguishes replacement operations even at equal deadlines.
- Timer commits validate current deadline and operation identity. Queued lock work
  also validates the operation observed at queue time. Newer delivery values are
  retained. Stale/no-op updates refresh views without writing storage.
- The existing synchronous reset API still removes the key and notifies mounted
  timers only after successful removal. A local reset version invalidates queued
  package work and suppresses obsolete late lock rejection errors. No persistent
  reset journal/tombstone or disclosure format change is introduced.

The storage key and lifetime remain unchanged. Reset removes the same key.
Generation still takes five seconds, remount resumes the remaining delay, overdue
completion stamps the original due time, repeat delivery updates click time,
regeneration retains delivery, and failed writes never publish optimistic progress.
Existing labels, buttons, error strings, aria-disabled guards, PDF bytes/open
arguments and prototype-only delivery disclaimer are retained.

## Reproducible isolated checks

`python verification/package-progress/run.py` creates baseline/candidate copies in
`/tmp`, reuses the installed dependencies read-only, checks the accepted lock hash
`caf5cbce73ec535033e36984f2c5d00e080a7a91c1575750b7008f7c52e9107e`,
and blocks Node transports. Timezone UTC, synthetic records, disposable storage
and fake clocks are used. Neither App nor a server is started. Source/config
outside the two owned files must match the local baseline. No install occurs.

Observed final unit run: `/tmp/package-progress-vua3qnm7`.

| Check | Baseline | Candidate |
| --- | --- | --- |
| Existing routed Documents, package, disclosures and partial-reset tests | 80 pass, 1 fail | 80 pass, same 1 fail |
| New package coordination tests | Not applicable | 16 pass |
| Total tests | 80 pass / 1 fail | 96 pass / 1 fail |
| TypeScript non-emitting check | Fails | Fails; byte-identical diagnostics |

The unchanged failing test is
`ClosingPackageProgress.test.tsx > reports failed reset removal and retains the displayed package progress`.
It expects the old “Demo could not be reset” toast, superseded by the merged
partial-reset change. The original assertion is left intact, not skipped or
rewritten. Existing partial-reset tests verify the approved replacement outcome.
Type failures include the GitHubSyncPanel mutation call signature and ES target
iteration diagnostics in server sync code. They are not package regressions.
This is **not** a clean suite/type-check claim.

New tests cover A-delivered/stale-B-generate, same-window subscribers, competing
deadlines, deadline replacement before notification, removal before timer callback,
equal-deadline operation replacement, queued start/completion reset invalidation,
another loan, stale/native clear/unrelated-storage notifications, write/read/lock
failures, legacy records, repeat delivery, failed removal, no-op refresh, queued
remote removal and late rejection after reset.

## Visual/interaction comparison

From the printed disposable directory run:

```
node candidate/verification/package-progress/capture.mjs
```

The browser fixture reuses the inert routed Documents fixture, production CSS and
synthetic API; it never mounts App or invokes real sync. Chromium network is
blocked, fetch is synthetic and window.open records arguments. Wall clock is fixed
to 2026-10-14T16:00:00Z. Ellipsis and five-second timers are held at the same frame;
deadline behavior is covered by fake-clock tests instead. Production CSS transitions
are retained and allowed to settle.

All **30** state/viewport pairs matched exact measured text/order/control state,
computed typography/colors/spacing/geometry/scroll dimensions, focus, recorded
PDF-open arguments and PNG hashes at top and vertically scrolled positions:

- 1440×900, 1024×768, 390×844, 767×844, 768×844.
- Idle, generating, generated, delivered, invalid-storage error, delivery-write error.
- ArrowRight activates the Package tab; Enter opens the generated PDF, including
  after delivery-write failure. The public PDF bytes and imports remain unchanged.

Initial fixture checks exposed a CSS output filename collision and then
unsettled transition colors. Both were corrected in the fixture only; only the
final styled, settled comparisons count. Actual viewport dimensions are asserted.
Mobile retains the existing wide header/sidebar and clipped content; equality
is not a claim of good responsive design. Captures and results are disposable,
under `/tmp/package-progress-vua3qnm7/captures`, not committed.

## Limits

No real two-browser-window contention test, font-loaded capture, live PDF opening,
financial/document-delivery operation, performance measurement or production
verification was performed. Fallback-font screenshots do not certify loaded fonts.
No animation equivalence is claimed from held-frame screenshots.

Without Web Locks there is no cross-window compare-and-swap guarantee. Even with
locks, external uncoordinated localStorage writers are outside the protocol.
Package reset deliberately retains synchronous removal rather than migrating to
an asynchronous transaction. An idle-to-idle remote removal has no durable reset
identity; notification-free cross-window reset history is not invented. Pending
generation completions are protected by authoritative operation identity/removal
checks. These are browser-local prototype guarantees, not a durable transaction
or recovery system.
