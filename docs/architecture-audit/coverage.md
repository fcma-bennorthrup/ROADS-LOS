# Architecture audit coverage and reviewer handoff

## Ownership rules
The baseline contains **174 files** with one primary review owner each. This report assigns the whole included tree, not just active routes or recent changes. The exact path, byte size and SHA-256 of every file are in baseline.md. Lead ownership includes 18 binary/static assets and the dependency lockfile; this does not mean each binary was visually rendered or every dependency was audited internally.

Page reviewers own their complete page-specific dependency chain and nested states. Shared infrastructure stays lead-owned; page agents document consumer-specific risks and reference SHARED finding IDs instead of independently proposing conflicting shared rewrites. Read-only cross-review is expected. A primary owner is not an edit authorization. Any source not represented in the baseline must be reported to the final architect for explicit assignment.

The lead establishes this baseline, page agents review independently in parallel, and the final lead reconciles their reports afterward. This is **staged oversight**, not live supervision or communication between isolated task-agent environments. Do not claim the page audits are already complete.

## Review matrix
| Owner | Files | Report | State at handoff |
|---|---:|---|---|
| Lead shared-infrastructure review (shared) | 128 | shared.md | Shared static review documented; runtime limitations explicit |
| Summary page reviewer (summary) | 3 | summary.md | Assigned; independent page review pending |
| Origination page reviewer (origination) | 8 | origination.md | Assigned; independent page review pending |
| Decisioning page reviewer (decisioning) | 5 | decisioning.md | Assigned; independent page review pending |
| Documents page reviewer (documents) | 22 | documents.md | Assigned; independent page review pending |
| Closing and Booking page reviewer (closing-booking) | 3 | closing-booking.md | Assigned; independent page review pending |
| History page reviewer (history) | 2 | history.md | Assigned; independent page review pending |
| Design System page reviewer (design-system) | 1 | design-system.md | Assigned; independent page review pending |
| Coming Soon page reviewer (coming-soon) | 1 | coming-soon.md | Assigned; independent page review pending |
| Not Found page reviewer (not-found) | 1 | not-found.md | Assigned; independent page review pending |

The final lead produces final-review.md and approval-register.md after all nine page reports exist. It must check drift, missing nested states, duplicate findings, contradictory proposals, preservation classification and individual approval status. Missing evidence is a gap to disclose, not grounds to declare a clean page.

## Shared ownership boundaries and cross-review
| Shared area | Primary owner | Consumers / required cross-review |
|---|---|---|
| App router/providers, main entry, header, toolbar, SideNav | shared | Every routed loan page; Coming Soon's source; Not Found global providers; preserve remount/selection behavior. |
| Checklist provider/panel/timeline | shared | Origination, Decisioning, Documents and Closing/Booking workflows; compare action ordering, reset and re-fire behavior. |
| Activity provider/panel/timestamps | shared | All loan pages and History; Documents emits events; preserve per-loan storage and sort/filter semantics. |
| Document history/progress/borrower helpers and hooks | documents | Checklist provider consumes their reset/subscription interfaces; shared lead reviews the boundary, Documents reviewer audits internals and all tests. |
| RoadsDatePicker, RoadsDropdown, UI wrapper directory, use-mobile/use-toast | shared | Every consuming page; Documents has specialized disclosure editors. Do not replace custom interactions with library defaults. |
| Global CSS, design-tokens.ts, design-tokens.css, Tailwind/PostCSS configuration | shared | Design System reviewer inspects showcase consumers and drift; all page reviewers check preservation risks. No token or styling changes. |
| GitHub panel/dialog/context/hook/response parser; all server GitHub modules | shared | Global admin surface reachable from LoanHeader; audit-only, no live requests or sync. |
| API/query client, schema, MemStorage, unused database adapter | shared | Every loan page; page reviewers retain current loading/error/default/display behavior. |
| Static/public PDFs and attached assets | shared | Documents plus Origination/Decisioning reviewers verify their own asset references, download/open behavior and ownership assumptions. No PDF deletion/deduplication without approval. |
| Build/start/publish config, root scripts, lockfile, documentation, custom skill | shared | All reviewers inherit these constraints; final lead distinguishes environment failures from source regressions. |
| Tests | Owner of unit under test | Shared checklist/activity/server/response tests stay shared; document tests stay documents, and Origination/Decisioning tests follow their components. |

