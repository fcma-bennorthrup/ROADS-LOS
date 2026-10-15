# Partial Reset Demo fixtures

`python verification/partial-reset/run.py` creates a disposable baseline and
candidate, installs the accepted lock without scripts, runs guarded tests and
non-emitting type checks, and builds the synthetic Documents browser fixture.
It prints the temporary directory. Supplying that directory as the first
argument reuses its install; existing baseline test evidence is retained.

Serve each built fixture with:

```
python verification/partial-reset/serve.py <temporary-directory>/baseline/verification/partial-reset/dist 3001
python verification/partial-reset/serve.py <temporary-directory>/candidate/verification/partial-reset/dist 3002
```

Open `/verification/partial-reset/index.html`, not the live app. External
requests must also be blocked in the browser automation context. Use viewport
sizes 1440×900, 1024×768 and 390×844; wait for existing overlay animations before
comparing geometry. Fonts are existing app fonts; do not substitute a new font.

The `window.resetFixture` object provides automation-only controls:

- `confirm(false)` for cancellation; `confirm(true)` for acceptance.
- `deny("loan-closing-package:one")` for package removal denial.
- `deny("loan-closing-disclosures:one")` for disclosure write denial.
- `deny(null)` to restore writes before a manual retry.
- Load the initial fixture URL with `?queue` for deferred fake Web Locks.
  `release()` succeeds and `release(true)` rejects the oldest queued write.
- Add `&timer` to seed package generation due in five seconds.
- `navigate("two")` replaces the loan provider; `navigate("one")` returns.
- `storage()` captures disposable storage; `calls` and `opens` capture fake
  loan requests and PDF opening arguments. No real PDF destination is opened.

The fake lock deliberately can invoke its callback after cancellation. This
checks the storage-side cancellation guard rather than relying only on the
browser to remove cancelled requests from its lock queue.
