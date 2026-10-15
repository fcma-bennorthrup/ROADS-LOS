"""Disposable credential-sync checks; never start the live application.

Usage: python verification/credential-sync/run.py [baseline-routes.ts]
Uses the accepted installed dependency snapshot after checking every version.
No install, network, credential-file inventory, or live runtime state access.
"""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

root = Path(__file__).resolve().parents[2]
lock_bytes = (root / "package-lock.json").read_bytes()
assert hashlib.sha256(lock_bytes).hexdigest() == "caf5cbce73ec535033e36984f2c5d00e080a7a91c1575750b7008f7c52e9107e", "Unaccepted dependency snapshot"
lock = json.loads(lock_bytes)
for name, entry in lock["packages"].items():
    if not name:
        continue
    installed = root / name / "package.json"
    if not installed.exists():
        assert entry.get("optional"), f"Missing dependency: {name}"
    else:
        assert json.loads(installed.read_text())["version"] == entry["version"], f"Version drift: {name}"

work = Path(tempfile.mkdtemp(prefix="credential-sync-"))
copy = work / "copy"
copy.mkdir()
for folder in ["verification/credential-sync", "verification/baseline", "client/src", "server", "shared"]:
    # Explicit source-only roots; never copy local runtime files or credentials.
    for src in (root / folder).rglob("*"):
        if src.is_file() and not src.is_symlink() and src.suffix in {".ts", ".tsx", ".css", ".mjs", ".cjs", ".py"}:
            target = copy / src.relative_to(root)
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(src, target)
for name in ["package.json", "tsconfig.json", "vitest.config.ts", "vite.config.ts", "tailwind.config.ts", "postcss.config.js"]:
    src = root / name
    if src.is_file():
        shutil.copyfile(src, copy / name)
(copy / "node_modules").symlink_to(root / "node_modules", target_is_directory=True)
(work / "home").mkdir()
env = {"PATH": os.environ["PATH"], "HOME": str(work / "home"), "TMPDIR": str(work),
       "TZ": "UTC", "LANG": "C.UTF-8", "CI": "true",
       "NODE_OPTIONS": "--require=" + str(copy / "verification/baseline/network-guard.cjs")}
command = ["node", "verification/credential-sync/routes.mjs"]
if len(sys.argv) > 1:
    source = Path(sys.argv[1])
    assert hashlib.sha256(source.read_bytes()).hexdigest() == "b1f60f4195b34c2f947d0cda50bedebe6a3d217bc7257fd791afc31f42ce9045", "Wrong route baseline"
    shutil.copyfile(source, work / "baseline-routes.ts")
    command.append(str(work / "baseline-routes.ts"))
print("Disposable copy:", copy, flush=True)
result = subprocess.run(command, cwd=copy, env=env)
raise SystemExit(result.returncode)
