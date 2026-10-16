# Rate-lock date cancellation

## Approved difference

The user explicitly approved **discard-on-close**, then accepted the current
local code as the isolated comparison baseline, including the existing reset
and logging changes and the previously accepted dependency lock.

Before: editing the expiration date immediately replaces component-owned date
state; Cancel, X, Escape and outside dismissal retain the unconfirmed value.

After: the dialog edits a draft. Opening seeds it from the confirmed date;
whole-dialog dismissal discards it. Lock Rate / Update Rate Lock commits it.
Closing only the calendar retains the draft. Reset still closes the dialog,
unlocks pricing and restores the default date; it also clears the draft.

Only ProductPricingContent production code changed. No JSX structure, styles,
labels, date validation, shared picker, persistence, activity/checklist policy,
product calculations, PDF behavior or dependency bytes changed. The date is
still local to the mounted section; the separate pricing-persistence proposal
is not implemented. Blank, invalid and manually typed weekend dates remain
accepted on confirmation. The initial date remains disabled.

## Isolated method and reproducibility

- `python verification/date-cancellation/run.py`: disposable baseline/candidate
  copies, accepted lock installed with `npm ci --ignore-scripts --no-audit
  --no-fund`, environment allowlist without secrets, disposable HOME/cache,
  UTC, fixed clock `2026-10-14T16:00:00Z`, synthetic loan props and storage.
- Baseline Pricing SHA-256:
  `9593626b6b5c5e17156808745ff8d3aa6345d7d5198a8e9a95d6146e9fd1eccf`.
  A local Git object supplies those hash-verified bytes only; there is no remote
  fetch or workspace restoration. All other application bytes are identical
  across copies. The runner pins accepted deviations from the historical
  manifest and refuses unrelated baseline drift.
- Reuses baseline network guard, setup, Origination provider fixtures, CSS,
  assets and inert browser admin fixture; shared harness files are unchanged.
- `node verification/date-cancellation/browser.mjs <temporary-directory>`
  starts only two disposable Vite fixture servers and a disposable Chromium.
  It never mounts App or starts the application server. Browser requests
  outside the two local fixture origins are blocked. Both fixture servers and
  Chromium are stopped afterward. The live workflow was deliberately not
  restarted or visited.
- No GitHub/financial endpoint, real document delivery, database, secret-value
  inspection, publishing, library change or production operation.

## Actual results

The initial runner passed installation and both suites: **29/29 tests per
copy**, comprising 22 new parameterized date checks and seven unchanged
existing Pricing workflow cases. After adding explicit disabled-weekend and
standalone-picker Escape assertions, the focused date suite passed **23/23
per copy**. Existing production/test bytes were not changed after the passing
seven-case regression run. Final effective coverage is **30 cases per copy**.
No desired-future snapshots replace baseline assertions: the new fixtures
explicitly distinguish retained baseline values from discarded candidate values.

| Contract | Result |
|---|---|
| Cancel, X, dialog Escape, outside pointer dismissal | Each tested with blank, invalid, weekend and valid weekday text; reopen retains only on baseline and restores confirmed date on candidate |
| Confirmation/update | Each text case commits verbatim, survives reopen, then becomes the restored value after a later cancelled edit |
| Calendar selection | Picked weekday updates draft and restores calendar-trigger focus; cancel/reopen differs only as approved |
| Calendar-only outside dismissal | Calendar closes, dialog and draft stay intact |
| Weekend selection | Saturday button remains disabled; manually typed weekends remain allowed |
| Standalone picker Escape | Calendar closes, value unchanged, no onChange callback, icon focus restored |
| Picker Escape inside dialog | Real Chromium shows Escape closes **both** layers on baseline and candidate; neither introduces a new two-stage Escape policy |
| Reset while dialog open | Draft discarded, dialog closes, reopened initial date is default and disabled |
| Existing workflows | Seven original cases pass: rate-lock/checklist, Loan Estimate re-fire and status handling, activity/toast, reset, remount and TRID behavior |

## Browser visual and focus comparison

At **1440×900**, **1024×768**, and **390×844**, actual content dimensions were
asserted via `innerWidth/innerHeight`. Baseline/candidate were compared for:
the Pricing page, initial disabled-date modal, editable modal, open calendar,
and reopened confirmed-date modal.

All **15 paired PNG captures were byte-identical**. For each pair, element
order/text, values, disabled state, bounding boxes, computed font family/size/
weight, colors, background, padding, margin, overflow and border radius also
matched exactly. No responsive breakpoint was added or changed. Escape's
modal/calendar presence and active-element test ID matched at every viewport.
The candidate mobile calendar screenshot was visually inspected.

Evidence from this run is in `/tmp/date-cancellation-k4b9glk_/`: original
`results.json`, baseline/candidate logs, focused `*-dates-final.log`, and
`browser/results.json` with 30 exported PNGs. Temporary evidence is not
guaranteed durable; the committed scripts reproduce it without storing large
generated files in Git.

## Limits and unchanged issues

- The open calendar is clipped by the existing modal overflow; the same
  clipping appears in both versions. It was not repaired under this approval.
- Escape from the embedded calendar closes the whole dialog, unlike the
  standalone picker. Focus after whole-dialog Escape has no test ID on both
  versions. This is observed equivalence, not an accessibility certification.
- External fonts are blocked equally; this is not remote-font availability
  certification. Pixel claims apply to the fixed isolated environment only.
- Unit tests perform picked-day selection because the unchanged modal clipping
  limits access to calendar days. Browser tests exercise actual Escape and
  compare calendar rendering; they do not claim browser day-selection success.
- No whole-application type/build, performance or live-environment claim.
  Unaffected queries, calculations, storage lifetimes and PDF code are preserved
  by unchanged source, not a new exhaustive full-route certification.
