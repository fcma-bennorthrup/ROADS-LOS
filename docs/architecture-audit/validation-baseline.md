# Accepted dependency baseline: isolated verification

## Authority and result

The user explicitly selected **Current lockfile (recommended)** for isolated
validation. This accepts that snapshot as the verification reference only, not
as a production behavior change, calendar migration approval, or permission to
repair diagnostics. Earlier audit reports remain historical and unmodified.

**Result: reproducible installation and passing tests; failed static check.**
This is not a clean validation gate for downstream refactors.

| Check | Exact outcome |
|---|---|
| Disposable `npm ci --ignore-scripts --no-audit --no-fund` | Exit 0; 585 packages added |
| `node node_modules/typescript/bin/tsc --noEmit --incremental false` | Exit 2; 15 diagnostics |
| `node node_modules/vitest/vitest.mjs run --config verification/baseline/vitest.config.ts --reporter=verbose` | Exit 0; 18 files / 176 tests passed |
| Existing tests | 17 files / 172 tests passed; no exclusions added |
| Added bounded fixtures | 1 file / 4 tests passed |
| All audited source/configuration/dependency/asset paths | All 174 unchanged before/after, in both project and copy |
| Installation versus lock | All 585 installed package versions match; no missing nonoptional package entries |
| Browser/visual/build/performance/deployment | Not run; no pass claimed |

## Provenance

- Node **v24.13.0**, npm **11.6.2**, Linux; no runtime replacement.
- `package.json`: `e3a709a27242fa7cdf8385c115ea3a2ce4a332d1771b1de5e835b0e2bf21f753`.
- Accepted `package-lock.json`: `caf5cbce73ec535033e36984f2c5d00e080a7a91c1575750b7008f7c52e9107e`.
- `tsconfig.json`: `4bea0e0003e3c943f455346abc4854d1666d604adbaa6aa8eda11f94fb8f1396`.
- 173 original audit hashes match; the sole accepted departure from the
  historical audit manifest is the current lockfile. No historical baseline
  overwrite was performed.
- 701 lock entries including the root; 700 dependency entries, of which 585
  installed and 115 optional entries absent. Missing optional/platform entries
  are recorded individually in the version ledger, not reported as installed.
- Installed key versions: TypeScript 5.6.3, React 18.3.1,
  react-day-picker 9.14.0, Vitest 4.1.11, jsdom 29.1.1,
  testing-library/react 16.3.3, jest-dom 7.0.1,
  TanStack React Query 5.60.5.

## Reproduction and safety

Run **only after authorization of this snapshot**:

```sh
python verification/baseline/run.py
```

The runner checks all 174 audited hashes and the accepted package/lock hashes
before making a fresh `/tmp/validation-baseline-*` copy. It never installs in
the project, copies `node_modules`, starts a server, builds the App, or reads
credentials. It constructs an environment allowlist (PATH, disposable HOME,
TMPDIR, UTC timezone, locale and npm settings); project secrets and user npm
configuration are not inherited. Package retrieval is needed for installation;
lifecycle scripts, audit and funding requests are disabled. Project `.npmrc`
is copied unchanged.

Tests use the original Vitest config and original setup, plus isolated safety
setup; original source/tests/configuration are not rewritten. All discovered
existing tests run. Test records are fixtures or in-memory demo data; no database,
real document delivery, financial endpoint, or GitHub API is accessed. Local
storage is jsdom-local and cleared by the original setup.

Timezone is UTC. Default Date is fixed to 2026-10-14T16:00:00.000Z before
each test; existing tests that intentionally choose another clock retain that
choice. Non-Date timers remain real until a test enables its own fake timers.
One worker and sequential test files reduce cross-fixture interference.

Node preload blocks socket connects, HTTP(S), UDP sockets, fetch and WebSocket.
Fixture setup additionally blocks browser fetch, XHR, WebSocket and window.open.
Explicit test mocks replace these with inert functions where needed. The new
pull fixture makes two calls to a fake function and disables background query
execution. It does not mount the live App or use the real sync backend.

