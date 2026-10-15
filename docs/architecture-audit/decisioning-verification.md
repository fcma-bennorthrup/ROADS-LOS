# Decisioning financial characterization

## Scope and authority

Verification only for DECISIONING-004. No production code, style, asset,
configuration, dependency, existing test or shared harness file was edited.
No defect was repaired. The current local implementation is the reference.

The separately accepted disposable-validation lock is
`caf5cbce73ec535033e36984f2c5d00e080a7a91c1575750b7008f7c52e9107e`.
The historical audit manifest remains unchanged. At entry, its only departures
were that accepted lock and the separately authorized documentation changes in
`SETUP.md` and `replit.md`, described in
[setup-documentation-verification.md](setup-documentation-verification.md).
All production paths matched the historical baseline.

## Reproduction

From the workspace root:

```sh
python verification/decisioning/run.py
```

This page-owned runner checks the 174 historical paths against explicit accepted
hashes before copying anything. It makes a fresh `/tmp/decisioning-verification-*`
copy, installs the accepted snapshot there with lifecycle scripts disabled,
and runs only the new page fixtures plus the existing Decisioning summary suite.
It checks all 174 paths again in both the workspace and disposable copy.
No shared verification file is rewritten.

The existing `verification/baseline` config, original test setup, fixed Date
clock, UTC timezone and Node/browser transport guards are reused. Environment
variables are allowlisted; no secrets or user npm credentials are inherited.
Only dependency retrieval is network-enabled. Test requests are in-memory
Responses, storage is disposable, and the App, backend and real sync hook are
never mounted. The unrelated admin panel is an inert fixture that throws if
opened; header/sidebar/toolbar/checklist/activity, financial components,
providers, and loan query implementation are real.

The optional browser command uses existing Chromium with a disposable profile
and CDP pipes, not a network debugging port or live workflow. It bundles only
the page fixture using the accepted esbuild, compiles the unchanged CSS using
the accepted Tailwind, and opens local files. CSP denies external connections
and fonts; fetch accepts only the synthetic loan request; XHR, WebSocket and
window.open throw. Background networking is disabled and DNS resolution denied.
These are trusted-fixture guards, not a hostile-code security sandbox.

## Measured results

Node v24.13.0; UTC; default wall clock 2026-10-14T16:00:00.000Z.

| Check | Result |
|---|---|
| Disposable installation | Pass: 585 packages installed, exit 0 |
| Added financial component cases | Pass: 24/24 |
| Added real-page cases | Pass: 7/7 |
| Existing Decisioning summary cases | Pass: 5/5 |
| Browser fixture captures | Nine captures: income, below-fold balance editor/menu, and checklist + activity at 1440×900, 1024×768, 390×844 |
| Browser exceptions on final capture | None reported |
| Before/after hashes | All 174 paths unchanged in workspace and disposable copy |
| Production/dependency changes | None |
| Full repository type check | Not rerun; accepted baseline's 15 existing diagnostics remain unresolved |
| Production build, live App, GitHub, financial operations, deployment | Not performed |

The passing counts are from targeted runs, not a claim of one all-green initial
attempt. Initial route tests failed because the fixture omitted the admin
context; the test-only inert boundary fixed that omission. Two new option
tests initially used a label shared by the trigger and selected option; selectors
were corrected to the existing option test IDs. The complete financial suite
then passed. No production repair, expectation relaxation, assertion removal
or snapshot update was used to obtain a pass.

An initial browser capture tried HTMLElement.click on a click-only SVG; the
driver was corrected to dispatch a mouse click, without changing the SVG or
claiming keyboard support. Early failed attempts are recorded as fixture
failures, not application regressions.

## Proof matrix

