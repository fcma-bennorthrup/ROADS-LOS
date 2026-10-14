# Decisioning architecture audit

## Authority, baseline and limitations

Audit date: 2026-10-14. Read `baseline.md`, `coverage.md`, `shared.md`, `replit.md` and the audit constraints before review. Initial and pre-submission checks compared all **174** manifest file hashes with the local checkout and matched, including all five owned files, the public decision-letter PDF, shared contracts and styles. **After completion review, a new comparison found lockfile drift: 173 match, one mismatch.** The baseline aggregate is `ab0f85c1707e2b9355037c78a4d365dddba7e0019bf5559bb40659facabbee92`; it no longer describes the entire current tree.

| Mismatched file | Recorded baseline | Current local observation after completion review |
|---|---|---|
| `package-lock.json` | 317096 bytes; SHA-256 `22cfba6c0877fa46d723ddc186a9ff026eb3712c25ef0e57c0cdeb967e2b5bc9` | 361120 bytes; SHA-256 `caf5cbce73ec535033e36984f2c5d00e080a7a91c1575750b7008f7c52e9107e` |

No other manifest file is missing or mismatched. Completion review reports that the inherited lockfile change adds test dependencies and changes the locked calendar major version. This reviewer did not make that change or restore/reconcile it: either would violate report-only ownership and the instruction not to reconcile baseline drift. **Dependency installation, test-tool availability, library runtime behavior and dependency-based equivalence conclusions are blocked pending lead reconciliation or an explicitly approved new baseline.** The owned source and shared source contracts still match, so static source findings remain evidence about those matching files, not verification of the changed dependency tree. The lead must retain this provenance exception during consolidation.

Only this report is a deliverable. No application, configuration, test, asset or service changes were made. Evidence is static source inspection, not a browser reproduction. No requests, live push/pull, document delivery, database operations, workflow restarts, dependency installation, runtime tests or screenshots were performed. The global application can query the GitHub conflicts endpoint on mount, and providers write browser storage; opening the live application is not a safe substitute for an isolated fixture environment.

All recommendations below are individually **Awaiting user approval**. Approval of this report authorizes no implementation. Behavior-changing fixes require an explicit exception to the exact-preservation constraint. No personal record bodies are reproduced here.

## Coverage and reachability

| File / boundary | Reviewed scope and evidence |
|---|---|
| `client/src/pages/loan-decisioning.tsx:1–122` | Entire route, query, formatting, loading/error paths, conditional child mounts, placeholder, header/sidebar/toolbar/activity composition. |
| `client/src/components/loan/DecisioningSummaryContent.tsx:1–232` | Entire component: three flags, reset effect, four workflow handlers, PDF action, button semantics, visible decision/credit states. |
| `client/src/components/loan/BorrowerFinancialsContent.tsx:1–635` | Entire file: types/defaults/sample data, IncomeField, IncomeSourceCard, all field groups, borrower tabs, draft/save/discard/add and calculation paths. |
| `client/src/components/loan/BalanceSheetSection.tsx:1–936` | Entire file: defaults/options, BalanceSheetField, AssetCard, LiabilityCard, menu effects, BalanceSheetRow, four collections and every edit/add/delete/save/discard transition. |
| `client/src/components/loan/__tests__/DecisioningSummaryContent.test.tsx:1–211` | Entire owned test file; five tests described below. No financials/balance-sheet/route test exists in the manifest. |
| `client/src/App.tsx:22–71`; `replit.md:51–55` | Route and provider placement; documentation is stale (it describes additional sidebar placeholders and pending content). Source, not documentation, governs this report. |
| `client/src/components/loan/{LoanHeader,SideNav,ChecklistPanel,ChecklistActionTimeline,LoanActivityPanel}.tsx` | Shared composition and consumed interfaces: routes/toolbar/admin access, sidebar callback, checklist expansion/reset, status timeline, activity search/sort/close/no-op links. Lead owns implementation recommendations. |
| `client/src/contexts/{checklist-context,loan-activity-context}.tsx`; `client/src/lib/loan-activity.ts` | Status derivation/advancement/guards, per-loan persistence and remounting, reset event lifecycle, deduplication, date serialization/display. |
| `client/src/components/loan/RoadsDropdown.tsx:19–166` | Both trigger variants, selected-value behavior, options, mouse handlers, outside-mousedown subscription/cleanup; financials uses inline mode. Shared ownership. |
| `client/src/hooks/use-toast.ts`; `client/src/components/ui/{toaster,toast}.tsx`; `client/src/lib/utils.ts` | One-toast store, subscription cleanup/removal delay, information variant, close button, viewport and class composition. Lead owns shared wrappers/style review. |
| `client/src/lib/{closing-disclosure-history,closing-package-progress}.ts` | Transitive checklist reset/storage boundary: synchronous or Web Locks asynchronous reset, custom/native events and unsubscribe, strict history validation, package key removal. Documents owns internal workflows and their tests. |
| `client/src/lib/queryClient.ts:1–57`; `server/routes.ts:190–201`; `server/storage.ts:4–24,105–116`; `shared/schema.ts:20–65` | GET contract, cache/error policy, loan-plus-borrowers shape, MemStorage lookup and absence of financial/decision mutation APIs. |
| `client/src/hooks/use-github-sync.ts:27–42`; `client/src/components/GitHubSyncPanel.tsx:36–65`; App/LoanHeader | Shared global/admin request boundary traced, not exercised. Detailed conflict dialog/server/primitive review remains in `shared.md`, not a competing page audit. |
| `client/src/components/loan/__tests__/{ChecklistPanel,LoanActivityPanel}.test.tsx`; `vitest.config.ts`; `client/src/test/setup.ts` | Related test case inventory and harness boundaries; lead owns those suites. |
| `client/public/decision-letter.pdf`; global tokens/CSS | Matching fingerprint and source reference only; no PDF content/rendering verification or visual parity claim. Styling definitions remain shared ownership. |

