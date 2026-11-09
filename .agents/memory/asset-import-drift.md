---
name: Asset import drift after task merges
description: Merged task work can reference attached_assets filenames (timestamped) that don't exist in the main environment, breaking Vite startup.
---

Attached assets get timestamp-suffixed filenames per upload. Task agents working in isolated environments may re-upload the same PDFs and import them with new timestamps; after merge, those files don't exist in the main repl and Vite fails with "Failed to resolve import @assets/..." at startup.

**Why:** Happened July 2026 — `@assets/*.pdf` imports in DocumentsContent/ProductPricingContent pointed to nonexistent timestamps; app failed to start.

**How to apply:** If the app fails to run after a merge with an unresolved `@assets/` import, `ls attached_assets/` and repoint the import to the existing timestamped filename instead of hunting for a missing upload.

The same mismatch can return after a GitHub API pull; a successful sync does not guarantee the pulled source references assets available in this workspace.

**Why:** The shared repository has contained timestamped PDF references absent from this workspace, reintroducing startup failures after a successful pull.

**How to apply:** Verify the build after pulling. Keep local filename repairs explicit and do not change PDF synchronization policy or push those repairs without approval.
