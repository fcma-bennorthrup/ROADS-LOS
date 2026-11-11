---
name: Loan withdrawal scope
description: Approved Pipeline visibility and preservation behavior for withdrawals
---
Withdrawn loans stay visible in Pipeline as “Withdrawn”; do not hide or delete them.

**Why:** The user explicitly chose “Keep visible as Withdrawn” instead of hiding loans from queues.

**How to apply:** Retain loan data and existing queue assignments when withdrawing. Withdrawal records the borrower-request acknowledgment; it does not authorize changes to disclosure or other business rules.
