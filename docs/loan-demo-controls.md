# Loan demo controls and persistence

Open the header's more-options menu → Prototype Admin Controls → Demo Controls.

- **Reset All Application Data** replaces the current loan's data with an empty application. The loan identity remains available for manual entry.
- **New Blend Import** replaces it with synthetic borrower, loan, property, income, asset, and liability data. It does not call Blend, order credit, approve the loan, or produce real documents.
- Both require confirmation and affect everyone viewing that loan, not other loans.

## Storage and scope

Loan application snapshots are stored in PostgreSQL in `prototype_loan_applications`, keyed by loan ID. Editable application sections use the existing Save/Discard interaction. Arrays such as fees and financial rows persist on their existing add/save/delete actions. Existing checklist, activity, disclosure, and package stores use the same loan snapshot through a compatibility adapter.

The first browser opening a previously uninitialized shared loan can bring forward its saved loan-scoped browser workflow data. Old browser storage is not merged back after an import, reset, or shared save. Previously unsaved component-only edits cannot be recovered after a reload.

This does not add editing controls to read-only questionnaire/display sections, implement missing “Coming Soon” pages, or create a production underwriting/calculation engine. Reset clears the displayed application amounts and outcomes; existing income calculations continue to run on financial saves. Use synthetic data only: this prototype has no new access-control system.

## Concurrency

Each write checks the loan's generation and revision in a single database update. Replacement increments both. Old clients cannot overwrite a replacement. A failed/stale save displays an error; no automatic destructive retry occurs. Other sessions refresh periodically. Unsaved form edits prevent automatic replacement and require an explicit reload of the latest loan.

## Verification

- Browser journey on an isolated verification loan: cancelled reset, confirmed reset, amount/name saves, reload, discarded edit, second-page shared data, mock import, and stale-save rejection passed.
- A workflow-default issue found during that journey was corrected. An endpoint check confirmed import clears prior completed checklist entries, resets the stage, rejects stale writes, requires confirmation, and clears borrower/financial data on reset.
- Seven new persistence tests passed; targeted existing tests also passed.
- Two Closing Documents timing tests failed identically on an isolated copy of the pre-change code. They were not changed as part of this request.
- The production build succeeded. The repository-wide TypeScript check still reports existing errors outside the changed application files.
- Verification used a separate loan, which was deleted afterward. The user's current loan was not reset or imported.

Development schema was created through the database tooling and declared in the shared schema. Publishing should apply the new table through Replit's normal schema review; no startup-time schema migration is installed.
