---
name: Sync snapshot and coordination policy
description: Approved stale-plan, concurrency, and recovery boundaries
---
Pin remote reads, reject changed remote/local conflict plans before mutations,
retain rejected plans, and reject overlapping sync mutations rather than queue
them. Preserve non-forced publication, successful UI, existing eligibility and
manual-only partial recovery.

**Why:** The owner explicitly approved this behavior-changing exception to the
architecture preservation rule. Approval does not authorize real GitHub sync
or neighboring fixes.

**How to apply:** Use disposable fake transports for verification. Never claim
the local operation lock prevents external editor writes or remote changes after
preflight, or that atomic metadata replacement guarantees power-loss durability.
Keep the recovery journal content-free; source-containing pending snapshots
belong to the conflict store and must be retired after successful recovery.

Stale checks must hash original file bytes, not decoded/re-encoded text.
Verification captures must live under the already-excluded `.local` directory
or outside the workspace; Git ignore rules do not control custom sync discovery.

**Why:** Invalid UTF-8 edits can decode identically, and ignored generated
captures can otherwise be selected by the custom scanner.

**How to apply:** Capture hashes alongside the original file read and retain
byte-distinct invalid-UTF-8 regression fixtures. Check the custom eligibility
policy whenever choosing a location for disposable evidence.
