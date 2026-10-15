# Screenshot evidence availability

The Playwright harness delivered the screenshot captures as attached observation IDs rather than local files. They are indexed in `../report.md`. The browser-test tool explicitly collects screenshots automatically and does not permit calling `page.screenshot()` directly, so this directory contains no fabricated or empty image files.
