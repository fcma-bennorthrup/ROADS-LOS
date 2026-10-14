# Change Log characterization — verification only

## Result and scope

**41 tests passed in 2 files. Nine synthetic browser captures were produced
and inspected. All 174 audited files remained byte-identical to task entry,
in the workspace and disposable copy. No production changes.**

This is characterization of History, not a repair, a live audit trail, a
production-readiness certificate, or a visual-equivalence claim. Activity
remains a separate model. The downstream transform extraction, current-loan
navigation, and keyboard-sort changes are not implemented.

## Reference and isolation

- Current local source matches the History hashes recorded in `history.md`.
- The explicitly accepted validation lock is SHA-256
  `caf5cbce73ec535033e36984f2c5d00e080a7a91c1575750b7008f7c52e9107e`.
  Package manifest remains
  `e3a709a27242fa7cdf8385c115ea3a2ce4a332d1771b1de5e835b0e2bf21f753`.
- Full historical manifest comparison found only the accepted lock departure
  and the separately authorized `SETUP.md` / `replit.md` documentation changes.
  See `validation-baseline.md` and `setup-documentation-verification.md`.
  The runner pins those exact hashes rather than weakening the shared gate,
  overwriting the historical baseline, or ignoring unexpected drift.
- A fresh `/tmp/history-verification-*` copy was installed with the accepted
  lock, lifecycle scripts disabled. Node v24.13.0; Vitest 4.1.11. Every installed
  package version matched its lock entry; absent entries were optional.
- Reused `verification/baseline/setup.ts`, `network-guard.cjs` and Vitest config
  unchanged. No competing shared harness edits, new dependencies, real App,
  workflow restart, database, financial API, GitHub operation, or delivery.
- UTC; wall clock fixed at 2026-10-14 16:00 UTC; disposable HOME/storage/files;
  environment allowlist excludes secrets. Test fetches are explicit inert
  response mocks. Shared guards reject unmocked external transports.

The private static Change Log array cannot receive fixture data through props.
A test-only, SHA-256-guarded transform substitutes **only that array** with 40
synthetic records. Production source files on disk are never rewritten.
Parser, filtering, sort, paging, handlers, JSX and real RoadsDropdown execute
unchanged. Consequently these tests protect algorithms and interactions, not
the exact prose of the original demo records. Hashes protect original bytes.

Route tests execute the real query client defaults and loan History component,
with inert header/admin boundaries and synthetic Activity context values.
The real Activity panel renders. Browser captures additionally render the real
header and toolbar, with mocked checklist context and inert unshown admin and
checklist panels. These are deliberately **not** full-App or provider-lifetime
tests. No support route was added.

## Proof matrix

| Required contract | Result |
|---|---|
| Default 20; sizes 10/20/50; all pages and bounds | Pass: exact row-ID sequences, page counts, disabled arrows and repeated boundary clicks |
| Reset on search, sort and size | Pass, including selecting the already-selected size |
| Seven searchable fields | Pass: field, previous/new value, actor, position, timestamp and section independently, case-insensitive |
| Blank-only versus padded query | Pass: blank-only leaves all rows; nonblank padding remains significant |
| Empty page 1/1, no message | Pass: zero rows; columns/footer remain; both arrows disabled; no invented empty-state copy |
| Midnight/noon, month/year sort | Pass: explicit boundary fixtures, full ascending/descending ID order and unchanged display strings |
| Callback precedence | Pass for all six destinations; once per click and no default navigation |
| Six default destinations | Pass: Decisioning and five encoded Origination sections still hardcode loan 1, even from synthetic loan B |
| Query branches | Pass: deferred, success, 404, 500, HTML, invalid/empty JSON, null/false data, cached success, cached-plus-error; missing ID fallback and ID changes |
| Query policy | Pass: exact request URL/credentials, query keys, infinite stale time, no retry/focus/interval refetch; cached success fetches zero times |
| Success shell and errors | Pass: exact generic loading/error text and success header props; no header/content/toolbar in early branches |
| Activity independence | Pass: changing Activity fixture items does not change History filter/rows; Change Log search does not filter Activity |
| Existing awkward keyboard behavior | DOM-level pass: timestamp remains a nonfocusable div; Enter/Space do not sort. Not an accessibility endorsement |
| Dropdown lifecycle | DOM-level pass: inline/upward positioning, selected checkmark, selection/outside close, Escape remains a no-op |
| Remount defaults | Pass: search and page-size reset on component remount |
| Requested captures | Captured/inspected: 1440×900, 1024×768, 390×844 × closed, Activity open, dropdown open/scrolled to footer |
| Production/dependency preservation | Pass: all 174 entry hashes unchanged in source and disposable copy after tests and captures |

