---
name: Closing document scope
description: User-approved boundaries for the Closing Documents prototype.
---

The user chose interactive disclosure history rather than sample history, and said: “We don't need to do anything with the clock/edit icons at this time.”

**Why:** The user explicitly deferred those row actions while requesting the tabbed layout and interactive history.

**How to apply:** Do not add clock/history dialogs or metadata editors as incidental polish. Ask for new scope before implementing those actions. Closing Package should retain its existing functionality under its own tab.

The user wants Closing Disclosure delivery handled by the button above the table, not row-level delivery controls. Leave the action icons in place for functionality to be added later.

**Why:** The user explicitly requested toolbar-only delivery and deferred new icon functionality.

**How to apply:** Do not reintroduce row Deliver/Delivered buttons or add new icon actions without a new request. Preserve existing PDF-preview behavior.

Staff PDF previews must not be treated as borrower receipt or confirmation.

**Why:** No borrower-view source was supplied; treating a staff preview as borrower viewing would fabricate lending workflow data.

**How to apply:** Keep unavailable borrower-view fields blank until a real or explicitly approved simulated borrower-view source is requested.