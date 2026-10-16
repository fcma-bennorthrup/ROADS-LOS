# Documents architecture audit

## Baseline, scope and limits

Audit date: 2026-10-14. **Audit only; no implementation is authorized.**

Read `baseline.md`, `coverage.md`, `shared.md`, `replit.md` and the audit constraints before tracing the page. Compared raw SHA-256 and size for **all 174 manifest files** against the lead's local snapshot (`ab0f85c1707e2b9355037c78a4d365dddba7e0019bf5559bb40659facabbee92`). The initial and pre-submission checker outputs reported **174 matches, zero missing/mismatched files** at those moments. Enumeration using the baseline exclusions found **no additional first-party files**. However, completion review flagged a subsequent dependency change; the latest comparison confirms **173 matches and one mismatch**. The earlier clean checks must not be read as certification of the current checkout.

**Baseline drift blocker for dependency-dependent conclusions:** `package-lock.json` has changed from the manifest's 317,096 bytes / SHA-256 `22cfba6c0877fa46d723ddc186a9ff026eb3712c25ef0e57c0cdeb967e2b5bc9` to 361,120 bytes / SHA-256 `caf5cbce73ec535033e36984f2c5d00e080a7a91c1575750b7008f7c52e9107e`. Current locked `react-day-picker` is 9.14.0. The completion review attributes the dependency update to a separate earlier commit, not this report; that attribution does not authorize it or establish a new baseline. This audit did not edit, restore, install from, or recapture the lockfile.

All Documents-owned source/tests/styles and the other manifest files still match. Their static first-party behavior and findings below remain reviewable. **Dependency reproducibility, library-provided behavior, installed-version explanations, test executability and runtime/visual equivalence are stopped/unverified against the approved snapshot.** The lead must reconcile this explicit drift or obtain separate authorization before accepting those sections or combining reports as one clean baseline. No remote or historical source was substituted for missing evidence.

This report owns the 22 Documents files assigned by `coverage.md`, including nine test files. Shared infrastructure is reviewed at its Documents-facing boundaries; recommendations already owned by the lead are referenced, not duplicated. No GitHub access, live API requests, browser launch, workflow restart, dependency installation, asset extraction, application edits, or real-service/storage mutations were performed. Test assertions were inspected, **not executed**. A test name containing “Figma” is not evidence of pixel equivalence.

All behavior below is **static source evidence**, not a claim of observed browser behavior. PDF treatment is byte fingerprint, existence and reference analysis only, consistent with the lead's baseline. No personal/example record contents are reproduced.

## Reachability and shell contract

- `client/src/App.tsx:22–35` routes `/loans/:id/documents` to `loan-documents.tsx`; `/` redirects to loan 1. Header navigation reaches Documents through `client/src/components/loan/LoanHeader.tsx:63–98`. Documents sub-sections and closing sub-tabs are local state, not independent URLs.
- `client/src/pages/loan-documents.tsx:37–44,92–103` defaults to **Disclosures**, takes the route ID (fallback `"1"`), and switches between **Disclosures** and **Closing Documents**. Sidebar switches unmount the other section. Its local Coming Soon helper (`:19–35,101–103`) is currently unreachable through the two configured navigation items (`DocumentsContent.tsx:214`); do not expose or delete it as a cleanup.
- Closing Disclosure and Closing Package are **Documents-owned sub-panels**, not the `/closing-booking` page. `DocumentsContent.tsx:31–36,50–63,180–211` defaults to Closing Disclosure, force-mounts both tab panels, and keys the inner component by loan ID. Switching these tabs preserves hooks/drafts; leaving the entire Closing Documents section unmounts them. Returning starts on Closing Disclosure.
- Standalone `loan-coming-soon.tsx` and `design-system.tsx` are not mounted by App. No supporting route needs to be added for this feature. The row clock glyph is decorative, not a hidden History page link.
- `loan-documents.tsx:46–72` replaces the whole page with “Loading loan details...” or “Failed to load loan data”. There is no page retry control. Successful rendering (`:74–111`) has an `h-screen` overflow-hidden row, header, fixed 240px sidebar, independently vertically scrolling content with 36px bottom clearance, full-width fixed bottom toolbar and activity panel. The header receives eight loan metadata/display properties, ECOA/TRID counts and `activeTab="Documents"`; currency uses the existing `parseFloat`/US two-decimal formatter (`:14–17`), not validation.
- Shared shell behavior remains baseline: horizontal header/toolbar overflow, checklist popup measured when opened, non-checklist toolbar placeholders, activity toggle, and GitHub admin menu. `LoanHeader.tsx:84–98,414–482`, `SideNav.tsx:7–63`, `ChecklistPanel.tsx:8–23`, `LoanActivityPanel.tsx` and SHARED-001/-011 own their wider architecture. A document refactor must not remount these panels accidentally.

## Behavior inventory: all categories and transitions

