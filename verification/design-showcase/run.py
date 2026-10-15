"""Task-local accepted source; locked disposable install, no live app."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[2]
def digest(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

assert digest(ROOT / "package-lock.json") == "caf5cbce73ec535033e36984f2c5d00e080a7a91c1575750b7008f7c52e9107e"
assert digest(ROOT / "package.json") == "e3a709a27242fa7cdf8385c115ea3a2ce4a332d1771b1de5e835b0e2bf21f753"
paths = []
for directory in ("client", "server", "shared"):
    paths.extend(p for p in (ROOT / directory).rglob("*") if p.is_file() and not p.is_symlink())
paths.extend(p for p in ROOT.iterdir() if p.is_file() and not p.is_symlink()
             and not p.name.startswith(".env") and p.suffix not in (".pem", ".key"))
before = {str(p.relative_to(ROOT)): digest(p) for p in paths}
aggregate = hashlib.sha256("".join(n + "\0" + h + "\n" for n, h in sorted(before.items())).encode()).hexdigest()
assert aggregate == "59b37913f17fd274db127fa2e2a95f4434493063ca2d5d1262e95b3b64d8e39f", "Source drift: obtain task-specific approval; do not refresh automatically"
work = Path(tempfile.mkdtemp(prefix="design-showcase-"))
copy = work / "copy"
for name in before:
    dest = copy / name
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(ROOT / name, dest)
for scope in ("design-showcase", "baseline"):
    shutil.copytree(ROOT / "verification" / scope, copy / "verification" / scope)
env = {"PATH": os.environ["PATH"], "HOME": str(work / "home"), "TMPDIR": str(work),
       "TZ": "UTC", "LANG": "C.UTF-8", "CI": "true",
       "npm_config_cache": str(work / "npm-cache"), "npm_config_userconfig": "/dev/null"}
Path(env["HOME"]).mkdir()
results = {"before": before, "commands": [], "node": subprocess.check_output(
    ["node", "--version"], env=env, text=True).strip()}
def run(label, command, guarded=False):
    child = env.copy()
    if guarded:
        child["NODE_OPTIONS"] = "--require=" + str(copy / "verification/baseline/network-guard.cjs")
    with (work / (label + ".log")).open("w") as log:
        code = subprocess.run(command, cwd=copy, env=child, stdout=log, stderr=subprocess.STDOUT).returncode
    results["commands"].append({"label": label, "exit": code})
    print(label, code, flush=True)
    return code

print(work, flush=True)
try:
    if run("install", ["npm", "ci", "--ignore-scripts", "--no-audit", "--no-fund"]) == 0:
        versions = {}
        for name, item in json.loads((copy / "package-lock.json").read_text())["packages"].items():
            if not name:
                continue
            p = copy / name / "package.json"
            version = json.loads(p.read_text())["version"] if p.exists() else None
            assert version == item.get("version") or (version is None and item.get("optional")), name
            versions[name] = version
        results["installed_versions"] = versions
        # Reuse the existing declared-font downloader; no application transports.
        run("fonts", ["python3", str(ROOT / "verification/not-found/fonts.py"), str(copy), str(work / "fonts")])
        run("browser", ["node", "verification/design-showcase/capture.mjs"], True)
finally:
    results["source_unchanged"] = all(digest(ROOT / n) == h for n, h in before.items())
    results["copy_unchanged"] = all(digest(copy / n) == h for n, h in before.items())
    (work / "results.json").write_text(json.dumps(results, indent=2) + "\n")
    print("preservation", results["source_unchanged"], results["copy_unchanged"], flush=True)
raise SystemExit(0 if all(c["exit"] == 0 for c in results["commands"])
                 and results["source_unchanged"] and results["copy_unchanged"] else 1)
