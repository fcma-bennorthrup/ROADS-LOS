# Loan display extraction — verification status

## Scope and reference

The user accepted current local source as this extraction's before-reference,
with the previously accepted dependency lock unchanged. Seven loan pages now
import one equivalent `LoanWithBorrowers` interface and `formatCurrency`
function from `client/src/lib/loan-display.ts`. No JSX, query, prop, handler,
route, style, dependency or persistence change is included.

## Completed evidence

- Reverse-extraction reconstructed all seven exact pre-edit page SHA-256 hashes.
  This verifies all page code outside the extracted declarations is byte-identical,
  including every header/ratio/Loan Details amount-field call site.
- Twelve literal currency cases passed: zero, negative, fractional rounding,
  empty, invalid, numeric-prefix, whitespace-prefix, comma-prefix, dollar-prefix,
  negative zero, scientific notation and infinity.
- 2,100 baseline/candidate page-element and prop comparisons passed across all
  seven consumers, including loading, error, empty, success, cached-data-plus-error
  and section variants. Child components are inert identifiers in these checks;
  these are not full child-interaction tests.
- Non-emitting TypeScript checks of baseline and candidate both exit 2 with
  the same 15 existing diagnostics: one GitHub pull mutation argument error
  and fourteen Map/Set compiler-target errors. No repair/suppression is included.
- All seven pages' four browser states at 1440×900 match exactly in DOM,
  computed styles, geometry and screenshot bytes. Success includes bottom
  scrolling and native Space opening the focused checklist.
- All 196 page/state/viewport combinations have now been compared: seven
  pages × four states × seven viewports (1440×900, 1024×768, 390×844,
  767×844, 768×844, 1279×900, 1280×900).
- DOM, computed styles and geometry agree in all 196 combinations. Of the
  294 screenshot pairs (top, plus bottom/checklist for success), 292 match
  byte-for-byte. The remaining two differ in exactly one decoded pixel at
  (467,733), at the shared checklist toolbar focus outline: Decisioning and
  Closing & Booking, both at 1024×768. No other pixel differences were found.
- The user separately accepted both pixel differences and the blocked-font
  limit. The fixture allows only these two exact capture-hash pairs, not a
  general pixel tolerance; all other comparisons remain strict.
  The cause of the single-pixel raster difference is not established.

## Isolation and reproduction

`python verification/loan-display/run.py` copies local source into `/tmp`,
checks the accepted package/lock hashes, installs with lifecycle scripts disabled,
and runs contract/browser comparisons. No live App or server is started.
The existing inert admin adapter and synthetic Summary loan fixture are reused.
The clock and UTC timezone are fixed. Fetch permits only the synthetic loan
request; other transports/open calls are blocked. Browser CSP, proxy and DNS
restrictions block external requests. Existing CSS and PDF assets are copied.
Screenshots and generated bundles remain in disposable storage, not Git.

`python verification/loan-display/typecheck.py /tmp/loan-display-…/copy`
compares the unchanged full static-check import closure without running server code.

Disposable evidence:
- `/tmp/loan-display-hgtzcwo8/contracts.log`
- `/tmp/loan-display-hgtzcwo8/browser.log`
- `/tmp/loan-display-hgtzcwo8/browser-resumed.log`
- `/tmp/loan-display-hgtzcwo8/browser-remaining.log`
- `/tmp/loan-display-hgtzcwo8/browser-final.log`
- `/tmp/loan-display-hgtzcwo8/captures/`
- `/tmp/loan-display-rhieakk4/typecheck-comparison.log`

Initial fixture setup failures were missing PDF bundling and IIFE erasure of
`import.meta.url`; only fixture configuration was corrected. An initial
bottom-scroll capture race was resolved by allowing the browser to paint.
No application changes or expected screenshots were made to hide failures.

## Outstanding acceptance limits

**Complete with the two explicitly accepted focus-outline capture exceptions.**
All planned viewport comparisons are finished. External fonts are blocked;
the user accepted that limit, and no font-loaded equivalence is claimed.
Nested edit/save/cancel, PDF opening, storage and timing flows were not broadly
retested; their code and page inputs are unchanged by the reverse-extraction
and prop checks. No performance gain, clean type check or production health
claim is made.

The next-step query-helper task is already queued; no duplicate follow-up is
proposed.
