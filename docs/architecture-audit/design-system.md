# Design System architecture audit

## Status, authority and baseline

Audit only; **no routing, application, token, style, dependency or test changes**. All recommendations require individual approval. The current local source is authoritative, not Figma, GitHub, documentation counts or a remote revision.

Read `baseline.md`, `shared.md`, `coverage.md`, `replit.md` and the existing audit constraints before review. Compared all **174 manifest files** by raw-byte SHA-256 and byte length against the baseline captured **2026-10-14T19:56:49.831770+00:00** (aggregate `ab0f85c1707e2b9355037c78a4d365dddba7e0019bf5559bb40659facabbee92`). Initial and final checks: **zero missing/mismatched files**; enumeration using the baseline exclusions found **no additional first-party files**. No affected section was blocked. This report is excluded from that manifest by design.

Only `docs/architecture-audit/design-system.md` is changed. The page and all of its transitive first-party imports were inspected; shared infrastructure remains lead-owned. Third-party internals and remote Figma data were not inspected. Memory already records the applicable audit constraints; no new durable decision requiring another memory file was made.

## Reachability and responsibility boundary

- `client/src/main.tsx:1–5` mounts App and imports global CSS. `client/src/App.tsx:6–18,22–37` imports and registers six loan pages plus Not Found, but does **not** import or register DesignSystemPage.
- A first-party source search for `DesignSystemPage` and the page module found only its definition at `client/src/pages/design-system.tsx:82`. There is no current application route or navigation contract for this page. An unmatched path uses Not Found; visiting a guessed `/design-system` URL is not a way to validate the showcase.
- Absence of a route is **not a defect** and is not a recommendation to route or delete the file. This is a supporting, dormant style-guide source.
- Its direct dependencies are Card/CardHeader/CardTitle/CardContent, Button, Input, Label, Badge and four TypeScript token objects. Each UI wrapper imports `cn`; `cn` delegates to clsx and tailwind-merge. Button has Radix Slot capability, unused here; Label uses Radix Label.
- The page has **no props, React hooks, context reads, effects, subscriptions, timers, queries, mutations, storage access, loan data or API calls**. It neither owns nor invokes GitHub sync. App's global providers are separate shared concerns, not dependencies of this unmounted module.
- The page does not import its own CSS. An isolated render must explicitly load the existing global stylesheet, tokens and font setup. Rendering JSX without them is not a visual equivalence check.

## Complete source behavior inventory

These are static contracts **if mounted in an isolated fixture**, not claims of a currently accessible screen or browser-verified appearance. All section order, text, test IDs, native semantics and existing no-op behavior are preservation requirements.

| Section / evidence in `client/src/pages/design-system.tsx` | Content, layout and state contract |
|---|---|
| Module data, :8–60 | Four explicitly ordered color groups; typography, spacing and radius use module-level Object.entries arrays. No sorting, runtime fetch or recomputation on input editing. Preserve insertion order, including component-s after component-l. |
| ColorSwatch, :62–80 | Noninteractive flex row with 48px square, name, literal hex and CSS-variable-name text. Background is the **TS value**, not `var(cssVar)`. Only the exact lowercase string `#ffffff` gets `1px solid #dee1e1`; all others get no border. `min-w-0` on text wrapper; no explicit truncation/copy/tooltip. |
| Shell and header, :82–91 | `min-h-screen bg-background`, `max-w-6xl mx-auto p-8 space-y-12`; exact heading “ROADS LOS Design System” and description. No loan shell, side navigation, toolbar, back link or theme toggle. |
| Color Palette, :93–111 | Four cards: Text Colors (8), Background Colors (9), Icon Colors (2), Border Colors (3): **22 swatches**. Grid 1 column, sm 2, lg 3; gap-6. Card titles retain their shared div semantics rather than becoming headings. |
| Typography Scale, :113–136 | **9 TS entries**, each with uppercase name, size / lineHeight / weight text, and the same pangram. Sample receives the class name, not inline spec properties. Column layout becomes baseline-aligned row at sm; metadata gets sm:w-48. Separators omitted on last row. |
| Spacing Scale, :138–158 | **10 entries**: labels, literal pixel values and primary-colored h-4 rounded-sm bars whose inline width is the value. Widths are subject to flex layout/shrink; fixed width claims alone do not prove actual measured bar widths at narrow sizes. No wrap/overflow handler. |
| Border Radius, :160–178 | **3 entries**: 2xs 4px, xs 8px, round 9999px. 80px primary-colored squares use inline radius and retain captions. Flex wrap, gap-8, items-end. |
| Components / Buttons, :180–202 | Five variant examples (Default, Secondary, Outline, Ghost, Destructive), then three size examples (Small, Default, Large). All **8 are enabled**, native buttons, no handlers, no surrounding form. Pointer/keyboard activation produces no application action, navigation, toast or persistence. Shared hover/active/focus CSS still applies. |
| Form Elements, :204–227 | Enabled text input starts empty with “Enter text...”; browser-owned uncontrolled value. Its label is linked by `htmlFor`. Typing, clearing, paste and ordinary text selection have native semantics; there is no validation, required flag, maxlength, save/cancel, submission or change listener. Second input is natively disabled and empty with “Disabled...”; no input/edit transition. IDs are fixed, so a fixture must mount only one page. |
| Badges, :229–241 | Default, Secondary, Outline, Destructive. Shared Badge renders **div**, not button/link, with no tabIndex or action. Hover elevation is styling, not evidence of click behavior. |
| Cards, :243–271 | Two nested examples, Loan Application and Document Review, retain current descriptive copy, body styling and text-lg title overrides. One column becomes two at sm. Entire cards are noninteractive. |
| Semantic Color Mapping, :275–307 | Six tiles: Primary (Brand), Secondary, Muted, Destructive (Error), Warning, Information. Literal labels/hex captions are independent of class-derived background colors. Grid 1/sm 2/lg 3. Primary/secondary/destructive use semantic foregrounds, muted/warning use foreground, information uses text-white. No editing or switching mode. |

