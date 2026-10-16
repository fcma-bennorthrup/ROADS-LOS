# Approved custom-sync credential/runtime exclusions

## Decision and scope

The owner explicitly approved the proposed filename policy and the cancellation
of old excluded-file conflict plans. This supersedes the pending decision for
SHARED-007 only; it does not approve other entries in the historical register.

Before: the custom scanner skipped hidden directories and its existing ignore
sets, but could read and transfer credential-like regular files, including root
dotfiles. Remote/base selection and persisted conflict plans could also include
those paths. No actual exposure was searched for or established.

After: `.env`, `.env.*` (including templates), `*.pem`, `*.key`, `id_rsa`,
`id_dsa`, `id_ecdsa`, `id_ed25519`, `github-sync-state.json` and
`pending-conflicts.json` are excluded at any depth. Matching is case-sensitive,
consistent with the existing Linux filename rules. No content scanning occurs.
Other dotfiles retain their existing eligibility; `.envrc`, `.environment`,
`.ENV`, `.npmrc`, `.gitignore`, `.nvmrc`, and public-key names are not implicitly
excluded by this new policy.

The same guard applies to local discovery and remote/base-tree selection. It
therefore covers status counts, initial/normal/force push and pull, conflict
planning and deletion planning. Existing excluded files remain untouched locally
and remotely. Counts and count-bearing messages omit excluded files. The
remote-commit change flag remains SHA-based, even if only excluded files changed.
Binary handling, the 7 MiB limit, lockfile policy, partial failures, checkpoints,
cache lifetimes, authorization and stale-head ordering remain unchanged.

### Existing pending plans

If **any** conflict, safe update or safe deletion references an excluded file:

- GET conflicts returns only `hasConflicts: true`, `conflicts: []`, the operation,
  and `blockedReason`; no path, content, commit message or snapshot metadata.
- Resolution returns HTTP 409 before any file mutation or remote call, with:
  `Pending conflicts contain files excluded by the sync security policy. Cancel these conflicts, then retry the sync.`
- The existing panel still opens the resolver. Its new blocked state shows
  **Sync Conflicts Blocked**, the instruction, **Close**, and **Cancel Conflicts**.
  Cancellation uses the existing DELETE endpoint and clears pending metadata
  only. Close/Escape do not cancel. A failed cancellation keeps retry available
  and shows `Could not cancel conflicts. Please try again.`
- Allowed pending plans retain the prior response and interaction behavior.

No migration or automatic deletion of existing pending metadata is performed.
No real GitHub operation, credential-value inspection, rotation, cleanup,
publication, or live App startup was performed.

## Verification provenance

- Route baseline SHA-256:
  `b1f60f4195b34c2f947d0cda50bedebe6a3d217bc7257fd791afc31f42ce9045`.
- Resolver baseline SHA-256:
  `4917b3326a59a715199fc8fc304b2536b0faa9cefdaa505a64e8a8f59db33a51`.
- Both matched the original local audit manifest before editing. The unchanged
  resolver baseline used for capture was recovered from local Git and checked
  against that same pre-edit hash; no remote version was substituted.
- Accepted lock SHA-256:
  `caf5cbce73ec535033e36984f2c5d00e080a7a91c1575750b7008f7c52e9107e`.
  Every installed package version was checked against this lock. Dependencies,
  lockfile and configuration were not changed or installed.
- Disposable source copies, UTC, fixed Date `2026-10-14T16:00:00Z`, allowlisted
  child environment, existing network guard, and fake filesystem/GitHub/state
  adapters. The VM permits only fake adapters plus path/crypto; no application
  storage, HTTP server, database or live state modules execute.
- Existing installed packages are referenced read-only, not reinstalled.
  Build/capture outputs remain in temporary directories outside Git.

## Backend results: pass

`python verification/credential-sync/run.py /path/to/original-routes.ts`
passed **234 checks**. The optional baseline must match the recorded route hash.
Without that argument the same command tests candidate safety, but does not claim
baseline equality.

- 17 scenarios compare exact response bytes/statuses, ordered fake calls,
  local file results, pending plans and checkpoint outcomes against the
  unchanged baseline. They also compare clean fixtures against fixtures with
  33 root/nested/deep excluded paths (local-only, remote-only, existing, and
  deleted-remote combinations).
- Scenarios: status/cache, initial push, safe-name push, force push, same-head
  push, unchanged push, base-fetch fallback push, advanced-head push and
  conflicts, initial/force/unchanged pull, normal pull/deletion, pull conflicts,
  write failure, and base-fetch failure.
- 198 old-plan cases cover all 33 excluded paths in conflicts, safe updates and
  safe deletions for both push and pull. Exact blocked responses, zero file/remote
  calls, unchanged local files, and safe cancellation are asserted.
