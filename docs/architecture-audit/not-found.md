# Not Found architecture audit

## Baseline and scope

Audit only; no application changes or implementation approvals. Source of truth is the current local tree, not GitHub. Read the lead's `baseline.md`, `coverage.md`, `shared.md`, project instructions in `replit.md`, and audit constraints before review.

- Compared all **174** manifest files by raw-byte SHA-256 and size: **0 missing, 0 mismatched**. Enumerated first-party paths using the baseline exclusions: **0 additions**. Repeated the comparison at finalization with the same result.
- Reference: baseline captured 2026-10-14T19:56:49.831770+00:00, aggregate `ab0f85c1707e2b9355037c78a4d365dddba7e0019bf5559bb40659facabbee92`.
- No review section blocked by baseline drift. Line references below refer to that matching snapshot.
- Owned source: `client/src/pages/not-found.tsx`, all 21 lines. Shared router/providers/styles/server boundaries are reviewed for their effect on fallback behavior; recommendations for them remain with the lead.
- Only this report is written. No source, tests, styles, dependencies, configuration, assets, storage or external services were changed.

## Current visible and interaction contract

| Section | Exact source evidence | Contract to preserve |
|---|---|---|
| Outer canvas | `client/src/pages/not-found.tsx:6` | Full-width, minimum viewport-height flex container, vertically/horizontally centered contents, fixed `bg-gray-50`. No loan header, sidebar, toolbar or activity panel is rendered by this page. |
| Card | `client/src/pages/not-found.tsx:7–8`; `client/src/components/ui/card.tsx:5–18,59–65` | `w-full max-w-md mx-4`; shared card adds `shadcn-card rounded-xl border bg-card border-card-border text-card-foreground shadow-sm`. Content adds `pt-6` to the shared `p-6 pt-0` through `cn`. Preserve the merge order, not just the class list. |
| Heading row | `client/src/pages/not-found.tsx:9–12` | Flex row, `mb-4 gap-2`; Lucide `AlertCircle` has `h-8 w-8 text-red-500`; literal H1 **404 Page Not Found**, `text-2xl font-bold text-gray-900`. Icon is not a button and has no click handler. |
| Explanation | `client/src/pages/not-found.tsx:14–16` | Literal **Did you forget to add the page to the router?**, `mt-4 text-sm text-gray-600`. Developer-facing wording is baseline, not permission to rewrite it. |
| Responsive/theme/font behavior | Same JSX; `client/src/index.css:21–23,61,112–114,163–170`; `tailwind.config.ts:4–24,113–126`; `client/index.html:5–10` | No page-specific breakpoint branches. Width cap/margins/flex wrapping govern narrow layouts. Inherits Source Sans Pro with sans-serif fallback; shared card colors can change under `.dark`, whereas page gray/red classes remain fixed. Do not normalize these differences. External font loading can change wrapping. |
| Keyboard and accessibility | `client/src/pages/not-found.tsx:4–21`; `client/index.html:2,5,10` | One native H1 followed by a paragraph; no page-local focusable elements, links, recovery button, `main` landmark, live region, `tabIndex`, focus effect, or title update. Document retains the application title and English language. Actual SVG semantics come from Lucide, not an explicit page `aria-label`/`aria-hidden` prop. Screen-reader announcement, zoom behavior and focus after route transitions are unverified. |
| Actions and local states | Entire owned file | No props, hooks, state, effects, validation, data transforms, network calls, storage calls, loading/empty/error branches, editing/save/cancel flows, timers, or assets. All unknown paths render the same text; pathname is not interpolated. Browser Back/Forward and address-bar navigation are the available recovery mechanisms, not page-owned handlers. |

Absence of a recovery link, route announcement, landmark or dynamic title is a static observation, **not a proven user-facing defect** or an approved accessibility fix. Adding them changes the interaction/assistive-technology contract and requires separate scope approval. No visual or accessibility pass was performed.

## Reachability and route transitions

`client/src/App.tsx:22–37` places the pathless fallback last in Wouter's `Switch`. There is no separate `/404` route or Not Found redirect, and the fallback itself does not replace the URL.

