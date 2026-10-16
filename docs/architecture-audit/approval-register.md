# Architecture approval register

Date: 2026-10-14. **All 43 decisions: Awaiting user approval. Nothing implemented.**

Read [final-review.md](final-review.md) for the current lockfile drift, coverage limits, reconciliation and ordering. **173/174 baseline files match; dependency/runtime/visual sign-off is blocked or unverified.** This register is a menu of independent decisions, not an implementation plan already authorized.

## How to read and decide

- **I — internal:** intended to preserve exact appearance and behavior; must prove equivalence.
- **V — verification only:** tests, fixtures, measurement or checking; no production behavior change or automatic repair.
- **X — exception:** behavior-changing defect/security/accessibility work, **outside the current no-behavior-change constraint**. Requires explicit approval of the stated exception and any unresolved product policy.
- P1 = high-consequence risk/reproducibility; P2 = bounded correctness/maintenance; P3 = lower-priority consistency. Confidence describes static evidence, not verified incidence.
- Each heading gives its independently approvable number and stable ID. Original IDs remain traceable through the **Origin** references; their full evidence and state inventories are incorporated, with this register's narrower boundaries taking precedence. There are 40 original findings; SHARED-001 and -011 each split into two, and SHARED-015 consolidates previously unnumbered reset escalations.
- All paths below are repository-relative. To keep entries readable: **P** = `client/src/pages/`; **C** = `client/src/components/loan/`; **H** = `client/src/hooks/`; **L** = `client/src/lib/`; **CTX** = `client/src/contexts/`. These are exact prefixes, not omitted locations.
- Effort estimates are engineering days after approval and usable fixtures; shared setup is not repeated for every item. “Dependencies” means prerequisites only, never implicit approval.

### Mandatory proof contract G (applies to every entry)

Use only an isolated disposable copy with synthetic records, disposable storage/files, fixed clock/timezone, the explicitly accepted dependency snapshot, existing CSS/fonts and blocked/fake external transports. Never mount the live App or call real GitHub/financial endpoints to gather evidence. Tests must assert current behavior, including awkward defaults/no-ops, until an X exception is approved.

For **I**, compare baseline/candidate exact rendered text, DOM order, computed typography/colors/spacing, breakpoints/scrolling, PDF bytes/open arguments, keyboard/focus, loading/error/empty states, query keys/cache/retries, edit/save/cancel, validation, calculations, storage lifetimes, event ordering and outcomes for all affected consumers. Default captures: 1440×900, 1024×768, 390×844, plus listed breakpoint edges; inspect below-fold content and overlays, not just initial viewport. Hold fonts/time/data constant; unexplained pixel or interaction differences fail acceptance.

For **V**, demonstrate tests/measurements against unchanged production-file hashes; no snapshots asserting desired future behavior. For **X**, record the specifically approved before/after difference, compare every unaffected G contract, and do not bundle neighboring defects. Backend-only work compares ordered fake adapter calls and response bytes/statuses plus mocked panel/error screenshots. No runtime, visual, accessibility or performance pass is claimed by this audit.

## Shared proposals

