# Partial Reset Demo — isolated browser verification

**Focused clarification: no candidate-specific responsive regression was reproduced.** A prior apparent baseline/candidate displacement came from mismatched sequences (baseline first opened at 390px then resized; candidate opened at 1440px then resized). With identical viewport-first and resize-while-open sequences, both builds behave the same. The `LoanHeader.tsx` bottom-toolbar positioning effect is stale after resize on both builds; this is shared behavior, not a regression from the Reset Demo change. No source files were changed and no neighboring repair was attempted.

## Isolation and method

- Read `verification/partial-reset/README.md`; tested only disposable fixtures at `http://localhost:3001` (baseline) and `http://localhost:3002` (candidate), starting from `/verification/partial-reset/index.html` and its fixture redirect to `/loans/one/documents`.
- Browser requests were allow-listed to these two localhost origins; all other origins were aborted. No live app, port 5000, real endpoint, real PDF, database, or source edits were involved.
- Reset flows and `?queue`/`?queue&timer` scenarios were exercised in the initial isolated pass. This clarification uses paired fresh baseline/candidate contexts. Unit/type checks were not rerun.

## Paired viewport comparison

For each **fresh-open** comparison, the viewport was set before navigating to the fixture URL; the page settled, `toolbar-checklist` was clicked on both builds, and geometry was measured after a 1.1s settle. Fresh-open panels matched on both builds:

| Viewport | Baseline = Candidate panel rect (x, y, w, h) | Inner list (top / scrollHeight / clientHeight) |
|---|---:|---:|
| 1440×900 | (519.984, 226, 420, 630) | 0 / 978 / 532 |
| 1024×768 | (311.984, 186.406, 420, 537.594) | 0 / 978 / 440 |
| 390×844 | (26, 209.203, 358, 590.797) | 0 / 1138 / 493 |

At every fresh-open width both builds showed the same exact heading `Loan Checklist`, `33% Complete`, and 15-task DOM order: Eligibility & Scope; TC/TN; Loan Decision; Decision Letter; Loan Estimate; Early Disclosures; Title Work; Appraisal Evaluation; Rate Lock; Closing Disclosure; Closing Package; Wires; Pre-Closing Review; Post Closing Review; Loan Certification. Typography/color matched: panel Source Sans Pro 16px/24px, `rgb(39, 52, 52)` text, white background; heading Source Sans Pro 600, 24px/32px. Focus after opening was `toolbar-checklist` on both.

Measured first task geometry also matched at each width: 1440 `[537.984,324,369,64]`; 1024 `[329.984,284.406,369,64]`; 390 `[44,307.203,307,84]`. The scrollable list can be scrolled to lower tasks; prior baseline 1440 bottom-scroll showed Closing Disclosure, Closing Package, Wires, reviews, and Loan Certification. At 390 the whole checklist panel is visible and has a scrollable task list.

### Resize-while-open sequence (separate from fresh-open)

Starting with both checklists open at 1440×900 and then resizing both in the same sequence produced matching stale positions: at 1024×768 both panels were `[519.984,186.406,420,537.594]`; at 390×844 both were `[550.984,209.203,358,590.797]`, outside the viewport. Text, style, 33% state and focus matched. This reproduces stale positioning on resize on both baseline and candidate, consistent with the effect depending on checklist-open state but not resize. It explains the earlier apparent candidate issue: that comparison mixed baseline’s open-at-390-then-resize path (x=−5 at 1024) with candidate’s open-at-1440-then-resize path (x≈520 at 1024). The same open-at-1440 resize sequence now confirms both builds yield x≈520 at 1024 and x≈551 at 390. Fresh-open at those sizes matches instead; therefore the prior x difference is sequence-related, not evidence of a Reset Demo regression.

## Explicit cancel and success comparisons

For both baseline and candidate at **each** fresh-open viewport (1440×900, 1024×768, 390×844), `resetFixture.confirm(false)` was explicitly set before clicking Reset Demo. Both stayed at 33% Complete, retained seeded loan-one package/disclosure/activity/checklist values, showed no toast, and focus moved to `button-reset-demo`. Then, on the same still-seeded pages, `confirm(true)` followed by Reset Demo produced the same result on both: 13% Complete; package key absent; disclosure records empty (reset tokens differ by fixture as expected); activity `[]`; Loan Decision, Closing Disclosure and Closing Package not-started; Eligibility & Scope and TC/TN remain completed; no success toast. The measured post-reset checklist panel geometry remained the corresponding viewport’s fresh-open geometry. Thus successful and cancelled states match between baseline and candidate at all three viewport sizes.

## Other candidate behavior verified in the initial isolated pass

- Package-removal denial (`deny("loan-closing-package:one")`) cleared nothing. Exact toast: `Demo reset incomplete` — `Cleared: none. Not cleared: Closing Package, Closing Disclosure, Checklist, Loan Activity. Enable browser storage and try Reset Demo again.`
- Disclosure-write denial (`deny(null)` then `deny("loan-closing-disclosures:one")`) cleared package + its document checklist task only; Loan Decision, Closing Disclosure and activity remained; progress was 27%. Exact toast: `Demo reset incomplete` — `Cleared: Closing Package, Document checklist tasks. Not cleared: Closing Disclosure, Checklist, Loan Activity. Enable browser storage and try Reset Demo again.` Removing denial and retrying cleared the remaining loan-one decision/documents/activity; loan-two data stayed intact.
- In `?queue&timer`, Reset Demo became disabled while queued and the fixture was not fully cleared early. After the five-second package timer expired, `release(false)` completed the reset and the old timer did not recreate loan-one package data.
- In a separate fresh `?queue`, Reset Demo disabled while pending; `release(true)` yielded incomplete-reset feedback. Package/task were cleared while Closing Disclosure, checklist and activity were reported not cleared, with the same partial-reset toast above.
- After successful reset, actual Closing Documents showed `No Closing Disclosures have been generated` and `No Closing Packages have been generated`; View/Deliver were disabled. No PDF was opened.

## Evidence limits and remaining scope

Screenshot references from the initial pass: baseline checklist `s4p07o`, bottom-scroll `51kozm`, candidate checklist `330ro6`, candidate cancel `it4mi7`, package-denial toast `ctns5d`, disclosure-denial toast `jmv4kf`, queued-disabled `b4fz5p`, queued-rejection `y3w3x6`, candidate 1024 `gajks1`, candidate 390 `ock55r`, baseline 390 `ic3anu`, baseline 1024 `x0r9ng`, candidate post-reset Closing Disclosure `qbo9wc` and Closing Package `bs4hqn`. The new controlled paired measurements are retained in the browser action observations; automatic screenshot summaries mostly showed other active pages due the tool’s three-page capture limit.

Raw screenshot-byte comparison was unavailable: the tool exposed rendered screenshots/IDs but no raw image export. Outer geometry, header/first-task geometry, typography/color, task order, focus, and scroll metrics were compared; exhaustive computed styles for every child were not collected. **Loan-switch cancellation (`resetFixture.navigate("two")`) was not tested in the browser pass**; it is intentionally not repeated in this focused clarification. No source changes were made.
