# Closing and Booking architecture audit

## Status, authority and baseline

Audit only, 2026-10-14. Only this report is changed. No application, configuration, test, style, dependency, asset, storage or external-service changes are authorized or performed. Approval of this report does not approve its recommendations.

Read `baseline.md`, `shared.md`, `coverage.md`, `replit.md` and the audit constraints before review. Compared all **174** manifest paths by byte size and SHA-256 against the local filesystem: **174 match; zero missing or mismatched files**. Enumerating first-party paths using the baseline exclusions found **zero additions**. The comparison was repeated at completion. Baseline aggregate reference: `ab0f85c1707e2b9355037c78a4d365dddba7e0019bf5559bb40659facabbee92`. No affected review section was blocked; no remote or Git-diff substitute was used.

Primary ownership is exactly:

- `client/src/pages/loan-closing-booking.tsx:1–121`
- `client/src/components/loan/ClosingContent.tsx:1–174`
- `client/src/components/loan/BookingContent.tsx:1–114`

All three were reviewed in full. Shared dependencies are cross-reviewed at their consumer boundaries below, not reassigned to this page. Document generation/delivery and borrower disclosure editors belong to Documents, despite their closing-related names.

## Executive assessment

The owned implementation is small and cohesive: a loan-query/shell page selects one of two independent, component-local prototype surfaces. Closing is an in-memory editor; Booking is a timer simulation, not a transaction. There is no evidence warranting a new form framework, generic state machine, service layer or component-library replacement here.

Two individually approvable items are recorded: missing characterization coverage, and the Closing Date input's missing accessible name. The latter is a source-proven accessibility defect, **not** a behavior-preserving refactor. No performance bottleneck was measured. Apparent missing persistence, validation and workflow connections are inventoried as existing prototype behavior, not silently promoted to defects or implementation work.

## Reachability and route boundaries

| Surface | Current reachability and contract | Evidence |
|---|---|---|
| Page | `/loans/:id/closing-booking`, directly or via the “Closing & Booking” header tab. `/` redirects to loan 1's Summary, not this page. | `client/src/App.tsx:22–35`; `client/src/components/loan/LoanHeader.tsx:33–40,63–70,90–98` |
| Closing | Initial sidebar selection on every page mount. The sidebar changes React state, not a URL or query parameter. | `client/src/pages/loan-closing-booking.tsx:20–23,44–49,99–111` |
| Booking | Reachable only by selecting Booking in this page's sidebar; no separate Booking route or deep-link selection is implemented. | Same page, `:99–111`; `client/src/components/loan/SideNav.tsx:15–16,37–57` |
| Local Coming Soon fallback | Selected only if `activeNavItem` is neither Closing nor Booking. Both the initial value and all supplied sidebar values are known, so normal current UI cannot reach it. Preserve the branch; do not route it. | Page `:25–41,46,105–111` |
| Standalone supporting pages | `loan-coming-soon.tsx` and `design-system.tsx` are not imported/mounted by App. The inline placeholder is not the standalone Coming Soon page. App's unmatched route renders Not Found. | `client/src/App.tsx:1–35`; baseline/coverage route map |
| Documents | Header routes separately to `/loans/:id/documents`; this page imports neither `DocumentsContent` nor either closing-document hook. Closing package/disclosure operations are not sections of this page. | `LoanHeader.tsx:63–70`; page `:1–9` |
| Global support | Checklist popup, Loan Activity panel, Prototype Admin Controls and conflict dialog are reachable through shared shell/providers. Their state/API effects can occur while viewing this page but are not caused by Closing Save or Book Loan. | `App.tsx:39–72`; `LoanHeader.tsx:133–207,414–556` |

Header navigation derives the ID from `window.location.pathname`, defaults to `"1"` when absent and navigates to the mapped route. The page separately uses `params.id || "1"`. No navigation guard or unsaved-change prompt exists. Shared loan-keyed providers remount their descendants when the loan key changes, so cross-loan navigation also resets this page's local state (`checklist-context.tsx:421–429`, `loan-activity-context.tsx:162–170`). Do not infer cross-loan draft retention simply because the page itself has no `key`.

## Complete owned behavior inventory

### Query, header and shell