## Page-specific minimum coverage
- **Summary:** ratios, borrower cards and nested affordances, data mapping/formatting, responsive shell, loading/error states and shared panels.
- **Origination:** all five sidebar sections; any search-param navigation; borrower editor, collateral task flows, product/pricing scenarios, fee/details forms; PDF references, lifecycle/reset/edit/cancel states and existing component tests.
- **Decisioning:** summary and borrower financials, balance sheet internals, checklist effects and decision states; all nested tables/forms/dialogs and tests.
- **Documents:** both sidebar entries and every document-specific panel/tab; disclosure generation/delivery/refire, closing package progress, borrower assumed-date/edit paths, document history persistence/subscriptions/reset behavior, PDFs and all related tests/styles/hooks/helpers. Do not move these internals into Closing/Booking solely because of their names.
- **Closing/Booking:** both content components, each nested selection/state/form, shell integration and fallback branches. Coordinate document-progress interface findings by reference rather than taking Documents ownership.
- **History:** complete HistoryContent, filtering/search/table/details and relation to shared activity state; confirm what is seeded vs runtime.
- **Design System:** entire showcase including unmounted sections and token export use; keep it unrouted. Shared lead owns token definitions, CSS and UI wrappers.
- **Coming Soon:** standalone unrouted page, query/loading/error/defaults and shell. Compare duplicate local placeholder helpers as evidence, but each consuming page owns its helper. Do not delete or mount it based only on import absence.
- **Not Found:** fallback rendering plus provider context, navigation/keyboard/accessibility as currently implemented. API HTML fallback is a separate shared concern.

## Required report format
Start with baseline comparison (all matching, or exact missing/mismatched files), scope and nested states, current behavior/data flows, test/static observations and limitations. A page with no actionable finding is acceptable.

Each recommendation needs a stable page-prefixed ID; priority; confidence; exact path:line evidence; observed problem; proposed internal change; expected benefit; affected consumers; preservation rationale; risks; dependencies; effort; specific regression/visual/interaction verification; measured-performance versus hypothesis label; and **Decision: Awaiting user approval**. Use SHARED references for cross-cutting findings. Separate behavior-preserving proposals from observable defect fixes requiring an explicit scope change. No implementation tasks or source edits are authorized.

Suggested prefixes: SUMMARY, ORIGINATION, DECISIONING, DOCUMENTS, CLOSING-BOOKING, HISTORY, DESIGN-SYSTEM, COMING-SOON, NOT-FOUND. IDs remain stable even if priority changes. Final consolidation must preserve provenance when merging duplicates.

No live push/pull, force sync, repo creation, database migrations or production probing. Runtime checks require an isolated disposable copy with safe fixtures and no real writes; otherwise record static/unverified. Never expose personal records or credential contents in reports. Read-only type checks may use --incremental false to avoid generated workspace output.

## Exact file assignment
Every manifest path appears exactly once below. These lists include assets/configuration/tests, not only modules. Shared unreferenced UI wrappers and the configuration-like sedZiKBNa file are retained in scope; absence of an import is not proof they can be deleted.

