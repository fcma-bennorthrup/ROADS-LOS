---
name: Vite HMR behind Replit proxy
description: Prevents websocket disconnects and stale React module instances in the proxied development preview.
---

For this middleware-mode Vite app, keep HMR disabled in the Replit development preview.

**Why:** Both inferred and explicitly pinned HTTPS websocket ports were closed by the preview proxy. The disconnected HMR client retained incompatible versions of a React context module, producing false “provider missing” and invalid-hook runtime crashes even though the component hierarchy was correct.

**How to apply:** Preserve the disabled HMR setting when changing Vite server or workflow configuration. Use page refreshes after edits. If provider errors appear alongside an HMR websocket failure, do not change React context composition.

For this legacy app, a default preview-host 502 does not necessarily mean the app is down. Check the explicitly forwarded application-port URL before restarting.

**Why:** Browser verification reached only a gateway error on the default host, while the forwarded application port served the same route successfully. Restarting the healthy workflow did not change that.

**How to apply:** Confirm the current forwarding configuration and test both routes; give browser verification the working forwarded URL. Do not change app code or repeatedly restart to fix a routing-only failure.