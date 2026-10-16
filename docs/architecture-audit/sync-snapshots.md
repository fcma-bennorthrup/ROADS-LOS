# Approved sync snapshots and coordination

## Approval and exact differences

The owner explicitly approved the recommended snapshot, stale-rejection and
coordination behavior on 2026-10-15. This supersedes the pending decision for
SHARED-005 only; no other audit recommendation is implemented here.

Before: current-content downloads could use moving main; conflict submissions
did not identify the reviewed plan; pull resolutions and relevant local bytes
were not stale-checked; separate metadata files could expose a completed
checkpoint alongside an obsolete conflict plan. Concurrent processes could
interleave operations.

After:

- Current content is downloaded at the captured commit. The operation checks
  remote HEAD and snapshot local hashes before beginning mutations.
- Conflict detection persists hashes for every relevant local path, including
  absence and safe updates/deletions. Responses carry an opaque `planId`.
  The dialog sends the identity associated with its selections, not a newer plan
  that happened to arrive during editing.
- Both pull and push resolutions reject changed remote/local state, a replaced
  plan or an older plan lacking a complete snapshot, before journal/file writes.
  Pending conflicts remain available. Re-run sync to obtain a fresh plan.
- HTTP 409 stale wording: “Sync state has changed since this plan was created.
  No files were changed. Run sync again before resolving conflicts.”
- Sync status, conflicts, pull, push, resolution and cancellation share an
  exclusive workspace boundary. Overlapping requests return HTTP 409:
  “Another sync operation is in progress. Wait for it to finish, then retry.”
  Reads also fail explicitly while a writer is active rather than seeing
  intermediate metadata. There is no queue or automatic retry.
- The client only treats a 409 with `hasConflicts` as conflict detection.
  Busy/stale responses use the existing failure toasts; successful text and UI
  remain unchanged. Generic resolution error formatting is deliberately retained.
- Both upload helpers validate their expected parent before uploading and
  recheck HEAD before ref update. Ref updates remain non-forced. A remote race
  after the last check is still handled by GitHub's non-fast-forward rejection,
  not an assertion of distributed atomicity.
- The recovery journal commits checkpoint and pending-generation pointer in one
  atomic replacement. Separate content-bearing pending snapshots preserve the
  previous plan during incomplete operations; the journal itself remains
  content-free. Legacy files are compatibility mirrors, not completion authority.
  Successful operations retire unreferenced pending generations. Failed cleanup
  emits a warning and retries cleanup after the next successful operation.
- An interrupted operation keeps its old checkpoint and conflict generation.
  Manual retries verify actual bytes; only that attempt's recorded writes may
  substitute for its old local hashes. No rollback or blind retry was introduced.
  Cached status is invalidated by the authoritative journal revision, including
  changes made by another process.

## Boundary and remaining limits

The lock is a Linux abstract Unix-domain socket keyed by the canonical workspace
path. This uses existing Node APIs, no additional package or system executable.
The kernel releases it on process exit, including SIGKILL. It coordinates
processes in the same network namespace, not separate hosts or containers
sharing network storage. Unsupported platforms fail closed with HTTP 503.
The production registrar canonicalizes cwd; injected adapters must supply their
canonical fixture root.

External editors and remote users do not take this lock. Changes after the final
preflight cannot be prevented; failures after writes retain the approved partial
recovery result, not a “no writes” guarantee. No fsync/power-loss durability or
cross-host transaction guarantee is claimed. Content-bearing pending generations
may survive an interruption until successful recovery/cleanup.

File eligibility, credential exclusions, lockfile exclusions, binary deletion
prohibition, path validation, existing partial-error text and successful
interaction behavior remain intact. No real GitHub, financial, delivery,
production, secret-value or deployment operations were used.

## Reproducible evidence

Run `python verification/sync-snapshots/run.py`. It checks the previously accepted
lock and installed package versions, uses the pinned local pre-change revision,
copies only source/fixtures into disposable storage, and blocks external
transports. No install or live App mount is performed. The standalone fixtures
are built fresh; the live application workflow is intentionally not restarted.

Retained text evidence: `verification/sync-snapshots/evidence/`.
Safe generated screenshots/state captures: ignored
`.local/verification/sync-snapshots/` (also excluded by the custom sync scanner).

- **44 backend cases passed:** normal/force/initial/unchanged/conflict paths,
  exact successful response bytes and ordered substantive mutation calls
  (excluding new metadata writes and the approved plan/hash fields), pinned
  content reads, remote/local/replaced/legacy stale plans, safe-update/deletion
  hashes, plan propagation, overlapping readers/writers/cancel, interrupted
  local/checkpoint/clear/completion writes, restart/manual retry, and divergent
  local edits. Real fake-transport upload helpers exercise HEAD advancing before
  upload, before publication and at ref update, with non-forced updates.
  Raw local bytes are hashed at the same read that produces comparison content;
  byte-distinct invalid UTF-8 edits reject both during detection and resolution.
  Retained capture paths are explicitly checked against custom sync discovery.
- A real disposable two-process kernel-lock test verifies exclusion and
  reacquisition after SIGKILL. Only local Unix sockets are used.
- **50 exact rendered-state comparisons plus five Escape outcomes passed**
  at 1440×900, 1024×768, 390×844, 639×844 and 640×844. These cover normal/error/
  expanded panels and initial/selection/scrolled/manual/focus/loading/stale-error
  conflict states. DOM, text, computed styles/geometry, focus, scroll and pixels
  match the local baseline. Fonts/network are blocked identically; active
  animations are paused at the same time for comparison.
- Browser fixtures also verify changing the displayed plan cannot relabel old
  selections, successful resolution closes through the existing callback, and
  pull/push busy errors and detected-plan identities reach the correct consumer.
  The first Escape is compared to baseline, not assumed to close the dialog
  while a toast is active.
- **Static check remains failed:** baseline and candidate have the same 13
  diagnostics (one pull-mutation argument, twelve iteration-target errors), with
  route line shifts only. No suppressions, expected-source snapshot updates,
  dependency changes or neighboring repairs were made.

Browser evidence is Chromium-only on the installed Linux Node 24 environment.
Node 20 and other browsers are not certified. The existing cramped mobile
conflict layout is preserved, not described as improved. No performance,
accessibility certification, production-runtime or live-sync claim is made.