| Entry/state | Static route result / boundary |
|---|---|
| `/` | Explicit Redirect to `/loans/1`, not Not Found (`App.tsx:25–27`). Preserve Wouter's existing history behavior; push/replace behavior was not browser-tested. |
| `/loans/:id` | Summary, regardless of whether that ID exists. A missing loan is a data error in that page, not this fallback (`App.tsx:33`; `client/src/pages/loan-summary.tsx:18–47`; `server/routes.ts:190–201`). |
| `/loans/:id/origination`, `/decisioning`, `/closing-booking`, `/documents`, `/history` | Five explicit section routes before Summary (`App.tsx:28–32`). Their internal sections are not additional router entries. |
| Unmatched pathname, e.g. `/unknown`, `/loans`, `/loans/1/unknown`, `/404` | Pathless Not Found branch, subject to Wouter matching semantics; examples are static expectations, not executed assertions. |
| Design System / standalone Coming Soon | Source files exist but neither is imported or registered by App. Their names are not routable URLs; guessing `/design-system` or `/loan-coming-soon` should reach fallback. Do not mount or delete these pages. Their source audits belong to their assigned reviewers. |
| Query/hash, trailing slash, case, encoded segments, repeated slash, extra suffix | Page does not inspect any of these. Precise matching/canonicalization is delegated to Wouter/browser behavior and needs characterization before router work. No claim of testing these edge cases. |
| Enter fallback from a loan route | Loan page unmounts; global AppContent, Toaster and conflict dialog remain outside the route branch. Provider key behavior below determines which browser-local state remounts. |
| Return to a loan route / browser Back and Forward | Router selects the destination page, whose own queries/loading/error behavior resumes. Fallback contains no reset/redirect code. Loan state is not necessarily preserved in memory across this trip; persistence/remount rules must be retained. |
| Hard-load an unknown URL | SPA serving boundary, not an HTTP 404 implementation. `server/index.ts:62–84` registers API routes before fallback; `server/vite.ts:34–55` returns transformed HTML with status 200, and `server/static.ts:13–18` sends index.html without setting a 404. Actual published proxy behavior is unverified. |

Unknown API paths and HTML/JSON error interpretation are **SHARED-009**, not a competing page recommendation. A heading containing “404” does not establish an HTTP status code.

## Shared dependencies, state and side effects

### Startup and direct dependency closure

`client/src/main.tsx:1–5` mounts App and imports global CSS. The owned page imports only Card/CardContent and Lucide. Card's sole local dependency is `client/src/lib/utils.ts:1–6`: `clsx` followed by `twMerge`. The unused CardHeader/CardTitle/CardDescription/CardFooter exports (`card.tsx:20–57,67–85`) do not render here. The explicit native H1 must not be replaced with CardTitle (a div) as a supposedly invisible cleanup.

External React, Wouter, Lucide, Tailwind, Radix and query-library contracts are represented by the fingerprinted `package.json` and `package-lock.json`. Third-party internals are outside the baseline review; precise library-generated DOM is not asserted as observed. Static imports in App include all loan pages, so this is not an independently loaded error bundle. No bundle-size or render-cost measurement was taken.

### Global requests and overlays

- `client/src/App.tsx:39–72` keeps QueryClientProvider, TooltipProvider, Toaster, GitHubSyncContext, LoanActivityProvider and ChecklistProvider active on fallback. `client/src/components/ui/tooltip.tsx:8` aliases Radix's provider; the fallback creates no tooltip trigger/content.
- `client/src/hooks/use-github-sync.ts:32–42` subscribes to `/api/github/conflicts` even here. A cold cache can cause a credentialed GET through `client/src/lib/queryClient.ts:26–57`. There is no polling, retry or window-focus refetch; stale time is Infinity. Cache state/invalidation matters, so “every visit performs a request” would be inaccurate.
- Query loading/failure does not replace fallback content. Pending conflicts only update a context boolean (`use-github-sync.ts:158`), with no consumer in Not Found. Initial pending conflicts do **not** automatically open the dialog.
- `client/src/components/ConflictResolutionDialog.tsx:142–165` remains mounted as a sibling. Its additional query is enabled only when open without external data. State retained from a previous route or an in-flight sync completion can still expose an overlay: `use-github-sync.ts:44–58,84–99,122–148`. Not Found has no button to initiate sync or open the dialog.
- In that inherited overlay, selected-file/resolution/manual-content state, loading/no-conflicts/conflict branches and resolve/dismiss mutations remain shared behavior (`ConflictResolutionDialog.tsx:148–275`). Resolve POST and dismiss DELETE are not automatic fallback effects and were not exercised. Dialog focus/close behavior comes from the shared Radix wrapper (`client/src/components/ui/dialog.tsx:9–53`); detailed resolution UI belongs to the shared audit.
- `client/src/components/ui/toaster.tsx:12–25,88–100`, `client/src/components/ui/toast.tsx:8–54`, and `client/src/hooks/use-toast.ts:8–9,74–127,175–186` retain global notifications independently of the page. The toast store is module-level, limited to one toast, with delayed removal and subscriber cleanup. An existing toast may remain after navigation. “No page-local focusable elements” does not mean overlays/toasts cannot contain controls.
- Server conflict GET reads pending-conflict state and returns the envelope (`server/routes.ts:621–646`; `server/pending-conflicts.ts:1–41`). No loan GET, repository status request, database read or sync mutation is initiated by the Not Found component. Server synchronization internals remain shared-owned (SHARED-002 through SHARED-010).

