---
name: Creation retry scope
description: Why creation retry receipts live in existing loan documents.
---

Keep creation retry protection proportional to the prototype: retain receipts in existing loan documents rather than introducing a separate request ledger or broad migration.

**Why:** The requested scope explicitly preserves existing data, generated values, and Blend behavior without broad migrations.

**How to apply:** Preserve the original creation receipt when replacing or resetting a demo loan. Creation recovery does not imply that subsequent Blend imports are idempotent or that an attempt survives a browser reload.
