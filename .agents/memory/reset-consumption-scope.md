---
name: Reset consumption scope
description: Approved lifetime and exclusions for historical reset consumption
---
The user explicitly approved consuming each reset once per Origination section
within the current loan's mounted provider lifetime, including sections first
visited after reset. Newer saved addresses and rate-lock status must not be
cleared by historical reset replay on section navigation.

**Why:** The user chose the narrow fix, preserving existing reload and loan-switch
behavior rather than introducing persistent reset tracking.

**How to apply:** Keep consumption in memory and loan-scoped. Reloads and loan
provider replacement discard pending reset notifications. Do not bundle pricing
term persistence, reset partial-failure policy, disclosure-only behavior changes,
or visual changes. In particular, an absent Collateral section followed by reload
may retain its old stored address under the approved lifetime.
