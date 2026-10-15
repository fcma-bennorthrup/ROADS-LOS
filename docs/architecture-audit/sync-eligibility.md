# Approved sync eligibility exception

## Approval and exact differences

The owner approved binary sync up to **7 × 1024 × 1024 bytes inclusive**,
preserving binary files instead of propagating their deletions, retaining
eligible-text deletion rules and the existing lockfile/security exclusions.
The owner subsequently approved the error wording and pre-write safety rules.
This supersedes the pending decision for SHARED-003 only.

Before: pushes collected recognized binaries as base64 but pulls omitted them;
oversized files and read failures disappeared from some comparison inputs.
Binary conflicts followed a separate SHA path, and some binary deletions were
propagated. Listed remote files returning no content could appear absent.

After:

- Status, push, pull and conflict-resolution eligibility distinguish eligible,
  absent, excluded, oversized and failed-read inputs. Comparison snapshots omit
  a path from **all sides** if any side is excluded or oversized.
- Binary bytes stay base64 in transport and are decoded to bytes on local writes.
  Empty files are valid. GitHub Contents responses with `encoding: none` use
  their blob reference, supporting eligible files above its inline-content limit.
- Normal and forced push/pull preflight all participating reads before writes.
  A listed remote file returning null/404 is a failed read, not a deletion.
  Only ENOENT establishes local absence; other read/stat errors block sync.
- Binary conflicts block the whole operation before changes, including force.
  Without a usable baseline, differing existing copies also block. No binary
  content enters the text editor. Binary additions remain supported; missing
  source binaries never cause deletion of their destination copies.
- Oversized counterparts cannot overwrite a smaller copy or authorize deletion.
  File-size limits use raw bytes, not base64 string length.
- Only eligible text is deletable. Existing force/initial pull no-delete behavior
  remains. Existing `package-lock.json`, directory, credential and runtime
  exclusions remain, including environment templates. No content scanning.
- Older plans containing binary conflicts/deletions, incorrectly encoded binary
  updates, excluded paths or oversized content are blocked. Local eligibility
  is checked before presenting/applying a plan, remote eligibility before applying.
  Safe binary updates alongside text conflicts retain their encoding and must
  pass binary safety before resolution writes.

## Result contracts

Existing successful text-only messages stay unchanged. Eligible binary files
now participate in counts. Oversized paths are counted once across snapshots:

> Skipped {count} file(s) larger than 7 MiB; existing copies were preserved.

This is appended to the ordinary result message. Read failures return HTTP 500
through the existing failure display:

> Sync blocked: could not read {count} file(s). No files were changed. Fix the read errors and retry.

Binary conflicts use HTTP 500, not the existing HTTP-409 text-conflict success
handler, so they cannot display “Pull Complete”/“Push Complete” or open an editor:

> Sync blocked: {count} binary file(s) need manual reconciliation. No files were changed. Reconcile these files outside the text conflict editor, then retry.

Incompatible old plans use the existing blocked-plan UI and HTTP 409 on apply:

> Pending conflicts contain files incompatible with the sync eligibility policy. Cancel these conflicts, then retry the sync.

Credential-blocked plans retain their previously approved wording. Cancellation
clears only pending metadata; dismissal does not clear it. No automatic retries.
Status retains its existing `localCheckFailed`/`inSync` contract on read failure.

## Preservation and boundaries

No sync UI, CSS, font, asset, shared schema, package, lockfile or configuration
bytes changed from the clean local checkout at assignment. Completion review
also required restoring two missing imports in the separately merged checklist
reset code; this narrowly restores its already-intended unsupported-browser
message, with no markup or styling change.
The accepted lock remains
`caf5cbce73ec535033e36984f2c5d00e080a7a91c1575750b7008f7c52e9107e`;
the runner checks installed versions against it without installing anything.

The baseline is the current local checkout at assignment, pinned in the runner,
not the obsolete original audit manifest and not a remote commit. Synthetic
fixtures use existing injectable adapters; helpers are bundled with each
version's own source. Fake filesystem metadata now models `isFile` and ENOENT,
and fake downloads honor requested encoding. Historical characterization
expectations were not rewritten into future-behavior assertions.

Additional reads before mutations are intentional eligibility changes. The
ordered *mutation* calls and exact responses for unaffected text scenarios are
compared, not falsely claimed to have identical complete read traces.

