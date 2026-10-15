# Shared architecture review

## Status and executive summary
**Audit only. All recommendations below are Awaiting user approval. No application changes were made.** This is the lead's shared review, not the final nine-page audit. baseline.md records the current local snapshot; coverage.md assigns every included file and the downstream page reviews.

The main architectural seams are the shared loan shell, browser-local workflow state, the in-memory loan API, and the custom GitHub synchronization subsystem. The most consequential static risks are in synchronization: unequal binary handling, partial writes advancing the common ancestor, moving-HEAD reads, stale conflict resolution ordering, and absent in-app authorization checks. None was exercised against a real repository. They are not evidence that a particular historical push lost data.

Behavior-preserving refactor candidates are deliberately separated from defect/security changes that alter outcomes. There are **14 individually decidable recommendations**, not a proposed blanket refactor. No performance improvement has been benchmarked. The read-only type check failed in the existing environment; source-versus-installation causes must be distinguished before changes are proposed.

## Review coverage and current contracts
| Area | Evidence and current behavior | Audit treatment / limits |
|---|---|---|
| Router and shell | App.tsx:22–71; LoanHeader.tsx:22–99, 133 onward; SideNav.tsx:7–18 | Six loan routes plus fallback; root redirects to loan 1; two page files not mounted. Header tab selection has local state and parses the pathname. Preserve mount boundaries, defaults, labels and placeholders. |
| Shared checklist | checklist-context.tsx:159–211, 241–436; ChecklistPanel.tsx; ChecklistActionTimeline.tsx | Loan-keyed localStorage, derived status precedence, re-fire and reset behavior, document history subscription. Do not simplify transitions based only on apparent duplication. Existing tests belong to shared review; execution not performed. |
| Shared activity | loan-activity-context.tsx:46–99, 112–176; LoanActivityPanel.tsx; lib/loan-activity.ts:1–10 | Loan-keyed runtime storage plus seeded records, validation/filtering of saved entries, deduplicated IDs and locale formatting. Preserve filtering, sort order, labels and panel lifecycle. Personal/example record bodies are not reproduced. |
| UI primitives and custom controls | components/ui directory; RoadsDropdown.tsx:25–40; RoadsDatePicker.tsx:148; hooks/use-mobile.tsx:3–18 | Local wrappers remain first-party review scope, even when imported nowhere. Import/side-effect boundaries checked; custom dropdown outside-click listener has cleanup, mobile hook subscribes/unsubscribes matchMedia. Calendar types failed static checking. No keyboard/visual equivalence claim; no replacement recommendation merely because wrappers use a library. |
| Tokens and styles | styles/design-tokens.css; lib/design-tokens.ts; index.css:1 onward; tailwind.config.ts; client/index.html | Multiple representations, Rural First custom instruction, external font loading. Existing hardcoded values are baseline, not permission to restyle. Showcase page is separately reviewed. |
| Query/API | lib/queryClient.ts:3–57; pages' query keys; server/routes.ts:190–201; shared/schema.ts | Shared default query function and no-retry/infinite-stale policy. Loan-plus-borrowers shape is repeated client-side. Do not introduce refetches or runtime coercion under a type-sharing refactor. |
| Data storage | server/storage.ts:4–24, 105–116; server/db.ts:1–14; shared/schema.ts:1–65 | Active MemStorage, separate database module, schema/type declarations. No authenticated user/session flow established by schema alone. Persistence migration would change behavior and is not recommended within this audit scope. |
| GitHub administration | GitHubSyncPanel.tsx, ConflictResolutionDialog.tsx, contexts/github-sync-context.ts, hooks/use-github-sync.ts, lib/github-response.ts; server GitHub modules | Source-control connector API is used in code; no connector or repository access was attempted. Server sync state is filesystem-backed, not local Git status. UI sync status combines counts and caches. Keep forced operations untested against live data. |
| Server startup/serving | server/index.ts:15–23, 36–103; static.ts:5–19; vite.ts:11–58 | Express JSON parsing, API logging, routes then SPA fallback. PORT default 5000. Dev Vite disables HMR and exits process on logged Vite error. No workflow restart or published-health assertion. |
| Build/publish/scripts | package.json:6–11; script/build.ts:35–67; .replit:1–11, 25–43; scripts/post-merge.sh:1–4; configs | npm build creates Vite public output and CJS server bundle. Explicit deployment run command exists. Historical publishing failure cannot be reproduced from static configuration alone. Mixed runtime/setup assumptions warrant documentation, not a blind deployment fix. |
| Tests and docs | 18 test/setup files in manifest; vitest.config.ts; tsconfig.json; CONTRIBUTING.md; SETUP.md; replit.md; custom project skill | Tests distributed to subject owners; no sync transaction/conflict-detection test file appears in the baseline. Global jsdom setup clears localStorage. Read-only tsc measured a failed baseline; no installation/test run. Docs are instructions/context, not stronger evidence than source. |
| Assets and miscellaneous | 18 asset rows plus sedZiKBNa, package-lock.json | Byte hashes/sizes and usage boundaries, not content extraction. Attached closing-package PDF exceeds the sync scanner's 7 MiB limit. No asset deletion authorized. sedZiKBNa resembles a leftover config copy; provenance/use is unverified. |

