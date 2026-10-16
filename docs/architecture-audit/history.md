# History architecture audit

## Status, scope and provenance

Audit only, dated 2026-10-14. **No recommendation is authorized for implementation.** Only this report is changed. Source of truth is the current local tree, not a remote repository or commit diff.

Read the lead's `baseline.md`, `coverage.md`, `shared.md`, project instructions in `replit.md`, and the audit-constraints memory. The initial read-only comparison of all **174 manifest files** reported **zero missing or mismatched files**, with no additional first-party files under the baseline's inclusion rules. A later comparison after the completion check found **package-lock.json drift**; the current checkout must not be described as fully baseline-matching. See the drift notice below. Owned source fingerprints still match:

| Owned file | SHA-256 |
|---|---|
| `client/src/pages/loan-history.tsx` | `8eccfa2f9b594e10b8a2ba39d1246f8e79b5974d81d4b23320fc1921297369e3` |
| `client/src/components/loan/HistoryContent.tsx` | `f9108e55498ba754f15484530ce3709aa34f42ce6964e643314e2fe7cd8ea9f0` |

The whole manifest was compared again at handoff and after completion feedback; results appear in the final verification section. Matching fingerprints establish the reviewed source snapshot, not correctness or the provenance of a broader submitted diff.

### Blocking dependency-baseline drift notice

The latest comparison finds **173 matching files and one mismatched file**, with none missing:

| Path | Lead baseline | Current checkout |
|---|---|---|
| `package-lock.json` | 317096 bytes; SHA-256 `22cfba6c0877fa46d723ddc186a9ff026eb3712c25ef0e57c0cdeb967e2b5bc9` | 361120 bytes; SHA-256 `caf5cbce73ec535033e36984f2c5d00e080a7a91c1575750b7008f7c52e9107e` |

Current lock data names react-day-picker 9.14.0. Completion feedback reports a broader submitted lockfile change from 8.10.1 to 9.14.0. This audit did not run an installation or edit that file, but cannot certify that the complete submitted change contains only this report. The initial matching command output and the latest mismatch are separate observations; the source of the intervening change is not established here.

**Stopped affected conclusions:** locked-dependency reproducibility, runtime/library behavior, test executability and baseline visual equivalence cannot be signed off against the lead's manifest. The authored-source findings below remain bounded static observations on matching files, not verification against the changed dependency installation. No dependency upgrade is approved by this report.

**Lead action required:** reconcile the unapproved lockfile change outside this report-only assignment, or obtain explicit approval for a new baseline and reassess affected reports. Do not merge this report as an assertion that the whole deliverable preserves the dependency baseline. This reviewer has not restored, reset, copied over, installed or otherwise reconciled the lockfile, in accordance with the task's drift procedure.

Scope includes the entire History route, Change Log, search, ordering, pagination, link destinations, dates, loading/error/empty branches, shared shell/activity/checklist integration and relevant tests. Shared internals remain lead-owned; this report does not create competing proposals for them. No additional agents, installs, runtime application requests, browser/storage reads, sync operations or source changes were used.

## Executive assessment

- History is a **static, 40-record Change Log demonstration**, gated by a real loan-detail query. It is not the shared Loan Activity feed and does not record edits made elsewhere.
- Search, timestamp sorting and pagination have explicit local state and memoized derivations. There is no History data-fetching effect, persistence, edit/save/cancel flow, row expansion or details dialog.
- Field links have a statically proven hardcoded loan-1 destination. The current server only seeds loan 1, so a wrong-loan outcome is latent with today's server data, not a reproduced live incident.
- Timestamp sorting is mouse-only in the authored markup. This and other accessibility observations are not permission to alter interaction behavior under a preservation-only refactor.
- The owned page has no dedicated tests in the baseline. Activity-panel tests cover a different data model, not Change Log correctness.
- No measured rendering or request-performance defect was established.

## Reachability and data boundaries

`client/src/main.tsx:1–5` mounts App and global CSS. `client/src/App.tsx:22–35` registers `/loans/:id/history`; the shared header's History tab maps to that path while preserving the pathname loan ID (`LoanHeader.tsx:63–98`). Root redirects to loan 1. The generic `/loans/:id` and Not Found fallback are separate routes. The History route has no nested routing or sidebar.

