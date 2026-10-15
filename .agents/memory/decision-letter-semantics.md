---
name: Decision letter semantics
description: User clarification of decision-letter validity and approval boundaries
---
The user rejected preserving completed letter-generation status when a decision is made after generation.

**Why:** The letter communicates the decision. The user explained that a letter generated before the decision would need to be generated again after the decision, and that generation before a decision does not make sense.

**How to apply:** Do not implement monotonic completion for this sequence. Treat preventing pre-decision generation or changing stale-letter viewing/delivery as separately scoped behavior changes requiring explicit approval; this clarification does not authorize button gating or a shared workflow rewrite.
