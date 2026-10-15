# Summary verification — blocked at environment gate

> Historical gate assessment, superseded after the user explicitly approved
> resolving the shared baseline and isolated browser prerequisites. See
> [summary-verification.md](summary-verification.md) for current results.

## Scope and current result

SUMMARY-001 is verification only. No production source, styles, assets,
dependencies, runtime configuration, or shared harness was changed.
The task is **not complete**: no Summary runtime test, browser capture, or
clipboard experiment has run. This report is a gate assessment, not regression
coverage or visual sign-off.

The current local source was checked, rather than substituting a remote revision.
The Summary page still maps header display amount separately from total loan
amount and amount requested; the ratios section contains 17 rows; borrower cards
retain input order and per-card primary flags. Clipboard success/failure paths
remain as described in the original Summary audit. These are static observations,
not executed assertions.

## Measured baseline gate

A read-only SHA-256 comparison checked all 174 historical manifest paths.
171 match that historical manifest; the three differences are:

| Path | Current SHA-256 | Disposition |
|---|---|---|
| `package-lock.json` | `caf5cbce73ec535033e36984f2c5d00e080a7a91c1575750b7008f7c52e9107e` | Explicitly accepted for disposable validation in `validation-baseline.md`; not a new blocker. |
| `SETUP.md` | `0226c80b675a0fab6c4df22b562013ceafd42bb8d60d5d0355a2642cb9a392e6` | Separately authorized documentation change described in `setup-documentation-verification.md`; the existing runner still requires the historical hash. |
| `replit.md` | `a92e1ae7924aaf64eb78b69e48ea94f81c6998463017a8980244dc1680447e24` | Same documented change and runner mismatch. |

All production source, styles, assets and runtime configuration in the manifest
match their historical hashes. In particular:

| Summary module | SHA-256 |
|---|---|
| `client/src/pages/loan-summary.tsx` | See unchanged historical manifest entry. |
| `client/src/components/loan/BorrowerCards.tsx` | `2177bc23703217d5899726177df5391c041d7078a01d59a433fb73ebcdfc77ea` |
| `client/src/components/loan/SummaryRatios.tsx` | `9c16b84f04bc85455d478a9cb0f8921a356e6254e90c4c08be881dccef7d03dd` |

`verification/baseline/run.py` asserts historical hashes for every manifest
entry other than the accepted lock **before** creating its disposable copy.
Thus the two documentation differences prevent using that runner unchanged.
This is established by reading its guard and comparing actual hashes; the
runner was not executed, and no install/test exit status is asserted here.
Neither the manifest nor the shared runner was patched or bypassed.

## Remaining proof matrix

| Required proof | Status |
|---|---|
| Unchanged three-module source baseline | Pass: byte comparison only |
| Accepted dependency lock identity | Pass: byte comparison only; installed dependency equivalence not measured here |
| Reusable disposable shared environment | Blocked by runner/documentation hash mismatch |
| Pending, error, no-data, cached-data-plus-error branches | Unverified at runtime |
| All 17 labels, values and DOM row order | Static inventory available; executable assertions pending |
| Distinct display/total/requested amounts and currency edge strings | Unverified at runtime |
| Null/undefined versus empty Rule of XX | Unverified at runtime |
| Zero/one/multiple borrowers, order and primary flags | Unverified at runtime |
| Mailto values and plain-text phones | Unverified at runtime |
| Clipboard resolve/reject/unavailable/repeated and completion order | Unverified at runtime |
| Native Enter/Space activation, focus and toast behavior | Unverified in a browser |
| 1440×900, 1024×768, 390×844 captures | Not run |
| md/xl edges (767/768 and 1279/1280), panels, below-fold scrolling | Not run |
| Computed typography, colors, spacing and fixed fonts | Not run |

The shared accepted fixture environment is jsdom-based. Its report explicitly
does not establish browser layout, font loading, breakpoint pixels or native
keyboard behavior. No accepted browser harness was located under `verification/`.
No live App was mounted to substitute for that missing isolated evidence.

## Safe next step

Have the shared verification owner explicitly reconcile the two already
documented guide changes in the preservation gate, retaining the accepted
dependency hashes and all production hashes. Coordinate a single authorized
disposable browser harness using the existing CSS/fonts, fixed clock/timezone,
synthetic records, disposable storage and denied/fake external transports.
Do not install a competing harness or change dependency contracts implicitly.

Once those prerequisites are available, resume the page-specific tests and
captures above against unchanged production files. The prior baseline report's
15 type diagnostics remain historical evidence for this task, not a fresh run
or permission to repair them.

No new follow-up tasks are proposed: shared baseline work and the already
planned formatting/copy-button tasks cover the relevant ownership boundaries.
This report does not transfer unfinished Summary checks into those tasks.
