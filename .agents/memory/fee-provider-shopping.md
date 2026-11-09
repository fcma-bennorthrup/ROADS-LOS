---
name: Fee provider shopping eligibility
description: User-approved exception to the Figma fee-type eligibility annotation
---
Allow “Shopped for Provider” for all fee types for now.

**Why:** The Figma fee editor annotates the checkbox as available only for
shoppable types, but the user explicitly chose “All fee types for now” when asked.
Do not infer a mortgage-provider eligibility list from the frame or domain knowledge.

**How to apply:** Keep the checkbox enabled across fee selections until the user
supplies a narrower rule. This applies to the shared fee editor for all loans.
