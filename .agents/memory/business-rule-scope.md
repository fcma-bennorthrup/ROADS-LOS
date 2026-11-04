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
