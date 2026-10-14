# Retained Coming Soon characterization

## Scope and outcome

Verification only. The retained page is still **unrouted**. No production
source, dependency, style, asset, runtime configuration or existing test was
changed. The live App was never imported or mounted. No workflow was started,
no real API/sync/financial operation was called, and no production repair,
publish or GitHub synchronization occurred.

**Measured results:** 40 new assertions/tests passed; 22 existing shared-panel
tests passed. Browser fixture capture pairs were byte-identical within each
tested state at exact 1440×900, 1024×768 and 390×844 content viewports.
This is characterization with blocked external fonts, **not production visual
sign-off**, a clean repository type-check, exhaustive accessibility testing,
or a performance claim.

## Baseline and safety

The explicitly accepted current verification lock is
`caf5cbce73ec535033e36984f2c5d00e080a7a91c1575750b7008f7c52e9107e`.
The package manifest remains
`e3a709a27242fa7cdf8385c115ea3a2ce4a332d1771b1de5e835b0e2bf21f753`.
All production/configuration/asset/test paths match the historical audit.
The three historical-manifest differences are the accepted lock and the
separately authorized `SETUP.md` / `replit.md` documentation edits, documented
in `setup-documentation-verification.md`. No other drift was accepted.

The runner pins those exceptions explicitly and rejects new drift. It copied
the 174 audited paths into `/tmp/coming-soon-verification-wg1ea5l5/copy`.
`npm ci --ignore-scripts --no-audit --no-fund` succeeded only in that disposable
copy. Installed package versions match the accepted lock (absent optional
platform packages remain absent); the full version ledger is retained.
Node was v24.13.0.

All **174 files in both original and disposable copy are unchanged** relative
to entry. The evidence JSON contains every original hash and the final check.
No dependency contract was rewritten. The shared fixture files were reused
unchanged; all new fixture code lives under `verification/coming-soon/`.

Test processes use an environment allowlist without project secrets, fixed UTC
clock `2026-10-14T16:00:00Z`, disposable jsdom storage and the existing shared
Node/browser transport guards. The page uses the actual QueryClient defaults
with new per-test clients. Only synthetic loan GET responses are allowed.
Header, toolbar, checklist and activity providers/presentation are real;
the GitHub sync panel is replaced by a fixture-only inert component.
This intentionally does not test the admin dialog or real global sync hook.

Browser captures compile the same unchanged page into a disposable `file://`
fixture using the accepted esbuild/Tailwind dependencies. No server is needed.
Existing CSS and Tailwind configuration are used unchanged. Browser profiles
and storage are disposable, time/timezone fixed, API responses fake. CSP denies
connections/fonts; XHR/WebSocket/window.open throw; Chromium uses a dead proxy
and blocked host resolution. Browser control is through anonymous CDP pipes,
not a listening debug port. This is defense for trusted fixtures, **not an
OS-level security sandbox**. Package installation was the only intentional
external retrieval.

## Coverage and exact retained behavior

| Proof item | Result and boundary |
|---|---|
| Production route absence | Static test reads, but never imports, App; exact six loan routes, root redirect route and NotFound fallback remain. No Coming Soon import/route. |
| Pending → success | Real query observer and default fetch function; loading label, absent header/toolbar, exact GET key and credentials, success mapping/order. |
| Pending → 404 / 500 / network / invalid JSON | All render exactly `Failed to load loan data`, never response details; header and toolbar absent; one request, no retry. |
| Falsy data | JSON null, false, zero and empty string select the generic error branch. |
| Cached success / cached-plus-error | Fresh cache avoids request/loading; failed explicit refetch retains cache data but renders error. |
| Query policy | Infinite stale time, no focus refetch, interval or query/mutation retry; actual application defaults, not a newly invented policy. |
| Two IDs / missing ID | Query key moves from fixture-a to fixture-b without remounting the harness; missing params request loan 1. Header navigation is separately pathname-derived. |
| Titles | Known, unknown, empty, spaced/unspaced ampersand, leading/trailing spaces and long title; exact heading text/test-ID transform. |
| Amounts | Zero, negative, fraction, empty, invalid, numeric prefix and comma prefix; preserve `$NaN`, `$-12.50`, `$12.00` and `$1.00`, not normalized values. |
| Loan header | Uses primary loan borrower, not borrowers array; mapped loan/CIF/amount/ECOA; no TRID chip without re-fire. Loan stage is not injected. |
| Prop update | Heading/root ID change to Documents while the same header DOM and old Summary selected state remain. No extra request. |
| Tab destinations | Each of the six header tabs navigates to its current synthetic-loan path. |
| Activity | Toggle changes button style and returns on second click; no activity panel is mounted. |
| No-ops | Menu, messages, Loan Info, Quick Links, Key Dates and Errors leave DOM/navigation unchanged. View Task does not expand/navigate. |
| Checklist lifecycle | Open, expand, close/unmount and reopen reset local expansion. |
| Reset cancel | Confirmation only; expanded state, runtime activity and package marker retained. |
| Reset success | Package removal → disclosure write → activity persistence clear. Expansion collapses; reset version increases **twice**, from history subscription and final completion. |
| Package-removal failure | Package retained; no disclosure write; activity still clears and expansion collapses; no completed reset version. |
| Disclosure-write failure | Package already removed; disclosure write fails; activity still clears and expansion collapses; no completed reset version. |
| Shell | Header/body/fixed-toolbar DOM order; authored and computed **36px** body bottom reserve. |
| Browser states | Loading, error, success, long heading, expanded checklist, focused checklist button and below-fold checklist content at the three specified sizes. |
| Focus / keyboard | Actual native Space opens/closes a focused checklist button at all sizes. Focus capture is controlled/programmatic; no exhaustive Tab/Enter/Escape or screen-reader claim. |
| CSS/scroll | Existing computed heading declaration is 600 20px/24px Source Sans Pro/sans-serif, color rgb(39,51,51); actual remote font bytes are blocked. Checklist inner scrolling reaches its lower content. |

