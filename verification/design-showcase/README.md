# Dormant showcase characterization

Run from the repository root:

```sh
python3 verification/design-showcase/run.py
```

This is a test-only direct render, not an application route or a preview artifact.
The runner rejects source/dependency drift before creating a disposable `/tmp`
copy. Its task-specific aggregate covers client/server/shared files and ordinary
root files; it excludes symlinks and secret-like root names. The accepted
whole-source exception must not be generalized to other verification tasks.

Installation is locked, without lifecycle scripts. Only package retrieval and
the existing declared-font downloader use external transport. The font
stylesheet and bytes are archived with hashes in the disposable evidence folder.
The browser receives inline local CSS/font bytes; all network hosts are blocked.
No App, provider, server, loan records, or financial/GitHub transport is mounted.
The shared network guard is reused, not rewritten.

`capture.mjs` compiles the existing five primitives and existing global CSS via
the locked esbuild/Tailwind versions. Its production input graph is recorded.
Chromium is controlled through anonymous pipes with a disposable profile, fixed
Date/timezone and asserted actual viewport. No listening server is started.

Evidence: `results.json`, command logs, `fonts/ledger.json`,
`captures/bundle-inputs.json`, `captures/evidence.json`, and PNG captures under
the printed temporary directory. Keep this generated output out of Git.
Failures have nonzero exit status. There is no snapshot-update command.

The text/order fingerprints protect the complete rendered copy and test-ID order,
including literal captions and the deliberate spacing insertion order. They are
not token-parity assertions. Browser checks cover counts, actual clipboard paste,
typing, clearing, pointer/keyboard buttons, label activation, native tab order,
disabled input, and remount reset. All sections are tiled below the fold, with
additional focus/hover/active captures. Geometry/computed styles are recorded and
compared before/after the unchanged page's remount.

Screenshot pairs measure consecutive settled capture repeatability within one
state, not independently built baseline/candidate visual equivalence. No
production change exists to compare. Font-blocked and font-loaded states are
intentionally not required to look equal. Chromium-only evidence is not an
accessibility, cross-browser, performance or whole-application certification.
