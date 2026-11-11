---
name: Loan demo data ownership
description: Loan-scoped persistent demo data and future pipeline expectations
---
Demo application data belongs to the loan, not the tester.

**Why:** The user explicitly rejected separate tester-owned demo loans in favor of loan-owned data.

**How to apply:** Key persisted application data, reset actions, and mock Blend imports by loan identity. Reset/import affects the selected loan for collaborators, not every loan. The later approved pipeline and Salesforce-baseline series supersede the initial single-loan scope.

Shared writes must reject older clients' saves, not just refresh the initiating browser.

**Why:** A collaborator can have an unsaved form open while another person replaces the application; accepting that older save would restore data the reset was intended to remove.

**How to apply:** Reset restores the Salesforce baseline and advances generation/revision atomically. Blend fills blanks without replacing the loan or advancing generation; it advances revision only when changed and preserves credit, workflow and history. Reject stale saves visibly and never revive browser-local data over newer shared state.

Blend imports must not populate liabilities; those come from the simulated credit pull. Borrower Financials tabs must switch both income and balance-sheet records.

**Why:** The user clarified that liabilities do not come from Blend and must belong to their respective borrowers, not appear together on every tab.

**How to apply:** Keep credit accounts borrower-owned and preserve other borrowers' records during balance-sheet edits. For compatibility, legacy unassigned balance-sheet rows display under the first borrower rather than being duplicated across tabs.
