# Sync status and preview checks

Sync-status comparisons use the pinned checkpoint tree's sizes and hashes,
not a download of every remote file. Missing sizes use a pinned content read.
The existing filename, size, symlink and binary-deletion exclusions remain.
Status reads have a shared 20-second deadline and return JSON HTTP 504 when
that deadline expires. Timeout results are not cached.

The coordinator still serializes operations. A timed-out remote read may finish
at the transport layer, but cannot resume the status handler, update its cache,
write files, publish a commit or advance a checkpoint. This read-only deadline
is not applied to push/pull mutations and does not automatically retry requests.

Run isolated tests without connecting to GitHub:

```sh
node --import tsx --test server/__tests__/sync-status-read.test.ts
node --import tsx --test server/__tests__/sync-snapshot-reads.test.ts
python3 -B scripts/test-preview-ports.py
python3 -B scripts/check-preview-ports.py
```

The port check reads `.replit` and `server/index.ts`; it changes neither.
It checks the development workflow's wait port and the public port-80 mapping
against the server fallback. If development explicitly overrides `PORT`, pass
that value using `--port`. It does not impose a fixed production port or alter
deployment settings. Python 3.11 or newer is required.

## Push/pull file comparison

Preflight snapshots reuse local or previously read content only when its Git blob
hash and encoding match the pinned tree entry. The cache lasts for one snapshot
operation; it never substitutes newer content for a different historical version.
Text that cannot round-trip to its original bytes is not reused.

Each remaining file-content read has a 20-second timeout. A timed-out comparison
stops before writes and releases coordination; late read results cannot continue
to publication. This does not impose a timeout on metadata requests, uploads,
or the overall push. Recovery and publication safeguards remain unchanged.
