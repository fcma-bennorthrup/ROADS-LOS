---
name: Closing document scope
description: User-approved boundaries for the Closing Documents prototype.
---

The user chose interactive disclosure history rather than sample history. Clock/history-icon functionality remains deferred; the user subsequently requested borrower-specific editing.

**Why:** The user originally deferred both icons, then explicitly approved the edit panel and borrower-viewing breakdown, not clock/history functionality.

**How to apply:** Do not add clock/history dialogs as incidental polish. Closing Package should retain its existing functionality under its own tab.

The user wants Closing Disclosure delivery handled by the button above the table, not row-level delivery controls. Generate and Deliver remain protected. The user subsequently requested removing the toolbar View Closing Disclosure button because each row already provides viewing.

**Why:** The user originally protected all three buttons while requesting manual borrower tracking, then explicitly authorized removing only the redundant toolbar View button.

**How to apply:** Keep manual borrower delivery and viewing information separate from prototype toolbar delivery tracking. Do not infer borrower viewing from staff PDF previews or toolbar delivery.

The user requested removing the Date CD Viewed column from the Closing Disclosure table.

**Why:** The user explicitly requested a table-only removal.

**How to apply:** Remove that table column without deleting saved viewed dates or removing the date field from the borrower editor and breakdown.

Borrower tracking initially supports Blend, Mail, and Hand Delivery; CD Viewed distinguishes Yes, No, and blank. Blank means unrecorded, not No.

**Why:** The user wants a simple manually maintained first version, with more business rules layered on later.

**How to apply:** Do not add compliance/waiting-period rules, inferred dates, or mandatory date/status relationships without a new request. Bulk-copy only delivery details, never viewing confirmations.

Staff PDF previews must not be treated as borrower receipt or confirmation.

**Why:** No borrower-view source was supplied; treating a staff preview as borrower viewing would fabricate lending workflow data.

**How to apply:** Borrower viewing may be recorded manually as requested; never turn staff preview activity into borrower confirmation.