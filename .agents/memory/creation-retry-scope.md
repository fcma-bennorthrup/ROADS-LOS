---
name: Creation retry scope
description: Why creation retry receipts live in existing loan documents.
---

Keep creation retry protection proportional to the prototype: retain receipts in existing loan documents rather than introducing a separate request ledger or broad migration.

**Why:** Creation recovery must preserve generated identities without a separate ledger or broad migrations.

**How to apply:** Preserve the creation receipt across Reset and fill-only Blend imports. Creation accepts Salesforce only, with one or two borrowers; a retry must keep its original borrower count. Independently, a complete repeated Blend import is now a no-op under the simulated-loan-event rules. Do not infer browser-reload recovery beyond the existing receipt flow.
