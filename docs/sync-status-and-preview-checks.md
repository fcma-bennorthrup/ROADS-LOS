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
python3 -B scripts/test-preview-ports.py
python3 -B scripts/check-preview-ports.py
```

The port check reads `.replit` and `server/index.ts`; it changes neither.
It checks the development workflow's wait port and the public port-80 mapping
against the server fallback. If development explicitly overrides `PORT`, pass
that value using `--port`. It does not impose a fixed production port or alter
deployment settings. Python 3.11 or newer is required.
