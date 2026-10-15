# Sync mechanics extraction — preservation evidence

## Reference and boundaries

The workspace was explicitly refreshed by a fast-forward to the available
main-project reference `7bdc15140ba63507a43bb70af05fc4b29147eb65` before edits.
This includes document-route verification, per-store partial Reset Demo,
package coordination, credential-file exclusions, and API error handling.
The user then explicitly selected continuation of the sync refactor, not a
package-progress change. No document/reset/client behavior is changed here.

The accepted lock SHA-256 remains
`caf5cbce73ec535033e36984f2c5d00e080a7a91c1575750b7008f7c52e9107e`.
No dependency, compiler option, persistence format, route, UI, or policy changed.
No real sync, connector request, production access, credential-value inspection,
live App mount, deployment, or live workflow restart was used.

## Extraction

- `server/sync-mechanics.ts`: injectable filesystem and remote-content mechanics,
  with the existing scanner, eligibility predicates, size boundary, encodings,
  read skips, 404 handling and aggregated fetch errors.
- `server/sync-plan.ts`: pure content hashing and ordered tree-diff planning.
  Missing collected paths remain **candidates**, not automatic deletions:
  filesystem existence checks remain in the mechanics adapter.
- `createSyncRouteRegistrar`: explicit filesystem, GitHub, checkpoint,
  pending-conflict, working-directory and clock dependencies. The existing
  `registerRoutes` export supplies the original defaults. Cache ownership remains
  per registration and route orchestration ordering remains unchanged.
- `createGithubOperations`: injectable request transport while retaining every
  existing exported helper. The two push implementations deliberately remain
  separate: their no-op/error and result contracts differ.
- Existing pure push/pull conflict plans remain in `conflict-detection.ts`
  unchanged. Metadata modules and the merged credential policy are unchanged.

Caller inspection found route mutations using `pushCodebaseWithDeletions`;
the exported legacy `pushCodebase` was retained and tested, not deleted.

## Reproduction

```sh
python verification/sync-mechanics/run.py
```

This checks the accepted lock and every installed version, and checks unchanged
consumer/policy/metadata sources against the refreshed reference. It copies
explicit source-only roots to a fresh `/tmp/sync-mechanics-*` directory. It
does not copy credentials/runtime state, install packages or scan project files
through the sync collector. Dependencies are reused read-only by symlink.
The environment is allowlisted, timezone UTC, fake route clock fixed.
The inherited network guard blocks socket/HTTP/fetch operations; VM fixtures
permit only fake filesystem/transport modules and required pure Node primitives.
No OS-level hostile-code sandbox is claimed.

The original credential-sync fixture is reused, with additional injectable
failure controls and detailed filesystem-call recording. Its original scenarios
and assertions remain. Baseline route/GitHub source is read from the locally
verified reference, never from a remote repository.

## Measured results

Last full run: `/tmp/sync-mechanics-j_gf5su8`.

| Check | Result |
| --- | --- |
| Reused credential/status/push/pull/conflict fixtures | PASS, 234 checks including baseline comparisons |
| Additional route scenarios | PASS, 35 baseline/candidate cases through both default and injected adapters |
| Low-level GitHub transactions | PASS, 76 cases through default and injected request paths |
| HTTP/non-JSON/empty transport parsing | PASS, 4 baseline/candidate cases |
| Pure diff | PASS, exact encoded bytes, empty-blob hash, input order, duplicate paths, no mutation |
| TypeScript, baseline | FAIL, exit 2, 15 diagnostics |
| TypeScript, candidate | FAIL, exit 2, same 15 diagnostic messages/counts |
| Type diagnostic comparison | PASS after explicitly mapping the moved Map iteration from routes to sync-plan; raw logs retained |
| Client, styles, assets, schema, lock/config, policy/metadata sources | Unchanged |
| Mocked browser panel/dialog/Not Found | See `ui-evidence.md`; no live App |

The additional route coverage includes raw non-UTF-8 binary bytes, exact/over
7 MiB stats, read/write/delete/network failures, null fetch, 404 vs other fetch
errors, initial/normal/force operations, status/cache invalidation, all GitHub
route registrations, resolution shape/path/completeness checks, duplicate
resolutions, deletions, moving-HEAD content and stale push state.
Assertions compare full response status/JSON bytes, ordered fake calls (including
existence checks and encoding arguments), final local contents and both metadata
states. GitHub fixtures inject failures at ref/commit/blob/tree/commit/ref-update
stages and compare exact serialized request bodies, skip results and errors.

In particular, tests explicitly retain writes before stale-push rejection,
checkpoint advancement after a partial force pull, skipped blob outcomes,
binary pull exclusion, and distinct legacy push empty-operation errors.
These are characterized behavior, not fixes or endorsements.

## Limits and remaining risks

The baseline is not a clean TypeScript pass. The existing pull-call diagnostic
and Map/Set target diagnostics remain, including the diagnostic that moved with
the extracted loop. No cast, exclusion, compiler repair or snapshot replacement
was used to hide a failure.

Browser verification uses real components and unchanged CSS with synthetic API
responses. Production web-font glyph rendering, real routing/hosting behavior,
live transport permissions, OS filesystem errors and concurrent real operations
are not certified. The inherited mobile resolver clipping is unchanged. The
small same-flow PNG difference was isolated to the test tool's animated pointer,
not application pixels. No accessibility or performance gain is claimed.

Known sync eligibility/checkpoint/snapshot policy work remains with its already
planned tasks. No overlapping follow-up was proposed.
