# ROADS LOS - Loan Origination System Prototype

## Overview
A living prototype of a Loan Origination System (LOS) built as a full-stack JavaScript application. Connected to GitHub for version control and collaborative iteration.

## GitHub Repository
- **URL**: https://github.com/fcma-bennorthrup/ROADS-LOS
- **Owner**: fcma-bennorthrup
- **Access**: Collaborators authenticate as themselves; all GitHub API sync operations target this shared repository, not a repository selected from the authenticated user's login.
- **Branch Strategy**: Branch off main for new features
- **RULE: Never push or pull to GitHub unless explicitly instructed.** A code change does not imply a push. Only sync when the user says "push to GitHub", "pull from GitHub", or similar direct instruction.
- **RULE: Treat “GitHub” as the connected GitHub API.** When the user asks for GitHub information or requests a GitHub action, use the connected GitHub API as the source of truth. Do not infer GitHub state from local Git metadata, Replit subrepl branches, backup remotes, or native Replit Git synchronization unless the user explicitly asks about the local workspace or Replit Git state.
- **RULE: Ask when the intended user experience isn't clear.** When a request could reasonably be interpreted in more than one way — whether it involves adding, changing, or removing something — always ask a clarifying question before proceeding. Don't guess at the intended end-user experience. Examples: if asked to "get rid of the credit report," ask whether that means the button, the section, or the whole feature. If asked to "add a status indicator," ask what states it should show. Prefer the narrowest, safest interpretation when in doubt, but ask rather than assume.

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn UI, Wouter (routing)
- **Backend**: Express.js, Node.js
- **Active loan storage**: PostgreSQL JSON documents in `prototype_loan_applications`, one row per loan. MemStorage supplies only the legacy seed loan `"1"` on its first load.
- **Design System**: Extracted from Figma (ROADS-Designs)
- **Font**: Source Sans Pro (400, 600 weights)
- **GitHub Integration**: @replit/connectors-sdk proxy