All client paths in this table are under client/src unless otherwise specified. Exact ownership/import edges for every included file are in coverage.md. This is static architectural coverage, not exhaustive proof of every rendered state or third-party implementation.

## Priority and decision rules
P1 = high-consequence correctness/security/reproducibility risk; P2 = maintainability or bounded correctness/efficiency concern; P3 = low-risk documentation/consistency concern. Confidence describes source evidence, not verified production impact. Effort is a rough engineering estimate excluding deployment/user acceptance. Every estimate assumes individual approval first.

- **Internal candidate:** intended to preserve all existing visible behavior; equivalence must still be demonstrated before merging.
- **Scope exception required:** remediation changes an observable error/security/workflow outcome; outside preservation-only scope unless explicitly authorized. Approval must name the exception, not just authorize a broad cleanup.

## SHARED-001 — Repeated loan-page contracts and formatting
- **Priority / confidence:** P2 / high for duplication; benefit is maintainability, not measured speed.
- **Evidence:** client/src/pages/loan-decisioning.tsx:11–18, 44–49; loan-closing-booking.tsx:11–18, 44–49; loan-documents.tsx:9–17, 38–43; loan-history.tsx:8–22; lib/queryClient.ts:31–51.
- **Observed problem:** LoanWithBorrowers types, currency formatting and loan query setup recur across pages. Editing one copy risks drift; extracting all page markup would also risk losing existing differences.
- **Proposal:** Share only the identical type and pure formatter first, then consider a thin query helper retaining the exact query key/options. Keep each page's JSX, defaults, loading/error presentation and mount behavior unchanged.
- **Benefit / consumers:** Smaller maintenance surface across six loan pages and standalone Coming Soon source.
- **Preservation:** Internal candidate. Preserve parseFloat/toLocaleString behavior, including current invalid-value outputs; no new validation, defaulting, rounding or caching policy.
- **Risk / dependencies / effort:** Medium regression risk; depends on all page reports identifying intentional differences; 0.5–1.5 days.
- **Verification:** Before/after formatter fixtures for numeric, fractional and invalid input; query-key/options assertions; screenshots and navigation/loading/error checks for each affected page in a safe fixture environment. No performance claim.
- **Decision:** Awaiting user approval.

