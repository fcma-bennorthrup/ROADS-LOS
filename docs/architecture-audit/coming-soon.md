# Coming Soon architecture audit

## Status and baseline

Audit only; application behavior, routes and source remain unchanged. The sole owned file is `client/src/pages/loan-coming-soon.tsx`; this report is the only deliverable changed.

Read the lead's `baseline.md`, `coverage.md`, `shared.md` and project instructions in `replit.md`. Compared all **174** manifest rows by byte size and SHA-256 against the local checkout: **0 missing or mismatched files**. Enumerating the included tree with the baseline exclusions found **0 additional first-party files**. The manifest aggregate reference is `ab0f85c1707e2b9355037c78a4d365dddba7e0019bf5559bb40659facabbee92`. No affected review section was blocked by drift. The same comparison was repeated at finalization.

Evidence below is static source evidence, not browser observation. No live requests, sync operations, database writes, package installs, workflow starts, screenshots or runtime tests were performed. This deliberately avoids exercising global providers or reset/sync controls against real state.

## Reachability and responsibility

- `client/src/App.tsx:22–35` registers six concrete loan pages, a root redirect and Not Found. It does **not** import or route this page.
- Repository source search for `loan-coming-soon` and `LoanComingSoon` found only the component's own declaration (`client/src/pages/loan-coming-soon.tsx:15`), not an importer or test. There is no current user navigation path to this component. Unknown loan subpaths are not a Coming Soon route.
- Consequently this module does not currently cause a loan request, render a placeholder, or expose its controls in the routed app. The rendering contracts below describe what its existing code does **if mounted with the requisite providers**, not a feature currently available to users. Import absence is not authorization to remove or activate it, nor a measured bundle-size result.
- The page owns its required `tabName: string` prop, loan-query selection, amount formatting, loading/error branches and centered placeholder. It owns no editor, save/cancel flow, validation form, document, local storage, mutation, effect, timer, sidebar selection or activity event.
- Successful rendering requires query, checklist, activity and GitHub-sync contexts because the shared header consumes them, including the closed sync dialog. `App.tsx:39–72` supplies these to existing routes. An isolated fixture must reproduce safe contexts rather than importing the real app's sync orchestration.

## Complete page contract and edge-state inventory

| Section/state | Exact evidence | Current contract |
|---|---|---|
| Route input | `client/src/pages/loan-coming-soon.tsx:15–21` | `useParams` supplies `id`; missing or empty ID falls back to `"1"`. No ID validation, parsing, trimming or query `enabled` guard. `tabName` does not influence the request. |
| Fetch/cache | Same `:19–21`; `client/src/lib/queryClient.ts:26–57` | Key is `["/api/loans", loanId]`, shared with real loan pages. Global query function joins with `/`, uses credentials, throws on non-OK status, then parses JSON. Infinite stale time; no interval, window-focus refetch or retry. No custom cancellation signal, select transform or page invalidation. Cached data may avoid the initial loading view. |
| Pending | Page `:23–35` | `isLoading` takes precedence. Full minimum-viewport-height centered “Loading loan details...”, `headline-300`, secondary text, page background, `loading-state`. Neither header nor toolbar is mounted. No spinner, skeleton or retry control. |
| Error/absent data | Page `:37–49` | `error || !loan` renders “Failed to load loan data” with error color and `error-state`. It does not expose server error details. Includes 404/500/network/JSON parse failure and falsy data; a failed refetch with retained data still selects error when `error` is truthy. No dedicated empty/not-found screen or recover button. |
| Success shell | Page `:51–81` | `h-screen flex flex-col overflow-hidden`, page background; header, centered flex body with `min-h-0` and **36px bottom padding**, then fixed full-width toolbar at bottom/left with `z-10`. This is not the activity-panel/two-column shell of routed pages. |
| Test ID / heading | Page `:55,66–75` | ID is `loan-${tabName.toLowerCase().replace(/\s+&\s+/g, "-").replace(/\s+/g, "-")}-page`. Heading renders `tabName` verbatim as React text; supporting text is exactly “Coming Soon”. No trimming or general punctuation normalization. Empty string is accepted; strings not matching header tab labels show no selected tab initially. A non-string passed outside the TypeScript contract can throw. |
| Header mapping | Page `:57–67` | Passes loan number, CIF, loan type, primary borrower name, formatted display amount, application type, ECOA/TRID days and active tab. `borrowers` is typed and fetched but never read; the primary name comes from the loan, not a borrower-array lookup. Loan stage is not passed. |
| Amount | Page `:10–13,62` | `parseFloat` then `toLocaleString("en-US", {minimumFractionDigits:2, maximumFractionDigits:2})`, prefixed `$`. No arithmetic or validation beyond formatting. Empty/non-numeric input yields `$NaN`; numeric prefixes are accepted, comma-containing input is only partially parsed, negatives keep the dollar prefix before the minus sign. These are preservation fixtures, not authorized normalization targets. |
| Malformed successful payload | Page `:37,57–67`; `shared/schema.ts:20–65` | The generic is compile-time only; no runtime schema validation. Truthy malformed objects can reach header defaults or invalid amount output. Empty borrowers are irrelevant here. Adding a schema guard would change error/default behavior and requires separate scope approval. |
| Prop/route changes | Page `:16–21,55–75`; `LoanHeader.tsx:84–99` | New ID changes the query key; same-ID tab-name changes reuse data. Heading and root test ID update from the prop, but the header's selected tab is initialized into local state, not synchronized from subsequent props. No production consumer currently drives this transition. Remounting the header resets its local menu/tab state. |

