---
name: Pipeline architecture scope
description: Approved multi-loan scope and verification baseline exception
---
The user approved architecture prompts 0–4, including persisted stages, but excluded optional prompt 5 (loan deletion). No board view, team assignment, new tables, schema push, token edits, or GitHub sync is authorized.

**Why:** The uploaded architecture extends the prototype above its existing loan workspace, not a rewrite of the loan pages. Persisted stages intentionally replace the earlier temporary demo-stage behavior.

**How to apply:** Preserve existing loan visuals and recent rules such as liability-free Blend imports. Treat the architectural document as design context and the current code as implementation truth.

The user approved proceeding with pre-existing static-check and full-suite failures as a baseline rather than fixing unrelated issues first.

**Why:** Initial verification collected dependency-cache tests and outdated project fixtures as well as actual application checks. A fully green baseline would expand scope beyond the pipeline.

**How to apply:** Verify changed flows and report inherited failures separately; do not describe baseline exceptions as a clean full suite.
