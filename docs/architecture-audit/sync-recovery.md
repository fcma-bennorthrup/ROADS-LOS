# Approved partial sync recovery

## Approval and scope

The owner explicitly approved the recommended partial-sync policy: checkpoint
advancement only after intended eligible changes succeed; stop on failure;
preserve applied changes without rollback; content-free recovery records survive
restart; retain conflicts on failure; verify actual state before a manual retry;
no automatic retry. Successful UI remains unchanged.

The approved error is:

> Sync incomplete. The checkpoint was not advanced. Some changes may already have been applied. Review the result before retrying.

Eligibility exclusions, oversized preservation, binary safety, credential
exclusions and non-forced ref updates remain unchanged. This does not approve
live sync operations or the separately queued snapshot/concurrency changes.

## Implementation and recovery contract

- Pulls and resolution stage per-file intent before writes, stop at the first
  failure and report completed/failed/not-attempted/uncertain results.
- Both upload helpers fail rather than publish a tree missing a failed blob.
  Upload progress distinguishes staged blobs from a published branch; a lost
  ref-update response remains uncertain.
- The journal stores paths, action/state, blob hashes, request fingerprint,
  remote identity and checkpoint, never file contents. Its same-directory
  temporary-file replacement retains the previous readable record if the next
  write is interrupted. Checkpoint and pending-plan replacements also use
  temporary files. These are not a multi-file transaction or power-loss fsync
  guarantee.
- The recovery-aware checkpoint reader remains authoritative even if the legacy
  checkpoint file was replaced before completion was interrupted. All current
  application checkpoint readers use this adapter. Future readers must do so too.
- An unfinished operation blocks a different action/mode. Manual retry verifies
  local files against recorded before/after hashes and checks the remote tree
  when publication might have occurred. Divergent or partially corrupted bytes
  require manual reconciliation before retrying; the system never guesses.
- A retry replans using current files and the retained ancestor. It also checks
  previous intended outcomes before accepting completion, including a remote
  update whose response was lost. It does not blindly repeat the mutation.
- The admin panel displays retained recovery information after reopening/reload,
  with a native expandable per-file result list. Failure handlers refresh status;
  incomplete recovery bypasses an otherwise cached clean status.
- Pending conflicts are not cleared on a failed operation. Cleanup after a fully
  recorded completion remains a separate metadata operation; a process death
  before cleanup can leave a pending plan. Cross-record crash/concurrency
  coordination belongs to the queued snapshot task, not a claimed transaction.

## Verification

Run `python verification/sync-recovery/run.py`. The runner uses the accepted
lock hash `caf5cbce73ec535033e36984f2c5d00e080a7a91c1575750b7008f7c52e9107e`,
checks installed versions, copies source into disposable storage, and uses the
local pre-change revision as baseline. No dependency installation is performed.
The baseline is pinned rather than reading moving HEAD (automatic checkpoints
can advance HEAD during a task).

Evidence is retained under `verification/sync-recovery/evidence/`.

- 78 isolated route/recovery/upload cases passed: permission/write/delete,
  mkdir, null-fetch, read/download/network, blob-without-SHA, upload rejection,
  tree/commit/ref failures, interrupted journal writes/replacements, partial
  local writes, checkpoint and pending-plan failures, restart/manual retry,
  remote acceptance with lost response, and divergent-state rejection.
  Confirmed publication after a lost resolution response completes recovery
  without repeating local writes or submitting the stale pending plan.
- Successful response bytes/statuses and ordered **mutation** calls match the
  baseline matrix. Journal calls and additional recovery verification reads are
  intentional differences, not an assertion of identical total adapter traffic.
- Exact successful panel pixels, rendered text, DOM order and computed geometry/
  typography/colors/spacing match at 1440×900, 1024×768, 390×844, 639×844 and
  640×844. The approved failure display expands with Enter at each viewport.
  Tests load only synthetic standalone component fixtures; no live App mount.
  External fonts/network are blocked consistently, so this is not a
  production-web-font or cross-browser certification.
- Non-emitting TypeScript checks still fail with the same 13 existing diagnostics
  (one pull argument and twelve iteration-target diagnostics), with shifted
  source lines only. No dependency/compiler repairs or suppressions were made.

## Limits and handoff

No real GitHub calls, production records, secrets, document delivery, deployment
or live workflow restart were used. The isolated fixture is the authorized
runtime verification environment. Browser evidence is Chromium-only; no
performance, accessibility-certification or production-runtime claim is made.

Completion review found that preserving a failed resolution's intent could block
the pull needed after a stale-branch rejection. To avoid this new recovery
lockout, the existing push-resolution stale-head check now runs before journaling
or local writes, preserving its actionable 409/pull instruction.
This is a narrow overlap with the queued stale-check task, not implementation of
its snapshot or concurrency design. Older local-only unfinished resolutions can
be reconciled by an explicit normal pull after verifying recorded before/after
bytes; the old checkpoint is retained, uploads must not have started, and later
local edits still block recovery. Stale/retry/cancel/pull sequences are covered.

Snapshot pinning, remaining stale conflict protections, serialization across
requests/processes, and coordinated metadata transactions remain in the queued
follow-on work. They must integrate with, not bypass, this recovery authority.
No duplicate follow-up task was proposed.
