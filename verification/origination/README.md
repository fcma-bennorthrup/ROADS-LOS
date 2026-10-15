# Origination characterization

Run from the repository root:

```sh
python verification/origination/run.py
```

The runner rejects unrecognized manifest drift, makes a disposable copy,
installs only the accepted lock without lifecycle scripts, and executes the
Origination tests plus the two unchanged existing component suites.
It reuses the shared safety setup/config and Node transport guard without
modifying them. Package installation needs network access; test execution blocks
external transports. No live App, server, GitHub, database, or financial service
is mounted/called. Test records and storage are disposable.

Date defaults to 2026-10-14T16:00:00Z in UTC. The original existing tests may set
their own clock. Real native inputs, Roads controls and Radix Dialog are used,
not replacement select/dialog mocks. The route uses actual Wouter browser
history in jsdom and an inert synthetic QueryClient cache; only the admin
panel is mocked. Query loading/error tests use local promises, not HTTP.

`/tmp/origination-verification-*/` contains logs and before/after integrity
results. A nonzero exit means installation, tests, or preservation failed.
These checks do not certify pixels, computed layout/fonts, native browser
keyboard behavior, or performance. See the audit report for exact limits.

The `browser/` directory is a separate inert full-route fixture. After the
runner creates a disposable copy, it can be served there with
`node node_modules/vite/bin/vite.js --config verification/origination/browser/vite.config.ts`.
Use only a clean environment and disposable UTC browser context with all
non-local requests aborted; visit
`http://127.0.0.1:4317/loans/synthetic-a/origination`.
Do not start this fixture from the live application or replace its workflow.
The committed browser report distinguishes observed defects from passing
component assertions and unverified visual equivalence.

The historical manifest stays immutable. The accepted lock departure and
explicitly approved documentation-only departures are pinned in this runner.
Never update those hashes to conceal application or dependency drift.