- Query key is exactly `["/api/loans", loanId]`. `getQueryFn` joins it with `/`, sends credentials, throws on non-OK responses, and parses JSON without runtime loan validation. Shared defaults: infinite stale time, no polling, no window-focus refetch, no query/mutation retries (`client/src/lib/queryClient.ts:3–7,26–57`). Cached navigation can avoid a new loading screen; no page-specific invalidation exists.
- `GET /api/loans/:id` retrieves the loan and borrowers, returns 404 for a missing loan and 500 for caught errors (`server/routes.ts:190–201`). `MemStorage` is the active store (`server/storage.ts:105–116`); the database schema supplies compile-time types, not a Closing persistence implementation (`shared/schema.ts:20–65`). No closing date, review flag or booking mutation is connected here.
- Initial loading replaces the entire shell with `Loading loan details...`; error or absent data replaces it with `Failed to load loan data`. There is no retry button, separate 404 view or inline error detail. If a query error coexists with cached loan data, the `error || !loan` branch still wins after loading (`page:52–78`).
- Header receives loan metadata and `activeTab="Closing & Booking"`. Borrowers are part of the response type but unused by this page. Amount transformation is `parseFloat` followed by US currency text with two decimals; malformed numeric strings can produce `$NaN`, and numeric prefixes are accepted. This is SHARED-001's exact-preservation boundary, not permission to normalize values (`page:11–18,87–97`).
- There is no Closing/Booking-specific empty state once a truthy loan is loaded. No page error boundary validates structurally malformed JSON. The query generic does not enforce shape at runtime.
- Shell is `h-screen`, horizontal flex and overflow-hidden; content scrolls vertically with 36px bottom padding. Sidebar is fixed at 240px. Toolbar is fixed across full viewport width, bottom-left, z-index 10; activity is a sibling to the main column and is 280px wide when open (`page:80–119`; `SideNav.tsx:19–35`; `LoanActivityPanel.tsx:26–35`).
- Closing and Booking both use token-based content padding/gaps and headline-200 titles. Closing Date occupies one of five equal flex columns, four intentionally empty (`ClosingContent.tsx:41–80`). There is no owned mobile breakpoint. Narrow-width clipping/overlap is a visual risk to inspect, not an observed browser defect.

### Closing Details editor

| State/action | Exact current result |
|---|---|
| Mount | Empty date, unchecked “Pre-closing review complete”, not editing; both inputs disabled, only Edit shown. |
| Edit | Snapshot current fields to `savedFields.current`, set editing true; date and checkbox enabled. Replace Edit with Discard Changes and Save Changes. |
| Type date / toggle checkbox | Immediately update local `fields` through functional state update; no request, storage write or checklist/activity event. |
| Save Changes | Copy fields to the ref, leave edit mode. No validation, async wait, confirmation, toast or failure state; arbitrary/empty date strings and either checkbox value are accepted. |
| Edit again / Discard Changes | Restore the snapshot captured for that editing session and disable fields. Previously saved values remain for this mount. |
| Switch to Booking | Closing unmounts; both draft **and saved** values are lost without a prompt. Returning creates empty/unchecked state. |
| Leave route / reload / change loan | Component state is recreated on remount; no persistence contract exists. |
| Checklist Reset Demo | Closing does not consume the checklist reset version; if still mounted, Closing fields and editing mode do not reset through that broadcast. |

Evidence: `ClosingContent.tsx:5–39,66–108,112–169`; page `:105–111`. No `<form>`, submit handler or explicit Enter-to-save behavior exists; ordinary native button activation remains applicable. Checkbox is nested in its visible label. Closing Date is a sibling span rather than a programmatic input label (CLOSING-BOOKING-002).

### RoadsDatePicker dependency

`client/src/components/loan/RoadsDatePicker.tsx:13–58,60–160` is shared with other consumers; do not substitute `components/ui/calendar.tsx` for the actual direct DayPicker dependency.