Reachable route: `/loans/:id/decisioning` (`App.tsx:29`), also reached by the header Decisioning tab (`LoanHeader.tsx:62–69,90–99`). Sidebar choices are **only** Decisioning Summary and Borrower Financials (`loan-decisioning.tsx:20–23`). They are local state, not child URLs or query parameters. Refresh starts Summary. Clicking the current selection does not intentionally remount it; switching between selections unmounts the previous child.

BalanceSheetSection is reachable only inside Borrower Financials (`BorrowerFinancialsContent.tsx:632`), not as a standalone route. The local ComingSoon component (`loan-decisioning.tsx:25–41,112`) is a fallback for a non-listed active string; the supplied sidebar cannot choose one. No Item 3/Item 4 sections currently exist. Do not add routes or expose this fallback as “cleanup.”

**Ratios scope:** no ratio table or ratio calculation is rendered by Decisioning. Loan ratio fields exist in the fetched schema but this page does not consume them; `SummaryRatios` is mounted by the Summary page, not either Decisioning section. The only derived financial values here are yearly/monthly income. Balance sheet has no sums, net-worth total, or DTI linkage. Do not infer a missing implementation requirement from the audit's ratios heading.

## Current behavior and interaction contract

### Route shell, data and edge states

- Loan ID comes from route params with `"1"` fallback. Query key is `["/api/loans", loanId]`; default query function joins with `/`, includes credentials, throws on non-OK and parses JSON. Infinite stale time, no focus refetch, no polling and no retries (`queryClient.ts:26–57`).
- Server looks up the in-memory loan, returns 404 if absent, otherwise combines loan and borrower rows; exceptions return 500. There is no runtime schema check on the client. An empty borrowers array is irrelevant to the local financials fixtures; malformed truthy loan data is not an explicit error branch.
- While loading, the full-screen token background displays “Loading loan details...”; error or missing data displays “Failed to load loan data.” Neither has retry controls. No header/panels render in those branches (`loan-decisioning.tsx:43–78`).
- Header receives API metadata and `parseFloat(displayAmount)` formatted to US currency/two decimals. Preserve existing partial/invalid parsing outputs, not new coercion. Financials receives **no** loan/borrower props; summary receives only loan number/name for toast text.
- Shell is viewport-height with hidden outer overflow, 240px nonshrinking sidebar, independently scrolling content with 36px bottom allowance, fixed full-width bottom toolbar and optional 280px activity sibling. Header tabs scroll horizontally; source provides no page-specific mobile alternate layout. Overflow/clipping at narrow widths is a verification risk, not a measured defect.
- Header stage display is shared static prototype progression, not driven by a decision event. TRID chip depends on Loan Estimate re-fire status. Summary approval does not update the server/header stage.

### Decisioning Summary state/action matrix