Write/upload failures, checkpoint advancement after partial writes, moving HEAD,
stale resolution ordering, transactional recovery, concurrency, authorization
and race-proof filesystem transactions remain outside this exception. Local
probes now lstat every path component before reading and exclude symlinked
ancestors/targets from all comparison sides and deletion planning. The
existing partial-write checkpoint behavior has a preservation test; it is not
claimed safe. Dedicated downstream tasks own checkpoint and snapshot work.
Retained unused legacy mechanics helpers were not removed or broadly refactored.

## Verification performed

Command: `python verification/sync-eligibility/run.py`.

Final backend run: `/tmp/sync-eligibility-wq2bdbhg`.

- **PASS:** 134 route scenarios using only synthetic files, fixed UTC clock,
  disposable source copies, allowlisted process environment and blocked network.
  No live storage/API modules execute in the VM; no real GitHub operations.
- **PASS:** text/PDF add, edit, delete, both-side change, unchanged, normal/force,
  initial/no-base behavior; byte equality for non-UTF-8 PDF data (stronger than
  hash equality), and actual buffers at 7 MiB−1, 7 MiB, 7 MiB+1.
- **PASS:** local failed reads, remote null/404, base failed reads, oversized
  local/remote/base counterparts; failures cause no file/remote/state mutations.
- **PASS:** status deletion/read-failure handling; exclusions at root/nested
  paths; old-plan blocking/cancellation; binary safe updates in text resolutions.
- **PASS:** synthetic remote-only child paths under a local external-directory
  symlink for normal/force push and pull: no target stat/read/write/unlink,
  external bytes never enter an upload, and no remote deletion.
- **PASS:** real GitHub decoding helpers with fake inline, empty and >1 MiB
  blob-download responses, preserving bytes through 7 MiB.
- **PASS:** exact unaffected text response bytes/statuses, resulting local files,
  pending state, checkpoint values and ordered mutation calls.
- **STATIC CHECK NOT PASSING:** baseline 15 diagnostics; candidate 13. Both retain
  GitHubSyncPanel TS2554 and existing Map/Set target TS2802 errors. Removed code
  accounts for the reduction; no new error category. No compiler/dependency
  repairs or test exclusions. Diagnostics are retained in the disposable output.
- **PASS:** all 9 existing unsupported-browser disclosure checks, including
  partial Reset Demo and its exact browser-specific toast, run in the final
  disposable copy with the network guard:
  `node node_modules/vitest/vitest.mjs run --config verification/disclosure-coordination/vitest.config.ts verification/disclosure-coordination/unsupported.test.tsx`.
  This confirms the review-requested missing-import repair without another
  browser pass or changes to reset semantics.

## Isolated browser evidence

One pass mounted only the existing admin panel/resolver with synthetic responses.
The live App was never mounted or restarted. Only a static fixture server ran.
Browser network routing and CSP blocked external transports/fonts.

At actual 1440×900, 1024×768 and 390×844, baseline/candidate panel and resolver
text/order, measured root styles, bounds and document dimensions matched.
Client source was also byte-unchanged. The panel fits at 390px; the resolver's
existing right-side clipping occurs in both versions.

Binary/read failures from both Pull and Push displayed failure toasts, not
success or an editor; one POST per explicit action, no automatic retries.
Oversized Pull displayed the approved suffix. Eligibility Close/Escape retained
the pending warning; Cancel cleared it. Cancellation failure remained retryable.
Local/Remote tabs and manual-edit initialization worked. Dismiss retained its
existing cancellation behavior and focused BODY in this fixture.

Screenshot evidence references: panel `f3lx7k`, `3t3anu`, `ywkybm`; resolver
`hrrsoi`; binary error `fpuc16`; read error `l0f6xr`; oversized result `drzt7s`;
eligibility guard `fz96au`; cancellation error `j4q00p`; manual edit `vhkeak`.
Report: `/tmp/sync-eligibility-cfe2k_9m/ui-evidence/report.md`.

**Limits:** screenshot image files were not exported by the browser runner;
references were visually inspected, not pixel-byte compared. External fonts
were blocked, so font-loaded rendering is unverified. Panel loading/empty fixture
modes both rendered the regular panel; mode-specific loading/empty resolver
screens were not established by this pass. No exhaustive focus/keyboard,
breakpoint-edge, cross-browser, performance, live-sync or production claim.
These are recorded limits, not passing results or permission to repair the UI.
