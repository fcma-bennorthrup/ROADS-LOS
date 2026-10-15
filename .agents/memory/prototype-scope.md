---
name: Prototype scope
description: User-confirmed non-production purpose and its effect on implementation choices
---
The user stated: “This won't ever be a production app.”

**Why:** When choosing how to finish isolated browser verification, the user
preferred the simpler approach rather than waiting for shared infrastructure.

**How to apply:** Keep solutions proportionate to a prototype. Do not add
production services or hardening without a specific request. This does not
waive explicit test requirements, permit real financial or GitHub operations,
or authorize changing existing behavior under a verification-only assignment.
