"""Run narrow History checks in a disposable copy; never start App/server."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

root = Path(__file__).resolve().parents[2]
assert hashlib.sha256((root / "package-lock.json").read_bytes()).hexdigest() == "caf5cbce73ec535033e36984f2c5d00e080a7a91c1575750b7008f7c52e9107e"
work = Path(tempfile.mkdtemp(prefix="history-loan-scope-"))
copy = work / "copy"
copy.mkdir()
for name in ["client", "shared", "verification"]:
    shutil.copytree(root / name, copy / name)
for name in ["package.json", "package-lock.json", "vitest.config.ts", "tsconfig.json", "tailwind.config.ts", "postcss.config.js"]:
    if (root / name).exists():
        shutil.copyfile(root / name, copy / name)
# Verify installed package versions against the already accepted lock before reuse.
lock = json.loads((root / "package-lock.json").read_text())
for name, item in lock["packages"].items():
    if not name:
        continue
    manifest = root / name / "package.json"
    if not manifest.exists() and item.get("optional"):
        continue
    assert json.loads(manifest.read_text())["version"] == item["version"], name
os.symlink(root / "node_modules", copy / "node_modules", target_is_directory=True)
env = {"PATH": os.environ["PATH"], "HOME": str(work), "TMPDIR": str(work),
       "TZ": "UTC", "LANG": "C.UTF-8", "CI": "true",
       "NODE_OPTIONS": "--require=" + str(copy / "verification/baseline/network-guard.cjs")}
print("Disposable copy:", copy, flush=True)
result = subprocess.run(["node", "node_modules/vitest/vitest.mjs", "run", "--config",
                         "verification/history-loan-scope/vitest.config.ts"], cwd=copy, env=env)
raise SystemExit(result.returncode)