### Disclosures: At-App Disclosures and Loan Estimate

Source: `client/src/components/loan/DisclosureDocumentsContent.tsx:1–345`.

| State/action | Exact current contract |
|---|---|
| Initial state | Two sections, At-App Disclosures then Loan Estimate. Each starts idle with no generation or delivery timestamp, even if a persisted checklist/activity says the action previously completed. This state is component-local, not restored from checklist history. |
| Generate | Each local section changes idle/generated → generating, waits 5,000ms, records a locally formatted timestamp, becomes generated and invokes its callback (`:107–114`). Animated ellipsis cycles every 400ms and cleans up its interval. Local timeout is cleared on unmount/reset (`:91–105`). |
| Disabled semantics | Generate is `aria-disabled`, not native `disabled`; its click guard blocks generating/error state. Secondary buttons also stay focusable, use `aria-disabled`, and guard clicks until generated (`:159–215`). Do not silently replace with native disabled controls: keyboard/focus and appearance would change. |
| View/download | “Download At-App Disclosures” opens `/at-app-disclosures.pdf`; “View Loan Estimate” opens `/loan-estimate.pdf`, both via `window.open(url, "_blank")`, not an anchor `download` attribute (`:302–342`). Generation does not construct a PDF. Popup success is not checked. |
| Deliver | After generation, delivery calls its checklist/activity callback and then stamps local “Marked Delivered”. Repeat delivery refreshes the local displayed time even when the completed checklist action causes the callback to return early. There is no outbound delivery API. |
| Regenerate | Allowed after completion; generation updates the display but does not clear an existing delivery timestamp. During regeneration view/delivery are blocked. Checklist/activity callbacks are idempotent while their action is complete. |
| Checklist/activity | At-App maps to **Early Disclosures**, actions 0/1, fixed activity IDs. Loan Estimate maps to actions 0/1 and allocates new `-refire-N` IDs when previous activity exists (`:8–15,226–291`; timestamp formatter in `lib/loan-activity.ts`). Generation/delivery advances the shared checklist according to its existing precedence and full re-fire rules. Loan Estimate re-fire must preserve original events, not replace them. |
| Leaving/re-entering | Leaving the sidebar section/page loses local timestamps and cancels pending generation. Checklist/activity remain loan-keyed provider state persisted separately. This asymmetry is not automatically a defect. |
| Reset | A changed `demoResetVersion` clears local state and pending timers. Shared Reset Demo also clears runtime activity and resets checklist tasks. Dedicated Closing Disclosure reset deliberately does not broadcast a global reset to these sections. |

Callbacks use render-captured checklist/activity values when local timers are scheduled. Do not “modernize” closure behavior or combine the two categories' activity-ID strategies without characterization.

### Closing Disclosure

Sources: `DocumentsContent.tsx:19–178`; `hooks/use-closing-disclosures.ts:13–139`; `lib/closing-disclosure-history.ts:1–100`.

- Toolbar order is **Generate Closing Disclosure**, **Deliver Closing Disclosure**, **Reset Closing Disclosure**. These use native disabled attributes. Generate is blocked while generating/resetting/error. Deliver is enabled only for the newest undelivered row without error/reset; it intentionally remains possible to deliver that row while another generation is pending. Reset is disabled only while resetting.
- Generation is a 5-second component timer. At commit it reads current storage, verifies the captured reset token, chooses `max(id)+1` (safe-integer check) and prepends an undelivered row. Unlike package generation, pending disclosure generation is **not persisted across unmount**. A committed row is persisted; switching the two closing tabs does not cancel generation.
- The table has exactly seven columns: Document ID, Date Generated, Delivery Date, Assumed Delivery Date, Delivery Method, CD Viewed, actions. Rows sort descending by numeric ID, not date. The empty row spans seven columns and changes its text while generating. Generated date uses `Intl.DateTimeFormat("en-US", …)` with local time.
- Toolbar delivery targets the newest row as selected in that render. The hook's lower-level `deliver(id)` supports a specified ID, but the UI does not expose per-row delivery. A queued delivery rechecks row ID, generation timestamp, reset token and `!deliveredAt`. It captures click-time ISO timestamp and **local calendar date**, not eventual lock-commit time. First delivery is retained; duplicate queued writes do not replace it.
- Delivery assigns **Blend** and the click calendar date to all current borrower IDs, preserving viewing fields, unmatched historical borrowers, other disclosures and other loans. Zero borrowers still permits delivery and does not invent metadata. Manual delivery values may be overwritten by this explicit toolbar action; that is tested baseline behavior.
- Every row has a PDF view button, inert/aria-hidden History clock, and borrower editor trigger, in that order. All CD rows open the same imported sample PDF with `"_blank", "noopener,noreferrer"`. Viewing does not mark a borrower as viewed or create history.
- “Delivery is marked for prototype tracking only; no documents are sent.” is visible below the table. Generation/delivery/manual editing do not call checklist completion or emit activity events. The shared provider listens for **resets**, not these successes; adding checklist/activity integration would be a feature change.
- Reset uses a native confirmation with explicit disclosure-only scope. Cancel preserves rows and pending work. Confirm writes an empty reset envelope with a UUID and `resetScope: "disclosure"`; it cancels old generation across subscribed consumers, dismisses row-owned editors by removing rows, preserves package/other demo progress, survives remount and restarts numbering at CD 1.
- Invalid history/read failures show an alert and disable generation/delivery without overwriting storage. Initialization temporarily uses an empty history, then the mount refresh reports the error. Failed writes report errors without publishing optimistic rows/delivery. Failed reset leaves rows and an error; reset remains available. Load refresh clears errors after a successful read. Ordinary generation/delivery errors otherwise disable their retry buttons until a refresh/reset/remount; do not silently alter recovery semantics.
- `generating` ends when the timer queues its save, not when an asynchronous browser lock commits. Thus the generating message/button can clear before a new row appears, and another generation may be started while the earlier commit waits. Reset has its own pending guard. These are current timing contracts, not proof of duplicate-ID corruption.

