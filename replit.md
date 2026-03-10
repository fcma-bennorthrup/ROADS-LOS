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

### Design Token Categories
- **Colors** (22 tokens): text, background, icon, border semantic colors
- **Typography** (8 styles): headline-100/200/300, body-100, body-200-strong, caption-100, caption-100-strong, label-strong
- **Spacing** (7 tokens): component-3xs through component-xl, layout-xs
- **Radius** (3 tokens): 2xs (4px), xs (8px), round (9999px)

### Design System Rule
New styles MUST come from Figma or the existing design-tokens.css. No arbitrary values are allowed. New tokens from Figma require manual user approval before adding.

## Project Structure
```
client/
  src/
    components/ui/     # Shadcn UI components (themed with design system)
    styles/            # Design token CSS
    lib/               # Utilities and TypeScript tokens
    pages/             # Route pages
    hooks/             # Custom React hooks
server/
  github.ts            # GitHub API integration via connectors proxy
  routes.ts            # Express API routes
  storage.ts           # Data storage interface
  db.ts                # Database connection
shared/
  schema.ts            # Drizzle ORM schema + Zod validation
```

## API Routes
- `GET /api/github/user` - Authenticated GitHub user info
- `GET /api/github/repo` - ROADS-LOS repository details
- `POST /api/github/repo` - Create ROADS-LOS repository (one-time setup)

## Running
- Workflow "Start application" runs `npm run dev`
- Express backend + Vite frontend on same port
