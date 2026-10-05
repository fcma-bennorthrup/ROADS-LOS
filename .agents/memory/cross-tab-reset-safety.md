---
name: Cross-tab reset safety
description: Why browser-persisted demo histories need a durable reset identity.
---

A reset must change a persisted identity, not merely clear the visible records. Pending operations should verify that identity against authoritative storage before committing.

**Why:** Browser storage notifications may arrive after a pending operation completes. Deleting history alone also permits reused numbered IDs to target a different post-reset disclosure. A durable reset identity prevents old work from restoring cleared history or delivering a newly generated record with a reused ID.

**How to apply:** Preserve reset identity through ordinary history updates, change it atomically with a reset, and check it inside the serialized mutation. Browser locks protect simultaneous read/modify/write operations where supported; re-reading storage alone only addresses stale snapshots, not truly simultaneous writes across browser processes.