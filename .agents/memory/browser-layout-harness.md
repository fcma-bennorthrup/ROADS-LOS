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

Full workspace checks must acknowledge initialization saves in an isolated
in-memory application, not reject all writes.

**Why:** Real loan pages persist workflow defaults on mount. Aborting those
requests triggers the leave guard, falsely appearing to break navigation.

**How to apply:** Intercept reads and writes, retain revisions only in the test,
and reject unexpected endpoints. Never forward fixture writes to the app server.

Check geometry after focusing later tabs on narrow screens, not just on load.

**Why:** An overflow-hidden ancestor is still programmatically scrollable;
browser focus can move the entire shell sideways despite a zero CSS margin.

**How to apply:** Assert header and toolbar coordinates after tab clicks, and
keep intended scrolling local to the tab strip and page content.

For background row-order assertions while a modal is open, inspect DOM attributes
rather than accessible names.

**Why:** Radix intentionally hides the background from accessibility APIs; even
including hidden roles does not restore their computed accessible names.

**How to apply:** Keep dialog assertions role-based, but use stable DOM selectors
and explicit attributes for background identity/order assertions.
