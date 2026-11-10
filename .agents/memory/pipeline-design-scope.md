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