Source: `DecisioningSummaryContent.tsx:16–88,105–228`.

| Action/state | Local display | Checklist / activity / other effect |
|---|---|---|
| Fresh mount | Decision `--`, credit `--`; view/deliver aria-disabled; Pull Credit enabled | Does not initialize local flags from persisted checklist. Reset effect also sets all three flags false. |
| Pull Credit | Score becomes literal `742`; button natively disabled | Sets Loan Decision action 0 in-progress unless already complete. No API, toast or new credit activity. |
| Decision Loan | Sets Loan Approved only if Loan Decision action is not already complete | Completes decision, unconditionally marks letter generation in-progress, adds fixed-ID approval activity and information toast for 6000ms. No credit prerequisite. Repeated completed decision is an early no-op. |
| Generate Decision Letter | Sets local generated flag **before** completed-action guard | Completes generation and advances the next not-started action using `completeAction`; adds fixed-ID generation event. Allowed before credit or decision. Repeat does not re-add an event. |
| View Decision Letter before/after generation | Button remains focusable in both states; only aria-disabled/cursor changes | Guard returns while false; otherwise `window.open("/decision-letter.pdf", "_blank")`. Static existing PDF, not server generation; no popup-blocked/error feedback. |
| Deliver Decision Letter | Guarded by local generation flag; remains visually enabled after completion | Completes letter action 1 unless already complete; starts Loan Estimate action 0 only if not-started. Adds fixed-ID delivery event. No network delivery or toast. |
| Reset Demo confirmation accepted | On successful reset broadcast clears decision, credit and generated flags | Shared reset restores tasks, dismisses toasts, removes runtime activities. Cancellation changes nothing. Financials does not subscribe to reset. |
| Navigate away/back or refresh | Local flags start false again | Per-loan checklist and runtime activities remain persisted; see DECISIONING-001. |

All decision workflow operations are synchronous prototype state transitions. There is no busy, async error, denied/declined-decision, validation or confirmation state for those buttons. Do not introduce service calls or new gating under an internal refactor.

### Borrower Financials: income

Sources: `BorrowerFinancialsContent.tsx:31–54,62–391,393–635`.

- Two local seeded borrowers, initially first selected, one source each. Only the first shows Primary Wage Earner. API borrower contents do not populate these records. Tab buttons reset the income edit index/buffer even when clicking the selected tab. Saved edits survive borrower switching only while this component remains mounted.
- Cards initially expanded; clickable header toggles body. Current Job chip is conditional on exact `"Yes"`; title follows draft income type/employer while editing. Collapse retains the buffer but hides edit controls. Header is a `div` with click, not a keyboard button.
- Every employment group is covered: Income Type (W2/1099/Self-Employment/Other), Employer, Title/Position, Current Job (Yes/No), native Start Date, conditional End Date for No, Years Employed and Years in Line of Work. Changing to Yes hides but does not erase end date.
- Address group: Address 1/2, City, State, Zip, Phone. Annual income group: Base Employment Income, Overtime, Bonuses, Commissions, Other; Total Monthly/Yearly Income stay read-only. Plain strings, no required/range/date-order/phone/currency validation; no automatic employment-duration calculation.
- Edit copies a source into a single buffer. Editing another source or adding one abandons the previous draft without a prompt. Save sums five `parseFloat(value.replace(/,/g,"")) || 0` values, divides by 12, formats both totals to `$` US/two decimals and replaces only the active source. Totals are stale during editing, recalculated only on Save. Partial numeric strings parse; dollar-prefixed/invalid/empty values become zero; negatives are accepted. No income-type-specific calculator.
- Both total strings already contain `$` and their field adds a dollar adornment. This duplicate-symbol rendering is baseline, not permission to normalize display.
- Discard drops the buffer. Add immediately appends a default source with `Date.now()` ID, then edits it; discarding that draft leaves the blank/default source. There is no source delete action or explicit empty-state panel. Repeated additions may replace an existing draft. Same-millisecond ID collision is possible by construction but not observed.
- Fields use fixed 287/288px widths with wrapping (State/Zip 136px each), read-only spans and native inputs in edit mode; visible labels are spans, not associated `<label>` elements. Calendar icon is decorative, not a separate picker action.

### Balance sheet

Sources: `BalanceSheetSection.tsx:5–151,153–570,616–936`.

