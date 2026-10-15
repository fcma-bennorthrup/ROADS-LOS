# Isolated Summary characterization

Run from the repository root:

```sh
python verification/baseline/run.py --summary
```

This reuses the accepted shared setup, network guard and Vitest configuration.
It installs the exact accepted lock only into a fresh temporary copy, includes
the existing suite plus the Summary tests, runs the unchanged type check, then
builds a separate browser fixture. The known type diagnostics still make the
runner exit nonzero: inspect each command result rather than assuming all checks
failed or all checks passed.

The user approved reconciling the two documentation hashes with the separately
approved documentation work. The shared runner now accepts those **exact**
hashes, not arbitrary documentation changes. Its production/asset/dependency
checks remain strict. No original audit baseline is overwritten.

## Unit scope

- `summary.test.tsx`: three production Summary modules, mocked query results
  and shared shell boundaries, literal row/order/value assertions, distinct
  monetary fields, formatting edge cases, borrower flags, mailto and controlled
  clipboard promises. The toast spy proves calls, not real toast appearance.
- `query.test.tsx`: actual React Query and Wouter, production query defaults,
  deferred fake transport, exact request credentials/key, status/parse/network/
  null-response paths and no retry. No App or backend is mounted.
- Shared baseline setup freezes Date, clears jsdom storage and denies external
  transport. These are component tests, not browser layout claims.

## Browser scope

After the runner prints its temporary directory:

```sh
python verification/summary/serve.py /tmp/validation-baseline-EXAMPLE/copy/summary-browser
```

Use only `http://127.0.0.1:4179/loans/synthetic` with a fresh browser context,
UTC timezone and `en-US` locale. Block every browser request outside this
fixture origin and disable service workers. The server exposes only the three
fixture files and SPA entry; `/api/` returns 403. The JavaScript loan response
is synthetic and never goes to that endpoint.

The fixture renders the actual Summary page, header, toolbar, activity,
checklist and toaster with their real local providers; it never imports App.
Sync mutation functions throw and no real sync hook is invoked. Date is fixed,
storage is cleared on reload, confirmation is cancelled, clipboard is inert,
and `window.open`, XHR, WebSocket and beacon operations throw. CSP denies
connections and fonts. The original CSS and token file are compiled unchanged.
Remote Google fonts are deliberately unavailable: this is a reproducible
**font-blocked fallback** capture, not evidence of loaded Google-font metrics.

Supported synthetic URLs:

- `?state=pending`, `?state=error`, `?state=empty`
- `?borrowers=zero`
- `?clipboard=reject`, `?clipboard=unavailable`, `?clipboard=deferred`

The default clipboard resolves. `window.summaryEvidence` records fake request
arguments and copied strings. For deferred mode, its `pendingCopies` array
contains inert `resolve()` and `reject()` functions for controlling completion
order. Use them only in the fixture, not application code.

Capture 1440×900, 1024×768, 390×844 and 767/768/1279/1280 breakpoint widths.
Inspect below-fold scroll, actual computed grid column count and row order,
activity/checklist/menu overlays, Enter/Space activation, focus and toast
replacement. Record observed narrow-layout overflow without changing it.
Do not visit external mailto targets, click sync operations, or mount the live
application. Store binary captures outside Git; retain small textual evidence.

## Preservation and interpretation

Reports must distinguish passed assertions from unverified browser/loaded-font
or performance properties. No snapshots are automatically updated to make
checks pass. No desired future copy-button name or currency normalization is
encoded. The current unnamed button and awkward currency values are deliberate
characterization, not approval of those behaviors for future changes.
