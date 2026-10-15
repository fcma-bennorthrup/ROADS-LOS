---
name: Isolated visual comparisons
description: Timing and evidence-retention constraints for exact browser comparisons
---
Wait for the existing dialog and scrollbar transitions to settle before
comparing exact screenshots. Do not disable animations or relax pixel
thresholds to conceal a timing mismatch.

**Why:** Short capture delays produced transient geometry and small pixel
differences between equivalent conflict-viewer fixtures; a settled capture
passed exact comparisons with unchanged CSS.

**How to apply:** Separate transient capture timing from application regressions.
Keep reproducible fixtures committed; disposable `/tmp` evidence may disappear
before handoff, so explicitly distinguish observed results from retained assets.
