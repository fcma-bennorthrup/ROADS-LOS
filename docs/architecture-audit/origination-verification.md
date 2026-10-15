# Origination form and section characterization

## Scope and verdict

Verification only against unchanged local production code. **49 tests passed
across 5 files** in a freshly installed disposable copy: 36 new cases and 13
existing Collateral/Pricing cases. No application behavior was repaired.

This is a **DOM/component characterization plus bounded browser observation**,
not a clean visual, accessibility, performance or repository-wide static-check
sign-off. The browser pass reported existing defects, not a clean pass.

## Authority, baseline and safety

- Accepted lock SHA-256:
  `caf5cbce73ec535033e36984f2c5d00e080a7a91c1575750b7008f7c52e9107e`.
- The user explicitly accepted the current `SETUP.md` and `replit.md` hashes
  for these isolated tests. Only those documentation departures and the
  previously accepted lock departure are allowed by the new runner.
- All other 171 historical manifest paths match. **All 174 paths are
  byte-identical before/after in both workspace and disposable copy**,
  including production source, runtime/dependency configuration, styles,
  assets and original tests. Exact hashes are in the evidence JSON. Preservation
  was also checked after the browser pass against the same before hashes.
- Reused `verification/baseline` setup, configuration and Node network guard;
  no shared harness edits. New fixtures are only in `verification/origination`.
- Clean `npm ci --ignore-scripts --no-audit --no-fund`: exit 0.
  Test command: exit 0. Python runner: exit 0. Node v24.13.0, UTC.
  Default clock: 2026-10-14T16:00:00Z; existing tests retain their own clocks.
- Environment allowlist excludes secrets; disposable HOME, npm cache and jsdom
  storage. Socket/HTTP/UDP/fetch/WebSocket guard plus browser XHR/open guard.
  PDF opening is explicitly spied and returns null, never opens a real file.
  Existing CSS/fonts/assets are copied without alteration. The later isolated
  browser fixture imports original CSS; exact font loading is not certified.
- Actual forms, native inputs, Roads dropdown/date picker and Radix Dialog
  are used. Route mounts the real page, never App; only admin panel mocked.
  Actual Wouter history/search operates inside jsdom. Query data is synthetic
  and cached; pending/error/empty responses use local promises.
- No live workflow startup/restart, live App screenshot, server API, database,
  financial operation, document delivery, GitHub operation or deployment.
  A separate Vite fixture ran only from the disposable copy on port 4317 with
  an allowlisted environment, fixed Date and inert admin/open/transport hooks.
  The browser context allowed only that local origin and used UTC/disposable
  storage. This did not install Playwright into the app dependency snapshot.

## Proof matrix

| Requirement | Actual evidence and outcome |
|---|---|
| Five valid search selections | Five cases pass; exactly one section-content element mounted |
| Invalid/empty/missing/case-mismatched search | Five cases pass; default borrower section retained |
| Duplicate parameters and later navigation | First parameter wins, including invalid-first; invalid later search retains current selection; valid later search overrides; sidebar leaves search unchanged |
| Route/query states | Loading, rejected promise, null data show exact authored text without section shell; synthetic loan with empty borrowers still shows two hardcoded borrower tabs; exact loan query key and idle cached fetch asserted |
| All borrower drafts | Both borrowers: all eleven text fields, native DOB, state, marital and farm selectors updated independently; tab switches retain edit drafts; Save and Discard snapshots checked; static heading unchanged; disabled checkbox/radio questionnaires checked; remount loses saves |
| Details strings | Invalid/empty amounts remain unvalidated strings; story, selectors and both checkboxes saved/discarded; new prop does not overwrite mounted state; remount reseeds amount |
| Fee no-op Save/collision | Save leaves exact section HTML unchanged; no selection Add is inert; arbitrary amount text/default 0.00 preserved; same-clock IDs collide and one delete removes both; Delete All retains input drafts; route unmount loses saved table |
| Split/delete evaluations during edit | Split while editing, cross-evaluation draft edits, Discard of both, Save of both, then Delete Evaluation 2 retains unsaved evaluation-1 draft and exits editing; re-split has empty evaluation 2 |
| All eleven pricing products/rates | Eleven explicit catalog rows assert term, base and final rates; blank override does not change rate; selecting product resets override; Discard restores blank saved override |
| Lock/cancel/remount | Unsaved arbitrary term can be locked; initial expiration exactly 11/28/2026 and disabled; locked editor disabled; Cancel/custom close/Escape retain unconfirmed date strings; section remount retains complete status but returns default rate/term |
| Mounted/unmounted resets | Both Collateral and Pricing tested in both states. Address clears; mounted evaluation draft survives; mounted pricing choice survives reset; after newer save/relock, section remount replays old reset and clears address/unlocks local display |
| PDF arguments/bytes | Exact resolved bundled URL plus `_blank`, `noopener,noreferrer`, once; opening leaves rate-lock action not-started. Manifest verifies original PDF bytes unchanged; no PDF content extraction |
| Existing workflows | All 13 existing cases pass unchanged, including six collateral action activities, task transitions, toasts, cancelled/confirmed reset, pricing estimate re-fire/status/activity persistence |

