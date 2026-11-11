---
name: Origination fee automation scope
description: Automatic origination fee calculation and manual override boundaries.
---
Seed the origination fee from the saved requested loan amount before financed fees: 1%, capped at $1,000 for both LE and CD.

**Why:** The user requested automatic addition while retaining editing and waiver controls. Using the pre-fee amount avoids a circular calculation.

**How to apply:** Initial creation is automatic, not continuous repricing. Preserve existing origination fees and later manual edits, waivers, and deletions. Do not silently start recalculating them when loan amounts change without confirming that policy.
