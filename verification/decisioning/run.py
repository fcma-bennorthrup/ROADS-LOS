"""Disposable Decisioning checks; reuses the accepted baseline safety setup."""
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[2]
LOCK = "caf5cbce73ec535033e36984f2c5d00e080a7a91c1575750b7008f7c52e9107e"
# Documentation-only changes recorded by the separately approved setup work.
DOCS = {
    "SETUP.md": "0226c80b675a0fab6c4df22b562013ceafd42bb8d60d5d0355a2642cb9a392e6",
    "replit.md": "a92e1ae7924aaf64eb78b69e48ea94f81c6998463017a8980244dc1680447e24",
}
def digest(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

rows = re.findall(r"^\| `([^`]+)` \| (\d+) \| `([0-9a-f]{64})` \|",
                  (ROOT / "docs/architecture-audit/baseline.md").read_text(), re.M)
assert len(rows) == 174
before = {}
for name, _, historical in rows:
    path = ROOT / name
    assert path.is_file() and not path.is_symlink(), name
    before[name] = digest(path)
    assert before[name] == (LOCK if name == "package-lock.json" else DOCS.get(name, historical)), name
work = Path(tempfile.mkdtemp(prefix="decisioning-verification-"))
copy = work / "copy"
for name in before:
    dest = copy / name
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(ROOT / name, dest)
for owned in ("baseline", "decisioning"):
    shutil.copytree(ROOT / "verification" / owned, copy / "verification" / owned,
                    ignore=shutil.ignore_patterns("__pycache__"))
env = {"PATH": os.environ["PATH"], "HOME": str(work / "home"), "TMPDIR": str(work),
       "TZ": "UTC", "LANG": "C.UTF-8", "CI": "true",
       "npm_config_cache": str(work / "npm-cache"), "npm_config_userconfig": "/dev/null"}
Path(env["HOME"]).mkdir()
results = {"before": before, "commands": [], "node": subprocess.check_output(
    ["node", "--version"], env=env, text=True).strip()}
def run(label, args, guarded=True):
    child = env.copy()
    if guarded:
        child["NODE_OPTIONS"] = "--require=" + str(copy / "verification/baseline/network-guard.cjs")
    with (work / f"{label}.log").open("w") as log:
        code = subprocess.run(args, cwd=copy, env=child, stdout=log, stderr=subprocess.STDOUT).returncode
    results["commands"].append({"label": label, "args": args, "exit": code})
    print(label, code, flush=True)
    return code

print(work, flush=True)
try:
    if run("install", ["npm", "ci", "--ignore-scripts", "--no-audit", "--no-fund"], False) == 0:
        run("tests", ["node", "node_modules/vitest/vitest.mjs", "run", "--config",
            "verification/baseline/vitest.config.ts", "--reporter=verbose",
            "verification/decisioning", "client/src/components/loan/__tests__/DecisioningSummaryContent.test.tsx"])
        if shutil.which("chromium", path=env["PATH"]):
            run("browser", ["node", "verification/decisioning/capture.mjs"])
        else:
            results["commands"].append({"label": "browser", "exit": 1,
                                        "blocker": "Existing Chromium not available; no automatic installation"})
finally:
    results["source_unchanged"] = all(digest(ROOT / p) == h for p, h in before.items())
    results["copy_unchanged"] = all(digest(copy / p) == h for p, h in before.items())
    (work / "results.json").write_text(json.dumps(results, indent=2) + "\n")
    print("Preserved:", results["source_unchanged"], results["copy_unchanged"], flush=True)
raise SystemExit(0 if all(c["exit"] == 0 for c in results["commands"])
                 and results["source_unchanged"] and results["copy_unchanged"] else 1)