## SHARED-002 — Split orchestration from sync mechanics without changing policy
- **Priority / confidence:** P2 / high.
- **Evidence:** server/routes.ts:15–153, 203–619, 648–796; server/github.ts:48–201; server/conflict-detection.ts:40–192.
- **Observed problem:** One large route module mixes file discovery, hashing, remote fetches, common-ancestor selection, writes, response contracts and state updates. github.ts also has parallel push implementations, increasing the chance of inconsistent future fixes.
- **Proposal:** Extract injectable filesystem/remote adapters and pure sync-plan construction, retaining existing route request/response shapes and sequence. First characterize normal/force/push/pull/delete/conflict branches with fake adapters; do not bundle policy fixes with extraction. Check callers before removing an apparently unused push helper.
- **Benefit / consumers:** Testable sync subsystem and less duplicated blob/tree/commit plumbing; admin panel/dialog and every GitHub endpoint.
- **Preservation:** Internal candidate only for mechanical extraction. Existing deficiencies must be captured rather than silently changed in this step.
- **Risk / dependencies / effort:** High because the subsystem can overwrite files; depends on characterization fixtures and downstream consolidation; 2–4 days.
- **Verification:** Disposable directory and fake GitHub transport; assert ordered calls, byte encodings, returned JSON, skips/conflicts/deletions and errors. No real repo calls. Panel/dialog snapshot and interaction equivalence for mocked responses.
- **Decision:** Awaiting user approval.

## SHARED-003 — Pull/status/push disagree on eligible binary and oversized files
- **Priority / confidence:** P1 / high static evidence; historical incident attribution unverified.
- **Evidence:** server/routes.ts:15–18, 43–55, 89–131, 261–263, 322–326, 488–526; server/github.ts:64–95; baseline asset sizes.
- **Observed problem:** Collection includes binaries as base64 under 7 MiB, while pull filters all recognized binaries out. Oversized/read-failed files disappear from collection without an explicit result. Binary push handling uses a separate SHA path. A successful text pull is therefore not proof that PDFs match, and missing remote binaries can still appear in deletion/status decisions. The scanner ignores package-lock.json as a separate policy.
- **Proposal:** Define one explicit eligibility/outcome model used by status, pull, push and conflict planning; distinguish absent, excluded, oversized and failed-read files. Any binary download support or changed deletion/lockfile policy must be separately authorized. Retain PDF files; deletion is not an architectural solution.
- **Benefit / consumers:** More reliable shared-repo document and source synchronization.
- **Preservation:** **Scope exception required** for changing sync eligibility, result messages or binary outcomes. An internal policy extraction alone can preserve today's behavior but does not fix the discrepancy.
- **Risk / dependencies / effort:** High data-loss risk; coordinate SHARED-002 and -004; 2–4 days plus recovery design.
- **Verification:** Fake repo/disposable files covering text/PDF additions, edits, local/remote deletions, both-side changes, unchanged binaries and files above/below 7 MiB. Compare raw hashes after approved sync behavior. Never delete actual PDFs to test.
- **Decision:** Awaiting user approval.

## SHARED-004 — Partial pull failures can still advance the sync baseline
- **Priority / confidence:** P1 / high.
- **Evidence:** server/routes.ts:279–305, 349–380; server/github.ts:77–95, 132; server/routes.ts:543–545, 604–606.
- **Observed problem:** Pull catches individual write/fetch errors and then records the remote commit as synced. Normal pull can also log failures while advancing when no conflicts are detected. Push can skip blob creation for selected failures while route orchestration still advances state. State can claim a common ancestor that does not describe the resulting local files.
- **Proposal:** Introduce explicit per-file outcomes and a staged/transactional plan; advance the sync checkpoint only according to an approved completion policy, with recoverable partial results. Do not infer that a lost response means no write occurred.
- **Benefit / consumers:** Avoid false clean-state claims and protect future three-way comparisons for all admin sync operations.
- **Preservation:** **Scope exception required**: failure responses/checkpoint behavior will differ. Normal successful UI should remain identical.
- **Risk / dependencies / effort:** High; requires SHARED-002 fixtures and an approved recovery policy, 2–4 days.
- **Verification:** Inject permission errors, failed blob upload, null content, network interruption and partial filesystem failure; assert checkpoint/conflict state and byte-level results. Repeat failed operations safely against fixtures and verify no automatic blind retry.
- **Decision:** Awaiting user approval.

