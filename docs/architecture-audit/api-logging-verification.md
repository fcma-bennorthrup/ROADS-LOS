# Metadata-only API request logging

## Scope and approved policy

The user selected **Request metadata only**: preserve the existing timestamp,
method, path, status and duration format; remove JSON response bodies. No
aggregate counts were requested. Retention settings are unchanged. The selection
confirms that support tools do not require response-body fields.

The only production change is removal of JSON interception/serialization in
`server/index.ts`. Routes, HTTP response construction, error handling, client
code, dependencies, storage and sync operations are unchanged. Existing raw
request paths remain logged, including loan IDs. This is not general log
redaction: other error/warning logs remain outside this change.

## Reproducible checks

```sh
python verification/api-logging/run.py
```

Result: **10 tests passed**, Node v24.13.0, UTC, fixed fixture time
2026-10-14T16:00:00.000Z. The runner copies only the two server source files
and the two fixture files into a disposable directory, supplies a minimal
environment without project secrets, and deletes the copy after execution.
No packages are installed or imported. Node's built-in experimental TypeScript
stripping is used; its experimental warning is expected.

The middleware and route-registration source run in a VM with no application
imports, filesystem APIs, environment, timers or network transports. Only fake
loan-storage and pending-conflict adapters are supplied. The test uses an
EventEmitter response adapter, **not a listening Express server**.

| Check | Result / boundary |
|---|---|
| Loan success, missing loan, loan error | Pass: same serialized response bytes, status and ordered fake storage calls |
| Pending conflicts, no conflicts, conflict read error | Pass: same serialized response bytes, status and ordered fake adapter calls |
| 409 conflict payload | Pass at middleware boundary with a synthetic response; real push orchestration is not exercised |
| Non-API JSON response | Pass: neither baseline nor candidate emits a request log |
| No JSON / 204 response | Pass: metadata only |
| Dummy sensitive markers | Pass: baseline logs expose fixture markers; candidate request logs do not |
| Metadata format / finish event | Pass: exact existing prefix, one log after finish, no response-method wrapping |
| Timing-independent outcome | Pass: injected 7ms and 321ms durations preserve body/status/call order |
| Non-logging entrypoint bytes | Pass: reinserting captured original middleware reconstructs the pre-edit SHA-256 |
| `git diff --check` | Pass |

The first fixture run failed because its fake app lacked DELETE registration
and its baseline reconstruction added an extra newline. Both fixture errors
were corrected without changing the production edit or expected source hash.

## Provenance

- Pre-edit `server/index.ts`:
  `9b0f5a62495c0af6eb24993b8545bbd4043034cb7a2c2c0e8f25fd8ca46648e2`.
- Unchanged current `server/routes.ts`:
  `b1f60f4195b34c2f947d0cda50bedebe6a3d217bc7257fd791afc31f42ce9045`.
  This is the current local source, not a claim of matching the historical audit.
- Unchanged accepted `package.json`:
  `e3a709a27242fa7cdf8385c115ea3a2ce4a332d1771b1de5e835b0e2bf21f753`.
- Unchanged accepted `package-lock.json`:
  `caf5cbce73ec535033e36984f2c5d00e080a7a91c1575750b7008f7c52e9107e`.

## Accepted evidence boundary

The original proof plan also requires actual HTTP and mocked loan/conflict/error
browser comparisons. These have **not** been performed. Adapter serialization
is not an end-to-end HTTP assertion, and unchanged client files are not a
browser visual-equivalence result. The live App was not mounted, the application
workflow was not restarted, and no live logs, GitHub operations, financial
services, document delivery or production data were accessed.

The existing shared verification baseline reports 15 type diagnostics; that
check was not rerun and no fixes or passing whole-project claim are included.
No performance or log-volume benefit was measured.

The user explicitly selected **Accept backend fixture evidence** for completion:
the 10 passing checks and unchanged non-logging code are the accepted proof for
this logging-only change. Actual HTTP and browser equivalence remain unverified;
this acceptance does not imply those checks passed or waive them for other work.
