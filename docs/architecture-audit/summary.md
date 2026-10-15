# Summary architecture audit

## Status, source and integrity

Audit only. No application, configuration, dependency, test or asset changes are authorized or implemented. This report is the only owned deliverable.

Source of truth: the current local project, checked against `baseline.md`, `coverage.md` and `shared.md`. All **174 baseline files matched** their recorded SHA-256 hashes at review entry. No missing/mismatched file blocked the review. Baseline aggregate: `ab0f85c1707e2b9355037c78a4d365dddba7e0019bf5559bb40659facabbee92`. No GitHub calls, branch changes or remote substitutions were made.

The Summary page is relatively small and already separates its two content sections from the page's data-loading responsibility. No measured performance bottleneck or incorrect financial calculation was established. Its principal local gaps are missing direct regression coverage and an unnamed icon-only clipboard button. Shared contract/formatting duplication is already covered by SHARED-001, not a competing recommendation here.

All recommendations below are **Awaiting user approval**. Fixing an observable defect, including accessibility behavior, requires an explicit exception to the exact-behavior preservation constraint.

## Reachability and file coverage

| File / boundary | Coverage and responsibility |
|---|---|
| `client/src/pages/loan-summary.tsx:1–118` | Entire owned page: query, formatting, loading/error branches, header mapping, content layout and shared panels. |
| `client/src/components/loan/BorrowerCards.tsx:1–150` | Entire owned section, nested BorrowerCard, primary badge, contact rendering, email link and asynchronous clipboard handling. |
| `client/src/components/loan/SummaryRatios.tsx:1–113` | Entire owned section, data interface, KeyValueRow, DataColumn, all 17 displayed rows and breakpoint layout. |
| `client/src/App.tsx:22–71`, `client/src/main.tsx` | Route and provider composition; shared lead owns implementation. `/loans/:id` mounts Summary; `/` redirects to `/loans/1`. No nested Summary routes. |
| `client/src/lib/queryClient.ts:3–57`, `shared/schema.ts:20–65` | Request construction, cache/retry policy, loan/borrower types; shared ownership. Types are not runtime response validation. |
| `server/routes.ts:190–201`, `server/storage.ts:4–24,105–116` | Loan endpoint and active in-memory storage boundary. Database adapter is not used by this read path. |
| `client/src/components/loan/LoanHeader.tsx:22–558` | Stage display, metadata, tabs, menu/admin dialog access, toolbar and checklist placement; shared ownership. |
| `client/src/components/loan/LoanActivityPanel.tsx:1–238`, `client/src/contexts/loan-activity-context.tsx:46–176` | Open/close, filter/sort, persisted runtime activity and loan-keyed provider lifetime; shared ownership. |
| `client/src/components/loan/ChecklistPanel.tsx:1–185`, `ChecklistActionTimeline.tsx`, `client/src/contexts/checklist-context.tsx:159–436` | Expand/collapse, progress, reset confirmation, action statuses and document-history reset interface. Shared lead owns recommendations; Documents owns history/progress internals. |
| `client/src/hooks/use-toast.ts`, `client/src/components/ui/toaster.tsx`, `toast.tsx`, `avatar.tsx`, `tooltip.tsx` | Clipboard feedback reaches the global toaster; header avatars and global providers use shared wrappers. Existing timing, placement, focus and styling remain baseline. |
| `client/src/components/GitHubSyncPanel.tsx`, `ConflictResolutionDialog.tsx`, `client/src/hooks/use-github-sync.ts`, `client/src/contexts/github-sync-context.ts`, `client/src/lib/github-response.ts` | Shared admin surface reachable through Summary's header; imported globally even when not visible. Shared report owns its server/transitive sync audit. No real sync action was exercised. |
| `client/src/index.css`, `styles/design-tokens.css`, `lib/design-tokens.ts`, `tailwind.config.ts`, `client/index.html` | Global semantic styling, responsive utilities and external font dependency; no token or CSS normalization proposed. |
| Existing checklist/activity tests, `server/__tests__/storage.test.ts`, `client/src/lib/__tests__/loan-activity.test.ts`, `client/src/test/setup.ts`, `vitest.config.ts` | Adjacent coverage, not direct Summary verification. No direct Summary/BorrowerCards/SummaryRatios test was located by filename and test-source reference search. |

Relative component names within rows refer to the directory of the preceding full component path. The three Summary-owned files all appear in the lead manifest; no additional owned module was discovered. Summary has no direct PDF/image import and no document viewer. Header activity buttons that look like document links are shared placeholders, not evidence that Summary opens PDFs.

## Current behavior and interaction inventory

### Data lifecycle and edge states