### Lead shared-infrastructure review
- `.agents/skills/figma-design-system-compliance/SKILL.md` — instruction/documentation
- `.gitignore` — configuration/tooling
- `.npmrc` — configuration/tooling
- `.nvmrc` — configuration/tooling
- `.replit` — configuration/tooling
- `.replitignore` — configuration/tooling
- `CONTRIBUTING.md` — instruction/documentation
- `SETUP.md` — instruction/documentation
- `attached_assets/0_Screenshot_2026-09-08_at_4.59.18_PM_1788901164395.png` — asset
- `attached_assets/Rate_Lock_Letter_-_Consumer_Redacted_1777397784766.pdf` — asset
- `attached_assets/Redacted-ClosingPackage_Redacted_1777397693832.pdf` — asset
- `attached_assets/Sample-Loan-Estimate_1776089511706.pdf` — asset
- `attached_assets/SampleCD_1777397678654.pdf` — asset
- `attached_assets/Screenshot_2026-10-14_at_3.39.58_PM_1792006821810.png` — asset
- `attached_assets/Test_25591_4_9c1ebd4dbd_single_adhoc_test_run_(1)_1776280671096.pdf` — asset
- `attached_assets/experian-sample-report_(1)_1776280916046.pdf` — asset
- `attached_assets/rick_1776281894830.pdf` — asset
- `attached_assets/screenshots/fe33a2ad-8515-4e59-b2c4-2d8455ceb970-00-22g5xa6ipcrp6_janeway_replit_dev_loans_1.png` — asset
- `attached_assets/screenshots/fe33a2ad-8515-4e59-b2c4-2d8455ceb970-00-22g5xa6ipcrp6_janeway_replit_dev_loans_1_origination.png` — asset
- `client/index.html` — configuration/tooling
- `client/public/at-app-disclosures.pdf` — asset
- `client/public/decision-letter.pdf` — asset
- `client/public/favicon.png` — asset
- `client/public/loan-estimate.pdf` — asset
- `client/src/App.tsx` — source
- `client/src/components/ConflictResolutionDialog.tsx` — source
- `client/src/components/GitHubSyncPanel.tsx` — source
- `client/src/components/loan/ChecklistActionTimeline.tsx` — source
- `client/src/components/loan/ChecklistPanel.tsx` — source
- `client/src/components/loan/LoanActivityPanel.tsx` — source
- `client/src/components/loan/LoanHeader.tsx` — source
- `client/src/components/loan/RoadsDatePicker.tsx` — source
- `client/src/components/loan/RoadsDropdown.tsx` — source
- `client/src/components/loan/SideNav.tsx` — source
- `client/src/components/loan/__tests__/ChecklistPanel.test.tsx` — test
- `client/src/components/loan/__tests__/LoanActivityPanel.test.tsx` — test
- `client/src/components/ui/accordion.tsx` — source
- `client/src/components/ui/alert-dialog.tsx` — source
- `client/src/components/ui/alert.tsx` — source
- `client/src/components/ui/aspect-ratio.tsx` — source
- `client/src/components/ui/avatar.tsx` — source
- `client/src/components/ui/badge.tsx` — source
- `client/src/components/ui/breadcrumb.tsx` — source
- `client/src/components/ui/button.tsx` — source
- `client/src/components/ui/calendar.tsx` — source
- `client/src/components/ui/card.tsx` — source
- `client/src/components/ui/carousel.tsx` — source
- `client/src/components/ui/chart.tsx` — source
- `client/src/components/ui/checkbox.tsx` — source
- `client/src/components/ui/collapsible.tsx` — source
- `client/src/components/ui/command.tsx` — source
- `client/src/components/ui/context-menu.tsx` — source
- `client/src/components/ui/dialog.tsx` — source
- `client/src/components/ui/drawer.tsx` — source
- `client/src/components/ui/dropdown-menu.tsx` — source
- `client/src/components/ui/form.tsx` — source
- `client/src/components/ui/hover-card.tsx` — source
- `client/src/components/ui/input-otp.tsx` — source
- `client/src/components/ui/input.tsx` — source
- `client/src/components/ui/label.tsx` — source
- `client/src/components/ui/menubar.tsx` — source
- `client/src/components/ui/navigation-menu.tsx` — source
- `client/src/components/ui/pagination.tsx` — source
- `client/src/components/ui/popover.tsx` — source
- `client/src/components/ui/progress.tsx` — source
- `client/src/components/ui/radio-group.tsx` — source
- `client/src/components/ui/resizable.tsx` — source
- `client/src/components/ui/scroll-area.tsx` — source
- `client/src/components/ui/select.tsx` — source
- `client/src/components/ui/separator.tsx` — source
- `client/src/components/ui/sheet.tsx` — source
- `client/src/components/ui/sidebar.tsx` — source
- `client/src/components/ui/skeleton.tsx` — source
- `client/src/components/ui/slider.tsx` — source
- `client/src/components/ui/switch.tsx` — source
- `client/src/components/ui/table.tsx` — source
- `client/src/components/ui/tabs.tsx` — source
- `client/src/components/ui/textarea.tsx` — source
- `client/src/components/ui/toast.tsx` — source
- `client/src/components/ui/toaster.tsx` — source
- `client/src/components/ui/toggle-group.tsx` — source
- `client/src/components/ui/toggle.tsx` — source
- `client/src/components/ui/tooltip.tsx` — source
- `client/src/contexts/checklist-context.tsx` — source
- `client/src/contexts/github-sync-context.ts` — source
- `client/src/contexts/loan-activity-context.tsx` — source
- `client/src/hooks/use-github-sync.ts` — source
- `client/src/hooks/use-mobile.tsx` — source
- `client/src/hooks/use-toast.ts` — source
- `client/src/index.css` — source
- `client/src/lib/__tests__/github-response.test.ts` — test
- `client/src/lib/__tests__/loan-activity.test.ts` — test
- `client/src/lib/design-tokens.ts` — source
- `client/src/lib/github-response.ts` — source
- `client/src/lib/loan-activity.ts` — source
- `client/src/lib/queryClient.ts` — source
- `client/src/lib/utils.ts` — source
- `client/src/main.tsx` — source
- `client/src/styles/design-tokens.css` — source
- `client/src/test/setup.ts` — test
- `components.json` — configuration/tooling
- `drizzle.config.ts` — configuration/tooling
- `loan-fullpage.png` — asset
- `package-lock.json` — generated lockfile
- `package.json` — configuration/tooling
- `postcss.config.js` — configuration/tooling
- `replit.md` — instruction/documentation
- `script/build.ts` — configuration/tooling
- `scripts/post-merge.sh` — configuration/tooling
- `sedZiKBNa` — unclassified file
- `server/__tests__/storage.test.ts` — test
- `server/conflict-detection.ts` — source
- `server/db.ts` — source
- `server/github.ts` — source
- `server/index.ts` — source
- `server/pending-conflicts.ts` — source
- `server/routes.ts` — source
- `server/static.ts` — source
- `server/storage.ts` — source
- `server/sync-state.ts` — source
- `server/vite.ts` — source
- `shared/schema.ts` — source
- `stepper-area.png` — asset
- `stepper_focused.png` — asset
- `tailwind.config.ts` — configuration/tooling
- `tsconfig.json` — configuration/tooling
- `vite.config.ts` — configuration/tooling
- `vitest.config.ts` — configuration/tooling