- Allowed push/pull resolutions match baseline responses and call ordering.
- Safe dot-configs and binary push encoding remain supported. Synthetic binary
  pull exclusion remains unchanged. Excluded files never reach read/stat/write,
  fetch/upload or deletion calls. Their synthetic local bytes remain intact.

## Static check: existing failure preserved

In the disposable copy,
`node node_modules/typescript/bin/tsc --noEmit --incremental false`
exited **2** for both original and candidate: **15 diagnostics each**. Diagnostic
files/codes/messages are identical after ignoring shifted source positions.
The existing panel mutation argument and Map/Set target errors were not repaired.
This is not a passing whole-project type check.

## Browser evidence

Only `verification/credential-sync/fixture.tsx` was mounted, with real sync
components and synthetic fetch responses. The live App was never imported.
The static fixture's CSP blocks external transports and fonts. Existing CSS is
used; animation suppression is capture-only and identical for both versions.
Loaded-external-font equivalence is not claimed.

The bounded browser pass verified:

- Blocked content stays hidden; keyboard cancellation issues exactly one DELETE,
  closes the dialog, and removes the pending warning on reopening the panel.
- Escape closes without DELETE. Failed cancellation shows the exact error,
  leaves retry enabled and sends no POST.
- Safe Keep Mine / Apply resolves with one fake POST and closes successfully.
- Exact rendered-text/DOM-order/computed-style/geometry/focus fingerprints match
  for normal panel, normal diff and empty states at 1440×900; normal diff also
  matches at 390×844. Desktop and breakpoint lower actions were visible.
- At 390×844 the old diff layout clips right-side controls in both versions;
  this pre-existing layout was not repaired.

Initial screenshots: blocked `1yi5ht`, cancellation error `qbfifz`, post-cancel
panel `aq3gsa`, normal diff candidate/baseline `2wqp25` / `u6gwsp`, empty
`yhwfhg` / `0e5ji0`, normal panel `pp3uo6` / `ph1lxt`, mobile diff
`lhx2zs` / `fp5w4a`. Screenshot IDs are browser evidence, not committed binaries.

The first loading capture had a 1–3 px spinner-geometry discrepancy. The fixture
was corrected to freeze animations after Tailwind. The targeted follow-up
confirmed exact loading text/DOM/computed-style/geometry/focus fingerprints at
1440×900, 1024×768, 390×844, 639×844 and 640×844; the discrepancy did not recur.
No production CSS was changed.

Loading candidate/baseline evidence by viewport:

| Viewport | Candidate | Baseline |
|---|---|---|
| 1440×900 | `6eyf75` | `kzam0a` |
| 1024×768 | `2aiewx` | `hahgsh` |
| 390×844 | `ockbxc` | `zj2dey` |
| 639×844 | `c516mx` | `nl9uqb` |
| 640×844 | `8wn12u` | `fzlkhk` |

The follow-up also captured baseline/candidate normal panels and empty dialogs
at the four remaining widths, with matching observed presentation and fitting
controls. Representative 639×844 evidence: panel `89gg43` / `nvwsm6`, empty
`cjp0jb` / `ro04yg`. Blocked text/actions fit at all widths: mobile `2adi0e`,
639 `3y3o1j`, 640 `x2h8zm`, 1024 `30272p`, plus the initial desktop capture.

**Unverified visual limits:** the browser evidence interface returns screenshot
IDs, not image byte buffers or downloadable paths. Pixel-by-pixel equality was
not computed. The new cancellation-error state was captured only at 1440×900.
Normal-diff baseline/candidate fingerprints were compared at desktop and mobile;
the intermediate widths received candidate layout checks, not complete paired
pixel comparisons. Clipped mobile diff controls were not tested for scroll
reachability. These are explicit limits, not full pixel/interaction sign-off.

### Reproducing the isolated UI fixture

After the runner prints its disposable copy location, run from that copy:

```sh
node verification/credential-sync/build-fixture.mjs /path/to/original-dialog.tsx
python -m http.server 8008 --bind 127.0.0.1 --directory fixture-output
```

Use an allowlisted environment and the existing Node network guard for the build.
Check the original-dialog hash above before supplying it. `candidate.html` and
`baseline.html` support `mode=normal|blocked|cancel-error|empty|loading` and
`screen=dialog`. Without a baseline argument only the candidate is built.
`window.fixtureCalls` records fake requests; it never proxies requests onward.
These commands do not start the application server or serve project files.

## Limits and next steps

No security incident, comprehensive secret detection, performance improvement,
production health, real repository compatibility or loaded-font parity is
claimed. Existing files in a remote repository are deliberately not cleaned up.
Broader eligibility, checkpoint and stale-conflict work already has separate
tasks; it is not bundled or duplicated as new follow-up work here.

The later diff-memoization work also touches the resolver file. This change only
adds the blocked-plan branch and response field; it does not modify DiffViewer.
Merge those separate approved changes sequentially and retain both contracts.
