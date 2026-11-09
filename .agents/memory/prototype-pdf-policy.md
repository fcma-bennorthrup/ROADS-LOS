---
name: Prototype PDF retirement
description: Remove demo PDF assets without changing loan UI or business rules
---
The user no longer needs the actual prototype PDF files. Keep existing document controls, layout, generation/delivery simulations, checklist behavior, and business rules unchanged; PDF-opening controls remain visible but no longer open a file.

**Why:** Required PDF imports repeatedly caused problems after GitHub pulls. The user explicitly requested eliminating the actual files, not removing the UI or loan workflows.

**How to apply:** Do not restore retired demo PDFs or missing-file imports. Exclude the specific retired assets from custom sync so subsequent pulls cannot reintroduce them. Preserve unrelated architecture/reference PDFs and release-note deliverables. This does not authorize remote GitHub deletion or changes to the general binary-sync policy.
