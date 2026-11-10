---
name: Admin operations policy
description: Database and Git operations belong outside prototype controls.
---
Handle database checks, Git pushes/pulls, and conflict resolution through prompts or shell commands, not the prototype admin UI.

**Why:** The user explicitly moved these operations out of the application on 2026-11-10.

**How to apply:** Preserve loan demo controls. Keep pipeline admin as an empty modal until new controls are requested; do not reintroduce Git or database controls.
