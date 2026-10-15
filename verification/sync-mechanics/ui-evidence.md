# Task 33 — isolated sync UI acceptance

## Scope and safety

- Tested only an isolated source copy at `/tmp/sync-ui-acceptance-nQ0Dur/copy`.
- Browser origin was `https://sync-ui.invalid`; browser routing served only the built fixture artifacts and aborted other/unmapped requests. No live application, App/router tree, real GitHub, credentials, or `.local` runtime was mounted or accessed.
- The existing credential-sync fixture supplied all API responses with fake `window.fetch`; the Not Found check used the task-owned `not-found-overlay.tsx` composition of the real Not Found page and that synthetic fixture. It did not import `App`.
- Browser timezone was UTC and `Date` was fixed at `2026-10-14T16:00:00Z`. The built fixture CSP used `default-src 'none'`, `connect-src 'none'`, and `font-src 'none'`. No external or unmapped browser requests were observed.
- No client, shared fixture, or production source/config files were changed. The task-owned wrapper and this report are under `verification/sync-mechanics/`.

## Baseline identity

Baseline: `7bdc15140ba63507a43bb70af05fc4b29147eb65`.

`git diff --quiet <baseline> -- client` succeeded: the client tree is unchanged.

| Source | SHA-256 (current and baseline) |
| --- | --- |
| `client/src/components/GitHubSyncPanel.tsx` | `f954a58301eb1851e9bbb622f21e16b36fec8b7fd64ea2030966a7a3533ac3c9` |
| `client/src/components/ConflictResolutionDialog.tsx` | `258f0e8fae840c00d5ba55a4e6a4bbb7c4e3298e4b5bbec4990109dab53ab05d` |
| `client/src/pages/not-found.tsx` | `718a41bd05a163d1db32480aba013f5fe754894e656b6542a8e4b302275b172e` |

## Browser outcomes

- **Panel / selection:** Panel rendered the expected local-change count, unresolved-conflict notice, Resolve action, Pull/Force Pull, commit field, Push/Force Push and Close. Resolve opened the `safe.ts` conflict. Local and Remote tabs selected and showed their respective synthetic content.
- **Manual edit:** Edit Manually opened a textarea prefilled with `local\nsafe`. Entered `synthetic manual edit\nfixture only`; the 1/1 count and Apply enabled state updated.
- **Cancel/dismiss:** Dismiss closed the resolver without applying and recorded only synthetic GET/DELETE/refetch calls. Panel Close returned to the fixture launcher without a sync mutation.
- **Loading/error:** The never-resolving fake conflict GET displayed “Loading Conflicts” / “Fetching conflict details...”. Fake cancellation HTTP 500 left the blocked-conflict dialog open with “Could not cancel conflicts. Please try again.”
- **Not Found overlay:** The real Not Found page rendered its 404 heading and explanatory text behind the conflict dialog. DOM confirmed both 404 and resolver content; the modal was above the dimmed page. This was a direct component composition, not the live route/App.
- **No unexpected requests:** The browser routing gate recorded an empty external/unmapped request list. Fixture API calls were local in-memory fake responses.

## Viewports and comparison

The actual browser `innerWidth × innerHeight` was checked at each requested viewport:

| Viewport | Observed UI and geometry |
| --- | --- |
| `1440×900` | Panel bounds `512×432`, centered; conflict dialog bounds `1024×368`, centered. Baseline/candidate panel PNGs were byte-identical (35,232 bytes). Baseline/candidate Not Found-overlay PNGs were byte-identical (48,281 bytes). |
| `1024×768` | Candidate panel bounds `[256,168,512,432]`; document scroll dimensions stayed `1024×768`. Candidate resolver bounds `[0,200,1024,368]`; document scroll dimensions stayed `1024×768`. Resolver spans viewport width. |
| `390×844` | Panel bounds `[0,198,390,448]`; document scroll dimensions stayed `390×844`. Baseline/candidate panel PNGs were byte-identical (29,357 bytes). Resolver bounds `[0,101.5,390,641]`; outer document stayed within `390×844`, but its detail/diff/action region overflows internally (example: 340px client width / 549px scroll width). Baseline and candidate structured DOM text, bounds, computed styles and overflow metrics compared equal. |

**Unchanged narrow-dialog limitation:** At `390×844`, the conflict resolver clips its reason, tabs, diff and resolution controls horizontally. This is present in both baseline and candidate. A same-flow resolver PNG comparison differed by 70 bytes (36,366 candidate vs 36,436 baseline), despite equal measured DOM/layout/style state; therefore byte-identical resolver pixels are not claimed. A separate comparison using different open histories also differed and was not used as a valid equivalence result.

**Follow-up image analysis (no additional browser run):** ImageMagick's decoded
pixel difference for the same-flow pair is confined to `21×21+309+378`.
Magnified crops show this region is the browser test tool's purple pointer/click
indicator, not application content. Outside that indicator's bounding box the
decoded screenshots are identical. Thus the PNG difference is explained by test
pointer animation; it is not an unexplained application pixel regression.
The original captures were not changed or replaced.

## Font / rendering limits

The fixture intentionally blocks fonts (`font-src 'none'`). Browser `document.fonts` was empty while computed CSS requested `"Source Sans Pro", sans-serif`; no web font loaded. Screenshots therefore verify layout and controls with browser fallback font rendering, not production Source Sans Pro glyph metrics. No font download or external runtime request was made.

## Evidence files

All screenshots are under `/tmp/sync-ui-acceptance-nQ0Dur/evidence/`:

- `panel-baseline-1440x900.png`
- `panel-candidate-1440x900.png`
- `resolver-candidate-1440x900.png`
- `panel-candidate-1024x768.png`
- `resolver-candidate-1024x768.png`
- `panel-baseline-390x844.png`
- `panel-candidate-390x844.png`
- `resolver-baseline-390x844-clickflow.png`
- `resolver-candidate-390x844-clickflow.png`
- `resolver-baseline-390x844.png`
- `resolver-candidate-390x844.png`
- `not-found-overlay-baseline-1440x900.png`
- `not-found-overlay-candidate-1440x900.png`
- `loading-1440x900.png`
- `cancel-error-1440x900.png`

Result: requested sync UI interactions and viewport checks were exercised in a disposable fixture; no backend-refactor UI change was found. Pixel equality was established for panel and Not Found-overlay pairs at the listed matching inputs; mobile resolver pixel equality was not established, and its horizontal clipping is unchanged from baseline.