## Capture findings, not repairs

See [history-evidence/captures/](history-evidence/captures/) and its `results.json`
for images, actual viewport dimensions, computed sample-cell typography,
spacing/color, footer bounds and image fingerprints.

All nine captures use the same existing system Chromium, stylesheet/token
bytes, synthetic inputs and blocked external font state. Browser rendering
was loaded from a self-contained disposable file, not a web server. Browser
control uses local inherited pipes, without a debugging port. CSP denies
connects and font loads; browser URL blocking denies HTTP/HTTPS/WebSockets;
resolver/background-network restrictions provide additional defense. This
is trusted-fixture isolation, not a packet-monitored OS sandbox.

Observed in these fixtures:

- Desktop closed and Activity-open show the expected separate Change Log and
  Activity content. Long values and section links truncate.
- At 1024 with Activity open, header-stage overflow crosses into the panel;
  some table headings crowd together.
- At 390, table headings overlap and values truncate severely. Activity's
  fixed 280px width leaves a very narrow History column, with header overflow.
- The open size menu extends upward over lower rows and shows 10/20/50 with
  20 selected. Scrolling the footer into view can leave its bottom obscured
  by the fixed toolbar. These are recorded observations, not automatically
  approved defects or layout repairs.

An initial CLI capture attempt was rejected by the viewport assertion because
window dimensions were not content-viewport dimensions (1440×757 instead of
1440×900). It is not accepted evidence. The delivered captures use explicit
browser device-metrics overrides and assert the actual requested viewport.

## Limits and remaining gates

- Source Sans Pro/Inter are external font links in the original HTML, not
  repository font files. They were not fetched. Captures use the browser's
  system fallback with the original CSS family declarations. **Font-loaded
  visual acceptance remains unverified**, not silently passed.
- No before/after production visual comparison is claimed: production has
  not changed. No native tab-order/focus, assistive-technology, destination
  page forms, provider reset persistence, live data, or browser back/forward
  certification. DOM fireEvent assertions are not real keyboard automation.
- The inherited 15-diagnostic static-check failure in the accepted baseline
  remains an independent blocker to clean static readiness. This task does
  not rerun the unchanged global check or repair/exclude its failures.
- No speed, accessibility, font-loaded responsive quality, full regression
  suite, build, deployment, production health, or security pass is claimed.
  Browserslist's stale-data warning was retained; no update performed.
- Downstream tasks already cover planned extraction/navigation/keyboard work;
  no duplicate follow-up proposals were created.

## Reproduction and evidence

```sh
python verification/history/run.py
# Use the disposable copy path printed by that command:
python verification/history/capture.py /tmp/history-verification-<suffix>/copy
```

These commands never install in the project. The capture command uses the
existing system `chromium`; unavailable browser tooling or hash drift fails
explicitly. Generated HTML, package cache, browser profile and runtime outputs
stay under `/tmp`. Only bounded test sources and the reviewed report evidence
are retained here.

Evidence includes the actual verbose test log, installation log, dependency
version/hash ledger, and nine screenshots. The final capture process completed
successfully; a separate final hash check confirmed preservation after it.
The reproduction script also enforces that before/after check.
