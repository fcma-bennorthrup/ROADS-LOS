---
name: Partial demo reset policy
description: Approved partial-failure and pending Reset Demo behavior
---
The user approved explicit partial results and manual retry for Reset Demo.
Wait for the result before clearing activity or announcing a full reset. Retain
successful storage changes on partial failure, reconcile affected document state,
and explicitly report an incomplete reset rather than promise multi-key rollback.
Preserve unrelated checklist and section state on failure. Prevent duplicate
pending resets and package timers from restoring progress cleared by that reset.

**Why:** Activity clearing immediately and package removal preceding a queued or
failed disclosure reset can leave mounted state inconsistent with storage.

**How to apply:** Keep normal successful and cancelled reset screens unchanged.
Disclosure-only reset and Closing/Booking remain outside this exception. This
approval does not change the provider-lifetime reset-consumption boundary or
authorize unrelated concurrency repairs or dependency-baseline changes.

For this reset change only, the user accepted the current local code as the
isolated comparison baseline, retaining the previously accepted dependency lock.

**Why:** Existing merged source changes cause the historical reset runner to
reject the workspace before testing this separate behavior exception.

**How to apply:** Pin the pre-edit local bytes in a reset-specific verification
setup; leave the historical manifest and shared gates unchanged. This is not
approval of later source drift or dependency changes.

The user further approved per-store outcomes for checklist/activity write
failures: successful clears remain, failed stores stay unchanged, and full
success requires every required clear. Leaving the loan provider cancels work
that has not yet committed; earlier successful clears remain.

**Why:** Checklist and activity are separate writes too, so promising to keep
both unchanged after either fails would imply rollback that cannot be guaranteed.

**How to apply:** Report what cleared and what did not under “Demo reset
incomplete,” with manual retry guidance. Do not turn this into a persistent
recovery journal or an automatic retry policy.