## SHARED-005 — Remote snapshot and conflict-resolution ordering are not atomic
- **Priority / confidence:** P1 / high for ordering, medium for concurrent impact.
- **Evidence:** server/github.ts:204–239; server/routes.ts:133–153, 258, 281, 309, 704–731; server/sync-state.ts:11–31; server/pending-conflicts.ts:17–41.
- **Observed problem:** Tree metadata captures a commit, but current-content reads default to moving main. Conflict resolution writes local files before checking whether a push's remote head advanced. Sync state and pending conflicts are separate uncoordinated file writes; the visible code has no per-repo operation lock. UI mutation disabling is not protection against concurrent requests or processes.
- **Proposal:** Pin every read to the captured commit, validate stale conflict state before local mutation, and define a serialized/atomic operation boundary. Retain non-forced ref updates; the existing GitHub ref PATCH does not set force:true, which already limits a later concurrent push.
- **Benefit / consumers:** Consistent conflict evidence and reduced race-induced local changes across all sync consumers.
- **Preservation:** **Scope exception required** for concurrency/stale-operation outcomes; not a claim that current live races were observed.
- **Risk / dependencies / effort:** High; SHARED-002/-004 sequencing and crash recovery needed; 2–4 days.
- **Verification:** Fake transport advances HEAD between tree and content fetch, between conflict creation and resolution, and before ref PATCH. Assert no local writes on rejected stale state; simulate concurrent requests and interrupted metadata writes.
- **Decision:** Awaiting user approval.

## SHARED-006 — Sync routes lack an in-app authorization boundary
- **Priority / confidence:** P1 / high for code observation; external access controls unverified.
- **Evidence:** server/index.ts:15–23, 36–63; server/routes.ts:155–188, 254, 414, 621, 654, 788 onward; server/github.ts:5–9; LoanHeader.tsx:133 onward.
- **Observed problem:** Express registers repository creation, code writes and conflict-content APIs without visible user/session/role authorization middleware. A server connector can authenticate to GitHub without proving the caller is authorized to operate this project's code. Installed session/passport packages do not constitute an active guard.
- **Proposal:** First establish intended admin access and actual deployment perimeter; if not guaranteed externally, add an explicit authorization boundary around administration. Do not assume the hosting environment is public or protected based on this source alone.
- **Benefit / consumers:** Prevent unauthorized repository and workspace operations; global admin surfaces.
- **Preservation:** **Scope exception required** for denied access/login/role behavior. This is not permission to add an auth provider or change UI now.
- **Risk / dependencies / effort:** High access-control design impact; user-approved roles/perimeter needed; 1–3 days after that decision.
- **Verification:** Isolated route tests with allowed/denied identities; assert denied requests never invoke filesystem/remote adapters and conflict contents are not disclosed. Authorized panel layout and interactions remain unchanged.
- **Decision:** Awaiting user approval.

## SHARED-007 — Sync file selection does not explicitly exclude credential-like root files
- **Priority / confidence:** P1 / high for selection logic; no credential exposure confirmed or searched for.
- **Evidence:** server/routes.ts:15–25, 33–55; SETUP.md:45–55; .gitignore:1–6.
- **Observed problem:** Hidden directories are skipped, but root files are collected except package-lock.json and size/read failures. A locally created .env file described in setup instructions is not explicitly excluded by this scanner. Custom API synchronization does not automatically inherit local Git ignore rules.
- **Proposal:** Define an approved safe file-selection policy and deny credential-like files independently of Git ignore configuration, with explicit exclusions for runtime data. Inspect names/policies, never credential values. Report any previously synced sensitive file through a separate security response if discovered; do not probe now.
- **Benefit / consumers:** Reduce accidental secret publication through admin sync.
- **Preservation:** **Scope exception required** for changed sync file eligibility; no visible styling change. Can be coordinated with SHARED-003 but must retain a separate approval decision.
- **Risk / dependencies / effort:** Medium compatibility risk for intentionally versioned dotfiles; approved include/exclude policy; 0.5–1 day.
- **Verification:** Synthetic files named .env, .env.local, safe dot-config files and nested runtime files; ensure status/pull/push/force paths consistently apply approved policy. Use dummy values only.
- **Decision:** Awaiting user approval.