### Borrower summary, editor and assumed dates

Sources: `ClosingDisclosureBorrowerCells.tsx:32–127`, `ClosingDisclosureBorrowerEditor.tsx:32–284`, `lib/closing-disclosure-borrowers.ts:24–198`.

- Roster comes from the loan response; matching is by borrower ID, never name. Missing metadata becomes blank fields for real borrowers. Unmatched saved IDs remain stored and produce an editor notice; they do not contribute to current-roster completion.
- Delivery date/method summaries distinguish blank, shared, mixed and partially recorded values. Empty date summaries use the legacy delivered-at display fallback; empty method says “Not recorded”. Bad borrower metadata produces “Borrower details unavailable”, independently of the outer valid history.
- Viewing is a **non-ROR prototype rule**: any explicit current borrower `Yes` means requirement met; no viewed date is required. All blanks show “Not recorded”; otherwise the summary reports count and requirement. No borrowers is neutral and non-clickable; unreadable details show error status. Popover lists individual names/roles, actual Yes/No/blank labels and optional viewed dates, not fabricated agreement across borrowers.
- Editor opens a fresh authoritative snapshot: loan, record ID, generation timestamp, reset token and baseline fields. Right-side Sheet has title “Closing Disclosure Delivery”, the non-ROR description, current borrower cards, four fields per borrower and a footer. Methods are blank/Blend/Mail/Hand Delivery; CD Viewed is blank/Yes/No; dates are native date inputs.
- Only the primary borrower (fallback first roster entry without relabeling their role) has “Apply delivery details to all borrowers”, and only for multiple borrowers. Initially checked only when all delivery methods/dates match and are nonblank. Checking immediately copies **only** delivery fields; later source delivery edits propagate while linked. Another borrower's delivery correction unlinks. Unchecking does not revert copied values. Viewing fields always stay independent.
- Save validates shape/enums/calendar-date syntax only: blank fields, Yes without date, and dates out of business sequence are accepted. No lending-rule validation is implied. Three-way per-field merge retains unrelated concurrent edits, preserves unmatched entries, and rejects a conflicting edit explicitly. Save never changes generation/delivery timestamps.
- Failed save keeps the draft open with an alert and permits retry. Read/open failure has no snapshot and disables inputs/save. Empty roster shows “No borrowers to track”, with save disabled. Cancel, Escape, X and outside-dismiss discard drafts in normal state. Pending save uses an immediate ref lock, disables fields/Cancel/Save, blocks dismiss/Escape/outside interaction and prevents duplicate queueing. A queued commit is not presented as cancellable.
- Assumed Delivery Date is **derived only**, never stored, and remains blank until the record has `deliveredAt`, even if manual borrower dates exist. It adds **three calendar days**, including weekends/holidays, using UTC noon date-only arithmetic to avoid DST elapsed-hour errors; e.g. 2026-10-14 → 2026-10-17. It retains mixed/partial summaries rather than choosing a date. If all current borrower dates are blank, legacy fallback uses the viewer's local day of `deliveredAt`. Invalid/out-of-range calculations display an unavailable message, not a normalized plausible date.
- The same legacy timestamp can therefore yield different date-only fallbacks in different local timezones. That follows the current explicit local-day rule; this audit does not propose changing it.

### Closing Package

Sources: `DocumentsContent.tsx:180–203`; `hooks/use-closing-package.ts:11–79`; `lib/closing-package-progress.ts:1–33`; shared `DocumentSection`.

