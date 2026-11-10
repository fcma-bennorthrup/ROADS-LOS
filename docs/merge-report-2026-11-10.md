# Merge report: ROADS-PROTOTYPE (Ben) + Roads-Los (Emily) → one history

Date: 2026-11-10
Inputs: `ROADS-PROTOTYPE__2_.zip` (Ben, HEAD `aafc4dd`, 312 commits) and `Roads-Los.zip` (Emily, HEAD `ae0c163`, 185 commits), both exported ~16:40 UTC.
Result: merge commit `e202491` with parents `aafc4dd` and `ae0c163`; 498 commits reachable from `main`.

## Why merges kept failing

1. **The two projects had zero commits in common.** Roads-Los began on 2026-04-08 with its own "Initial commit" made from a copy of the files, not a clone. Git had no merge base, so every merge saw the whole tree as conflicting (or refused with "unrelated histories").
2. **The in-app GitHub sync is not git.** It uploads files through the GitHub Contents/Git-Data API, compares against a per-project checkpoint in `.local/github-sync-state.json`, and resolves conflicts **whole-file** (local or remote). It also skips `.agents/`, `package-lock.json`, hidden directories, and never deletes binaries on pull. Neither Replit project ever had the GitHub repo as a git remote.
3. Concrete damage observed: Roads-Los had an uncommitted edit removing `import { feeRecordSchema } from "./fees"` from `shared/loan-contract.ts` because a partial pull delivered that file without `shared/fees.ts`; and the demo PDFs Ben retired in `8cdcc50` were still present in Roads-Los because binary deletions do not propagate.

## How the tree was built

- Union of both working trees (Ben's as the starting point, Emily's unique files added).
- For each of the 35 files present in both but different, the merge base was the **most recent byte-identical version found in both histories** (mostly the 2026-11-09 sync). `git merge-file` 3-way merged each file against that base.
- Only three files had been changed by both sides since their base:
  - `server/__tests__/pipeline-routes.test.ts` — both appended test cases at the same point; one manual resolution, both sets kept.
  - `server/loan-application.ts` — Ben's credit-freeze guard and Emily's SF-opportunity / idempotent-retry logic sit in different places; merged cleanly.
  - `shared/loan-contract.ts` — Ben added `decision-mode` / `decision-outcome`. Emily's committed version equals the base; her uncommitted `z.array(z.record(z.unknown()))` stub was a workaround for the missing `fees.ts`, so the `feeRecordSchema` import was kept. Final file equals Ben's.
- Every other differing file was changed by only one side and that side's version was taken.

## Explicit decisions

| Item | Decision | Reason |
|---|---|---|
| `client/public/credit-report.pdf`, `decision-letter.pdf`, `loan-estimate.pdf` | Removed | Retired in Ben's `3c5974c` / `8cdcc50`; both sides already share `server/retired-prototype-pdfs.ts`; nothing in code references them. |
| `attached_assets/r1-icon-color_1794259898751.png` | Added (2 KB) | Imported by Emily's `MainNavigation.tsx` and `PipelineFooter.tsx`; `attached_assets/` was never committed on either side. |
| `package-lock.json` | Emily's copy | She is the only one who changed `package.json` (added `@playwright/test`, `test:postgres`, `test:pipeline-layout`). Both lockfiles had drifted independently (155 version differences) because the sync tool ignores the lockfile. **Regenerate once** with `npm install --legacy-peer-deps` and commit. |
| `.agents/memory/` | Union; `MEMORY.md` is both indexes concatenated; `prototype-scope.md` is Ben's | Replit Agent notes, not code. |
| `verification/` | Union (Ben's `fee-toast`, Emily's `pipeline-layout`) | Zero file-level conflicts. |
| `vitest.config.ts`, `.gitignore`, `.replitignore` | Emily's | Only she changed them (excludes Playwright specs from vitest; ignores `.cache/ms-playwright`). |
| Replit `subrepl-*` and `replit-agent` branches, `gitsafe-backup` / `subrepl-shared` remotes | Dropped from the unified repo | Replit-internal scratch state; both `main` lineages are fully preserved. |

## Features carried forward

- **Ben:** fees + `FeeEditDialog`, decision simulation (`shared/business-rules/decision-simulation.ts`), credit-freeze rule, success and frozen-credit toasts, collateral ratio updates, loan demo controls, `verification/fee-toast`.
- **Emily:** pipeline page redesign (`pipeline-columns.tsx`, `pipeline.css`), `MainNavigation` / `LoanNavigationMenu` / `PipelineFooter`, SF opportunity creation (`server/sf-opportunity.ts`) with idempotent retries, opportunity expiry, Postgres integration tests, Playwright layout harness (`verification/pipeline-layout`).

## Verification performed (offline sandbox, no network)

- `tsc` syntax-only pass over 354 `.ts`/`.tsx` files: 0 syntax errors.
- Resolver check over 1,020 relative and alias imports: all resolve (the `?synthetic` virtual modules in `verification/history-*` are test-harness IDs present in both originals; the two `@assets/*.pdf` imports in `verification/documents/route.test.tsx` were already dangling in both projects).
- No conflict markers anywhere in the tree.
- No file from either side was dropped except the three retired PDFs.

## Not verified — do this first

```bash
npm install --legacy-peer-deps
npm run check          # tsc
npx vitest run         # unit tests
npm run db:check       # then npm run db:upgrade:dev if it reports needs-upgrade
npm run dev            # click through Pipeline, New Loan (SF + Blend), Fees, Decisioning
```

Also confirm nobody pushed to `fcma-bennorthrup/ROADS-LOS` from somewhere other than these two projects after 2026-11-10 ~16:40 UTC; that work would not be in this merge.
