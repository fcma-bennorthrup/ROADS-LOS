# Fallback routing verification

## Status

**Completed bounded verification.** 32 isolated jsdom tests pass against
unchanged production bytes. The subsequently approved font acquisition enabled
the browser checks recorded below. No accessibility certification, performance,
production-runtime or HTTP hosting pass is claimed.

The current dependency snapshot was explicitly accepted for disposable
validation in `validation-baseline.md`. Historical differences are limited to
that accepted lock, the separately authorized setup documentation hashes, and
the approved metadata-only server logging change documented below.
The historical baseline has not been overwritten.

## Delivered checks and reproduction

Run `python verification/not-found/run.py` from the project root.
The page-owned runner reuses `verification/baseline` unchanged, checks all 174
audit paths against their historical or explicitly accepted hashes, makes a
fresh disposable copy, and installs only the accepted lock with lifecycle
scripts disabled. It runs only this task's tests and verifies all 174 source
and copy hashes afterward. Existing tests and shared fixtures are not edited.

Node v24.13.0; UTC; Date fixed to 2026-10-14T16:00:00.000Z by the accepted setup.
Environment is allowlisted; no secret values or user npm configuration are
inherited. Installation is the sole network-enabled step. Runtime transport is
blocked by the existing Node preload/browser guards. Fetch is replaced with a
strict fixture allowlist; unexpected calls throw and fail teardown. Fake
responses are in memory; no server, live App, GitHub service, database,
financial service, document operation or workflow is used.

The disposable App is real, including Wouter's Switch and browser-location
hook, NotFound, keyed providers, disclosure subscriptions, GitHub sync hook,
query defaults, toaster and Radix dialog. Five known loan pages are narrow
context-observing sentinels. Summary stays real for the root/missing-data
distinction. This does not characterize the five pages' internal rendering.
Each test gets a new QueryClient with production defaults and empty disposable
storage. Teardown unmounts, clears the client, dismisses notifications and
restores instrumentation.

## Measured results

| Proof item | Result |
|---|---|
| Accepted-lock disposable installation | Exit 0 |
| Task tests | Exit 0; 1 file, 32 tests passed |
| Root redirect / Summary route | `/` becomes `/loans/1`; fake null data shows generic error, not fallback |
| Missing loan | Fake 404 yields `Failed to load loan data`, distinct from unmatched nested path |
| Five known section routes | Actual Switch selects the correct sentinel |
| Unknown and support-name routes | Fallback; URL unchanged; only fake conflict GET requested |
| Query/hash, case, slash, encoded segments | Real Wouter matches query/hash, single trailing slash, uppercase route and encoded ID examples; repeated slash/extra suffix examples reach fallback |
| Exact fallback markup | Literal native H1/paragraph, child order, SVG classes, merged shared Card classes, no card-owned controls/main/live region |
| Same-key unknown route | Activity-panel open state and checklist state retained; no provider rewrite/subscription replacement |
| Generic unknown route | `prototype` storage writes in observed checklist-then-activity order; old subscriptions removed |
| Return to loan / loan B | Persisted A data restored, panel closed; B does not inherit A fixture records |
| Cleanup | Disclosure storage/custom listeners removed by identity; conflict query has zero observers after unmount |
| Disclosure event while on fallback | Same-key event updates reset version; old-loan event after key change does not survive remount |
| Corrupt/denied storage | Fallback remains rendered; no automatic dialog |
| Empty/cached/failed conflict GET | No auto-open; cached case zero GETs, other cases one with no retry |
| Inherited dialog | Survives route change; real Radix hides background from accessible tree; Escape closes; active element becomes body in jsdom |
| Delayed fake sync completion | Fake 409 after loan-page unmount opens conflict dialog and toast; Escape closes dialog, toast remains |
| Back/Forward | jsdom history traversal exercises real browser-location hook and provider remount behavior |
| Remount | App unmount/remount restores saved fixture records, not panel openness; **not real browser reload** |
| Preservation | All 174 source and disposable-copy files unchanged before/after |

One initial test assertion failed because it tried to locate the background H1
as an accessible heading while a real modal correctly hid the background.
The assertion was corrected to explicitly protect that observed Radix behavior
and separately check the H1's DOM presence. No production repair or snapshot
replacement occurred. The final passing output is in `not-found-evidence/`.

## Initial blocker (resolved by explicit user approval)

At the initial handoff no browser pass had run. The outstanding checks were:

- Browser Back/Forward and genuine document reload, keyboard Tab/Shift+Tab,
  overlay focus containment and restoration in a browser (jsdom is not proof).
- Baseline/candidate fixture screenshots and computed layout comparison at
  1440×900, 768×1024 and 375×812; enlarged text, dark theme, loaded and blocked
  fonts, clipping/overflow, and inherited overlays.
- The general contract's other default captures (1024×768 and 390×844), as
  applicable to the browser matrix.

