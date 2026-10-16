# Approved token verification

Scope and exact map: `docs/architecture-audit/token-equivalence-specification.md`.
No production module, configuration, dependency, CSS or token is edited.

## Reproduce

1. For the user-approved merged source:
   `python verification/tokens/run.py --baseline docs/architecture-audit/token-equivalence-evidence/approved-completion-baseline.json`
   Without `--baseline`, the runner checks the original historical snapshot
   and correctly rejects subsequently merged source changes.
2. Take the printed `/tmp/token-verification-…` directory as `<work>`.
3. Only with the recorded font-preparation authorization:
   `python verification/tokens/prepare-fonts.py <work>/fonts`
4. `python verification/tokens/browser.py <work>`

The first command uses the accepted lock in a disposable install. Font
preparation permits only the stylesheet already referenced by client/index.html
and its fonts.gstatic.com resources. It verifies the committed font manifest;
changed remote bytes fail rather than silently replacing expected fixtures.
The browser build embeds the pinned font bytes, uses file URLs, and blocks
HTTP(S)/WS(S), fetch, XHR, WebSocket and window.open. Tests never load App.
Existing system Chromium and accepted dependencies are used; no new dependency
or browser installation is part of these commands.

The approved merged-source manifest includes all original audit paths plus
all current files under client/server/shared. The runner rejects missing,
changed or newly unpinned source files. It independently enforces the original
accepted dependency hashes and five token-map source hashes, even when an
explicit source manifest is supplied. It never generates or refreshes a
baseline itself. Later source drift requires a new decision, not an automatic
hash update. Historical results remain alongside separately named current
evidence.

For a documented affected-scene follow-up after proving unchanged shared
fixture dependencies and CSS, use
`python verification/tokens/browser.py <work> "" documents,documents-error,documents-empty`.
This writes a separately labeled selected-scene result, not a full-matrix
pass. Do not use it to omit changed shared controls.

## Matrix

- All 47 `components/ui` wrapper modules have direct synthetic consumers in
  controls.tsx or overlays.tsx. Both custom ROADS controls are also mounted.
- Forms exercise variants, disabled controls, an invalid input and a real
  react-hook-form error. Collections cover static, expandable, scrollable and
  resizable surfaces. Navigation includes breadcrumb, pagination, menu, command
  and sidebar. Chart coverage is its shared container, not data-chart behavior.
- Dialog, alert dialog, drawer, sheet, popover, tooltip, hover card, dropdown,
  context menu, toast and toaster are separate scenes to avoid overlapping
  portals affecting each other's focus and measurements.
- The actual Documents editor and borrower status cells use synthetic records
  and disposable localStorage. Normal, corrupt-storage error and empty-borrower
  states are separate. The Sheet is opened, keyboard-focused, scrolled to its
  footer and dismissed; the real status popover is opened and dismissed.
- Main viewports: 1440×900, 1024×768, 390×844. Edge widths:
  599/600/601 (Documents), 639/640, 767/768, 1023/1024,
  1279/1280, 1535/1536. Each is checked with loaded and blocked fonts.
  All scenes run at the main viewports; form/collection/navigation/sidebar and
  normal Documents scenes additionally run at the edges.
- Each enabled visible native/focusable element in the main form/collection/
  navigation scenes receives mouse hover and focus probes. Disabled elements
  remain in default snapshots, not forced into impossible focus states.
- Font-loaded runs assert Source Sans Pro and Inter faces actually loaded;
  blocked-font runs assert no downloaded face loaded. The font modes are not
  asserted equal to one another.

## Comparison and limits

Baseline/candidate fixture documents are built from identical, hash-preserved
production files. Exact comparisons include rendered text, ordered element
attributes, values, checked/disabled state, active-element index, scroll
positions, viewport dimensions, element rectangles, computed typography,
colors, spacing, borders, transforms and default pseudo-element content.
PNG hashes are compared for default/open/dismissed and selected interaction
states. Hover/focus sweeps use computed-style/DOM comparisons without a PNG
per individual control. Full-page screenshots include below-fold content;
Documents body scrolling explicitly exposes its lower content and footer.

This proves repeatability and preservation for the synthetic consumers under
the measured browser/toolchain, not every prop combination or application
workflow. It does not certify accessibility, cross-engine compatibility,
business transactions, timer accuracy or performance. The inherited static
check diagnostics are not repaired or concealed.

Animations finish (infinite ones pause at zero) before stable-state captures;
transition trajectories are not measured. Dates/timezone/randomness are fixed.
Native caret timing is not asserted as a business contract.
The fixture main container is deliberately not auto-centered: Chromium
returned inconsistent resolved auto-margins after a datepicker focus despite
identical rectangles on identical input. This was a fixture-only issue; no
production style or comparison tolerance was changed.

Large PNGs, browser profiles, bundles and font bytes stay under `<work>`;
only compact manifests/results belong in the repository. Do not refresh
expected hashes automatically when a check fails.