## SHARED-008 — API logging captures full response bodies
- **Priority / confidence:** P1 / high.
- **Evidence:** server/index.ts:36–55; server/routes.ts:190–201, 628–640.
- **Observed problem:** API middleware serializes full JSON responses into logs, including loan responses and conflict contents. This expands data exposure and log volume beyond route/status/timing diagnostics. No actual sensitive log contents were retrieved for this audit.
- **Proposal:** Use an allowlisted structured log record with method/path/status/duration and safe aggregate counts; omit loan bodies and source conflict text. Do not change HTTP response payloads.
- **Benefit / consumers:** Internal privacy/operational improvement across all APIs; log volume reduction is unmeasured.
- **Preservation:** Internal candidate with respect to end-user behavior; operational log consumers must be reviewed separately.
- **Risk / dependencies / effort:** Low–medium diagnostic compatibility risk; determine safe support fields and retention expectations; 0.5–1 day.
- **Verification:** Capture logs from fake loan/conflict requests and verify dummy sensitive markers never appear; compare original HTTP bodies/statuses and UI fixtures byte-for-byte where stable.
- **Decision:** Awaiting user approval.

## SHARED-009 — HTML responses are handled inconsistently across API consumers
- **Priority / confidence:** P2 / high static evidence; previous gateway failure's root cause remains unverified.
- **Evidence:** server/static.ts:13–18; server/vite.ts:32–56; lib/queryClient.ts:3–7, 40–41; lib/github-response.ts:1–17; hooks/use-github-sync.ts:64–80, 102–118; ConflictResolutionDialog.tsx:186–200.
- **Observed problem:** Unmatched paths fall through to SPA HTML, including unmatched API requests. Pull/push use a defensive parser, while general query and resolution paths still use direct JSON parsing after status checks. A malformed or gateway response can therefore produce different error behavior by endpoint. The existing parser improves diagnostics, not the underlying server/gateway reliability.
- **Proposal:** Document one API error contract and test HTML/empty/invalid JSON responses; separately propose API-only JSON fallback and consistent parsing if the resulting messages/statuses are authorized.
- **Benefit / consumers:** Predictable diagnostics across panel, conflicts and loan queries; does not by itself repair gateway failures.
- **Preservation:** **Scope exception required** for changed error labels/statuses. Pure parser extraction retaining existing messages can be internal, but is not the defect fix.
- **Risk / dependencies / effort:** Medium; agree approved error states and preserve no automatic write retries; 1–2 days.
- **Verification:** Mock 200 HTML, 404 HTML, 502 HTML, empty bodies, valid 409 conflicts and normal JSON; assert exact approved UI error text and no duplicate mutations. Do not intentionally fail a live pull.
- **Decision:** Awaiting user approval.

## SHARED-010 — Diff memoization is defeated by recreated input arrays
- **Priority / confidence:** P2 / high for dependency identity; performance benefit unmeasured.
- **Evidence:** client/src/components/ConflictResolutionDialog.tsx:60–89, 102 onward.
- **Observed problem:** DiffViewer splits content into new arrays each render, then includes those arrays in useMemo dependencies. Memoized row construction is recomputed even when the content strings are unchanged. The view renders a positional line comparison, not a semantic diff.
- **Proposal:** Memoize splitting/row creation from the original string inputs, preserving the existing row alignment, content, colors, order and scrolling. Do not substitute a diff algorithm or virtualize rows without separate approval because those can alter presentation and behavior.
- **Benefit / consumers:** Potentially less repeated CPU work when changing resolution selection in a large conflict dialog.
- **Preservation:** Internal candidate. Every rendered row and interaction must be identical.
- **Risk / dependencies / effort:** Low; fixture-based diff characterization; 0.25–0.5 day.
- **Verification:** Exact row data/DOM comparisons for missing sides, empty files, changed lines and long files; count computations across selection rerenders; record timings before claiming a performance gain.
- **Decision:** Awaiting user approval.

