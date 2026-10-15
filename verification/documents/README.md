# Isolated Documents verification

Run `python verification/baseline/run.py` from the repository root. The runner
checks accepted hashes before copying and installs only in a disposable `/tmp`
directory. It includes these page fixtures and the shared safety setup. A
nonzero aggregate result is expected while the existing production type errors
remain; do not interpret that as a passed type check.

To reproduce browser checks, use the printed disposable directory, not the
workspace, and run there:

```sh
env -i PATH="$PATH" HOME="$PWD/../home" TZ=UTC \
  NODE_OPTIONS="--require=$PWD/verification/baseline/network-guard.cjs" \
  node node_modules/vite/bin/vite.js build --config verification/documents/vite.config.ts
env -i PATH="$PATH" HOME="$PWD/../home" TZ=UTC \
  python -m http.server 4173 --bind 127.0.0.1 \
  --directory verification/documents/dist
```

Open `/verification/documents/index.html` on that server in a new disposable
browser context with timezone UTC. Block all browser network requests except
the isolated server's static HTML/JS/CSS; block PDF requests too. Never point
these checks at the live application. Use `?scenario=empty`, `404`, `invalid`,
or `delayed` for alternate response branches. Browser fetch is synthetic;
window.open is an inert argument ledger. WebSocket/XHR throw. The real App and
sync hook are not mounted; the header retains its inert closed admin observer.

`window.documentsVerification.navigate("/loans/two/documents")` changes loan;
`navigate("/loans/one/history")` leaves the route for a synthetic placeholder.
These are fixture-only destinations, not new production routes. Reload via the
original index URL, not the rewritten in-memory route.

The fixture uses unchanged production CSS, fixed Date, and synthetic records.
External font loading is intentionally blocked: captures prove fallback-font
geometry only, not loaded-font pixel equivalence. Timer delays remain real in
the browser; unit tests advance fake time. Package deadlines use the fixed
clock. A real-time expiration across a full browser reload is not simulated.

The four production PDFs are only fingerprinted; no contents are extracted.
CD/package emitted URL and byte checks should compare Vite's copied assets,
not open a real document. Public-file open arguments are checked in unit tests.

No dependency versions, runtime configuration, or production code may be
changed to make these checks pass. Record failures and seek separate repair
approval.
