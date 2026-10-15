# History: current-loan scope and empty log

## Approved change

The user required History to display information only about the current loan,
then explicitly chose **remove samples; show an empty log until loan-specific
history exists**, with the table filling the viewport's content area. The user
also chose to defer the overlapping data-transform refactor and do this work
first.

This supersedes the original requirement to preserve populated loan-1 pixels:
removing all 40 demo rows and stretching the empty table are now intentional
visible differences. No sample entries are assigned to loan 1. No audit API,
recording service, storage lifetime, new empty-state wording, or field-focus
feature has been invented.

Before: every successful loan displayed the same samples; default links went
to loan 1. After: every successful loan displays the existing empty table shell.
The page supplies its current route ID to the retained link handler; synthetic
records demonstrate that Decisioning and encoded Origination section URLs stay
on that loan. Callback precedence is unchanged.

## Verification

- `python verification/history-loan-scope/run.py`: **9 tests passed**.
- Disposable source copies; accepted lock SHA-256
  `caf5cbce73ec535033e36984f2c5d00e080a7a91c1575750b7008f7c52e9107e`.
  Existing installed dependencies were version-checked against that lock and
  reused through a symlink; this was not a fresh installation or full package
  byte-integrity check. No dependency changes.
- Reused shared network guard and fixed-clock/UTC unit-test setup. Only explicit
  fake responses are used. No live App/server, admin sync, real loan transport,
  database, financial endpoint, or document delivery was invoked.
- Actual empty production content tested for loan 1 and synthetic loan 2,
  search and sorting, Page 1 of 1, disabled pagination, and fill-height classes.
- Test-only module variant injects synthetic records without adding a
  production data-injection interface: all six exact URLs for both loans,
  callback once/no fallback, changed ID without component remount, and reset
  of local controls on remount pass.
- Page tests verify route-ID forwarding, independent query keys, cached data,
  loading branches, and unchanged 404/500 generic errors with one request.
- Static browser fixtures use the real History page, header, toolbar, Activity
  panel and CSS, with inert administration and provider boundaries. The
  unchanged shared History CDP runner captured 1440×900, 1024×768 and 390×844,
  each with Activity closed/open and the page-size dropdown open (9 captures).
  Desktop and standard mobile screenshots were inspected. Actual viewport
  dimensions, no rows, minimum content fill, table padding, and footer alignment
  were asserted. External fonts/transports were blocked; fallback fonts only.
- `git diff --check`: passed.

Reproduce captures in the disposable copy printed by the runner:

```
node verification/history-loan-scope/build-capture.mjs
mkdir -p ../captures
node verification/history/browser-capture.mjs "$(which chromium)" "$PWD" "$PWD/../captures"
```

## Limits and preserved boundaries

The 390px Activity-open layout leaves very little width for the main content.
Its minimum-content height exceeds available height and scrolls; the first
capture assertion expecting an exact viewport fit failed there. The final
assertion permits minimum-content overflow while still requiring the table to
fill at least the available height. No production CSS was changed to conceal
this. Existing cramped mobile column labels remain; this is not a responsive
redesign or a full visual-equivalence claim.

There are no reachable field buttons in the approved empty production state,
so full browser Back/target-section/provider-remount journeys via a field link
are not claimed. The retained handler is tested with synthetic entries, while
destination pages, header routing, shared provider implementations and their
storage behavior are untouched. No whole-app type-check, live workflow restart,
pixel-byte baseline comparison, font-loaded certification, performance claim,
or complete shared-provider isolation certification is made.

Historical `verification/history` tests and their source hash guards remain
untouched as evidence of the old populated behavior; they intentionally reject
this changed source. The new suite records the expressly approved difference
instead of overwriting those baseline assertions.
