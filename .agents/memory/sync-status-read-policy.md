---
name: Sync status read policy
description: Read-only deadlines must not weaken sync mutation safety
---
Use a bounded read-only status check and tree metadata where sufficient; preserve pinned reads when metadata is missing. Never apply a race-based timeout to push/pull writes or release mutation coordination while writes can still continue.

**Why:** The user approved resolving status checks that blocked GitHub actions. Status previously downloaded every checkpoint file under the shared lock; a stalled read could block mutations. A late read is harmless only if it cannot resume the handler or update cache; a late write can change repository state.

**How to apply:** Keep timeout results explicit and uncached, preserve eligibility and recovery rules, and verify with fake transports. This approval does not authorize live pushes/pulls or weaker mutation locking.
