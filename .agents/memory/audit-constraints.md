---
name: Architecture audit constraints
description: User-mandated audit scope and approval boundary
---
The architecture audit uses the current local project as its source of truth, not GitHub or a commit diff. Review the entire application with parallel page reviewers and lead-architect consolidation.

Preserve every end-user visual and interaction detail exactly. Audit reports only; each recommended implementation change requires separate explicit user approval. Behavior-changing defect fixes are not implicitly authorized by an audit or refactor request.

**Why:** The user explicitly wants internal architectural improvements without any change to functionality, visualization, UI components or styling.

**How to apply:** Carry these constraints into audit assignments and any later approved remediation. Distinguish static findings from verified observations; do not silently substitute remote code for local baseline files.