### Summary page reviewer
- `client/src/components/loan/BorrowerCards.tsx` — source
- `client/src/components/loan/SummaryRatios.tsx` — source
- `client/src/pages/loan-summary.tsx` — source

### Origination page reviewer
- `client/src/components/loan/BorrowerInformationContent.tsx` — source
- `client/src/components/loan/CollateralContent.tsx` — source
- `client/src/components/loan/FeesContent.tsx` — source
- `client/src/components/loan/LoanDetailsContent.tsx` — source
- `client/src/components/loan/ProductPricingContent.tsx` — source
- `client/src/components/loan/__tests__/CollateralContent.test.tsx` — test
- `client/src/components/loan/__tests__/ProductPricingContent.test.tsx` — test
- `client/src/pages/loan-origination.tsx` — source

### Decisioning page reviewer
- `client/src/components/loan/BalanceSheetSection.tsx` — source
- `client/src/components/loan/BorrowerFinancialsContent.tsx` — source
- `client/src/components/loan/DecisioningSummaryContent.tsx` — source
- `client/src/components/loan/__tests__/DecisioningSummaryContent.test.tsx` — test
- `client/src/pages/loan-decisioning.tsx` — source

### Documents page reviewer
- `client/src/components/loan/ClosingDisclosureBorrowerCells.tsx` — source
- `client/src/components/loan/ClosingDisclosureBorrowerEditor.tsx` — source
- `client/src/components/loan/ClosingDisclosureBorrowers.css` — source
- `client/src/components/loan/ClosingDocumentIcon.tsx` — source
- `client/src/components/loan/ClosingDocumentsContent.css` — source
- `client/src/components/loan/DisclosureDocumentsContent.tsx` — source
- `client/src/components/loan/DocumentsContent.tsx` — source
- `client/src/components/loan/__tests__/ClosingDisclosureAssumedDate.test.tsx` — test
- `client/src/components/loan/__tests__/ClosingDisclosureBorrowers.test.tsx` — test
- `client/src/components/loan/__tests__/ClosingDisclosurePanel.test.tsx` — test
- `client/src/components/loan/__tests__/ClosingDocumentsContent.test.tsx` — test
- `client/src/components/loan/__tests__/ClosingPackageProgress.test.tsx` — test
- `client/src/components/loan/__tests__/DocumentsContent.test.tsx` — test
- `client/src/hooks/__tests__/use-closing-disclosure-delivery.test.tsx` — test
- `client/src/hooks/use-closing-disclosures.ts` — source
- `client/src/hooks/use-closing-package.ts` — source
- `client/src/lib/__tests__/closing-disclosure-assumed-date.test.ts` — test
- `client/src/lib/__tests__/closing-disclosure-borrowers.test.ts` — test
- `client/src/lib/closing-disclosure-borrowers.ts` — source
- `client/src/lib/closing-disclosure-history.ts` — source
- `client/src/lib/closing-package-progress.ts` — source
- `client/src/pages/loan-documents.tsx` — source