Typography/colors come from existing global CSS and tokens (`client/src/main.tsx:1–6`, `client/src/index.css`, `client/src/styles/design-tokens.css`). The center stack uses `--roads-spacing-component-xs`, `headline-300` and `body-100`; there are no page media queries, responsive JS hooks, images or PDF references. Long headings, small viewports, font loading and zoom have not been rendered; clipping/overlap is a risk to characterize, not a reproduced defect.

## Shared interactions reachable only in a mounted fixture

These contracts are included to prevent a future “shell cleanup” from silently changing behavior. Their implementations and cross-cutting recommendations belong to the lead.

| Dependency | State/actions and limits |
|---|---|
| `client/src/components/loan/LoanHeader.tsx:22–131,211–411` | Eight static stages with Loan Setup active by default; not derived from loan stage. Six tab buttons set internal selection then navigate using a pathname-derived ID, defaulting to `"1"` (`:90–98`), independently of page `useParams`. No `onTabChange` is supplied by this page. Tab strip scrolls horizontally; metadata/chips have their existing wrapping/truncation. TRID chip appears only when checklist Loan Estimate status is `re-fire` (`:86–88,354–368`); ECOA is always shown. |
| Header breadcrumb/actions `:133–208` | Menu/messages buttons have no handlers; Pipeline is text, not navigation. Avatars/team overflow are static. Activity button toggles shared state and its color. **This page never renders `LoanActivityPanel`**, so the state/color can change without showing that panel. Routed Decisioning, Documents and Closing/Booking explicitly render it. This is a source-proven latent mismatch, not a defect observed on a reachable route; mounting a panel would change layout/behavior and is not proposed as an internal refactor. |
| Header more menu `:485–555` | Toggle button opens/closes; outside `mousedown` closes and listener is removed on effect cleanup. Hidden menu remains in DOM with visibility/opacity. No explicit Escape/menu arrow-key handler here. “Prototype Admin Controls” closes menu and opens shared sync dialog. Do not replace these interactions with new library defaults during an extraction. |
| `LoanHeader.tsx:414–483` / `ChecklistPanel.tsx:7–180` | Toolbar has Loan Info, Quick Links, Checklist, Key Dates, Errors; only Checklist has an action, Errors has a static indicator. Checklist toggle changes color; an effect measures button/wrapper positions on open, then renders the panel. No resize listener is supplied. Close unmounts the panel; its one-expanded-task state resets. Progress derives completed task count; expand/collapse shows action timeline. “View Task” stops propagation but does not navigate. |
| `ChecklistPanel.tsx:14–23`; `ChecklistActionTimeline.tsx` | Reset Demo asks for confirmation; cancel leaves state alone. Confirm calls shared reset, clears runtime activities and collapses expansion. Timeline is display-only with complete/blocked/in-progress/re-fire/not-started icons; no actions that advance tasks from this page. No page save/cancel or document-download actions. |
| `client/src/contexts/checklist-context.tsx:168–211,241–285,363–435` | Per-path loan storage identity (fallback `prototype`, unlike page query fallback `"1"`); validated saved statuses, derived task status and persistence effect. Document-history subscription has cleanup; resets can clear closing-package storage and disclosure history, emit toasts on failure, and finish asynchronously. Activity reset in the panel is not awaited on that result. Loan-key changes remount provider state. Preserve this ordering; Documents/lead own reset internals. |
| `client/src/contexts/loan-activity-context.tsx:46–99,119–177` | Loads/filter-validates runtime activity from localStorage, merges seed activity, catches storage errors, persists runtime entries and keys provider by loan identity. Toggle state persists across same-loan tab navigation. No activity panel rendering is added by the provider itself. |
| `client/src/components/GitHubSyncPanel.tsx:36–61`; `client/src/contexts/github-sync-context.ts:11–16`; `client/src/hooks/use-github-sync.ts:32–42` | Closed dialog still consumes sync context. Opening invalidates sync-status and conflicts; status query is enabled only while open. Real App globally queries pending conflicts independently of this page's loan query. Push/pull/conflict controls remain shared external-write surfaces, audited in `shared.md`; none were exercised. Use inert sync mocks for any future placeholder test. |