## Defect sequences preserved, not fixed

1. Two fees added at the fixed millisecond receive the same React key. React
   emits its existing duplicate-key warning; deleting one removes both.
   This demonstrates that exact sequence in this dependency snapshot, not
   guaranteed React reconciliation behavior for every duplicate-key scenario.
2. Rate-lock date Cancel/custom close/Escape retain the edited string.
3. Locking nondefault terms then remounting shows default terms while checklist
   status remains complete.
4. Reset, then save a new address/relock, then hide/show section replays reset.
5. Delete Evaluation 2 during editing retains evaluation-1's unsaved draft.

## Failures during fixture development

Initial run: 35 passed, 14 failed. The test reset helper omitted the required
task-name array; Wouter's memory-location path was incorrectly given a query
string and did not exercise its separate search hook. Both were fixture
errors, not application regressions. The helper now supplies the actual task
names and route tests use real browser history inside jsdom.

A corrected run passed 49/49. The final fresh-copy run again passed 49/49
after strengthening fee sidebar and exact PDF assertions. No production file,
expected snapshot or dependency version was changed to obtain a pass.

## Unverified limits and remaining risks

- A single browser pass captured all five sections at 1440×900, 1024×768 and
  390×844, inspected scrolled borrower content and the pricing modal/calendar,
  and exercised native DOB entry, fee Tab/Enter and dialog Escape.
  See [browser-report.md](origination-evidence/browser-report.md) for the
  complete observation/screenshot inventory. No breakpoint-edge, exact
  computed-style, pixel-equivalence, exhaustive keyboard/outside-dismissal,
  accessibility-tree or screen-reader certification is claimed.
- Browser result: **failure due to existing behavior/layout issues**. Fee
  collision/deletion and pricing remount mismatch reproduced. Narrow layouts
  clip across all five sections; pricing also crowds at 1024px. Escape did not
  close the fee menu; pricing dialog Escape returned focus to BODY in this
  fixture. Manual date text/calendar month differed, and calendar overlay
  partly covered the footer. These observations are not repaired here.
- Browser confirmed borrower draft retention across tabs and loss after section
  re-entry, Details Save/Discard, Collateral delete-during-edit retention,
  nondefault unsaved product lock, date retention on Cancel/Escape and inert
  PDF open arguments. Inspected screenshot examples confirm mobile pricing
  clipping and the desktop Edit Rate Lock modal; no redesign was attempted.
- All external browser requests were configured to abort. None were attempted,
  so font-blocked behavior remains unverified. The two optional replay scripts
  were syntax-checked only, not executed, and require external browser tooling;
  they are not new application dependencies or substitutes for observed results.
- Provider resets are real but these fixtures do not reproduce every denied
  storage, async Web Lock, alternate-loan or full-reload sequence. Those
  broader policy paths remain in separately queued reset work.
- Route query cache cases do not re-prove HTTP credentials, retry/focus policy,
  cached-data-plus-error, missing ID fallback, or real Back/Forward timing.
  No live transport is used as a substitute.
- PDF byte preservation/open-call assertions do not prove PDF rendering,
  download, popup behavior or personalized generation.
- The existing baseline's fifteen TypeScript diagnostics remain a known
  separate gate. Static check/build/performance were not rerun or certified.
- This report does not authorize downstream behavior changes or remove
  browser proof requirements from later extraction work.

## Reproduction and evidence

`python verification/origination/run.py`

The runner fails on any unexpected manifest drift and emits its temporary
evidence directory. Committed evidence:
[results.json](origination-evidence/results.json),
[tests.log](origination-evidence/tests.log),
[install.log](origination-evidence/install.log).
`git diff --check` passed. No duplicate follow-ups proposed: the assigned
downstream tasks already cover planned next work.
