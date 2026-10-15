"""Task-scoped current-source baseline; disposable installs and blocked transports."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[2]
TARGET = "client/src/components/loan/DecisioningSummaryContent.tsx"
LOCK = "caf5cbce73ec535033e36984f2c5d00e080a7a91c1575750b7008f7c52e9107e"
digest = lambda data: hashlib.sha256(data).hexdigest()
assert digest((ROOT / "package-lock.json").read_bytes()) == LOCK
candidate = (ROOT / TARGET).read_text()
# Reconstruct only this task's pre-change component; verify exact original bytes.
baseline = candidate.replace('useEffect, useRef, useState', 'useEffect, useState')
start = baseline.index('  const { setActionStatus')
end = baseline.index('  const { addActivity', start)
baseline = baseline[:start] + '''  const [isDecisioned, setIsDecisioned] = useState(false);
  const [letterGenerated, setLetterGenerated] = useState(false);
  const [creditPulled, setCreditPulled] = useState(false);
  const { setActionStatus, completeAction, getActionStatus, demoResetVersion } = useChecklist();
''' + baseline[end:]
baseline = baseline.replace('    if (observedResetVersion.current === demoResetVersion) return;\n'
                            '    observedResetVersion.current = demoResetVersion;\n', '')
assert digest(baseline.encode()) == "49309fe5038d847025ac29354e3a6caa83e26d03a02abd7ddf6a0c16fdfe10df"
work = Path(tempfile.mkdtemp(prefix="decisioning-restoration-"))
copy = work / "copy"
copy.mkdir()
# Current local source is explicitly approved for this task only. Never copy
# credentials/runtime state, run the live App/server, or mutate shared runners.
for directory in ("client", "shared", "verification"):
    shutil.copytree(ROOT / directory, copy / directory,
                    ignore=shutil.ignore_patterns("node_modules", "__pycache__"))
for name in ("package.json", "package-lock.json", "tsconfig.json", "vitest.config.ts",
             "tailwind.config.ts", "postcss.config.js", ".npmrc"):
    if (ROOT / name).is_file():
        shutil.copyfile(ROOT / name, copy / name)
before = {str(p.relative_to(copy)): digest(p.read_bytes()) for p in copy.rglob("*") if p.is_file()}
env = {"PATH": os.environ["PATH"], "HOME": str(work / "home"), "TMPDIR": str(work),
       "TZ": "UTC", "LANG": "C.UTF-8", "CI": "true",
       "npm_config_cache": str(work / "npm-cache"), "npm_config_userconfig": "/dev/null"}
Path(env["HOME"]).mkdir()
results = {"before": before, "commands": [], "copy": str(copy)}
print(work, flush=True)
def run(label, args, guarded=True):
    child = env.copy()
    child["RESTORATION_PHASE"] = label.split("-")[0]
    if guarded:
        child["NODE_OPTIONS"] = "--require=" + str(copy / "verification/baseline/network-guard.cjs")
    with (work / (label + ".log")).open("w") as log:
        code = subprocess.run(args, cwd=copy, env=child, stdout=log, stderr=subprocess.STDOUT).returncode
    results["commands"].append({"label": label, "exit": code})
    print(label, code, flush=True)
    return code
try:
    if run("install", ["npm", "ci", "--ignore-scripts", "--no-audit", "--no-fund"], False) == 0:
        for phase, source in (("baseline", baseline), ("candidate", candidate)):
            (copy / TARGET).write_text(source)
            run(phase + "-tests", ["node", "node_modules/vitest/vitest.mjs", "run", "--config",
                "verification/baseline/vitest.config.ts", "--reporter=verbose",
                "verification/decisioning-restoration/restoration.test.tsx",
                "verification/decisioning/route.test.tsx",
                "client/src/components/loan/__tests__/DecisioningSummaryContent.test.tsx"])
            run(phase + "-browser", ["node", "verification/decisioning-restoration/capture.mjs"])
finally:
    (copy / TARGET).write_text(candidate)
    results["source_unchanged"] = all(digest((ROOT / n).read_bytes()) == h for n, h in before.items())
    results["copy_unchanged"] = all(digest((copy / n).read_bytes()) == h for n, h in before.items())
    (work / "results.json").write_text(json.dumps(results, indent=2) + "\n")
    print("Preserved:", results["source_unchanged"], results["copy_unchanged"], flush=True)
raise SystemExit(0 if len(results["commands"]) == 5 and all(c["exit"] == 0 for c in results["commands"])
                 and results["source_unchanged"] and results["copy_unchanged"] else 1)
