---
name: Demo borrower history
description: Safe handling of tracking saved before demo borrower identities became stable.
---

Old demo borrower tracking must remain under its original IDs; do not infer an association from display names or silently remove unmatched history.

**Why:** Earlier demo server lifetimes issued random IDs, and saved tracking contains no trustworthy mapping back to the current borrowers. A name-based migration could attach delivery or viewing history to the wrong person.

**How to apply:** Keep unmatched metadata intact during edits and delivery. Reconnecting old entries would need an explicit, verified mapping, not an automatic migration. Stable seed identities prevent future detachments but cannot recover earlier associations.
