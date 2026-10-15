# Borrower presentation extraction — verification

## Implementation

Only the Borrower Information production module and four new files under
`client/src/components/loan/borrower-presentation/` change.

Declarations, Military Service and Demographic Information are moved to
separate modules. Their four shared display helpers remain borrower-specific
in `QuestionnaireDisplays.tsx`; this is not a universal form abstraction.
Constants, JSX, order, keys, test IDs, disabled states, styles, dollar
adornments and component placement are unchanged. Personal field controls,
borrower fixtures, state, saved refs and editor handlers stay in the original
module. No dependencies, tokens, assets, persistence or shared components change.

The runner proves the move mechanically: the archived original (with only
its fixture import reversed) matches the historical source SHA-256, every
moved block matches byte-for-byte except imports/exports, and the remaining
module matches the original minus those blocks plus the three imports.

## Authority and isolation

The accepted lock remains
`caf5cbce73ec535033e36984f2c5d00e080a7a91c1575750b7008f7c52e9107e`.
Existing Origination documentation exceptions remain local. The user explicitly
accepted server/index.ts hash
`2eee6c655d508e045a980256d4aa57624ce3c336ac9fe0758d6b0b003fc6d64d`
for this comparison only. Neither the shared runner nor historical manifest
was changed. Every other historical path passed its gate before testing.

The fresh disposable installation used `npm ci --ignore-scripts --no-audit
--no-fund`, an allowlisted environment, UTC, fixed Date, disposable HOME/cache
and storage, and the existing transport guards. No credentials were accessed.
Browser network was restricted to the disposable fixture origin on port 4317.
The live App/workflow, APIs, sync operations, financial services, real document
delivery and deployment were not used. The temporary Vite process was stopped.

## Actual results

- Mechanical extraction proof: pass.
- Fresh dependency installation: exit 0.
- Corrected component/route run: **50/50 tests, 6/6 files pass**. Includes all
  49 existing Origination cases plus a new baseline/candidate full-DOM trace.
- Initial new test: failed because it used a shorthand test ID without the
  existing helper's translation. Corrected the fixture only. The other 49
  cases passed in that run; no application changes or snapshot updates
  concealed the failure.
- Both borrowers: independent all-field drafts, Save/Discard, fixed headings,
  native DOB, disabled controls, existing dollar prefix, focus/node identity,
  remount loss of local saves: pass. Actual sidebar unmount is covered by the
  reused route tests; browser uses an inert section-unmount toggle.
- Browser: **72/72 exact rendered DOM/text/computed-style/geometry/scroll
  fingerprints match**, including both borrowers in read/edit mode at
  upper/middle/lower positions. Actual viewports: 1440×900, 1024×768,
  390×844, 767×844, 768×844 and 1023×768.
- Desktop/mobile keyboard/dropdown behavior matched, including existing Escape
  no-op and mobile overflow. No adjacent defect was repaired.
- Desktop and mobile baseline/candidate screenshot pairs were visually
  inspected and show no observed difference. This is not a pixel-byte diff.
- Source/style/asset hashes remained unchanged during the isolated test run.
  Repository-wide type/build diagnostics were not repaired or certified.

## Acceptance limits — explicitly accepted

The browser verifier returned partial acceptance rather than full certification:
external fonts were blocked as required, and screenshot bytes were unavailable
for an exact raster comparison. The existing font declarations were retained,
but the measured equivalence applies to the blocked-font environment only.
No font-loaded or pixel-byte equivalence claim is made.

The user explicitly selected “Accept the documented evidence and limits”
after being told that 50 tests and 72 browser comparisons passed while
font-loaded rendering and exact screenshot pixel-byte equality remain
unverified. This accepts the bounded evidence for this extraction only;
it does not convert those unverified checks into passes or waive future
tasks' proof requirements. No performance or accessibility certification
is claimed.

Query/loading/error/cache/transport policy, PDF bytes/open arguments and storage
lifetimes are outside the moved static modules and untouched. The reused
Origination suite covers its existing route, PDF and storage assertions; this
is not a new whole-application certification.

## Evidence

- `verification/borrower-extraction/run.py` — reproducible gated disposable run.
- `verification/borrower-extraction/equivalence.test.tsx` — full-DOM trace.
- `borrower-extraction-evidence/unit-results.json` — hashes and first-run
  outcomes with separately recorded corrected result.
- `borrower-extraction-evidence/tests-corrected.log` and `install.log`.
- `borrower-extraction-evidence/borrower-baseline-candidate-report.md` —
  browser observations and qualifications.
- `borrower-extraction-evidence/reproduce-borrower-equivalence.mjs` —
  optional replay using separately available Playwright, not a new app dependency.

Existing queued work already owns unrelated Origination behavior changes and
shared token/font verification; no overlapping follow-up is proposed.
