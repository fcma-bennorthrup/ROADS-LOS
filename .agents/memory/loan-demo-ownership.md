---
name: Loan demo data ownership
description: Loan-scoped persistent demo data and future pipeline expectations
---
Demo application data belongs to the loan, not the tester. The prototype currently has one loan; the user intends to add multiple loans and a pipeline later.

**Why:** The user explicitly rejected separate tester-owned demo loans in favor of loan-owned data.

**How to apply:** Key persisted application data, reset actions, and mock Blend imports by loan identity. Reset/import affects the selected loan for collaborators, not every loan. Do not build the future pipeline as part of these initial demo controls.
