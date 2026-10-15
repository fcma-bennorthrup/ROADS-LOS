"""Compare the approved local baseline and candidate in disposable storage."""
import hashlib
import json
import os
import re
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[2]
SOURCE = "client/src/components/loan/ProductPricingContent.tsx"
BASELINE_SHA = "9593626b6b5c5e17156808745ff8d3aa6345d7d5198a8e9a95d6146e9fd1eccf"
LOCK_SHA = "caf5cbce73ec535033e36984f2c5d00e080a7a91c1575750b7008f7c52e9107e"
ACCEPTED = {
    "SETUP.md": "0226c80b675a0fab6c4df22b562013ceafd42bb8d60d5d0355a2642cb9a392e6",
    "replit.md": "a92e1ae7924aaf64eb78b69e48ea94f81c6998463017a8980244dc1680447e24",
    "package-lock.json": LOCK_SHA,
    "server/index.ts": "2eee6c655d508e045a980256d4aa57624ce3c336ac9fe0758d6b0b003fc6d64d",
    "client/src/components/loan/CollateralContent.tsx": "e66cd7386d5dc830bd666697b3efd75e335b3aca45c65eda1fb793bf87ec9eb3",
    "client/src/contexts/checklist-context.tsx": "3e59eb6a6ca6250a114efdaa2af17959ab8a32fcf47a5f76dd40ca85daaf719a",
}
def sha(data):
    return hashlib.sha256(data).hexdigest()

def main():
    # Local git object only; no remote operations or baseline overwrites.
    original = subprocess.check_output(["git", "show", "56bf0e0:" + SOURCE], cwd=ROOT)
    assert sha(original) == BASELINE_SHA
    assert sha((ROOT / "package-lock.json").read_bytes()) == LOCK_SHA
    manifest = re.findall(r"^\| `([^`]+)` \| \d+ \| `([0-9a-f]{64})` \|",
                          (ROOT / "docs/architecture-audit/baseline.md").read_text(), re.M)
    assert len(manifest) == 174
    for name, expected in manifest:
        if name != SOURCE:
            assert sha((ROOT / name).read_bytes()) == ACCEPTED.get(name, expected), f"Unapproved baseline drift: {name}"
    work = Path(tempfile.mkdtemp(prefix="date-cancellation-"))
    copy = work / "candidate"
    files = subprocess.check_output(["git", "ls-files", "-z"], cwd=ROOT).decode().split("\0")
    files += [str(p.relative_to(ROOT)) for p in (ROOT / "verification/date-cancellation").rglob("*") if p.is_file()]
    before = {}
    for name in sorted(set(files) - {""}):
        p = ROOT / name
        if p.is_symlink() or not p.is_file() or name.startswith((".local/", ".env")):
            continue
        before[name] = sha(p.read_bytes())
        dest = copy / name
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(p, dest)
    env = {"PATH": os.environ["PATH"], "HOME": str(work / "home"), "TMPDIR": str(work),
           "TZ": "UTC", "LANG": "C.UTF-8", "CI": "true",
           "npm_config_cache": str(work / "npm-cache"), "npm_config_userconfig": "/dev/null"}
    Path(env["HOME"]).mkdir()
    results = {"hashes": before, "baseline_pricing": BASELINE_SHA, "commands": [], "work": str(work)}
    print(work, flush=True)
    def run(label, args, cwd=copy, guarded=False):
        child = env.copy()
        if guarded:
            child["NODE_OPTIONS"] = "--require=" + str(cwd / "verification/baseline/network-guard.cjs")
            child["DATE_BASELINE"] = "1" if label == "baseline" else "0"
        with (work / (label + ".log")).open("w") as out:
            code = subprocess.run(args, cwd=cwd, env=child, stdout=out, stderr=subprocess.STDOUT).returncode
        results["commands"].append({"label": label, "exit": code})
        print(label, code, flush=True)
        return code
    if run("install", ["npm", "ci", "--ignore-scripts", "--no-audit", "--no-fund"]) == 0:
        base = work / "baseline"
        shutil.copytree(copy, base, ignore=shutil.ignore_patterns("node_modules"))
        (base / "node_modules").symlink_to(copy / "node_modules", target_is_directory=True)
        (base / SOURCE).write_bytes(original)
        args = ["node", "node_modules/vitest/vitest.mjs", "run", "--config",
                "verification/date-cancellation/vitest.config.ts", "--reporter=verbose"]
        run("baseline", args, base, True)
        run("candidate", args, copy, True)
    results["unchanged"] = all(sha((ROOT / n).read_bytes()) == h for n, h in before.items())
    (work / "results.json").write_text(json.dumps(results, indent=2) + "\n")
    return 0 if len(results["commands"]) == 3 and results["unchanged"] and all(c["exit"] == 0 for c in results["commands"]) else 1

if __name__ == "__main__":
    raise SystemExit(main())
