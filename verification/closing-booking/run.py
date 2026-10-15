"""Page-only disposable verification; reuses the accepted baseline guards/config.

Run: python verification/closing-booking/run.py
No live App, project install, source rewrite, or external application request.
"""
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[2]
# Separately accepted lock and documentation-only setup corrections.
ACCEPTED = {
    "package-lock.json": "caf5cbce73ec535033e36984f2c5d00e080a7a91c1575750b7008f7c52e9107e",
    "SETUP.md": "0226c80b675a0fab6c4df22b562013ceafd42bb8d60d5d0355a2642cb9a392e6",
    "replit.md": "a92e1ae7924aaf64eb78b69e48ea94f81c6998463017a8980244dc1680447e24",
}

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

rows = re.findall(r"^\| `([^`]+)` \| (\d+) \| `([0-9a-f]{64})` \|",
                  (ROOT / "docs/architecture-audit/baseline.md").read_text(), re.M)
assert len(rows) == 174
before = {}
for name, _, historical in rows:
    path = ROOT / name
    assert path.is_file() and not path.is_symlink(), name
    before[name] = digest(path)
    assert before[name] == ACCEPTED.get(name, historical), f"Unaccepted baseline: {name}"

work = Path(tempfile.mkdtemp(prefix="closing-booking-verification-"))
copy = work / "copy"
copy.mkdir()
for name in before:
    dest = copy / name
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(ROOT / name, dest)
for suite in ["baseline", "closing-booking"]:
    shutil.copytree(ROOT / "verification" / suite, copy / "verification" / suite)
env = {"PATH": os.environ["PATH"], "HOME": str(work / "home"), "TMPDIR": str(work),
       "TZ": "UTC", "LANG": "C.UTF-8", "CI": "true",
       "npm_config_cache": str(work / "npm-cache"), "npm_config_userconfig": "/dev/null"}
Path(env["HOME"]).mkdir()
results = {"before": before, "commands": [],
           "node": subprocess.check_output(["node", "--version"], env=env, text=True).strip()}

def run(label, command, guarded=False):
    child = env.copy()
    if guarded:
        child["NODE_OPTIONS"] = "--require=" + str(copy / "verification/baseline/network-guard.cjs")
    with (work / f"{label}.log").open("w") as log:
        result = subprocess.run(command, cwd=copy, env=child, stdout=log, stderr=subprocess.STDOUT)
    results["commands"].append({"label": label, "argv": command, "exit": result.returncode})
    print(label, "exit", result.returncode, flush=True)
    return result.returncode

print("Disposable evidence directory:", work, flush=True)
try:
    if run("install", ["npm", "ci", "--ignore-scripts", "--no-audit", "--no-fund"]) == 0:
        versions = {}
        for name, entry in json.loads((copy / "package-lock.json").read_text())["packages"].items():
            if not name:
                continue
            manifest = copy / name / "package.json"
            actual = json.loads(manifest.read_text()).get("version") if manifest.exists() else None
            versions[name] = {"locked": entry.get("version"), "installed": actual,
                              "optional": entry.get("optional", False)}
            assert actual == entry.get("version") or (actual is None and entry.get("optional")), name
        results["versions"] = versions
        if "--prepare-browser" in sys.argv:
            run("browser-build", ["node", "node_modules/vite/bin/vite.js", "build", "--config",
                                 "verification/closing-booking/browser/vite.config.ts"], True)
        else:
            run("tests", ["node", "node_modules/vitest/vitest.mjs", "run", "--config",
                          "verification/closing-booking/vitest.config.ts", "--reporter=verbose"], True)
finally:
    results["source_unchanged"] = all(digest(ROOT / name) == h for name, h in before.items())
    results["copy_unchanged"] = all(digest(copy / name) == h for name, h in before.items())
    (work / "results.json").write_text(json.dumps(results, indent=2) + "\n")
    print("Source unchanged:", results["source_unchanged"], "Copy unchanged:", results["copy_unchanged"], flush=True)
raise SystemExit(0 if results["source_unchanged"] and results["copy_unchanged"]
                 and all(c["exit"] == 0 for c in results["commands"]) else 1)