`loan-history.tsx:18–23` obtains `params.id || "1"` and queries `["/api/loans", loanId]`. `lib/queryClient.ts:31–55` joins the key with `/`, includes credentials, checks non-OK status and parses JSON; infinite stale time, no interval/focus refetch and no retries apply. This is a shared cache entry across loan pages, not a new history endpoint. It does not pass an AbortSignal to fetch. No new retry/cancellation/cache proposal is made here.

`server/routes.ts:190–201` returns loan plus borrowers, 404 JSON for missing loans, and 500 JSON for exceptions. `server/storage.ts:4–25,105–116` uses in-memory maps and only seeds loan ID 1; `shared/schema.ts:20–65` supplies loan/borrower types, not a history model or runtime response validation. History uses only loan header fields; the fetched borrowers array is not read by this page. There is no server history read/write call.

App's QueryClient/Tooltip/toast/GitHub/activity/checklist providers are active around this route (`App.tsx:39–71`). The global sync hook has a pending-conflicts query even without opening admin controls (`hooks/use-github-sync.ts:32–42`). Admin status querying is enabled on opening the dialog and invalidates status/conflicts (`GitHubSyncPanel.tsx:47–61`). These are shared administration dependencies, not History requests. Their mutation/conflict behavior and backend adapters remain covered by `shared.md` SHARED-002 through SHARED-010; no live administration was exercised.

### Supporting destinations

`HistoryContent.tsx:156–164` calls the optional `onNavigateToField(navItem)` and performs no fallback navigation when a callback exists. The sole production consumer (`loan-history.tsx:73`) passes no callback.

- Decisioning rows navigate to `/loans/1/decisioning`. This opens **Decisioning Summary**, not a specific metric, field or borrower-financials view (`loan-decisioning.tsx:43–49,98–112`).
- Other rows navigate to `/loans/1/origination?section=<encoded navItem>`. The five supplied values are Borrower Information, Loan Details, Collateral, Product & Pricing and Fees. `loan-origination.tsx:42–56` validates the search value and selects the section in an effect; `:109–128` mounts the corresponding existing content. No field focus, highlight or scroll target is encoded.
- Browser Back remounts the History page with its default local filters/pagination; nothing saves those controls in the URL or storage.
- No route to the standalone Coming Soon or Design System page is added or needed. They are not imported by History.

## Current visible and interaction contract

All component-relative evidence in this section refers to `client/src/components/loan/HistoryContent.tsx` unless another path is named.

