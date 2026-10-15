# Equivalent loan-path extraction

## Scope and baseline

The user chose reset protection first, then explicitly authorized updating this
task's working copy from merged main. A local fast-forward brought in the
completed reset-consumption change before extraction. The comparison baseline
is local revision `56bf0e05a0f4c0b84891e8ce145f225b32ddfe76`; it is not the
older pre-reset audit snapshot. No GitHub operation was performed.

Only the identical anchored expressions in the activity provider, checklist
provider, and Collateral storage-key helper now call `loanIdFromPath`.
The helper takes an explicit fallback; all three callers retain `"prototype"`.
Raw segments remain undecoded and unvalidated. Query/search parsing is untouched.

**Header deliberately unchanged:** its unanchored pathname match and `"1"`
fallback are not equivalent to the three storage parsers. For example,
`/prefix/loans/synthetic-b` means prototype storage but header navigation to
loan synthetic-b. Sharing this expression as though equivalent would violate
the approved boundary. There is no new hook, provider, memoization, storage
migration, reset change, or markup/style change.

The runner reverses only the new import/call text and requires byte equality
with the approved baseline for all three consumers. Every other original
manifest file must exactly match that same local baseline. It separately pins
the accepted lock hash. Thus provider keys, effect dependencies, subscription
timing, errors, prefixes, JSX, assets, and the merged reset implementation
are unchanged, not merely assumed unchanged from test results.

## Reproduction and safety

Run `python verification/loan-path/run.py`.

It creates a disposable directory, installs the accepted lock with lifecycle
scripts disabled, and executes baseline/candidate fixtures using the existing
shared transport guard and fixed Date/UTC setup. It never runs the application
server or mounts App. Admin rendering is inert. Browser requests are blocked;
the browser uses a disposable profile and file-origin fixture. No credentials,
database, GitHub, financial services, or document delivery are accessed.

Generated files, screenshots, installed packages and traces stay under `/tmp`,
not in Git. The actual original component/control implementations and CSS are
used; external fonts are blocked in both variants.

## Results

Final evidence directory: `/tmp/loan-path-7255urb9`.

| Check | Result |
|---|---|
| Accepted-lock disposable install | PASS |
| Baseline regression suite | PASS: 5 files, 46 tests |
| Candidate regression suite | PASS: 5 files, 46 tests |
| Exact ordered storage calls, serialized values, DOM and saved/local-state trace | PASS: byte-identical |
| Consumer inverse-transformation check | PASS |
| Other original manifest paths versus approved local baseline | PASS |
| Source preservation during execution | PASS |
| Settled browser DOM, computed typography/colors/spacing/geometry, scroll and screenshot hashes | PASS: all 15 baseline/candidate pairs identical |
| Browser dimensions | Measured 1440×900, 1024×768, 390×844 |
| `git diff --check` | PASS |

Tests cover raw/encoded/empty/missing IDs, synthetic loans A/B, generic unknown
paths, unknown nested loan paths, prefixed paths, query/hash-like raw inputs,
Back/Forward, header navigation fallbacks, address persistence, activity panel
remount lifetime, checklist state, reset sequencing, corrupt/denied storage,
and the existing reset-consumption/checklist/activity/Collateral suites.

Browser modes are initial, address editing, saved, activity open, and
below-fold checklist open. Screenshots and full DOM/computed-element data are
in `baseline-settled/` and `candidate-settled/`. The desktop initial screenshot
was also inspected. No application workflow was started or restarted: doing so
would violate the isolated-only test boundary.

### Initial failures and follow-up checks

The first exact trace comparison failed because each fixture generated a
different reset UUID. The fixture now supplies the same fixed UUID; production
generation is unchanged. Exact traces subsequently matched.

The first browser comparison failed on intermediate animation colors and
geometry. The fixture now waits 1.2 seconds after each action, retaining the
production styles and transitions. Rebuilding and recapturing both variants
produced exact matches. Initial logs/results remain in the evidence directory
and are not rewritten as passes; the final regression logs are
`baseline-final.log` and `candidate-final.log`, and the final browser evidence
is in the two `*-settled` directories. The current runner includes these
fixture corrections for future reproduction.

## Limits

This is bounded parsing equivalence, not full application certification.
Font-loaded rendering, animation-frame equivalence, every breakpoint edge,
browser-native keyboard/focus combinations, PDF opening, unrelated loading/
error panels, full-route queries, and performance were not newly exercised.
Their source/markup/assets remain byte-identical; that is static preservation
evidence, not an assertion of runtime coverage. No full-project clean type
check is claimed; the separately recorded baseline diagnostics are not repaired.
No follow-up duplicates are proposed: broader provider, reset, document,
query, and page verification already have separate work items.
