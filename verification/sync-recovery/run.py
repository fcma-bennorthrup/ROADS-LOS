"""Accepted-lock, disposable-only sync verification; no live app or transport."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

root = Path(__file__).resolve().parents[2]
lock = (root / "package-lock.json").read_bytes()
assert hashlib.sha256(lock).hexdigest() == "caf5cbce73ec535033e36984f2c5d00e080a7a91c1575750b7008f7c52e9107e"
for name, entry in json.loads(lock)["packages"].items():
    if name:
        installed = root / name / "package.json"
        assert (not installed.exists() and entry.get("optional")) or (
            installed.exists() and json.loads(installed.read_text())["version"] == entry["version"]), name
work = Path(tempfile.mkdtemp(prefix="sync-recovery-"))
copy = work / "candidate"
for folder in ["verification", "server", "shared", "client/src", "test"]:
    for source in (root / folder).rglob("*"):
        if source.is_file() and not source.is_symlink() and source.suffix in {".ts", ".tsx", ".mjs", ".cjs", ".py", ".css"}:
            target = copy / source.relative_to(root)
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, target)
for name in ["package.json", "tsconfig.json", "vitest.config.ts", "tailwind.config.ts", "vite.config.ts", "postcss.config.js"]:
    shutil.copyfile(root / name, copy / name)
(copy / "node_modules").symlink_to(root / "node_modules", target_is_directory=True)
baseline = work / "baseline"
shutil.copytree(copy, baseline, symlinks=True)
# Local assignment baseline; no remote fetch.
for name in ["server/routes.ts", "server/github.ts", "server/sync-mechanics.ts",
             "server/sync-state.ts", "server/pending-conflicts.ts",
             "client/src/components/GitHubSyncPanel.tsx",
             "client/src/components/ConflictResolutionDialog.tsx",
             "client/src/hooks/use-github-sync.ts"]:
    (baseline / name).write_bytes(subprocess.check_output(["git", "show", f"f73d7e4:{name}"], cwd=root))
(baseline / "server/sync-recovery.ts").unlink()
env = {"PATH": os.environ["PATH"], "HOME": str(work), "TMPDIR": str(work),
       "TZ": "UTC", "LANG": "C.UTF-8", "CI": "true",
       "NODE_OPTIONS": "--require=" + str(copy / "verification/baseline/network-guard.cjs")}
print("Disposable directory:", work, flush=True)
result = subprocess.run(["node", "verification/sync-recovery/check.mjs", str(baseline)],
                        cwd=copy, env=env, capture_output=True, text=True)
print(result.stdout + result.stderr, flush=True)
evidence = root / "verification/sync-recovery/evidence"
evidence.mkdir(exist_ok=True)
(evidence / "checks.txt").write_text(result.stdout + result.stderr)
if result.returncode == 0 and os.environ.get("SYNC_SKIP_UNCHANGED_UI") != "1":
    subprocess.run(["node", "verification/sync-recovery/ui-build.mjs", str(baseline)],
                   cwd=copy, env=env, check=True)
    browser_env = {key: value for key, value in env.items() if key != "NODE_OPTIONS"}
    ui = subprocess.run(["node", "verification/sync-recovery/ui-capture.mjs", shutil.which("chromium"), str(work)],
                        cwd=copy, env=browser_env, capture_output=True, text=True, timeout=180)
    (evidence / "ui.txt").write_text(ui.stdout + ui.stderr)
    print(ui.stdout + ui.stderr, flush=True)
    if ui.returncode:
        raise SystemExit(ui.returncode)
for label, directory in [("baseline", baseline), ("candidate", copy)]:
    check = subprocess.run(["node", "node_modules/typescript/bin/tsc", "--noEmit", "--incremental", "false"],
                           cwd=directory, env=env, capture_output=True, text=True)
    (evidence / f"{label}-types.txt").write_text(check.stdout + check.stderr)
    print(label, "typecheck exit:", check.returncode, flush=True)
    print(check.stdout, flush=True)
raise SystemExit(result.returncode)
