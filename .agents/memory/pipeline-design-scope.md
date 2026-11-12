---
name: Pipeline design scope
description: Approved Figma reference, preserved controls, and department queue behavior.
---

Use the ROADS-Pipeline All Loans Figma frame as the visual reference. Preserve +New Loan and prototype admin controls. Use the supplied Rural 1st icon and Feather navigation icons.

The search under Welcome back is intended as a future global search across active loans, not a table filter. Keep it hidden for now; use “Type to filter results” for the selected queue.

**Why:** The user deferred global search and the definition of active loans.

**How to apply:** Do not restore the welcome search as a table filter or invent active-loan eligibility rules.

**Why:** The user explicitly requested these design elements and preservation rules.

New SF Opportunities are approved to appear in both All Loans and Sales Support. Existing loans are not retroactively assigned to Sales Support. Operations now additionally includes loans when TRID is triggered, without removing their existing queue membership. Do not derive department assignments from loan stages.

**Why:** The user initially selected “Leave departments empty for now,” then explicitly requested Sales Support membership for newly created SF opportunities.

**How to apply:** Keep department counts honest and avoid copying sample loan values from the visual reference. The user authorizes synthetic values for new SF opportunities: unique six-digit CIF, region 500/502/504, random borrower name, Purchase, requested amount below $444,100, Customer Application stage, LO Sarah Williams/Rylee Alcorn/Connor Welch, creation date as App Start Date, and blank Decision. Preserve older loans' unavailable values.

Use the Eastern calendar day for the new opportunity's application date and preserve it as a date-only value.

**Why:** A creation instant near UTC midnight should not display a different application date from the prototype user's America/New_York day.

**How to apply:** Do not recompute the date on rendering or convert the saved day through a browser-local midnight timestamp.

Sales Support uses Figma frame 1320:51595 in the same ROADS-Pipeline file. Contract Exp Date should be a random date within 90 days of creation; Appraisal remains blank.

**Why:** The user requested these Sales Support-specific columns and explicitly clarified “Random date within 90 days,” rather than exactly 90 days later.

**How to apply:** Preserve a chosen date across refreshes and queue changes, and keep All Loans columns unchanged.

Operations uses Figma frame 1320:53127 in the same ROADS-Pipeline file. The user now authorizes loans to appear when TRID triggers, with the Operations user-plus icon in icon-brand.

**Why:** The user superseded the initial empty-queue restriction with TRID-based eligibility, while explicitly deferring claiming and missing column data.

**How to apply:** Preserve All Loans and Sales Support visibility. Do not implement claiming or fill missing column values as part of eligibility; use the existing icon-brand token for the Operations user-plus icon.

Operations TRID chips count calendar days from the trigger date (Day 0) and hide when TRID is satisfied. Show saved Closing Date in Operations.

**Why:** The user explicitly chose calendar days and hiding the chip on completion, and authorized the Closing Date column.

**How to apply:** This extends the previously deferred column scope only for TRID and Closing Date; claiming and other missing columns remain deferred.

The Pipeline sidebar should reveal an expand/collapse button on hover, display full page names and ROADS when expanded, and push content instead of overlaying it. Pipeline may use decorative blank rows to fill viewport space and keep the footer at the bottom.

**Why:** The user explicitly requested these layout and navigation behaviors.

**How to apply:** Do not auto-expand on hover; hover reveals the action. Keep filler separate from actual loan counts and saved data. The user wants the toggle on the sidebar edge at the viewport's vertical center, below the nav icons, not near the top.

Loan details must not retain a permanent sidebar: the breadcrumb hamburger opens an overlay, and X closes it.

**Why:** The user explicitly distinguished loan details from Pipeline and supplied the ROADS-Foundation overlay reference.

**How to apply:** Keep loan content full width; only Pipeline retains the content-pushing rail. Preserve unsaved-edit protection when navigating out of a loan.

Additive initialization of older opportunity metadata must participate in loan revision checks while preserving the original updated-at timestamp.

**Why:** Revision checks prevent a simultaneous full-document demo action from erasing newly initialized values; retaining updated-at avoids presenting a metadata backfill as recent user activity.

**How to apply:** Patch only missing fields against the current saved document and retry against the latest revision when another writer wins.
