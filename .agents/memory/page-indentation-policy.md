---
name: Page indentation hierarchy
description: User-defined offsets for headers, subheaders, and fields relative to the side navigation.
---
Page headers belong 24px from the side navigation, subheaders 32px, and fields 40px. These are total offsets, not additional padding at each nesting level.

**Why:** The user specified that this staggered alignment expresses the app's information architecture. Matching an existing page is insufficient when that page also violates the rule.

**How to apply:** Audit effective parent and child padding together on side-navigation pages. Use the existing 24/32/40px spacing tokens. Do not blindly alter table-cell, card-interior, modal, or global navigation spacing. The requested 40px gaps between collateral fields are separate from these offsets.
