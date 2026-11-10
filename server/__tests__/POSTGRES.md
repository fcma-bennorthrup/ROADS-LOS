# PostgreSQL creation regression

Run `npm run test:postgres` with the workspace's development `DATABASE_URL`
available. A missing connection fails the suite rather than skipping it. Do not
point this command at a production database.

The suite creates a uniquely named `cif_integration_*` schema, sets every test
connection's search path to that schema alone, and creates its own minimal loan
table. It never copies or queries public prototype records, runs migrations, or
uses `db:push`. The database role needs permission to create schemas/functions.
Route connection settings are substituted, but queries, transactions, advisory
locks, and persistence all run against real PostgreSQL.

Four creation requests are held behind a real advisory lock. The test checks
PostgreSQL's lock waiters before releasing them, then verifies committed IDs,
loan numbers, and six-digit CIFs. Only the CIF random starting point is fixed,
so every allocation must handle a collision and wrap using the real allocator.
A failing database trigger checks rollback, unchanged records, released locks,
clean pooled connections, and a successful retry.

The dedicated configuration uses Node without browser setup and is separate
from the default unit suite. Each test starts with its own synthetic seed.
Teardown closes route pools and drops only the uniquely named test schema,
including after failed assertions. Abrupt process termination can prevent
teardown; any leftover `cif_integration_*` schema contains only test fixtures.
