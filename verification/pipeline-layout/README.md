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
No application workflow is needed to run the fixture.

## Complete loan workspace navigation

`workspace-navigation.spec.ts` mounts the real `LoanScope`, `LoanWorkspace`,
providers, and all six page components using the same nested route shapes as
the application. Pipeline links, header tabs, the drawer's Pipeline action,
and the Pipeline breadcrumb drive navigation through the fixture's memory router.
Direct `/loans/:id/history` loads and reloads also work. This is not browser
Back/Forward coverage: in-app route changes do not update browser history.

At desktop and phone widths, checks cover every tab, both Pipeline exits,
workspace unmount/remount, and fresh document loads. Geometry assertions require
the shell, header, and fixed toolbar to remain at the left edge after navigation,
including entry from an expanded Pipeline sidebar. The drawer must stay closed
until explicitly reopened. This caught focus-driven scrolling of the outer loan
shell on phones; that shell clips overflow without becoming a scroll container.
The tab strip and page content retain their own scrolling.

These cases intercept loan-list, loan-detail, and application reads using a blank
synthetic application. Page initialization writes are acknowledged in a
test-local in-memory document with generation/revision assertions. No request
is forwarded: unexpected API requests are aborted and fail the test. Each case
uses a new browser context and checks for uncaught page errors.
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
