# Pipeline layout regression checks

Run `npm run test:pipeline-layout` from the repository root.

This starts and stops a separate Vite fixture on loopback port 4175, rendering the
real Pipeline page, navigation, dialogs, footer, and production styles. It does
not use the legacy app workflow, an artifact, the database, or saved loans.
Playwright intercepts `/api/loans` with one synthetic Sales Support loan and
rejects every other API request. Operations must remain empty. GitHub sync has
an inert context, rather than a live provider that polls external services.

The Chromium cases cover All Loans, Sales Support, and Operations at
1440px and 390px, plus expanded navigation at 1440px, 800px, and 390px
and footer layout with zero, one, and twenty synthetic records:

- Exact header labels, readable font size, and content staying within its cell,
  including active sort arrows.
- Header/body column boundaries and requested-amount alignment for populated queues.
- Left-aligned Stage in Operations' sixth column.
- A locally scrollable table and fully reachable Actions header/view link.
- Search fields, custom filters, pagination, New Loan source choices/cancel,
  and the prototype admin menu remain available without creating anything.
- Explicit hover-revealed expansion and keyboard collapse, ROADS branding,
  and content displacement without sidebar overlap.
- Footer after content and bottom-aligned on tall viewports with short lists;
  decorative filler does not change actual row counts.

This is geometry-based regression coverage, not pixel snapshot comparison.
Each case writes header and right-scrolled screenshots under the ignored
`generated-artifacts/pipeline-layout/` directory. Failures also retain a browser
trace. Existing interaction tests remain in `client/src/pages/pipeline.test.tsx`.

Replit's system Chromium is selected when available (downloaded Chromium needs
shared libraries not provided by the normal Nix shell). Elsewhere run
`npx playwright install chromium` once, with the OS dependencies required by
Playwright. An explicit `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` overrides selection.
No application workflow or production code changes are required.

## Loan navigation and panel coexistence

Run `npm run test:pipeline-layout -- loan-panel-overlays.spec.ts` for focused
coverage of Checklist, Loan Activity, and both panels open together. The
`?loanPanels` fixture uses the real LoanHeader, BottomToolbar, ChecklistPanel,
LoanActivityPanel, navigation, and state providers without loading a saved loan.
It runs in a fresh browser context; every API request is blocked and the tests
assert that no API request was attempted.

The checks cover backdrop hit testing above panel controls and loan tabs,
background accessibility hiding, forward/reverse keyboard focus trapping,
programmatic background-focus blocking, close/Escape/outside-click dismissal,
and focus restoration to the navigation trigger. Expanded checklist contents,
activity search/sort/results, unsaved input, panel visibility, and shell geometry
must survive each dismissal. Clicking over a panel's close button must dismiss
only navigation, and panel controls must work again afterward.
Screenshots for all three combinations are saved with the test output.
