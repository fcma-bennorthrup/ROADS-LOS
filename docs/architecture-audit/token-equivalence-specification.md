# Token equivalence — proposed read-only check specification

## Status and approval gate

**Map and exemptions explicitly approved by the user in the task conversation.**
This is a SHARED-014 specification, not permission to normalize styles.
Matching names or values alone do not establish intended semantic equivalence.
The bounded map below is authorized for read-only assertions. No production,
style, asset, dependency, runtime configuration or shared harness file has been
edited for this specification.

## Proposed authored-value map

Only the following comparisons are proposed. Read declarations structurally;
do not execute application modules to discover values. Record each mapped
value explicitly in the test fixture after approval, rather than deriving
expected values from the source being checked.

| Group | Exact proposed mapping |
|---|---|
| Text colors | TS `colors.text.{primary,secondary,tertiary,brand,link,reverse,error,warning,information}` to CSS `--roads-text-<same key>` |
| Background colors | TS `colors.background.{page,primary,dark,brand,brandSubtle,error,errorSubtle,warningSubtle,informationSubtle,light,action,errorDisabled,discoverySubtle,success}` to CSS `--roads-bg-<kebab-case key>` |
| Icon colors | TS `colors.icon.{dark,brand}` to CSS `--roads-icon-<same key>` |
| Border colors | TS `colors.border.{subtle,dark,brand,reverse}` to CSS `--roads-border-<same key>` |
| Typography | TS entries `headline-100`, `headline-200`, `headline-300`, `body-100`, `body-200`, `body-200-strong`, `caption-100`, `caption-100-strong`, `label-strong`: `size/weight/lineHeight` to corresponding CSS utility `font-size/font-weight/line-height` |
| Spacing | TS `component-{3xs,2xs,xs,m,l,s,xl,2xl,3xl}` and `layout-xs` to CSS `--roads-spacing-<exact key>` |
| Radius | TS `radius.{2xs,xs,round}` to CSS `--roads-radius-<same key>` and Tailwind `borderRadius.roads-<same key>` |
| Font | TS `fontFamily` to CSS `--roads-font-family` and index.css root `--font-sans`; Tailwind sans retains reference `["var(--font-sans)"]`; CSS typography utilities retain `var(--roads-font-family)` |
| Tailwind spacing subset | `roads-{3xs,2xs,xs,m,l,xl}` to TS `spacing.component-<suffix>`; `roads-layout-xs` to TS `spacing.layout-xs` |
| Tailwind typography subset | All nine TS typography names above **except body-200**, compared fieldwise to Tailwind `fontSize`; weight numbers may be serialized as decimal strings solely for comparison |
| Tailwind literal colors | `brand.DEFAULT` to `colors.text.brand`; `brand.subtle` to `colors.background.brandSubtle`; `warning.DEFAULT/subtle` to `colors.text.warning/colors.background.warningSubtle`; `info.DEFAULT/subtle` to `colors.text.information/colors.background.informationSubtle`; `error.DEFAULT/subtle` to `colors.text.error/colors.background.errorSubtle` |
| Showcase color references | The existing 22 explicit `colorSections` entries each retain their TS path and named CSS variable relationship: 8 text (no tertiary), 9 backgrounds (page through informationSubtle), 2 icon, 3 border (no dark). Compare values for those pairs only; do not require an exhaustive showcase. |

Literal colors and lengths are exact authored strings, not approximate rendered
matches. No HSL-to-hex conversion, rem-to-px conversion, tolerances, inferred
aliases or cross-theme equality. A missing/duplicate declaration or unexpected
mapped value fails; do not automatically update expected values.

## Proposed exemptions (preserve, do not repair)

These are bounded exclusions from **cross-representation equality**, not
evidence that the differences are defects or permission to ignore future drift.
Pin the current source values/presence separately after approval.

- CSS-only colors: `--roads-bg-action-disabled: #8ab4d0`,
  `--roads-bg-discovery: #6f5ed3`, `--roads-bg-success-subtle: #d7f4d7`,
  `--roads-text-success: #2bb656`.
- CSS-only `headline-400`: 16px / 600 / 24px, letter-spacing 0.
- Tailwind has no roads spacing keys for component-s, component-2xl,
  component-3xl; no fontSize entries for body-200 or headline-400.
- Tailwind `brand.dark`, status colors and default radius extensions are
  independent; global `--radius: .5rem` is not a ROADS radius equivalence.
- All global semantic HSL values, including dark overrides, remain independent
  of ROADS hex tokens. Preserve Tailwind semantic variable references and the
  ordered fallback/relative-color border declarations without equating colors.
- Showcase semantic captions remain literal content, not computed-color
  assertions. Primary/secondary/muted/destructive captions do not establish
  equality to semantic HSL output. Warning/info use literal Tailwind mappings
  but their caption/content behavior remains DS-001 scope.