- Controlled text input forwards strings without validation. Focus opens the calendar when enabled; calendar button toggles it. Disabled state disables both controls and closes any open popover through an effect.
- Parses with date-fns `MM/dd/yyyy`; invalid text yields no selected calendar date. Selecting a day formats the same pattern, changes the text, closes and focuses the calendar trigger. `undefined` selection does nothing. Clearing text directly is permitted.
- Calendar grid disables Saturday/Sunday only. Typed weekend, malformed and past values are not blocked by the input or Save. No minimum/maximum date rule is provided.
- Outside `mousedown` closes without requested focus restoration. Escape closes and focuses the trigger. Listeners are attached only while open and removed by cleanup. No focus trap or blur-to-close logic is implemented locally.
- The calendar is an absolute-positioned dialog below the field, z-index 50. Button has “Open calendar”, expanded and dialog-haspopup attributes; dialog has “Date picker”. The text input has no accessible naming prop/attribute.
- No controlled displayed-month prop is passed. Actual month navigation, selected-month positioning, third-party keyboard behavior and CSS compatibility require a browser fixture using the locked dependencies. SHARED-012 already records the calendar typing/version discrepancy; this audit does not assert the runtime calendar is working or broken.

### Booking simulation

| State/action | Exact current result |
|---|---|
| Idle | Booking title and enabled-looking Book Loan button; neither status nor confirmation. |
| Click Book Loan | Set state to `booking`; schedule a 5,000ms timeout. No loan ID, form value or review completion is checked. |
| In progress | Show `Booking Loan` plus a child ellipsis cycling 1 → 2 → 3 → 1 dots every 400ms. Button stays focusable: `aria-disabled=true` and not-allowed cursor, **not** native `disabled`. Handler guards further activation while state is booking. |
| Completion | Callback uses the current local clock, stores a formatted timestamp and sets `booked`. Status disappears; `Loan successfully booked: …` appears. Timer duration is scheduled, not guaranteed wall-clock accuracy in background tabs. |
| Book again | Allowed from booked state. Old confirmation is hidden while booking, then replaced with a new completion timestamp. |
| Leave Booking before completion | Unmount cleanup clears the timeout; ellipsis cleanup clears its interval. Return starts idle, not resumed. |
| Leave after completion | Confirmation is lost on unmount; no persistence, server mutation, stage progression or activity/checklist update. |
| Reset Demo while mounted | No reset subscription; current booking state/timer continues. |

Evidence: `BookingContent.tsx:3–49,68–110`. Timestamp is local `MM/DD/YYYY hh:mm AM/PM`, with padded month/day/hour/minute, 12-hour midnight/noon handling, no seconds/timezone (`:18–29`). It is intentionally different from shared activity timestamp formatting; unifying formatters would alter output. No booking failure/cancel button/empty-document state exists. Successful text is simulated success, not proof of a backend operation.

## Shared integration and transitive coverage

Paths below are workspace-relative; grouped shared modules remain lead-owned. This is source/boundary coverage, not a claim of exhaustive third-party internals or runtime verification.

