# ROADS LOS - Loan Origination System Prototype

## Overview
A living prototype of a Loan Origination System (LOS) built as a full-stack JavaScript application. Connected to GitHub for version control and collaborative iteration.

## GitHub Repository
- **URL**: https://github.com/bennorthrup/ROADS-LOS
- **Owner**: bennorthrup
- **Branch Strategy**: Branch off main for new features

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn UI, Wouter (routing)
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL (via Drizzle ORM)
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

## Pages
- **Loan Summary** (`/loans/:id`): Landing page when opening a loan from pipeline. Shows:
  - Header: breadcrumb, 8-stage chevron stepper, metadata, amount + status chips, tab navigation
  - Content: Borrower Contact Information cards (horizontal Email/Phone layout), Summary & Ratios (4-column data table)
  - Fixed bottom toolbar: Loan Info, Quick Links, Checklist, Key Dates, Errors
- **Loan Origination** (`/loans/:id/origination`): Origination tab with side navigation and sub-pages:
  - 240px side nav: Borrower Information, Loan Details, Collateral, Product & Pricing, Fees
  - Collateral page: Subject Property (address fields with edit/save/discard) + Value section (split appraisal with evaluation tabs, edit/save/discard)
  - Other sub-pages show "Coming Soon" placeholder
- **Loan Decisioning** (`/loans/:id/decisioning`): Decisioning tab with side navigation:
  - 240px side nav: Decisioning Summary, Borrower Financials, Item 3, Item 4
  - All sub-pages show "Coming Soon" placeholder (content pending)
- `/` redirects to `/loans/1` (default mock loan)
- Tab navigation in header routes between Summary ↔ Origination ↔ Decisioning (other tabs pending)

## Data Model
- **loans**: id, loanNumber, cifNumber, loanType, stage, primaryBorrowerName, displayAmount, amountRequested, financedFees, taxesInsurance, product, finalRate, principalInterest, totalMonthlyPayment, applicationType, ecoaDaysRemaining, tridDaysRemaining, piti, dti, lcv, pweCbScore, ruleOfXx, totalCv, cashReserves, totalLoanAmount
- **borrowers**: id, loanId, name, email, phone, isPrimary
- **users**: id, username, password
- Currently using in-memory storage with seed data (MemStorage)

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
    pages/             # Route pages (loan-summary)
    hooks/             # Custom React hooks
server/
  github.ts            # GitHub API integration via connectors proxy
  routes.ts            # Express API routes
  storage.ts           # Data storage interface (MemStorage with seed data)
  db.ts                # Database connection
shared/
  schema.ts            # Drizzle ORM schema + Zod validation
```

## API Routes
- `GET /api/loans/:id` - Loan details with borrowers (includes ratios, scores, amounts)
- `GET /api/github/user` - Authenticated GitHub user info
- `GET /api/github/repo` - ROADS-LOS repository details
- `POST /api/github/repo` - Create ROADS-LOS repository (one-time setup)
- `POST /api/github/push` - Push codebase to GitHub

## Running
- Workflow "Start application" runs `npm run dev`
- Express backend + Vite frontend on same port
