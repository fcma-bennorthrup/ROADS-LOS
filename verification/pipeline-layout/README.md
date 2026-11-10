# Pipeline layout regression checks

Run `npm run test:pipeline-layout` from the repository root.

This starts and stops a separate Vite fixture on loopback port 4175, rendering the
real Pipeline page, navigation, dialogs, footer, and production styles. It does
not use the legacy app workflow, an artifact, the database, or saved loans.
Playwright intercepts `/api/loans` with one synthetic Sales Support loan and
rejects every other API request. Operations must remain empty. GitHub sync has
an inert context, rather than a live provider that polls external services.

The six Chromium cases cover All Loans, Sales Support, and Operations at
1440px and 390px:

- Exact header labels, readable font size, and content staying within its cell,
  including active sort arrows.
- Header/body column boundaries and requested-amount alignment for populated queues.
- Left-aligned Stage in Operations' sixth column.
- A locally scrollable table and fully reachable Actions header/view link.
- Search fields, custom filters, pagination, New Loan source choices/cancel,
  and the prototype admin menu remain available without creating anything.

This is geometry-based regression coverage, not pixel snapshot comparison.
Each case writes header and right-scrolled screenshots under the ignored
`generated-artifacts/pipeline-layout/` directory. Failures also retain a browser
trace. Existing interaction tests remain in `client/src/pages/pipeline.test.tsx`.

Replit's system Chromium is selected when available (downloaded Chromium needs
shared libraries not provided by the normal Nix shell). Elsewhere run
`npx playwright install chromium` once, with the OS dependencies required by
Playwright. An explicit `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` overrides selection.
No application workflow or production code changes are required.
