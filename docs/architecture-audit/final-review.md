# Final architecture review — approval handoff

Date: 2026-10-14. **Audit only. No recommendation has been implemented or approved.**

## Executive summary

All nine page reports and the shared-infrastructure report have been read and consolidated. The current **local filesystem**, not GitHub, a remote revision or a commit diff, is the source of truth. Reviewer evidence has not been overwritten.

The deliverable is a **qualified static audit**, not a clean dependency-baseline, runtime, security or visual-equivalence certification:

- All 174 baseline paths exist; **173 match and `package-lock.json` differs**. No additional first-party paths were found under the baseline inclusion rules. Source, styles, tests, configuration other than the lockfile, and asset bytes match.
- Six routed loan pages, the unmatched-route fallback, and two deliberately unrouted supporting pages are covered. Page reports enumerate their nested sections, dialogs, modes and state lifetimes, not just entry components.
- The highest-consequence findings concern sync authorization/file selection/partial writes/concurrency, reset sequencing, financial edit identity, and persisted status versus local display. These are static risks, not reproduced incidents.
- The safest internal candidates are narrow extractions with unchanged markup and state ownership. A shared page-shell rewrite, generic form framework, persistence migration, component replacement and token normalization are **not recommended**.
- The [approval register](approval-register.md) contains **43 independent decisions**: **11 internal**, **12 verification-only**, and **20 behavior-changing exceptions outside the current constraint**. It preserves all 40 original finding IDs, splits two compound shared findings into independently decidable parts, and adds one consolidated shared-reset finding.
- There are **no measured performance gains or bottlenecks**. The prior lead's failed type check is historical evidence only; it does not establish today's dependency-sensitive result.

Approval of this audit does not approve any implementation. Every decision starts **Awaiting user approval**. Even a P1 security finding is not permission to change access rules or sync eligibility automatically.

## Baseline consistency and drift disposition

The lead captured `baseline.md` at 2026-10-14T19:56:49.831770+00:00. This consolidation reran its byte-size/SHA-256 comparison across every row and enumerated included paths independently.

| Check | Result |
|---|---|
| Recorded files / missing files | 174 / 0 |
| Matching files / mismatches | 173 / 1 |
| New included first-party paths, excluding audit reports | 0 |
| Recorded aggregate | `ab0f85c1707e2b9355037c78a4d365dddba7e0019bf5559bb40659facabbee92` |
| Current aggregate using the same definition | `c51c51334fb2bf4a8653c7d6c093b3b2b349f0a64b7d299b555283c361f0a76e` |
| Mismatched path | `package-lock.json` |
| Recorded lock | 317096 bytes; `22cfba6c0877fa46d723ddc186a9ff026eb3712c25ef0e57c0cdeb967e2b5bc9` |
| Current lock | 361120 bytes; `caf5cbce73ec535033e36984f2c5d00e080a7a91c1575750b7008f7c52e9107e` |

Current lock entries include react-day-picker 9.14.0 (`package-lock.json:7864–7865`), Vitest 4.1.11 (`:9809–9810`), jsdom 29.1.1 (`:6391–6392`), testing-library/react 16.3.3 (`:3476–3477`) and jest-dom 7.0.1 (`:3440–3441`). These are lock contents, **not installed-version measurements**. Reports attribute an earlier calendar-major transition to completion feedback; this lead has not retrieved old source or independently established who changed the lock. No dependency change is authorized by this audit.

Origination, Decisioning, Documents and History already record the same drift. Summary, Closing/Booking, Design System, Coming Soon, Not Found and the initial shared/baseline reports retain earlier clean checks. Those checks remain historical observations; **this current comparison supersedes their whole-tree equivalence claims**, without rewriting their evidence.

**Disposition:** static conclusions about matching first-party files remain usable. Dependency reproducibility, exact third-party calendar behavior, installed-versus-lock diagnosis, test readiness and visual/runtime equivalence are blocked or unverified. SHARED-012 is narrowed to a separately approved investigation. This task does not restore a lockfile, install dependencies, silently bless a replacement baseline or reopen source changes. Accepting the audit means accepting this limitation, not accepting the changed dependency contract.

