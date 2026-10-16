"""Compare static diagnostics in an already installed disposable fixture copy."""
import os
from pathlib import Path
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
copy = Path(sys.argv[1]).resolve()
assert str(copy).startswith("/tmp/loan-display-") and copy.name == "copy"
# The full static-check import closure is required even though no server runs.
shutil.copytree(ROOT / "server", copy / "server", dirs_exist_ok=True)
shutil.copyfile(ROOT / "vite.config.ts", copy / "vite.config.ts")
env = {"PATH": os.environ["PATH"], "HOME": str(copy.parent / "home"), "TZ": "UTC",
       "LANG": "C.UTF-8", "NODE_OPTIONS": "--require=" + str(copy / "verification/baseline/network-guard.cjs")}
command = ["node", "node_modules/typescript/bin/tsc", "--noEmit", "--incremental", "false"]
candidate = subprocess.run(command, cwd=copy, env=env, capture_output=True, text=True)
originals = {p: p.read_bytes() for p in (copy / "client/src/pages").glob("loan-*.tsx")}
try:
    for p in originals:
        p.write_bytes((p.parent / p.name.replace("loan-", "baseline-")).read_bytes())
    baseline = subprocess.run(command, cwd=copy, env=env, capture_output=True, text=True)
finally:
    for p, data in originals.items():
        p.write_bytes(data)
same = candidate.returncode == baseline.returncode and candidate.stdout == baseline.stdout and candidate.stderr == baseline.stderr
report = f"Candidate exit {candidate.returncode}; baseline exit {baseline.returncode}; identical diagnostics {same}\n{candidate.stdout}{candidate.stderr}"
(copy.parent / "typecheck-comparison.log").write_text(report)
print(report)
assert same, "New static diagnostics"