1. `loan-summary.tsx:19–24` reads the route ID, falling back to `"1"` if absent. Query key is `["/api/loans", loanId]`; the default query function joins segments and fetches with credentials. Infinite stale time, disabled focus refresh, and disabled retries are shared policy. Do not add automatic reload/retry during a refactor.
2. `server/routes.ts:190–201` obtains a loan and then its borrowers, returning the combined object, 404 for a missing loan, or 500 on a thrown error. `MemStorage` owns the active response data; Summary issues no loan mutation. Array order comes from storage; the page does not sort primary borrowers first.
3. `loan-summary.tsx:26–41` replaces the whole page with centered **Loading loan details...** on the page background. Header, borrower sections, toolbar and activity panel are not mounted in this branch, though global App providers remain.
4. `:43–58` similarly shows **Failed to load loan data** for query error or absent data. It does not distinguish 404, 500 or network failure, show raw server error details, offer retry, or route to Not Found. An error with cached data still takes this error branch.
5. Success renders a viewport-height, overflow-hidden flex shell, an internally scrolling main area, and a fixed full-width bottom toolbar (`:60–116`). Main has tokenized top/gap spacing and a literal 60px bottom reserve. Activity sits beside the page rather than replacing the main section.
6. There is no runtime validation of response shape here. An empty borrowers array yields the section heading and no cards; missing/non-array borrowers would fail at `.map`, rather than use a designed empty state. These are static consequences of malformed fixtures, **not observed failures of the current server's valid seeded response**.
7. No page-specific effects, subscription, edit form, save/cancel workflow or loan persistence exists. Shared provider state and clipboard work are the interactive state boundaries.

### Borrower Contact Information

Evidence: `BorrowerCards.tsx:9–19,21–121,124–150`.

- Renders one card per borrower, in input order, keyed by ID. Names are plain text; `isPrimary` controls the **Primary Borrower** badge independently for each row. Zero or multiple primary flags are not normalized.
- Cards use a horizontal flex row without a wrap/breakpoint class. Each card is `flex-1 min-w-0`; contact fields stay side-by-side, and the phone column is 104px wide. Long content/many cards may pressure layout on narrow screens; this is an unmeasured risk, not a reproduced overflow defect or permission to redesign.
- The displayed email links to the same `mailto:` value. Phone is plain text, not a `tel:` link. No borrower editing or contact validation occurs.
- Copy activates `navigator.clipboard.writeText` with that card's email. Success emits **Email copied to clipboard**; rejected/unavailable clipboard emits **Failed to copy email**, destructive variant. There is no loading indicator or disabled/in-flight guard, and completion order follows promise resolution.
- The icon-only button has a test ID but no explicit accessible name. Native button activation remains available; assistive naming is a separate issue below.
- Clipboard feedback uses the global toast store, whose limit is one toast (`use-toast.ts:8–9,74–80`). Do not add success badges, delays, extra toasts or new copy targets in a preservation-only change.

### Summary & Ratios

Evidence: `loan-summary.tsx:13–16,88–107`; `SummaryRatios.tsx:61–113`.

| Column | Labels in exact source order | Transformation |
|---|---|---|
| Ratios | PITI; DTI; L/CV; PWE CB Score | First three append `%` to supplied strings; score uses `String`. |
| Reserves | Rule of XX; Total CV; Cash Reserves | Rule uses nullish fallback `--`, not a falsy fallback; monetary strings already formatted by the page. |
| Amounts | Total Loan Amount; Amount Requested; Financed Fees; Taxes & Insurance; Cash to Close | Page formats all five, with no summing or recalculation. |
| Product | Product; Final Rate; APR; Principal & Interest; Total Monthly Payment | Product is direct; Final Rate gets `%` in the page; APR gets `%` in the section; last two are page-formatted currency. |

The page also formats header display amount separately from total loan amount and amount requested. These values must not be unified merely because they sound similar.

Currency uses `parseFloat`, US locale with exactly two fractional digits, and a manually prepended `$`. Preserve its current handling of zero, negatives, numeric prefixes and invalid strings unless an explicit outcome change is approved. For example, changing to currency-style Intl formatting can change negative-symbol placement. Percent strings are not parsed, rounded or calculated; trailing zeroes survive. Empty Rule of XX remains empty while null/undefined becomes `--`.

Grid classes produce one column by default, two at `md`, four at `xl`. Each logical DataColumn stays a unit, with rows in current source order. This is styled `div` content, not a semantic table. Do not introduce a table, change breakpoints, reorder rows or “correct” calculations during extraction.

### Shared shell, panels and actions as consumed by Summary