- Four locally seeded collections: current/non-current assets and current/non-current liabilities, initially one card each. Two fixed equal grid columns with 40px gutter pair asset/liability by index; shorter side receives blank cells. Empty collections retain headers/add controls, no extra empty message. Cards stretch to row height.
- Asset fields: type (seven options), institution, account number, cash/market value. Liability fields: type (six options), creditor, account, unpaid balance, monthly payment, paid-off-by-closing Yes/No. All financial entries remain unconstrained strings; no totals, masks, validation, payoff calculation or category movement when type changes.
- One edit target `{category,index}` and separate asset/liability buffers. Switching edit target discards previous unsaved buffer. Save copies buffer without formatting or calculation. Discard clears buffers/target; add immediately persists a default local row and starts edit, so add-then-discard keeps it. Income and balance sheet can be edited simultaneously because their edit controllers are independent.
- More menu opens from a clickable SVG, closes on outside `mousedown`, closes after delete; listeners clean up on close/unmount (`:176–185,378–387`). It has a single immediate Delete action, no confirmation/undo. Menus are independent per card and usable while another card is being edited. Deleting the exact edited row clears its buffer. Deleting an earlier row does **not** adjust the index (DECISIONING-002).
- BalanceSheetSection is not keyed/passed active borrower (`BorrowerFinancialsContent.tsx:632`), so the same balance sheet and even its in-flight draft survive borrower-tab switching. Whether intentionally household-level is unspecified; do not “fix” by isolating borrowers without product approval. Sidebar navigation away resets the entire local balance sheet and saved income state; Reset Demo does not reset either financial editor.

### Shared checklist, activity, controls and storage

- Checklist provider derives complete first, then blocked, re-fire, in-progress, else not-started; generation's `completeAction` only auto-advances an adjacent not-started action. Decision Letter is not a full-refire-lifecycle task (`checklist-context.tsx:44–66,203–211,303–334`).
- Checklist persisted at `loan-checklist-statuses:<loanId>`, activities at `loan-runtime-activity:<loanId>`. Both tolerate invalid/unavailable storage by fallback/caught writes; failures have no Decisioning-specific warning. Providers key by loan ID and remount descendants when it changes (`checklist-context.tsx:168–200,272–285,421–429`; `loan-activity-context.tsx:46–99,124–170`). No same-loan checklist storage-event reconciliation is supplied.
- Activity deduplicates on fixed ID, serializes dates, merges runtime entries with seeds and filters malformed stored records. Panel opens/closes through header; default newest first, trimmed case-insensitive title/description search, clear button, native sort and “No results found.” Close/reopen retains mounted search/sort; route remount resets panel-local search/sort while provider state can persist. Existing document/credit link buttons are no-ops (`LoanActivityPanel.tsx:5–24,173–228`).
- Toolbar Checklist mounts a 420px/max-viewport popover above the button; one expanded task at a time; progress counts whole complete tasks. View Task stops propagation but does not navigate. Other toolbar items are inert. Close/reopen resets expansion (`LoanHeader.tsx:414–478`; `ChecklistPanel.tsx:7–23,122–180`).
- Global reset has storage failure/async boundaries: checklist reset can return early or await a Web Locks history reset, but ChecklistPanel resets activities immediately. Potential partial-reset inconsistency is a **shared lead escalation**, not a separate competing page fix (`ChecklistPanel.tsx:14–22`; `checklist-context.tsx:363–401`). Dedicated disclosure-only reset intentionally does not broadcast Decisioning local reset (`:251–270`).
- RoadsDropdown handles outside clicks and selection with cleanup but has no custom arrow/Escape/focus-navigation logic. Native buttons can be tabbed/clicked; no implicit replacement with a library select is behavior-preserving. Toast information placement/styles/close affordance and shared one-toast limit must survive future changes.

## Existing tests, gaps and performance assessment

Owned tests (`DecisioningSummaryContent.test.tsx`):
1. `:39–63` view/deliver ordering, class/style parity and aria-disabled change after generation.
2. `:65–118` repeated generation/delivery, checklist counts/chips, timestamped activity ordering/count and Loan Estimate advancement.
3. `:120–129` Pull Credit advances checklist.
4. `:131–178` repeated decision, checklist transition, single approval activity, information toast role/text/style placement and expiry with fake clock.
5. `:180–211` accepted Reset Demo clears mounted summary/checklist/runtime activity.