## Repository-wide coverage matrix

This matrix is exhaustive by **manifest membership**, not a claim that every file was browser-tested. The immutable per-path ledger in [baseline.md](baseline.md#manifest) and “Exact file assignment” lists in [coverage.md](coverage.md#exact-file-assignment) are incorporated here: each of their 174 rows inherits exactly one primary-owner row below, and the more restrictive kind/exception status in the next table. Thus assets and the lockfile do not inherit source-review or runtime-pass claims. The owner counts sum to 174; the new-path scan found no unassigned additions. The kind partition is 116 source, 18 assets, 18 tests/setup, 16 configuration/tooling, 4 instructions/documentation, 1 generated lockfile and 1 unclassified file.

Status: **S** = static architectural review; **B** = byte/reference inventory only; **D** = dependency-drift blocked; **U** = runtime/visual unverified; **O** = intentionally omitted with reason.

| Primary owner / complete manifest membership | Files | Evidence report and reviewed scope | Final status / gaps |
|---|---:|---|---|
| Shared | 128 | [shared.md](shared.md), `coverage.md` shared path list: entry/router/providers, header/toolbar/navigation, checklist/activity, all local UI wrappers, controls/hooks/utilities, styles/tokens, server/API/storage/schema, sync modules, test support, build/tooling, docs, assets and miscellaneous root file | S at architecture/import/call-site level; B for assets/generated lock; D for lock-dependent claims; U for runtime, wrapper keyboard behavior and production perimeter. Local wrappers are not omitted merely because they originate from a library. |
| Summary | 3 | [summary.md](summary.md): full route, BorrowerCards, SummaryRatios, 17 displayed rows, query/error/empty borrower states, clipboard, shared panels | S; direct tests absent; U for actual clipboard, overflow, keyboard and pixel output |
| Origination | 8 | [origination.md](origination.md): route/search parameters, all five sections, borrower questionnaires/editors, details, collateral/split appraisal, pricing/lock modal, fees and two tests | S; D for calendar/toolchain conclusions; U for native controls, post-reset sequences, PDF opening and responsive behavior |
| Decisioning | 5 | [decisioning.md](decisioning.md): route, summary/letter actions, financial income editor, all four balance categories, menus, calculations and existing summary tests | S; D for dependency-based conclusions; U for deletion/remount/order scenarios and browser semantics |
| Documents | 22 | [documents.md](documents.md): route, both sidebar sections, both force-mounted closing tabs, local/retained generation, delivery, borrower summaries/editor, assumed dates, reset, errors, hooks/helpers/CSS and nine tests | S; D for dependency/test execution; U for actual cross-window races, locks, focus, PDFs and visual equivalence |
| Closing/Booking | 3 | [closing-booking.md](closing-booking.md): route, every Closing edit/save/discard field, date control boundary and Booking timer/rebooking/unmount states | S; prior clean-lock assertion superseded; D for calendar compatibility; U for timers/browser keyboard/rendering |
| History | 2 | [history.md](history.md): route, full static Change Log, filtering/date sorting/paging/navigation, separate Activity boundary | S; D for runtime baseline; U for date/browser routing/accessibility; no live audit trail inferred |
| Design System | 1 | [design-system.md](design-system.md): all showcase sections, native input/no-op buttons, direct primitives and token cross-review | S; remains unrouted; prior clean-lock assertion superseded; U for emitted/computed CSS, fonts and responsive samples |
| Coming Soon | 1 | [coming-soon.md](coming-soon.md): entire retained page, title/test-ID transforms, query/error shell, conditional shared interactions | S; remains unrouted; prior clean-lock assertion superseded; U for mounted-fixture behavior |
| Not Found | 1 | [not-found.md](not-found.md): complete fallback, route order, global overlay/request/storage lifetimes and HTTP/client-fallback distinction | S; prior clean-lock assertion superseded; U for Wouter edge cases, browser history/focus and hosting response |
| **Total** | **174** | All ten reports present; every included file assigned | **No missing source report; no full runtime sign-off** |

### Kind overrides, exclusions and remaining gaps

| Files/area | Coverage / omission and reason | Owner / disposition |
|---|---|---|
| All manifest source, CSS and configuration rows | Static source or architectural boundary coverage through the assigned report and import ledger; no promise of exhaustive algorithm or dependency-internal review | Assigned owner above; focused high-risk rereads listed below |
| All 18 manifest test/setup rows | Assertions/harnesses inspected by subject owners; not executed here | Respective page/shared owner; SHARED-012 and page characterization decisions |
| All 18 manifest asset rows: `attached_assets/**`, `client/public/**`, root PNGs | B: existence, size/hash and reference boundaries only; no PDF text/personal records extracted, no screenshot/PDF rendering | Shared asset owner, page consumers; no deletion/deduplication authorized |
| `package-lock.json` | B + D: byte drift and selected current version entries read; generated dependency contract not hand-reviewed as source | Shared validation owner; SHARED-012 |
| `sedZiKBNa` | Inventoried configuration-like text, not demonstrated active configuration; provenance/reference use unverified | Shared documentation owner; SHARED-013 does not authorize removal |
| Project instructions/docs/custom Figma compliance skill | Reviewed as constraints/context; stale page descriptions do not override source | Shared; no Figma fetch or token edit |
| `.git`, `node_modules`, `dist`, `.local`, `.cache`, `.config`, `.upm`, `.npm`, `.vite`, `generated-artifacts` at any depth | O: source-control internals, vendor install, build outputs, platform metadata/cache/runtime data; application code consuming runtime data is included | Not evidence of first-party coverage gaps; no installed dependency equivalence asserted |
| `.agents/memory`, `docs/architecture-audit` | O from manifest only: context and audit outputs excluded from self-referential hashing; memory constraints and all input audit reports read | Lead; only these two final reports authored |
| `.env*`, `*.pem`, `*.key`, symlinks | O: credentials/privacy and external traversal boundary; values neither opened nor hashed | No secret search; SHARED-007 based on scanner code and synthetic future fixtures |
| Actual deployment, external access perimeter, GitHub permissions/history, DB contents | O: external evidence outside local audit authority and no real writes permitted | SHARED-006/012/013 require later authorized evidence; no incident attribution |
| Browser-native/library keyboard, font loading, breakpoint pixels, concurrent windows, clipboard/PDF opening | U: no isolated runtime copy established; active App can issue conflict GET and storage writes | Specific future proof plans per approval; do not use live preview as substitute |
| Performance, memory leaks, bundle size, storage capacity | U: no profiler/workload/benchmark measurements; source complexity is not measured slowness | No optimization or capacity guarantee |

The full import-edge list in `coverage.md` supports boundary coverage, not automatic proof that every imported wrapper was deeply tested. No first-party module is silently dropped because it is unused/unrouted. Large nested pages have explicit per-file/state ledgers; small cohesive pages do not need invented extraction recommendations.

## Lead rechecks of high-risk and shared evidence

These were read directly in the matching local source; they are **not executed reproductions**:

| Evidence | Consolidated conclusion |
|---|---|
| `server/routes.ts:15–55,89–131,254–309,349–380,488–526`; `server/github.ts:48–100` | Binary/oversize eligibility differs; caught pull/write and skipped blob paths can still reach checkpoint updates. Retain SHARED-003/-004 separately from mechanical extraction. |
| `server/routes.ts:654–731`; `server/github.ts:204–239` | Conflict inputs have pending-path and lexical-containment validation; do not allege unrestricted arbitrary paths. Local writes precede push stale-HEAD check; moving-HEAD content reads remain a distinct race. Symlink safety unverified. |
| `server/index.ts:15–23,36–63`; `server/routes.ts:155–188,254,414,621,654` | No visible in-app authorization boundary; hosting perimeter unknown. Full JSON response logging is directly visible, but no real sensitive logs were accessed. |
| `client/src/contexts/checklist-context.tsx:251–270,363–401`; `client/src/components/loan/ChecklistPanel.tsx:14–22` | Package removal precedes disclosure reset; later failure need not finish checklist reset, while activity reset proceeds immediately. One shared outcome-changing proposal: SHARED-015. |
| `client/src/components/loan/CollateralContent.tsx:616–643`; `ProductPricingContent.tsx:163–179`; origination route `:111–127` | Nonzero reset version replays on section mount. This is ORIGINATION-003, not a provider memoization “fix.” |
| `client/src/components/loan/DecisioningSummaryContent.tsx:16–89`; `BalanceSheetSection.tsx:730–759,780–852` | Local flags differ from persistent checklist; decision can regress letter status; delete-before-edit-index can redirect Save. Keep three decisions separate. |
| `client/src/hooks/use-closing-package.ts:25–77`; `client/src/lib/closing-disclosure-history.ts:54–100` | Package uses local-ref replacement without its own subscription; unlocked disclosure fallback is synchronous in one context, not cross-window atomic. Neither is repaired by cosmetic hook extraction. |
| `client/src/components/loan/HistoryContent.tsx:151–164`; `ConflictResolutionDialog.tsx:60–89` | Hardcoded loan-1 navigation and recreated memo dependencies confirmed; former changes behavior, latter can be a bounded internal change. |
| `client/src/App.tsx:22–72`; `shared/schema.ts:20–65`; `client/src/lib/queryClient.ts:26–57`; `server/storage.ts:105–116` | Six loan routes; no support-page routes; compile-time types, MemStorage and query policy are distinct. No API validation or persistence migration implied. |
| `tsconfig.json:2–17`; `package.json:6–11,82–109`; current lock entries above | Historical validation failure cannot be labeled today's failure/pass; test packages are declared, so “missing declarations” must not be generalized to absence from package.json. No rerun/install performed. |

## Reconciliation and ownership decisions

| Overlap or apparent conflict | Resolution |
|---|---|
| All pages repeat type/query/formatting suggestions | SHARED-001A owns type/pure currency helper; SHARED-001B owns thin query helper. No page-shell JSX extraction. Coming Soon participates only as retained source. |
| Page formatter similarity | Share only byte-equivalent currency semantics. Keep Booking timestamp, History parser, Activity formatter and document date-only arithmetic distinct. Preserve `$NaN`, prefix parsing, negative placement and separate amount fields. |
| SHARED-011 provider optimization versus page reset defects | SHARED-011A is equivalent loan-key extraction; SHARED-011B is profiling only. No callback memoization authorized without later evidence and a separate proposal. ORIGINATION-003 owns replay; SHARED-015 owns partial reset. |
| Documents/Decisioning/Origination/History reset escalations | One prospective shared-state maintainer owns SHARED-015, with Documents storage and Origination/Decisioning consumers co-reviewing. No parallel rewrites of reset broadcaster. Disclosure-only isolation remains mandatory. |
| Closing-related names | Documents owns disclosure/package hooks, editors and persisted progress; Closing/Booking owns only its local editor and timer simulation. Do not connect booking to package/checklist as an extraction. |
| Different document generation lifetimes | DOCUMENTS-003 exposes local versus retained presentation contracts without unifying timers/persistence. DOCUMENTS-001/-002 remain separately approved concurrency exceptions. |
| Sync refactor versus sync fixes | SHARED-002 captures current ordered operations, including deficiencies. SHARED-003–007 and -009 require separately approved changed policies/outcomes. Logging and diff memoization remain independent internal candidates. |
| Accessibility across pages | SUMMARY-002, DECISIONING-006, CLOSING-BOOKING-002 and HISTORY-004 stay separate exceptions. Shared-controls maintainer alone owns the optional picker naming interface in CLOSING-BOOKING-002; caller-only semantics must not affect Pricing. No library replacement. |
| Broader unlabeled fields/dropdown keyboard gaps | Observations in Origination/History/Decisioning and `RoadsDropdown.tsx:19–166` remain **triaged, not bundled recommendations**: desired keyboard/name contract requires a new bounded proposal. Existing page approvals do not authorize shared dropdown redesign. |
| Token/catalog differences | SHARED-014 is verification of an approved intentional-equivalence map only. DS-001 covers showcase behavior, not token normalization. Different key sets/captions are not authority to rewrite CSS or add tokens. |
| SHARED-012 initially mixes diagnosis and repair | Narrow to isolated reproduction/reporting after explicit baseline choice. No dependency upgrade, compiler suppression or calendar fix included. Later repair needs a new individual proposal. |
| Supporting/unused code and unexplained files | Retain all; route absence is not a defect, import absence is not deletion authority, and Tailwind scans source regardless of routing. |
| Placeholder/local-only product behavior | Preserve no-op Fee Save, local form saves, static Change Log, static PDF output, household-like balance state and disabled questionnaire values. Product uncertainty is not an approved fix. |

## Ordering for approved work only

No step below is scheduled or authorized. Owners are prospective roles, not active assignments. Approval of a dependency does not approve its dependents.

1. **Evidence gate:** choose the dependency baseline explicitly, then approve SHARED-012 if isolated reproduction is wanted. Do not silently restore or accept the changed lock. Any environment repair needs a separate decision.
2. **Characterization:** approve selected page verification entries. A single shared verification owner coordinates inert API/admin transport, synthetic loans, disposable storage, fonts, clocks and route harnesses. Page owners add only their own scenarios; one page test approval does not fund all nine. Run existing relevant tests before claiming readiness.
3. **Low-coupling internals:** individually approved SHARED-008/-010/-013/-014 and SHARED-001A can proceed after their evidence requirements. SHARED-001B follows characterization of all consumers. Page-only extractions follow their page verification entries.
4. **Broad/high-risk internals:** SHARED-011A requires fallback and cross-loan fixtures; SHARED-011B profiles unchanged code only. SHARED-002 needs fake filesystem/remote transaction fixtures before extraction. No live push/pull even for verification.
5. **Exceptions, only if the user changes the constraint:** agree exact policy before implementation. For sync, establish eligibility/access policy and recovery/snapshot semantics before -003/-004/-005 integration; -006/-007 need not wait for a broad refactor if separately scoped. For reset/storage, agree SHARED-015 + ORIGINATION-003 reset identity/consumption boundaries before wiring document concurrency and pricing lifetime changes. Serialise edits to shared context files. DECISIONING-002 is independently bounded; -001/-003 share approved workflow semantics but remain independent decisions.
6. **Acceptance:** compare unchanged baseline and each candidate in the same isolated fixture environment. Require per-entry behavioral and visual evidence; for an exception, list the exact allowed differences and preserve everything else. Never approve a blanket screenshot update.

The register's estimates are engineering ranges, not commitments. Do not sum shared fixture setup repeatedly. No application startup, live screenshot, test suite, type-check rerun, build, workflow change, install, migration, GitHub operation or deployment was performed during consolidation. Only the two owned reports were authored; inherited lock drift was left untouched. No new memory entry is needed: the durable scope constraints are already recorded, and findings belong in these reports.

Final document checks confirmed 40 unique original findings map to all 43 consecutively numbered proposals; all 43 decision fields are pending; classes total 11 I / 12 V / 20 X; local document links exist. A final manifest comparison retained the same single lockfile mismatch and aggregate above. Local workspace status listed only the two new final reports as this task's changes; that is not a claim that the inherited lockfile matches the original audit baseline.

## User decision handoff

Use the numbered register to **Approve**, **Decline**, **Defer**, or request narrower scope for individual entries. For an **X** entry, approval must explicitly permit its named behavior change. A generic “audit approved,” “looks good,” or approval of an internal refactor does not authorize exception work. Unanswered entries remain **Awaiting user approval**. Stop here for decisions; do not start implementation.
