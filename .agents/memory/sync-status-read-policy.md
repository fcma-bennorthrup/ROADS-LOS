---
name: Sync status read policy
description: Read-only deadlines must not weaken sync mutation safety
---
Use a bounded read-only status check and tree metadata where sufficient; preserve pinned reads when metadata is missing. Never apply a race-based timeout to push/pull writes or release mutation coordination while writes can still continue.

**Why:** The user approved resolving status checks that blocked GitHub actions. Status previously downloaded every checkpoint file under the shared lock; a stalled read could block mutations. A late read is harmless only if it cannot resume the handler or update cache; a late write can change repository state.

**How to apply:** Keep timeout results explicit and uncached, preserve eligibility and recovery rules, and verify with fake transports. This approval does not authorize live pushes/pulls or weaker mutation locking.

The same read-only boundary applies to immutable file-content comparisons during
push/pull preflight. Reuse content only when the pinned blob hash and encoding
match; do not substitute a newer local version for historical conflict content.

**Why:** Optimizing the status endpoint alone did not address pushes that spent
minutes downloading unchanged checkpoint files under the mutation lock.

**How to apply:** Keep comparison timeouts separate from mutation timeouts. A
late comparison read must never resume into writes; preserve journal and
checkpoint handling rather than forcibly releasing a running writer's lock.
