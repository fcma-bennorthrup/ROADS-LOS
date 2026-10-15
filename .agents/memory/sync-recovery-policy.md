---
name: Partial sync recovery policy
description: Approved checkpoint, partial-result and manual-retry boundaries
---
Advance the sync checkpoint only after all intended eligible changes succeed,
retaining the existing oversized-file exclusions. Stop at a write/upload failure;
preserve already-applied changes rather than attempting rollback. Keep pending
conflicts and a recovery record across server restarts. Recovery records identify
completed, failed and uncertain steps without storing source contents.

**Why:** The owner explicitly approved this failure-policy exception to the
no-functionality/no-UI-change constraint. A lost remote response must not be
treated as proof that no write occurred.

**How to apply:** Never retry automatically. Manual retries first inspect actual
state. Preserve successful UI and use the approved failure wording: “Sync
incomplete. The checkpoint was not advanced. Some changes may already have been
applied. Review the result before retrying.” Snapshot pinning, stale-resolution
ordering and concurrent-operation locking remain separately scoped.
