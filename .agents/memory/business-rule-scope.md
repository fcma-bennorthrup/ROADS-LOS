---
name: Prototype business rules
description: User-approved lightweight rule logic and TRID requirements
---
Keep prototype business rules centralized in code; do not build a business-rule engine.

Appraisal fee change explanations are documentary records, not automatic compliance decisions.

**Why:** The requested change-of-circumstance flow collects a reason and context; it does not authorize new tolerance-reset, timing, or TRID-trigger rules.

**How to apply:** Use Regulation Z's revision-reason categories without treating selection as proof of eligibility. Preserve existing TRID rules unless the user separately changes them.

PWE is the borrower with the highest saved income; Summary PWE CB Score uses that
borrower's hard-pull score. The income-page chip must move when saved incomes change.

**Why:** The user explicitly defined PWE selection and score ownership.

**How to apply:** Share income calculations between the rule, editor, and Summary;
keep scores attached to borrower IDs, not income rank. Demo scores are synthetic.
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

**How to apply:** Keep this chip decision in business rules. The simulated-data
series supersedes the old single-borrower replacement behavior: importing one
covers only the first borrower, never removes a second borrower, and retains
the joint chip when two named borrowers remain. Salesforce creation supports
one or two borrowers; Reset restores its saved baseline count.

The first and last tracker chevrons are temporary, visually unchanged demo
controls that move one stage backward or forward without persisting the stage.

**Why:** The user intends business rules to drive the loan stage eventually;
the current controls are only for demonstration.

**How to apply:** Do not save demo stage overrides to the loan or browser storage,
or let them complete checklist tasks.

Loan Decision starts from a saved successful credit pull, with no additional prerequisites.

**Why:** The user approved centralizing this existing trigger without changing behavior.

**How to apply:** Keep it in shared business rules and have the checklist consume it; do not add TRID or disclosure prerequisites or reopen completed decisions.

Demo decision controls offer only Force approval and Force denial.
The user removed Real EDE Simulation from scope; do not build its business rules.
Existing loans, including retired EDE selections, default to forced approval.

**Why:** The user decided real EDE rules would be too complicated for this prototype.

**How to apply:** Apply the selected mode when running the next decision, retain its
outcome for display, and clear the outcome (not the mode) with checklist reset.
