---
name: API logging policy
description: User-approved metadata-only request logging boundary
---

API request logs retain the existing timestamp, method, path, status and
duration format only; response bodies and optional aggregate counts are not
required. Leave retention settings unchanged.

**Why:** The user explicitly selected metadata-only logging and confirmed
through that option that support tools do not require response-body fields.

**How to apply:** Do not reintroduce response capture for diagnostics or add
counts without a new policy decision. Broader error-log redaction and retention
changes require separate scope; this approval does not cover them.
