---
name: Simulated loan event series
description: Approved scope and constraints for staged Salesforce baseline and fill-only Blend work.
---

The 2026-11-11 simulated-data prompts supersede earlier decisions about creation, Blend replacement, single-borrower import and Reset-to-empty. Implement only the supplied phase, not later phases from the background document.

**Why:** The user explicitly approved a staged transition, with no visible change in the preparation phase.

**How to apply:** Preserve every page's styling and behavior unless the current prompt expressly changes it. Never edit design tokens. Keep one document per loan, no new tables, db:push, upgrade files or version bump; the sole stored-model addition in this series is optional meta.baseline. Preserve legacy mode/source enums. Run db:check before and after each phase and record check/full-suite baseline failures without fixing unrelated issues. Verify only with newly created test loans, list them, and never Reset or Blend-import an existing loan. Do not push or pull GitHub.

The target is Salesforce-only creation, a captured opportunity baseline, Reset back to that baseline, and Blend that only fills blanks, never removes a second borrower or restarts TRID/ECOA. Older loans may acquire opportunity details on Reset. These changes are authorized only when their corresponding phase is requested.

**Why:** Existing replacement-based imports overwrite saved loan information; the new design preserves it.

**How to apply:** Generate simulated data server-side through pure shared event functions with injected randomness. Browsers send actions/options, not loan data. Use fictional people/employers/banks, example.com emails, 555-01xx phones and 000-prefixed SSNs. Keep existing mode semantics: existing is reserved for seed loan 1, MemStorage contains only that seed, and ECOA, checklist defaults and applicationStore.read stay unchanged. The supplied UX is decided; clarify only uncovered decisions.