Harness renders providers/content directly, not the actual route or sidebar; tests do not cover remount, persisted completed decision, API loading/error, PDF `window.open`, generation-before-decision ordering, storage failures or financial edits. Shared checklist tests cover initial task/status/refire variants and reset accept/cancel; activity tests cover search/clear/empty/sort. They do not close the financials/balance-sheet gaps.

No tests were executed. `shared.md` SHARED-012 reports a failed existing non-emitting type-check and missing test dependency declarations; that is historical inherited evidence, not a newly run check, proof of these tests failing, or a claim about the post-review changed dependency lockfile. Dependency-sensitive review is stopped because of the mismatch above. Do not install or silence diagnostics in this audit.

Costs visible in source: one loan query plus global conflicts query; edits trigger parent renders and rebuild cards/options; balance rows allocate a paired array and callback closures; open activity filters/sorts; providers serialize state on change. Income parsing happens on Save, not each keystroke. Menu listeners attach only while open and clean up. No local timers/service fan-out, measured leaks or measured slow renders were found. Large-list rerender cost is an **unmeasured hypothesis**, not justification for memoization/virtualization. SHARED-011 owns provider identity/performance review.

## Individually approvable findings

### DECISIONING-001 — Persisted workflow and local summary flags disagree after remount
- **Priority / confidence / class:** P1; high static confidence; proven state inconsistency, not runtime-reproduced.
- **Evidence:** `client/src/components/loan/DecisioningSummaryContent.tsx:16–27,36–42,58–74,122,160–164`; `client/src/pages/loan-decisioning.tsx:105–112`; `client/src/contexts/checklist-context.tsx:173–200,272–285`.
- **Observed problem:** Approve, switch to financials, switch back: checklist remains complete but decision reads `--`. Clicking Decision Loan then returns before setting local approved state. Generated PDF access similarly resets until Generate is clicked again. Reload with completed storage has the same disagreement.
- **Suggested change:** After approval of persistence semantics, derive/initialize decision and generated-letter view state from an authoritative per-loan workflow model. Define credit-score persistence separately; checklist completion alone does not prove credit was pulled.
- **Benefit / scope:** Consistent return/reload state for Summary, shared checklist and activity; no real-service integration.
- **Preservation rationale:** **Not behavior-preserving in affected states; explicit scope exception required.** Keep all initial-state markup, labels, styles, workflow event IDs, event deduplication, button ordering and unaffected actions.
- **Risk / dependencies / effort:** Medium; avoid falsely restoring credit or duplicating events; coordinate SHARED-011 and reset semantics; 1–2 days after decision.
- **Verification:** Isolated fixture: approve/generate/deliver at each stage, switch sidebar/routes, reload, change loan ID, corrupt/deny storage and Reset Demo. Assert approved restored state only as authorized; no extra toast/activity on mount, unchanged timestamps/PDF target. Before/after screenshots of fresh and completed states and exact focus/button checks; changed states require approved expected output.
- **Performance:** No measured performance claim.
- **Decision:** Awaiting user approval.

### DECISIONING-002 — Deleting an earlier balance-sheet row leaves the edit target on a different record
- **Priority / confidence / class:** P1; high static confidence; proven index/state correctness defect, not runtime-reproduced.
- **Evidence:** `client/src/components/loan/BalanceSheetSection.tsx:616–619,730–759,780–817,835–850`.
- **Observed problem:** With rows A/B/C, edit B (index 1), then delete A (index 0) via its still-enabled menu. Target stays 1, now C; B's buffer displays on C and Save overwrites C. With only A/B, the target can point beyond visible cards and hide the active save controls.
- **Suggested change:** Use stable record identity for target/save/delete, or explicitly reconcile the index after deletion. ID generation/collision policy must be established if identity is chosen; do not bundle new persistence or confirmation UI.
- **Benefit / scope:** Prevent wrong-record overwrites in all four balance categories; owned section only.
- **Preservation rationale:** **Explicit scope exception required** for corrected deletion-during-edit outcome. All normal edit/save/discard/add/delete layouts, menus and no-confirm behavior stay exact.
- **Risk / dependencies / effort:** Medium; React keys and draft lifetime must remain stable; baseline characterization first; 0.5–1 day.
- **Verification:** Each category: edit first/middle/last; delete before/after/current edited row and another category; save/discard afterward; verify intended record bytes and survivor IDs. Include two-row and three-row cases, open-menu screenshots, keyboard/mouse focus and paired-grid empty-cell snapshots.
- **Performance:** No measured performance claim.
- **Decision:** Awaiting user approval.

