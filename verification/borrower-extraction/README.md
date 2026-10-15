# Borrower presentation extraction comparison

Run `python verification/borrower-extraction/run.py` from the repository root.
It fails closed on unexpected baseline changes, validates the exact mechanical
extraction, installs the accepted lock in a fresh disposable directory, then
runs the existing Origination characterization and new full-DOM comparison.
No live App, server or external operations are used by the tests.

`BorrowerInformationBaseline.tsx` preserves the original audited component.
Only its relative RoadsDropdown import is adjusted for the fixture location;
the runner reverses that adjustment and verifies the historical SHA-256.
The candidate must equal the original minus the moved blocks plus three imports.
Every moved block must match exactly apart from module imports/exports.

The new test compares full markup at each state, not regenerated snapshots of
the candidate. It also asserts focus and node identity, disabled controls,
native DOB, independent drafts, static headings and remount behavior.
The existing Origination suites provide the complete all-field and actual
sidebar-unmount characterization.

The server-entrypoint hash exception was explicitly accepted by the user for
this isolated comparison only. The shared runner and immutable historical
manifest remain unchanged. Existing setup-documentation and lock exceptions
are inherited unchanged.

## Browser fixture

Start Vite **only from the emitted disposable copy**, with an environment
allowlist, using `node node_modules/vite/bin/vite.js --config
verification/borrower-extraction/browser/vite.config.ts`. Never start the live
App to gather this evidence. The two fixture URLs are `/?version=baseline`
and `/?version=candidate` on port 4317.

Use a fresh browser context with UTC timezone and allow network only to the
fixture's local origin. The fixture freezes Date and blocks runtime transports;
the browser must additionally block external resource loads, including fonts.
Use original CSS and font declarations; blocked-font results are not a
font-loaded visual certification. Assert the actual content viewport.

The fixture toggle reproduces section unmount/remount without importing
unrelated routes or services. Actual sidebar behavior is covered by the reused
route tests. Keep browser screenshots and other large generated outputs in
temporary storage, not Git.