## Design System (Figma Source of Truth)
- **Figma File**: https://www.figma.com/design/4b8PadIK9cXCCKmlggWGOL/ROADS-Designs
- **Tokens CSS**: `client/src/styles/design-tokens.css` (--roads-* custom properties)
- **Tokens TS**: `client/src/lib/design-tokens.ts` (TypeScript exports)
- **Compliance Skill**: `.agents/skills/figma-design-system-compliance/SKILL.md`
- **Variable Mode**: Rural First only — the Figma token sheet has multiple variable modes; only "Rural First" is used. Ignore all other modes.
- **Brand colors**: Blue (#005b94) — from the Rural First variable mode

### Design Token Categories
- **Colors** (25 tokens): text, background (incl. light, action, errorDisabled), icon, border semantic colors
- **Typography** (8 styles): headline-100/200/300, body-100, body-200-strong, caption-100, caption-100-strong, label-strong
- **Spacing** (10 tokens): component-3xs through component-3xl, layout-xs
- **Radius** (3 tokens): 2xs (4px), xs (8px), round (9999px)

### Design System Rule
New styles MUST come from Figma or the existing design-tokens.css. No arbitrary values are allowed. New tokens from Figma require manual user approval before adding. Structural dimensions from Figma (heights, widths for specific components) are acceptable when no token exists.

**Token approval rule (strict):** Before adding, removing, or modifying ANY entry in `client/src/styles/design-tokens.css` or `client/src/lib/design-tokens.ts`, the agent MUST explicitly ask the user for approval and wait for a clear confirmation — even when the user has already supplied the exact specs in the same message. Providing specs is NOT the same as approving the write. Always pause, restate the proposed change (token name + properties + file), and ask "OK to add?" before editing.

## Pages
- **Pipeline** (`/pipeline`, also the `/` redirect): App-level loan index with search, multi-select stage filters, sortable columns, and blank or Blend creation. No deletion, board view, or team assignment.
- App-level providers wrap both levels. `LoanScope` mounts loan-only providers under `/loans/:id`; `LoanWorkspace` supplies the shared six-tab shell. Pipeline reads projections, never installs a loan document.
- **Loan Summary** (`/loans/:id`): Default loan landing page. Shows:
  - Header: Pipeline return breadcrumb, persisted 8-stage chevron stepper, metadata, amount + status chips, tab navigation. The first/last chevrons save backward/forward stage changes with revision checks.
  - Content: Borrower Contact Information cards (horizontal Email/Phone layout), Summary & Ratios (4-column data table)
  - Fixed bottom toolbar: Loan Info, Quick Links, Checklist, Key Dates, Errors
- **Loan Origination** (`/loans/:id/origination`): Origination tab with side navigation and sub-pages:
  - 240px side nav: Borrower Information, Loan Details, Collateral, Product & Pricing, Fees
  - Collateral page: Subject Property (address fields with edit/save/discard) + Value section (split appraisal with evaluation tabs, edit/save/discard)
  - Borrower Information, Loan Details, Product & Pricing and Fees each have content implementations; edits have differing local lifetimes, and Fee Save remains a no-op.
- **Loan Decisioning** (`/loans/:id/decisioning`): Decisioning tab with side navigation:
  - Side nav: Decisioning Summary and Borrower Financials
  - Decision controls and borrower financial editors, including the balance sheet, are implemented as prototype interactions.
- **Closing / Booking** (`/loans/:id/closing-booking`): Closing editor and local timed Booking simulation.
- **Documents** (`/loans/:id/documents`): Disclosures and Closing Documents, with prototype generation, delivery, history and editing states.
- **History** (`/loans/:id/history`): Static Change Log with filtering, sorting and pagination; distinct from shared Activity state.
- `/` redirects to `/loans/1` (default mock loan)
- Header navigation links the six loan routes above. Unmatched routes render Not Found.
- `design-system.tsx` and `loan-coming-soon.tsx` are retained supporting pages without active routes; do not add routes as documentation cleanup.

## Data Model
- **Database collaboration rule:** Before changing stored models or after a GitHub pull, follow `docs/database-collaboration.md`. Keep model, append-only upgrades and tests together in synced paths. Never silently repair drift or share credentials/data between projects.
- `npm run db:check` is read-only. `npm run db:upgrade:dev` explicitly applies reviewed development upgrades; it is never run by app startup, build, Publish, or automatically after a pull.
- Runtime loan validation is defined in `shared/loan-contract.ts`. Development upgrade history is recorded in `roads_development_upgrades` with immutable-file checksums.
- **loans**: id, loanNumber, cifNumber, loanType, stage, primaryBorrowerName, displayAmount, amountRequested, financedFees, taxesInsurance, product, finalRate, principalInterest, totalMonthlyPayment, applicationType, ecoaDaysRemaining, tridDaysRemaining, piti, dti, lcv, pweCbScore, ruleOfXx, totalCv, cashReserves, totalLoanAmount
- **borrowers**: id, loanId, name, email, phone, isPrimary
- **users**: id, username, password
- **Active aggregate**: `LoanApplication` holds loan, borrowers, mode, generation, revision, sections, changeLog, businessRules, and optional `meta { createdAt, updatedAt, source }` (backfilled when loaded). Saved application and workflow data belongs to its loan.
- `mode: "existing"` is reserved for seed loan `"1"`. New loans use UUIDs, incrementing nine-digit loan numbers, a blank factory, and stage `"Customer Application"`. Existing seed stage is preserved, not reset on migration.
- Stage and section writes use generation/revision compare-and-swap. All writes refresh `meta.updatedAt`; replacing demo data retains original `createdAt`. Loan-number allocation is transaction-serialized.
- The single-active-loan client store drains pending saves before departure. Unsaved drafts require confirmation on the Pipeline breadcrumb. Late responses cannot replace another loan's active document.
- No new tables or schema push are required; the unused Drizzle loan/borrower tables are not the persistence path.

## Components
- `client/src/components/loan/LoanHeader.tsx` — Breadcrumb, 8-stage chevron stepper, metadata, tabs, exports BottomToolbar separately
- `client/src/components/loan/SummaryRatios.tsx` — 4-column flat data layout (ratios, reserves, amounts, product)
- `client/src/components/loan/BorrowerCards.tsx` — Borrower contact cards with horizontal Email/Phone layout, copy-to-clipboard
- `client/src/components/loan/SideNav.tsx` — 240px side navigation for origination sub-pages
- `client/src/components/loan/CollateralContent.tsx` — Collateral page with Subject Property address fields and Value appraisal fields

## Project Structure
```
client/
  src/
    components/
      ui/              # Shadcn UI components (themed with design system)
      loan/            # Loan page components (Header, SummaryRatios, BorrowerCards)
    styles/            # Design token CSS
    lib/               # Utilities and TypeScript tokens
    pages/             # Six loan route pages, fallback and unrouted support pages
    hooks/             # Custom React hooks
server/
  github.ts            # GitHub API integration via connectors proxy
  routes.ts            # Express API routes
  storage.ts           # Data storage interface (MemStorage with seed data)
  db.ts                # Separate database adapter, not active loan storage
shared/
  schema.ts            # Drizzle ORM schema + Zod validation
```

## API Routes
- `GET /api/database/compatibility` - Fresh, read-only check of the pulled code against this project's database; no apply endpoint
- `GET /api/loans` - Lightweight pipeline projections, newest update first, no-store
- `POST /api/loans` - Create a blank loan from `{ source: "blank" }`; returns `{ id, loanNumber }`. Blend creation then calls the existing demo import with client-built sections.
- `PUT /api/loans/:id/stage` - Save a validated stage with `{ stage, generation, revision }`; returns the updated document or 409 on stale input
- `GET /api/loans/:id/application` - Load the loan document
- `PUT /api/loans/:id/application` - Save a section with revision checks, rule evaluation, and change tracking
- `POST /api/loans/:id/application/demo` - Loan-scoped reset, Blend import, TRID actions, and checklist reset
- `POST /api/loans/:id/application/credit` - Simulated borrower-specific credit results
- `GET /api/loans/:id` - Loan details with borrowers (includes ratios, scores, amounts)
- `GET /api/github/user` - Authenticated GitHub user info
- `GET /api/github/repo` - ROADS-LOS repository details
- `POST /api/github/repo` - Create ROADS-LOS under the authenticated GitHub user; does not retarget sync (not routine collaborator setup)
- `GET /api/github/sync-status` - Sync status (last synced SHA vs remote HEAD)
- `POST /api/github/pull` - Pull from GitHub (with conflict detection)
- `POST /api/github/push` - Push codebase to GitHub (with conflict detection)
- `GET /api/github/conflicts` - Get pending unresolved conflicts with full file content
- `POST /api/github/resolve-conflicts` - Resolve all pending conflicts and complete sync
- `DELETE /api/github/conflicts` - Dismiss/clear pending conflicts

## Conflict Resolution
- Conflicts detected during push/pull are stored server-side in `.local/pending-conflicts.json`
- `server/pending-conflicts.ts` manages the pending conflicts lifecycle
- `client/src/components/ConflictResolutionDialog.tsx` provides the resolution UI
- Resolution UI shows side-by-side diff, per-file "Keep Mine" / "Take Theirs" / "Edit Manually" controls
- For pull conflicts: resolving writes chosen content locally and updates sync SHA
- For push conflicts: resolving writes locally then re-pushes all files to GitHub

## Running
- Summary PITI user-confirmed formula: (monthly principal + interest + property taxes + insurance) / combined gross monthly borrower income × 100. Show a percentage; missing inputs are unavailable, not zero. The tooltip uses the first scheduled payment's principal/interest breakdown, not a term average.
- Workflow "Start application" runs `npm run dev`
- Express backend + Vite frontend on same port
- `.nvmrc` selects local Node 20.20.0; `.replit` declares Node 24. Both are documented as observed configurations, not verified compatible environments.
- See [SETUP.md](SETUP.md) for command effects, MemStorage versus database infrastructure, current sync limitations and unverified setup/deployment boundaries. No runtime alignment is implied.
