# Thin loan-query extraction — verification

## Scope and authority

The user accepted current local source as the before-reference for this
extraction, retaining the accepted dependency lock. Seven pages replace their
inline query with `useLoanQuery(loanId)` at the same hook position. The hook
passes only `queryKey: ["/api/loans", loanId]` to the same typed `useQuery`.
Each page retains its ID fallback, state, effects, loading/error branches,
JSX, props and handlers. The existing shared loan-display type is reused.
`queryClient.ts`, credentials, parsing, retry/focus/polling policy and infinite
stale time are unchanged. No runtime validation or page shell was introduced.

## Completed checks

- Reverse extraction reproduces all seven exact pre-edit SHA-256 hashes.
- The existing element fixture, adapted only to resolve the extracted hook,
  passes 2,100 baseline/candidate comparisons (including loading, empty,
  error, cached-plus-error and section variants) and 12 currency cases.
  Child components are inert identifiers in this particular check.
- Eighteen new actual-query checks pass: baseline and candidate deferred/valid,
  four falsy JSON values, 404/500/HTML, cached-plus-error, exact request credentials,
  key/options, observer mount/unmount, focus, ID changes and cache reuse.
- The seven existing route suites plus the new query suite produce the same
  **119 passed / 1 failed** result before and after. This includes Origination
  search handling, Coming Soon's absent Activity panel and existing nested
  interaction fixtures. No test expectations were changed.
- The failure is `verification/history/page.test.tsx`, “keeps Activity
  items/filtering separate from Change Log rows and local controls”, line 125:
  it expects `change-log-row-40`, which the current approved empty History
  implementation does not render. This is an existing failure, not a pass.
- Before/after non-emitting TypeScript checks both exit 2 with identical
  diagnostics: the 15 existing pull-call and Map/Set target errors. The
  comparison passes; neither underlying type check passes.

## Isolation and reproduction

`python verification/loan-query/run.py` creates a disposable `/tmp/loan-query-*`
copy, checks the accepted package and lock hashes, and installs with lifecycle
scripts disabled. It reuses the existing network guard, synthetic records,
fixed clock/UTC timezone, inert admin adapter and browser capture harness.
No live App, server, GitHub or financial transport is exercised.

The accepted lock SHA-256 remains
`caf5cbce73ec535033e36984f2c5d00e080a7a91c1575750b7008f7c52e9107e`.
The initial installation added 585 packages. Existing npm configuration and
Browserslist warnings remain unchanged.

The runner compares the same source closure and records source hashes and
commands in `results.json`. It retains a nonzero result for failing route
fixtures; it does not turn equal failures into a passing suite.
An optional disposable-directory argument reuses that installation.
`--resume` reuses unchanged contract/route results after fixture-only
orchestration fixes; do not use it after changing measured production/tests.

Evidence is under `/tmp/loan-query-resvo5y_/`: `contracts.log`, `query.log`,
`baseline-query.log`, `typecheck.log`, `browser.log`, `results.json`,
and `captures/`. Generated bundles and screenshots stay out of Git.

## Fixture corrections and remaining limits

The first hook test subscribed to error only after refetch, unlike the pages'
render-time destructuring; the fixture now reads the same result fields during
render. A reused static-check script initially tried to copy a disposable file
over itself; redundant copying was removed from the disposable adapter.
Neither correction changed production behavior or expected results.

Browser comparison uses existing CSS with external fonts blocked, not a
font-loaded certificate. Prior loan-display pixel exceptions are deliberately
not inherited. The user subsequently accepted blocked-font rendering and the
unchanged History test failure, plus four specific 1024×768 success/checklist
captures: Origination, Documents, Closing/Booking and History. Each differs by
one decoded pixel at (467,733); DOM, measured styles and geometry match.
The raster difference's cause is not established. No general pixel tolerance
or acceptance of additional differences is implied.

The first browser pass completed 91 scenarios before its fixed 700ms readiness
check found no ready marker. The remaining scenarios resume at index 91 with
a bounded readiness wait (up to five additional seconds); no assertions,
application code or screenshot expectations were changed.
The resumed browser pass exited 0. Together the two passes cover all **196
unique scenarios**: seven pages × loading/error/empty/success × 1440×900,
1024×768, 390×844, 767×844, 768×844, 1279×900 and 1280×900.
All DOM, measured styles and geometry comparisons match. Of 294 screenshot
pairs (top, plus bottom and keyboard-opened checklist for success), 290 match
byte-for-byte; the only four differences are those explicitly accepted above.
No additional exceptions were required. The synthetic desktop Summary capture
was also visually inspected. External-font rendering and exhaustive nested
pointer/keyboard flows remain unverified, not silently claimed as passes.

Final source-hash comparison found no drift in any measured source,
configuration, dependency, asset or fixture file. Additional evidence:
`browser-resumed.log` and `captures/results-91.json`; combine the latter with
`captures/results-0.json` (91 + 105 scenarios). The original runner's nonzero
exit remains recorded honestly for the readiness interruption and inherited
fixture failure. No test expectation was rewritten to force a green result.

**Complete with the user's bounded acceptance above.** The live workflow was
not restarted or mounted because this task explicitly permits only isolated
fixtures. No production or external operation was performed.
No clean static-check, performance, production-health or full nested-flow
coverage claim is made.
