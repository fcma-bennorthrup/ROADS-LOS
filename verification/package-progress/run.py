"""Compare the refreshed local baseline and candidate in disposable offline fixtures."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[2]
BASELINE = "a2d52af0238ee832a6df418d11d6971d6e75ff88"
OWNED = ["client/src/hooks/use-closing-package.ts", "client/src/lib/closing-package-progress.ts"]
LOCK = "caf5cbce73ec535033e36984f2c5d00e080a7a91c1575750b7008f7c52e9107e"
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(ROOT / "package-lock.json") == LOCK
work = Path(tempfile.mkdtemp(prefix="package-progress-"))
paths = subprocess.check_output(["git", "ls-tree", "-r", "--name-only", BASELINE], cwd=ROOT, text=True).splitlines()
paths = [p for p in paths if p.startswith(("client/", "shared/", "server/", "verification/", "attached_assets/"))
         or p in {"package.json", "package-lock.json", "tsconfig.json", "vitest.config.ts",
                  "tailwind.config.ts", "postcss.config.js", "components.json"}]
before = {p: sha(ROOT / p) for p in paths}
results = {"baseline": BASELINE, "lock": LOCK, "commands": [], "source": before}
for mode in ("baseline", "candidate"):
    target = work / mode
    target.mkdir()
    for name in paths:
        data = subprocess.check_output(["git", "show", f"{BASELINE}:{name}"], cwd=ROOT)
        if name not in OWNED:
            assert hashlib.sha256(data).hexdigest() == before[name], f"Unexpected drift: {name}"
        dest = target / name
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes((ROOT / name).read_bytes() if mode == "candidate" else data)
    shutil.copytree(ROOT / "verification/package-progress", target / "verification/package-progress")
    # Reuse the installed dependency snapshot read-only; do not install or change packages.
    (target / "node_modules").symlink_to(ROOT / "node_modules", target_is_directory=True)
    env = {"PATH": os.environ["PATH"], "HOME": str(work), "TZ": "UTC", "LANG": "C.UTF-8", "CI": "true",
           "NODE_OPTIONS": "--require=" + str(target / "verification/baseline/network-guard.cjs")}
    cmd = ["node", str(ROOT / "node_modules/vitest/vitest.mjs"), "run", "--config",
           "verification/package-progress/vitest.config.ts", "--reporter=verbose"]
    if mode == "baseline":
        cmd += ["--exclude", "verification/package-progress/coordination.test.tsx"]
    with (work / f"{mode}.log").open("w") as output:
        code = subprocess.run(cmd, cwd=target, env=env, stdout=output, stderr=subprocess.STDOUT).returncode
    results["commands"].append({"mode": mode, "exit": code})
    print(mode, code, flush=True)
    with (work / f"{mode}-types.log").open("w") as output:
        code = subprocess.run(
            ["node", str(ROOT / "node_modules/typescript/bin/tsc"), "--noEmit", "--incremental", "false"],
            cwd=target, env=env, stdout=output, stderr=subprocess.STDOUT,
        ).returncode
    results["commands"].append({"mode": mode, "check": "types", "exit": code})
results["identical_type_diagnostics"] = (
    (work / "baseline-types.log").read_bytes() == (work / "candidate-types.log").read_bytes()
)
results["workspace_unchanged"] = before == {p: sha(ROOT / p) for p in paths}
(work / "results.json").write_text(json.dumps(results, indent=2) + "\n")
print(work, flush=True)