- Uses the same section rendering/button semantics as Disclosures but supplies retained progress. Stores `{generatedAt, deliveredAt, generatingUntil}` per loan; a new generation persists the due time **now + 5 seconds** before updating the UI.
- A mounted timer finishes at that due time. Remount/refresh resumes the remaining delay; overdue work completes with a zero-delay timer and stamps the original **due time**, not return time. Component unmount clears the timer, not the persisted due time.
- During generation, generate/view/deliver are guarded. Completed package opens the imported sample PDF with noopener/noreferrer. Deliver only marks progress locally; repeats can update delivered time. Regeneration preserves previous delivery time. No outbound documents or checklist/activity success updates occur.
- Failed read/invalid progress gives a visible error and idle display without overwriting saved bytes. Failed start/complete/delivery retains the last successfully saved state, raises an alert and blocks further generate/deliver. A previously generated PDF can still be viewed on a delivery-write failure.
- Reset Demo removes the package key and broadcasts through the shared provider; disclosure-only reset preserves package state. Package state has **no own native/custom storage subscription or write lock**, unlike disclosure history. See DOCUMENTS-001 for cross-consumer consequences, not a recommendation to unify all document persistence.

## Persistence, API and effect boundaries

| Boundary | Evidence and consequences |
|---|---|
| Loan read | `loan-documents.tsx:42–44`; `lib/queryClient.ts:31–55`; `server/routes.ts:190–201`. Query key `["/api/loans", loanId]` joins to the GET URL, sends credentials, parses JSON and uses infinite stale time, no retry, no focus/interval refetch. Missing loan → 404; thrown storage operation → 500; page renders its generic error. There are no Documents mutation APIs. |
| Server roster | `server/storage.ts:4–24,58–85,105–116`; `shared/schema.ts:50–65`. Active MemStorage returns loan/borrowers, with stable seeded borrower identities. Document state lives in browser storage, not these tables. A schema declaration/database adapter is not document persistence. |
| Disclosure history | Key `loan-closing-disclosures:<loanId>`; reader accepts legacy array or reset-aware envelope; validates safe positive unique IDs and parseable timestamps, sorts rows, intentionally defers borrower validation. Update reloads storage inside a Web Lock when available, writes once, then sends a loan-specific custom event. Native storage handler ignores payload state and rereads authority, supports removal/clear, ignores unrelated loan/storage events, and removes listeners on cleanup. |
| Borrower writes | Share the disclosure key/lock and reset identity. ID/time/token checks occur inside the queued callback; field merge rejects only changed-vs-baseline conflicting fields. This protects a reset that reuses both number and timestamp. No separate borrower storage or assumed-date cache exists. |
| Package | Key `loan-closing-package:<loanId>`; validates date-or-null fields and rejects delivered-without-generated. All writes use `progressRef` and replace the full object. It reloads on shared reset-version changes only. It does not subscribe to package changes by other consumers. |
| Checklist | `contexts/checklist-context.tsx:159–211,241–285,303–329,353–429`. Loan-keyed provider remount; action precedence complete → blocked → re-fire → in-progress → not-started. Disclosure reset token changes reset Closing Disclosure task; only non-scoped/global reset broadcasts demo reset. Package removal precedes disclosure reset in the broad reset operation. See shared-impact note below. |
| Activity | `contexts/loan-activity-context.tsx:46–99,119–169`; `lib/loan-activity.ts:1–10`. Loan-keyed runtime events stored separately from seeded entries, deduplicated by ID; activity panel filtering/sorting is shared. Only the first two document categories emit here. Reset Demo clears runtime activity from the panel handler. |
| Global API side effect | App mounts `useGitHubSync` even on this route (`App.tsx:39–61`; `hooks/use-github-sync.ts:39–42`): pending-conflicts query is separate from the loan query. Admin dialog/menu can reach shared endpoints. No audit browser was opened to avoid invoking these global consumers in a non-isolated environment. |

Effect lifecycle: local section timers/ellipsis have cleanup; disclosure hook unsubscribes and cancels pending timer; package timer uses effect cleanup and a same-consumer ref guard; keyed closing component and keyed providers isolate loan changes. The code does not cancel an already-queued Web Lock write merely because a component unmounts; authoritative reset/record checks still apply at commit. This distinction must survive any hook extraction.

## Visual, responsive and asset contracts