The page has no page-specific media-query breakpoint. Header/tab overflow and
fixed toolbar are retained, not redesigned. At 390px, the stage/tab strip and
toolbar are clipped horizontally; the long heading wraps; the checklist
overlays page content. These are observed fallback-font fixture outputs, not
new defects to fix under this authorization. The long-title scene remains
visible above the toolbar in the sampled fixture.

## Browser evidence interpretation

18 initial state/viewport pairs plus six native-keyboard/below-fold pairs
were captured (21 unique scene/viewport combinations; focus was extended).
Each pair loads the **same byte-identical production source twice**, labelled
before/after. They establish deterministic fixture output, not an independent
comparison of two different application implementations. The 1024px focused
capture changes after native activation; comparisons are only within the
same interaction sequence, never across those different sequences.

Measured inner checklist scroll top / total height / visible height:

- 1440×900: 526 / 1058 / 532px.
- 1024×768: 618 / 1058 / 440px.
- 390×844: 785 / 1278 / 493px.

Capture hashes, computed measurements, dimensions and text are retained in
`coming-soon-evidence/`. PNGs and compiled bundles stay in the disposable
directory, not Git or deployment inputs; the committed capture script regenerates
them. Desktop success, mobile long-heading and mobile overlay images were
visually inspected. Not every generated image was manually inspected.

## Failures, limits and unresolved gates

- Initial fixture run: 30 passed, four failed because the test used a nonexistent
  reset-counter name and spied on a callback *after* the panel had captured it.
  Instrumentation was corrected to observe actual activity storage persistence.
- Next run: 33 passed, one failed. Source inspection confirmed the successful
  reset's two increments (history subscription plus finish). The characterization
  now explicitly documents/asserts that existing outcome. No application edit
  or expected screenshot update concealed a regression.
- Final page fixture run: **40/40 passed**; shared checklist/activity regression
  run: **22/22 passed**. Other suites were not rerun; the accepted validation
  baseline's prior full-suite results are not claimed as new results here.
- Initial Chromium `--window-size` captures did not match requested inner
  dimensions (browser chrome/minimum width). Those images are excluded from
  accepted evidence. CDP device metrics now assert each exact content viewport.
- **Font-loaded visual acceptance remains blocked:** fonts are remote in the
  unchanged app HTML, and external font transports are deliberately denied.
  The fallback-font comparisons cannot certify Source Sans Pro rendering.
  Completing font-loaded proof requires separately approved local font fixtures
  or a safe font retrieval arrangement; no font or dependency was substituted.
- The accepted validation baseline's **15 type diagnostics remain an unresolved
  gate for subsequent refactoring**, not failures repaired or reclassified here.
  This task did not rerun the unchanged repository type-check.
- Delayed Web Lock settlement, multi-window concurrency, exhaustive header/menu
  keyboard semantics and admin UI behavior are not covered by these fixtures.
  Reset evidence here covers the page's immediate cancel/success/two synchronous
  persistence-failure paths, not every shared reset policy.
- No performance, production readiness, live-route behavior for this deliberately
  unrouted module, or broad accessibility pass is claimed.

The verification deliverables are usable with these explicit limits.
Font-loaded visual sign-off must not be treated as completed or bypassed for a
later change. Shared reset policy and type-check repairs remain separately owned.
Existing downstream tasks cover planned work, so no duplicate follow-up was
proposed.

## Reproduce

From the project root, after approval of the documented dependency snapshot:

```sh
python verification/coming-soon/run.py
```

The command prints a disposable directory. It fails on unexpected baseline
drift, install/version mismatch or failing tests. In its `copy` directory,
with the same allowlisted disposable HOME/TMPDIR and UTC environment:

```sh
node verification/coming-soon/capture.mjs
```

This requires the environment-provided Chromium executable and writes only to
the disposable sibling `captures` directory. It fails on missing fixture
evidence, incorrect content viewport, keyboard failure or unequal capture
bytes. For focused capture runs, append modes (for example `focus checklist-end`).
Do not run the capture script against the live App or replace the inert sync
boundary with real operations.
