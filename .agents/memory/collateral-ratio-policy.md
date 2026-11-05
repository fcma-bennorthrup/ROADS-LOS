---
name: Collateral ratio calculation
description: User-selected L/CV numerator and collateral value precedence
---
Use Total Loan Amount, not Amount Requested, as the L/CV numerator.
Use Estimated Value initially and switch to Reported Value Total once reported.

Rule of XX is L/CV in percentage points plus amortization years: 80% + 30 years = 110.

**Why:** The user explicitly defined this formula; it is not a percentage result.

**How to apply:** Convert saved term months to years. Do not substitute an ARM initial fixed-rate period for its amortization term.

**Why:** The user explicitly corrected the numerator and specified the estimate-to-report transition.

**How to apply:** Summary Total CV and L/CV must use the same saved valuation. Do not retain sample ratios when underlying values are missing.

Saved pricing is sufficient for PITI and DTI; a rate lock is not required.

**Why:** The user explicitly rejected a lock prerequisite for summary calculations.

**How to apply:** Use saved unlocked selections with the same pricing catalog as the editor, while retaining confirmed terms for locked loans. Never calculate from unsaved edits.

The user authorized Monthly Property Taxes and Monthly Insurance inputs on Collateral, saved once on Subject Property rather than per evaluation. Blank or invalid costs remain unavailable; only an explicit zero establishes no cost. Use these same monthly amounts in Summary housing payments and the PITI breakdown, preserving PITI as housing costs divided by gross monthly income.
