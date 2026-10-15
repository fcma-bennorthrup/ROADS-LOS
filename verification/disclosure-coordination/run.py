"""Reproduce candidate checks in a disposable copy with blocked test transports."""
from pathlib import Path
import os
import shutil
import subprocess
import tempfile
import hashlib
import json

root = Path(__file__).resolve().parents[2]
assert hashlib.sha256((root / "package-lock.json").read_bytes()).hexdigest() == (
    "caf5cbce73ec535033e36984f2c5d00e080a7a91c1575750b7008f7c52e9107e"
), "Dependency baseline changed; obtain approval first"
work = Path(tempfile.mkdtemp(prefix="disclosure-check-"))
for directory in ("client", "shared", "server", "verification"):
    shutil.copytree(root / directory, work / directory,
                    ignore=shutil.ignore_patterns("node_modules", "dist", "__pycache__"))
for name in ("package.json", "package-lock.json", "tsconfig.json", "vitest.config.ts",
             "vite.config.ts", "tailwind.config.ts", "postcss.config.js"):
    shutil.copyfile(root / name, work / name)
(work / "attached_assets").mkdir()
for name in ("SampleCD_1777397678654.pdf", "Redacted-ClosingPackage_Redacted_1777397693832.pdf",
             "Rate_Lock_Letter_-_Consumer_Redacted_1777397784766.pdf"):
    shutil.copyfile(root / "attached_assets" / name, work / "attached_assets" / name)
(work / "home").mkdir()
env = {"PATH": os.environ["PATH"], "HOME": str(work / "home"), "TZ": "UTC",
       "npm_config_userconfig": "/dev/null", "npm_config_cache": str(work / "npm-cache")}
results = {}
commands = [
    ("install", ["npm", "ci", "--ignore-scripts", "--no-audit", "--no-fund"]),
    ("tests", ["node", "node_modules/vitest/vitest.mjs", "run", "--config",
               "verification/disclosure-coordination/vitest.config.ts"]),
    ("types", ["node", "node_modules/typescript/bin/tsc", "--noEmit", "--incremental", "false"]),
    ("fixture-build", ["node", "node_modules/vite/bin/vite.js", "build", "--config",
                       "verification/disclosure-coordination/vite.config.ts"]),
]
print(work, flush=True)
for label, command in commands:
    if label != "install":
        env["NODE_OPTIONS"] = "--require=" + str(work / "verification/baseline/network-guard.cjs")
    with (work / f"{label}.log").open("w") as log:
        results[label] = subprocess.run(command, cwd=work, env=env, stdout=log, stderr=subprocess.STDOUT).returncode
    if label == "install" and results[label]:
        break
(work / "results.json").write_text(json.dumps(results, indent=2))
print(json.dumps(results, indent=2))
raise SystemExit(1 if any(results.values()) else 0)