| Surface/state | Current contract and evidence |
|---|---|
| Loan loading | `loan-history.tsx:25–37`: full-height centered “Loading loan details...” in headline-300/secondary text on page background. Header, table, toolbar and activity panel are not mounted in this branch. |
| Loan error/no data | `loan-history.tsx:39–51`: same centered structure with “Failed to load loan data” in error color. No retry button, status distinction or inline history error. A query error takes precedence over rendering data after the loading check. |
| Success shell | `loan-history.tsx:53–81`: `h-screen` horizontal flex/overflow-hidden; shrinking main column; header active tab History; scrolling main content with 36px bottom padding; full-viewport-width fixed bottom toolbar at z-10; shared activity panel alongside it. No History-specific responsive breakpoint. |
| Header amount | `loan-history.tsx:12–15,60–70`: parseFloat then en-US thousands/decimal formatting with exactly two decimal places. No currency input validation. Keep existing invalid-value behavior under SHARED-001. |
| Table card/title | `:168–200`: component-xl outer padding, primary background, subtle border, xs radius, overflow hidden; 24px padded wrapping title/search row with 16px gap; title “Change Log”. |
| Search | `:101,106–119,146–149,201–229`: empty default; 240px input wrapper; placeholder “Type to filter results”; case-insensitive substring search over field, previous/new values, changedBy, position, timestamp and section. No debounce, column filter or clear button. Each edit resets page to 1. |
| Whitespace semantics | `:108–109`: whitespace-only search does not filter, but nonblank input is lowercased **without trimming**. Surrounding spaces remain significant, unlike Activity search. This is an observed contract, not an automatically approved defect fix. |
| Columns | `:76–84,233–264`: Field, Previous value, New value, Changed by, Position, Timestamp, Link to field; widths 16.3%,16.3%,16.3%,13.4%,10.9%,12.7%,14.1%. Flex divs, not semantic table elements; light header background and label-strong typography. |
| Ordering | `:86–93,104–126,151–154`: timestamp descending by default, chevron-down; clicking Timestamp toggles ascending/chevron-up and resets page to 1. Other headers do not sort. Copy-before-sort avoids mutating the seed array. |
| Date contract | Display is the original `MM/DD/YYYY hh:mm AM/PM` string; parsing is only for sort. Parser constructs a browser-local Date, converts noon/midnight explicitly and has no strict format/range validation. It is not shared with Activity's locale formatter. All current 40 entries have the expected shape; malformed external input is not currently reachable through this static data source. |
| Rows/details | `:266–310`: row IDs as React keys/test IDs, subtle top borders, body-100 values, nowrap/hidden overflow/ellipsis. Section labels are native buttons in link color. No hover tooltip for truncated values, row editing, expansion, details panel or download action. |
| Pagination | `:70–74,102–103,128–144,313–393`: default 20, options 10/20/50; starts at page 1; total pages is at least 1; visible page clamps to the upper bound. Prev/next clamps both bounds. Size changes reset to page 1, including selecting the current size. Default has 2 pages; 10 has 4; 50 has 1 with 40 rows. |
| Footer | Light background; wrapping outer flex with empty left spacer, Items per page dropdown and “Page N of M”. Native icon-only arrows disable at bounds with 0.3 opacity. Footer remains on zero matches. |
| Empty search result | No rows or explanatory message; headers/footer remain, “Page 1 of 1”, both arrows disabled. This is intentionally distinct from Activity's “No results found”. Do not add copy during internal extraction. |
| Page-size dropdown | `RoadsDropdown.tsx:28–40,71–163`: inline button, opens upward, selected checkmark/brand text, hover background on unselected options; selecting closes, outside mousedown closes, listener cleans up. It stays in the card DOM, not a portal; no authored Escape/arrow-key handler or focus-management behavior. |
| Keyboard/semantics | Search is a native input with placeholder but no explicit label. Row links and arrows are native buttons; arrows lack authored accessible labels. Timestamp header is a div with onClick but no tabIndex, key handler, role or aria-sort (`:213–229,237–262,359–390`). No claim about actual assistive-technology output was tested. |
| Narrow layouts | Title/footer may wrap; values truncate; header labels remain nowrap; the card clips overflow. Opening Activity reserves 280px. Exact small-screen clipping, focus rendering and dropdown overlap were not browser-measured; retain CSS/DOM pending fixture captures. |

### Local state, lifecycle and computational cost

Four state variables govern History: search, page size, current page and sort direction (`:99–104`). Search/sort memoization depends only on search and direction; pagination memoization depends on the derived array, safe page and numeric page size (`:106–135`). Page-size changes do not rerun sorting. Parent rerenders do not inherently invalidate the same primitive dependencies. No effects, timers, subscriptions or writes occur in HistoryContent itself.

Sorting reparses timestamps inside each comparison; filtering scans seven strings per entry. This is bounded to 40 static entries today. Precomputing date keys or virtualizing rows would be speculative optimization, not a measured need. There is no proposed performance remediation. Pagination keeps at most 40 current rows in the DOM despite the 50 option.

## Change Log versus shared Loan Activity

The two views are **separate models with separate lifetimes**:

