---
name: Package coordination policy
description: Approved Closing Package concurrency scope and fallback limits
---
The user approved authoritative package updates, notifications to mounted views, retaining an existing generation deadline over competing requests, and rejecting old timer completions after reset or replacement.

Without Web Locks, protect same-window consumers and use best-effort cross-tab updates. The user explicitly accepted that simultaneous writes in different tabs can still conflict, rather than blocking updates.

**Why:** This is a prototype; the user selected the bounded fallback after its cross-tab limitation was explained.

**How to apply:** Preserve the five-second delay, original due-time stamping, repeated delivery behavior, persistence lifetime, PDFs, labels and styling. Do not change disclosure schema or broaden this approval to disclosure concurrency. Shared Reset Demo coordination must have a settled interface before integrating package invalidation; do not independently rewrite its pending shared contract.
