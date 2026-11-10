# Fee-save toast verification

## Repeatable checks

```sh
npx vitest run client/src/components/loan/__tests__/FeesContent.test.tsx client/src/components/ui/frozen-credit-toast.test.tsx shared/fees.test.ts
node verification/fee-toast/capture.mjs
```

The browser capture uses installed Chromium (override `CHROMIUM_PATH` if needed).
It bundles the real FeesContent and Toaster with isolated in-memory loan state
and a resolved flush; it makes no application, database, or GitHub requests.
Generated HTML, images and measured geometry are ignored under
`generated-artifacts/fee-toast/`.

## Observed results (2026-11-10)

- All 25 focused tests passed. Coverage includes pending/resolved/rejected
  flushes, unchanged unadded draft, repeated saves, no inline success,
  retained save-button focus, manual dismissal, five-second dismissal,
  hover/focus pause and resume, and the existing persistent error behavior.
- Captured and inspected the draft-reminder success state at actual 1440px
  and 320px viewport widths. The toast stayed within both viewports, at the
  existing bottom-right desktop / top narrow placement. Fees action geometry
  was identical before and after the notification.
- Compared with the supplied inspected Figma specification: white surface,
  green accent/check circle, dark title, secondary body, visible close,
  4px radius, 16px padding, 8px title/body gap and existing shadow. No action
  or placeholder copy was introduced, and no design tokens were changed.
- Font limitation: the isolated offline browser declares Source Sans Pro but
  uses the system fallback. These captures confirm layout/colors, not exact
  Source Sans Pro glyph rendering. The pre-existing font-verification work
  remains separate.
- `npm run check` still fails in unrelated files (GitHubSyncPanel,
  SummaryDebugDialog, server conflict-detection/routes/sync-plan); no diagnostics
  were reported in the changed files. No unrelated static-check fixes were made.
- The existing application workflow restarted and served on port 5000.
  The preview screenshot tool could not resolve this legacy app because no
  artifact is registered; isolated Chromium captures above were used instead.
