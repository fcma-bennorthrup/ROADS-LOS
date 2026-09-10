---
name: Vite HMR behind Replit proxy
description: Prevents websocket disconnects and stale React module instances in the proxied development preview.
---

For middleware-mode Vite served through Replit's HTTPS preview proxy, explicitly use client port 443 for the browser-side HMR websocket.

**Why:** Letting Vite infer the client port caused the browser to target an inaccessible development port. The disconnected HMR client retained incompatible versions of a React context module, producing false “provider missing” and invalid-hook runtime crashes even though the component hierarchy was correct.

**How to apply:** Preserve the explicit HTTPS client port when changing Vite server or workflow configuration. If provider errors appear immediately alongside an HMR websocket failure, fix websocket routing before changing React context composition.