Native buttons retain their current browser keyboard activation. The placeholder text itself has no focusable actions, live region, autofocus or focus-management effect. No exhaustive focus/accessibility or responsive correctness claim is made. Missing contexts throw from the context hooks on success; mounting the component alone is not a valid integration test.

## Data/API/storage trace

`useParams.id || "1"` → shared query key → default query function → `GET /api/loans/:id` (`server/routes.ts:190–201`) → `storage.getLoan` / `getBorrowersByLoanId` (`server/storage.ts:105–116`) → spread loan plus borrowers JSON → header mapping / pure formatter. Missing loan returns 404; caught storage failure returns 500. Current storage is `MemStorage`, not a live database adapter. Borrower lookup filters the in-memory values; no pagination or separate borrower request is made by this page.

The `Loan`/`Borrower` imports (`shared/schema.ts:20–65`) are type-only at the page boundary. The page introduces no persistence or API mutation. Shared provider persistence and toolbar reset are nevertheless part of its potential interaction surface, so “placeholder” must not be interpreted as “safe to click every control against live state.”

No request counts, timings, bundle analysis or render profiling were measured. The unused borrowers payload and provider rerenders are possible cost considerations only; the unrouted module itself has no demonstrated runtime cost. Do not split the endpoint or shorten cache lifetime to optimize this page without separate cross-page approval.

## Duplication and ownership handoff

1. **SHARED-001** already owns repeated `LoanWithBorrowers`, formatter and query contract. Add this page's `:6–21` as confirming evidence, not a second competing extraction recommendation. Preserve all shell differences and invalid-value formatting.
2. Local `ComingSoon` helpers are **not consumers** of this module: `client/src/pages/loan-origination.tsx:23–41,128`, `loan-decisioning.tsx:25–41,112`, `loan-documents.tsx:19–35,102`, `loan-closing-booking.tsx:25–41,110`. These are inner-body fallbacks, without their own header/query/toolbar. Origination has distinct conditional message strings; Closing/Booking does not apply the ampersand-specific test-ID replacement. Text resemblance does not establish interchangeable contracts. Their owning reviewers decide reachability from their sidebars; do not centralize or delete them here.
3. **SHARED-011** owns repeated identity parsing/provider identity costs. The page's params/default and the header/provider pathname defaults differ; fixtures must retain that difference rather than normalize it.
4. **SHARED-009** owns JSON/HTML error-contract concerns. Coming Soon collapses query failures into its existing generic label; changing server or parser messages must not accidentally alter this branch.
5. **SHARED-012** records the lead's failed static-validation baseline and unrun suite. This reviewer did not rerun that check or infer a new failure. **SHARED-014** owns token drift checks; no visual normalization is proposed.
6. Activity-toggle-without-panel and prop-derived tab selection are shared-header integration observations for consolidation. Neither justifies routing the page, adding panels or synchronizing state under a behavior-preserving refactor.

## Tests and coverage

