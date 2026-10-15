---
name: Rate-lock date cancellation
description: Approved boundary for discarding unconfirmed expiration edits
---
The user approved discard-on-close for the rate-lock dialog: Cancel, X, or Escape/outside dismissal that closes the whole dialog restores the last confirmed date. Closing only the calendar retains the draft.

**Why:** The user explicitly selected “Approve discard-on-close” after the existing retain-on-close behavior and proposed difference were explained.

**How to apply:** Keep confirmation, date validation, initial disabled date, styling and reset behavior unchanged. This approval does not authorize pricing persistence, calendar keyboard changes or dependency changes.

The user accepted the current local code, including existing reset-consumption and logging changes, as the baseline for isolated date-cancellation verification with the previously accepted dependency lock.

**Why:** The older Origination baseline predates those changes; its exceptions were not automatically transferable.

**How to apply:** Keep this acceptance scoped to date-cancellation verification, using disposable storage and blocked external transports, not as general approval of unrelated future drift.
