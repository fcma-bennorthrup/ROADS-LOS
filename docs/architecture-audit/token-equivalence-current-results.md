# Token verification — approved current local source

## Latest completion synchronization

A further synchronization brought in 15 changed original paths and three
additional source files. Under the user's direction to verify newly merged
local source, the latest snapshot is separately pinned in
`token-equivalence-evidence/approved-completion-baseline.json` (**188 paths**).
The 185-file full-run evidence below is retained, not overwritten.
`completion-sync-drift.json` records the additional changes.

All 219 authored checks and both CSS emissions pass again for the 188-file
snapshot. Its emitted CSS remains byte-identical to the full-run snapshot.
The accepted dependencies and all five mapped token files still match their
original expectations; no production or dependency edit was made by this task.

An esbuild input-hash inventory proves that only two inputs in the isolated
browser fixture changed: `closing-disclosure-history.ts` and
`closing-disclosure-borrowers.ts`. All other fixture inputs, including shared
controls, styles and installed modules, are identical. Adding input-inventory
instrumentation reproduced the old bundle bytes exactly. New browser CSS and
font bytes also match exactly. The two changed modules add a write-support
guard/error; no new top-level side effect changes shared-control execution.
This evidence is retained in `completion-input-comparison.json`.

Accordingly, the complete shared-control matrix remains valid for its unchanged
inputs. All affected Documents scenes are rerun at every applicable viewport
and both font modes, as separate results; the older Documents failures are not
discarded or relabeled. The selected-scene run completed: **42 scene pairs,
270 exact state comparisons, 228 PNG comparisons**. All state comparisons
match; **225 PNG pairs match and three fail**. Browser exit status remains 1.
All 188 files stayed unchanged in project and disposable copy; external
requests and uncaught browser errors were both zero.

| Latest failed capture | Changed pixels | Maximum channel delta |
|---|---:|---:|
| 390×844 loaded fonts, Documents Sheet open | 6 | 1 |
| 390×844 loaded fonts, Documents Sheet below fold | 8 | 1 |
| 390×844 loaded fonts, Documents error Sheet below fold | 5 | 1 |

All three corresponding DOM/style/state hashes match. These are still failed
exact-image checks, not accepted rounding differences. **Strict visual
acceptance remains blocked.** Earlier failures remain in their own records;
none was dropped or relabeled to claim a passing suite.

For the latest source, coverage consists of the unchanged **1,332 shared-control
state comparisons / 348 PNG pairs** from the full run, plus **270 newly checked
Documents states / 228 PNG pairs**. This is evidence reuse justified by exact
input/CSS/font identity for unaffected consumers, not a claim to have rerun
every scene after every merge. Latest Documents evidence is in
`completion-browser-results.json`, `completion-browser-preservation.json`
and `completion-pixel-differences.json`; the three failures are retained.

To reproduce the latest snapshot:

```sh
python verification/tokens/run.py \
  --baseline docs/architecture-audit/token-equivalence-evidence/approved-completion-baseline.json
python verification/tokens/prepare-fonts.py <work>/fonts
# Full matrix, or the documented affected-scene follow-up:
python verification/tokens/browser.py <work> "" documents,documents-error,documents-empty
```

Omit the final two arguments to reproduce the entire matrix. The focused run
does not claim a new full browser pass. Evidence for this latest snapshot uses
the `completion-` prefix, and the disposable directory is
`/tmp/token-verification-jfh0u3dd`.

## Approval, provenance and preservation

After synchronization introduced other approved changes, the user explicitly
selected **Verify the newly merged source**. This report supersedes the older
run for current-source coverage, not for its recorded historical findings.
The original results remain in
[token-equivalence-results.md](token-equivalence-results.md) and the unprefixed
evidence files; they have not been overwritten.

The accepted source manifest is
`token-equivalence-evidence/approved-current-baseline.json`.
It pins **185 files**: 174 original audit paths plus 11 newly added files under
client/server/shared. The 23 changed original paths are documented in
`token-equivalence-evidence/post-sync-drift.json`. The five mapped token files
and dependency contracts remain unchanged from the accepted original values.
This is source-baseline approval only, not approval to alter those contracts,
change visual expectations, normalize tokens or repair application code.

An initial current-source run used only the 174 original paths; its browser
collection was stopped when the additional files were found. No browser pass
is claimed for that preliminary run. Its manifest is retained as
`preliminary-current-baseline.json`. The definitive run uses all 185 files,
including the added TSX files in the original production Tailwind scan.

## Reproduction and isolation

```sh
python verification/tokens/run.py \
  --baseline docs/architecture-audit/token-equivalence-evidence/approved-current-baseline.json
python verification/tokens/prepare-fonts.py <work>/fonts
python verification/tokens/browser.py <work>
python verification/tokens/pixel-differences.py <work>/browser
python verification/tokens/check-baseline-gates.py
```

