---
name: History loan scope
description: User-stated loan isolation requirement for History
---
The user stated: “The history tab should only ever display information about the loan we're in”.

**Why:** Loan isolation applies to displayed information, not only link destinations.

**How to apply:** Keep History content and navigation scoped to the current loan. Do not interpret this as approval to invent a real audit trail or choose its persistence.

The user chose to remove the sample entries and show an empty log until loan-specific history exists. They also requested: “Keep the table height filling the content area in the viewport”.

**Why:** Reusing sample entries across loans contradicts the loan-isolation requirement; an empty log must retain the requested full-height table layout.

**How to apply:** Do not retain sample history. Preserve the table shell and fill the available viewport content area when empty.

The user now approved a working loan change log: do not record initial values; record later changes, and clear it with the prototype reset.

**Why:** Demo history should reflect edits to the current application, not seed data or previous demo runs.

**How to apply:** Log committed edits, not drafts or initial population. Keep history loan-owned and clear it atomically with Reset to the Salesforce baseline. Fill-only Blend imports retain existing history.
