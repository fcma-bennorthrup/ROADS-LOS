# Synthetic Summary browser characterization

**Scope:** only `http://127.0.0.1:4179/loans/synthetic` and its documented fixture query modes. No live application, external URL, real mailto target, system clipboard, sync action, reset confirmation, production edit, or dependency install was used. Fresh browser context: `en-US`, UTC, service workers blocked; requests outside `http://127.0.0.1:4179` were aborted. Fixture clock: `2026-10-14T16:00:00.000Z`.

## Results

- All 17 literal rows matched the expected IDs, order, labels, and values in `fixtures.ts`. The independent displayed amount `$111.11`, Total Loan Amount `$333.33`, Amount Requested `$222.22`, and Financed Fees `$4.50` remained distinct.
- Borrowers appeared Beta then Alpha; Alpha was marked primary. The only email links were `mailto:beta@example.invalid` and `mailto:alpha@example.invalid`; neither was opened.
- `?state=pending` displayed “Loading loan details...”; `?state=error` displayed “Failed to load loan data”; `?state=empty` (null response) displayed the same failure state; `?borrowers=zero` rendered the loan summary with the borrower heading but no borrower cards.
- Default clipboard: focused native Beta button + Enter copied exactly `beta@example.invalid`; focused native Alpha button + Space copied exactly `alpha@example.invalid`. Each showed the real “Email copied to clipboard” toast; only one toast remained after replacement.
- `?clipboard=reject` attempted Beta and showed “Failed to copy email”. With `?clipboard=unavailable`, `navigator.clipboard` was undefined; the click showed the same failure toast and recorded no copied string.
- `?clipboard=deferred`: Beta then Alpha attempts were recorded. Rejecting pending entry 2 before resolving entry 1 produced the failure toast then replaced it with one success toast. The fixture’s controller array retained both entries after settlement.
- Each fixture page’s evidence recorded only `{url:"/api/loans/synthetic", credentials:"include"}`. The final browser resource list was only `fixture.css`, `fixture.js`, and `favicon.ico` on the fixture origin; there were no non-fixture resources. The context route guard aborted requests to all other origins.

## Layout and overlays

Raw measurements: `/tmp/summary-browser-evidence/measurements.json`.

| Viewport | Observed Summary grid / scroll |
|---|---|
| 1440×900 | 4 × 318px, 24px gap; main 655/655px client/content |
| 1280×900 | 4 × 278px, 24px gap; main 655/655px |
| 1279×900 | 2 × 579.5px, 24px gap; main 655/655px |
| 1024×768 | 2 × 444.5px; main 523/618px, 95px internal scroll range |
| 768×900 | 2 × 316.5px, 24px gap; main 640/642px |
| 767×900 | 1 × 656px; main 640/922px |
| 390×844 | 1 × 279px; main 513/986px |

At 1024×768 lower rows initially sit beneath the fixed toolbar, but scrolling the internal content area to its bottom exposes all 17 rows. At 390px, borrower email/phone content overlaps and clips, and header/tab navigation is horizontally scrollable. Header/tab horizontal scrolling is also visible at 767/768px. Opening Activity at 767/768 further narrows the main area and visibly clips/overlaps borrower content. Checklist fits within the measured viewport but underlying content visibly bleeds through its panel at the observed widths.

Activity opened from `button-sidebar-toggle`; focus stayed on that trigger. Close and reopen both worked at desktop, and close worked at the 767/768/1279 edges. Checklist opened with focus remaining on its trigger; its close button dismissed it, after which focus was on `BODY`. More Options focus remained on its trigger; Escape did not dismiss the menu, but a safe outside click did (focus then moved to `BODY`). No Reset Demo, task, admin, or sync operation was activated.

Computed CSS declares `"Source Sans Pro", sans-serif`; CSP explicitly has `font-src 'none'`. `document.fonts.size` was 0. The 1280 canvas measurement for `PITI 10.00%` was 87.776px in the fallback stack. These are font-blocked fallback measurements only; no loaded Google-font claim is made.

## Screenshot persistence limitation

The integrated browser returned visual captures as observation IDs below, but did not expose their PNG bytes or a filesystem screenshot API. No PNGs were written under `/tmp/summary-browser-evidence`; the reusable script saves those PNG paths when run in an environment with the existing Playwright package. This is an unfulfilled artifact requirement, not an application failure.

Requested PNG path → integrated browser observation:

- `/tmp/summary-browser-evidence/summary-1440x900.png` → `eu2k5s`
- `/tmp/summary-browser-evidence/summary-1024x768.png` → `yy9dcf` (top), `bdv57a` (scrolled)
- `/tmp/summary-browser-evidence/summary-390x844.png` → `1os097`
- `/tmp/summary-browser-evidence/summary-767x900.png` → `g85gb2`
- `/tmp/summary-browser-evidence/summary-768x900.png` → `wa5o4z`
- `/tmp/summary-browser-evidence/summary-1279x900.png` → `6ctjxt`
- `/tmp/summary-browser-evidence/summary-1280x900.png` → `nsgq43`

Additional overlay evidence: Activity at 767 `yreyx5`, Checklist at 767 `rv1grc`, Activity at 768 `1qorm6`, Checklist at 768 `zqn1bz`, Checklist at 1279 `pmranh`, More Options at 1279 `cmps4l`.

## Verification caveats

This was a browser characterization pass, not a repair. The `?state=empty` response is rendered as a load failure rather than a distinct empty view. PNG persistence was unavailable as described above. Google-font loading and performance were not measured or claimed.
