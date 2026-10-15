# History transform extraction

## Scope and baseline

The user requested a refresh from main before editing and then explicitly chose
to continue the History extraction, not the separate package-progress task.
The clean workspace was fast-forwarded to the available local main-project
reference `0d5357e7aa0c4d15ce6fec4a33bd23c16a150ddc`. That reference contains the
merged routed Documents verification and per-store partial Reset Demo changes.
No remote GitHub operations were used.

Pre-edit `HistoryContent.tsx` SHA-256:
`56c38a3c5ede611dfddbdf49b0b208f7c7bfeeab0c2058ba9746874c94381fe1`.
This is the refreshed local baseline, **not** the historical 40-demo-row page.
The approved current behavior is an empty, viewport-filling Change Log with
loan-scoped navigation. The old sample records were not restored.

Dependency lock remains the accepted disposable-validation snapshot:
`caf5cbce73ec535033e36984f2c5d00e080a7a91c1575750b7008f7c52e9107e`.
Package manifest remains
`e3a709a27242fa7cdf8385c115ea3a2ce4a332d1771b1de5e835b0e2bf21f753`.
Installed package versions were checked against that lock before read-only
reuse in a disposable copy. No installation or dependency changes.

## Change

- Move History's type, empty data constant, page-size options, column definitions
  and retained unused section map into `history-data.ts`.
- Move the unchanged local-time parser and filter/copied-sort body into
  `history-transforms.ts`.
- Replace only the first memo's body with the helper call. Keep its dependency
  list, all state, pagination, handlers, navigation, JSX and styles unchanged.
- Update the existing History loan-scope test-only synthetic loader to follow
  the moved data boundary. No production fixture API or runtime validation.
- No Activity unification, normalization, speed claim, reset/package edits,
  support routes, library replacement, or other recommendation implemented.

The refreshed package hook was inspected as requested: it already subscribes to
successful package clears, invalidates the pending timer through its current
progress reference, and blocks generation/delivery during a pending reset.
Further stale-consumer coordination belongs to its separate assigned task.
This extraction neither duplicates nor certifies that work.

## Verification

Run `python verification/history-extraction/run.py`.

The runner reconstructs the exact pre-edit component from the candidate and
extracted blocks, then requires the pre-edit SHA-256 above. This proves every
constant string, JSX byte, handler, memo dependency and pagination expression
outside the explicitly extracted body remains unchanged. The reconstructed
baseline exists only in the disposable copy.

Actual run: `/tmp/history-extraction-vn3msqnz/copy`.

| Check | Result |
|---|---|
| Exact reverse extraction | Pass; pinned pre-edit hash matches |
| Isolated unit/DOM/route checks | 13 tests passed across 3 files |
| All 40 synthetic records | Pass; full objects/order compared for both sort directions, seven search fields on every record, blank/whitespace/padded/no-match inputs, all 10/20/50 sizes and valid pages |
| Copy-before-sort and equal keys | Pass; input unchanged, distinct output array, stable equal/NaN comparator ordering |
| Parser contracts | Pass; local Date construction, noon/midnight, rollover, invalid NaN, missing-part TypeError messages, lowercase meridiem, DST-shaped inputs in fixed UTC |
| DOM/interaction equivalence | Pass; exact serialized DOM, order, focus element, page resets, size reselection, search, dropdown selection/outside close/Escape no-op, Enter no-op on sort, all six current-loan navigation outcomes |
| Callback and query branches | Pass; callback suppresses navigation, loan ID changes, cached query keys, loading/404/500 branches, empty log for loans 1 and 2 |
| Existing loan-scope suite after loader update | Separate targeted pass: 9 tests in 2 files |
| Empty baseline/candidate browser comparison | 9 pairs, exact screenshot SHA-256 and measurement matches |
| Synthetic baseline/candidate browser comparison | 9 pairs, exact screenshot SHA-256 and per-element text/style/geometry/scroll measurement matches |
| Source/copy integrity | Client/shared/config/dependency bytes unchanged by verification; candidate restored after baseline captures |

Browser pairs cover 1440×900, 1024×768 and 390×844, each with Activity closed,
Activity open and size dropdown open. Empty fixtures verify the viewport-filling
table/footer. Synthetic dropdown fixtures navigate to page 2 and scroll the
footer into view, covering lower rows and the upward menu. There are 36 images
total (18 pairs), not 36 distinct states. Representative desktop empty and
phone paginated/dropdown candidate images were visually inspected. Existing
phone clipping/truncation and toolbar overlap remain unchanged, not repaired.

The first run covered the 13 tests and nine empty browser pairs. The synthetic
capture extension was then executed in that same disposable copy without
repeating the already-valid tests/empty captures. The committed runner combines
both parts for reproduction. The changed pre-existing loader was checked
separately against its own nine tests.

## Isolation and limits

Reuses the accepted shared safety setup and existing History browser harness.
No live App, server, workflow restart, real network adapter, financial service,
database, delivery, or live preview was mounted. Browser fixtures use inert
administrative boundaries, synthetic loan/query/Activity values, existing
CSS/tokens, disposable storage/profile and blocked external transports.
Browser control is through inherited pipes, not a debugging port. Tests use the
shared fixed clock; synthetic browser fixtures also fix Date; timezone is UTC.
The empty browser fixture has no clock-dependent History output.

Fonts remain externally blocked in both versions: exact comparisons apply to
the same system-fallback font rendering only. **Font-loaded rendering is not
verified.** Real keyboard Tab traversal, assistive technology, destination-page
forms, provider lifetimes, other timezones, and full live-route flows are not
certified by DOM assertions or static captures. Those limitations do not imply
changed behavior; JSX/handlers and the extracted semantics are byte-proven.

No global static-cleanliness, production health, performance, or accessibility
pass is claimed. The previously documented baseline compiler diagnostics were
not repaired or suppressed. The existing Browserslist stale-data warning
remains. PNGs and raw browser logs stay in the disposable directory; the runner
reproduces them. No claim of a permanent screenshot archive.

No duplicate follow-up is proposed: loan-specific record creation, narrow-screen
layout work, and current-loan navigation already have project decisions/tasks.
Neither the removed sample source nor declined/deferred product scope is
reintroduced by this internal extraction.
