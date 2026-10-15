"""Pinned local baseline, accepted lock, disposable files and blocked transports."""
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
work = Path(tempfile.mkdtemp(prefix="sync-snapshots-"))
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
revision = "79416ccb2c2343d2aa1559bdbe1585eedae6bbe8"
for name in ["server/routes.ts", "server/github.ts", "server/sync-eligibility.ts",
             "server/sync-recovery.ts", "server/pending-conflicts.ts",
             "client/src/components/ConflictResolutionDialog.tsx", "client/src/hooks/use-github-sync.ts"]:
    (baseline / name).write_bytes(subprocess.check_output(["git", "show", f"{revision}:{name}"], cwd=root))
for name in ["sync-coordination.ts", "sync-snapshot.ts"]:
    (baseline / "server" / name).unlink()
env = {"PATH": os.environ["PATH"], "HOME": str(work), "TMPDIR": str(work),
       "TZ": "UTC", "LANG": "C.UTF-8", "CI": "true",
       "NODE_OPTIONS": "--require=" + str(copy / "verification/baseline/network-guard.cjs")}
evidence = root / "verification/sync-snapshots/evidence"
evidence.mkdir(exist_ok=True)
print("Disposable directory:", work, flush=True)
result = subprocess.run(["node", "verification/sync-snapshots/check.mjs", str(baseline)],
                        cwd=copy, env=env, capture_output=True, text=True)
(evidence / "checks.txt").write_text(result.stdout + result.stderr)
print(result.stdout + result.stderr, flush=True)
if result.returncode:
    raise SystemExit(result.returncode)
for label, directory in [("baseline", baseline), ("candidate", copy)]:
    check = subprocess.run(["node", "node_modules/typescript/bin/tsc", "--noEmit", "--incremental", "false"],
                           cwd=directory, env=env, capture_output=True, text=True)
    (evidence / f"{label}-types.txt").write_text(check.stdout + check.stderr)
    print(label, "typecheck exit:", check.returncode, check.stdout, flush=True)
if os.environ.get("SYNC_SKIP_UNCHANGED_UI") != "1":
    subprocess.run(["node", "verification/sync-snapshots/ui-build.mjs", str(baseline)], cwd=copy, env=env, check=True)
    browser_env = {key: value for key, value in env.items() if key != "NODE_OPTIONS"}
    ui = subprocess.run(["node", "verification/sync-snapshots/ui-capture.mjs", shutil.which("chromium"), str(work)],
                        cwd=copy, env=browser_env, capture_output=True, text=True, timeout=240)
    (evidence / "ui.txt").write_text(ui.stdout + ui.stderr)
    print(ui.stdout + ui.stderr, flush=True)
    # The custom sync scanner ignores .local, not Git's ignore rules.
    archive = root / ".local/verification/sync-snapshots"
    archive.mkdir(parents=True, exist_ok=True)
    for source in work.glob("*.png"):
        shutil.copyfile(source, archive / source.name)
    for source in work.glob("*-states.json"):
        shutil.copyfile(source, archive / source.name)
    if ui.returncode:
        raise SystemExit(ui.returncode)
