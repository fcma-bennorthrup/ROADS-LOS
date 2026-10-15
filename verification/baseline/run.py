"""Explicitly authorized, disposable-only current-lock validation.

Run from the repository root: python verification/baseline/run.py
No application startup, build, repair, live API call, or live install.
"""
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import argparse

parser = argparse.ArgumentParser()
parser.add_argument("--summary", action="store_true", help="Include Summary fixtures and build its isolated browser entry")
args = parser.parse_args()

ROOT = Path(__file__).resolve().parents[2]
LOCK = "caf5cbce73ec535033e36984f2c5d00e080a7a91c1575750b7008f7c52e9107e"
PACKAGE = "e3a709a27242fa7cdf8385c115ea3a2ce4a332d1771b1de5e835b0e2bf21f753"
# Individually approved documentation reconciliation; never relax production hashes.
ACCEPTED_DOCS = {
    "SETUP.md": "0226c80b675a0fab6c4df22b562013ceafd42bb8d60d5d0355a2642cb9a392e6",
    "replit.md": "a92e1ae7924aaf64eb78b69e48ea94f81c6998463017a8980244dc1680447e24",
}

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

assert digest(ROOT / "package-lock.json") == LOCK, "Unapproved lock snapshot"
assert digest(ROOT / "package.json") == PACKAGE, "Unapproved package snapshot"
rows = re.findall(r"^\| `([^`]+)` \| (\d+) \| `([0-9a-f]{64})` \|",
                  (ROOT / "docs/architecture-audit/baseline.md").read_text(), re.M)
assert len(rows) == 174
before = {}
for name, _, historical in rows:
    path = ROOT / name
    assert path.is_file() and not path.is_symlink(), name
    before[name] = digest(path)
    assert before[name] == (LOCK if name == "package-lock.json" else ACCEPTED_DOCS.get(name, historical)), name

work = Path(tempfile.mkdtemp(prefix="validation-baseline-"))
copy = work / "copy"
copy.mkdir()
for name in before:
    dest = copy / name
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(ROOT / name, dest)
shutil.copytree(ROOT / "verification/baseline", copy / "verification/baseline")
shutil.copytree(ROOT / "verification/documents", copy / "verification/documents")
if args.summary:
    shutil.copytree(ROOT / "verification/summary", copy / "verification/summary")
# Never inherit environment secrets or user npm configuration.
env = {"PATH": os.environ["PATH"], "HOME": str(work / "home"), "TMPDIR": str(work),
       "TZ": "UTC", "LANG": "C.UTF-8", "CI": "true",
       "npm_config_cache": str(work / "npm-cache"), "npm_config_userconfig": "/dev/null"}
Path(env["HOME"]).mkdir()
results = {"node": subprocess.check_output(["node", "--version"], env=env, text=True).strip(),
           "npm": subprocess.check_output(["npm", "--version"], cwd=work, env=env, text=True).strip(),
           "accepted_lock_sha256": LOCK, "before": before, "commands": []}

def run(label, command, test=False):
    child = env.copy()
    if test:
        child["NODE_OPTIONS"] = "--require=" + str(copy / "verification/baseline/network-guard.cjs")
    with (work / f"{label}.log").open("w") as log:
        result = subprocess.run(command, cwd=copy, env=child, stdout=log, stderr=subprocess.STDOUT)
    results["commands"].append({"label": label, "argv": command, "exit": result.returncode})
    print(label, "exit", result.returncode, flush=True)
    return result.returncode

print("Disposable evidence directory:", work, flush=True)
try:
    # Lock-preserving installation; lifecycle scripts/audit/funding disabled.
    installed = run("install", ["npm", "ci", "--ignore-scripts", "--no-audit", "--no-fund"])
    if installed == 0:
        versions = {}
        for name, entry in json.loads((copy / "package-lock.json").read_text())["packages"].items():
            if not name:
                continue
            manifest = copy / name / "package.json"
            versions[name] = {"locked": entry.get("version"),
                              "installed": json.loads(manifest.read_text()).get("version") if manifest.exists() else None,
                              "optional": entry.get("optional", False)}
        results["versions"] = versions
        run("typecheck", ["node", "node_modules/typescript/bin/tsc", "--noEmit", "--incremental", "false"], test=True)
        run("tests", ["node", "node_modules/vitest/vitest.mjs", "run", "--config", "verification/baseline/vitest.config.ts", "--reporter=verbose"], test=True)
        if args.summary:
            run("summary-browser-build", ["node", "verification/summary/build.mjs"], test=True)
finally:
    results["source_unchanged"] = all(digest(ROOT / name) == h for name, h in before.items())
    results["copy_unchanged"] = all(digest(copy / name) == h for name, h in before.items())
    (work / "results.json").write_text(json.dumps(results, indent=2) + "\n")
    print("Source unchanged:", results["source_unchanged"], "Copy unchanged:", results["copy_unchanged"], flush=True)

# Preserve every diagnostic in the report while exposing failures to callers.
raise SystemExit(0 if results["source_unchanged"] and results["copy_unchanged"]
                 and all(c["exit"] == 0 for c in results["commands"]) else 1)
