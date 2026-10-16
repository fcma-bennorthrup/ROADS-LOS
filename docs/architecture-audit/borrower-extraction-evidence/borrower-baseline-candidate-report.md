# Borrower baseline/candidate equivalence — disposable fixture

  **Verdict: PASS for rendered DOM/text/styles/geometry and tested interactions.** Only the disposable Vite fixture at http://127.0.0.1:4317 was used. One UTC browser context, fresh storage; cookies and same-origin local/session storage cleared before candidate. Fixture Date was frozen at 2026-10-14. Requests were allowed only to origin http://127.0.0.1:4317; all other hosts, including font hosts, were aborted. No live app, port 5000, App.tsx, APIs, GitHub, external financial endpoints, project dependencies, or source files were accessed/changed.

  ## Actual pass/fail matrix

  | Area | Baseline | Candidate | Result |
  |---|---|---|---|
  | Independent Richard/Jane drafts while switching tabs | Both names and DOBs retained; headings unchanged | Same | PASS |
  | Native date entry | input-dob accepted 2000-02-29 for both borrowers | Same | PASS |
  | Save, Edit, temporary edit, Discard | Saved draft values restored; headings unchanged | Same | PASS |
  | Fixture toggle off/on | Content unmounted; saves reset to Richard/1975-04-12 and Jane/1978-09-03 | Same | PASS |
  | Static questionnaire DOM identity across edit/tab changes | Stored declarations-parent node stayed identical | Same | PASS |
  | Questionnaire radio/checkboxes | 68/68 disabled; Other Hispanic text retains $ prefix | 68/68 disabled; same | PASS |
  | Desktop keyboard/dropdown | Escape leaves menu open; Tab focuses Alabama then Alaska; Enter on State opens; toggle closes; KY unchanged | Same | PASS (same behavior) |
  | Mobile keyboard/dropdown | Enter opens; Tab focuses Alabama; Enter selects AL and closes; toggle reopens; Discard restores KY | Same | PASS (same behavior) |
  | Full borrower subtree fingerprints | 72 states | 72 states | 72/72 exact SHA-256 matches; 0 missing/extra/different |

  Fingerprints include exact borrower-content text, node structure/attributes, form values and checked/disabled flags, every descendant computed CSS property/value, bounding rectangles, actual innerWidth/innerHeight, document/body scroll dimensions, and scroll offsets. Each borrower/mode state was captured at upper/middle/lower positions.

  Viewport coverage (12 captures per size: 2 borrowers × read/edit × upper/middle/lower):
  1440×900: 12 captures
1024×768: 12 captures
390×844: 12 captures
767×844: 12 captures
768×844: 12 captures
1023×768: 12 captures

  Clipping/overflow was not normalized. At 390px questionnaire text wraps into narrow columns and horizontally overflows in both versions; hashes match. The 767/768 and 1023/1024 edges were included.

  ## Limits / qualifications

  - **Fonts:** existing Google-font link unchanged, but the font request was blocked by the mandated network policy (net::ERR_FAILED). No font-loaded or font-metric certification is claimed; equivalence is under the blocked-font condition.
  - **Pixels:** browser observations supplied visual screenshots but not screenshot bytes for hashing; byte-for-byte pixel comparison is unverified. DOM/style/rect fingerprints are exact and all matched.
  - Unit/route tests were not rerun per instruction. No real borrower operation or external request occurred.

  Screenshot observation IDs (not stored in docs): baseline desktop dga7q2 / candidate desktop 0n5v7v; baseline mobile 5ncapc / candidate mobile qw1piu; extra mobile clipping baseline 36xriz / candidate mp3v9a.

  Files: borrower-baseline-candidate-report.md and reproduce-borrower-equivalence.mjs. No source changes.
  