### Browser storage and lifecycle

`client/src/contexts/loan-activity-context.tsx:48–99,112–170` and `client/src/contexts/checklist-context.tsx:168–201,241–285,421–429` parse the pathname with `^/loans/([^/]+)` and otherwise use `prototype`. This parsing is independent of successful route matching:

- `/loans/1/unknown` uses loan `1` provider keys even though it renders Not Found. Moving from `/loans/1` to this path retains the keyed provider state.
- `/unknown` and `/loans` use `prototype`. Moving from a loan key to those paths remounts the keyed activity provider and its descendants, reinitializing activity-panel state and checklist state from storage. Moving between arbitrary non-loan unknown paths retains the prototype key.
- Providers load saved state, filter/validate it and persist their resulting activity/checklist values in effects even though Not Found displays none of it. Invalid/unavailable storage is caught with initial-state fallback; subsequent writes are also caught. This is not a storage-free page. No real stored contents were inspected.
- Checklist additionally loads disclosure reset metadata and subscribes while fallback is visible (`checklist-context.tsx:251–270`). `client/src/lib/closing-disclosure-history.ts:25–51,82–101` validates legacy/envelope history, sorts loaded records, listens to storage/custom events, and returns cleanup. Reset/removal events may reset Closing Disclosure actions and increment the demo reset version; disclosure-only resets avoid that broader increment. Invalid history is caught by the provider without adding a fallback-page error message.
- Checklist mutation/reset callbacks (`checklist-context.tsx:287–401`) exist but are not called by Not Found. Closing-package and disclosure write/reset helpers are shared/document-owned and are not page mount mutations. No fallback form or button invokes them.

These are preservation-sensitive seams, not permission to move providers behind loan-only routes. Moving them would change request timing, persistence writes, subscriptions, remount lifetimes and possibly inherited overlay behavior. Provider parsing/identity consolidation is already **SHARED-011**.

## Coverage and associated tests

| Coverage unit | Reviewed boundary / ownership |
|---|---|
| `client/src/pages/not-found.tsx:1–21` | Entire owned file, all sections and absence of local action/state branches. |
| `client/src/App.tsx:1–76`; `client/src/main.tsx:1–5` | Full routing/provider composition and startup; shared-owned. |
| `client/src/components/ui/card.tsx:1–85`; `client/src/lib/utils.ts:1–6` | Full direct local dependency closure. |
| Global CSS, token CSS, Tailwind config, `client/index.html` | Relevant card, body, theme, font, document semantics and utility configuration; lead owns full token/style audit (SHARED-014). |
| GitHub hook/context, query client, conflict dialog, tooltip/toaster/toast/use-toast | Mount/query/state/overlay boundaries described above. Nested conflict controls, response parsing and sync mutations are covered by the shared audit, not independently re-recommended here. |
| Activity/checklist providers, disclosure history subscription | Initialization, validation, writes, pathname keys, reset signals and cleanup traced above; shared/document internals retain their owners. |
| Server startup, static/Vite fallback, conflict GET/pending state, loan GET | HTTP/client-fallback distinction and inherited read dependency only. No service calls or persisted-state inspection. |
| `client/src/pages/loan-summary.tsx:18–47` | Supporting route/data-error distinction; detailed Summary audit remains separately owned. |
| `package.json:6–11`, `vitest.config.ts:1–20`, `client/src/test/setup.ts:1–6` | jsdom setup and localStorage clearing; no package test script. No test harness changes. |
| `client/src/components/loan/__tests__/ChecklistPanel.test.tsx:142–end`; `LoanActivityPanel.test.tsx:31–end`; `client/src/lib/__tests__/loan-activity.test.ts:4–end` | Adjacent tests address checklist actions/reset and activity filtering/sorting/formatting, not App fallback routing. They do not prove fallback provider lifetimes. Shared owner retains those suites. |

Searched test sources for NotFound, not-found, “404 Page”, App mounting and Router usage. No direct Not Found/App route test was found in the manifest. Existing document tests use Wouter wrappers for document flows; that is not fallback coverage.

No tests, build, type check, browser, screenshot, live API probe or performance profiler were run for this report. The lead already records the failing type-check baseline in **SHARED-012**; it is not reported as a newly measured page failure. Runtime checks would require a disposable fixture copy, since even mounting App can write browser storage and issue a conflict GET. No application was changed, so this audit makes no claim of tested visual equivalence.

## Individually approvable finding

### NOT-FOUND-001 — Characterize fallback routing before changing shared infrastructure