### Interaction and edge-state contract

- Input editing does not update React state; a normal retained DOM node preserves its current native value, while a fresh mount starts without a value prop. Browser autofill/restoration was not exercised. There is no supported persistence contract to extend.
- Native button tab/focus/Enter/Space behavior and label-to-input association must remain. Disabled input is not an enabled tab stop. Native buttons have no explicit `type`; because this page contains no form, they do not submit here. Wrapping the examples in a form would alter that contract.
- Shared button focus-visible ring and hover/active overlays are defined in `ui/button.tsx:7–38` and `index.css:208–244`; input focus/disabled styling in `ui/input.tsx:5–19`. Label's peer-disabled classes do not automatically dim this page's label: the input is nested after it and is not a `peer` (`ui/label.tsx:7–20`; page :217–225). Do not “fix” that appearance during extraction.
- No loading, API error, empty-data, success, retry, dirty, save or cancel state exists. Empty input is valid. Long input remains a native single-line field. Static collection order and count define the empty/error boundary; malformed token data has no runtime guard, but there is no external token input at runtime.
- Light CSS is the baseline. A `.dark` ancestor changes semantic variables (`index.css:98–161`), but not literal TS swatches, hardcoded semantic captions or the root ROADS values. No page theme control exists; actual application dark-mode entry was not established.
- External font loading can swap fallback sans-serif for Source Sans Pro (`client/index.html:7–9`, `index.css:61,168–170`). Offline/font-failure metrics and wrapping have not been measured. No page-specific asset or document dependency exists.

## Dependency and file coverage

| File(s) inspected | Scope and conclusion |
|---|---|
| `client/src/pages/design-system.tsx:1–311` | Entire owned module, every section and example, all data transforms and native interactive elements. Cohesive static showcase; no business orchestration to extract. |
| `client/src/lib/design-tokens.ts:1–118` | All color/typography/spacing/radius exports, fontFamily and aggregate/default export. Sole first-party importing module found is the dormant page. |
| `client/src/styles/design-tokens.css:1–129` | All custom properties and typography utilities; CSS has additional entries beyond TS/showcase. |
| `client/src/components/ui/card.tsx:1–85` | All forwarding wrappers and exports. Card div/background/border/shadow; header/content spacing; title utility overrides. CardFooter/CardDescription unused by this page. |
| `client/src/components/ui/button.tsx:1–62` | All variants, sizes, defaults, ref/props forwarding and asChild path. Current page never requests icon size, disabled button or Slot. |
| `client/src/components/ui/input.tsx:1–23`, `label.tsx:1–24`, `badge.tsx:1–38` | Entire wrappers and defaults. No owned effects/data dependencies; native input, Radix label and div badge semantics preserved. |
| `client/src/lib/utils.ts:1–6` | Entire class merge helper. Changing merge strategy could change effective utility precedence across all consumers. No recommendation to replace it. |
| `client/src/index.css:1–245` | Token import, Tailwind layers, light/dark semantic variables, body styles, focus-related color inputs and elevation pseudo-elements. Unrelated search/contenteditable selectors also checked; not active on this page. |
| `tailwind.config.ts:1–145`, `postcss.config.js:1–6` | Content scanning, default responsive breakpoints (no custom screens), semantic mappings, radius/spacing/font extensions, plugins and CSS processing. Page is scanned even though not routed. |
| `client/src/App.tsx:1–76`, `main.tsx:1–5`, `client/index.html:1–16`, `vite.config.ts:1–40` | Reachability, entry/CSS/font loading, aliases and build boundary. App siblings/providers are not traversed as page-owned descendants. Their behavior is covered by the lead. |
| `package.json:1–120`, `tsconfig.json:1–23`, `vitest.config.ts:1–19`, `client/src/test/setup.ts:1–6` | Relevant runtime/UI/test dependencies and validation boundary. jsdom setup clears localStorage; it does not load the app stylesheet or fonts. Package scripts have no test entry. |
| `replit.md:23–40`, `.agents/skills/figma-design-system-compliance/SKILL.md` | Existing Rural First and strict per-token approval constraints. Instructional token counts are not stronger than current source. No Figma calls made. |
| Manifest test inventory and first-party import/reference searches | No dedicated design-system, token-parity or direct showcase-interaction tests found; no references to its section/swatch/input test IDs in test/spec files. Other loan/shared tests are not proof of this page's contracts and remain their owners' coverage. |

