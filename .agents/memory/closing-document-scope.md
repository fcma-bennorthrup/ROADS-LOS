---
name: Closing document scope
description: User-approved boundaries for the Closing Documents prototype.
---

The user chose interactive disclosure history rather than sample history. Clock/history-icon functionality remains deferred; the user subsequently requested borrower-specific editing.

**Why:** The user originally deferred both icons, then explicitly approved the edit panel and borrower-viewing breakdown, not clock/history functionality.

**How to apply:** Do not add clock/history dialogs as incidental polish. Closing Package should retain its existing functionality under its own tab.

The user wants Closing Disclosure delivery handled by the button above the table, not row-level delivery controls. The Generate, View, and Deliver toolbar buttons and their functionality must remain untouched.

**Why:** The user explicitly protected those buttons while requesting manual borrower tracking.

**How to apply:** Keep manual borrower delivery and viewing information separate from prototype toolbar delivery tracking. Do not infer borrower viewing from staff PDF previews or toolbar delivery.

Borrower tracking initially supports Blend, Mail, and Hand Delivery; CD Viewed distinguishes Yes, No, and blank. Blank means unrecorded, not No.

**Why:** The user wants a simple manually maintained first version, with more business rules layered on later.

**How to apply:** Do not add compliance/waiting-period rules, inferred dates, or mandatory date/status relationships without a new request. Bulk-copy only delivery details, never viewing confirmations.

Staff PDF previews must not be treated as borrower receipt or confirmation.

**Why:** No borrower-view source was supplied; treating a staff preview as borrower viewing would fabricate lending workflow data.

**How to apply:** Borrower viewing may be recorded manually as requested; never turn staff preview activity into borrower confirmation.