Measured disposable directory: `/tmp/token-verification-taspye2k`.
Only verification fixtures, reports and memory are edited in the project.
Installation uses the accepted lock with scripts/audit/funding disabled in a
fresh disposable copy. Test processes use a minimal environment, UTC, fixed
clock/randomness, synthetic records and disposable storage. No live App is
mounted and no real GitHub, financial or document-delivery operation is used.

Font preparation independently fetched the same existing HTML-referenced
resources and matched the retained **26-resource pin exactly**. Those verified
bytes were copied into the definitive disposable run. Browser fixtures embed
them locally, or omit them for the blocked-font variant; external transport
guards remain active. No package or browser installation outside the approved
disposable dependency installation is involved.

## Static results

| Check | Result |
|---|---|
| Accepted installation and version checks | Passed, exit 0 |
| Authored mapped values, exemptions, references and order | All 219 equality assertions passed |
| Production Tailwind emission | Both invocations passed |
| Emitted CSS equality and order | Exact byte match; both SHA-256 `29e55adcb65a4f442fc4fe082c33647a537f94322be5e4336a927750dd4e579d` |
| CSS versus historical measured output | Same digest, despite the expanded current source scan |
| Source/copy preservation through static checks | All 185 files unchanged |
| Manifest rejection gates | Five negative cases passed before any installation |
| Type check or unrelated tests | Not rerun or represented as passing |

The gate tests reject dependency changes, mapped-token changes, other source
hash drift, omission of a newly added source file, and an out-of-scope path.
The runner does not create or refresh manifests. Changes to any current source
path or to the file set fail the gate instead of silently accepting drift.
The historical default invocation remains intentionally strict.

Evidence uses the `current-` prefix in `token-equivalence-evidence/`, including
static results, installed versions, source hashes, authored/CSS logs, browser
build hashes and baseline-gate results.

## Browser results

The entire current-source matrix completed in one uninterrupted definitive
run under **Chrome/152.0.7977.64**, Node v24.13.0. The runner exited **1** because
four PNG comparisons failed. This is a completed verification/failure report,
**not clean visual acceptance**. No tolerance or production repair was applied.

| Check | Result |
|---|---|
| Matrix coverage | 228 scene pairs; 15 viewport sizes; loaded and blocked font modes |
| Exact DOM, text/order, computed typography/colors/spacing, geometry, focus and state | All 1,602 comparison pairs match |
| PNG equality | 572 of 576 pairs match; four failures below |
| Font assertions | Source Sans Pro and Inter loaded in loaded runs; no downloaded faces in blocked runs |
| External requests / uncaught browser exceptions | Zero / zero |
| Production/source/dependency preservation after browser run | All 185 pinned paths unchanged in project and disposable copy |
| Browser return status | Failed, exit 1; retained without suppressing failures |

| Failed capture | Changed pixels | Maximum channel delta |
|---|---:|---:|
| 390×844 loaded fonts, Documents Sheet below fold | 8 | 1 |
| 390×844 blocked fonts, Documents Sheet open | 6 | 1 |
| 601×844 loaded fonts, Documents Sheet below fold | 42 | 1 |
| 640×844 blocked fonts, Documents Sheet below fold | 17 | 1 |

Every corresponding state hash matches. Tiny rasterization differences remain
a hypothesis, not an accepted exception. These failed comparisons do not
establish a token regression, and cannot be called passes. **Strict visual
acceptance remains blocked.** The changed failure locations versus the older
run are preserved rather than combined into a selectively passing result.
The earlier four failures remain in the earlier report.

The mobile full-page image widths exceed the viewport when existing synthetic
content overflows; actual inner viewport dimensions are independently asserted.
No clipping, masking or image tolerance hides this behavior.

The retained raw files are `current-browser-results.json`,
`current-browser-build.json`, `current-browser-preservation.json` and
`current-pixel-differences.json` under `token-equivalence-evidence/`.
All 1,602 labels are unique. The fixture forms and Documents Sheet captures
were also visually inspected. Large PNGs, downloaded font bytes and browser
profiles remain disposable, not committed. A missing or changed remote font
pin must fail preparation rather than silently replacing it.

Results certify only the exact approved source hashes recorded with this run.
Later merges require checking drift before extending this evidence to them.

The matrix and limits remain those in `verification/tokens/README.md`: all
47 UI wrapper modules, both ROADS controls, real Documents Sheet/status popover,
18 scenes at the three main viewports and five scenes at 12 additional widths,
both loaded/blocked fonts, default/hover/focus/disabled/error states, keyboard
interaction and below-fold content. Chart coverage is its shared container,
not quantitative chart behavior. Dark-theme expansion, other browser engines,
full application workflows, accessibility compliance, animation trajectories
and performance are not certified.
