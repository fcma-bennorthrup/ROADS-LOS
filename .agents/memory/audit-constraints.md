---
name: Architecture audit constraints
description: User-mandated audit scope and approval boundary
---
The architecture audit uses the current local project as its source of truth, not GitHub or a commit diff. Review the entire application with parallel page reviewers and lead-architect consolidation.

Preserve every end-user visual and interaction detail exactly. Audit reports only; each recommended implementation change requires separate explicit user approval. Behavior-changing defect fixes are not implicitly authorized by an audit or refactor request.

**Why:** The user explicitly wants internal architectural improvements without any change to functionality, visualization, UI components or styling.

**How to apply:** Carry these constraints into audit assignments and any later approved remediation. Distinguish static findings from verified observations; do not silently substitute remote code for local baseline files.

Present recommendations directly in the conversation for individual approval; writing “Awaiting user approval” in a report is not sufficient.

**Why:** The user explicitly flagged that completed audit reports had not actually presented decisions to them.

**How to apply:** Explain each proposed scope, preservation implications and risks before requesting a decision. Report/task completion is not implementation approval.

The user deferred API error standardization and explicitly chose to leave current behavior unchanged.

**Why:** The proposed API-only JSON fallback and consistent error-parser messages were presented for individual approval and were not approved.

**How to apply:** Do not implement these error-status or message changes without renewed explicit approval. This deferral does not authorize a narrower parser rewrite.

The user deferred naming the borrower copy-email button and requested leaving it as it is.

**Why:** The user considers this a UX consideration rather than an architecture consideration.

**How to apply:** Do not add an accessible label, tooltip, or visible label to this button under architecture work without renewed explicit approval.

The user approved the current dependency lock for disposable validation only,
not as approval of production calendar behavior or permission to repair failures.

**Why:** Historical lock drift must not be silently treated as acceptance of a
library migration.

**How to apply:** Keep dependency reproduction separate from behavior sign-off;
ask for a new bounded decision before dependency, compiler, or source repairs.

For isolated browser verification, distinguish returned screenshot observation
references from exported image files. Do not claim a local PNG archive unless
the files actually exist.

**Why:** The supplied browser can return inspectable captures without exposing
their bytes for filesystem export; requesting a path does not establish that
an image was saved.

**How to apply:** Verify export capability before promising downloadable
captures. Preserve available references and measurements, and report missing
exports separately from browser behavior results.
