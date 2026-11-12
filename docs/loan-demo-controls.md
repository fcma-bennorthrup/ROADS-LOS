# Loan demo controls and persistence

Create a loan through Pipeline → New loan, selecting one or two borrowers.
Creation is Salesforce-only and stores an independent baseline. Pipeline's
Prototype Admin Controls remains an empty shell. Inside a loan it shows demo controls.

- **Reset All Application Data**, on the Salesforce opportunity card, restores
  original borrower identity, CIF, loan amount and opportunity details. It clears
  later application data, credit/task outputs and history, and initializes the
  origination fee and fresh TRID/ECOA results.
- A legacy loan without a baseline captures one on its first Reset. Known
  Salesforce-level values are kept and missing ones generated in the same save.
  This does not happen when merely loading or listing loans.
- **New Blend Import** generates synthetic application data on the server and
  fills blanks only, using the borrower count chosen at Salesforce opportunity
  creation. No borrower-count control is shown in the loan. No borrower, existing value, liability or workflow result
  is removed. Liability rows come only from credit pulls.
- The server reads the creation baseline; legacy loans without creation metadata
  use their existing count. Unsaved edits block import.
  If nothing can be filled, the panel stays open with “Nothing to fill” and no
  revision is saved. Reset permits importing a different application.
- **Trigger TRID** uses the same fixed templates as before, now constructed on
  the server. Its rule and fill behavior are unchanged.
- Credit pull and narrow checklist/TRID controls retain their existing scope.

## Storage and concurrency

Each loan remains one document in `prototype_loan_applications`. The optional
`meta.baseline` needs no migration or version change. Metadata, change history,
checklist and credit state survive Blend imports. Only Reset starts a fresh
overall TRID/ECOA lifecycle; importing again preserves prior rule results.

All writes check generation/revision. Reset increments both; Blend increments
only revision when data changed. Legacy baseline capture and reset commit
together, using creation's CIF allocation lock when needed. Stale saves fail
visibly. All controls affect the selected loan for all viewers, never other loans.

Generators are pure functions with injected randomness in `shared/loan-events/`.
The browser sends only action/options. No live Blend, Salesforce, credit bureau
or production compliance system is contacted.
