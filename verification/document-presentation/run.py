"""Use a pre-edit local copy, never a remote revision, for disposable comparisons."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[2]
BEFORE = Path(sys.argv[1]).resolve()
LOCK = "caf5cbce73ec535033e36984f2c5d00e080a7a91c1575750b7008f7c52e9107e"
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(ROOT / "package-lock.json") == sha(BEFORE / "package-lock.json") == LOCK
work = Path(tempfile.mkdtemp(prefix="document-presentation-"))
results = {"lock": LOCK, "commands": []}
for mode, source in (("baseline", BEFORE), ("candidate", ROOT)):
    target = work / mode
    target.mkdir()
    for name in ("client", "shared", "server", "verification", "attached_assets"):
        shutil.copytree(source / name, target / name)
    for name in ("package.json", "package-lock.json", "tsconfig.json", "vitest.config.ts",
                 "tailwind.config.ts", "postcss.config.js", "components.json", "vite.config.ts"):
        shutil.copy2(source / name, target / name)
    shutil.copytree(ROOT / "verification/document-presentation",
                    target / "verification/document-presentation", dirs_exist_ok=True)
    (target / "node_modules").symlink_to(ROOT / "node_modules", target_is_directory=True)
    config = target / "verification/package-progress/vitest.config.ts"
    config.write_text(config.read_text().replace('test: { include: [', 'test: { include: [\n    "verification/document-presentation/*.test.tsx",'))
    env = {"PATH": os.environ["PATH"], "HOME": str(work), "TZ": "UTC", "LANG": "C.UTF-8", "CI": "true",
           "NODE_OPTIONS": "--require=" + str(target / "verification/baseline/network-guard.cjs")}
    for kind, cmd in (
        ("tests", ["node", str(ROOT / "node_modules/vitest/vitest.mjs"), "run", "--config",
                   "verification/package-progress/vitest.config.ts"]),
        ("types", ["node", str(ROOT / "node_modules/typescript/bin/tsc"), "--noEmit", "--incremental", "false"]),
    ):
        with (work / f"{mode}-{kind}.log").open("w") as log:
            code = subprocess.run(cmd, cwd=target, env=env, stdout=log, stderr=subprocess.STDOUT).returncode
        results["commands"].append({"mode": mode, "kind": kind, "exit": code})
        print(mode, kind, code, flush=True)
results["identical_type_diagnostics"] = (work / "baseline-types.log").read_bytes() == (work / "candidate-types.log").read_bytes()
# Reuse the established offline browser comparison without changing its shared source.
capture = (ROOT / "verification/package-progress/capture.mjs").read_text()
(work / "capture.mjs").write_text(capture)
(work / "node_modules").symlink_to(ROOT / "node_modules", target_is_directory=True)
(work / "results.json").write_text(json.dumps(results, indent=2))
print(work, flush=True)
