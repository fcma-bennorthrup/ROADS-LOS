---
name: Pipeline design scope
description: Approved Figma reference, preserved controls, and department queue behavior.
---

Use the ROADS-Pipeline All Loans Figma frame as the visual reference. Preserve +New Loan and prototype admin controls. Use the supplied Rural 1st icon and Feather navigation icons.

**Why:** The user explicitly requested these design elements and preservation rules.

New SF Opportunities are now approved to appear in both All Loans and Sales Support. Existing loans are not retroactively assigned; Operations, Credit, and Quality Control remain empty. Do not derive department assignments from loan stages.

**Why:** The user initially selected “Leave departments empty for now,” then explicitly requested Sales Support membership for newly created SF opportunities.

**How to apply:** Keep department counts honest and avoid copying sample loan values from the visual reference. The user authorizes synthetic values for new SF opportunities: unique six-digit CIF, region 500/502/504, random borrower name, Purchase, requested amount below $444,100, Customer Application stage, LO Sarah Williams/Rylee Alcorn/Connor Welch, creation date as App Start Date, and blank Decision. Preserve older loans' unavailable values.

Use the Eastern calendar day for the new opportunity's application date and preserve it as a date-only value.

**Why:** A creation instant near UTC midnight should not display a different application date from the prototype user's America/New_York day.

**How to apply:** Do not recompute the date on rendering or convert the saved day through a browser-local midnight timestamp.

Sales Support uses Figma frame 1320:51595 in the same ROADS-Pipeline file. Contract Exp Date should be a random date within 90 days of creation; Appraisal remains blank.

**Why:** The user requested these Sales Support-specific columns and explicitly clarified “Random date within 90 days,” rather than exactly 90 days later.

**How to apply:** Preserve a chosen date across refreshes and queue changes, and keep All Loans columns unchanged.

Operations uses Figma frame 1320:53127 in the same ROADS-Pipeline file, but must not show any loans yet.

**Why:** The user explicitly requested matching Operations columns while keeping the queue empty.

**How to apply:** Treat its Figma rows, dates, badges, and counts as reference-only; column styling does not authorize assignments or new business rules.

The main sidebar should reveal an expand/collapse button on hover, display full page names and ROADS when expanded, and push content instead of overlaying it. Pipeline may use decorative blank rows to fill viewport space and keep the footer at the bottom.

**Why:** The user explicitly requested these layout and navigation behaviors.

**How to apply:** Do not auto-expand on hover; hover reveals the action. Keep filler separate from actual loan counts and saved data. The user wants the toggle on the sidebar edge at the viewport's vertical center, below the nav icons, not near the top.

Additive initialization of older opportunity metadata must participate in loan revision checks while preserving the original updated-at timestamp.

**Why:** Revision checks prevent a simultaneous full-document demo action from erasing newly initialized values; retaining updated-at avoids presenting a metadata backfill as recent user activity.

**How to apply:** Patch only missing fields against the current saved document and retry against the latest revision when another writer wins.