### DECISIONING-003 — Decision after letter generation regresses completed generation status
- **Priority / confidence / class:** P2; high static confidence; proven ordering inconsistency, not runtime-reproduced.
- **Evidence:** `client/src/components/loan/DecisioningSummaryContent.tsx:36–43,58–69,142–158`; `client/src/contexts/checklist-context.tsx:287–301`.
- **Observed problem:** Generate (optionally Deliver) before Decision is allowed. Decision unconditionally writes letter action 0 to in-progress, even if complete, reducing checklist completion while local View/Deliver stay enabled and generation activity remains.
- **Suggested change:** If user approves monotonic progression, preserve completed letter-generation status when approving the loan. Do not instead gate/reorder buttons without separate authorization.
- **Benefit / scope:** Keep summary actions and letter checklist consistent; touches Loan Estimate downstream characterization but not its implementation.
- **Preservation rationale:** **Explicit behavior scope exception required.** Normal credit→decision→generation→delivery remains identical; the out-of-order result deliberately changes.
- **Risk / dependencies / effort:** Low–medium; coordinate authoritative workflow decisions in DECISIONING-001; 0.5 day.
- **Verification:** All decision/generate/deliver permutations, repeated clicks, preexisting complete/blocked/re-fire fixtures, activity dedupe/timestamps and Loan Estimate guard. Compare baseline screenshots and unchanged button order/enabled semantics; approve only specified status differences.
- **Performance:** No measured performance claim.
- **Decision:** Awaiting user approval.

### DECISIONING-004 — Characterize financial editor contracts before extracting them
- **Priority / confidence / class:** P2; high; verification gap.
- **Evidence:** `client/src/components/loan/BorrowerFinancialsContent.tsx:456–524,543–550,618–632`; `client/src/components/loan/BalanceSheetSection.tsx:770–871`; owned test `client/src/components/loan/__tests__/DecisioningSummaryContent.test.tsx:19–30,38–211`; baseline test inventory.
- **Observed problem:** Complex local draft/add/delete/calculation behavior has no owned financial editor tests; current decision tests mount neither financial component nor the real page navigation.
- **Suggested internal change:** Add fixture-only characterization tests for income, balance sheet and route mount boundaries, without modifying production code or blessing defects as intended product behavior. Mark known inconsistencies explicitly.
- **Benefit / scope:** Safer future internal work across the three owned components and route; no shared test rewrite.
- **Preservation rationale:** Test-only candidate; freeze current add-then-discard, tab-switch, calculation/parsing and markup behavior until separately authorized fixes.
- **Risk / dependencies / effort:** Low app risk; tests can overfit DOM or duplicate IDs unless scoped to section/card. Resolve approved test environment via SHARED-012, use fake API/storage/clock and no global admin network; 1–2 days.
- **Verification:** Run added/existing relevant suites in a disposable environment. Include every inventory action, invalid strings, conditional End Date, stale totals while editing, independent income/balance drafts, empty/unequal columns, reset isolation, remount/reload, and loading/error shell. Visual fixtures at 1440px, 1024px and 390px with activity/checklist open; preserve existing overflow rather than redesign.
- **Performance:** No measured performance claim.
- **Decision:** Awaiting user approval.

### DECISIONING-005 — Isolate duplicated balance-card menu lifecycle without replacing controls
- **Priority / confidence / class:** P3; high duplication confidence; maintainability only.
- **Evidence:** `client/src/components/loan/BalanceSheetSection.tsx:173–185,210–254,375–387,412–456`.
- **Observed problem:** Asset and liability cards duplicate open/ref/outside-mousedown lifecycle and delete-menu rendering. Separate copies make future corrections easy to apply inconsistently; no current listener leak is alleged.
- **Suggested internal change:** Extract the identical menu lifecycle into a small local hook first; retain each card's markup and delete label. Do not create a generic financial-form framework or replace SVG trigger/library controls in this approval.
- **Benefit / scope:** One lifecycle implementation for both balance card types; no shared RoadsDropdown changes.
- **Preservation rationale:** Internal candidate with identical event type, listener timing/cleanup, independent per-card state, event order and DOM.
- **Risk / dependencies / effort:** Low–medium; closure/reference changes may affect outside-click/delete ordering. Depends on DECISIONING-004 coverage; 0.5 day.
- **Verification:** Both menus: toggle, click inside/outside, delete, editing another card, switch borrower/sidebar, unmount. Instrument listener count/cleanup in tests; compare exact DOM, hover styles, popup placement and focus behavior before/after.
- **Performance:** Reduction in duplicated code only; no runtime performance claim.
- **Decision:** Awaiting user approval.