- **Priority:** P2. **Confidence:** High for the coverage gap; no user-visible malfunction reproduced.
- **Classification:** Verification/maintainability issue; behavior-preserving test-only candidate. Not a proven routing defect. No measured performance issue or promised speed improvement.
- **Evidence:** `client/src/pages/not-found.tsx:1–21`; `client/src/App.tsx:22–72`; `client/src/contexts/loan-activity-context.tsx:48–51,124–134,162–170`; `client/src/contexts/checklist-context.tsx:168–170,251–285,421–429`; `client/src/hooks/use-github-sync.ts:39–42`; test inventory and search above.
- **Observed problem:** No direct characterization protects the small fallback's route ordering, exact markup or non-obvious global request/storage lifetimes. Adjacent provider tests cannot establish behavior across fallback entry/exit. A plausible provider/router cleanup could change these contracts without an existing test failing.
- **Suggested internal change:** After explicit approval, add narrowly scoped fallback rendering and App route-transition characterization tests with safe fixtures and intercepted network/storage. Keep production component/router/provider code unchanged. Extend shared fixtures if the lead approves them rather than create a competing shared harness.
- **Benefit:** Detect accidental routing, markup, side-effect and remount regressions before approved internal changes merge.
- **Scope / affected consumers:** Not Found plus the shared App boundary and known-route sentinel fixtures. No new route, recovery control, content, validation, status-code change or styling correction.
- **Behavior-preservation rationale:** Tests capture today's implementation, including prototype-key persistence and absence of local actions, rather than encode desired new behavior.
- **Risk:** Low production risk; medium risk of over-mocking Wouter/providers or accidentally exercising live sync. A test that bypasses actual route matching would miss the key contract.
- **Dependencies:** Lead consolidation; SHARED-012's reproducible test environment; coordinate provider fixtures with SHARED-011 and API-fallback fixtures with SHARED-009. No installs are authorized in this audit.
- **Effort:** Approximately 0.5–1 day after test-environment alignment.
- **Specific proof plan:** In a disposable copy, mock all network and external writes; use isolated localStorage, synthetic conflict payloads and a fresh query client per test. Assert literal H1/paragraph, shared Card DOM/classes and no page-owned interactive controls. Exercise root redirect, every known route, missing loan versus unknown path, unknown nested loan path and unrouted support-page names. Characterize query/hash/case/trailing-slash/encoded-segment matching with real Wouter. Exercise loan → same-key unknown path → generic unknown path → loan, plus Back/Forward/reload; assert provider keys, mount/write/subscription cleanup and retained versus reinitialized state. Test empty/cached/failed conflict GET without auto-opening the dialog, delayed synthetic sync completion, and inherited toast/dialog close behavior without any real mutation.
- **Visual/interaction proof:** Capture baseline and candidate fixture screenshots at 1440×900, 768×1024 and 375×812, with fonts loaded and unavailable, light/dark class and enlarged text; compare exact card position, wrapping, spacing, icon, colors and overflow. Check Tab/Shift+Tab, browser navigation and inherited overlay focus restoration. Record existing limitations without silently fixing them. Tests alone do not prove pixels; comparison must use the unchanged baseline.
- **Decision: Awaiting user approval.**

## Shared-impact handoff (references, not competing changes)

| Lead item | Not Found-specific evidence / preservation addition |
|---|---|
| SHARED-009 | A client fallback and HTTP/API fallback are different contracts. Preserve current URL and distinguish unknown-path HTML from loan API not-found JSON. Changing response status or error text needs a scope exception. |
| SHARED-011 | Include unknown nested loan paths and `prototype` paths in provider refactor tests; do not treat absence of loan UI as absence of storage/request/subscription behavior. |
| SHARED-012 | Proposed characterization depends on a trustworthy fixture test environment, not an assumed passing current suite. |
| SHARED-014 | Preserve mixed fixed gray/red utilities and semantic shared card colors. Token normalization would be visible and is not a page recommendation. |
| SHARED-002 through SHARED-010 | Global conflict query/dialog may outlive loan routes. Keep safe mock coverage of inherited overlays; do not add live sync tests to the fallback audit. |

No separate implementation recommendation is made for global request cost, eager imports or provider overhead. Their presence is statically established; whether they matter to users is an **unmeasured performance hypothesis**. The owned page is already cohesive and minimal; no extraction, memoization, component replacement or stylistic rewrite is justified by this review.

## Limits and completion

Static evidence establishes the source contracts, not browser-computed sizes, accessible SVG output, screen-reader announcements, exact history semantics, deployed HTTP behavior or performance magnitude. Those remain explicitly unverified. No proven page-local correctness defect was found.

Approving this audit does not approve implementation of NOT-FOUND-001 or any SHARED item. All current content, styling, navigation, keyboard/focus behavior and workflow outcomes remain unchanged. The already-planned lead consolidation owns prioritization and the final approval register; no duplicate follow-up task is proposed.
