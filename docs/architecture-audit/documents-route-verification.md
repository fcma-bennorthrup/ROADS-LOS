# Routed Documents verification

## Scope and resolved setup blockers

Verification only; no production, dependency, runtime configuration or asset
edits. The user explicitly authorized resolving the setup gaps after the
initial blocked report.

The shared disposable runner now accepts only the two exact documentation
hashes already recorded by `setup-documentation-verification.md`, alongside
the previously accepted lock hash. Every other historical hash must still
match. The historical manifest is unchanged. This is not a general drift
waiver or production calendar approval.

The runner also copies the Documents verification directory. That directory
contains the actual routed page with its real header, sidebar, toolbar,
activity/checklist providers, document components and overlays. It does not
mount App or useGitHubSync. A fake sync context rejects operations. The
route-away destination is a synthetic placeholder, not a production page.

## Executed results

| Check | Result |
|---|---|
| Disposable lock-preserving install | Exit 0 |
| Original production type check | Exit 2; the same 15 diagnostics reported by baseline verification |
| Existing tests plus baseline fixtures | 18 files / 176 tests pass |
| New actual-route fixtures, final run | 12 / 12 pass |
| Initial new-fixture run | 3 failures; two expected-cache assumptions and one test selector corrected as described below |
| All 174 manifest paths, project and disposable copy | Unchanged from task entry |
| Static fixture browser build | Exit 0, using accepted installed Vite and unchanged production CSS |
| Four PDF source hashes and both Vite-emitted PDF hashes | Exact byte equality; no PDF content read or delivery attempted |

The original all-suite run had 185 passes and 3 failures. The final rerun
targets only the corrected route file (12 passes); the unchanged 176 existing
tests were not rerun unnecessarily. These are separate runs, not a claim that
the original all-suite run passed.

The failures were fixture errors, not repaired production defects:
the real header creates a **disabled** `/api/github/sync-status` cache observer
on successful load, even while its admin panel stays closed. The route test
now asserts that exact cache entry plus zero additional transport calls rather
than incorrectly expecting only the loan key. The reset test now uses the
actual `toolbar-checklist` selector. No desired-behavior snapshot was updated.

The full type-check diagnostic text is retained; it still reports the existing
pull-mutation call argument error and 14 Map/Set iteration target errors. No
casts, compiler flags, test exclusions or production repairs were added.
The aggregate runner correctly remains nonzero because of that type failure.

## Route coverage

All scenarios use synthetic borrowers, fixed time
`2026-10-14T16:00:00.000Z`, UTC, disposable storage and fake responses.

| Contract | Actual evidence |
|---|---|
| Deferred/404/invalid JSON/falsy/success/empty roster | Five parameterized tests assert loading/error text, absent successful shell in failure, exact credentialed GET, one request/no retry, production query defaults and exact cache keys |
| Sidebar/route round-trips mid-generation | Two tests assert local disclosure work cancels, pending CD work cancels, package due-time persists and completes with original timestamp, closing tab resets on section remount |
| Closing tabs and loan changes | Pending CD completes while other tab is selected; A/B/A provider and document keys retain only the correct loan rows |
| Older-row editor | Seven columns and descending row order; save targets older row only, preserves timestamp and newer row, cancel discards draft |
| Overlay and empty roster | Real Sheet accessible title, popover borrower content, empty-roster Save disabled |
| Failure/queued save | Failed storage leaves draft/error; queued Web Lock blocks duplicate Save, Cancel and Escape until explicit fake commit |
| Scoped/global reset | Cancelled confirmation preserves rows; scoped reset preserves package; actual global toolbar reset clears package |
| PDF arguments | Complete ordered open argument arrays match exact imported/public URLs, including security features for CD/package |

Existing unchanged component/hook tests additionally cover partial-reset
failures, stale record identities, conflicting borrower edits, invalid stored
metadata, reset while editing, package read/write failures, local-day assumed
dates and empty roster delivery. Those are passing component-level evidence,
not a claim that every failure permutation was retested through the route.

## Browser evidence and limits

The browser pass uses only the disposable static fixture on port 4173, never
the live workflow or application. External fonts are deliberately blocked.
The original CSS/font declarations are preserved, but captures can establish
only fallback-font geometry, not loaded-font pixel equality.

Browser evidence is recorded separately under `documents-browser-evidence/`.
All nine required viewports were captured: 1440×900, 1024×768, 390×844,
and 599/600/601/766/767/768×900. Browser metrics/screenshots are
characterization of unchanged source, not a baseline-versus-changed-UI claim.
No performance, cross-window atomicity, actual delivery, or live PDF viewer
certification is made. The Node transport preload is a trusted-fixture guard,
not an OS network sandbox.

**Observed browser finding, not repaired:** the unchanged 240px sidebar leaves
only a 101px history viewport at 390px; top navigation/content are clipped and
the bottom toolbar overflows. Horizontal table scrolling works, but narrow
usability is poor. This is a failed usability observation against unchanged
production bytes, not a regression introduced by these tests. A redesign or
responsive repair requires separate explicit approval.

Sheet 599/600px full-width single-column and 601px 584px two-column behavior,
inner scrolling, Escape/focus return, native select keyboard operation,
save/cancel, package generation/delivery retention, scoped reset and alternate
response shells were observed. “Partially recorded” after editing only one of
two borrowers is the expected current summary, not a save failure.

The browser report's unchanged toolbar metrics at 767/768 refer to the
**global bottom toolbar**, not `.closing-disclosure-toolbar`, which is the
element targeted by the Documents media query. No failure of that CSS rule is
established. The screenshots show stacked CD actions at narrow widths; exact
computed CD-toolbar boundary deltas were not measured in this pass.
Global reset and queued/failure editor flows are covered by route unit tests;
the browser did not exercise those flows. Browser tabs' Arrow-key behavior was
not independently established; the existing component tests cover it.

Screenshots are attached browser observations indexed by ID in the browser
report, not exported image files. Font-loaded equality remains unverified;
these limits must not be interpreted as a clean visual certification.

## Reproduction and retained evidence

See `verification/documents/README.md` for disposable test/build/browser
instructions. `documents-route-evidence/` retains installation output,
initial aggregate results (including the failed commands), exact type
diagnostics, initial all-suite log, final route test log, and final PDF/
manifest integrity ledger. Historical baseline evidence is not overwritten.

No new follow-up tasks are proposed because the assignment already lists
downstream formatting, reset, package concurrency, disclosure coordination
and document presentation tasks. Those tasks do not inherit a clean type,
font-loaded visual, or unrestricted production behavior sign-off.
