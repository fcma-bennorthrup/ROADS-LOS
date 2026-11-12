---
name: Fee waiver behavior
description: Partial and whole fee waiver semantics requested for the prototype.
---
Waivers are dollar reductions applied to both LE and CD amounts, not merely a checkmark. Offer an amount field beside “Waive entire fee”; record the resulting amount changes in loan history.

**Why:** The user needs to demonstrate partial fee waivers with the actual reduced amounts visible in the table and change log.

**How to apply:** Preserve pre-waiver amounts so reopening and saving does not subtract twice, and clearing the waiver restores those amounts. Reject partial reductions that would make either amount negative; whole-fee waivers zero each amount independently.