| Concern | Change Log | Loan Activity |
|---|---|---|
| Model | `HistoryContent.tsx:6–16`: numeric ID, field, previous/new string, actor/position, display timestamp, section/navItem | `contexts/loan-activity-context.tsx:4–11`: number/string ID, title, description, timestamp text, Date, optional label-only link |
| Data | `:27–68`: 40 constant records, not loan-scoped | Provider `:13–44,53–99`: four seed items plus validated saved runtime items |
| Filtering | Seven fields; nonblank whitespace preserved | `LoanActivityPanel.tsx:12–19`: trimmed lowercase title/description only; timestamp/link text not searched |
| Dates | Parses displayed month/day/year strings for ordering | Panel `:21–24` orders by Date, renders timestamp unchanged at `:212–214`. Runtime helper `lib/loan-activity.ts:1–10` uses en-US locale text and lowercase am/pm; seed display strings omit the helper's “at”. |
| Persistence | None; navigating away resets local controls | `loan-activity-context.tsx:46–99,119–134`: loan-keyed `loan-runtime-activity:<id>` localStorage; read/parse/date-validation failures fall back to seeds; write failures are swallowed with no visible error |
| Mutations | None | `:138–144`: add deduplicates against current IDs; reset retains seeds. Loader excludes seed-ID collisions but does not deduplicate duplicate runtime IDs already stored. No cross-tab storage listener is present. |
| Provider lifetime | Page-owned state | `:162–170`: keyed provider remounts for loan changes; same-loan tab navigation retains activity data/open flag |
| Panel lifetime | N/A | Panel `:5–10`: search/sort live in component even when it returns null; closing/reopening without unmount retains them. Loan-page unmount/remount resets those controls, even when shared open flag remains true. |

Activity panel specifics: default closed, 280px nonshrinking width, independently scrolling items, Newest/Oldest native select, Search input with clear button when any text exists, “No results found” on zero matches, close button with explicit aria-label (`LoanActivityPanel.tsx:26–183`). Optional View Document/View Credit Report buttons are **no-ops** (`:215–230`); do not implement navigation under the guise of an internal change.

Shared emitters found by source search: appraisal completion in `CollateralContent.tsx:495–508`; rate lock in `ProductPricingContent.tsx:232–238`; decision/letter generation/delivery in `DecisioningSummaryContent.tsx:43–89`; disclosure generation/delivery in `DisclosureDocumentsContent.tsx:224–291`. These add Activity items, **not Change Log entries**. Their workflows belong to the respective page reviewers.

Checklist is reachable from History's toolbar. Only Checklist has a toolbar action; Loan Info, Quick Links, Key Dates and Errors remain placeholders (`LoanHeader.tsx:414–479`). Checklist open state and measured anchor position belong to the toolbar. The shared panel has progress, one expanded task at a time, action timeline/status variants, close, inert View Task affordances, and confirmation-gated Reset Demo (`ChecklistPanel.tsx:7–23,87–178`; `ChecklistActionTimeline.tsx:4–170`).

Reset Demo invokes shared task reset then Activity reset; it does not touch static Change Log rows/search/page (`ChecklistPanel.tsx:14–22`). Task reset can fail clearing document storage or finish asynchronously (`checklist-context.tsx:363–401`), whereas Activity reset is invoked immediately by the caller. **Lead/Documents handoff:** review this cross-owner partial-reset ordering as a shared failure-contract concern, not a History implementation proposal. No storage-failure reproduction was performed and no competing shared approval ID is created.

## File coverage and ownership handoff

