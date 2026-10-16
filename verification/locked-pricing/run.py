"""Pin the refreshed local main baseline; test only disposable copies."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[2]
REV = "7c0a54d"
LOCK = "caf5cbce73ec535033e36984f2c5d00e080a7a91c1575750b7008f7c52e9107e"
OWNED = {
    "client/src/components/loan/ProductPricingContent.tsx",
    "client/src/contexts/checklist-context.tsx",
    "client/src/lib/locked-pricing.ts",
}
CONFIG = {"package.json", "package-lock.json", "tsconfig.json", "vitest.config.ts",
          "vite.config.ts", "tailwind.config.ts", "postcss.config.js", "components.json"}
sha = lambda data: hashlib.sha256(data).hexdigest()

def main():
    assert sha((ROOT / "package-lock.json").read_bytes()) == LOCK
    files = subprocess.check_output(["git", "ls-tree", "-r", "--name-only", REV], cwd=ROOT, text=True).splitlines()
    files = [p for p in files if p in CONFIG or p.startswith(("client/", "shared/", "server/", "verification/"))
             or (p.startswith("attached_assets/") and Path(p).suffix.lower() in {".png", ".pdf"})]
    work = Path(tempfile.mkdtemp(prefix="locked-pricing-"))
    print(work, flush=True)
    before = {}
    for name in files:
        original = subprocess.check_output(["git", "show", f"{REV}:{name}"], cwd=ROOT)
        current = (ROOT / name).read_bytes()
        if name not in OWNED:
            assert current == original, f"Unexpected drift: {name}"
        before[name] = sha(current)
        for kind, data in (("baseline", original), ("candidate", current)):
            dest = work / kind / name
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(data)
    for name in OWNED:
        dest = work / "candidate" / name
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes((ROOT / name).read_bytes())
        before[name] = sha(dest.read_bytes())
    for kind in ("baseline", "candidate"):
        shutil.copytree(ROOT / "verification/locked-pricing", work / kind / "verification/locked-pricing")
    env = {"PATH": os.environ["PATH"], "HOME": str(work / "home"), "TMPDIR": str(work),
           "TZ": "UTC", "LANG": "C.UTF-8", "CI": "true", "npm_config_cache": str(work / "npm-cache"),
           "npm_config_userconfig": "/dev/null"}
    Path(env["HOME"]).mkdir()
    results = {"baseline": REV, "commands": [], "source": before}
    def run(label, argv, kind="candidate", guard=True):
        cwd = work / kind
        child = env.copy()
        if guard:
            child["NODE_OPTIONS"] = "--require=" + str(cwd / "verification/baseline/network-guard.cjs")
        with (work / f"{label}.log").open("w") as output:
            code = subprocess.run(argv, cwd=cwd, env=child, stdout=output, stderr=subprocess.STDOUT).returncode
        results["commands"].append({"label": label, "exit": code})
        print(label, code, flush=True)
    run("install", ["npm", "ci", "--ignore-scripts", "--no-audit", "--no-fund"], guard=False)
    assert results["commands"][-1]["exit"] == 0
    (work / "baseline/node_modules").symlink_to(work / "candidate/node_modules", target_is_directory=True)
    command = ["node", "node_modules/vitest/vitest.mjs", "run", "--config",
               "verification/locked-pricing/vitest.config.ts", "--reporter=verbose"]
    run("baseline-tests", command + ["--exclude", "verification/locked-pricing/pricing.test.tsx"], "baseline")
    run("candidate-tests", command)
    for kind in ("baseline", "candidate"):
        run(kind + "-types", ["node", "node_modules/typescript/bin/tsc", "--noEmit", "--incremental", "false"], kind)
    results["source_unchanged"] = all(sha((ROOT / name).read_bytes()) == digest for name, digest in before.items())
    (work / "results.json").write_text(json.dumps(results, indent=2) + "\n")
    print("source_unchanged", results["source_unchanged"], flush=True)
    print("Evidence:", work, flush=True)
    assert results["source_unchanged"], "Workspace source changed during verification"
    assert all(c["exit"] == 0 for c in results["commands"] if not c["label"].endswith("-types"))
    assert (work / "baseline-types.log").read_bytes() == (work / "candidate-types.log").read_bytes(), "New type diagnostics"

if __name__ == "__main__":
    main()
