"""Disposable, accepted-lock verification. No live App/server or credentials."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

root = Path(__file__).resolve().parents[2]
assert hashlib.sha256((root / "package-lock.json").read_bytes()).hexdigest() == \
    "caf5cbce73ec535033e36984f2c5d00e080a7a91c1575750b7008f7c52e9107e"
work = Path(tempfile.mkdtemp(prefix="conflict-diff-"))
copy = work / "copy"
copy.mkdir()
for name in ["client", "shared", "verification/baseline", "verification/conflict-diff"]:
    shutil.copytree(root / name, copy / name)
for name in ["package.json", "package-lock.json", ".npmrc", "tsconfig.json",
             "tailwind.config.ts", "postcss.config.js"]:
    if (root / name).exists():
        shutil.copyfile(root / name, copy / name)
before = {str(p.relative_to(copy)): hashlib.sha256(p.read_bytes()).hexdigest()
          for p in copy.rglob("*") if p.is_file()}
env = {"PATH": os.environ["PATH"], "HOME": str(work / "home"), "TMPDIR": str(work),
       "TZ": "UTC", "LANG": "C.UTF-8", "npm_config_userconfig": "/dev/null",
       "npm_config_cache": str(work / "cache")}
Path(env["HOME"]).mkdir()
print("Evidence:", work, flush=True)
with (work / "install.log").open("w") as log:
    subprocess.run(["npm", "ci", "--ignore-scripts", "--no-audit", "--no-fund"],
                   cwd=copy, env=env, stdout=log, stderr=subprocess.STDOUT, check=True)
versions = {}
for name, entry in json.loads((copy / "package-lock.json").read_text())["packages"].items():
    if not name:
        continue
    manifest = copy / name / "package.json"
    installed = json.loads(manifest.read_text())["version"] if manifest.exists() else None
    assert installed == entry.get("version") or (installed is None and entry.get("optional")), name
    versions[name] = installed
(work / "versions.json").write_text(json.dumps(versions, indent=2))
guarded = dict(env, NODE_OPTIONS="--require=" + str(copy / "verification/baseline/network-guard.cjs"))
subprocess.run(["node", "verification/conflict-diff/build.mjs"], cwd=copy, env=guarded, check=True)
subprocess.run(["node", "verification/conflict-diff/capture.mjs", shutil.which("chromium"), str(work)],
               cwd=copy, env=env, check=True, timeout=240)
for name, digest in before.items():
    assert hashlib.sha256((root / name).read_bytes()).hexdigest() == digest, name
    assert hashlib.sha256((copy / name).read_bytes()).hexdigest() == digest, name
(work / "preservation.json").write_text(json.dumps(before, indent=2))