| Files / evidence | Closing/Booking-specific coverage |
|---|---|
| `client/src/App.tsx:22–72`, `client/src/main.tsx:1–5`, `client/src/contexts/github-sync-context.ts` | Entry, router and query/tooltip/toast/sync/activity/checklist providers. Providers run even when page returns loading/error. No new artifact or route is necessary for this documentation task. |
| `client/src/components/loan/LoanHeader.tsx:22–48,84–127,133–207,374–556` | Static eight-stage stepper (Loan Setup active, not derived from booking); metadata/chips; six navigation tabs. TRID chip depends on Loan Estimate re-fire status. Menu and messages are placeholders; activity toggle works; More Options opens admin controls with outside-click cleanup. Toolbar items other than Checklist are no-ops, including Errors with its indicator. |
| `client/src/components/loan/SideNav.tsx:1–63` | Supplied Closing/Booking values replace Origination defaults; native buttons, active font weight, no URL serialization or aria-current. Selecting current item retains mounted content. |
| `client/src/components/loan/ChecklistPanel.tsx:7–23,25–184`; `ChecklistActionTimeline.tsx` | Checklist toggle mounts/unmounts popup; expansion is local, one task at a time. Timeline displays statuses, not workflow actions. “View Task” stops propagation without navigation. Confirmed Reset Demo resets tasks and runtime activity; cancel does nothing. Position measured only on open in `LoanHeader.tsx:420–426`. Neither local page surface completes checklist actions. |
| `client/src/contexts/checklist-context.tsx:159–211,241–436` | Loan-keyed localStorage with validated status values/fallback; derivation precedence complete → blocked → re-fire → in-progress → not-started. Completion advances next action, full re-fire tasks preserve downstream re-fire. Persist failures swallowed; reset may fail with toast or complete asynchronously. This page only consumes via shell. |
| `client/src/lib/closing-disclosure-history.ts:25–101`; `client/src/lib/closing-package-progress.ts:1–34` | Transitive checklist reset dependency: per-loan history envelope/legacy-array reading, reset tokens/scopes, local and cross-window events with cleanup; optional Web Locks and storage failures. Package key removal and disclosure reset affect Documents, not local Closing/Booking state. Full document editor/progress audits belong to Documents. |
| `client/src/contexts/loan-activity-context.tsx:46–99,112–176`; `client/src/components/loan/LoanActivityPanel.tsx:5–24,26–238` | Per-loan saved runtime items plus seed items; invalid entries filtered, IDs deduplicated; storage failure fallback. Closed initially. Open state survives same-loan tab changes; local panel sort/search survive closing/reopening and sidebar changes while mounted, but reset on route remount. Title/description search trims/case-folds, date sort newest/oldest, clear-search and “No results found”; document/credit buttons are no-ops. |
| `client/src/hooks/use-github-sync.ts:32–158`; `client/src/components/GitHubSyncPanel.tsx:36–220`; `client/src/components/ConflictResolutionDialog.tsx:143–240` | App-mount pending-conflicts GET; admin-open invalidation and enabled sync-status GET; manual refresh, commit-message state, pending-disabled push/pull/force buttons, conflict resolution/dismiss flows. These are real potentially destructive endpoints, unlike Book Loan. Shared response parser/query client/toasts mediate errors. No admin action was executed. |
| `client/src/hooks/use-toast.ts`; `client/src/lib/github-response.ts`; `client/src/components/ui/{avatar,button,badge,dialog,input,scroll-area,tabs,textarea,toast,toaster,tooltip}.tsx`; `client/src/lib/utils.ts` | Transitive shared shell/admin primitives and notification boundary identified through import map. Utility class composition and Radix wrappers remain unchanged. Detailed shared UI/sync recommendations are SHARED-owned; no replacement or independent rewrite is proposed. |
| `client/src/index.css`; `client/src/styles/design-tokens.css`; `client/src/lib/design-tokens.ts`; `tailwind.config.ts`; `client/index.html` | Global style/token/font dependency fingerprints verified. Owned components consume CSS tokens and classes rather than TS token exports. Preserve widths, gaps, disabled treatments, native checkbox, fixed toolbar, calendar layering and external font loading. No visual parity claim. |
| `client/src/lib/queryClient.ts:1–57`; `server/routes.ts:190–201`; `server/storage.ts:105–116`; `shared/schema.ts:20–65` | Complete owned loan-read chain; no closing-write API. Other server sync routes/adapters and global response logging are lead-reviewed, not exercised here. |
| `package.json`, `package-lock.json`, `vitest.config.ts`, `client/src/test/setup.ts`, `tsconfig.json`, `replit.md` | Dependency/tooling baseline and project instructions inspected/referenced. Library internals excluded by baseline; test setup clears localStorage. Documentation's older page descriptions do not override current routes. |

### Costs and lifecycle assessment

The owned page adds one query observer, small state objects and a timeout/interval only while Booking is active. The ellipsis interval updates its own child, not parent state every 400ms. Timer and date-picker document-listener cleanups exist. No owned render-triggered requests, polling, persistent event subscriptions or mutation retries were found.

State snapshots and formatter work are small; extraction solely for speed is unsupported. Shared context identity, activity sorting/filtering, popup positioning and date parsing may cause work on rerenders, but no timings/render counts/network traces were measured. SHARED-011 covers provider optimization hypotheses. The five-second booking wait is explicitly programmed prototype behavior, **not measured backend latency** and not an optimization target.

## Tests and evidence limits

