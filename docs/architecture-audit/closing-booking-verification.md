# Closing/Booking characterization — verification complete

## Status

**Complete.** Isolated jsdom tests and the bounded Chromium fixture both ran
against unchanged production files. This is characterization evidence, not
acceptance of a production change. It does not certify visual parity to an
earlier release, loaded-font parity, accessibility conformance, performance,
or behavior outside the listed fixture.

Only page-owned verification files and this evidence report were added. No
production source, CSS, assets, dependency files, runtime configuration, shared
harness, or existing tests were edited. No repairs or behavioral exceptions
were implemented. Booking remains a local simulation.

## Authority and baseline

The assignment authorizes CLOSING-BOOKING-001 verification, not its neighboring
accessibility exception or backend booking. Current local source was read
alongside the original report, approval register, and final review.

The accepted dependency snapshot is the current lock recorded in
`validation-baseline.md`, SHA-256
`caf5cbce73ec535033e36984f2c5d00e080a7a91c1575750b7008f7c52e9107e`.
All production paths match the original audit manifest. The two documentation
differences (`SETUP.md`, `replit.md`) match the separately delivered setup
documentation correction; the third historical difference is the explicitly
accepted lock. Their exact current hashes are checked by the runner, not
silently substituted into the historical audit.

All **174 manifest paths remained byte-identical before/after this work**, in
both the workspace and disposable copy. Full hashes and installed-versus-lock
measurements are in `closing-booking-evidence/results.json`.

## Deliverables and reproduction

- `verification/closing-booking/components.test.tsx`: editor, actual picker,
  timer and owned side-effect characterization.
- `verification/closing-booking/route.test.tsx`: actual route, header/sidebar,
  loan query, actual checklist/activity providers and Reset Demo.
- `verification/closing-booking/vitest.config.ts`: page-only include, composed
  with the accepted shared baseline config. No replacement shared setup.
- `verification/closing-booking/run.py`: checks exact baseline hashes, makes a
  disposable copy, installs only the accepted lock, verifies installed versions,
  runs the page suite and checks source/copy preservation.

Run from the repository root:

```sh
python verification/closing-booking/run.py
```

The runner uses a secret-free environment allowlist, disposable HOME/cache,
UTC, the fixed shared clock, `npm ci --ignore-scripts --no-audit --no-fund`, and
the existing Node/browser transport guards. Registry access is used only for
installation. Application checks use synthetic responses and jsdom storage.
The Node runtime measured was v24.13.0. All installed versions match the
accepted lock; optional absent packages are explicitly listed.

No live App, server, workflow, production database, admin transaction, real
financial operation, PDF open or external document delivery was used. Actual
source/styles/fonts/assets were copied unchanged. They were **not visually
rendered or certified** by jsdom.

The route fixture uses Wouter's memory location, actual route component,
QueryClient defaults, real header/sidebar and real loan-keyed providers.
Other destinations are deliberately inert, not fake implementations of those
pages. The header's pathname reader receives a matching disposable history
pathname. The admin context contains throwing inert mutations; the closed
real admin panel's disabled status-query observer is retained. It makes no
admin request. Every fetch must match an allowlisted synthetic loan read and
the exact credentials-only options.

Safety remains the shared baseline's trusted-fixture guard, **not** an OS
network sandbox. No hostile-code or packet-level isolation claim is made.

## Actual results

| Check | Result |
|---|---|
| Disposable accepted-lock installation | PASS, exit 0 |
| Initial page run | FAIL: 17 passed, 5 failed; fixture lacked admin context |
| Corrected fixture page run | PASS: 2 files, 22 tests |
| Existing ChecklistPanel, LoanActivityPanel and baseline contracts | PASS: 3 files, 26 tests, exit 0 |
| Source and disposable-copy preservation | PASS: 174/174 unchanged in each |
| Whitespace check | PASS |
| Full repository type check | Not rerun; baseline's 15 diagnostics remain unresolved |
| Browser screenshots/responsive observations | PASS, current fixture captured at 1440×900, 1024×768 and 390×844; no before/after candidate comparison exists |
| Native keyboard | Partial: Escape closed the real calendar and restored trigger focus; detailed tab sequence/AT tree not certified |
| Browser own-source console | One fixture-only `/favicon.ico` 404; no application exception observed. A transport-interception harness warning was logged; it did not represent a page request or app operation. |

The initial failure was corrected only in the new fixture by supplying the
inert context required by the unchanged shared header. No production repair,
assertion relaxation, snapshot replacement, or dependency change was made.
Both initial and final logs are retained. The final rerun reused the same
disposable installation after copying only the revised route test.

The regression command in that disposable copy was:

```sh
node node_modules/vitest/vitest.mjs run \
  --config verification/baseline/vitest.config.ts \
  client/src/components/loan/__tests__/ChecklistPanel.test.tsx \
  client/src/components/loan/__tests__/LoanActivityPanel.test.tsx \
  verification/baseline/contracts.test.tsx --reporter=verbose
```

The reused baseline hook contract invokes only its mocked transport; it does
not perform a real GitHub pull.

## Proof-plan accounting

