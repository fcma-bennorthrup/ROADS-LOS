"""Run fallback-only characterization in a disposable accepted-lock copy."""
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
ACCEPTED = {
    # Separately approved metadata-only logging; see api-logging-verification.md.
    "server/index.ts": "2eee6c655d508e045a980256d4aa57624ce3c336ac9fe0758d6b0b003fc6d64d",
    "package-lock.json": "caf5cbce73ec535033e36984f2c5d00e080a7a91c1575750b7008f7c52e9107e",
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
    p = ROOT / name
    assert p.is_file() and not p.is_symlink(), name
    before[name] = digest(p)
    assert before[name] == ACCEPTED.get(name, historical), f"Unaccepted baseline: {name}"

work = Path(tempfile.mkdtemp(prefix="not-found-verification-"))
copy = work / "copy"
for name in before:
    dest = copy / name
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(ROOT / name, dest)
for owned in ("baseline", "not-found"):
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
            "verification/not-found"])
        if "--fonts-dir" in sys.argv:
            source = Path(sys.argv[sys.argv.index("--fonts-dir") + 1]).resolve()
            ledger = json.loads((source / "ledger.json").read_text())
            for entry in ledger["files"]:
                assert Path(entry["name"]).name == entry["name"]
                assert digest(source / entry["name"]) == entry["sha256"]
            shutil.copytree(source, work / "fonts")
            run("browser", ["node", "verification/not-found/capture.mjs"])
        elif "--download-fonts" in sys.argv:
            # User-approved one-time acquisition, outside the browser. Runtime
            # network stays blocked; no fonts or package bytes enter the project.
            if run("fonts", ["python", "verification/not-found/fonts.py", str(copy),
                             str(work / "fonts")], False) == 0:
                run("browser", ["node", "verification/not-found/capture.mjs"])
finally:
    results["source_unchanged"] = all(digest(ROOT / p) == h for p, h in before.items())
    results["copy_unchanged"] = all(digest(copy / p) == h for p, h in before.items())
    (work / "results.json").write_text(json.dumps(results, indent=2) + "\n")
    print("Preserved:", results["source_unchanged"], results["copy_unchanged"], flush=True)
raise SystemExit(0 if all(c["exit"] == 0 for c in results["commands"])
                 and results["source_unchanged"] and results["copy_unchanged"] else 1)