## SHARED-011 — Shared provider identity and loan-key parsing deserve a bounded refactor, not a state rewrite
- **Priority / confidence:** P2 / high for duplication/identity, medium for material performance benefit.
- **Evidence:** loan-activity-context.tsx:48–51, 136–155, 162–169; checklist-context.tsx:168–171, 287–349, 404–429; LoanHeader.tsx:95–97.
- **Observed problem:** Loan identity parsing is repeated; provider values and callbacks are recreated per render, notifying broad context consumers. Checklist and activity deliberately remount by loan key; changing that architecture carelessly can leak state between loans or alter reset behavior.
- **Proposal:** Extract an exactly equivalent loan-ID helper and evaluate stable callbacks/provider values only where profiler evidence justifies it. Preserve existing provider keys, storage schemas, transition ordering, subscriptions and remount timing. Do not split persistence models or normalize saved data in the same change.
- **Benefit / consumers:** Reduced duplication and possible rerender reduction for header, toolbar, checklist, activity and page consumers.
- **Preservation:** Internal candidate; performance is a hypothesis, not a measured bottleneck.
- **Risk / dependencies / effort:** Medium–high for stale closures/subscription lifecycle; Documents reviewer must validate reset integration; 1–2 days.
- **Verification:** Navigate between loan IDs and across tabs; verify reload persistence, corrupt/unavailable storage behavior, checklist re-fire/reset transitions and disclosure-only resets using fixtures. Compare render counts and all relevant visible states before claiming efficiency.
- **Decision:** Awaiting user approval.

## SHARED-012 — Existing static validation is not a clean baseline
- **Priority / confidence:** P1 / high measured result; individual root causes need isolated confirmation.
- **Evidence:** tsconfig.json:2–17; package.json:6–11, 66, 87–109; ui/calendar.tsx:22, 52; RoadsDatePicker.tsx:148; GitHubSyncPanel.tsx:156; server/conflict-detection.ts:51–61; vitest.config.ts:7–10.
- **Observed problem:** Running node node_modules/typescript/bin/tsc --noEmit --incremental false produced 66 diagnostic lines. Categories include TS2554 on the pull mutation call; TS2353 calendar class/component API mismatches; missing testing-library/vitest module declarations with downstream implicit-any errors; and TS2802 Map/Set iteration errors. tsconfig excludes *.test.ts but includes *.test.tsx, lacks an explicit target, and package scripts have no test entry. Installed dependencies may differ from the declared calendar/test versions; do not blame source alone.
- **Proposal:** In a separately approved disposable environment, reproduce with the locked dependency set, classify installation versus source/configuration errors, then propose narrowly scoped validation alignment. Do not install here, change library versions, silence errors, exclude meaningful tests or cast away type failures as an audit shortcut.
- **Benefit / consumers:** Reliable pre/post-refactor checks across the entire codebase.
- **Preservation:** Internal/tooling candidate only if runtime output/dependencies do not change. Calendar/library changes need their own visual/interaction proof and approval.
- **Risk / dependencies / effort:** Medium; approved dependency/runtime baseline and no-UI-change requirement; 1–2 days for diagnosis, remediation estimate afterward.
- **Verification:** Record dependency versions and reproduce diagnostics in isolation; run clean type-check and approved tests, then compare build and calendar/pull UI behaviors for any affected source changes. Current test suite was not run; no passing-test claim is made.
- **Decision:** Awaiting user approval.

## SHARED-013 — Runtime/setup documentation and configuration sources diverge
- **Priority / confidence:** P3 / high for mismatch, medium for deployment impact.
- **Evidence:** .nvmrc:1; .replit:1, 3–11, 42–44; SETUP.md:9–10, 18, 33, 45–77; scripts/post-merge.sh:4; server/storage.ts:116; server/routes.ts:12–13; sedZiKBNa:1 onward.
- **Observed problem:** Setup pins Node 20.20.0 while .replit declares Node 24; setup describes database provisioning although runtime loans use MemStorage; repository instructions differ from server constants. npm build/start coexist with a pnpm post-build prune and a configuration-like leftover file. These are discrepancies, not proof that publication currently fails.
- **Proposal:** Document the actual supported local/runtime/deployment paths, current data persistence and explicit sync policy. Establish which runtime version is authoritative before any toolchain change. Investigate references/provenance before proposing removal of sedZiKBNa; do not delete it now. Keep runtime/config changes separate from documentation corrections.
- **Benefit / consumers:** Less collaborator setup confusion and fewer unsupported assumptions during audit/refactor.
- **Preservation:** Internal documentation candidate; no app behavior or visual changes. Runtime upgrades are not included.
- **Risk / dependencies / effort:** Low for factual docs; requires owner confirmation of supported environments; 0.5–1 day.
- **Verification:** Cross-check documented commands with package scripts/config/source; use a disposable setup smoke test only after separate authorization. Do not claim a successful publish based on configuration inspection.
- **Decision:** Awaiting user approval.