| Required behavior | Evidence / limit |
|---|---|
| Every Closing field, defaults, Save, Discard | PASS: both fields; disabled initial state; snapshot restoration after a save; save checkbox true and false |
| Arbitrary dates | PASS: empty, malformed, typed weekend, past and future; no validation added |
| Actual picker | PASS in jsdom: enabled focus opens; month navigation; Saturday/Sunday disabled; weekday selection formats and closes; trigger focus restored; Escape closes; outside mousedown closes without restoring focus; Save disables and closes. Chromium screenshot confirms the real dialog/month grid is rendered. |
| Closing Date name | Current unnamed textbox asserted; naming exception deliberately not implemented |
| Keyboard/focus | Partial: jsdom checks Escape, trigger restoration and synthetic Enter; Chromium Escape closed the dialog and restored trigger focus. Complete browser Tab/Enter/Space sequence and assistive-technology tree remain UNVERIFIED. |
| 400ms dots | PASS: initial one dot, 399/400ms, two/three/one cycle |
| 4999/5000ms | PASS: no confirmation at 4999, confirmation at 5000 |
| Busy control | PASS: aria-disabled but not native disabled; remains focusable; repeat click creates no additional timers |
| Rebooking | PASS: old confirmation hidden; fresh completion timestamp replaces it |
| Mid-timer unmount | PASS: timeout and interval cleared; returning idle; route/sidebar consumer also exercised |
| Noon/midnight | PASS in fixed UTC: completion crosses noon and date-changing midnight correctly |
| Sidebar lifetime | PASS: selecting current item retains values; switching loses saved/draft fields and completed/in-progress booking; no sidebar URL change |
| Top-tab / route lifetime | PASS: actual Summary tab navigates to inert destination; cached return mounts default Closing with empty fields; other page contents intentionally not mounted |
| Loan change | PASS: actual loan-keyed providers recreate local state for A→B→A, two reads with cached return |
| Loan/query states | PASS in jsdom route fixture: deferred load, success, 404, 500, HTML, invalid JSON, null, cached-plus-error, missing ID fallback; exact key/options, no retry, no shell in failure. Browser uses only its seeded cached loan. |
| Reset independence | PASS: actual confirmed Reset Demo leaves mounted Closing editing/value/checkbox intact; booking completes at its original deadline across Reset Demo |
| No owned API/storage writes | PASS: component actions assert no fetch/setItem/removeItem/clear; route asserts no new fetch/setItem/removeItem attributable to Save/Book |
| No owned checklist/activity writes | PASS: actual provider-state probe remains identical across owned actions; reset-originated changes separated from Booking completion |
| Activity/checklist overlay captures | PASS: Checklist closed (base capture) and open; Activity closed (base capture) and open. Other shell/admin overlays were not exercised. |
| Pixel equivalence to another release | UNVERIFIED: this verification made no production candidate change or historical visual capture. Current screenshots were inspected only. |
| Current breakpoints and visible clipping | Browser captures exist at all three requested sizes. At 390×844, the fixed header/tab stage and the equal-column Closing Date row are visibly clipped horizontally; Booking text also wraps in its narrow column. These are captured current-state observations, not repaired or promoted to a regression. `document` scroll dimensions equal the viewport because the outer shell clips overflow. |
| Typography/font loading | CSS specifies Source Sans Pro, but the isolated entry intentionally omits external font downloads and CSP/network controls deny third-party sources. Rendered text therefore does not establish loaded-font parity. |
| Real booking/backend latency/performance | Not applicable to simulation; no speed claim |

## Browser captures and limitations

The user initially selected **Wait for the shared setup**, then asked for the
simplest option and noted that the app will never be a production app. A
preinstalled Chromium in a bounded page-only setup was used; no browser package
was installed and no production dependency or behavior change is implied.

The accepted reusable test harness is a jsdom/Node harness. To avoid competing
shared infrastructure, the browser pass used a page-owned static fixture, a
preinstalled Chromium binary, and a temporary local-only static server.

`python verification/closing-booking/run.py --prepare-browser` installs only the
accepted lock in a fresh disposable copy and builds the page-owned browser
entry with the accepted Vite. The build runs under the shared transport guard.
The original CSS is imported unchanged. The static entry never imports App:
it mounts the actual page and providers, seeds a synthetic query-cache record,
and denies application transports. CSP blocks external resources. Existing
external Google fonts are intentionally unavailable; captures therefore prove
only the fixed fallback-font state, not loaded-font parity. No font assets or
production configuration are replaced. Browser control used Chromium's existing
debugging protocol; no automation dependency was installed.

Chromium captures were made in `/tmp` for Closing read/edit/calendar and Booking
idle/in-progress/booked at all three sizes, plus Checklist and Activity open
states. The in-memory browser clock was fixed to 2026-10-14 16:00 UTC in the
main capture pass. Local static HTML, CSS, JS, and image requests were served
from `127.0.0.1`; the fixture denies window/fetch/XHR/WebSocket/EventSource/
sendBeacon, and its CSP disallows external connections and fonts. No real API
request occurred. The standalone server and browser were temporary and were
not added as workflows. The browser timer screenshots are state captures, not
an exact performance measurement; exact 4,999/5,000ms behavior is asserted by
the fake-timer tests.

The initial 1440px attempt checked the five-second boundary after screenshot
capture overhead and was therefore late (confirmation was already present).
Do not count it as a browser 4,999ms pass. The exact 4,999/5,000ms proof is the
fixed-clock Vitest fake-timer assertion. The separate browser interaction
verified a typed weekend value `10/17/2026` is saved as-is and Discard restores
the last saved value. The actual dialog, weekend-disabled buttons, and Escape
focus restoration were observed in the browser. No other browser keyboard
sequence is claimed.

No browser test sought baseline/candidate visual deltas: production files and
dependency contracts did not change. No repair is implied by the narrow-screen
clipping observation. Source/fixture hashes and screenshot dimensions are
recorded in `closing-booking-evidence/results.json`; the Chromium screenshots
were temporary validation output and are not retained in Git or deployed.

The full compiler check was not rerun; the accepted baseline's 15 existing
diagnostics remain unresolved and unrelated. The two downstream shared
type/currency and Closing Date naming tasks already cover those next steps, so
no duplicate follow-up tasks were proposed. The user also confirmed the
prototype will never be a production app; implementation and future checks
should remain proportionate without waiving explicit verification boundaries.
