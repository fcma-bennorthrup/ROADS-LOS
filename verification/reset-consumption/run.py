"""Baseline/candidate checks in a disposable copy; no live App or server."""
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[2]
BASELINE_REVISION = "86755cb1cd173f7c168907e722630d78d65cb1f0"
CHANGED = (
    "client/src/contexts/checklist-context.tsx",
    "client/src/components/loan/CollateralContent.tsx",
    "client/src/components/loan/ProductPricingContent.tsx",
)
ACCEPTED = {
    "package-lock.json": "caf5cbce73ec535033e36984f2c5d00e080a7a91c1575750b7008f7c52e9107e",
    "SETUP.md": "0226c80b675a0fab6c4df22b562013ceafd42bb8d60d5d0355a2642cb9a392e6",
    "replit.md": "a92e1ae7924aaf64eb78b69e48ea94f81c6998463017a8980244dc1680447e24",
    # User-approved exception solely for isolated reset verification; never run.
    "server/index.ts": "2eee6c655d508e045a980256d4aa57624ce3c336ac9fe0758d6b0b003fc6d64d",
}

def digest(data):
    return hashlib.sha256(data).hexdigest()

def main():
    manifest = dict((name, sha) for name, sha in re.findall(
        r"^\| `([^`]+)` \| \d+ \| `([0-9a-f]{64})` \|",
        (ROOT / "docs/architecture-audit/baseline.md").read_text(), re.M))
    assert len(manifest) == 174
    before = {}
    originals = {}
    for name, sha in manifest.items():
        path = ROOT / name
        assert path.is_file() and not path.is_symlink(), name
        before[name] = digest(path.read_bytes())
        if name in CHANGED:
            # Local pre-change snapshot only; never fetch or alter the workspace.
            originals[name] = subprocess.check_output(["git", "show", f"{BASELINE_REVISION}:{name}"], cwd=ROOT)
            assert digest(originals[name]) == sha, f"Pre-change baseline mismatch: {name}"
        else:
            assert before[name] == ACCEPTED.get(name, sha), f"Baseline mismatch: {name}"
    work = Path(tempfile.mkdtemp(prefix="reset-consumption-"))
    copy = work / "copy"
    for name in manifest:
        dest = copy / name
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT / name, dest)
    for scope in ("baseline", "origination", "reset-consumption"):
        shutil.copytree(ROOT / "verification" / scope, copy / "verification" / scope)
    env = {"PATH": os.environ["PATH"], "HOME": str(work / "home"), "TMPDIR": str(work),
           "TZ": "UTC", "LANG": "C.UTF-8", "CI": "true",
           "npm_config_cache": str(work / "npm-cache"), "npm_config_userconfig": "/dev/null"}
    Path(env["HOME"]).mkdir()
    results = {"before": before, "baseline": manifest, "accepted": ACCEPTED,
               "commands": [], "timezone": "UTC", "copy": str(copy)}
    print(work, flush=True)
    def run(label, argv, guarded=False):
        child = env.copy()
        if guarded:
            child["NODE_OPTIONS"] = "--require=" + str(copy / "verification/baseline/network-guard.cjs")
        with (work / f"{label}.log").open("w") as out:
            code = subprocess.run(argv, cwd=copy, env=child, stdout=out, stderr=subprocess.STDOUT).returncode
        results["commands"].append({"label": label, "argv": argv, "exit": code})
        print(label, code, flush=True)
        return code
    try:
        if run("install", ["npm", "ci", "--ignore-scripts", "--no-audit", "--no-fund"]) == 0:
            for name, data in originals.items():
                (copy / name).write_bytes(data)
            run("baseline", ["node", "node_modules/vitest/vitest.mjs", "run", "--config",
                            "verification/origination/vitest.config.ts", "--reporter=verbose"], True)
            # Preserve the baseline for a browser comparison using the same install.
            baseline = work / "baseline"
            shutil.copytree(copy, baseline, ignore=shutil.ignore_patterns("node_modules"))
            (baseline / "node_modules").symlink_to(copy / "node_modules", target_is_directory=True)
            for name in CHANGED:
                shutil.copyfile(ROOT / name, copy / name)
            run("candidate", ["node", "node_modules/vitest/vitest.mjs", "run", "--config",
                             "verification/reset-consumption/vitest.config.ts", "--reporter=verbose"], True)
    finally:
        results["source_unchanged"] = all(digest((ROOT / n).read_bytes()) == h for n, h in before.items())
        results["copy_matches_candidate"] = all(digest((copy / n).read_bytes()) == h for n, h in before.items())
        (work / "results.json").write_text(json.dumps(results, indent=2) + "\n")
    return 0 if (len(results["commands"]) == 3 and results["source_unchanged"]
                 and results["copy_matches_candidate"] and all(c["exit"] == 0 for c in results["commands"])) else 1

if __name__ == "__main__":
    raise SystemExit(main())