## SHARED-014 — Token representations need drift checks, not visual normalization
- **Priority / confidence:** P3 / high for multiple representations; no specific color mismatch alleged.
- **Evidence:** client/src/styles/design-tokens.css:1–28; lib/design-tokens.ts:1–30; index.css:1–25; tailwind.config.ts; pages/design-system.tsx:6–31; .agents/skills/figma-design-system-compliance/SKILL.md:8–40.
- **Observed problem:** CSS custom properties, TypeScript exports, Tailwind semantic mappings and global base variables overlap. Independent edits can drift, but identical naming does not prove identical semantic purpose and the current UI is authoritative.
- **Proposal:** Add a separately approved read-only parity/checking specification for intentionally equivalent token mappings, or generate one representation only after identifying all intentional differences. Start with checks rather than replacing values or restructuring styles.
- **Benefit / consumers:** Reduce future token drift across all pages and the unrouted showcase.
- **Preservation:** Internal candidate only with exact emitted CSS/order/values and unchanged component markup. No Figma fetch, new tokens, styling correction or library replacement is authorized by this finding.
- **Risk / dependencies / effort:** Medium if generation changes cascade ordering; Design System report and approved equivalence map required; 0.5–1.5 days for checks.
- **Verification:** Compare every mapped token value plus emitted stylesheet ordering; fixture screenshots at representative desktop/mobile sizes, hover/focus/disabled/error states and font-load conditions. Keep intentional differences explicitly exempt, not silently rewritten.
- **Decision:** Awaiting user approval.

## Additional observations, not implementation recommendations
- Conflict resolution already validates requested paths against the pending list and checks lexical containment (server/routes.ts:669–699). This report does not falsely claim arbitrary unrestricted path input. Symlink safety and trusted remote tree handling remain untested.
- The conflict dialog retains resolution state until selected success paths clear it; stale-dialog/data transitions merit characterization before claiming a bug. No separate fix is recommended without reproduction.
- Sync status labels aggregate changed files as modified (GitHubSyncPanel.tsx:103–105). That wording is baseline; changing it is observable, not a free refactor.
- Root .replit contains both build and run deployment commands. No published runtime logs were consulted, so this audit cannot confirm or repair historical publication failures.
- A database module and user schema do not mean the app is using persistent loans or enforcing authentication. Do not connect unused infrastructure merely to make architecture look more uniform.
- Shared UI wrappers, unused routes and large assets are not deletion candidates based on static import absence alone. Asset byte hashes in baseline.md are the reference; no PDFs were deleted.

## Verification and handoff
Performed: static source/configuration review, whole included-tree byte inventory, primary-owner assignment and local import map; one non-emitting, non-incremental type check with a failed existing baseline. No live GitHub operations, external service mutations, migrations, package changes, workflow restarts, application source edits or browser tests.

Unverified: production perimeter, live connector permissions, gateway root cause, actual concurrent-sync behavior, installed-versus-lockfile reproducibility, binary rendering, exhaustive keyboard/responsive states, performance magnitude and page-specific deep findings. These limits do not remove coverage responsibility: page reviewers must fill their assigned state/dependency details; final consolidation must retain limitations that cannot safely be tested.

Next stage is the already-planned nine page reports followed by final lead consolidation. Do not create implementation tasks or merge fixes from these recommendations before individual approval. The final approval register should reference these stable IDs, distinguish internal candidates from scope exceptions, and never imply that approval of one sync refactor approves all sync policy changes.
