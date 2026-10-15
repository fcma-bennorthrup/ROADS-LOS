---
name: Sync eligibility policy
description: Owner-approved binary, size, deletion, and lockfile boundaries for custom sync
---
The owner approved byte-for-byte binary sync in both directions up to 7 MiB inclusive, including PDFs. Binary conflicts must be blocked rather than sent to the text editor. Preserve binary files when missing on either side; retain deletion handling only for eligible text files. Excluded, oversized, and unreadable files must never count as confirmed deletions. Keep package-lock.json and existing credential/runtime exclusions.

**Why:** The owner explicitly approved this bounded behavior-changing exception to the visual and functionality preservation rule.

**How to apply:** Do not interpret eligibility approval as permission for real GitHub operations, binary deletion, dependency changes, or broader checkpoint/recovery and snapshot changes.

The owner also approved skipping oversized files with an explicit preservation message, blocking failed reads/downloads before writes, and blocking binary conflicts even for force operations. Differing existing binaries without a usable baseline need manual reconciliation. Older pending plans containing binary conflicts, binary deletions, or newly ineligible files must be cancelled and retried.

**Why:** Missing comparison evidence must not become deletion or overwrite permission. Approval covers pre-write eligibility checks, not failures during writes.

**How to apply:** Preserve the agreed messages documented in the sync eligibility report. Keep successful text-only messages and the admin layout unchanged.
