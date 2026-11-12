---
name: Closing document scope
description: User-approved boundaries for the Closing Documents prototype.
---

## Simplified simulation scope

The user now requests disclosure-level tracking instead of the borrower editor: only Generate and Deliver toolbar actions; generation/delivery timestamps, Blend, assumed delivery plus three calendar days, Needed chip after delivery, blue clock after delivery, and a file icon. Remove the borrower side-panel action; viewing completion simulation and clock interaction remain deferred. Preserve saved historical data and Closing Package.

**Why:** The user explicitly simplified the simulation and approved a simulated document preview opening in a separate tab instead of restoring PDFs.

**How to apply:** This supersedes the older borrower-editor and toolbar protection requirements below for this page. Staff previews must still never count as borrower viewing. The approved preview is an exception to retired PDF controls being inert, not permission to restore retired PDF assets.

The user chose interactive disclosure history rather than sample history. Clock/history-icon functionality remains deferred; the user subsequently requested borrower-specific editing.

**Why:** The user originally deferred both icons, then explicitly approved the edit panel and borrower-viewing breakdown, not clock/history functionality.

**How to apply:** Do not add clock/history dialogs as incidental polish. Closing Package should retain its existing functionality under its own tab.

The user wants Closing Disclosure delivery handled by the button above the table, not row-level delivery controls. Generate remains protected. The user subsequently requested removing the toolbar View Closing Disclosure button and wiring Deliver to borrower delivery details.

**Why:** The user originally protected all three buttons, then explicitly authorized removing the redundant View button and populating borrower delivery metadata from Deliver.

**How to apply:** Keep manual borrower delivery and viewing information separate from prototype toolbar delivery tracking. Do not infer borrower viewing from staff PDF previews or toolbar delivery.

The system will not automatically deliver documents. Clicking Deliver Closing Disclosure is the user's manual indication of delivery; initially it must set Delivery Method to Blend and Delivery Date to the click date for all borrowers.

**Why:** The user explicitly stated this delivery scope.

**How to apply:** Populate the table and borrower side panel from the same saved delivery details. Do not send documents, change viewing confirmations, or infer other delivery methods from this button.

The user requested removing the Date CD Viewed column from the Closing Disclosure table.

**Why:** The user explicitly requested a table-only removal.

**How to apply:** Remove that table column without deleting saved viewed dates or removing the date field from the borrower editor and breakdown.

Borrower tracking initially supports Blend, Mail, and Hand Delivery; CD Viewed distinguishes Yes, No, and blank. Blank means unrecorded, not No.

**Why:** The user wants a simple manually maintained first version, with more business rules layered on later.

**How to apply:** Do not add compliance/waiting-period rules, inferred dates, or mandatory date/status relationships without a new request. Bulk-copy only delivery details, never viewing confirmations.

Staff PDF previews must not be treated as borrower receipt or confirmation.

**Why:** No borrower-view source was supplied; treating a staff preview as borrower viewing would fabricate lending workflow data.

**How to apply:** Borrower viewing may be recorded manually as requested; never turn staff preview activity into borrower confirmation.

Treat all current prototype loans as non-ROR. One borrower explicitly recorded as CD Viewed = Yes satisfies the Closing Disclosure viewing requirement; each borrower's own Yes, No, or blank value remains independent.

**Why:** The user confirmed both the one-borrower completion rule in the linked Figma panel and the non-ROR assumption for all current prototype loans.

**How to apply:** Keep panel copy and table-level completion consistent with this prototype rule. Do not infer ROR from loan type, alter other borrowers' viewing records, require a viewed date for Yes, or treat this as a production compliance determination.

Assumed Delivery Date should populate when a disclosure is delivered and equal Delivery Date plus three calendar days: 10/14/2026 becomes 10/17/2026.

**Why:** The user specified this rule and example; the example includes Saturday, not a business-day calculation.

**How to apply:** Use calendar-date arithmetic. Do not introduce business-day, weekend, or holiday exclusions without a new instruction.