**Isolation limit:** OS network namespaces are unavailable (`unshare -n`
returned “Operation not permitted”). The guard is for trusted local fixtures,
not a security sandbox against hostile code/native subprocesses. No external
operation was needed during checks. There is no claim of packet-level network
monitoring. The live workflow was neither restarted nor inspected.

Existing CSS/fonts/assets were copied byte-for-byte. jsdom does not prove font
loading, pixel output, layout, responsive breakpoints, or browser-native focus
behavior. No live-app screenshot was taken, consistent with the task boundary.

The runner writes raw logs, installed-version measurements, commands/exit codes,
and preservation results into its disposable directory. Its final status is
nonzero when any check fails; this baseline therefore remains a failing gate.
The first run predated that final aggregate exit-status line and returned 0
from the Python wrapper; its recorded **tsc exit 2** is authoritative and has
never been reported as passing. The exit-status-only runner change was
syntax-checked, not used to rerun an unchanged suite.

## Diagnostic classification (no repairs)

### Source/type-contract mismatch: one TS2554

`client/src/components/GitHubSyncPanel.tsx:156:45` calls
`pullMutation.mutate()` with no arguments. The installed mutation type requires
an argument even though the mutation function accepts optional options.

The bounded runtime hook fixture independently confirms current behavior:
normal no-argument pull calls `/api/github/pull` with exactly
`{ method: "POST", credentials: "include" }`; forced pull adds the JSON header
and body `{"force":true}`. Both use fake responses. This does **not** resolve
the static error or prove all panel/409/error states. No cast, source edit, or
type suppression was introduced.

### Compiler configuration/source mismatch: fourteen TS2802

The unchanged configuration lacks an explicit target/downlevelIteration while
source iterates Map/Set values. TypeScript's default target cannot compile
those iterations under this configuration.

- `server/conflict-detection.ts`: 51, 52, 53, 61, 129, 130, 131, 139.
- `server/routes.ts`: 120, 332, 433 (two diagnostics), 513, 527.

All exact diagnostic text is retained in the raw log. No target change,
iteration rewrite, exclusion, dependency adjustment, or build inference was made.

### Historical installation/calendar categories

The historical report's 66 diagnostic lines are **not today's result**.
No missing test-module or calendar class/component API diagnostics occur with
the accepted clean installation. Installed versions match the lock. This
supports an installation-sensitive distinction but does not retrospectively
prove the exact cause of every historical diagnostic.

The new calendar fixtures render the actual library (not a mocked picker):

1. Shared calendar renders October 2026 and navigates to November.
2. Roads picker shows its dialog, disables the tested Saturday, selects
   October 15 with `10/15/2026`, closes and restores trigger focus in jsdom;
   Escape also closes and focuses the trigger.
3. Unmocked browser transport/open calls throw the safety error.
4. Normal/forced pull request shapes are asserted as described above.

This is narrow fixture evidence before any later repair decision, not exhaustive
calendar accessibility, pricing cancellation, browser keyboard, or UI equivalence.

## Warnings, remaining blockers and approval requests

- npm reports the existing `.npmrc` keys `auto-install-peers` and
  `strict-peer-dependencies` as unknown project config.
- Tests report stale Browserslist data. No update command was executed.
- Type-check readiness remains blocked by the 15 reproduced diagnostics.
  Any repair requires separate approval: (a) resolve the pull call's type
  contract while preserving the evidenced payload, and (b) choose and verify
  the compiler iteration/target policy. Neither is approved or implemented here.
- No browser screenshots, responsive comparison, production build, publish,
  alternate Node runtime, or older-lock installation was performed.
- Planned downstream page/sync characterization remains separate; this report
  does not authorize it or assert that its broader proof plans have passed.
- No duplicate follow-up tasks were proposed because downstream work is already
  listed in the assignment.

## Evidence files

See [validation-evidence/](validation-evidence/) for installation, type-check
and verbose test logs, exact command results, all 174 preservation hashes and
the complete installed/locked version ledger. These are small text reports;
the disposable installation itself and package cache are not committed.