### Shared consumption and unused exports

- Button/Badge also serve GitHubSyncPanel and ConflictResolutionDialog; Card/CardContent serve Not Found; Input serves GitHubSyncPanel. UI-level imports additionally connect Button to carousel/sidebar, Input to sidebar and Label to form. These are shared consumers, not reasons to change those modules in this page report.
- `buttonVariants` is **not unused**: calendar, pagination and alert-dialog import it. `badgeVariants` has internal Badge use but no external first-party importer found. CardDescription and CardFooter have definitions/exports but no first-party consumer found.
- Token `fontFamily` is used inside the `designTokens` aggregate, while neither the aggregate/default export nor fontFamily has an external first-party consumer found. All four token groups are used by the showcase. Export absence from an active JS graph is not permission to delete a public supporting module.
- CSS utility generation scans `client/src/**/*.{js,jsx,ts,tsx}` (`tailwind.config.ts:5`), including the unrouted page and TS token keys. Deleting them can affect emitted CSS independently of JS routing. No bundle build, dead-code proof, bundle-size measurement or removal recommendation was made.

## Token/showcase observations for lead consolidation

These are evidence additions to **SHARED-014**, not competing token-refactor proposals. Its decision remains **Awaiting user approval**.

1. **Proven catalog coverage difference, intent unverified:** showcase has 22 colors while TS defines 29. Omitted TS entries are text.tertiary; background.light/action/errorDisabled/discoverySubtle/success; border.dark (page :8–51; TS :1–39). CSS has **33** color properties: it adds **four** not represented by TS, bg-action-disabled, bg-discovery, bg-success-subtle and text-success (CSS :23,26,28,30). Do not confuse omissions with unused declarations.
2. **Typography coverage differs:** nine TS styles are rendered; CSS also defines headline-400 (:80–86) absent from TS. The shared nine specs match the authored CSS size/weight/line-height values. Spacing's ten values and radius's three match their CSS properties; ordering is deliberately not numerically sorted. Tailwind's ROADS spacing extension exposes only seven keys (:104–112). Different representations are not automatically intended to have equal key sets.
3. **Independent representations are real:** swatches read TS values, display a hand-written variable name, but never resolve that property. Typography displays TS metadata and separately applies a CSS class. A change to one representation can make documentation disagree with its sample without a TypeScript error (page :62–76,117–131).
4. **Semantic captions are not exact color assertions:** the first four tile backgrounds use HSL variables (:280–294; index.css :38–50), whereas the captions are literal hex. For example secondary `hsl(200 39% 93%)` converts to approximately RGB(230,239,244), not caption `#e5eff4` (229,239,244). This is a proven authored-value discrepancy, **not a measured browser pixel defect** or proof that one source should overwrite another. Warning/info use matching literal Tailwind values (:91–98). Dark semantic backgrounds diverge further from fixed captions.
5. **Shared UI is not a literal token gallery:** Button/Badge/Input use rounded-md (Tailwind .375rem), Card rounded-xl, and samples use typography/utilities such as text-sm/font-medium rather than always a named ROADS style. “Label Strong” is example text, while Label applies text-sm/font-medium instead of label-strong. Default library shadow/border/radius semantics and source order are part of the existing baseline. Normalizing any of this would change appearance and is not an internal-only improvement.