### 01 · SHARED-001A — Share identical loan types and currency formatting
- **Class / priority / confidence:** I / P2 / high. **Origin:** [shared.md SHARED-001](shared.md#shared-001--repeated-loan-page-contracts-and-formatting), corroborated by all seven loan-page source reports.
- **Evidence/problem:** P`loan-decisioning.tsx:11–18`, P`loan-closing-booking.tsx:11–18`, P`loan-documents.tsx:9–17`, P`loan-history.tsx:8–15`, P`loan-summary.tsx:9–16`, P`loan-origination.tsx:14–21`, P`loan-coming-soon.tsx:6–13`: repeated type/pure formatter invite maintenance drift.
- **Change/benefit/scope:** One equivalent type and pure currency helper, no JSX extraction. **Owner:** shared client maintainer; six routed loan pages and retained Coming Soon are consumers.
- **Preservation/risk:** Keep parseFloat/locale/two decimals, `$NaN`, prefix parsing and negative placement; do not merge other date/amount semantics. Medium accidental normalization risk.
- **Dependencies/effort:** G fixtures for all consumers and SHARED-012 environment gate; 0.5–1 day.
- **Proof:** Compare zero/negative/fractional/empty/invalid/prefix strings and all header/ratio amount fields; page loading/error/success screenshots and unchanged props. No speed claim.
- **Decision:** Awaiting user approval.

### 02 · SHARED-001B — Share only the equivalent loan query setup
- **Class / priority / confidence:** I / P2 / high. **Origin:** SHARED-001, query portion; no duplicate page-owned query rewrites.
- **Evidence/problem:** P`loan-decisioning.tsx:44–49`, P`loan-closing-booking.tsx:44–49`, P`loan-documents.tsx:38–43`, P`loan-history.tsx:18–23`; L`queryClient.ts:26–57`: repeated query contract can drift.
- **Change/benefit/scope:** Thin query helper only. **Owner:** shared client maintainer; same seven loan-page consumers as 01.
- **Preservation/risk:** Keep key, credentials, infinite stale time, no retries/focus polling, defaults, observer/mount timing and each page's own branches. Medium risk; no runtime shape validation or generic shell.
- **Dependencies/effort:** All consumer characterization, SHARED-012; 01 only if its type is reused; 0.5–1 day.
- **Proof:** Deferred/valid/falsy/404/500/HTML/cached-plus-error fixtures; assert request counts, exact keys/options, ID changes and absence of header in loading/error. Compare all consumer G states including Origination search and Coming Soon's missing activity panel. No performance promise.
- **Decision:** Awaiting user approval.

### 03 · SHARED-002 — Make sync mechanics testable without changing policy
- **Class / priority / confidence:** I / P2 / high. **Origin:** shared.md SHARED-002.
- **Evidence/problem:** `server/routes.ts:15–153,203–619,648–796`; `server/github.ts:48–201`; `server/conflict-detection.ts:40–192`: route orchestration mixes discovery, planning, writes and metadata.
- **Change/benefit/scope:** Characterize, then mechanically separate injectable filesystem/transport adapters and pure plans. **Owner:** shared sync maintainer; all GitHub routes, admin panel, conflict dialog and inherited overlays.
- **Preservation/risk:** High data-loss risk; preserve existing ordered calls, skips, force behavior, encodings, errors and checkpoint outcomes, including known deficiencies. No helper deletion without caller proof.
- **Dependencies/effort:** SHARED-012 and fake transaction fixtures first; 2–4 days.
- **Proof:** Normal/force push/pull, additions/deletions/binaries/conflicts/partial failure, resolver validation and stale state with disposable paths; exact JSON/call sequence/bytes. G panel/dialog selection, manual edit, cancel/dismiss, loading/error and inherited Not Found overlay. No real sync.
- **Decision:** Awaiting user approval.

### 04 · SHARED-003 — Define consistent sync file eligibility
- **Class / priority / confidence:** X / P1 / high static, incident attribution unverified. **Origin:** shared.md SHARED-003; Documents asset handoff.
- **Evidence/problem:** `server/routes.ts:15–18,43–55,89–131,261–263,322–326,488–526`; `server/github.ts:64–95`: binary, oversized, absent and failed-read files take different paths.
- **Change/benefit/scope:** Approved explicit eligibility/outcome model for status/pull/push/conflicts, protecting document/source sync. **Owner:** shared sync maintainer; all admin consumers and PDF assets.
- **Exception/risk:** Changes eligible files/results; high data-loss/compatibility risk. Binary download, deletion and lockfile inclusion policies must each be explicitly specified; this is not permission to delete PDFs.
- **Dependencies/effort:** 03 fixtures; coordinate 05 and credential policy 08 without bundling approvals; 2–4 days plus recovery design.
- **Proof:** Text/PDF add/edit/delete/both-side change; exact below/above 7 MiB, failed reads, unchanged files and approved exclusions. Assert hash preservation and exact approved result messages plus unchanged G admin views.
- **Decision:** Awaiting user approval.

### 05 · SHARED-004 — Prevent partial sync from claiming a complete checkpoint
- **Class / priority / confidence:** X / P1 / high. **Origin:** shared.md SHARED-004.
- **Evidence/problem:** `server/routes.ts:279–305,349–380,543–545,604–606`; `server/github.ts:77–95,132`: caught/skipped failures may still advance the common ancestor.
- **Change/benefit/scope:** Explicit per-file results and staged/recoverable completion policy. **Owner:** shared sync maintainer; all sync paths and metadata readers.
- **Exception/risk:** Failure/checkpoint/recovery outcomes change; high risk. Successful UI stays exact, but user must approve partial-result and retry semantics.
- **Dependencies/effort:** 03 fixtures, agreed 04 eligibility boundary and 06 snapshot/transaction interface if both approved; 2–4 days.
- **Proof:** Inject permission/null-fetch/upload/network/interrupted-write failures at each stage; assert resulting bytes/checkpoint/conflicts and safe fixture repeats, no blind automatic retry. G unchanged success screens, approved failure differences only.
- **Decision:** Awaiting user approval.

### 06 · SHARED-005 — Keep sync snapshots and stale conflict checks consistent
- **Class / priority / confidence:** X / P1 / high ordering evidence, medium concurrent impact. **Origin:** shared.md SHARED-005.
- **Evidence/problem:** `server/github.ts:204–239`; `server/routes.ts:133–153,258,281,309,704–731`; `server/sync-state.ts:11–31`; `server/pending-conflicts.ts:17–41`: moving-HEAD reads, local writes before stale check, uncoordinated metadata.
- **Change/benefit/scope:** Pin reads, reject stale work before mutations and define serialized/recoverable operation boundary. **Owner:** shared sync maintainer; status/pull/push/resolution consumers.
- **Exception/risk:** High concurrency/crash-recovery risk; changes stale/concurrent outcomes. Retain non-forced remote ref updates and existing path validation.
- **Dependencies/effort:** 03 fixtures and approved 05 recovery interface; 2–4 days.
- **Proof:** Advance fake HEAD between tree/content, detection/resolution and ref update; concurrent/interrupted operations; assert no writes on approved stale rejection and exact successful results. G mocked conflict layout/selection/focus/error.
- **Decision:** Awaiting user approval.

### 07 · SHARED-006 — Establish an authorized admin boundary
- **Class / priority / confidence:** X / P1 / high code evidence; external perimeter unverified. **Origin:** shared.md SHARED-006.
- **Evidence/problem:** `server/index.ts:15–23,36–63`; `server/routes.ts:155–188,254,414,621,654,788–796`; `server/github.ts:5–9`: connector identity is not caller authorization.
- **Change/benefit/scope:** First confirm intended admin roles/perimeter, then design only the approved access boundary. **Owner:** shared security/backend maintainer; all administrative endpoints and header entry.
- **Exception/risk:** High access/lockout risk; login/denial/role behavior changes. No provider installation or assumption of public exposure included.
- **Dependencies/effort:** Explicit access policy and safe fake identities; 1–3 days after policy.
- **Proof:** Allowed/denied identities for every endpoint; denial invokes no filesystem/remote adapter and discloses no conflict content. G authorized panel unchanged; separately approved denied-user text/navigation/focus.
- **Decision:** Awaiting user approval.

### 08 · SHARED-007 — Exclude credential-like files from custom sync
- **Class / priority / confidence:** X / P1 / high selection evidence; no leak established. **Origin:** shared.md SHARED-007.
- **Evidence/problem:** `server/routes.ts:15–25,33–55`; `SETUP.md:45–55`; `.gitignore:1–6`: custom scanner does not inherit Git ignore and can include root dotfiles.
- **Change/benefit/scope:** Approve safe file-selection policy denying credential/runtime names. **Owner:** shared sync maintainer; status/pull/push/force/conflict planning.
- **Exception/risk:** Medium compatibility risk; eligibility changes. No credential-value search, rotation or incident response implicitly authorized.
- **Dependencies/effort:** Agreed include/exclude policy coordinated with 04; 0.5–1 day.
- **Proof:** Synthetic `.env`, `.env.local`, safe dot-config and nested runtime filenames with dummy contents; all sync branches enforce exact policy, safe files preserved. G messages/counts match approved differences.
- **Decision:** Awaiting user approval.

### 09 · SHARED-008 — Stop logging full loan and conflict response bodies
- **Class / priority / confidence:** I / P1 / high. **Origin:** shared.md SHARED-008.
- **Evidence/problem:** `server/index.ts:36–55`; `server/routes.ts:190–201,628–640`: logger serializes response JSON, expanding exposure.
- **Change/benefit/scope:** Allowlisted method/path/status/duration and safe counts, not response bodies. **Owner:** shared backend maintainer; all API endpoints and operational log consumers.
- **Preservation/risk:** Low–medium operational compatibility risk; end-user HTTP/UI unchanged. Confirm support fields/retention; no response redaction included.
- **Dependencies/effort:** Safe log-capture fixtures and operational consumer review; 0.5–1 day.
- **Proof:** Dummy sensitive markers absent from logs; identical HTTP bodies/statuses and timing-independent results. G fake loan/conflict/error screens unchanged. Log-volume benefit is unmeasured.
- **Decision:** Awaiting user approval.

### 10 · SHARED-009 — Define API error responses and parsing consistently
- **Class / priority / confidence:** X / P2 / high static; gateway cause unverified. **Origin:** shared.md SHARED-009.
- **Evidence/problem:** `server/static.ts:13–18`; `server/vite.ts:32–56`; L`queryClient.ts:3–7,40–41`; L`github-response.ts:1–17`; H`use-github-sync.ts:64–80,102–118`; `client/src/components/ConflictResolutionDialog.tsx:186–200`: HTML fallback/direct JSON parsing give differing errors.
- **Change/benefit/scope:** Agree API error contract, then approved JSON fallback/parser behavior. **Owner:** shared API maintainer; every loan query, sync panel and resolver.
- **Exception/risk:** Medium; status/error labels change. This does not repair an unverified gateway cause or authorize retries. Pure message-preserving extraction would need a narrower separate proposal.
- **Dependencies/effort:** Approved statuses/text and fake responses; 1–2 days.
- **Proof:** 200/404/502 HTML, empty/invalid JSON, valid JSON and 409 conflicts; exact approved messages/status, no duplicate mutation, client Not Found distinct from API fallback. G loan generic-error and admin error snapshots.
- **Decision:** Awaiting user approval.

### 11 · SHARED-010 — Memoize diff rows from stable content strings
- **Class / priority / confidence:** I / P2 / high dependency-identity evidence. **Origin:** shared.md SHARED-010.
- **Evidence/problem:** `client/src/components/ConflictResolutionDialog.tsx:60–89,102–140`: new split arrays invalidate memo every render.
- **Change/benefit/scope:** Derive splitting/rows from strings. **Owner:** shared sync-UI maintainer; conflict viewer only.
- **Preservation/risk:** Low; positional line alignment, null/empty behavior, rows/colors/scroll unchanged. No semantic diff replacement or virtualization.
- **Dependencies/effort:** Diff characterization fixtures; 0.25–0.5 day.
- **Proof:** Empty/missing/unequal/long files and selection rerenders; exact rows/DOM/G scroll/focus screenshots. Count computations and measure timings before claiming faster performance.
- **Decision:** Awaiting user approval.

### 12 · SHARED-011A — Extract equivalent loan-key parsing only
- **Class / priority / confidence:** I / P2 / high. **Origin:** shared.md SHARED-011; Origination and Not Found handoffs.
- **Evidence/problem:** CTX`loan-activity-context.tsx:48–51,162–169`; CTX`checklist-context.tsx:168–171,421–429`; C`CollateralContent.tsx:354–359`; C`LoanHeader.tsx:95–97`: repeated pathname parsing with different fallbacks.
- **Change/benefit/scope:** Share exactly equivalent parsing with caller-specific defaults. **Owner:** shared client-state maintainer; all providers/header/Collateral and fallback routes.
- **Preservation/risk:** Medium–high; retain `"prototype"` versus `"1"`, query params versus pathname, storage prefixes, provider keys and remount timing. No reset fix or state migration.
- **Dependencies/effort:** NOT-FOUND-001 and cross-loan/Origination fixtures, SHARED-012; 0.5–1 day.
- **Proof:** Loan A/B, missing ID, unknown nested loan path, generic unknown path, Back/Forward; compare keys, exact storage/event order and saved/local state lifetimes. G panels and reset outcomes unchanged.
- **Decision:** Awaiting user approval.

### 13 · SHARED-011B — Measure provider rerenders before proposing memoization
- **Class / priority / confidence:** V / P2 / high identity evidence, medium benefit hypothesis. **Origin:** SHARED-011, provider portion.
- **Evidence/problem:** CTX`loan-activity-context.tsx:136–155`; CTX`checklist-context.tsx:287–349,404–429`: fresh callbacks/value objects, but material cost unmeasured.
- **Change/benefit/scope:** Profile unchanged providers in isolated fixtures; deliver evidence and, only if justified, a later bounded memoization proposal. **Owner:** shared client-state maintainer; checklist/activity/header and all consumers.
- **Preservation/risk:** No production edits; medium measurement/fixture fidelity risk. Do not change callbacks/subscriptions or repair resets here.
- **Dependencies/effort:** SHARED-012 and shared route/storage fixtures; 0.5–1 day profiling, remediation not estimated.
- **Proof:** Count renders/timing for tab/loan change, checklist/re-fire/reset, document events and Activity toggle; record workload and unchanged G outputs, distinguish measurement from hypothesis.
- **Decision:** Awaiting user approval.

### 14 · SHARED-012 — Establish a reproducible validation baseline
- **Class / priority / confidence:** V / P1 / high drift and historical-check evidence. **Origin:** shared.md SHARED-012 plus four page drift notices.
- **Evidence/problem:** `tsconfig.json:2–17`; `package.json:6–11,82–109`; `client/src/components/ui/calendar.tsx:22,52`; C`RoadsDatePicker.tsx:148`; current `package-lock.json:7864–7865,9809–9810`: prior 66 diagnostic lines and current lock mismatch prevent clean equivalence claims.
- **Change/benefit/scope:** After explicit dependency-baseline choice, reproduce in a disposable environment and classify source/configuration versus installation errors. **Owner:** shared validation maintainer; repository-wide checks.
- **Preservation/risk:** Medium baseline-selection risk. Verification only: no repair, upgrade, test exclusion, casts, baseline overwrite or calendar replacement authorized. Earlier diagnostics are not today's result.
- **Dependencies/effort:** User explicitly chooses authoritative dependency snapshot; authorized isolated setup only; 1–2 days diagnosis, repair separately estimated/proposed.
- **Proof:** Record accepted hashes/runtime/installed versions; run non-emitting check and existing safe tests with blocked external calls, report exact outcomes and unchanged source/lock bytes. Calendar/pull-call fixture evidence before any later repair approval; do not claim a clean pass if errors remain.
- **Decision:** Awaiting user approval.

### 15 · SHARED-013 — Correct setup descriptions without changing runtime
- **Class / priority / confidence:** I / P3 / high discrepancy, medium impact. **Origin:** shared.md SHARED-013 and stale page-doc observations.
- **Evidence/problem:** `.nvmrc:1`; `.replit:1,3–11,42–44`; `SETUP.md:9–10,18,33,45–77`; `scripts/post-merge.sh:4`; `server/storage.ts:116`; `server/routes.ts:12–13`; `replit.md:42–55`; `sedZiKBNa:1–end`: documentation/runtime/source disagree.
- **Change/benefit/scope:** Factual documentation of supported paths, MemStorage, pages and sync policy after owner confirmation. **Owner:** shared documentation maintainer; collaborators/setup readers.
- **Preservation/risk:** Low; no toolchain/config/script changes or unexplained-file removal. No assertion that deployment is broken or repaired.
- **Dependencies/effort:** Owner confirms supported environments; 0.5–1 day.
- **Proof:** Check every documented command against scripts/config/source; application hashes unchanged, hence no UI change. Setup smoke test only if separately authorized, never a publish.
- **Decision:** Awaiting user approval.

### 16 · SHARED-014 — Check intentional token equivalence without normalizing styles
- **Class / priority / confidence:** V / P3 / high multiple-representation evidence. **Origin:** shared.md SHARED-014; design-system.md token observations 1–5.
- **Evidence/problem:** `client/src/styles/design-tokens.css:1–129`; L`design-tokens.ts:1–118`; `client/src/index.css:1–245`; `tailwind.config.ts:1–145`; P`design-system.tsx:8–60,275–307`: catalogs/captions/mappings differ and can drift.
- **Change/benefit/scope:** Read-only check specification/tests for an explicitly approved equivalence map with intentional exemptions. **Owner:** shared design-system maintainer; all styled consumers and dormant showcase.
- **Preservation/risk:** Medium false-equivalence risk. No generation, CSS reordering, caption correction or token additions/removals/edits; those need new proposals and strict token approval.
- **Dependencies/effort:** Approved equivalence map and SHARED-012 if executing checks; 0.5–1.5 days.
- **Proof:** Assert mapped authored values and exemptions, unchanged emitted CSS/order and production hashes. G all shared controls, Documents Sheet/popover, hover/focus/disabled/error and font-loaded/blocked states; DS-001 covers showcase content separately.
- **Decision:** Awaiting user approval.

### 17 · SHARED-015 — Define consistent partial Reset Demo outcomes
- **Class / priority / confidence:** X / P1 / high source ordering, failure incidence unverified. **Origin:** documents.md shared-impact note 2; decisioning.md reset escalation; origination.md and history.md shared-reset handoffs; shared.md SHARED-011 boundary.
- **Evidence/problem:** CTX`checklist-context.tsx:251–270,363–401`; C`ChecklistPanel.tsx:14–22`; L`closing-disclosure-history.ts:54–79`; H`use-closing-package.ts:39–63`: package can be removed before failed/queued disclosure reset while activity clears immediately; mounted state/timers can disagree with storage.
- **Change/benefit/scope:** Agree failure/commit policy, then explicit reset completion/result coordination across checklist, activity and document stores. **Owner:** one shared client-state maintainer; Documents co-reviews storage, Origination/Decisioning co-review reset consumers; all toolbar consumers affected.
- **Exception/risk:** High asynchronous/storage/lifecycle risk; changes partial-failure, pending and possibly notification timing. No claim that localStorage offers a multi-key transaction; design recovery explicitly. Keep disclosure-only reset isolated and Closing/Booking reset-independent.
- **Dependencies/effort:** SHARED-012, shared reset fixtures and approved completion policy; align reset identity with ORIGINATION-003 and document concurrency policies, but no duplicate implementation ownership; 1–3 days after policy.
- **Proof:** Deny package removal; allow removal then reject disclosure write; queue/succeed/fail Web Lock; cancel/repeat reset; unmount/remount; pending package timer; alternate loans. Assert exact storage, tasks, activity, toasts and reset notifications for each step, plus G successful/cancelled reset screens. Approved failure differences only.
- **Decision:** Awaiting user approval.

## Page proposals — internal and verification entries

### 18 · SUMMARY-001 — Protect Summary display and clipboard contracts
- **Class / priority / confidence:** V / P2 / high. **Origin:** summary.md SUMMARY-001.
- **Evidence/problem:** P`loan-summary.tsx:13–116`; C`BorrowerCards.tsx:12–19,124–146`; C`SummaryRatios.tsx:78–108`; no direct tests: mapping/formatting/copy can regress unnoticed.
- **Change/benefit/scope/owner:** Summary maintainer adds safe characterization of the three modules; protects all Summary values, no production changes.
- **Risk/dependencies/effort:** Low runtime, medium mock fidelity; SHARED-012/shared harness; 1–2 days.
- **Proof/preservation:** G plus pending/error/no-data, all 17 rows/order, separate amount fields, null/empty Rule of XX, borrower count/order/primary flags, mailto and clipboard resolve/reject/unavailable/repeated copy. Capture around md/xl with panels and keyboard activation.
- **Decision:** Awaiting user approval.

### 19 · SUMMARY-002 — Name the copy-email button
- **Class / priority / confidence:** X / P2 / high static, assistive output untested. **Origin:** summary.md SUMMARY-002.
- **Evidence/problem:** C`BorrowerCards.tsx:78–85`: icon-only button has no authored accessible name.
- **Change/benefit/scope/owner:** Summary maintainer adds approved nonvisual action name to borrower copy buttons; no tooltip or contact details in name by default.
- **Exception/risk/dependencies/effort:** Accessibility changes; low visual risk, wording/repeated-card distinction needs approval; 18 fixtures useful, not authorization; 0.25 day.
- **Proof:** Accessibility-tree names, unchanged tab order, Enter/Space copies once, success/failure toasts unchanged; G multiple-card screenshots.
- **Decision:** Awaiting user approval.

### 20 · ORIGINATION-001 — Separate borrower presentation modules
- **Class / priority / confidence:** I / P2 / high. **Origin:** origination.md ORIGINATION-001.
- **Evidence/problem:** C`BorrowerInformationContent.tsx:186–506,508–662,665–1164,1166–1238`: unrelated static questionnaires and editor orchestration share a large module.
- **Change/benefit/scope/owner:** Origination maintainer mechanically moves three static questionnaire sections/private display helpers; narrower review surface, Borrower Information only.
- **Preservation/risk/dependencies/effort:** Medium remount/markup risk; retain fixtures, disabled values, dollar adornment, editor state/refs and JSX identities. No universal form primitive. Depends on 21; 0.5–1 day.
- **Proof:** G full upper/lower forms for both borrowers in read/edit; independent drafts across tabs, Save/Discard, sidebar remount, unchanged headings after edits, native DOB and disabled controls.
- **Decision:** Awaiting user approval.

### 21 · ORIGINATION-002 — Characterize every form and section lifetime
- **Class / priority / confidence:** V / P1 / high test-gap evidence. **Origin:** origination.md ORIGINATION-002.
- **Evidence/problem:** P`loan-origination.tsx:42–128`; C`BorrowerInformationContent.tsx:1166–1238`; C`LoanDetailsContent.tsx:114–158`; C`FeesContent.tsx:82–110,161–175`; C`__tests__/CollateralContent.test.tsx:49–201`, `__tests__/ProductPricingContent.test.tsx:112–241`: most form/route paths uncovered.
- **Change/benefit/scope/owner:** Origination maintainer adds characterization across five sections and route; prevents silent changes, production untouched.
- **Risk/dependencies/effort:** Low runtime, medium clock/native-control fidelity; SHARED-012/shared harness; 1.5–3 days.
- **Proof/preservation:** G plus valid/invalid/duplicate search params, all borrower drafts, details strings, fee no-op Save/collisions, split/delete evaluations during edit, all 11 pricing products/rates, lock/cancel/remount, mounted/unmounted reset and PDF args. Use real safe native/Radix fixtures; current defect sequences recorded, not silently corrected.
- **Decision:** Awaiting user approval.

### 22 · ORIGINATION-003 — Prevent historical resets clearing newer section state
- **Class / priority / confidence:** X / P1 / high static, not runtime-reproduced. **Origin:** origination.md ORIGINATION-003.
- **Evidence/problem:** C`CollateralContent.tsx:595–600,616–643`; C`ProductPricingContent.tsx:167–179`; P`loan-origination.tsx:111–127`; CTX`checklist-context.tsx:248–249,377–401`: nonzero version replays on remount.
- **Change/benefit/scope/owner:** Shared client-state maintainer owns reset-consumption interface; Origination maintainer changes its consumers under that owner. Explicit per-loan consumed-reset boundary protects new addresses/relocks, including sections absent at reset.
- **Exception/risk/dependencies/effort:** High; navigation now preserves newer state. Do not merely skip first effect. 21 fixtures and agreed reset identity with 17; implementation of 17 not implicit; 1–2 days.
- **Proof:** Reset→save→Fees→Collateral; reset→lock→Fees→Pricing; reset absent→visit; cancel/repeat, reload before/after, loan A/B, denied storage, asynchronous completion and disclosure-only isolation; exact G state/toasts/checklist.
- **Decision:** Awaiting user approval.

### 23 · ORIGINATION-004 — Keep locked pricing values consistent with lock status
- **Class / priority / confidence:** X / P1 / high static. **Origin:** origination.md ORIGINATION-004.
- **Evidence/problem:** C`ProductPricingContent.tsx:163–171,194–247,409–415,456–475`; P`loan-origination.tsx:117–122`; CTX`checklist-context.tsx:173–194,272–285`: persisted lock flag can describe default remounted terms.
- **Change/benefit/scope/owner:** Origination maintainer retains an approved loan-scoped pricing snapshot; consistent displayed terms, no actual lending-service integration.
- **Exception/risk/dependencies/effort:** High financial-display/storage risk; lifetime and legacy-complete-without-snapshot policy must be approved, never invent historical terms. Coordinate 22/17, depend on 21 fixtures; 1–2 days.
- **Proof:** Nondefault/blank terms, every product, custom expiration, lock unsaved edit, update/reload/remount/loans, corrupt/missing/denied/legacy snapshot; exact rates, buttons, deduped activity and Loan Estimate re-fire. G only approved persistence differences.
- **Decision:** Awaiting user approval.

### 24 · ORIGINATION-005 — Discard unconfirmed date edits when cancelling, if intended
- **Class / priority / confidence:** X / P2 / high source, intended Cancel semantics unresolved. **Origin:** origination.md ORIGINATION-005.
- **Evidence/problem:** C`ProductPricingContent.tsx:170–171,354,515–579,598–615`; C`RoadsDatePicker.tsx:53–57,74–80`: edits update parent date; closing does not restore it.
- **Change/benefit/scope/owner:** Origination maintainer separates draft and confirmed date only if user chooses discard-on-close; prevents retained unconfirmed date.
- **Exception/risk/dependencies/effort:** Medium; Cancel/X/Escape/outside result changes. Keep close-is-retain if intentional. Coordinate 23 snapshot, 21 fixtures; 0.5–1 day.
- **Proof:** Every dismissal, typed blank/invalid/weekend and picked dates, reopen, confirm/update/reset while open; distinguish picker Escape from dialog Escape/focus. G calendars and initial disabled date unchanged.
- **Decision:** Awaiting user approval.

### 25 · DECISIONING-001 — Restore only approved decision display state on return
- **Class / priority / confidence:** X / P1 / high static. **Origin:** decisioning.md DECISIONING-001.
- **Evidence/problem:** C`DecisioningSummaryContent.tsx:16–27,36–42,58–74,122,160–164`; P`loan-decisioning.tsx:105–112`; CTX`checklist-context.tsx:173–200,272–285`: local decision/letter flags reset despite completed checklist.
- **Change/benefit/scope/owner:** Decisioning maintainer initializes/derives display from approved per-loan workflow authority; consistent return/reload. Do not infer pulled credit from approval.
- **Exception/risk/dependencies/effort:** Medium false-restoration/event risk; persistence/credit/reset policy and 28 fixtures; coordinate 27 and shared reset; 1–2 days.
- **Proof:** Each approve/generate/deliver stage then sidebar/route/reload/loan switch, corrupt/denied storage/reset; no extra mount toast/activity, same PDF target/timestamps. G fresh states unchanged, restored states explicitly approved.
- **Decision:** Awaiting user approval.

### 26 · DECISIONING-002 — Keep edits on the intended balance-sheet record after deletion
- **Class / priority / confidence:** X / P1 / high source proof, not runtime-reproduced. **Origin:** decisioning.md DECISIONING-002.
- **Evidence/problem:** C`BalanceSheetSection.tsx:616–619,730–759,780–817,835–850`: edit target uses index, deletion only clears exact same index; deleting earlier row can redirect Save.
- **Change/benefit/scope/owner:** Decisioning maintainer uses approved stable identity or reconciled index; prevents wrong-record overwrite in four categories.
- **Exception/risk/dependencies/effort:** Medium key/draft/ID risk; corrected deletion-during-edit outcome, no confirmation/persistence additions. 28 characterization and chosen identity policy; 0.5–1 day.
- **Proof:** Two/three rows, edit first/middle/last, delete before/after/current/other category then save/discard; assert exact survivor bytes, visible controls, paired-grid empty cells, focus and G menu screenshots.
- **Decision:** Awaiting user approval.

### 27 · DECISIONING-003 — Avoid regressing completed letter generation on approval
- **Class / priority / confidence:** X / P2 / high static. **Origin:** decisioning.md DECISIONING-003.
- **Evidence/problem:** C`DecisioningSummaryContent.tsx:36–43,58–69,142–158`; CTX`checklist-context.tsx:287–301`: approval unconditionally writes generation in-progress.
- **Change/benefit/scope/owner:** Decisioning maintainer retains completed status if user approves monotonic progression; consistent checklist, no button gating/reorder.
- **Exception/risk/dependencies/effort:** Low–medium; out-of-order outcome changes. Agree status semantics with 25 and characterize via 28; 0.5 day.
- **Proof:** All decision/generate/deliver permutations, repeats, complete/blocked/re-fire fixtures, exact event dedupe/timestamp and Loan Estimate guard; G unchanged normal order, buttons and focus.
- **Decision:** Awaiting user approval.

### 28 · DECISIONING-004 — Protect financial drafts, calculations and navigation
- **Class / priority / confidence:** V / P2 / high. **Origin:** decisioning.md DECISIONING-004.
- **Evidence/problem:** C`BorrowerFinancialsContent.tsx:456–524,543–550,618–632`; C`BalanceSheetSection.tsx:770–871`; C`__tests__/DecisioningSummaryContent.test.tsx:19–30,38–211`: financial editors/real route untested.
- **Change/benefit/scope/owner:** Decisioning maintainer adds financial/editor/route fixtures; protects current drafts and calculations without changing production.
- **Risk/dependencies/effort:** Low runtime, medium selector/clock fidelity; SHARED-012/shared harness; 1–2 days.
- **Proof/preservation:** G add-then-discard retained rows, switch editor/tab, household-like balance state, invalid numeric strings, totals recalculated only Save, independent drafts, empty/unequal columns, reset isolation, remount and query errors. Record known defects separately from desired expectations.
- **Decision:** Awaiting user approval.

### 29 · DECISIONING-005 — Share only balance-menu lifecycle
- **Class / priority / confidence:** I / P3 / high duplication evidence. **Origin:** decisioning.md DECISIONING-005.
- **Evidence/problem:** C`BalanceSheetSection.tsx:173–185,210–254,375–387,412–456`: duplicated asset/liability menu effects.
- **Change/benefit/scope/owner:** Decisioning maintainer extracts small local lifecycle hook; one maintenance point, markup and SVG triggers untouched.
- **Preservation/risk/dependencies/effort:** Low–medium closure/event-order risk; keep per-card state, mousedown timing and delete order. Depends 28; 0.5 day.
- **Proof:** Both menus inside/outside/toggle/delete/other-card edit/borrower switch/unmount; listener count/cleanup, G exact popup position/hover/focus/DOM. No leak or speed claim.
- **Decision:** Awaiting user approval.

### 30 · DECISIONING-006 — Approve accessible financial control semantics
- **Class / priority / confidence:** X / P2 / high static. **Origin:** decisioning.md DECISIONING-006.
- **Evidence/problem:** C`BorrowerFinancialsContent.tsx:92–97,147–165,224–231`; C`BalanceSheetSection.tsx:70–75,106–124,210–215,412–417`: click-only div/SVG triggers and unassociated labels.
- **Change/benefit/scope/owner:** Decisioning maintainer implements approved keyboard/focus/label contract for owned controls, not shared dropdown redesign.
- **Exception/risk/dependencies/effort:** Medium visual/focus risk; new focus stops/names change behavior. Approved contract plus 28; 1 day.
- **Proof:** Tab/Shift-Tab/Enter/Space, collapse/menu/delete focus, scoped input names and IDs, mouse parity; G normal/hover/focus/edit/collapsed states with exact unchanged boxes/icons.
- **Decision:** Awaiting user approval.

### 31 · DOCUMENTS-001 — Protect package progress from stale consumers
- **Class / priority / confidence:** X / P2 / high static, not reproduced. **Origin:** documents.md DOCUMENTS-001.
- **Evidence/problem:** H`use-closing-package.ts:25–36,39–63,71–77`; L`closing-package-progress.ts:13–33`: stale local-ref full-object writes can erase newer same-loan progress.
- **Change/benefit/scope/owner:** Documents maintainer defines authoritative update/subscription/operation identity; shared state owner co-reviews reset interface. Protect package timestamps without changing disclosure schema.
- **Exception/risk/dependencies/effort:** Medium–high; multi-consumer/reset outcomes change. Agree no-Web-Locks policy and 17 reset boundary; 34 fixtures; 1–2 days plus verification.
- **Proof:** Two consumers, A deliver then stale B generate, differing deadlines, reset/removal before timer/notification, same-window instances, other loan and failures; G single-consumer 5-second delay/due-time/repeated delivery/PDF/error states unchanged.
- **Decision:** Awaiting user approval.

### 32 · DOCUMENTS-002 — Define cross-window disclosure coordination without Web Locks
- **Class / priority / confidence:** X / P2 / high absent-boundary evidence, medium occurrence. **Origin:** documents.md DOCUMENTS-002.
- **Evidence/problem:** L`closing-disclosure-history.ts:54–71`; H`use-closing-disclosures.ts:84–91`; L`closing-disclosure-borrowers.ts:146–172`; C`__tests__/ClosingDocumentsContent.test.tsx:477–518,622–652`: synchronous fallback is not cross-window atomic.
- **Change/benefit/scope/owner:** Documents maintainer implements approved supported-browser/transactional coordination policy; generation/delivery/reset/borrower saves and checklist subscriber.
- **Exception/risk/dependencies/effort:** High persistence compatibility risk; unsupported-write error versus writable coordination needs explicit choice. No database/service migration implied; 34 fixtures, legacy/reset policy; 1 day policy/characterization + 1–3 days implementation.
- **Proof:** Two isolated browser contexts, locks unavailable, barrier-controlled reads/writes, simultaneous generation, independent/conflicting borrower edits and reset-before-commit; repeat locks-present. G all serial outputs/metadata/errors/PDF/focus retained; single-thread tests alone insufficient.
- **Decision:** Awaiting user approval.

### 33 · DOCUMENTS-003 — Separate document presentation from local timing
- **Class / priority / confidence:** I / P2 / high. **Origin:** documents.md DOCUMENTS-003.
- **Evidence/problem:** C`DisclosureDocumentsContent.tsx:50–114,159–215`; C`DocumentsContent.tsx:180–200`; H`use-closing-package.ts:65–79`: local and retained modes interleave state/render responsibilities.
- **Change/benefit/scope/owner:** Documents maintainer extracts identical presentation plus local controller/retained adapter; clearer At-App/Loan Estimate/Package contracts.
- **Preservation/risk/dependencies/effort:** Medium closure/mount risk; keep callback-before-stamp, retained old delivery on regeneration, aria-disabled focusability, local cancel versus package resume. 34 or equivalent fixtures; no dependency on 31/32 fixes; 0.5–1.5 days.
- **Proof:** G and existing suites, 1440/768/767/390 widths, local unmount vs persisted deadline, hidden-tab progress, repeated delivery/idempotent callback, storage-error PDF access, reset while generating. No speed claim.
- **Decision:** Awaiting user approval.

### 34 · DOCUMENTS-004 — Verify full-route document preservation
- **Class / priority / confidence:** V / P2 / high. **Origin:** documents.md DOCUMENTS-004.
- **Evidence/problem:** P`loan-documents.tsx:37–111`; C`__tests__/ClosingDisclosureBorrowers.test.tsx:15–19`, `__tests__/ClosingDisclosureAssumedDate.test.tsx:21–26`, `__tests__/ClosingPackageProgress.test.tsx:20–28`: component tests do not mount actual routed page together.
- **Change/benefit/scope/owner:** Documents maintainer adds route fixture scenarios using the shared verification harness; protects identity/unmount/overlay contracts, no production edits.
- **Risk/dependencies/effort:** Low runtime, medium font/timezone/mock fidelity; SHARED-012/shared harness; 1–2 days.
- **Proof/preservation:** G delayed/404/invalid/success/empty roster, sidebar/route round-trips mid-generation, loan change, editor success/cancel/failure/queued save, scoped/global reset, older-row editor and horizontal scroll. Capture 599/600/601 and 766/767/768 widths plus desktop/mobile; exact PDF hash/URL/args, no real requests.
- **Decision:** Awaiting user approval.

### 35 · CLOSING-BOOKING-001 — Protect the local editor and booking simulation
- **Class / priority / confidence:** V / P2 / high. **Origin:** closing-booking.md CLOSING-BOOKING-001.
- **Evidence/problem:** P`loan-closing-booking.tsx:44–119`; C`ClosingContent.tsx:5–39,66–169`; C`BookingContent.tsx:3–49,68–110`; no dedicated tests for these or actual date picker.
- **Change/benefit/scope/owner:** Closing/Booking maintainer adds isolated editor/timer/route coverage, preserving simulation rather than introducing backend booking.
- **Risk/dependencies/effort:** Medium calendar/timezone/mock fidelity; SHARED-012 accepted calendar baseline/shared harness; 1–2 days.
- **Proof/preservation:** G edit every field/save/discard, arbitrary dates, calendar/focus, 4999/5000ms completion and 400ms dots, rebooking, mid-timer unmount, noon/midnight, sidebar/loan/query states, reset independence; assert no owned API/storage/checklist/activity writes.
- **Decision:** Awaiting user approval.

### 36 · CLOSING-BOOKING-002 — Name only the Closing Date textbox
- **Class / priority / confidence:** X / P2 / high static. **Origin:** closing-booking.md CLOSING-BOOKING-002.
- **Evidence/problem:** C`ClosingContent.tsx:66–74`; C`RoadsDatePicker.tsx:6–13,74–100`: sibling caption not associated with text input; button label names a different control.
- **Change/benefit/scope/owner:** Shared-controls maintainer owns optional input naming reference; Closing/Booking maintainer wires existing caption via unique aria-labelledby. Only this caller gains a name.
- **Exception/risk/dependencies/effort:** Low–medium duplicate-ID/focus risk; accessibility tree changes, no validation/library/style change. Approved wording/shared interface, SHARED-012 real-picker fixture; 0.25–0.5 day plus assistive verification.
- **Proof:** Textbox gains “Closing Date” only; Pricing caller without prop unchanged. G disabled/edit/open calendar, Tab sequence, Escape/outside/save/discard/weekday selection; retain typed invalid/weekend acceptance.
- **Decision:** Awaiting user approval.

### 37 · HISTORY-001 — Characterize Change Log independently of Activity
- **Class / priority / confidence:** V / P2 / high. **Origin:** history.md HISTORY-001.
- **Evidence/problem:** C`HistoryContent.tsx:86–164,233–393`; P`loan-history.tsx:21–51`: no direct tests; Activity is a separate model.
- **Change/benefit/scope/owner:** History maintainer adds synthetic characterization, no production model changes.
- **Risk/dependencies/effort:** Low runtime, medium date/environment risk; SHARED-012/shared harness; 0.5–1 day.
- **Proof/preservation:** G 20/10/50 paging/bounds, reset page on search/sort/size, seven fields, whitespace-only vs padded query, empty page 1/1 with no message, noon/midnight/month/year ordering, callback precedence, all six destinations and query branches; upward dropdown and Activity-open captures.
- **Decision:** Awaiting user approval.

### 38 · HISTORY-002 — Separate unchanged History data transforms
- **Class / priority / confidence:** I / P2 / high. **Origin:** history.md HISTORY-002.
- **Evidence/problem:** C`HistoryContent.tsx:6–93,106–164,168–397`: sample constants/parser/filter/sort and styled render mixed; unused section map is not missing routing.
- **Change/benefit/scope/owner:** History maintainer moves constants and pure transforms to local modules, retains handlers/JSX; easier isolated maintenance.
- **Preservation/risk/dependencies/effort:** Low–medium normalization risk; preserve all strings/IDs, copied sort, local Date/rollover, equal-key order, whitespace/memos/page resets. Depends 37; 0.5–1 day.
- **Proof:** Compare all 40 record sequences for each direction/search/size/page and invalid parser fixtures; G default/empty/paginated/dropdown/panel layout and navigation unchanged. No speed claim or Activity unification.
- **Decision:** Awaiting user approval.

### 39 · HISTORY-003 — Keep field links on the current loan
- **Class / priority / confidence:** X / P2 / high static, latent with current single seeded loan. **Origin:** history.md HISTORY-003.
- **Evidence/problem:** C`HistoryContent.tsx:156–164`; P`loan-history.tsx:18–23,73`; `server/storage.ts:24–25`: default links hardcode loan 1.
- **Change/benefit/scope/owner:** History maintainer supplies current ID, preserving callback precedence/encoding/destination distinction; prevents unexpected loan switch for other valid loans.
- **Exception/risk/dependencies/effort:** Medium route/provider lifetime risk; non-1 destinations change. Multi-loan fixtures and approved URL difference; 0.25–0.5 day.
- **Proof:** Loan 1 and synthetic loan 2, every section link, exact URL/query/destination, callback once/no fallback, Back/header/provider remount isolation; G loan-1 pixels unchanged. No field focus/deep-link feature.
- **Decision:** Awaiting user approval.

### 40 · HISTORY-004 — Make timestamp sorting keyboard-operable
- **Class / priority / confidence:** X / P2 / high static. **Origin:** history.md HISTORY-004.
- **Evidence/problem:** C`HistoryContent.tsx:237–262,151–154`: clickable div has no authored keyboard semantics.
- **Change/benefit/scope/owner:** History maintainer adds approved sorting-control semantics/announcement, not a table redesign.
- **Exception/risk/dependencies/effort:** Medium focus/layout risk; keyboard/focus appearance changes need explicit acceptance. 37 fixtures and approved contract; 0.5 day.
- **Proof:** Tab reaches control, Enter/Space/pointer toggle once and reset page, deterministic focus/announcement; G alignment/chevron/typography at all widths unchanged except approved focus state. Search/pagination labels not bundled.
- **Decision:** Awaiting user approval.

### 41 · DS-001 — Characterize the unrouted design showcase
- **Class / priority / confidence:** V / P3 / high. **Origin:** design-system.md DS-001.
- **Evidence/problem:** P`design-system.tsx:8–60,82–307`; `client/src/App.tsx:22–37`; `vitest.config.ts:7–10`: dormant content/native interactions lack dedicated checks.
- **Change/benefit/scope/owner:** Design System page maintainer adds direct-render fixture with existing five primitives/CSS/fonts, no route or token edits; protects support reference.
- **Risk/dependencies/effort:** Low runtime, medium omitted-CSS/font false confidence; SHARED-012, coordinate 16 without duplicating parity checks; 0.5–1 day.
- **Proof/preservation:** Assert 22 swatches/9 typography/10 spacing/3 radii/8 buttons/2 inputs/4 badges/2 cards/6 tiles in exact order; no-op buttons, enabled type/paste/clear/label and disabled input/tab order/remount. G 375/639/640/1023/1024/1440 widths, below fold, dark ancestor and blocked/loaded fonts; route remains absent.
- **Decision:** Awaiting user approval.

### 42 · COMING-SOON-001 — Characterize the retained placeholder without exposing it
- **Class / priority / confidence:** V / P3 / high. **Origin:** coming-soon.md COMING-SOON-001.
- **Evidence/problem:** P`loan-coming-soon.tsx:15–81`; `client/src/App.tsx:22–35`; L`queryClient.ts:26–57`: unrouted module has no direct fixture tests.
- **Change/benefit/scope/owner:** Coming Soon page maintainer adds isolated component/route-absence assertions with inert sync; protects distinct source contract, no route addition.
- **Risk/dependencies/effort:** Low runtime, medium provider/mock fidelity; SHARED-012/shared harness; 0.5–1 day.
- **Proof/preservation:** G pending/success/404/500/invalid/falsy/cached-error, two/missing IDs, known/unknown/empty/ampersand/long titles and invalid amounts. Prop update without remount, activity color without panel, no-op controls, checklist reopen/reset failure ordering; exact 36px shell reserve and absent production route.
- **Decision:** Awaiting user approval.

### 43 · NOT-FOUND-001 — Protect fallback routing and global lifetimes
- **Class / priority / confidence:** V / P2 / high gap evidence, no reproduced malfunction. **Origin:** not-found.md NOT-FOUND-001.
- **Evidence/problem:** P`not-found.tsx:1–21`; `client/src/App.tsx:22–72`; CTX`loan-activity-context.tsx:48–51,124–134,162–170`; CTX`checklist-context.tsx:168–170,251–285,421–429`; H`use-github-sync.ts:39–42`: no direct fallback/App transition coverage.
- **Change/benefit/scope/owner:** Shared verification maintainer owns real-router/provider fixture, Not Found page maintainer owns rendering assertions. Protect markup, remount and inherited overlay behavior.
- **Risk/dependencies/effort:** Low runtime, medium over-mocking/live-sync risk; SHARED-012/shared harness; coordinate 12 and 10 boundary tests; 0.5–1 day.
- **Proof/preservation:** G root/known/missing-loan/unmatched/support-name routes, real Wouter case/query/hash/slash/encoded edges; same-key unknown→generic unknown→loan, Back/Forward/reload, storage/subscription cleanup. Cached/failed conflict GET never auto-opens; delayed fake sync/inherited toast/dialog focus. Exact H1/paragraph/no page-owned controls at 1440×900/768×1024/375×812, enlarged text/dark/font failure.
- **Decision:** Awaiting user approval.

## Traceability and approval boundary

Original shared IDs 002–010 and 012–014 map one-to-one above; 001 maps to 001A/B, 011 to 011A/B. All page IDs map one-to-one without renaming. SHARED-015 is the only new finding and explicitly credits the four page escalations. Shared references in other reports strengthen these entries; they are not extra hidden approvals.

Unnumbered observations (e.g. broader dropdown labeling, no-op saves, catalog omissions, Activity/Change Log separation, hypothetical clipping, same-millisecond IDs, supporting-page activation) are retained in the final review as **not recommended for implementation under this register**. Addressing any later requires a new bounded proposal; approving a related item does not include them.

**Decision reply format:** “Approve 18 / SUMMARY-001,” “Defer 03 / SHARED-002,” or “Approve 26 / DECISIONING-002 and explicitly permit the deletion-during-edit correction.” For entries with unresolved policies, specify the policy before work starts. Approval of one item never approves dependencies, upgrades, behavior exceptions or deployment. All unanswered decisions remain **Awaiting user approval**.
