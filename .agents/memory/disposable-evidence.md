---
name: Disposable verification evidence retention
description: Temporary isolated run evidence can disappear between resumed sessions.
---
Retain permitted small logs, measurements and preservation ledgers immediately
after an isolated run, before pausing or submitting completion.

**Why:** A successful disposable run's temporary directory was unavailable after
a session resumed, requiring another installation and verification solely to
recover evidence.

**How to apply:** Keep execution in disposable storage, but copy safe report
evidence into the task's owned evidence directory in the same command. Do not
retain credentials, installed dependencies or large generated browser assets.
