"""Provider-only disposable verification. Never starts App or alters the project."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[2]
# Explicit user approval: "Yes—profile the merged code".
# This is an immutable capture, never regenerated implicitly on drift.
ACCEPTED = json.loads((ROOT / "verification/providers/accepted-source.json").read_text())

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

before = {}
for name, expected in ACCEPTED.items():
    path = ROOT / name
    assert path.is_file() and not path.is_symlink(), name
    before[name] = digest(path)
    assert before[name] == expected, f"Unresolved baseline drift: {name}"
# Catch newly introduced local imports as well as changed existing modules.
for directory in ("client", "server", "shared"):
    for path in (ROOT / directory).rglob("*"):
        if path.is_file() and path.suffix in (".ts", ".tsx", ".css", ".html"):
            assert str(path.relative_to(ROOT)) in ACCEPTED, f"Uncaptured source: {path}"

work = Path(tempfile.mkdtemp(prefix="provider-verification-"))
copy = work / "copy"
for name in before:
    target = copy / name
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(ROOT / name, target)
for scope in ("baseline", "providers"):
    shutil.copytree(ROOT / "verification" / scope, copy / "verification" / scope)
env = {"PATH": os.environ["PATH"], "HOME": str(work / "home"), "TMPDIR": str(work),
       "TZ": "UTC", "LANG": "C.UTF-8", "CI": "true", "npm_config_cache": str(work / "npm-cache"),
       "npm_config_userconfig": "/dev/null"}
Path(env["HOME"]).mkdir()
results = {"before": before, "commands": [], "node": subprocess.check_output(
    ["node", "--version"], env=env, text=True).strip()}

def run(label, command, guarded=False):
    child = env.copy()
    if guarded:
        child["NODE_OPTIONS"] = "--require=" + str(copy / "verification/baseline/network-guard.cjs")
    with (work / f"{label}.log").open("w") as log:
        status = subprocess.run(command, cwd=copy, env=child, stdout=log, stderr=subprocess.STDOUT).returncode
    results["commands"].append({"label": label, "argv": command, "exit": status})
    print(label, status, flush=True)

print(work, flush=True)
try:
    run("install", ["npm", "ci", "--ignore-scripts", "--no-audit", "--no-fund"])
    if results["commands"][-1]["exit"] == 0:
        versions = {}
        for name, entry in json.loads((copy / "package-lock.json").read_text())["packages"].items():
            if not name:
                continue
            manifest = copy / name / "package.json"
            version = json.loads(manifest.read_text())["version"] if manifest.exists() else None
            assert version == entry.get("version") or (version is None and entry.get("optional")), name
            versions[name] = version
        results["installed_versions"] = versions
        run("fixtures", ["node", "node_modules/vitest/vitest.mjs", "run", "--config",
                         "verification/providers/vitest.config.ts", "--reporter=verbose"], True)
        run("regressions", ["node", "node_modules/vitest/vitest.mjs", "run", "--config",
                            "verification/baseline/vitest.config.ts",
                            "client/src/components/loan/__tests__/ChecklistPanel.test.tsx",
                            "client/src/components/loan/__tests__/LoanActivityPanel.test.tsx",
                            "--reporter=verbose"], True)
finally:
    results["source_unchanged"] = all(digest(ROOT / n) == h for n, h in before.items())
    results["copy_unchanged"] = all(digest(copy / n) == h for n, h in before.items())
    (work / "results.json").write_text(json.dumps(results, indent=2) + "\n")
    print("preservation", results["source_unchanged"], results["copy_unchanged"], flush=True)
raise SystemExit(0 if results["source_unchanged"] and results["copy_unchanged"]
                 and all(c["exit"] == 0 for c in results["commands"]) else 1)
