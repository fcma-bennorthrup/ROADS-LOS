---
name: GitHub provider context
description: Source-control authorization can work through the app API while generic discovery and CLI authentication disagree.
---

Do not treat generic connector discovery or CLI authentication as proof that the connected GitHub API is unavailable.

**Why:** After source-control authorization, generic discovery still reported not_setup, the sandbox credential list was empty, and the CLI was unauthenticated, but the application's connector proxy successfully returned the authenticated GitHub account.

**How to apply:** Verify the identity with a read-only account API request using the documented connector configuration. Then verify the original repository separately. A successful account lookup does not establish repository access or permission to push; do not repeatedly reconnect an authenticated account to resolve an unconfirmed repository authorization problem.

A repository's 403 response does not establish that a collaborator lacks permission. Verify that the configured repository owner and name match the intended shared target before recommending permission changes.

**Why:** An incorrect repository owner returned Forbidden while the correct shared repository confirmed push permission for the same authenticated collaborator and accepted the existing saved sync commit.

**How to apply:** Check the explicit target through the connected API; never substitute the authenticated login for the repository owner or require collaborators to log in as the owner. Do not reset a saved sync baseline merely because the target configuration was corrected.