| Files inspected / boundary | Coverage |
|---|---|
| `pages/loan-history.tsx:1–83`; `components/loan/HistoryContent.tsx:1–397` | Full owned components, static records' shape/count/date/nav values, all branches, controls and derived state. Personal/example record bodies are not reproduced. |
| `App.tsx:1–76`; `main.tsx:1–5`; `replit.md` | Route/provider reachability and constraints; code overrides stale page descriptions in documentation. |
| `components/loan/RoadsDropdown.tsx:1–166` | Entire direct local dependency: upward inline variant, callbacks, event cleanup and shared consumers. Lead owns changes. |
| `components/loan/LoanHeader.tsx:22–208,374–558` | Header mapping and shared actions, tab routing, fixed toolbar integration, admin opening/closing and outside-click lifecycle. Shared display stages/metadata remain unchanged. |
| `contexts/loan-activity-context.tsx:1–177`; `components/loan/LoanActivityPanel.tsx:1–238`; `lib/loan-activity.ts:1–10` | Entire activity model/load/save/filter/sort/reset/display boundary. Shared ownership. |
| `components/loan/ChecklistPanel.tsx:1–185`; `ChecklistActionTimeline.tsx`; `contexts/checklist-context.tsx` | Reachable panel controls, reset/order and keyed provider/document-reset boundary cross-review. Full document-store implementation belongs to Documents; full status machine belongs to lead. |
| `pages/loan-origination.tsx:42–60,109–128`; `pages/loan-decisioning.tsx:43–50,98–112` | Every current field-link destination and initial section selection; downstream form internals are not History-owned. |
| `lib/queryClient.ts:1–57`; `server/routes.ts:190–201`; `server/storage.ts:4–25,105–116`; `shared/schema.ts:20–65` | Loan query/error/cache/shape/storage chain; no History API or schema. |
| `hooks/use-github-sync.ts:32–42`; `components/GitHubSyncPanel.tsx:36–61`; shared report's admin/dependency map | Global request side effects and reachable admin surface. Dialog/primitives/server-sync mechanics rely on lead review, not an independent duplicate audit. |
| `styles/design-tokens.css`; `index.css` entry/base rules; `package.json`; `vitest.config.ts`; `test/setup.ts` | Typography/token sources and test configuration. No token compliance correction, library change or browser visual verification. Third-party implementations not audited. |
| Activity/checklist tests and emitter-test descriptions listed below | Adjacent contract evidence only; no owned History test was found. |

## Tests, verification gaps and limitations

- Whole-tree search for `HistoryContent`, `change-log` and `parseTimestamp` finds the component and its page import, not a dedicated test. No History page test exists in the manifest.
- `components/loan/__tests__/LoanActivityPanel.test.tsx:31–205` asserts four seeds, search exclusions/results/clear/no-results, link presence, newest/oldest and combined filtering/sorting. It does **not** test Change Log, loan queries, field-link routes, persisted malformed records or actual no-op link outcomes.
- `lib/__tests__/loan-activity.test.ts:4–11` checks two en-US display-time examples. It does not exercise History's parser, midnight/noon, equal sort keys, DST or multiple browser time zones.
- `components/loan/__tests__/ChecklistPanel.test.tsx:142–284` includes reset confirmation cancellation and runtime-activity removal while preserving task history; it does not characterize History's unchanged 40 rows. `__tests__/DocumentsContent.test.tsx:139–291` describes activity generation/delivery deduplication/refire/reset, not Change Log writes.
- Shared test setup clears localStorage (`test/setup.ts:1–6`). `vitest.config.ts:7–11` specifies jsdom; `package.json:6–12` has no test script. Lead already measured a failed static baseline (SHARED-012); this report neither reruns nor repairs it and does not claim passing tests.
- No app/browser launch, screenshots, fixture execution, test suite, live API request or performance benchmark was performed. Global provider effects and storage writes make a casual preview inappropriate under the audit's no-real-writes rule. Future screenshots/interactions must use an isolated disposable fixture application with all external traffic blocked.

## Individually approvable recommendations

P2 means bounded correctness/accessibility or maintainability concern. Confidence is in static evidence, not verified production impact. Estimates exclude user acceptance and environment setup.

### HISTORY-001 — Characterize the Change Log independently of Activity

- **Priority / confidence / class:** P2 / high / behavior-preserving test-only candidate.
- **Evidence:** `HistoryContent.tsx:86–164,233–393`; `loan-history.tsx:21–51`; absence of owned tests in the verified manifest; adjacent Activity suite above tests a different view.
- **Observed problem:** No executable guard protects History's peculiar whitespace, reset, date-order, pagination, callback and route contracts. Shared Activity tests cannot prevent these regressions.
- **Suggested change / benefit:** Add dedicated characterization tests with synthetic/sanitized fixtures and mocked network/provider boundaries; no production data/model/markup change. Capture the baseline before any approved refactor.
- **Scope / consumers:** History page and HistoryContent only; tests may mount unchanged RoadsDropdown and safe provider fixtures.
- **Preservation rationale:** Assert existing labels, default rows/order, whitespace behavior, empty footer, no-op behavior and hardcoded route outcomes as they stand. Do not silently encode the proposed fixes below.
- **Risk / dependencies / effort:** Low runtime risk, medium environment risk; coordinate SHARED-012's isolated dependency diagnosis; 0.5–1 day once test tooling is usable.
- **Verification plan:** Assert 20/10/50 sizes and boundary buttons; page reset on search/sort/size; all seven search fields; whitespace-only versus padded query; no-match page 1 of 1; noon/midnight and month/year ordering; callback suppresses default navigation; all six section destinations; delayed loan, 404/500/invalid JSON and successful cached loan. Capture baseline fixture screenshots at 1440×900, 1024×768 and 390×844, panel closed/open and dropdown open. Compare production-file hashes to prove tests did not change app code.
- **Performance:** Not a performance claim.
- **Decision:** Awaiting user approval.

