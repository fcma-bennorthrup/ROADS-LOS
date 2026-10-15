---
name: Disclosure browser support
description: Approved unsupported-browser policy for closing disclosure mutations
---
Require Web Locks for closing disclosure writes. When unavailable, reject
generation, delivery, borrower saves and disclosure resets with a clear
unsupported-browser error; keep saved disclosure data unchanged and readable.

**Why:** The user explicitly selected this narrower prototype policy instead
of designing a writable transactional alternative or retaining unsafe
cross-window fallback writes.

**How to apply:** Preserve the Web Locks path, PDF behavior and unrelated
document features. This approval does not authorize a storage migration,
package concurrency changes, or changes to the existing partial Reset Demo
policy. It does not waive the separate verification-baseline approval gate.

For this disclosure change, the user accepted the current local code as the
comparison baseline while retaining the accepted dependency snapshot and
existing partial-reset policy.

**Why:** Previously merged reset changes differ from the original audit
manifest; reverting them or treating the old baseline as current is unsafe.

**How to apply:** Pin the pre-edit local bytes in disposable verification.
Keep this acceptance local to the disclosure policy; do not relax shared
verification gates or accept future drift automatically.