- `ClosingDocumentsContent.css:1–243`: 48px tab strip, active underline, explicitly hidden inactive force-mounted panels, wrapped toolbar, max-content horizontal table, row icon dimensions, disabled colors and focus outlines. At ≤767px, content padding changes, tabs span width and toolbar buttons stack. Preserve the seven-column order and focusable horizontally scrolling region.
- `ClosingDisclosureBorrowers.css:1–596`: success/pending/neutral/error badges, popover portal stacking (`z-index:60`), bounded viewport scroll; Sheet width `min(584px,100vw)`, `100dvh`, animations/transforms explicitly suppressed; body scroll with fixed header/footer; two-column fields collapse to one at ≤600px. Close-button override relies on the primitive's last-child button structure (`:201–221`); changing wrapper DOM is not a harmless refactor.
- `components/ui/sheet.tsx:18–74`, `popover.tsx:10–25`, `tabs.tsx:6–53` supply Radix portals, semantics, focus and interaction behavior; `lib/utils.ts` merges wrapper classes. Native date/select/details elements remain native. Preserve tab Arrow-key behavior, sheet focus containment/return, Escape/outside interactions, help disclosure, and `aria-live`/alert text. These have not been visually or assistive-technology verified here.
- Global CSS/token cascade remains lead-owned (`index.css`, `styles/design-tokens.css`, SHARED-014). The mixture of token values and existing structural pixel values is baseline, not a mandate to normalize styles.
- Four directly used PDFs exist and match baseline bytes: `client/public/at-app-disclosures.pdf`, `client/public/loan-estimate.pdf`, `attached_assets/SampleCD_1777397678654.pdf`, `attached_assets/Redacted-ClosingPackage_Redacted_1777397693832.pdf`. First two use public root URLs; last two use Vite asset imports. No blob creation, per-loan PDF content, file upload, PDF parse or network delivery is implemented here.
- PDF open behavior and bytes must remain identical. Binary sync/oversized package concerns belong to **SHARED-003**, not a competing Documents change. No rendering, download headers, popup-blocker behavior, or embedded PDF contents were verified.

## Owned file coverage and associated tests

All paths below are under `client/src/`. Every assigned file was inspected; CSS is covered in full for layout/state selectors, not by a live visual comparison.

| Owned implementation file | Review coverage |
|---|---|
| `pages/loan-documents.tsx` | Full route shell, query branches, navigation, unreachable local fallback, child mount boundaries. |
| `components/loan/DocumentsContent.tsx` | Both closing tabs, toolbar, table/empty states, all row actions, PDF imports, keyed wrapper and re-export boundary. |
| `components/loan/DisclosureDocumentsContent.tsx` | Ellipsis, formatting, local/retained section modes, button guards, cleanup, category callbacks and activity/re-fire IDs. |
| `components/loan/ClosingDisclosureBorrowerCells.tsx` | Parse isolation, summaries/fallback, assumed-date failure, all status/popover branches. |
| `components/loan/ClosingDisclosureBorrowerEditor.tsx` | Snapshot/draft lifecycle, linking, validation errors, queued-save lock, all controls and dismissal states. |
| `components/loan/ClosingDisclosureBorrowers.css` | Entire summary/popover/editor styling and ≤600px rules. |
| `components/loan/ClosingDocumentsContent.css` | Entire closing view styling and ≤767px rules. |
| `components/loan/ClosingDocumentIcon.tsx` | All three decorative SVG variants; accessible action names live on parent buttons. |
| `hooks/use-closing-disclosures.ts` | Read/refresh/error, generation, delivery/reset queueing, timer and subscription lifecycle. |
| `hooks/use-closing-package.ts` | Initial load, save/ref, reset reload, persisted deadline and controls. |
| `lib/closing-disclosure-history.ts` | Legacy/envelope validation, sorting, locking fallback, reset and notifications. |
| `lib/closing-disclosure-borrowers.ts` | Shape/date validation, summaries, delivery, edit snapshots/merge, calendar arithmetic. |
| `lib/closing-package-progress.ts` | Key, empty defaults and validator. |

| Owned test file | Assertions inspected; not a passing-test claim |
|---|---|
| `components/loan/__tests__/DocumentsContent.test.tsx:81–318` | Action order/style equality, aria-disabled delivery, timing, category/checklist/activity integration, duplicate prevention, Loan Estimate full re-fire and Reset Demo. |
| `components/loan/__tests__/ClosingDocumentsContent.test.tsx:51–653` | Default/keyboard tabs; seven columns; generation/order; newest-only delivery and preservation during generation; PDFs/inert clock; remount/loan isolation; invalid/write-failed storage; scoped/global reset and cancel; independent hook consumers; stale notifications; reset token and mocked lock serialization. |
| `components/loan/__tests__/ClosingPackageProgress.test.tsx:56–248` | Exact timestamp retention, remaining/overdue deadline, loan isolation, mounted/unmounted reset, disclosure-only reset, invalid/blocked reads, failed start/finish/delivery/removal. No independent same-loan package-consumer conflict test. |
| `components/loan/__tests__/ClosingDisclosureBorrowers.test.tsx:27–314` | Stable server roster IDs, unmatched metadata retention, viewed dates outside table, exact field choices, link/save/remount, cancel/Escape/X, zero roster, failed draft retention, queued duplicate-save/dismiss guard, remote update/conflict, reset dismissal, delivery overwrite preserving viewing. |
| `components/loan/__tests__/ClosingDisclosurePanel.test.tsx:25–179` | Editor structure/text, source checkbox, copy/unlink/individual override, primary fallback, one-Yes rule, unreadable metadata and linked-draft failure. DOM assertions are not Figma screenshots. |
| `components/loan/__tests__/ClosingDisclosureAssumedDate.test.tsx:28–138` | Seven-column example, commit-before-display, failed delivery blankness, linked corrections/remount, cross-tab mixed summaries/reset, local-day legacy fallback, malformed metadata. |
| `hooks/__tests__/use-closing-disclosure-delivery.test.tsx:48–229` | Atomic borrower delivery, no fake zero-roster data, click-time local date across midnight/offsets, queued duplicates, stale viewing merge, sync/async failure, bad metadata, reset/replacement identity and stale editor conflict. |
| `lib/__tests__/closing-disclosure-assumed-date.test.ts:11–62` | Calendar +3 across month/year/leap/DST/weekend/holiday, multiple timezones, invalid/range error, blank-until-delivered, mixed/partial/fallback and non-mutation. |
| `lib/__tests__/closing-disclosure-borrowers.test.ts:18–189` | One-Yes summary/badges, linking conditions, legacy reads, field saves/clear, independent/conflicting merge, loan/disclosure/reset identity, queued lock recheck, failed writes, malformed borrower isolation, permissive date-only validation and summaries. |

