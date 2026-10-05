---
name: Cross-tab reset safety
description: Why browser-persisted demo histories need a durable reset identity.
---

A reset must change a persisted identity, not merely clear the visible records. Pending operations should verify that identity against authoritative storage before committing.

**Why:** Browser storage notifications may arrive after a pending operation completes. Deleting history alone also permits reused numbered IDs to target a different post-reset disclosure. A durable reset identity prevents old work from restoring cleared history or delivering a newly generated record with a reused ID.

**How to apply:** Preserve reset identity through ordinary history updates, change it atomically with a reset, and check it inside the serialized mutation. Browser locks protect simultaneous read/modify/write operations where supported; re-reading storage alone only addresses stale snapshots, not truly simultaneous writes across browser processes.

Persist the reset's scope along with its identity; a document-only reset must not broadcast a global demo reset.

**Why:** Other demo surfaces react to the global reset notification by clearing their progress, including Subject Property data. A narrow reset can otherwise erase unrelated progress despite only changing disclosure history.

**How to apply:** Keep scoped-reset intent available to remote tabs, not only the initiating component. Preserve broader Reset Demo semantics for broad and legacy reset events.