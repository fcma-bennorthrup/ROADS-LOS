---
name: Decision display restoration
description: User-approved boundaries for restoring Decisioning display on return
---
The user explicitly approved restoring Loan Approved from the per-loan completed
decision action and View/Deliver access from the completed letter-generation
action on sidebar/route return and reload, using the existing checklist lifetime.
Missing, invalid or unreadable saved statuses do not establish completion.

**Why:** Persisted completion should not disagree with the returning summary.
Approval does not prove that credit was pulled.

**How to apply:** Keep credit local, introduce no new storage, and restore
silently without new activities, timestamps or toasts. Preserve Reset Demo,
the PDF target, styling and action ordering. The generation-status regression
when approving after generating remains a separately scoped change. This
behavior approval does not waive validation-baseline gates.

For isolated Decisioning restoration verification, the user separately accepted
the current local source as the before-change snapshot, retaining the previously
accepted dependency lock and leaving the historical audit manifest unchanged.

**Why:** The earlier page runner rejected unrelated local source changes before
executing any tests.

**How to apply:** Keep this exception scoped to Decisioning restoration fixtures;
it is not blanket approval of other changed source or a shared-baseline rewrite.