### HISTORY-002 — Separate History's data transforms from rendering

- **Priority / confidence / class:** P2 / high for mixed responsibilities / behavior-preserving internal candidate.
- **Evidence:** `HistoryContent.tsx:6–93,106–164,168–397`. Unused `SECTION_TO_NAV` exists at `:18–25`; actual routing uses entry.navItem.
- **Observed problem:** Static sample data, timestamp parsing, filter/sort logic, pagination and a large styled render live in one file, making isolated tests and future maintenance harder. This is cohesion/testability debt, not a present rendering failure.
- **Suggested change / benefit:** Move the unchanged sample constants and pure parse/filter/sort helpers to History-owned modules, leaving state handlers, navigation and JSX intact. Preserve the distinct Activity implementation. No generic table/component-library replacement or new data source.
- **Scope / consumers:** Only HistoryContent; no shared formatter consolidation in this item. The unused map is not evidence of missing routing and need not be repurposed.
- **Preservation rationale:** Preserve seed order/IDs/strings, copy-before-sort, local-time construction, equal-key behavior, search quirks, memo dependencies, page resets, column dimensions and DOM/test IDs exactly.
- **Risk / dependencies / effort:** Low–medium risk of accidental date/search normalization; depends on approved HISTORY-001 or equivalent pre-change characterization; 0.5–1 day.
- **Verification plan:** Compare all 40 input/output record sequences before/after for both sort directions, each search field, blank/padded/no-match searches and all sizes/pages. Verify native Date rollover/invalid-input behavior is not “fixed” in extraction. Run the same route and focus interactions and compare screenshots/DOM for default, empty, paginated, upward-dropdown and Activity-open layouts.
- **Performance:** Any reduction in repeated work is unmeasured; extraction is not advertised as a speed improvement.
- **Decision:** Awaiting user approval.

### HISTORY-003 — Preserve loan identity in field-link destinations

- **Priority / confidence / class:** P2 / high static / **behavior-changing defect fix; explicit scope exception required**.
- **Evidence:** `HistoryContent.tsx:156–164`; `loan-history.tsx:18–23,73`; contrast `LoanHeader.tsx:90–98`; current server seed restriction `server/storage.ts:24–25`.
- **Observed problem:** A successful History render for any ID other than 1 would still send every default field link to loan 1. Current single-loan server data limits real reachability; no production wrong-loan incident is asserted.
- **Suggested change / benefit:** Only with an approved exception, supply the current route loan ID for fallback navigation, retaining callback precedence, section encoding and Decisioning/Origination distinction. Prevent an unexpected loan switch when additional loan records are supported.
- **Scope / consumers:** HistoryContent and its page; target pages need no rewrite. No exact-field deep linking is included.
- **Preservation rationale:** **Cannot preserve all current outcomes** for non-1 loans; this is not part of HISTORY-002. Loan-1 screenshots and interactions should remain identical.
- **Risk / dependencies / effort:** Medium route/state-boundary risk; user authorization for changed destinations and safe multi-loan fixtures needed; 0.25–0.5 day.
- **Verification plan:** Mount successful loan 1 and synthetic second-loan fixtures, activate every section link, assert exact URL/encoded query and destination section while retaining loan identity. Test callback invocation once with no fallback navigation, browser Back defaults, header tab navigation, and per-loan activity provider remount isolation. Compare loan-1 visuals before/after; second-loan destination is the sole approved behavior difference.
- **Performance:** Not a performance finding.
- **Decision:** Awaiting user approval.