Shared test/support dependencies: `client/src/test/setup.ts:1–6` clears jsdom localStorage; `vitest.config.ts:5–18` configures jsdom/aliases; shared checklist/activity tests cover their own surfaces; `server/__tests__/storage.test.ts` belongs to the lead. Some borrower/assumed-date component tests mount a loanId prop different from the provider's location-derived key; those test local document behavior, not full route/provider reset wiring. Routed harnesses in closing/package/hook tests provide complementary coverage. Existing tests use synthetic events and mocked lock queues, not truly concurrent browser windows.

## Findings and individual approval entries

Priority: P1 high-consequence correctness risk; P2 bounded correctness/maintainability/verification concern. Confidence is confidence in source evidence, not production incidence. **No performance gain was measured.** Each item is independently decidable; approving this audit does not approve implementation.

### DOCUMENTS-001 — Package writes can overwrite a newer same-loan consumer's progress

- **Priority / confidence / class:** P2 / high static evidence / correctness defect in multi-consumer state handling; not runtime-reproduced.
- **Evidence:** `client/src/hooks/use-closing-package.ts:25–36,39–63,71–77`; `client/src/lib/closing-package-progress.ts:13–33`; contrast `client/src/lib/closing-disclosure-history.ts:54–100`.
- **Observed problem:** Package saves replace storage from a consumer-local ref and do not subscribe to package events or reread authoritative progress. Example: two windows load idle; A generates/delivers; B still considers itself idle and starts generation, writing its null generation/delivery fields over A's persisted values. A stale pending timer can similarly overwrite another consumer's newer state. The ref guard protects only against resets already loaded in that instance.
- **Suggested change:** After an explicit behavioral exception, give package updates their own authoritative read/modify/write, subscription and operation/reset identity boundary; agree how a remote reset invalidates queued deadlines. Do not reuse the disclosure row schema or change package due-time/retention semantics.
- **Benefit / scope:** Protect browser-local package timestamps across same-loan consumers. Affects package hook/progress library, Documents UI and shared package reset integration; no backend needed.
- **Preservation rationale:** Single-consumer appearance, labels, delay, due-time stamping, repeat delivery, regeneration-retained delivery and PDF behavior can remain unchanged. **Multi-window conflict/reset outcomes change, so this is outside preservation-only implementation scope without approval.**
- **Risk / dependencies / effort:** Medium–high; reset ordering and browsers without Web Locks need a defined policy; coordinate SHARED-011 and DOCUMENTS-002 without bundling decisions. Approximately 1–2 days plus verification.
- **Verification plan:** Safe fixture storage with two independent consumers: A complete/deliver before stale B generate; different pending deadlines; remote reset/removal before timer callback and before notification; same-window multi-instance updates; another loan; lock/write/read failures. Assert exact old single-consumer snapshots/timestamps and no lost approved progress. Desktop/mobile screenshots and keyboard action checks in idle/generating/generated/delivered/error states. No real user storage.
- **Performance:** Not a performance proposal; added synchronization costs unmeasured.
- **Decision:** Awaiting user approval.

### DOCUMENTS-002 — Disclosure fallback does not guarantee cross-window serialization

