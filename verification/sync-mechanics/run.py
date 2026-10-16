"""Offline baseline/candidate sync checks, using the refreshed local source."""
import hashlib
import json
import os
import re
from pathlib import Path
import shutil
import subprocess
import tempfile

root = Path(__file__).resolve().parents[2]
baseline = "7bdc15140ba63507a43bb70af05fc4b29147eb65"
subprocess.run([
    "git", "diff", "--exit-code", baseline, "--", "client", "shared",
    "server/conflict-detection.ts", "server/sync-file-policy.ts",
    "server/sync-state.ts", "server/pending-conflicts.ts", "server/storage.ts",
    "package.json", "package-lock.json", "tsconfig.json",
], cwd=root, check=True, stdout=subprocess.DEVNULL)
lock = (root / "package-lock.json").read_bytes()
assert hashlib.sha256(lock).hexdigest() == "caf5cbce73ec535033e36984f2c5d00e080a7a91c1575750b7008f7c52e9107e"
for name, entry in json.loads(lock)["packages"].items():
    if not name:
        continue
    installed = root / name / "package.json"
    if not installed.exists():
        assert entry.get("optional"), f"Missing dependency: {name}"
    else:
        assert json.loads(installed.read_text())["version"] == entry["version"], f"Version drift: {name}"
work = Path(tempfile.mkdtemp(prefix="sync-mechanics-"))
copy = work / "copy"
for folder in ["verification/credential-sync", "verification/sync-mechanics",
               "verification/baseline", "server", "shared", "client/src", "test"]:
    for src in (root / folder).rglob("*"):
        if src.is_file() and not src.is_symlink() and src.suffix in {".ts", ".tsx", ".mjs", ".cjs", ".py"}:
            dest = copy / src.relative_to(root)
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(src, dest)
for name in ["package.json", "tsconfig.json", "vitest.config.ts"]:
    shutil.copyfile(root / name, copy / name)
for name in ["routes.ts", "github.ts"]:
    (copy / f"baseline-{name}").write_bytes(subprocess.check_output(
        ["git", "show", f"{baseline}:server/{name}"], cwd=root))
(copy / "node_modules").symlink_to(root / "node_modules", target_is_directory=True)
env = {"PATH": os.environ["PATH"], "HOME": str(work), "TMPDIR": str(work), "TZ": "UTC",
       "LANG": "C.UTF-8", "CI": "true",
       "NODE_OPTIONS": "--require=" + str(copy / "verification/baseline/network-guard.cjs")}
print("Disposable copy:", copy, flush=True)
result = subprocess.run(["node", "verification/sync-mechanics/check.mjs",
                         str(copy / "baseline-routes.ts")], cwd=copy, env=env)
assert result.returncode == 0, "Sync comparison failed"
# Keep raw diagnostics; line movement is not a new type error.
diagnostics = {}
for mode in ["candidate", "baseline"]:
    if mode == "baseline":
        for name in ["routes.ts", "github.ts"]:
            shutil.copyfile(copy / f"baseline-{name}", copy / "server" / name)
        for name in ["sync-mechanics.ts", "sync-plan.ts"]:
            (copy / "server" / name).unlink()
    check = subprocess.run(["node", "node_modules/typescript/bin/tsc", "--noEmit",
                            "--incremental", "false"], cwd=copy, env=env,
                           capture_output=True, text=True)
    (work / f"{mode}-types.log").write_text(check.stdout + check.stderr)
    text = re.sub(r"\(\d+,\d+\)", "(LINE,COL)", check.stdout + check.stderr)
    # The existing Map iteration diagnostic moves with the extracted pure loop.
    # Preserve its exact message and multiplicity; do not drop any diagnostics.
    if mode == "candidate":
        text = text.replace("server/sync-plan.ts(LINE,COL)", "server/routes.ts(LINE,COL)")
    diagnostics[mode] = (check.returncode, sorted(text.splitlines()))
    print(f"{mode} type check: exit {check.returncode}", flush=True)
assert diagnostics["candidate"] == diagnostics["baseline"], "Type diagnostics changed; inspect raw logs"
print("PASS: identical diagnostic messages/counts, with the extracted Map loop's location mapped; raw logs:", work)