### HISTORY-004 — Make timestamp sorting keyboard-operable

- **Priority / confidence / class:** P2 / high static / **behavior-changing accessibility fix; explicit scope exception required**.
- **Evidence:** `HistoryContent.tsx:237–262`, especially `:255`; sort transition `:151–154`.
- **Observed problem:** Timestamp is a clickable div without keyboard focusability or a key handler. Native keyboard activation cannot trigger this sort control as authored.
- **Suggested change / benefit:** After explicit exception approval, add semantic keyboard-operable sorting with an accessible sort-state announcement while retaining the exact pointer transition and visible column styling. This is one bounded sorting-control change, not a table redesign or shared dropdown replacement.
- **Scope / consumers:** History Timestamp header only. Search labels, pagination labels and shared dropdown keyboard enhancements are separate observations for lead triage, not bundled authorizations.
- **Preservation rationale:** New focus/keyboard/assistive behavior necessarily changes interaction. Exact preservation cannot be claimed; existing mouse behavior, row ordering, pagination resets and all nonfocused visual states must remain identical.
- **Risk / dependencies / effort:** Medium focus/layout risk from semantic markup and browser button defaults; approved keyboard/focus contract and HISTORY-001 characterization needed; 0.5 day.
- **Verification plan:** In isolated fixtures, Tab reaches the control; Enter/Space toggle once and reset page 1; focus remains deterministic; pointer clicks still toggle once; sort state is announced. Compare header/cell alignment, chevron, typography/spacing and layout at all fixture widths. Explicitly approve any new focus appearance rather than hiding it as a refactor.
- **Performance:** Not a performance finding.
- **Decision:** Awaiting user approval.

## Shared-impact notes for the lead

No duplicate shared recommendation is opened:

- **SHARED-001:** History repeats loan type/query/currency setup, but its no-sidebar shell, fixed toolbar and exact loading/error branches must survive any helper extraction.
- **SHARED-009:** General query JSON errors collapse into History's existing generic error message. Do not replace that visible label as part of shared parser cleanup without approval.
- **SHARED-011:** Retain loan-keyed provider remounts, activity-open lifetime, local panel filter lifetime and reset ordering. History's static records must not be merged with runtime Activity during context work.
- **SHARED-012:** Existing validation failure is inherited, not caused by this report. Do not change dependencies or test configuration here.
- **SHARED-014:** Preserve token values, global font behavior and intentional inline structural dimensions. No visual normalization is proposed.
- **Additional cross-review:** Checklist reset can clear Activity even when shared document/task reset fails or is pending, as described above. Lead and Documents should consolidate this evidence before proposing a single shared fix. Shared custom dropdown has no authored Escape/arrow navigation; any cross-page accessibility redesign requires separate decisions.
- **Product boundary, not a fix proposal:** Making Change Log a real field-level audit trail, unifying it with Activity, trimming search terms, adding “no results” text, linking exact fields or activating placeholder buttons all change behavior and are outside this audit's implementation scope.

## Final verification and handoff

Performed read-only source/dependency tracing, whole-manifest hashes and additional-path enumeration. The pre-submission repeat comparison reported 174 matches and no additional included paths. **The latest comparison supersedes that clean-tree conclusion: 173 files match; package-lock.json differs as recorded above; none are missing.** No other baseline source mismatch was found.

The only file intentionally authored by this reviewer is `docs/architecture-audit/history.md`. This is not a claim that the broader submitted diff contains no other changes. Dependency-baseline reconciliation remains a blocker for whole-project preservation sign-off; no lockfile change is authorized or included as an audit recommendation.

Not performed: unit/browser tests, screenshots/visual equivalence, safe runtime fixtures, type-check rerun, production checks, remote access, real storage inspection or measured performance profiling. Static proof and hypotheses are separated throughout; regression/visual plans are prospective, not claimed results.

The existing lead-consolidation task owns approval-register reconciliation, shared reset/accessibility triage and any duplicate resolution. No additional follow-up task is proposed because that downstream work is already planned. Existing audit memory already captures the durable constraints; no memory file is changed under this report-only assignment.