- **Priority / confidence / class:** P2 / high for absent transaction boundary, medium for occurrence / conditional concurrency risk.
- **Evidence:** `client/src/lib/closing-disclosure-history.ts:54–71`; `client/src/hooks/use-closing-disclosures.ts:84–91`; `client/src/lib/closing-disclosure-borrowers.ts:146–172`; `client/src/components/loan/__tests__/ClosingDocumentsContent.test.tsx:477–518,622–652`.
- **Observed problem:** With Web Locks available, mutations serialize. Without them, synchronous read/modify/write avoids stale React snapshots **within one execution context**, but not interleaved read/write across separate browser windows. Two windows can read the same array then overwrite one another, allocate the same next ID, or bypass conflict detection against a concurrent edit. The comment claiming prevention in older browsers is broader than the actual guarantee. Existing independent hook tests execute synchronous fallback callbacks serially; they do not prove real cross-window atomicity.
- **Suggested change:** First approve a supported-browser/coordination policy, then isolate storage coordination behind a tested adapter. If unsupported environments must remain writable, use an actually transactional coordination mechanism; if not, an explicit unsupported/error path is a separately observable choice. Merely moving helpers does not solve this race.
- **Benefit / scope:** Defined concurrency guarantees for disclosure generation, delivery, resets and borrower saves; shared checklist is a subscriber.
- **Preservation rationale:** Preserve Web Lock path outputs, metadata, errors, event order and all visuals. **Fixing unlocked concurrency or disabling unsupported writes changes outcomes and needs a scope exception.** Do not silently introduce a database or service.
- **Risk / dependencies / effort:** High concurrency/persistence compatibility risk; requires supported-browser decision and legacy-data preservation fixtures; 1 day characterization/policy, 1–3 days implementation depending on approved strategy.
- **Verification plan:** Two isolated real browsing contexts with Web Locks explicitly unavailable, barrier-controlled interleaving of reads/writes, simultaneous generation, independent borrower edits, conflicting same-field edits and reset-before-commit. Repeat with locks present; compare all serial UI states, errors, PDF actions, focus and retained history. Synthetic single-thread renderHook tests alone are insufficient.
- **Performance:** No measured impact; not an optimization recommendation.
- **Decision:** Awaiting user approval.

### DOCUMENTS-003 — Separate local document progress from retained-progress presentation

- **Priority / confidence / class:** P2 / high / behavior-preserving maintainability candidate.
- **Evidence:** `client/src/components/loan/DisclosureDocumentsContent.tsx:50–114,159–215`; retained caller `client/src/components/loan/DocumentsContent.tsx:180–200`; `client/src/hooks/use-closing-package.ts:65–79`.
- **Observed problem:** `DocumentSection` owns local state/timer/reset effects even when retained progress is supplied, and interleaves mode selection, timestamp formatting, rendering and secondary-action side effects. It is easy for a future change to erase the deliberately different retention, disabled and delivery semantics.
- **Suggested internal change:** Extract a presentational section with the **same markup/styles**, keep the local timer controller in a dedicated wrapper/hook, and adapt retained package progress into the same presentation contract. Keep category callbacks and action ordering at their existing ownership boundary; do not unify persistence policies or timestamp formatters.
- **Benefit / scope:** Makes the two progress modes explicit and independently characterizable; affects At-App, Loan Estimate and Closing Package only.
- **Preservation rationale:** Internal candidate only. Must preserve callback-before-delivery-stamp ordering, old delivery timestamp during regeneration, focusable aria-disabled buttons, local unmount cancellation, package resume and existing reset-version behavior. No new validation, retry, labels or timing.
- **Risk / dependencies / effort:** Medium due to mount/closure/effect ordering; depends on characterization of both modes, not DOCUMENTS-001/-002 fixes. Approximately 0.5–1.5 days.
- **Verification plan:** Run existing Documents/package tests in an approved disposable environment; add before/after fixtures for local unmount cancellation vs package deadline resume, repeated delivery timestamp vs idempotent callback, storage error PDF access, reset while generating and hidden-tab progress. Exact DOM/style comparisons and screenshots at 1440px, 768px, 767px and 390px with keyboard focus on guarded buttons.
- **Performance:** Unused local state is not evidence of a meaningful bottleneck; benefit is cohesion, no speed claim.
- **Decision:** Awaiting user approval.

### DOCUMENTS-004 — Add route-level preservation checks before approved restructuring

- **Priority / confidence / class:** P2 / high / verification gap, behavior-preserving test-only candidate.
- **Evidence:** `client/src/pages/loan-documents.tsx:37–111`; nine owned test files above; `client/src/components/loan/__tests__/ClosingDisclosureBorrowers.test.tsx:15–19`; `client/src/components/loan/__tests__/ClosingDisclosureAssumedDate.test.tsx:21–26`; `client/src/components/loan/__tests__/ClosingPackageProgress.test.tsx:20–28`.
- **Observed problem:** Component/helper tests cover many difficult states, but none of the assigned tests imports the routed page. Page query branches, real sidebar unmount boundaries, route/provider loan identity and full-shell overlay/responsive behavior are not covered together. DOM/class assertions cannot establish exact appearance or browser-native keyboard behavior.
- **Suggested internal change:** Add a safe fixture route harness and a small visual/interaction characterization suite before any approved structural change. Stub loan and global GitHub queries; disable all external mutation transports. Keep application source and dependencies unchanged unless separately approved.
- **Benefit / scope:** Detect loss of local vs persisted progress, wrong-loan resets, shell overlap and query-state regressions across Documents; shared shell fixtures should be consolidated by the lead, not cloned for each page.
- **Preservation rationale:** Tests record existing behavior, including no-op clock, local state loss and permissive fields; do not update expectations to a preferred redesign. This does not authorize feature fixes.
- **Risk / dependencies / effort:** Low application risk; medium fixture/font/timezone stability risk. Depends on SHARED-012 establishing a runnable locked test environment and lead coordination for shared harness. Approximately 1–2 days.
- **Verification plan:** Delayed/404/invalid-response/success fixtures; sidebar and route round-trips during both generation types; route loan change; empty roster; editor save/cancel/failed save/queued lock; disclosure-only vs broad reset; screenshots above/below both breakpoints with activity/checklist open, table scrolled and editor opened from an older row. Verify exact PDF URL/open arguments and hash fixtures without making external requests.
- **Performance:** No speed claim; any render/request count captured is a baseline, not an optimization target.
- **Decision:** Awaiting user approval.