- No page-specific test or import was found for this module. Its route absence, state branches, required providers, ID defaults and title/test-ID transformation therefore lack direct characterization.
- `client/src/components/loan/__tests__/ChecklistPanel.test.tsx` exercises shared checklist task display, lifecycle/reset behavior; `LoanActivityPanel.test.tsx` tests the activity component, not its absence from Coming Soon. These are shared-unit tests, not evidence of this page's composition.
- `server/__tests__/storage.test.ts:7–26` covers demo identity properties, not HTTP status handling or this page's fetch/render contract.
- `vitest.config.ts:5–17` configures jsdom/aliases/setup; `client/src/test/setup.ts:1–6` clears localStorage between tests. This setup does not mock global network writes automatically.
- No tests were executed. Browser rendering, visual parity, keyboard/focus behavior, package-install reproducibility and production behavior remain unverified. Third-party React Query/Wouter/Radix internals were not audited; conclusions use first-party configuration and call sites.

## Individually approvable page finding

### COMING-SOON-001 — Characterize the retained placeholder without exposing it

- **Classification:** Verification gap / behavior-preserving test-only candidate, not a production defect fix.
- **Priority / confidence:** P3 / high for absent direct coverage and unrouted status; no claim of user harm.
- **Evidence:** `client/src/pages/loan-coming-soon.tsx:15–81`; `client/src/App.tsx:22–35`; `client/src/lib/queryClient.ts:26–57`; `vitest.config.ts:5–17`; source search found no consumer/test of the standalone component.
- **Observed problem:** Future approved shared-shell/query changes could alter the retained placeholder's distinct branches and integration contracts without a dedicated test noticing. Existing shared-unit coverage does not establish this page's behavior.
- **Suggested internal change:** After explicit approval, add an isolated component-characterization fixture and route-absence assertion. Use fake loan responses, disposable query cache, in-memory/disposable storage and inert sync controls. Do not add an app route, modify page markup, repair latent behavior, or use the real global sync hook.
- **Benefit / scope:** Locks down the retained module and informs SHARED-001 verification; affects test infrastructure and this component's test coverage only, not other pages' implementation.
- **Preservation rationale:** Production source and route table stay identical. Tests capture current no-op controls, absent activity panel, invalid formatting and prop-update behavior rather than silently asserting preferred behavior.
- **Risk:** Low production risk, medium fixture-fidelity risk if mocks omit header provider requirements or bypass real loan-query configuration. Avoid freezing incidental third-party implementation details.
- **Dependencies:** Lead consolidation; explicit per-item approval; establish usable locked test environment under SHARED-012. Coordinate, do not duplicate, SHARED-001 fixtures.
- **Effort:** Approximately 0.5–1 day after test environment is available.
- **Specific verification:** In an isolated disposable copy, cover pending → success, pending → 404/500/network/invalid JSON, falsy payload, cached success, refetch-error-with-data, two loan IDs and missing ID. Compare exact text/test IDs, query key/options and header props for known/unknown/empty/ampersand/long tab names and numeric/invalid amount fixtures. Rerender tabName without remounting to record current heading versus selected-tab behavior. With real shared presentation and inert external effects, check tab destinations, no-op menu/messages/toolbar items, activity color without panel, checklist open/close/expand/reopen and confirmed/cancelled reset ordering; stub reset persistence failures rather than touching user storage. Capture before/after fixture images at 1440×900 and 390×844 for loading/error/success, long heading and open checklist; compare layout, fonts, spacing, colors, fixed-toolbar overlap and focus. Assert production route table still excludes Coming Soon and no real network mutation escapes fixtures.
- **Performance label:** No measured performance finding or claimed speed improvement.
- **Decision:** Awaiting user approval.

## Completion boundaries

All owned page sections, direct imports, query/API path and shared interaction boundaries are inventoried above. Deeper sync mechanisms, document-reset implementation, UI wrappers and token governance remain with their assigned shared/Documents owners, not parallel proposals here. There is no recommended removal, activation, redesign, endpoint split or behavior-changing fix.

The existing downstream lead consolidation covers next steps; no overlapping follow-up tasks are proposed. This report and the audit's approval do not authorize implementation. No new durable project-memory entry is needed: preservation/approval constraints are already recorded, and the new observations are derivable from source.
