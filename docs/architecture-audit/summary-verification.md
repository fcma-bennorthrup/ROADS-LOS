# Summary display and clipboard characterization

## Result and authority

Verification-only deliverables are implemented against unchanged production
files. **34 new Summary tests pass.** A single isolated browser characterization
pass exercised the requested sizes, panels, clipboard outcomes and keyboard
activation. There is no production repair, clean repository type-check claim,
loaded-font visual-equivalence claim, or performance claim.

The user explicitly chose **Resolve the shared baseline and isolated browser
setup** after the [initial gate assessment](summary-verification-status.md).
Only the accepted documentation hashes were reconciled in the shared runner.
Production, asset, configuration and dependency hash assertions remain strict.
No original audit manifest was overwritten.

## Commands and measured outcomes

| Check | Result |
|---|---|
| `python verification/baseline/run.py --summary` | Overall exit 1; individual outcomes below |
| Disposable `npm ci --ignore-scripts --no-audit --no-fund` | Exit 0; 585 installed packages, all versions match lock, no missing nonoptional entries |
| `node node_modules/typescript/bin/tsc --noEmit --incremental false` | Exit 2; same 15 baseline diagnostics: one TS2554 in GitHubSyncPanel and fourteen TS2802 iterator diagnostics in server files |
| Initial full Vitest run through shared config | 200 passed / 4 failed, 19 files; all 176 pre-existing/shared-baseline tests passed |
| Corrected Summary-only run through shared config | Exit 0; 2 files / 34 tests passed |
| Isolated browser bundle and unchanged CSS compilation | Exit 0 |
| Shared runner before/after manifest check | All 174 files unchanged in both workspace and disposable copy |
| Final `git diff --check` | Pass |

The four initial failures were in the new parameterized borrower fixture:
Vitest spread each borrower array into test arguments rather than passing the
array as one argument. Wrapping the input array corrected the fixture. No
production output expectation or production file was changed to obtain a pass.
The final targeted run included the added six real-query tests. The unchanged
176 earlier tests were not rerun unnecessarily. This is not represented as one
combined clean full-suite run.

Raw command logs and the initial runner's complete version/hash ledger are in
[summary-evidence/](summary-evidence/). `initial-results.json` intentionally
retains the initial failure rather than being rewritten to say it passed.
`summary-final.log` records the corrected run.

## Coverage and proof

| Contract | Evidence and outcome |
|---|---|
| Pending/error/no-data | Pass: whole-page replacement, exact strings and absence of header/toolbar/content/activity in component tests; pending/error/null also exercised in browser |
| Cached data plus query error | Pass: mocked observer error takes precedence over existing loan data |
| Query identity and transport | Pass: IDs `synthetic`, `alternate`, missing-ID fallback `1`; real deferred fake fetch uses `/api/loans/synthetic` and `{credentials:"include"}` |
| Shared query policy | Pass: production defaults retain infinite stale time, no retry, no focus refetch, no polling; 404/500/HTML/network/null each give generic failure with one fake request |
| All 17 rows | Pass: literal IDs, labels, values, column order and DOM row order; browser independently checked displayed values |
| Independent amounts/header mapping | Pass: all eight header props; header `$111.11`, total `$333.33`, requested `$222.22`; every Summary monetary mapping checked independently |
| Currency quirks | Pass in every monetary field: zero, negative, fractional rounding, numeric prefix, empty and invalid strings; `$-1,234.50` and `$NaN` retained |
| Rule of XX | Pass: null and undefined → `--`; empty → empty; literal `0` and `XX` preserved |
| Borrower counts/order/flags | Pass: zero, one, two and multiple-primary records; Beta remains before primary Alpha; no normalization or primary sorting |
| Contact presentation | Pass: literal email text/mailto target, phone text remains a span; no real link opened |
| Copy button current name | Pass: no accessible name in component fixture, preserved rather than repaired |
| Clipboard outcomes | Pass: resolve, reject, unavailable, repeated in-flight copies, and out-of-order completion; exact toast calls |
| Native keyboard/real toaster | Pass in browser: focus + Enter and focus + Space each copy the intended email once; actual success/error titles and one-toast replacement |
| Responsive captures | Captured 1440×900, 1024×768, 390×844, plus 767/768/1279/1280 widths at 900px height |
| md/xl grid changes | Measured 1 column below 768; 2 columns from 768 to 1279; 4 at 1280 and above, with 24px grid gap |
| Panels and below-fold content | Activity, Checklist and More Options opened at desktop/edges; dismissal/focus recorded; internal scroll exposes all 17 rows at 1024×768 |
| Typography/color/spacing | Computed measurements retained for fixed fallback-font captures; no loaded Google-font metrics inferred |
| External operations | No real API, mailto, clipboard, document, GitHub or financial operation; exact synthetic request recorded; no external browser resource requests observed |