## Shared-impact notes for lead consolidation

These are **not additional independently competing implementation proposals**:

1. **SHARED-001:** Preserve Documents' exact loading/error shell, route default, formatting and unmount behavior when sharing query/type helpers.
2. **SHARED-011:** Reset integration is a transaction boundary as well as a render concern. `checklist-context.tsx:363–401` removes package progress before attempting disclosure reset; if that later reset write fails, the package key is already gone and `finish()` does not run. A mounted package may still show old state while remount shows idle; a pending package timer may rewrite it. `ChecklistPanel.tsx:14–21` also calls runtime-activity reset after invoking the non-awaitable reset method. Ask the lead to consolidate partial-reset failure handling under shared ownership; changing it requires an observable-outcome exception. Fixture verification should inject failure at each ordered step rather than only first-step removal failure.
3. **SHARED-003:** Both imported closing PDFs must survive any sync policy work. Static PDFs are intentional current outputs; do not shrink/delete/replace them for architecture cleanup.
4. **SHARED-009:** The page relies on direct JSON parsing and generic load failure. Preserve exact errors unless separately approved. Root-relative public PDF paths are current root-hosting behavior; artifact/base-path migration would require a coordinated shared change, not an audit patch.
5. **SHARED-012:** The lead recorded an existing failed non-emitting type check and missing test declarations. This review did not rerun that same check or install tooling. Test readiness must be established in isolation before claiming a refactor is verified.
6. **SHARED-014:** Keep the existing Sheet animation suppression, last-child close-button dependency, native controls, spacing and token cascade. A wrapper/token cleanup needs the Documents editor/popover matrix as a consumer check.

## Costs, uncertainty and verification handoff

- **Unmeasured performance hypotheses only:** Every disclosure storage load validates/sorts the entire history; every update serializes it, and both shared checklist and document subscribers reread on events. The UI maps all history rows, with borrower lookup/scanning per row and editor state per row. Large histories could increase synchronous work/storage pressure. There is no measured row count, user workload, render profile, storage-quota incident or latency benchmark here; no pagination, virtualization, cache or retention-limit change is proposed.
- `Math.max(...recordIds)` and unbounded history could eventually hit engine argument/storage limits, but practical thresholds and impact were not measured. Existing save errors remain the fallback, not a validated capacity guarantee.
- No runtime claim about screen-reader output, focus return after reset-removal, native calendar rendering, suspended background timers, popup blockers, Web Lock availability, actual parallel windows, font loading, PDF rendering or production routing is made.
- Recommendations requiring changed outcomes are DOCUMENTS-001/-002; internal/test-only candidates are DOCUMENTS-003/-004. None is approved. Shared concerns retain their SHARED IDs and lead ownership.
- Final acceptance for any future approved change must compare baseline vs candidate using identical safe fixtures, fixed clocks/timezones, fonts, viewport sizes, storage envelopes and PDF bytes. Include loading/error/empty, all enabled/guarded states, older/newest rows, malformed metadata, asynchronous failure and every cancel/reset path—not just the first render.
- This auditor edited only this report; the workspace also has the separately surfaced lockfile drift described above. No memory update is needed: the durable audit constraints are already documented, and implementation details/findings belong here rather than being duplicated in memory. No new follow-up tasks are proposed because the already-planned lead consolidation covers the next step, including baseline reconciliation.

### Final verification

The report was checked against the owned-file assignment and source citations. The pre-submission comparison returned 174 matches, but the **latest whole-manifest comparison after completion feedback returns 173 matches and one mismatch: package-lock.json**, with exact hashes/sizes listed above. It supersedes the earlier clean result for current-checkout acceptance. Application source, tests, styles and assets still match the manifest; dependency files cannot be certified unchanged. No executed tests, visual-equivalence result or measured performance result is claimed. The static Documents report is delivered with the dependency-dependent review blocked for the lead; resolving the mismatch is not an authorized application/dependency edit in this task.