- Header defaults `activeTab` to Summary; navigation uses the current pathname's loan ID and the shared tab route map (`LoanHeader.tsx:63–99`). All six loan tabs are reachable. Summary does not supply a tab-change callback.
- The eight-stage stepper uses a fixed default current index of 2, not `loan.stage` (`:211–268`). Header metadata and amount use page props. ECOA always renders; TRID visibility depends on the Loan Estimate checklist being in re-fire (`:86–88,340–367`). Making stage data-driven would change behavior.
- Menu/messages and most toolbar controls are presentational placeholders. Only Checklist has the toolbar handler (`:445–480`). Existing Errors indicator does not mean validation is running.
- More Options toggles its menu, dismisses through an outside-mousedown listener with cleanup, and opens GitHub Sync (`:484–558`). Shared admin operations and force paths remain untouched; no live verification was attempted.
- Activity toggle/close is context-owned. Open panel is 280px wide. Search trims/lowercases and matches title or description; sort defaults newest and operates on a copied array; empty results show **No results found**. Link-looking activity buttons have no-op handlers (`LoanActivityPanel.tsx:1–24,172–238`).
- Closing/reopening Activity within the same mounted page retains its local search/sort because the component returns null without unmounting. Page navigation can remount the panel and reset those local controls while loan-scoped provider state persists. Changing loan ID remounts keyed providers. Actual router/browser transitions were not executed.
- Checklist opening measures the button center; its panel lives outside toolbar overflow (`LoanHeader.tsx:414–436`). Closing unmounts the panel. Expansion is local; progress counts completed tasks; **View Task** stops propagation but does not navigate. Reset Demo requests browser confirmation; cancel changes nothing, confirm calls task reset, activity reset and collapses expansion (`ChecklistPanel.tsx:7–27,120–178`).
- Task reset bridges into document history/progress. Summary owns neither that history nor its reset semantics. Timing/failure interactions belong to the shared/Documents reviewers; do not replace this with a generic state reset.

## Architecture and efficiency assessment

- Cohesion is reasonable: page handles transport-to-display mapping; BorrowerCards handles contact rendering/copy; SummaryRatios is a pure display component with small reusable rows/columns. Splitting these further has no established benefit.
- The Summary request is shared by query key with sibling pages. Separate components do not each fetch the loan. Global GitHub state also initiates its own shared query; attribute that to App, not borrower-card duplication.
- Borrower rendering scales linearly with count; ratio rendering is fixed at 17 rows. Recreated display objects and currency conversions are small; no measurement justifies memoization or virtualization here.
- Each BorrowerCard subscribes to global toast state. Potential rerenders are an unmeasured shared-store concern, not a demonstrated Summary performance problem.
- Format/type/query duplication belongs to **SHARED-001**. Provider identity/loan parsing belongs to **SHARED-011**. Token representation concerns belong to **SHARED-014**. No parallel competing refactor is recommended.
- Summary is read-only for loan values. Local edits on other pages should not be assumed to update this server-backed cached view unless their own code establishes that contract. Adding such synchronization is a feature/behavior change, not an invisible optimization.

## Individually approvable findings

### SUMMARY-001 — Direct Summary regression coverage is missing

- **Priority / confidence:** P2 / high for the located test inventory; no runtime defect inferred.
- **Evidence:** Owned behavior in `loan-summary.tsx:13–116`, `BorrowerCards.tsx:12–19,124–146`, `SummaryRatios.tsx:78–108`; no test references to SummaryRatios, BorrowerCards, LoanSummaryPage, copy-email or rule-of-xx found in current client test sources. Existing tests instead cover shared ChecklistPanel/LoanActivityPanel and storage identities.
- **Observed problem:** The preservation-sensitive API mapping, loading/error replacement, clipboard outcome and ratio formatting lack direct regression protection. Shared panel tests cannot detect a swapped loan amount field or reordered Summary row.
- **Suggested change:** Add isolated characterization tests for the current three owned components and page integration using safe mocked query/clipboard/provider fixtures. Do not change production behavior to make tests pass. This is a proposed later test addition, not a file change made by the audit.
- **Benefit / consumers:** Protect Summary and enable safer participation in SHARED-001.
- **Preservation rationale:** Test-only candidate; assertions encode current output, including intentional defaults, placeholders and current format quirks.
- **Risk:** Low runtime risk; tests can accidentally encode intended rather than actual behavior or contact platform services if App is mounted without mocks.
- **Dependencies / effort:** SHARED-012's reproducible test environment; agree baseline fixtures; approximately 1–2 days.
- **Verification plan:** Mock network/clipboard and shared GitHub context; verify pending, success, missing loan and query-error branches; assert every field/label/order, null versus empty Rule of XX, primary badges, zero/multiple borrowers, mailto values, and copy resolve/reject. Capture safe-fixture desktop/mobile visual baselines and keyboard activation before any subsequent refactor. No live API writes or real contacts.
- **Performance classification:** Verification gap, not a performance claim.
- **Decision:** Awaiting user approval.