- Search across `client/src` test files found **no direct references/tests** for `ClosingContent`, `BookingContent`, `RoadsDatePicker` or the closing-booking route. Coverage matrix likewise assigns no owned test files here.
- `client/src/components/loan/__tests__/ChecklistPanel.test.tsx:142–303` covers approved task names/status displays, re-fire/normal advancement and Reset Demo cancel/confirm paths; its harness does not mount this page.
- `client/src/components/loan/__tests__/LoanActivityPanel.test.tsx:31–210` covers search, removed seed items, retained action labels, clear/no-results, sort and combined filtering. It does not prove Closing/Booking produces (or does not produce) events.
- `client/src/components/loan/__tests__/ProductPricingContent.test.tsx:112–241` is a neighboring workflow/header consumer test, not a Closing editor/calendar test. `server/__tests__/storage.test.ts:7–26` checks seed identity stability/UUID behavior, not this page's HTTP/error states.
- Document tests including `ClosingDocumentsContent.test.tsx`, `ClosingPackageProgress.test.tsx`, disclosure tests and hook tests exercise the **Documents** workflow. Similar filenames are not evidence of Booking simulation coverage.
- No test suite, type check, build, runtime server, screenshot, browser flow, storage mutation or API request was run for this audit. The lead's existing failed non-emitting type-check result is inherited as SHARED-012, not represented as a new result or a passing baseline.
- Screenshots against the live preview would not be a safe isolated-fixture check: the App mounts shared providers/storage effects and an administration query. Visual, keyboard, responsive, timezone and browser-timer observations remain unverified. Source establishes intended code paths; it does not establish actual DayPicker-version compatibility or production behavior.

## Individually approvable recommendations

### CLOSING-BOOKING-001 — Characterize existing editing, simulation and navigation contracts

- **Priority / confidence:** P2 / high. Verification/maintainability gap; not a proven runtime failure.
- **Exact evidence:** `client/src/pages/loan-closing-booking.tsx:44–78,99–118`; `client/src/components/loan/ClosingContent.tsx:10–39,112–169`; `client/src/components/loan/BookingContent.tsx:5–49,70–109`; `client/src/components/loan/RoadsDatePicker.tsx:18–58,74–155`; absence of matching owned test references as recorded above; `vitest.config.ts:1–19`, `client/src/test/setup.ts:1–6`.
- **Observed problem:** The subtle save/discard snapshots, unmount reset, timer cleanup, repeat booking and aria-disabled semantics have no direct regression protection. A conventional “cleanup” that hoists state, uses native disabled or persists saved data would change current interaction.
- **Suggested internal change:** Add tests only, using disposable browser storage, intercepted API fixtures and fake clock/timers. Characterize today's behavior before any production refactor. Add no services, validation, persistence or wiring.
- **Benefit / affected consumers:** Makes the page's prototype contracts explicit and guards later edits; covers both owned sections plus the actual shared picker/router integration. Shared provider tests should be reused, not duplicated as a competing infrastructure suite.
- **Behavior preservation:** Test-only candidate; production DOM, styles, timer durations, query options and outputs must remain identical. Tests should explicitly expect lost saved fields on section remount and re-booking to remain allowed.
- **Risk:** Medium risk of brittle timezone/timer assertions or false confidence from mocked calendars/providers. Keep one isolated integration fixture with actual providers/calendar after dependency baseline is established. Never mount against real administration endpoints.
- **Dependencies:** SHARED-012's reproducible test environment, SHARED-001/-011 consolidation boundaries; synthetic loan responses and request interception.
- **Effort:** 1–2 engineering days including isolated visual capture setup.
- **Specific verification:** Exercise every editor row and Booking transition above; assert no owned network/storage/activity/checklist side effects; fake-clock 4,999/5,000ms boundary, 400ms dots, noon/midnight, repeated activation and mid-timer unmount. Cover slow/success/404/500/invalid-JSON/no-data query fixtures and cached return; sidebar versus top-tab/loan-ID remounts; Reset Demo independence. Capture before/after identical fixture images at 1440×900, 1024×768 and 390×844 for read/edit/calendar and idle/booking/booked states, activity open/closed and checklist open; assert exact labels, spacing, overflow, controls and focus sequence. Keep loading/error text identical.
- **Performance:** No measured improvement claimed; fake timers prove scheduling/cleanup, not runtime speed.
- **Decision:** Awaiting user approval.

### CLOSING-BOOKING-002 — Name the Closing Date text input for assistive technology

