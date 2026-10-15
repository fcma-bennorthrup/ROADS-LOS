"""Approved local baseline vs candidate in a disposable, network-guarded copy."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[2]
REV = "f798a1628e9a4a7884ff23e69398883ef0ef672e"
LOCK = "caf5cbce73ec535033e36984f2c5d00e080a7a91c1575750b7008f7c52e9107e"
OWNED = {
    "client/src/contexts/checklist-context.tsx",
    "client/src/contexts/loan-activity-context.tsx",
    "client/src/components/loan/ChecklistPanel.tsx",
    "client/src/hooks/use-closing-package.ts",
    "client/src/lib/closing-package-progress.ts",
    "client/src/lib/closing-disclosure-history.ts",
    "client/src/lib/demo-reset.ts",
}
CONFIG = {"package.json", "package-lock.json", "tsconfig.json", "vitest.config.ts", "vite.config.ts",
          "tailwind.config.ts", "postcss.config.js", "components.json"}
digest = lambda value: hashlib.sha256(value).hexdigest()

def main():
    assert digest((ROOT / "package-lock.json").read_bytes()) == LOCK
    paths = subprocess.check_output(["git", "ls-tree", "-r", "--name-only", REV], cwd=ROOT, text=True).splitlines()
    paths = [p for p in paths if p in CONFIG or p.startswith(("client/", "shared/", "server/", "verification/"))
             or (p.startswith("attached_assets/") and Path(p).suffix.lower() in {".png", ".pdf"})]
    baseline = {}
    for name in paths:
        data = subprocess.check_output(["git", "show", f"{REV}:{name}"], cwd=ROOT)
        baseline[name] = digest(data)
        if name not in OWNED:
            assert digest((ROOT / name).read_bytes()) == baseline[name], f"Unapproved source drift: {name}"
    work = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(tempfile.mkdtemp(prefix="partial-reset-"))
    copy = work / "candidate"
    original = work / "baseline"
    print(work, flush=True)
    for folder in (copy, original):
        folder.mkdir(parents=True, exist_ok=True)
        for name in paths:
            dest = folder / name
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(subprocess.check_output(["git", "show", f"{REV}:{name}"], cwd=ROOT))
        shutil.copytree(ROOT / "verification/partial-reset", folder / "verification/partial-reset", dirs_exist_ok=True)
    for name in OWNED:
        shutil.copyfile(ROOT / name, copy / name)
    before = {name: digest((ROOT / name).read_bytes()) for name in set(paths) | OWNED}
    env = {"PATH": os.environ["PATH"], "HOME": str(work / "home"), "TMPDIR": str(work),
           "TZ": "UTC", "LANG": "C.UTF-8", "CI": "true",
           "npm_config_cache": str(work / "npm-cache"), "npm_config_userconfig": "/dev/null"}
    Path(env["HOME"]).mkdir(exist_ok=True)
    results = {"baseline_revision": REV, "baseline": baseline, "candidate": before, "commands": [],
               "timezone": "UTC", "clock": "2026-10-14T16:00:00.000Z"}
    def run(label, argv, cwd=copy, guard=True):
        child = env.copy()
        if guard:
            child["NODE_OPTIONS"] = "--require=" + str(cwd / "verification/baseline/network-guard.cjs")
        with (work / f"{label}.log").open("w") as output:
            code = subprocess.run(argv, cwd=cwd, env=child, stdout=output, stderr=subprocess.STDOUT).returncode
        results["commands"].append({"label": label, "exit": code, "argv": argv})
        print(label, code, flush=True)
        return code
    if not (copy / "node_modules").exists():
        assert run("install", ["npm", "ci", "--ignore-scripts", "--no-audit", "--no-fund"], guard=False) == 0
    if not (original / "node_modules").exists():
        (original / "node_modules").symlink_to(copy / "node_modules", target_is_directory=True)
    command = ["node", "node_modules/vitest/vitest.mjs", "run", "--config",
               "verification/partial-reset/vitest.config.ts", "--reporter=verbose"]
    if not (work / "baseline-tests-all.log").exists():
        run("baseline-tests-all", command + ["--exclude", "verification/partial-reset/reset.test.tsx"], cwd=original)
    # This historical case explicitly asserts the replaced failure toast. Keep
    # it intact on baseline; the new denied-removal case asserts approved wording
    # and the same retained package/storage outcome on candidate.
    run("candidate-tests", command + ["--testNamePattern",
        "^(?!.*reports failed reset removal and retains the displayed package progress).*$"])
    for folder, label in ((original, "baseline"), (copy, "candidate")):
        run(label + "-types", ["node", "node_modules/typescript/bin/tsc", "--noEmit", "--incremental", "false"], cwd=folder)
        run(label + "-browser-build", ["node", "node_modules/vite/bin/vite.js", "build", "--config",
                                      "verification/partial-reset/vite.config.ts"], cwd=folder)
    results["source_unchanged"] = all(digest((ROOT / n).read_bytes()) == sha for n, sha in before.items())
    (work / "results.json").write_text(json.dumps(results, indent=2) + "\n")
    print("source_unchanged", results["source_unchanged"], flush=True)
    # Existing type failures are reported, not repaired or turned into a clean
    # type-check claim. Candidate diagnostics must exactly match baseline.
    same_diagnostics = (work / "baseline-types.log").read_bytes() == (work / "candidate-types.log").read_bytes()
    assert same_diagnostics, "New TypeScript diagnostics"
    assert results["source_unchanged"]
    assert all(c["exit"] == 0 for c in results["commands"] if not c["label"].endswith("-types"))

if __name__ == "__main__":
    main()