### DECISIONING-006 — Financial controls lack complete keyboard and label semantics
- **Priority / confidence / class:** P2; high static confidence; accessibility defect, browser/assistive-technology impact unmeasured.
- **Evidence:** `client/src/components/loan/BorrowerFinancialsContent.tsx:92–97,147–165,224–231`; `client/src/components/loan/BalanceSheetSection.tsx:70–75,106–124,210–215,412–417`.
- **Observed problem:** Income collapse trigger is click-only div; delete-menu triggers are click-only SVGs without button/tab semantics; visible field labels are not programmatically associated with inputs. Repeated cards also reuse test IDs, so tests must scope selectors.
- **Suggested change:** Separately approve accessible trigger/label semantics and explicit keyboard/focus contract for these owned controls. Shared RoadsDropdown semantics must be consolidated by the lead, not changed as part of this item.
- **Benefit / scope:** Keyboard and accessible-name access to owned financial actions/fields.
- **Preservation rationale:** **Explicit scope exception required** because focus order and keyboard behavior change. Keep exact visual boxes/icons/typography/hover states; default native button styles must not leak.
- **Risk / dependencies / effort:** Medium visual/focus regression risk; approved accessibility expectations and shared-control boundary; 1 day.
- **Verification:** Tab/Shift-Tab/Enter/Space, focus after collapse/menu/delete, accessible input names scoped per record, mouse parity, duplicate-ID checks. Screenshot normal/hover/focus/edit/collapsed states at the same fixture sizes; document intentional interaction differences.
- **Performance:** No measured performance claim.
- **Decision:** Awaiting user approval.

## Shared-impact handoff, uncertainty and final checks

- Refer to **SHARED-001** for duplicate loan type/query/formatter, **SHARED-011** for provider identity/remount semantics, **SHARED-012** for validation baseline, **SHARED-013** for stale documentation and **SHARED-014** for token parity. No duplicate implementation proposals here.
- Refer global admin/sync/error/log concerns to **SHARED-002–010**; no real-service tests or separate Decisioning sync recommendations.
- Lead should consolidate partial Reset Demo failure ordering and custom control accessibility across page reports. Documents owns disclosure reset internals; changing those can clear Decisioning local flags and must preserve disclosure-only reset isolation.
- Product uncertainty, not automatic defects: whether balance sheet is household-level; whether financial “Save” intentionally lasts only until navigation; whether Add→Discard retaining a blank record is desired; whether literal fixture credit is intended. No silent persistence, validation, totals, ratio integration or source-delete feature is proposed.
- Further baseline facts needing characterization, not independent change approvals: duplicate currency adornments, date-input browser formatting, same-millisecond added IDs, duplicate per-index test IDs, narrow-screen overflow and popup blocking. No measured impact asserted.
- Specific preservation proof for any approved internal implementation: use a disposable copy with synthetic loans and blocked/mock admin transport; capture API response/empty/error fixtures, all states listed above, DOM/style snapshots and screenshot pairs at agreed desktop/narrow viewports. Compare text, token-resolved styles, spacing, focus order, scroll regions, card keys, native date/dropdown behavior, storage/event ordering and exact PDF bytes. A passing unit test is not visual-equivalence evidence.
- Final deliverable check: all owned files and nested sections inventoried; API/storage/tests and shared boundaries traced; each proposed change has its own decision and proof plan. No performance measurements or passing runtime/visual checks are claimed. The existing downstream lead-consolidation task covers next steps; no overlapping follow-up tasks are proposed.
- Pre-submission baseline recheck had **174/174 hashes and sizes matching**, with no added first-party files under the capture rules and only this report in workspace status. The subsequent completion review exposed an inherited lockfile change; the latest recheck is **173/174 matching**, with the exact mismatch and blocked conclusions recorded at the top. Do not treat the earlier check as current-tree equivalence or a clean complete-diff claim. No lockfile edits/restoration were attempted by this reviewer. Existing audit memory already records the required approval/preservation constraints; report-only ownership was preserved.