- **Priority / confidence:** P2 / high static confidence; accessibility defect, assistive-technology impact not runtime-tested.
- **Exact evidence:** `client/src/components/loan/ClosingContent.tsx:66–74` renders a sibling span; `client/src/components/loan/RoadsDatePicker.tsx:6–13,74–92` provides neither input ID/label binding nor aria-label/labelledby. The calendar button's name at `:100` names the button, not the text field.
- **Observed problem:** The visible Closing Date text is not programmatically associated with its input. The test ID is not an accessible name.
- **Suggested change:** Only with an explicit accessibility behavior exception, let the shared picker accept an optional input naming reference and bind the existing visible Closing Date span via `aria-labelledby`. Retain its element, styles, text, layout and all date-handling logic. Do not bundle calendar validation or library upgrades.
- **Benefit / affected consumers:** Makes the current date input identifiable to assistive technology. Owned caller plus the shared picker interface; coordinate with lead and Origination's picker consumer so their behavior is not silently changed.
- **Behavior preservation:** Visual/pointer behavior can remain identical, but the accessibility tree and screen-reader output intentionally change. **Not eligible as a strictly behavior-preserving internal refactor; separate scope exception required.**
- **Risk:** Low–medium: duplicate IDs, changing other callers' accessible names, or inadvertently changing label click/focus behavior. Optional prop with a unique stable reference avoids forcing shared consumer changes.
- **Dependencies:** Lead ownership approval of the shared control; isolated real-picker fixture and SHARED-012 dependency diagnosis. No dependency on implementing CLOSING-BOOKING-001, though its fixtures would help.
- **Effort:** 0.25–0.5 day plus assistive-technology verification.
- **Specific verification:** Before/after accessibility-tree assertion proves only this textbox gains “Closing Date”; native checkbox and calendar names unchanged. Compare screenshots in disabled/edit/calendar-open states; keyboard through Edit/input/calendar/checkbox/Discard/Save, Escape restoration, outside click, save/discard and weekday selection. Check another shared picker consumer with no new prop is unchanged. Explicitly retain acceptance of typed invalid/weekend strings.
- **Performance:** Not a performance recommendation.
- **Decision:** Awaiting user approval.

## Shared-impact handoff (references, not competing approvals)

- **SHARED-001:** Repeated query/type/currency formatting applies here; preserve `$NaN`, numeric-prefix behavior and this page's shell/error defaults. Do not merge the Booking timestamp into unrelated activity formatting.
- **SHARED-011:** Provider remounts enforce loan separation and reset local page state. Memoization or provider extraction must preserve that boundary and the distinction between page-local drafts and loan-persisted checklist/activity state.
- **SHARED-012:** Actual `RoadsDatePicker` depends directly on DayPicker and carries the flagged classNames compatibility issue. A library/version fix is shared and needs Closing edit/calendar verification, not a second local proposal.
- **SHARED-002–010:** Admin UI and pending-conflicts query are reachable from this route. The lead's sync selection, failure, concurrency, authorization, logging, error parsing and memoization findings apply transitively; do not test them via live controls or confuse them with the inert booking simulation.
- **SHARED-014:** Preserve exact emitted token/style behavior, not merely nominal token names. No styling correction is authorized.
- **Documents boundary:** Global checklist reset calls the document progress/history storage interfaces. Closing Save does not complete “Pre-Closing Review”; Book Loan does not require/send a Closing Package. Connecting any of these would be a feature/outcome change. Global reset's asynchronous/failure ordering belongs to shared/Documents consolidation, not an independent Closing rewrite.

## Final regression and approval boundary

The per-item plans above must run in an isolated disposable copy with synthetic loans, empty/disposable storage, fixed timezone/clock and all external transports blocked or faked. No screenshot or test result is claimed now. Preserve deliberate absence of functionality as carefully as active controls: no new dirty guard, date validation, booking failure path, native-disabled button, backend save, checklist completion, activity emission, resumed timer, section deep link or persistent draft.

Before approval, the lead should reconcile this report with the shared and Documents/Origination reports, retain both item decisions individually, and distinguish the accessibility exception from tests-only work. The existing downstream lead-consolidation task covers this handoff; no duplicate follow-up tasks are proposed. No durable memory update is needed: the standing audit constraints are already recorded, and this report's source-derived observations belong here rather than in memory.