- Preserve existing TS insertion order, incomplete showcase catalog, utility
  declarations and CSS cascade order. No token additions, caption corrections,
  generation, new routes or source reordering.

## Preflight evidence and limits

Local read-only manifest comparison: 174 paths checked, 170 match the original
audit. Differences: SETUP.md, replit.md, server/index.ts and package-lock.json.
The five token-related source files all match the historical manifest.
The accepted dependency report explicitly authorizes the current lock for
isolated validation; it reports 15 static diagnostics, not a clean type check.
Do not silently replace the historical manifest or bypass its runner gate.
The additional local differences were reconciled before execution: the two
documentation hashes match the separately approved setup work and existing
page runners. Replacing only the current logging middleware with its preserved
original reconstructs the historical server/index.ts hash exactly. The
token-owned runner pins these departures without modifying the shared gate.

Current relevant SHA-256 values:

| File | SHA-256 |
|---|---|
| client/src/styles/design-tokens.css | `6e51b38f22e12e4f35634a4f8a34e4264f0a3a3b1703684207ca566c7eec4b71` |
| client/src/lib/design-tokens.ts | `3c9be49c70294c8245487cf1d36989a813b9edf5c4c8371d2494b6646ec34f3a` |
| client/src/index.css | `08ec13d2c8507f47d81063831d9d4d1815dae36db8012176bd988cc970939c70` |
| tailwind.config.ts | `dc4c25f8cdd13c655c6eafa397f44dfd8fa5c5234795e361a6d29d5430872817` |
| client/src/pages/design-system.tsx | `96f6edb185e8b4fbe5034901176e9d9de145545f4a7e4a1defc0d1f499ed3aca` |
| package.json | `e3a709a27242fa7cdf8385c115ea3a2ce4a332d1771b1de5e835b0e2bf21f753` |
| package-lock.json | `caf5cbce73ec535033e36984f2c5d00e080a7a91c1575750b7008f7c52e9107e` |

## Execution and acceptance after approval

Use the accepted disposable environment and existing shared safety fixtures,
synthetic records, disposable storage, UTC/fixed clock, unchanged CSS/fonts,
and blocked/fake external transports. Never mount live App, use real financial
or GitHub endpoints, or fetch Figma to redefine this map.

1. Record whole production/dependency manifests before and after in project
   and isolated copy. Separately report historical drift versus task changes.
2. Assert every approved mapping and exemption; report missing, duplicate,
   unexpected and mismatched values individually. Unknown mappings require
   review rather than guessed equivalence.
3. Compare baseline/candidate emitted CSS bytes and ordered rules using the
   same accepted toolchain and original content-scan scope. Keep test fixtures
   outside client/src so their class strings cannot affect production scanning.
   Source hashes alone do not establish emitted-CSS identity.
4. Cover all shared controls and Documents Sheet/popover in isolated fixtures:
   default, hover, focus, disabled, error; loaded and blocked font conditions;
   1440×900, 1024×768, 390×844 and applicable breakpoint edges. Inspect overlays
   and below-fold content, exact text/DOM order, computed styles, scrolling and
   keyboard/focus. No new showcase route; DS-001 remains separate.
5. Report actual pass/fail/blocked/unverified for each requirement. No repair
   or expected-snapshot refresh is authorized by a failure.

The user subsequently chose **Continue the full verification**, explicitly
authorizing download and pinning of the existing referenced fonts for
disposable fixtures only, with external requests blocked during testing.
This does not authorize app font changes or a new dependency snapshot.

**Historical results:** 219 authored-value/reference/order assertions passed in
the disposable copy. Two production-scope stylesheet emissions are byte
identical. All 174 manifest files remain unchanged in project and copy.
See [token-equivalence-results.md](token-equivalence-results.md) for evidence
and limits. The full isolated browser matrix was executed in both font states:
all 1,602 DOM/computed-state comparisons match, while four of 576 PNG pairs
fail exact pixel equality. These failures are preserved, not normalized.
Strict visual acceptance is blocked; no clean visual or performance pass is
claimed. The read-only checks and failure report are delivered without repairs.

After completion synchronization introduced other approved changes, the user
explicitly authorized **Verify the newly merged source**. This accepts the
current local application source as a separate verification baseline, not a
new dependency snapshot or new token expectations. The pinned manifest includes
the 174 historical paths plus 11 added source files, preserving the complete
current Tailwind content scan. Both snapshots and their results are retained.
See [token-equivalence-current-results.md](token-equivalence-current-results.md)
for the rerun rather than extrapolating the historical browser findings.

The subsequent completion synchronization is covered by a separately retained
188-file manifest under the same current-source verification direction.
Authored checks and CSS were rerun; fixture input hashes establish which shared
control evidence is unchanged, and Documents consumers are rechecked separately.
This does not relax exact-image equality or erase either earlier failure report.