### SUMMARY-002 — Clipboard icon button lacks an accessible name

- **Priority / confidence:** P2 / high static evidence; assistive-technology behavior not browser-tested.
- **Evidence:** `client/src/components/loan/BorrowerCards.tsx:78–85`: icon-only button has onClick and data-testid, but no aria-label, aria-labelledby, title or text child. Adjacent Email text is not programmatically linked to the button.
- **Observed problem:** The action's purpose is not explicitly conveyed as the button's accessible name. A test ID is not an accessibility label.
- **Suggested change:** If explicitly approved as a behavioral exception, add a nonvisual accessible label identifying the copy-email action; keep SVG, dimensions, markup layout, handler and toast strings unchanged. Do not add a tooltip or visible text as an incidental fix.
- **Benefit / consumers:** Clearer operation for assistive-technology users on every borrower card.
- **Preservation rationale:** **Scope exception required**: this intentionally changes the accessibility experience even if pixels remain the same. Exact-behavior preservation does not implicitly authorize it.
- **Risk:** Low visual risk, but label wording and repeated-card distinction need approval. Avoid unnecessarily exposing borrower contact data in the label.
- **Dependencies / effort:** User approves the exception and label wording; SUMMARY-001 can provide fixtures; approximately 0.25 day.
- **Verification plan:** Assert each button's approved accessible name and unchanged tab order; keyboard Enter/Space invokes copy once; compare success/failure feedback and exact before/after screenshots with multiple cards.
- **Performance classification:** Accessibility finding, not performance.
- **Decision:** Awaiting user approval.

## Shared-impact notes for the final architect

| Existing finding | Summary-specific evidence / constraint |
|---|---|
| SHARED-001 | `loan-summary.tsx:9–16,22–24,88–107`: preserve numeric-prefix parsing, negative formatting, percent trailing zeroes, query key and separate display/total/requested amounts. Keep page-specific JSX unchanged. |
| SHARED-006 / SHARED-008 | Admin access comes through Summary header; loan API response logging is shared. No independent authorization or logging fix is proposed here. |
| SHARED-009 | Query's direct JSON parsing can fail on HTML; Summary collapses failures to its generic error text. A more helpful retry/message changes visible behavior. |
| SHARED-011 | Header TRID and checklist/activity displays subscribe to context. Loan-keyed remounts, panel local-state lifetime, reset semantics and no-op links must survive any provider work. |
| SHARED-012 | Lead measured a failed static baseline. This report does not rerun it or claim tests pass; direct Summary tests must first have a reproducible isolated environment. |
| SHARED-014 | Current row/card geometry, fonts, breakpoints, token values and literal dimensions are preserved, not normalized against documentation or a new design interpretation. |

Potential malformed-response crashes, long-content overflow and stale cached data are explicitly **unverified scenarios**, not additional approved bug fixes. They should be characterized before a separate behavior-changing recommendation is justified.

## Regression plan and limitations

The following is a plan for future approved verification, not tests performed during this audit:

1. **Route/data matrix:** root redirect, direct Summary URL, alternate loan ID, valid response, deferred response, 404/500/network error, cached response plus error. Confirm header/panels are absent in loading/error states and no retry is introduced.
2. **Content matrix:** no/one/multiple borrowers, long labels, primary/nonprimary combinations, ID-stable ordering; 17 ratio rows, null/empty Rule of XX, zero/negative/fractional currency, preserved percent strings. Malformed fixtures characterize boundaries without redefining production API contracts.
3. **Interaction matrix:** mailto target; successful/rejected/unavailable clipboard; repeated copy activation; toast limit; six tab destinations retaining loan ID; activity open/close/search/clear/sort/empty and reopen behavior; checklist expand/collapse/reset cancel and confirm using fake browser storage only.
4. **Visual matrix:** narrow viewport and widths just below/at md and xl; fixed toolbar, scroll boundaries, card spacing, ratio ordering, activity-open width, menu/checklist placement, focus/hover and font-loaded/unavailable conditions. Compare against this baseline, not a redesigned expected screen.
5. **Isolation:** mock admin network/connector paths even when rendering App. Never click live push/pull/force/reset operations to gather evidence. Use synthetic borrower records; retain asset bytes and do not extract personal content.

Performed here: baseline hash comparison; static source/contract and adjacent-test inspection; searches for direct Summary tests; report integrity and scope checks. No browser, clipboard, network, API, database, document rendering or performance experiment was run. Adjacent test names establish intended coverage only, not passing execution. No visual-equivalence claim is made.

All three owned modules and their relevant shared interfaces are covered; deep sync and document-history internals remain owned by their designated reviewers rather than silently becoming Summary remediation. The final architect should consolidate the two approval entries and shared references above. No follow-up tasks are created because final consolidation is already queued.
