# Closing Disclosure supported-browser policy

## Approved difference

The user explicitly approved requiring Web Locks for writes, then approved the
current local source as the comparison baseline with the existing partial-reset
policy and accepted dependency lock retained.

Before: browsers without Web Locks performed uncoordinated synchronous
localStorage read/modify/write, risking cross-window overwrite.

After: generation commits, delivery, borrower saves and disclosure resets throw
an explicit unsupported-browser error before reading/writing history, running
the mutation/commit callbacks or publishing notifications. Reads/PDF access
remain available. Saved bytes and drafts remain unchanged on rejection. The
existing error-blocking/reload recovery behavior and five-second generation
timing remain; this does not proactively disable actions before an attempt.

Exact new message:

> This browser cannot safely update Closing Disclosures because Web Locks are unavailable. Saved disclosure history has not changed. Use a browser with Web Locks support.

The hook and borrower editor show this message using existing alerts. Reset Demo
shows it only when its disclosure step actually throws this error, not when an
earlier package removal fails. Successful earlier package clearing is not
rolled back. No storage migration, automatic retry, PDF, CSS, markup, package
coordination, or real document delivery change is included.

## Reproduction and results

Pre-edit local files were copied to `/tmp/disclosure-coordination/baseline`
before editing; candidate changes went into a separate disposable copy.
Synthetic records, UTC, fixed 2026-10-14T16:00:00Z clock, blocked external
transports, original styles and blocked external fonts were used.
`npm ci --ignore-scripts --no-audit --no-fund` succeeded against lock SHA-256
`caf5cbce73ec535033e36984f2c5d00e080a7a91c1575750b7008f7c52e9107e`.

| Check | Baseline | Candidate |
| --- | --- | --- |
| Relevant Vitest suite | 147 passed, 1 failed | 156 passed, 1 failed |
| Unsupported-policy tests | Not applicable | All 9 passed |
| Non-emitting TypeScript check | 15 diagnostics | Same 15 diagnostics, byte-identical output |
| Static Documents fixture build | Passed | Passed |
| Emitted CSS | Same hashed CSS asset | Same hashed CSS asset |

The unchanged failure is
`ClosingPackageProgress.test.tsx > reports failed reset removal and retains the displayed package progress`:
it still expects the older “Demo could not be reset” message rather than the
already-implemented “Demo reset incomplete” policy. The baseline fails too;
its assertion was not rewritten. Type errors concern the existing GitHub panel
call and ES-target iterator checks in server sync modules. No clean repository
test/type-check claim is made. Early copy omissions of server files and
vite.config.ts were corrected before these final comparisons.

## Real browser evidence

The same tester continued one pass after clarification that the baseline's
unlocked write is intentional before-change behavior, not a candidate defect.
Two independent pages shared a fresh same-origin browser storage context.
Separate incognito contexts would not test contention.

Passed:
- Native-lock simultaneous UI generation allocated distinct IDs 17 and 18,
  with both windows observing 18 records.
- Held native lock barriers: independent borrower field edits merged; conflicting
  same-field dates retained the first committed date and explicitly rejected
  the other edit.
- Reset queued before stale save/generation: reset succeeded, stale editor save
  rejected, old generation did not restore rows; other-loan storage unchanged.
- Both unsupported windows rejected exposed update/reset/borrower APIs.
  Instrumented rejection had zero history reads/writes. Visible history remained.
- User-facing unsupported borrower Save retained its draft and open editor;
  disclosure reset retained history with the new error.
- Partial Reset Demo reported package/document checklist clears and disclosure,
  checklist and activity not cleared; package became empty, CD1 remained.
- Delivery retained metadata, with dates 10/14/2026 and 10/17/2026, method Blend.
- PDF opening retained `["_blank", "noopener,noreferrer"]` and the same sample
  PDF asset. Fixture intercepts window.open; binary assets were not changed.
- Supported text/order and sampled styles/geometry matched at 1440×900,
  1024×768, 390×844, and 600/601/767/768×844 for the populated table, including
  its existing narrow-screen clipping.
- Below-fold CD1, empty and delivered states, desktop editor and popover
  matched. Escape, Cancel and unchanged Save restored focus to the same
  editor trigger on both versions. Generating text/disabled state matched.

Screenshot observation pairs (baseline / candidate): desktop `wo293v / 8o63pk`,
tablet `16eqwi / u95uay`, mobile `yyyb8p / v1ur8u`, 600 `q7mysh / c23vha`,
601 `7t84h0 / d0z9ev`, 767 `q5gake / 0kdmuq`, 768 `duvddp / a7aik5`;
below-fold `uqto64 / 6rxc11`; empty `tazwig / yi0ax6`;
generating `16q4tp / azjus2`; delivered `383oxb / s5unoj`;
editor `djpzmj / ceo12q`; popover `iubm99 / uazpvh`.
Candidate unsupported alert `hglg6u`, retained editor `nhuwuy`,
partial reset `rgp46r`. These are returned observations, not exported PNG files.

## Explicit limits

No exact screenshot-byte/pixel comparison or exhaustive computed-style capture
was performed. Transient generating geometry was not measured before it settled.
Empty/delivered/editor/popover comparisons were desktop-only; only populated
history received the full viewport sweep. External-font-loaded rendering and
other browser engines were not verified.

The browser Deliver button was disabled for the already-delivered newest row
in the unsupported scenario; rejection of the delivery hook is instead covered
by the new isolated unit test. No separate browser subscription-callback-count
or checklist-only reset distinction test was run; real cross-window visible
updates were observed, and existing scoped/global reset and subscription tests
passed. This is bounded evidence, not an assertion that every G state received
exhaustive browser coverage.

The temporary workflow launcher failed without logs twice; the identical static
server command ran successfully as a background process and returned HTTP 200
on both ports. The temporary workflow was removed. No live App was mounted for
verification and no deployment or GitHub operation was performed.
