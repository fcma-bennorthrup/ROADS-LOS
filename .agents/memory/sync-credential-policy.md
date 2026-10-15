---
name: Sync credential policy approval
description: Approved exception and limits for filename-based credential/runtime sync exclusion
---
The owner explicitly approved a bounded filename-based exclusion policy for custom sync, including environment templates, and blocking old pending plans that reference excluded paths. Do not silently add a template allowlist or scan file contents.

**Why:** This is an individually approved exception to the no-behavior-change rule, not approval of broader sync eligibility, authorization, checkpoint, recovery, credential rotation or incident-response work.

**How to apply:** Preserve files already present locally or remotely rather than removing previously synced excluded files. Use synthetic files and blocked transports for validation; any broader security or sync policy needs its own approval.
