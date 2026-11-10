# Shared database models across development projects

## What travels through GitHub

Code, the loan model, the upgrade manifest and these instructions travel together.
Actual loan rows and database credentials do not. Each collaborator keeps their
own development database. Do not point a collaborator at another project's
database to make the models match.

The custom sync excludes `migrations/`, `.agents/` and `.local/`. This procedure
therefore lives in `docs/`, and the executable upgrades live in `script/db-upgrades/`.
Do not move them into an excluded directory or put database exports in the repo.

## After pulling code

Pulls through Prototype Admin Controls automatically check, apply exact approved
development upgrades, and verify the result. This includes successful pull-conflict
resolution and an already-up-to-date pull. Failed or conflicted code pulls do not
start database upgrades. Nothing runs on pushes or push-conflict resolution.
The server performs this work even if the browser disconnects.

For pulls outside those controls, older running app versions, or a reported
database warning, use these manual recovery steps:

1. Install dependencies if the pulled package files changed.
2. Run `npm run db:check` in the project's Shell. This checks the current pulled
   files in a read-only database transaction.
3. If the result is **needs-upgrade**, confirm this is your project's development
   database, then run `npm run db:upgrade:dev`.
4. Run `npm run db:check` again and restart the development app.
5. If the result is **blocked**, stop. Resolve the named model or upgrade-file
   conflict with your collaborator; do not force-push a database schema, edit the
   ledger, drop a table or discard loan data.
6. If the result is **unavailable**, check the project's database connection,
   dependencies and pulled files. A failed check is not proof that an upgrade
   is needed.

In Prototype Admin Controls → GitHub Sync, **Database compatibility** provides
the same read-only check. A successful pull (including resolved pull conflicts)
triggers a separate automatic development upgrade and compatibility check. Only
pending upgrades whose exact checksums match `script/db-upgrades/automatic-approvals.json`
can run automatically. Any unapproved step stops the entire automatic run before
database writes. New automatic approval requires explicit review; agents must
not automatically add new checksums to the approval file.

The code checkpoint is committed first. The sync lock stays held until the
database command completes, so another pull cannot replace its scripts mid-run.
A database failure never undoes the code pull or rewrites its checkpoint; it
appears separately in the response and notification. On an unconfirmed response,
run the read-only check before retrying: the database transaction may already
have committed. There are no automatic retries.

A fresh process reads the pulled contract rather than the running server's cached
copy. The server and browser
must first have adopted this feature; older copies cannot run the new check
until restarted/reloaded.

The checker can also be used without the UI after an external GitHub pull:
`npm run db:check`.

## Shared contract

- `shared/schema.ts`: active SQL table declaration plus existing legacy type
  declarations. The inactive Drizzle loans/borrowers/users tables are not created
  by this workflow.
- `shared/loan-contract.ts`: runtime loan-document structure and current format
  version. `LoanApplication` is derived from this schema. It validates the loan
  record, borrower ownership, stage, revision, metadata, change-log entries and
  recognized section structures. Extra optional fields are preserved.
- Business-rule outputs remain server-computed; this structural contract does not
  replace business calculations or validate every semantic rule.
- Unknown section names remain extensible. When introducing a modeled section,
  register its structural schema and tests rather than relying on that allowance.
- Unversioned documents are legacy version 0 and remain readable for the initial
  compatibility window. New documents are version 1. Unknown future versions are
  rejected before writes rather than silently downgraded.

The SQL check covers the active loan table's columns, types, nullability and
primary key. It does not claim to audit every PostgreSQL object or other tables.

## Agent procedure: before changing a stored model

1. Read this procedure and inspect the current contract, manifest and checker.
   Check development compatibility before editing.
2. Decide whether the change affects SQL structure, JSON document shape, or only
   a calculation. Do not create a migration for an unrelated calculation change.
3. Update the shared schema and add an **append-only**, uniquely ordered upgrade
   entry. Never edit or rename an already-shared/applied upgrade file.
   A backward-compatible optional JSON field needs no data transformation when
   missing values remain valid and are displayed as blank. For example, Subject
   Property `parcel` is optional text, saved in the existing per-loan JSON document.
   Do not backfill every loan or add a SQL column solely for that optional field.
4. Preserve existing values and unknown optional fields. For JSON changes, define
   the source and target versions and an explicit transformation. For new SQL
   steps, extend the runner's reviewed allowlist; it intentionally refuses
   unreviewed SQL. The current runner supports the initial format-0 → format-1
   upgrade only; future formats require reviewed code and tests.
5. Add tests for old data, blank data, repeated application, unknown newer
   versions, checksum conflicts, rollback and cross-loan preservation.
6. Run the development check, apply the reviewed development upgrade, and verify
   the check plus affected app behavior. Do not run the broad `db:push`.
7. Include model, upgrade, tests and instructions in the same code change.
   Push/pull only when explicitly authorized.

If two branches create the same upgrade ID with different contents, the checksum
check stops instead of choosing a winner. Merge and agree on the upgrade sequence
before applying it. Never renumber an upgrade already applied by either person;
resolve the history deliberately and preserve their data.

## Upgrade safety

`npm run db:upgrade:dev` remains the explicit **development-only** manual fallback.
The successful-pull hook invokes a stricter automatic mode with checksum approvals.
Neither mode runs during startup, build or deployment. Both use an advisory transaction lock,
row locks, an upgrade ledger (`roads_development_upgrades`), SHA-256 checksums,
and a single transaction. A failed transformation or final check rolls back the
whole run. Repeating it does not reapply recorded steps.

The first SQL step creates only `prototype_loan_applications` if absent.
The first document upgrade adds `schemaVersion: 1` while preserving loan data.
Nonzero revisions advance so open sessions detect the change; revision zero
retains the legacy browser-data adoption marker. The upgrade ledger is operational
metadata, not a second loan data store.

Deletion, renames and other destructive changes require explicit approval and a
reviewed data-preservation plan. The runner does not perform automatic drift
repair. Runtime reads/writes use the shared contract and report incompatible data
without returning stored field values in errors.

## Production boundary

Never run this development command against production or override its guards.
It rejects `NODE_ENV=production`, deployed environments and unconfirmed calls.
These guards do not determine whether a manually supplied connection string points
at the intended database; verify the project/environment before applying changes.

For Replit-managed production, schema changes go through Publish, not custom
startup/build DDL. The development upgrade ledger and development document
transformations are not a production data-migration mechanism. Any future upgrade
that requires transforming existing production JSON must get a separate,
explicitly approved production plan before release. Backward-compatible reads are
kept during the initial version-marker transition.
