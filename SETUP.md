# ROADS-LOS Setup Guide

This guide describes the current local configuration, not a verified installation or deployment. The owner approved documenting both configurations below separately, with compatibility unverified. No runtime version, dependency snapshot, sync policy or persistence change is implied.

## Runtime paths

| Path | Current configuration | Verification status |
|---|---|---|
| Local nvm | `.nvmrc` selects Node **20.20.0** | Compatibility with the current dependency snapshot is unverified. |
| Replit | `.replit` declares **nodejs-24**; workflow `Start application` runs `npm run dev` | Configuration observation, not a runtime smoke-test result. |
| Production build/start | `.replit` specifies `npm run build` then `npm run start` | No publication or deployed-health test performed. |

Do not treat the local and Replit paths as proven equivalent. Dependency-baseline acceptance and setup smoke testing require separate authorization; see [the audit's baseline limits](docs/architecture-audit/final-review.md#baseline-consistency-and-drift-disposition).

## Repository and local setup

The repository target in `server/routes.ts` is `fcma-bennorthrup/ROADS-LOS`. If separately authorized to clone it:

```bash
git clone https://github.com/fcma-bennorthrup/ROADS-LOS.git
cd ROADS-LOS
```

With nvm already installed, these commands read `.nvmrc`:

```bash
nvm install
nvm use
```

They select Node 20.20.0, not the Node 24 module declared in `.replit`. This guide does not authorize aligning those files.

### Dependency installation

The existing `scripts/post-merge.sh` executes:

```bash
npm install --legacy-peer-deps
```

This is an observation of the existing hook, not a verified reproducible-install recipe. Installation can change the lockfile; do not run it merely to resolve audit discrepancies. Obtain the accepted dependency snapshot before an authorized disposable setup. `.npmrc` also contains `auto-install-peers=false` and `strict-peer-dependencies=false`; those settings are not a substitute for checking npm's actual behavior.

### Development commands

After an independently authorized installation, the configured development entry is:

```bash
npm run dev
```

`package.json` expands this to `NODE_ENV=development tsx server/index.ts`. Express and Vite share a listener bound to `0.0.0.0`; `server/index.ts` uses `PORT`, defaulting to 5000. For a local browser the default address is `http://localhost:5000`; in Replit use the configured preview. A POSIX-shell port override is:

```bash
PORT=3000 npm run dev
```

These scripts use POSIX environment-assignment syntax; native Windows-shell compatibility has not been established. No development startup was run for this documentation correction.

## Data and environment

- **Active loan API:** `server/routes.ts` imports the `MemStorage` singleton from `server/storage.ts`. Loan and borrower seed data live in process memory and are recreated on server restart.
- **Browser state:** checklist, activity and some document progress use browser-local storage. Other edits are component-local. A local Save is not evidence of a database write.
- **Database infrastructure:** `server/db.ts`, `shared/schema.ts` and `drizzle.config.ts` exist, but the loan API does not import the database adapter. PostgreSQL provisioning is not a prerequisite for this in-memory loan path.
- **Database command:** `npm run db:push` maps to `drizzle-kit push`. The Drizzle configuration requires `DATABASE_URL` and targets a database schema mutation. It is not a normal prototype setup step and must not be run without separate database authorization.
- **Environment loading:** the server startup scripts do not declare a `.env` loader. Creating a `.env` file is not sufficient evidence that values will be loaded. No active loan-path use of `SESSION_SECRET` is present in the inspected server source.
- **Sync metadata:** `.local/github-sync-state.json` and `.local/pending-conflicts.json` are filesystem state, separate from browser storage and in-memory loan data.

Do not put credentials in project files for this setup. The custom sync scanner does not inherit `.gitignore`. Its filename-based exclusion policy is described below; it cannot detect secrets in otherwise eligible files. No secret values were inspected.

## GitHub sync: existing behavior and operating boundary

Only push, pull, create a repository or resolve a sync operation when explicitly instructed. Opening the app is not an inert audit fixture: its global sync hook requests pending conflicts. Use blocked/fake transports for separately authorized tests.

- Sync routes target `fcma-bennorthrup/ROADS-LOS`; GitHub helpers use `main` by default. The custom sync is not local Git branch synchronization.
- The repository-creation route creates `ROADS-LOS` for the authenticated GitHub user; it does not change the fixed sync target. Do not use it as routine collaborator setup.
- The scanner skips its named ignored directories, hidden directories and `package-lock.json`. It skips files larger than **7 MiB** and silently skips read failures.
- The approved credential/runtime policy excludes `.env`, `.env.*` (including templates), `*.pem`, `*.key`, `id_rsa`, `id_dsa`, `id_ecdsa`, `id_ed25519`, `github-sync-state.json` and `pending-conflicts.json` at any depth. Matching is case-sensitive. Other dot-config files retain their existing eligibility.
- These exclusions apply to status counts, push/pull (including force), deletion planning and conflicts. Excluded files are not transferred, overwritten or deleted; files already present locally or remotely are left alone. Existing pending plans containing excluded conflicts, updates or deletions cannot display file contents or be resolved. Use **Cancel Conflicts** in the resolver, then retry the sync. Cancellation clears only pending metadata, not the excluded files.
- Recognized binary files are collected as base64 for push, but pull excludes recognized binary extensions, including PDFs. Successful text sync does not prove asset parity.
- Some partial failures can still advance the recorded sync checkpoint. Force operations can overwrite work; this guide does not recommend using them to repair discrepancies.

Except for the explicitly approved credential/runtime exclusions, these are current implementation limitations, not newly approved policies or security guarantees. Broader eligibility, authorization, partial completion and concurrency changes remain separate decisions in the [approval register](docs/architecture-audit/approval-register.md).

## Pages and prototype scope

See [replit.md](replit.md#pages) for the current route and section map. There are six routed loan pages, a root redirect to `/loans/1`, and an unmatched-route fallback. Design System and Coming Soon are retained source pages without active routes.

Local edits, no-op actions, static Change Log records and simulated document/booking flows are intentional preservation boundaries for internal work—not live lending or delivery integrations.

## Fonts and styling

`client/index.html` requests Source Sans Pro and Inter from Google Fonts. Network/font availability can affect appearance; no offline-font or pixel-equivalence test was performed.

Styling spans `client/src/styles/design-tokens.css`, `client/src/index.css`, Tailwind configuration, component styles and TypeScript token exports. Do not assume every visual value comes from one token file. Preserve existing styling; token changes require the explicit approval described in `replit.md`.

## Build and checks

| Command/configuration | Source-defined effect |
|---|---|
| `npm run build` | Runs `tsx script/build.ts`; removes `dist`, builds Vite output in `dist/public`, and bundles the server as `dist/index.cjs` with esbuild. |
| `npm start` / `npm run start` | Runs `NODE_ENV=production node dist/index.cjs`; requires built output and required external dependencies. |
| `npm run check` | Runs `tsc` using the current TypeScript configuration; not a claimed passing check. |
| `.replit` post-build hook | Declares `pnpm store prune` with `CI=true`, despite npm build/start commands. Not executed or changed here. |
| `.replit` post-merge hook | Points to `scripts/post-merge.sh` with a 20-second configured timeout. |

Do not publish or run setup smoke tests as part of documentation verification. Current source/configuration describes a build path; it does not prove deployment is broken or repaired.

## Troubleshooting boundaries

- **Appearance differs:** check loaded fonts, viewport, browser-local state and the accepted dependency snapshot before proposing changes. Switching Node versions or provisioning a database is not a demonstrated visual fix.
- **Port conflict:** the `PORT` override above changes the listener for local development; preview routing must also match the chosen configuration.
- **Dependency/type errors:** record the exact runtime and dependency snapshot and use the separate validation investigation. Do not silently reinstall, upgrade, or overwrite the baseline.
- **`sedZiKBNa`:** this root file contains configuration-like text. No reference was found in the inspected entry/config/build/script paths; its provenance and wider use remain unverified. It is not treated as active configuration and must not be removed on that assumption.