| Requested contract | Evidence and current outcome |
|---|---|
| Income add → discard | Blank/default source remains; previous unsaved source draft is abandoned |
| Switch income editor/tab | Previous draft drops; selecting the already-active tab also drops it; saved borrower-specific income survives tab changes |
| Household-like balance state | Balance draft and saved value survive borrower switching; no borrower-key isolation was introduced |
| Independent drafts | Saving income leaves balance draft intact; both remain through Reset Demo |
| Numeric parsing/calculation | Commas removed, numeric prefix accepted, dollar-prefixed/invalid/empty strings become zero, negative contribution accepted; exact $1,188.00 yearly/$99.00 monthly fixture |
| Totals only on Save | Old $73,000.00 remains during edits, totals are not editable, totals update on Save; duplicate dollar adornment remains |
| Income fields and conditional dates | All ordinary text/date fields save raw values, four income types selectable, No shows End Date, Yes hides without erasing it; collapse/expand retains draft |
| Balance Save/Discard/add | All four categories save unconstrained strings, discard restores prior values, add-then-discard keeps default row |
| Balance types/payoff | Seven asset and six liability options stay in their existing categories; liability payoff and raw monthly payment exercised |
| Balance editor switching/deletion | Switching category abandons previous draft; deleting current editor clears it |
| Empty/unequal paired columns | Added row produces expected empty partner cell; deleting both sides leaves two headers/add controls only |
| Menus | Both card kinds in all categories: toggle, inside mousedown stays open, outside mousedown closes, immediate delete |
| Known edit-index defect | All four categories: delete-before-edit with three rows redirects draft/Save to the next record; with two rows hides active Save |
| Reset isolation | Cancelled and confirmed real checklist Reset Demo preserve mounted saved income, added row, income draft and balance draft |
| Sidebar remount/reload-like remount | Switching Summary → Financials restores seeded income and balance data; fresh page mount starts Summary. This is React remount evidence, not a browser reload test |
| Query/loading/errors | Production key/request credentials/options checked, one request across sidebar switches; pending shell, 404, 500, HTML parse failure and null response; generic error with no header or retries |
| Empty API borrowers | Does not remove the two locally seeded financial tabs |
| Responsive visual fixtures | Same unchanged source/CSS and controlled blocked-font policy at the three requested viewports, with below-fold content and overlays |

## Known behavior is not product approval

- Wrong-record overwrite and hidden Save after earlier-row deletion are reproduced
  defects, not desired expectations. The three-row Save also duplicates a React
  key by copying the edited record's ID over the later record. React logs that
  warning; it is not suppressed. Unique fixture add times isolate this from
  unrelated same-millisecond ID generation.
- Added-then-discarded default rows, household-like balance state, stale totals
  while editing, lack of string validation, Reset Demo isolation and loss on
  sidebar remount are explicitly retained.
- The mobile blocked-font capture shows severe clipping with the fixed sidebar
  and two-column balance layout. That is an observation in this fixture, not a
  new responsive repair or a claim about every device/font combination.
- Existing downstream tasks already cover financial identity, accessibility,
  reset policy, decision display and menu extraction. No duplicate follow-ups
  were proposed.

## Limits and review boundaries

This is characterization of unchanged production bytes, not baseline/candidate
pixel equivalence, accessibility certification, performance evidence or runtime
release sign-off. Chromium captures use the authored font-family declarations
with external fonts blocked; Google font bytes are not local assets in this
snapshot. **Font-loaded visual acceptance remains unverified**, rather than
fetching unapproved remote font assets or substituting a new font.

Mouse events in the browser fixture are scripted DOM events, not proof of
real-pointer hit targets. Narrow-view clipping can hide the opened menu. Full
keyboard/tab/focus behavior, assistive output, native date-picker chrome,
cross-window storage, browser reload, and exact breakpoint-edge comparisons
are not established by these fixtures. No I-class extraction or X-class behavior
change is being accepted here; those later tasks need their own stricter proof.

Screenshots and generated bundles stay in disposable storage, not Git.
Small raw logs, command exits, preservation hashes and screenshot metadata/hashes
are retained in `decisioning-evidence/`. Re-run the runner to regenerate images.
The existing failed static-check baseline must not be described as repaired.
