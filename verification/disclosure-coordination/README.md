# Disclosure coordination verification

Run `python verification/disclosure-coordination/run.py` for isolated candidate
checks. It pins the accepted dependency lock, installs with lifecycle scripts
disabled, then blocks Node and browser test transports. Nothing starts the App,
calls real delivery/GitHub services, or changes real browser storage. Logs and
builds stay in the printed `/tmp/disclosure-check-*` directory.

The command intentionally exits nonzero on any failed check. At implementation
time there was one inherited package-reset assertion failure and 15 inherited
TypeScript diagnostics; see the evidence report. Do not change expectations or
repair unrelated source to turn these green.

The browser fixture reuses `verification/documents/fixture.tsx`. `?seed` resets
synthetic storage; omit it in a second window. `?noLocks` removes Web Locks.
Real browser windows must share an isolated origin/storage context to exercise
coordination: two separate incognito storage contexts cannot contend on the
same localStorage key. External requests/fonts must also be blocked by browser
automation. `window.disclosureVerification` exposes history and borrower APIs
for deterministic lock barriers and captures PDF open arguments without opening
the PDF.

Build the baseline and candidate with the same fixture and dependency snapshot;
`serve.py <parent-directory>` serves `<parent>/baseline` on 4173 and
`<parent>/candidate` on 4174. Only disposable static output is served. The
pre-edit source snapshot used here was pinned before editing, not reconstructed
from a remote revision. The baseline without locks is expected to permit writes;
only the candidate must reject them.

Serial jsdom tests use an explicitly synchronous immediately-granted lock fake
to preserve their existing timer assertions. This is not native-lock or
cross-window proof. Queue tests replace it, unsupported cases remove it, and
real browser lock barriers supply the concurrency evidence.