No production user-facing defect is established for this unmounted page. Catalog omissions and caption differences are supporting-documentation limitations; no route addition, missing-token addition, recoloring, label change or shared-export deletion is proposed. If the lead later proposes any such change, it requires a separate behavior/appearance scope exception and the existing token approval process. SHARED-012 owns validation environment gaps; this audit does not independently retry or remedy them.

## Individually approvable page recommendation

### DS-001 — Characterize the dormant showcase before any approved internal refactor

- **Priority / confidence / category:** P3 / high for coverage gap / maintainability and verification, not a functional fix.
- **Exact evidence:** `client/src/pages/design-system.tsx:8–60,82–307`; `client/src/App.tsx:22–37`; `vitest.config.ts:7–10`; `client/src/test/setup.ts:1–6`; baseline test inventory and test/spec reference search found no showcase tests.
- **Observed problem:** Detailed static content, ordering, no-op button contracts and uncontrolled/disabled input behavior have no dedicated regression coverage. A future cleanup could change the supporting page or accidentally route it without a focused signal. Generic jsdom tests cannot verify token cascade, fonts or responsive appearance.
- **Suggested internal change:** After approval, add a **test-only**, isolated direct-render characterization fixture for the existing page. Assert current inventory and interactions without routing it or rewriting markup/tokens. Keep token equivalence/check-generation work in SHARED-014, not this change.
- **Benefit:** Establish a reliable reference for later approved page-only maintenance; not additional product functionality.
- **Scope / affected consumers:** New tests/fixture for DesignSystemPage using the existing five UI primitives; no shared primitive change and no App routing modification.
- **Behavior-preservation rationale:** Tests observe today's outputs, including incomplete catalogs, no-op examples and current ordering. They must not “correct” fixtures to a desired design, make the disabled input interactive or add error/submit states.
- **Risk:** Low for application behavior if fixture remains test-only; medium risk of misleading visual confidence if CSS/fonts are omitted or incidental generated class formatting is over-snapshotted.
- **Dependencies:** SHARED-012's approved reproducible test setup; safe disposable browser fixture with existing CSS/fonts. No external service access, loan records, GitHub requests or live application rendering. Coordinate scope with SHARED-014 to avoid duplicate token-parity tests.
- **Effort:** Approximately 0.5–1 day after the test environment is available.
- **Specific regression/visual/interaction plan:** (1) Assert 22 color swatches in four groups, 9 typography rows, 10 spacing rows in current order, 3 radii, 8 buttons, 2 inputs, 4 badges, 2 example cards and 6 semantic tiles. Retain exact copy/test IDs. (2) Type/paste/clear the enabled input, activate its label, confirm the disabled field stays disabled/empty and skip it in keyboard tab order. Click and keyboard-activate each button; assert no navigation, submission or request. Remount and verify initially empty input, without asserting browser autofill behavior. (3) Assert the live App route table remains unchanged and no showcase import is added. (4) In an isolated browser fixture, load identical CSS and compare before/after screenshots at widths 375, 639, 640, 1023, 1024 and 1440; inspect sections individually below the fold, enabled focus, hover/active buttons, disabled input, loaded/blocked-font conditions. Capture current `.dark` ancestry as a conditional CSS state, not a new product feature. Compare computed typography, semantic backgrounds, borders/radii and spacing-bar geometry; do not accept changed pixels as “token fixes.” (5) Recheck the production import graph to exclude fixture code. No measured speed claim.
- **Decision:** **Awaiting user approval**. Approval of this report is not approval to add these tests.

## Performance, uncertainty and checks not performed

All collections are small and static; Object.entries runs at module evaluation, not on native input changes. No request duplication, effect-lifecycle leak or validation race exists in this page's authored code. Module-level descriptors and keys are already appropriate; splitting every section or adding memoization has no demonstrated benefit. Runtime cost for this page on current routes is not established beyond its absence from the App import graph; Tailwind scanning is a separate build-time concern.

No render profiles, bundle sizes, browser screenshots, visual equivalence checks, keyboard sessions, test execution, builds or new type checks were performed. No workflow was started/restarted and no active app browser was opened: runtime observations were restricted to disposable fixtures by the assignment, and none was needed to support these static findings. Font loading, pixel-level HSL rounding, narrow-screen overflow, browser autofill, accessibility-tree behavior and actual installed-library behavior remain unverified. Shared report's failed type check is a prior lead observation, not a check this reviewer ran.

Final verification was a repeat read-only manifest comparison plus added-file enumeration, and a report scope check. The downstream lead consolidation already covers next steps; no duplicate follow-up task or implementation work was queued.
