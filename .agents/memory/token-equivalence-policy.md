---
name: Token equivalence approval boundary
description: Approved read-only token map does not authorize semantic normalization or repairs
---
The user approved the bounded authored-value map and exemptions documented in
docs/architecture-audit/token-equivalence-specification.md for read-only
verification. Approval preserves incomplete catalogs, independent semantic HSL
and dark-mode values, and showcase captions; it is not styling-change approval.

**Why:** Equal-looking names and nearby color values do not prove identical
design intent. The user requires explicit per-change approval and no hidden
normalization.

**How to apply:** Consult the approved map before adding parity assertions.
Request a new decision for mapping expansion, generated tokens, caption
corrections or repairs. Do not treat source/hash checks as browser equivalence.

The user explicitly authorized verification of the newly merged local source
instead of accepting only the older measured snapshot.

**Why:** Other approved work changed the source after the initial measurements;
historical preservation evidence cannot certify the newer tree.

**How to apply:** Keep the newer source baseline separate from historical
evidence. Preserve dependency/token expectations and strict comparison policy;
source-baseline approval is not approval to waive pixel failures or fix styles.