These assertions protect current behavior, not hypothetical improved behavior.
Summary has no page-owned editor, save/cancel, document/PDF action, or financial
mutation. Such operations were not invented or activated for this task.

## Browser evidence and observed existing behavior

Read [the browser report](../../verification/summary/browser-evidence/report.md)
and [retained raw measurements](summary-evidence/browser-measurements.json).
The browser report maps captures to returned visual-observation IDs, including
all default viewports and breakpoint edges. Representative desktop, mobile and
Checklist captures were also inspected by the task owner.

Observed in the synthetic **font-blocked** environment, not diagnosed as live
production defects:

- At 390px the side-by-side borrower contacts overlap/clip. Header/tab
  navigation scrolls horizontally. Activity further compresses borrower
  content around md.
- Checklist allows underlying text to show through its panel.
- At 1024×768 the fixed toolbar covers lower content initially; internal
  scrolling exposes all rows.
- Activity focus stays on its trigger. Closing Checklist leaves focus on BODY.
  More Options does not dismiss on Escape; outside click dismisses it and
  focus moves to BODY.

No layout, focus, menu, accessibility, clipboard or currency repair was made.
Changing any of these observed outcomes requires separate approval.

### Explicit evidence limits

- The integrated browser produced captures and screenshot observation IDs but
  did not expose PNG bytes to save locally. **No PNG files were exported.**
  Its `unable` verdict refers to that extra file-export request, not failure
  to execute the browser checks. The task's capture requirement has evidence
  in those returned observations; a durable local PNG archive remains absent.
- External Google fonts were blocked deliberately with CSP and browser routing;
  the existing CSS fallback stack was held constant. Google-font-loaded
  appearance and metrics remain unverified.
- The reusable Playwright script is a syntax-checked recipe, **not an executed
  local regression command**. Playwright is not added to package.json or the
  accepted lock. Actual browser evidence came from the supplied browser
  tooling in the single recorded pass.
- Type-check readiness remains blocked by the 15 existing diagnostics. This
  verification does not repair them or authorize downstream refactors to
  ignore them.
- No baseline/candidate pixel equivalence, live-app health, browser-family
  matrix, performance improvement, deployment, or production behavior is
  certified.

## Reproduction and preservation

See [the fixture README](../../verification/summary/README.md).
The disposable copy was `/tmp/validation-baseline-052pxww8/copy`, running Node
v24.13.0 / npm 11.6.2. Tests used the shared network-denial preload, fixed
2026-10-14T16:00:00Z Date, UTC timezone, cleared jsdom-local storage and an
environment allowlist that does not inherit secrets.

Browser verification served only the isolated bundle, CSS and HTML on port
4179, not the live application or a new production route. It rendered actual
Summary/shared UI with inert sync adapters and synthetic `.invalid` contacts.
Existing CSS/token bytes were copied unchanged. Browser transport was denied
outside the fixture origin; CSP denied connections/fonts, and in-page APIs
were blocked or replaced with deterministic inert implementations.

Accepted lock SHA-256:
`caf5cbce73ec535033e36984f2c5d00e080a7a91c1575750b7008f7c52e9107e`.
Package SHA-256:
`e3a709a27242fa7cdf8385c115ea3a2ce4a332d1771b1de5e835b0e2bf21f753`.
Summary module SHA-256:
`9a67e90d1c9a4424c2229608a9bf0ba9a423390d95cdc5e2c2ff3a1f8623fd1d`.
BorrowerCards SHA-256:
`2177bc23703217d5899726177df5391c041d7078a01d59a433fb73ebcdfc77ea`.
SummaryRatios SHA-256:
`9c16b84f04bc85455d478a9cb0f8921a356e6254e90c4c08be881dccef7d03dd`.

No workflow, production source, configuration, dependency contract or asset
was edited. No publish, GitHub synchronization, database operation, credential
inspection or actual delivery was performed. No duplicate follow-ups were
created because formatting and copy-button work already exists downstream.
