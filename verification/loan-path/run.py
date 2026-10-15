"""Compare the approved local post-reset baseline and parsing-only candidate."""
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[2]
BASELINE = "56bf0e05a0f4c0b84891e8ce145f225b32ddfe76"
CHANGED = (
    "client/src/contexts/checklist-context.tsx",
    "client/src/contexts/loan-activity-context.tsx",
    "client/src/components/loan/CollateralContent.tsx",
)
HELPER = "client/src/lib/loan-path.ts"

def digest(data):
    return hashlib.sha256(data).hexdigest()

def main():
    # Pin the dependency snapshot independently of the approved main update.
    assert digest((ROOT / "package-lock.json").read_bytes()) == "caf5cbce73ec535033e36984f2c5d00e080a7a91c1575750b7008f7c52e9107e"
    names = re.findall(r"^\| `([^`]+)` \| \d+ \| `[0-9a-f]{64}` \|",
                       (ROOT / "docs/architecture-audit/baseline.md").read_text(), re.M)
    assert len(names) == 174
    before, originals = {}, {}
    for name in names:
        path = ROOT / name
        assert path.is_file() and not path.is_symlink(), name
        current = path.read_bytes()
        original = subprocess.check_output(["git", "show", f"{BASELINE}:{name}"], cwd=ROOT)
        before[name] = digest(current)
        if name in CHANGED:
            # Exact inverse transformation proves every other byte unchanged,
            # including JSX, keys, effects, resets, and event ordering.
            restored = current.decode().replace('import { loanIdFromPath } from "@/lib/loan-path";\n', "")
            restored = restored.replace('loanIdFromPath(location, "prototype")',
                                        'location.match(/^\\/loans\\/([^/]+)/)?.[1] ?? "prototype"')
            assert restored.encode() == original, f"Non-parsing change: {name}"
            originals[name] = original
        else:
            assert current == original, f"Unapproved baseline drift: {name}"
    work = Path(tempfile.mkdtemp(prefix="loan-path-"))
    copy = work / "copy"
    for name in [*names, HELPER]:
        dest = copy / name
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT / name, dest)
    for scope in ("baseline", "origination", "reset-consumption", "loan-path"):
        shutil.copytree(ROOT / "verification" / scope, copy / "verification" / scope)
    env = {"PATH": os.environ["PATH"], "HOME": str(work / "home"), "TMPDIR": str(work),
           "TZ": "UTC", "LANG": "C.UTF-8", "CI": "true",
           "npm_config_cache": str(work / "npm-cache"), "npm_config_userconfig": "/dev/null"}
    Path(env["HOME"]).mkdir()
    results = {"baseline": BASELINE, "before": before, "commands": []}
    print(work, flush=True)
    def run(label, argv, guarded=False):
        child = env.copy()
        if guarded:
            child["NODE_OPTIONS"] = "--require=" + str(copy / "verification/baseline/network-guard.cjs")
            child["LOAN_PATH_TRACE"] = str(work / f"{label}-trace.json")
        with (work / f"{label}.log").open("w") as out:
            code = subprocess.run(argv, cwd=copy, env=child, stdout=out, stderr=subprocess.STDOUT).returncode
        results["commands"].append({"label": label, "exit": code})
        print(label, code, flush=True)
        return code
    try:
        if run("install", ["npm", "ci", "--ignore-scripts", "--no-audit", "--no-fund"]) == 0:
            for variant in ("baseline", "candidate"):
                for name in CHANGED:
                    (copy / name).write_bytes(originals[name] if variant == "baseline" else (ROOT / name).read_bytes())
                run(variant, ["node", "node_modules/vitest/vitest.mjs", "run", "--config",
                              "verification/loan-path/vitest.config.ts", "--reporter=verbose"], True)
                if run(f"{variant}-build", ["node", "verification/loan-path/build-browser.mjs"], True) == 0:
                    run(f"{variant}-browser", ["node", "verification/loan-path/capture.mjs",
                        shutil.which("chromium"), str(copy), str(work / f"{variant}-browser")], True)
            traces = [work / f"{variant}-trace.json" for variant in ("baseline", "candidate")]
            results["exact_trace_match"] = all(p.exists() for p in traces) and traces[0].read_bytes() == traces[1].read_bytes()
            captures = [work / f"{variant}-browser/results.json" for variant in ("baseline", "candidate")]
            results["exact_browser_match"] = all(p.exists() for p in captures) and captures[0].read_bytes() == captures[1].read_bytes()
    finally:
        results["source_unchanged"] = all(digest((ROOT / p).read_bytes()) == h for p, h in before.items())
        (work / "results.json").write_text(json.dumps(results, indent=2) + "\n")
        print(json.dumps({k: v for k, v in results.items() if k != "before"}), flush=True)
    return 0 if results.get("exact_trace_match") and results.get("exact_browser_match") and results["source_unchanged"] and all(c["exit"] == 0 for c in results["commands"]) else 1

if __name__ == "__main__":
    raise SystemExit(main())
