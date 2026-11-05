---
name: Prototype business rules
description: User-approved lightweight rule logic and TRID requirements
---
Keep prototype business rules centralized in code; do not build a business-rule engine.
The real application uses a third-party rule engine.

**Why:** The user wants a maintainable place to add loan logic without reproducing that service.

**How to apply:** Use existing saved fields only; do not create missing form fields to implement rules.
TRID requires SSN, name, purchase address, loan amount, income information and estimated
property value (purchase price may stand in if such a field exists). Delivering a Loan
Estimate satisfies TRID; generating one does not. Do not present prototype logic as
regulatory compliance or invent a business-day deadline policy.

The user explicitly scoped TRID day tracking out of this prototype and approved
the fixed chip label “TRID day 0”.

After TRID satisfaction, demo controls offer separate input reset and manual trigger actions.
Reset clears the six TRID application inputs; manual trigger preserves them and reopens the estimate cycle.

**Why:** The user explicitly chose clearing application inputs rather than only estimate progress.

**How to apply:** Keep unrelated tasks intact and require a new Loan Estimate generation/delivery after a manual trigger.

**Why:** This prototype will not explore TRID day calculations.

**How to apply:** Keep the label fixed; retain the existing trigger/delivery behavior.

TRID also triggers again when a rate lock is updated. The Loan Estimate checklist
must consume both TRID triggers, rather than starting from decision-letter delivery.

**Why:** The user explicitly resolved the conflict between the checklist sequence
and the business rules on 2026-11-05.

**How to apply:** Start the estimate task from the six saved inputs, reopen it for
a confirmed rate-lock update, and require generation and delivery of the new
estimate to satisfy the reopened cycle.

ECOA starts when Blend imports a complete application in this prototype.
Show the fixed label “30 ECOA days remaining” until a credit decision is rendered,
the decision letter is generated, and that letter is delivered.

**Why:** The user chose Blend import as the prototype completeness signal and
explicitly requested a hard-coded clock.

**How to apply:** Require all three saved actions to hide ECOA. Do not add an
elapsed-day calculation or a separate application-completeness workflow.

Blend demo imports must offer one or two borrowers. Show the joint-credit
application chip for the two-borrower application and omit it for one borrower.

**Why:** The user needs both application scenarios for demos.

**How to apply:** Keep this chip decision in business rules and ensure a
single-borrower import does not retain the prior secondary borrower's data.

The first and last tracker chevrons are temporary, visually unchanged demo
controls that move one stage backward or forward without persisting the stage.

**Why:** The user intends business rules to drive the loan stage eventually;
the current controls are only for demonstration.

**How to apply:** Do not save demo stage overrides to the loan or browser storage,
or let them complete checklist tasks.
