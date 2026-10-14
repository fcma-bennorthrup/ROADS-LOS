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
