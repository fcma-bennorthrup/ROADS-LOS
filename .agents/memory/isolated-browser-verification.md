---
name: Isolated browser viewport verification
description: Chromium window dimensions are not content viewport dimensions in this environment.
---
For isolated browser evidence, assert the measured inner viewport; do not
infer it from Chromium's window-size argument.

**Why:** Headless Chromium here subtracts browser chrome height and enforces a
minimum window width, so nominal mobile captures can silently be desktop-width.

**How to apply:** Use CDP device metrics and verify innerWidth/innerHeight before
accepting screenshots. Keep a distinction between repeatable blocked-font
fixtures and font-loaded visual acceptance; the latter needs approved font bytes.

For exact baseline/candidate comparisons, fix random identifiers as well as
the clock, and allow existing CSS transitions to finish before measuring.

**Why:** Reset UUIDs can differ despite identical storage operations, while
two animation frames can still leave checklist geometry and colors in motion.

**How to apply:** Stabilize fixture inputs rather than normalizing away output
differences or disabling production styles; compare settled captures separately
from animation behavior, which those captures do not certify.

Preserve module URL semantics in disposable browser builds and wait for a paint
after programmatic scrolling before taking comparison screenshots.

**Why:** Eager PDF URL initialization can fail before fixture mount when a
bundler erases `import.meta.url`. Screenshots taken immediately after scrolling
can capture the old position even though synchronous DOM measurements agree.

**How to apply:** Use an ESM-compatible fixture build for consumers with module
URLs. Keep application styles intact and settle scrolling/animations in the
fixture rather than accepting or hiding unexplained pixel differences.

Keep generated Tailwind utilities and bundler-extracted component CSS in
different output files, and include both in disposable HTML.

**Why:** A bundle named like the generated stylesheet can overwrite that file
with extracted raw CSS. Baseline and candidate can then match while both are
missing utilities, so equality alone is not evidence of a valid styled fixture.

**How to apply:** Inspect a rendered capture in addition to comparing hashes;
do not count unstyled matching captures as visual preservation evidence.
