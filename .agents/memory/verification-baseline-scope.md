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
The user also accepted the then-current server entrypoint difference solely
for isolated borrower-extraction verification.

**Why:** The merged API logging work differs from the historical manifest but
is outside the borrower fixture's import graph. The exception permits this
comparison, not further server edits or general acceptance of source drift.

**How to apply:** Keep this exception local to the borrower comparison and
retain the previously accepted dependency snapshot and all other gates.

The user accepted blocked-font browser equivalence and visual screenshot
inspection without exact screenshot pixel-byte comparison for the borrower
presentation extraction.

**Why:** Isolated DOM/style/geometry and interaction checks passed, but external
font loads were blocked and screenshot bytes were unavailable.

**How to apply:** Preserve those explicit evidence limitations in the borrower
report. Do not generalize this acceptance to future refactors or claim
font-loaded or pixel-byte equivalence.

For balance-menu extraction only, the user accepted the six identified current
production-source differences as the comparison baseline, with the existing
accepted dependency snapshot retained.

**Why:** The historical Decisioning verification gate rejects unrelated merged
source work before it can compare the unchanged menu against its extraction.

**How to apply:** Keep these exceptions local to the balance-menu comparison;
this does not authorize relaxing the shared gate or accepting future drift.

The user also accepted the balance-menu comparison with blocked external fonts
and scripted interactions, while font-loaded rendering and full pointer/keyboard
traversal remained unverified.

**Why:** Exact screenshot, DOM, computed-style, geometry and captured-focus
equivalence supported completion of the bounded internal extraction.

**How to apply:** Retain those limits in its evidence; do not generalize this
acceptance to other refactors or describe untested browser behavior as passed.

For exact browser style comparisons, compare computed properties by sorted
property name and wait for existing animations to finish before geometry capture.

**Why:** Chromium custom-property enumeration order differed across fresh
processes, and sampling an active overlay animation produced fractional geometry
differences even when screenshot bytes matched.

**How to apply:** Stabilize observation timing and property ordering without
discarding values, rounding geometry or modifying application CSS.

The user accepted current local source as the before-refactor reference solely
for sharing identical loan-page types and currency formatting, retaining the
accepted dependency lock and reporting existing static-check failures separately.

**Why:** Previously merged component/provider changes no longer match the
historical audit manifest; older exceptions did not authorize this comparison.

**How to apply:** Keep this baseline acceptance local to that extraction's
verification. It does not authorize repairs or waive visual proof requirements.

For that loan-display extraction, the user subsequently accepted blocked-font
verification and the observed Decisioning and Closing & Booking checklist
focus-outline pixel differences at the tablet viewport; other comparisons stay strict.

**Why:** DOM, styles and geometry agreed, but exact screenshot pixels did not.

**How to apply:** Keep the exceptions confined to the two documented capture pairs.
Do not treat it as a general pixel tolerance or font-loaded certification.
