---
name: Isolated browser layout checks
description: Why layout checks use a fixture server instead of the legacy app preview.
---

Use a standalone fixture server rendering real components and styles for layout
checks in the legacy app; intercept all API traffic with synthetic fixtures.

**Why:** The legacy workflow has no registered artifact for screenshot capture,
and layout verification must not create or edit saved loans. JSDOM cannot measure
real header clipping or horizontal scrolling.

**How to apply:** Keep fixture infrastructure separate from application routing
and retain geometry assertions rather than relying only on screenshots. On Replit,
prefer the system Chromium: downloaded browser binaries may lack Nix shared libraries.