### Closing and Booking page reviewer
- `client/src/components/loan/BookingContent.tsx` — source
- `client/src/components/loan/ClosingContent.tsx` — source
- `client/src/pages/loan-closing-booking.tsx` — source

### History page reviewer
- `client/src/components/loan/HistoryContent.tsx` — source
- `client/src/pages/loan-history.tsx` — source

### Design System page reviewer
- `client/src/pages/design-system.tsx` — source

### Coming Soon page reviewer
- `client/src/pages/loan-coming-soon.tsx` — source

### Not Found page reviewer
- `client/src/pages/not-found.tsx` — source

## Local import-edge inventory
This is a lexical inventory of local import specifiers (including type-only imports), not an execution trace or a guarantee that all dynamic references were resolved. Public URL strings, CSS url() references, event names and runtime storage keys require page review in addition to these edges. External npm imports are represented by package.json/package-lock.json rather than vendor traversal. Files without local imports still appear in the assignment above.

| Importing file | Local dependencies as written |
|---|---|
| `client/src/App.tsx` | `./lib/queryClient`, `@/components/ConflictResolutionDialog`, `@/components/ui/toaster`, `@/components/ui/tooltip`, `@/contexts/checklist-context`, `@/contexts/github-sync-context`, `@/contexts/loan-activity-context`, `@/hooks/use-github-sync`, `@/pages/loan-closing-booking`, `@/pages/loan-decisioning`, `@/pages/loan-documents`, `@/pages/loan-history`, `@/pages/loan-origination`, `@/pages/loan-summary`, `@/pages/not-found` |
| `client/src/components/ConflictResolutionDialog.tsx` | `@/components/ui/badge`, `@/components/ui/button`, `@/components/ui/dialog`, `@/components/ui/scroll-area`, `@/components/ui/tabs`, `@/components/ui/textarea`, `@/hooks/use-toast`, `@/lib/queryClient` |
| `client/src/components/GitHubSyncPanel.tsx` | `@/components/ui/badge`, `@/components/ui/button`, `@/components/ui/dialog`, `@/components/ui/input`, `@/contexts/github-sync-context`, `@/lib/queryClient` |
| `client/src/components/loan/BalanceSheetSection.tsx` | `./RoadsDropdown` |
| `client/src/components/loan/BorrowerCards.tsx` | `@/hooks/use-toast`, `@shared/schema` |
| `client/src/components/loan/BorrowerFinancialsContent.tsx` | `./BalanceSheetSection`, `./RoadsDropdown` |
| `client/src/components/loan/BorrowerInformationContent.tsx` | `./RoadsDropdown` |
| `client/src/components/loan/ChecklistActionTimeline.tsx` | `@/contexts/checklist-context` |
| `client/src/components/loan/ChecklistPanel.tsx` | `./ChecklistActionTimeline`, `@/contexts/checklist-context`, `@/contexts/loan-activity-context` |
| `client/src/components/loan/ClosingContent.tsx` | `./RoadsDatePicker` |
| `client/src/components/loan/ClosingDisclosureBorrowerCells.tsx` | `./ClosingDisclosureBorrowers.css`, `@/components/ui/popover`, `@/lib/closing-disclosure-borrowers`, `@/lib/closing-disclosure-history` |
| `client/src/components/loan/ClosingDisclosureBorrowerEditor.tsx` | `./ClosingDisclosureBorrowers.css`, `@/components/loan/ClosingDocumentIcon`, `@/components/ui/sheet`, `@/lib/closing-disclosure-borrowers`, `@/lib/closing-disclosure-history` |
| `client/src/components/loan/CollateralContent.tsx` | `@/contexts/checklist-context`, `@/contexts/loan-activity-context`, `@/hooks/use-toast`, `@/lib/loan-activity` |
| `client/src/components/loan/DecisioningSummaryContent.tsx` | `@/contexts/checklist-context`, `@/contexts/loan-activity-context`, `@/hooks/use-toast`, `@/lib/loan-activity` |
| `client/src/components/loan/DisclosureDocumentsContent.tsx` | `@/contexts/checklist-context`, `@/contexts/loan-activity-context`, `@/lib/loan-activity` |
| `client/src/components/loan/DocumentsContent.tsx` | `./ClosingDisclosureBorrowerCells`, `./ClosingDisclosureBorrowerEditor`, `./ClosingDocumentIcon`, `./ClosingDocumentsContent.css`, `./DisclosureDocumentsContent`, `@/components/ui/tabs`, `@/hooks/use-closing-disclosures`, `@/hooks/use-closing-package`, `@/lib/closing-disclosure-borrowers`, `@assets/Redacted-ClosingPackage_Redacted_1777397693832.pdf`, `@assets/SampleCD_1777397678654.pdf` |
| `client/src/components/loan/FeesContent.tsx` | `./RoadsDropdown` |
| `client/src/components/loan/HistoryContent.tsx` | `./RoadsDropdown` |
| `client/src/components/loan/LoanActivityPanel.tsx` | `@/contexts/loan-activity-context` |
| `client/src/components/loan/LoanDetailsContent.tsx` | `./RoadsDropdown` |
| `client/src/components/loan/LoanHeader.tsx` | `@/components/GitHubSyncPanel`, `@/components/loan/ChecklistPanel`, `@/components/ui/avatar`, `@/contexts/checklist-context`, `@/contexts/loan-activity-context` |
| `client/src/components/loan/ProductPricingContent.tsx` | `./RoadsDatePicker`, `./RoadsDropdown`, `@/components/ui/dialog`, `@/contexts/checklist-context`, `@/contexts/loan-activity-context`, `@/hooks/use-toast`, `@/lib/loan-activity` |
| `client/src/components/loan/__tests__/ChecklistPanel.test.tsx` | `../ChecklistActionTimeline`, `../ChecklistPanel`, `@/contexts/checklist-context`, `@/contexts/loan-activity-context` |
| `client/src/components/loan/__tests__/ClosingDisclosureAssumedDate.test.tsx` | `../DocumentsContent`, `@/contexts/checklist-context`, `@/lib/closing-disclosure-borrowers`, `@/lib/closing-disclosure-history` |
| `client/src/components/loan/__tests__/ClosingDisclosureBorrowers.test.tsx` | `../../../../../server/storage`, `../DocumentsContent`, `@/contexts/checklist-context`, `@/lib/closing-disclosure-borrowers`, `@/lib/closing-disclosure-history` |
| `client/src/components/loan/__tests__/ClosingDisclosurePanel.test.tsx` | `../DocumentsContent`, `@/contexts/checklist-context`, `@/lib/closing-disclosure-borrowers`, `@/lib/closing-disclosure-history` |
| `client/src/components/loan/__tests__/ClosingDocumentsContent.test.tsx` | `../DisclosureDocumentsContent`, `../DocumentsContent`, `@/contexts/checklist-context`, `@/hooks/use-closing-disclosures`, `@/lib/closing-disclosure-history` |
| `client/src/components/loan/__tests__/ClosingPackageProgress.test.tsx` | `../DocumentsContent`, `@/contexts/checklist-context`, `@/hooks/use-toast`, `@/lib/closing-package-progress` |
| `client/src/components/loan/__tests__/CollateralContent.test.tsx` | `../ChecklistPanel`, `../CollateralContent`, `@/components/ui/toaster`, `@/contexts/checklist-context`, `@/contexts/loan-activity-context` |
| `client/src/components/loan/__tests__/DecisioningSummaryContent.test.tsx` | `../ChecklistPanel`, `../DecisioningSummaryContent`, `../LoanActivityPanel`, `@/components/ui/toaster`, `@/contexts/checklist-context`, `@/contexts/loan-activity-context` |
| `client/src/components/loan/__tests__/DocumentsContent.test.tsx` | `../ChecklistPanel`, `../DisclosureDocumentsContent`, `../LoanActivityPanel`, `@/contexts/checklist-context`, `@/contexts/loan-activity-context` |
| `client/src/components/loan/__tests__/LoanActivityPanel.test.tsx` | `../LoanActivityPanel`, `@/contexts/loan-activity-context` |
| `client/src/components/loan/__tests__/ProductPricingContent.test.tsx` | `../ChecklistPanel`, `../LoanHeader`, `../ProductPricingContent`, `@/components/ui/toaster`, `@/contexts/checklist-context`, `@/contexts/loan-activity-context` |
| `client/src/components/ui/accordion.tsx` | `@/lib/utils` |
| `client/src/components/ui/alert-dialog.tsx` | `@/components/ui/button`, `@/lib/utils` |
| `client/src/components/ui/alert.tsx` | `@/lib/utils` |
| `client/src/components/ui/avatar.tsx` | `@/lib/utils` |
| `client/src/components/ui/badge.tsx` | `@/lib/utils` |
| `client/src/components/ui/breadcrumb.tsx` | `@/lib/utils` |
| `client/src/components/ui/button.tsx` | `@/lib/utils` |
| `client/src/components/ui/calendar.tsx` | `@/components/ui/button`, `@/lib/utils` |
| `client/src/components/ui/card.tsx` | `@/lib/utils` |
| `client/src/components/ui/carousel.tsx` | `@/components/ui/button`, `@/lib/utils` |
| `client/src/components/ui/chart.tsx` | `@/lib/utils` |
| `client/src/components/ui/checkbox.tsx` | `@/lib/utils` |
| `client/src/components/ui/command.tsx` | `@/components/ui/dialog`, `@/lib/utils` |
| `client/src/components/ui/context-menu.tsx` | `@/lib/utils` |
| `client/src/components/ui/dialog.tsx` | `@/lib/utils` |
| `client/src/components/ui/drawer.tsx` | `@/lib/utils` |
| `client/src/components/ui/dropdown-menu.tsx` | `@/lib/utils` |
| `client/src/components/ui/form.tsx` | `@/components/ui/label`, `@/lib/utils` |
| `client/src/components/ui/hover-card.tsx` | `@/lib/utils` |
| `client/src/components/ui/input-otp.tsx` | `@/lib/utils` |
| `client/src/components/ui/input.tsx` | `@/lib/utils` |
| `client/src/components/ui/label.tsx` | `@/lib/utils` |
| `client/src/components/ui/menubar.tsx` | `@/lib/utils` |
| `client/src/components/ui/navigation-menu.tsx` | `@/lib/utils` |
| `client/src/components/ui/pagination.tsx` | `@/components/ui/button`, `@/lib/utils` |
| `client/src/components/ui/popover.tsx` | `@/lib/utils` |
| `client/src/components/ui/progress.tsx` | `@/lib/utils` |
| `client/src/components/ui/radio-group.tsx` | `@/lib/utils` |
| `client/src/components/ui/resizable.tsx` | `@/lib/utils` |
| `client/src/components/ui/scroll-area.tsx` | `@/lib/utils` |
| `client/src/components/ui/select.tsx` | `@/lib/utils` |
| `client/src/components/ui/separator.tsx` | `@/lib/utils` |
| `client/src/components/ui/sheet.tsx` | `@/lib/utils` |
| `client/src/components/ui/sidebar.tsx` | `@/components/ui/button`, `@/components/ui/input`, `@/components/ui/separator`, `@/components/ui/sheet`, `@/components/ui/skeleton`, `@/components/ui/tooltip`, `@/hooks/use-mobile`, `@/lib/utils` |
| `client/src/components/ui/skeleton.tsx` | `@/lib/utils` |
| `client/src/components/ui/slider.tsx` | `@/lib/utils` |
| `client/src/components/ui/switch.tsx` | `@/lib/utils` |
| `client/src/components/ui/table.tsx` | `@/lib/utils` |
| `client/src/components/ui/tabs.tsx` | `@/lib/utils` |
| `client/src/components/ui/textarea.tsx` | `@/lib/utils` |
| `client/src/components/ui/toast.tsx` | `@/lib/utils` |
| `client/src/components/ui/toaster.tsx` | `@/components/ui/toast`, `@/hooks/use-toast` |
| `client/src/components/ui/toggle-group.tsx` | `@/components/ui/toggle`, `@/lib/utils` |
| `client/src/components/ui/toggle.tsx` | `@/lib/utils` |
| `client/src/components/ui/tooltip.tsx` | `@/lib/utils` |
| `client/src/contexts/checklist-context.tsx` | `@/hooks/use-toast`, `@/lib/closing-disclosure-history`, `@/lib/closing-package-progress` |
| `client/src/contexts/github-sync-context.ts` | `@/hooks/use-github-sync` |
| `client/src/hooks/__tests__/use-closing-disclosure-delivery.test.tsx` | `../use-closing-disclosures`, `@/contexts/checklist-context`, `@/lib/closing-disclosure-borrowers`, `@/lib/closing-disclosure-history` |
| `client/src/hooks/use-closing-disclosures.ts` | `@/contexts/checklist-context`, `@/lib/closing-disclosure-borrowers`, `@/lib/closing-disclosure-history` |
| `client/src/hooks/use-closing-package.ts` | `@/contexts/checklist-context`, `@/lib/closing-package-progress` |
| `client/src/hooks/use-github-sync.ts` | `@/hooks/use-toast`, `@/lib/github-response`, `@/lib/queryClient` |
| `client/src/hooks/use-toast.ts` | `@/components/ui/toast` |
| `client/src/index.css` | `./styles/design-tokens.css` |
| `client/src/lib/__tests__/closing-disclosure-assumed-date.test.ts` | `../closing-disclosure-borrowers` |
| `client/src/lib/__tests__/closing-disclosure-borrowers.test.ts` | `../closing-disclosure-borrowers`, `../closing-disclosure-history` |
| `client/src/lib/__tests__/github-response.test.ts` | `../github-response` |
| `client/src/lib/__tests__/loan-activity.test.ts` | `../loan-activity` |
| `client/src/lib/closing-disclosure-borrowers.ts` | `./closing-disclosure-history`, `@shared/schema` |
| `client/src/main.tsx` | `./App`, `./index.css` |
| `client/src/pages/design-system.tsx` | `@/components/ui/badge`, `@/components/ui/button`, `@/components/ui/card`, `@/components/ui/input`, `@/components/ui/label`, `@/lib/design-tokens` |
| `client/src/pages/loan-closing-booking.tsx` | `@/components/loan/BookingContent`, `@/components/loan/ClosingContent`, `@/components/loan/LoanActivityPanel`, `@/components/loan/LoanHeader`, `@/components/loan/SideNav`, `@shared/schema` |
| `client/src/pages/loan-coming-soon.tsx` | `@/components/loan/LoanHeader`, `@shared/schema` |
| `client/src/pages/loan-decisioning.tsx` | `@/components/loan/BorrowerFinancialsContent`, `@/components/loan/DecisioningSummaryContent`, `@/components/loan/LoanActivityPanel`, `@/components/loan/LoanHeader`, `@/components/loan/SideNav`, `@shared/schema` |
| `client/src/pages/loan-documents.tsx` | `@/components/loan/DocumentsContent`, `@/components/loan/LoanActivityPanel`, `@/components/loan/LoanHeader`, `@/components/loan/SideNav`, `@shared/schema` |
| `client/src/pages/loan-history.tsx` | `@/components/loan/HistoryContent`, `@/components/loan/LoanActivityPanel`, `@/components/loan/LoanHeader`, `@shared/schema` |
| `client/src/pages/loan-origination.tsx` | `@/components/loan/BorrowerInformationContent`, `@/components/loan/CollateralContent`, `@/components/loan/FeesContent`, `@/components/loan/LoanActivityPanel`, `@/components/loan/LoanDetailsContent`, `@/components/loan/LoanHeader`, `@/components/loan/ProductPricingContent`, `@/components/loan/SideNav`, `@shared/schema` |
| `client/src/pages/loan-summary.tsx` | `@/components/loan/BorrowerCards`, `@/components/loan/LoanActivityPanel`, `@/components/loan/LoanHeader`, `@/components/loan/SummaryRatios`, `@shared/schema` |
| `client/src/pages/not-found.tsx` | `@/components/ui/card` |
| `server/__tests__/storage.test.ts` | `../storage`, `@shared/schema` |
| `server/db.ts` | `@shared/schema` |
| `server/index.ts` | `./routes`, `./static` |
| `server/pending-conflicts.ts` | `./conflict-detection` |
| `server/routes.ts` | `./conflict-detection`, `./github`, `./pending-conflicts`, `./storage`, `./sync-state` |
| `server/storage.ts` | `@shared/schema` |
| `server/vite.ts` | `../vite.config` |