There are no `.woff`, `.woff2`, `.ttf` or `.otf` files in `client` or
`attached_assets`. `client/index.html` references Google Fonts for Source Sans
Pro and Inter. The task requires blocked/fake external transports and existing
fonts held constant. Fetching new font bytes or silently using fallback fonts
would not prove the required loaded-font baseline. Request approval for a
one-time retrieval of the existing declared fonts into disposable storage,
then serve those pinned bytes locally with all browser networking blocked;
alternatively the user can supply those font files. No font retrieval has
been performed.

The prior baseline's static-check failure remains a reported existing limit,
not a newly executed failure or a repaired gate. This work does not authorize
provider/key extraction, API error changes, sync changes or other repairs.
Existing downstream tasks cover those boundaries; no duplicate follow-ups
are proposed. The browser proof below supersedes the initial blocked status.

## Completed browser proof

The user explicitly approved a one-time download of the app's declared fonts.
`fonts.py` retrieved the exact stylesheet URL in `client/index.html`, pinned 26
font resources in disposable storage, and rewrote only fixture stylesheet URLs
to local paths. The font ledger records URLs, byte counts and SHA-256 hashes.
No font assets or production styles were added to the repository.

Reproduction with that explicit acquisition permission:

```sh
python verification/not-found/run.py --download-fonts
```

Final run: install, 32 tests, font acquisition and browser checks all exited 0.
All 174 audited paths remained unchanged in the workspace and disposable copy.
Evidence logs and ledgers are in `not-found-evidence/`.

Chromium 152.0.7977.64 ran through CDP pipes in a disposable profile. Every
browser request was intercepted and fulfilled from local fixture bytes or
blocked; DNS was disabled, CSP denied connections, and fake fetch had no
network fallback. No live server or workflow was started. The fixture uses
the real App/router/providers/overlays, with five known-page sentinels, as in
the unit tests. Existing accepted esbuild/Tailwind compiled unchanged source
and CSS. No dependencies were added.

The browser matrix covers 1440×900, 768×1024, 375×812, 1024×768 and 390×844,
each with light/dark, normal/200% root text size, and locally loaded/blocked
fonts: **40 pairs, 80 captures**. Each pair compares two fresh loads of the
same unchanged production fixture, not two different production revisions.
All paired PNG hashes and measured DOM/layout values match exactly. FontFace
status confirms Source Sans Pro actually loaded in enabled cases. The ledger
records heading, paragraph, icon, card and canvas bounds, typography, colors,
spacing and viewport/document dimensions. No document overflow was measured.
This is repeatable V-class characterization, not evidence for a future refactor.

Browser interactions also passed:

- Tab/Shift+Tab on bare fallback leaves body active, with no page-owned controls.
- Same-key unknown-route return retains panel openness.
- Native Back/Forward across prototype remount closes the panel but restores
  saved loan data. Genuine Page.reload preserves storage and restores data.
- Inherited real dialog keeps Tab/Shift+Tab within it; Escape closes it and
  returns focus to body when the prior trigger no longer exists.
- Delayed synthetic 409 after navigation opens the real conflict dialog and
  toast; Escape closes the dialog while the notification remains.
- No uncaught browser exceptions or unexpected fixture requests.

Representative desktop, narrow enlarged dark, and inherited conflict/toast
captures were visually inspected. Existing fixed gray text against the dark
semantic card is visibly low contrast; enlarged narrow text wraps over multiple
lines. These current behaviors are preserved, not repaired or certified
accessible. Any contrast change requires separate approval.

Raw screenshots, bundles, browser profile and font bytes remain disposable,
outside Git. Small capture metadata/hashes, browser version and font ledger
are retained. Future font downloads may return different upstream bytes;
compare ledger hashes before combining evidence from different acquisitions.
The enlarged-text check is root-font enlargement, not browser zoom or a screen
reader test. Browser overlay interaction was exercised at desktop size; the
responsive matrix characterizes the fallback itself, not every resolver state.
The existing baseline static-check diagnostics were not rerun or repaired.

## Current-tree revalidation after the logging merge

Completion checking detected that the earlier evidence preceded the approved
server logging merge. That evidence is superseded by a fresh complete run on
the current local tree. The runner now pins exactly this additional accepted
path, with no relaxation for any other file:

- `server/index.ts`:
  `2eee6c655d508e045a980256d4aa57624ce3c336ac9fe0758d6b0b003fc6d64d`.
- Authority: `api-logging-verification.md`, metadata-only request logging.

The final run used `--fonts-dir` pointing to the earlier disposable font
directory, validating font hashes and reusing the pinned bytes without another
download. Installation, 32 tests, and all browser checks exited 0; both copies
of all 174 audited paths remained unchanged. The refreshed `results.json`
contains the exact verified per-path snapshot, including the logging change.
Browser output and capture metadata were replaced with this run's evidence.
No backend was executed; accepting this already-approved hash does not broaden
the fallback verification scope.
