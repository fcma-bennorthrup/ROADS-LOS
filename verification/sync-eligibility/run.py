"""Disposable, offline eligibility tests. Never starts the live application."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

root = Path(__file__).resolve().parents[2]
baseline_ref = "22e6da3e4e387703ff0dffb0a203e97f80f303e0"
lock = (root / "package-lock.json").read_bytes()
assert hashlib.sha256(lock).hexdigest() == "caf5cbce73ec535033e36984f2c5d00e080a7a91c1575750b7008f7c52e9107e"
for name, entry in json.loads(lock)["packages"].items():
    if not name:
        continue
    installed = root / name / "package.json"
    if not installed.exists():
        assert entry.get("optional"), f"Missing dependency: {name}"
    else:
        assert json.loads(installed.read_text())["version"] == entry["version"], f"Version drift: {name}"
work = Path(tempfile.mkdtemp(prefix="sync-eligibility-"))
copy = work / "copy"
for folder in ["verification", "server", "shared", "client/src", "test"]:
    for src in (root / folder).rglob("*"):
        if src.is_file() and not src.is_symlink() and src.suffix in {".ts", ".tsx", ".mjs", ".cjs", ".py", ".css"}:
            dest = copy / src.relative_to(root)
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(src, dest)
for name in ["package.json", "tsconfig.json", "vitest.config.ts", "tailwind.config.ts", "vite.config.ts"]:
    shutil.copyfile(root / name, copy / name)
(copy / "node_modules").symlink_to(root / "node_modules", target_is_directory=True)
# Pinned clean local checkout at assignment, not a remote revision.
baseline = work / "baseline"
shutil.copytree(copy, baseline, symlinks=True)
for name in ["routes.ts", "github.ts", "sync-mechanics.ts", "conflict-detection.ts"]:
    (baseline / "server" / name).write_bytes(subprocess.check_output(
        ["git", "show", f"{baseline_ref}:server/{name}"], cwd=root))
(baseline / "server/sync-eligibility.ts").unlink()
env = {"PATH": os.environ["PATH"], "HOME": str(work), "TMPDIR": str(work),
       "TZ": "UTC", "LANG": "C.UTF-8", "CI": "true",
       "NODE_OPTIONS": "--require=" + str(copy / "verification/baseline/network-guard.cjs")}
print("Disposable copy:", copy, flush=True)
subprocess.run(["node", "verification/sync-eligibility/check.mjs", str(baseline)],
               cwd=copy, env=env, check=True)
for label, directory in [("baseline", baseline), ("candidate", copy)]:
    check = subprocess.run(["node", "node_modules/typescript/bin/tsc", "--noEmit", "--incremental", "false"],
                           cwd=directory, env=env, capture_output=True, text=True)
    (work / f"{label}-types.txt").write_text(check.stdout + check.stderr)
    print(label, "typecheck exit:", check.returncode, flush=True)
    print(check.stdout)
print("Evidence:", work)
