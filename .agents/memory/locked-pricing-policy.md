---
name: Locked pricing persistence policy
description: Explicitly approved retention and recovery rules for prototype rate locks
---
The user approved retaining confirmed pricing per loan in browser storage across navigation and reloads, until Reset Demo or browser-storage clearing. Capture the exact product, term (including blanks), rates and expiration on Lock Rate or Update Rate Lock, including an unsaved product edit. Store no borrower details and make no external service calls.

For a legacy lock with missing or corrupt terms, preserve checklist history, never represent defaults as historical locked terms, prevent updating the unknown lock, and show “Locked pricing terms unavailable. Reset Demo to start again.”

On a failed save, preserve the prior lock and show “Rate lock could not be saved. Enable browser storage and try again.” Do not complete the action, append activity or re-fire Loan Estimate.

Preserve unrelated styling, calculations, PDF behavior and date-dialog cancellation.

**Why:** The user explicitly approved this bounded behavior exception on 2026-10-15; a saved lock flag must not falsely identify remounted defaults as locked terms.

**How to apply:** Coordinate with the separate reset-consumption and partial-reset work before editing shared pricing/checklist sources. Approval does not authorize those neighboring changes or a competing reset implementation.

Pricing retention participates in the existing checklist reset outcome rather than a separate storage-clear step.

**Why:** The approved partial-reset policy keeps earlier successful clears when a later store fails. A separate pricing key would introduce another partial-failure case and could leave lock status describing missing terms.

**How to apply:** Preserve status/terms as one persisted unit. A failed checklist reset retains both; a successful checklist reset clears both even when the later activity reset fails. Do not imply cross-store transactionality.
