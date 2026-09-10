---
name: Vite HMR behind Replit proxy
description: Prevents websocket disconnects and stale React module instances in the proxied development preview.
---

For this middleware-mode Vite app, keep HMR disabled in the Replit development preview.

**Why:** Both inferred and explicitly pinned HTTPS websocket ports were closed by the preview proxy. The disconnected HMR client retained incompatible versions of a React context module, producing false “provider missing” and invalid-hook runtime crashes even though the component hierarchy was correct.

**How to apply:** Preserve the disabled HMR setting when changing Vite server or workflow configuration. Use page refreshes after edits. If provider errors appear alongside an HMR websocket failure, do not change React context composition.