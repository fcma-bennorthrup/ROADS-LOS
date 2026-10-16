# Isolated Origination fixture — browser evidence

**Scope:** `http://127.0.0.1:4317/loans/synthetic-a/origination` only (fixture served from `/tmp/origination-verification-yrs_tm2d/copy`). No live App or port 5000 was used. No application code was changed.

**Browser setup:** disposable Playwright context, UTC timezone, direct fixture URL. A context-wide request route continued only `127.0.0.1:4317` or `localhost:4317` requests and aborted all others. The recorded blocked-request list was empty. Therefore no external/font request was attempted and blocked; the effect of a blocked remote font is unverified. Fixture-provided fixed Date and fetch/XHR/window.open stubs were left intact. No admin/API request was made. The PDF control was exercised only through the fixture `window.__pdfCalls` recorder; no PDF document was opened or fetched.

## Result summary

### Completed / observed

- Captured all five sidebar sections at 1440×900, 1024×768, and 390×844 (screenshot IDs below).
- Borrower: entered First Name `Riley` and native DOB `1981-06-23`; both values were accepted. Switching to Jane and back preserved Richard’s unsaved draft. Save returned to read-only with the edited values, but leaving Borrower Information and re-entering showed the fixture originals (`Richard`, `04/12/1975`). This verifies the requested reset-on-re-entry behavior; no persistence claim is made.
- Borrower content below the fold was scrolled: Declarations and the lower borrower section content were visible in the snapshot; at 1440×900 the screenshot shows mid-Declarations.
- Loan Details: saved `Synthetic details draft: amber-owl-42 / arbitrary text`; it appeared in read-only view. A second draft (`Synthetic discarded draft: cobalt-fox-99`) was discarded, and the prior saved string remained.
- Collateral: Split Appraisal while editing created Evaluation 2 while Evaluation 1 stayed selected. After changing Evaluation 1 Estimated Value to `425000`, deleting Evaluation 2 removed its tab/control and left `425000` visible in read-only view. The Evaluation 1 draft was not separately saved.
- Pricing: selected nondefault `4371 - 15 year fixed` (180 months). Lock Rate opened the modal while product editing was unsaved; after confirming the fixture lock, the product showed 4371, Final Rate 7.025%, and a lock icon. The date was editable only after locking. Entered `2026-12-15`; Cancel then reopen retained that date. No Update Rate Lock was applied.
- Escape while the Edit Rate Lock dialog/calendar was open dismissed the dialog; the active element after dismissal was `BODY`, not the triggering button. Reopening retained `2026-12-15`.
- Fees: added Appraisal Fee twice with LE `$325.50` and CD `$75.25`. The fixed-time fixture gave both rows id `1791993600000`; React logged a duplicate-key warning. Save Fee Table left the row count at two. Clicking the first row’s delete control removed both colliding rows.
- PDF: fixture recorded exactly:
  `["http://127.0.0.1:4317/@fs/tmp/origination-verification-yrs_tm2d/copy/attached_assets/Rate_Lock_Letter_-_Consumer_Redacted_1777397784766.pdf", "_blank", "noopener,noreferrer"]`
  No actual PDF was opened or fetched.
- Keyboard: one Tab from the Fees navigation button focused `select-fee-type`; Enter opened the menu. Escape did **not** close the menu in the observed attempt (focus remained on the selector). No fee was selected or added during this keyboard check.
- Clicking the fixed Key Dates toolbar item marked it active but did not display an overlay or date controls in the observed state.

### Failures / notable behavior

1. **Fixed-time fee ID collision:** the two fee rows shared id/testid `1791993600000` and emitted a React duplicate-key warning. Deleting one row removed both entries. This is a confirmed UI collision/deletion defect.
2. **Responsive clipping:** at 390×844, the desktop-width header, tabs, 240px sidebar, content panes, and toolbar overflow horizontally. Borrower, Loan Details, Collateral, Fees, and Product & Pricing are all clipped; Pricing fields/adjustments are crowded or overlap. At 1024×768, Product & Pricing also shows crowded/overlapping rate-breakdown and field labels; Collateral’s lower evaluation fields are under the fixed toolbar until scrolling. Loan Details and Fees fit more cleanly at 1024×768.
3. **Pricing state across section navigation:** after the confirmed 4371 lock, Product & Pricing showed 4371/7.025%. After navigating through other sections and returning, it showed product 4370/6.775% while still displaying the locked state and “Update Rate Lock.” This state change was observed; whether persistence across section remount is an intended fixture reset is not specified.
4. **Keyboard dismissal/focus:** Escape did not close the fee menu. Escape did close the rate-lock dialog, but focus returned to BODY.
5. **Date calendar presentation:** after entering `2026-12-15`, the text field showed that value while the calendar overlay showed October 2026 and partially overlapped the modal footer. The typed date was nevertheless retained after Cancel/reopen.

### Verification gaps

- The final date was intentionally not committed with Update Rate Lock.
- The split Evaluation 1 value was left as the observed draft/read-only value; no additional save/re-entry persistence check was made.
- No browser request to an external font host occurred, so remote-font blocking appearance cannot be assessed.
- Existing DOM test results (49 passing, as supplied in the request) were not re-run by this browser session.

## Section screenshot inventory

Screenshot IDs refer to the automatic browser observations; no large screenshots were copied into Git.

| Section | 1440×900 | 1024×768 | 390×844 |
|---|---|---|---|
| Borrower Information | `xqfyrz` (re-entry/reset), `xikqax` (below-fold declarations) | `a8ktgc` | `cdyk1k` |
| Loan Details | `jf6ge4` | `lgchhx` | `kon90l` |
| Collateral | `9vil9f` | `m4n87d` | `bne3e2` |
| Product & Pricing | `3tx0bf` | `7nkc6e` | `bao85n` |
| Fees | `a78uy2` | `uzejok` | `w7c515` |

Additional interaction evidence: borrower edited `xqloy8`/saved `ylpl2b`; details edit/save `mtx57w`/`nis3sd` and discard `hqq7ix`; collateral editing/split/deletion `wlacr4`/`ijb60y`/`7b7rwm`; fee duplicate rows `m543q6`, collision deletion `e3a0t3`; rate-lock/date modal `e7plob`/`m3krq8`/`xwufsh`/`f89mur`; Escape focus result `4tr8lz`; PDF request record `coclz9`; keyboard menu evidence `r7efa8`/`zh3hal`.

## Reproduction helper

`capture-sections.mjs` is a small, separately stored capture helper. It uses the same exact-origin allowlist, UTC context, and writes generated screenshots only under `/tmp/origination-evidence/`. `journey-replay.mjs` records a UI-only replay for the bounded interactions; it was not executed by this verification session.
