---
name: Verification baseline scope
description: Approved documentation drift versus production verification authority
---
The user accepted current setup-documentation changes for isolated Origination
verification, while retaining the already accepted dependency snapshot.

**Why:** Documentation-only maintenance can make the historical manifest's
strict runner stop even when application bytes have not changed.

**How to apply:** Preserve the immutable audit manifest and shared runner.
Scope any explicit documentation-hash exceptions to the page verification
runner; do not generalize them into approval of later source or dependency
drift. Native controls in jsdom are not browser visual certification.

The user separately accepted the existing approved metadata-only server logging
change as a baseline exception solely for isolated reset-consumption checks.

**Why:** The Origination runner otherwise rejects an unrelated approved server
change before testing the client-only reset exception.

**How to apply:** Keep the exception in the reset-specific runner, leave the
server file untouched, and never run it in the reset fixtures. This is not
blanket acceptance of further production drift or a shared-baseline rewrite.
