---
name: Checklist-only demo reset
description: Reset task outputs without resetting the loan application
---
The prototype controls own the checklist-data reset; the checklist no longer
offers a Reset Demo button. Resetting must remove task results, not merely mark
checklist icons incomplete. In particular, an estimate should behave as though
it was never generated.

**Why:** The user requested a separate demo scenario reset on 2026-11-05,
distinct from wiping the entire application.

**How to apply:** Preserve borrower/application inputs and their change log;
clear workflow completion, generated-document progress/history, rate locks,
credit-pull output, booking progress and task activity. Preserve the estimated
property value used as an application input, not appraisal-result fields.
Existing business rules can restart required tasks after reset; do not suppress
TRID merely to make every checklist icon remain empty.
