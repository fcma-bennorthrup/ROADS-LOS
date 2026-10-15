"""Isolated query extraction proof; reuse existing fixtures without changing them."""
from pathlib import Path
import hashlib
import json
import os
import shutil
import subprocess
import tempfile
import sys

ROOT = Path(__file__).resolve().parents[2]
HASHES = {
    "closing-booking": "0452c179b81bb0931a7fd23fbe84c0f8be204b031038b484fd51e8d4d8119195",
    "coming-soon": "261574fc4162c6e5e7f53572a74b172eef8dc27b33ce8eb3e111e942dabea551",
    "decisioning": "8abcf5ddc37cad8bd0865f172b9dda18208332ea4641b9ad998a2c80f4faa6fe",
    "documents": "5ea7b2070e415b3322f3deb5a2fde10354b8a7462f38237bde12b2c2a9d45afe",
    "history": "af5e261ecfbed348b59f90a2239412bd67d82e19662fc56f439936b095f32ae5",
    "origination": "9e6597ef1f2d8d6791b9770d1bf13de7ccabbd42bb5ea043224e0abbef13dfdf",
    "summary": "1c4e5465208758d1dfcf610de9d68d9174284c8c5e102ac9fac11e26948e2705",
}
def sha(data):
    return hashlib.sha256(data).hexdigest()

assert sha((ROOT / "package-lock.json").read_bytes()) == "caf5cbce73ec535033e36984f2c5d00e080a7a91c1575750b7008f7c52e9107e"
assert sha((ROOT / "package.json").read_bytes()) == "e3a709a27242fa7cdf8385c115ea3a2ce4a332d1771b1de5e835b0e2bf21f753"
work = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path(tempfile.mkdtemp(prefix="loan-query-"))
assert str(work).startswith("/tmp/loan-query-")
copy = work / "copy"
copy.mkdir(exist_ok=True)
before = {}
for folder in ("client", "shared", "server", "verification", "attached_assets"):
    for p in (ROOT / folder).rglob("*"):
        if p.is_file() and not p.is_symlink() and "node_modules" not in p.parts:
            name = p.relative_to(ROOT)
            data = p.read_bytes()
            before[str(name)] = sha(data)
            dest = copy / name
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(data)
for name in ("package.json", "package-lock.json", ".npmrc", "tsconfig.json", "vite.config.ts",
             "tailwind.config.ts", "postcss.config.js", "vitest.config.ts"):
    shutil.copyfile(ROOT / name, copy / name)
    before[name] = sha((ROOT / name).read_bytes())
for name, expected in HASHES.items():
    page = copy / f"client/src/pages/loan-{name}.tsx"
    baseline = page.read_text().replace(
        'import { useLoanQuery } from "@/hooks/use-loan-query";',
        'import { useQuery } from "@tanstack/react-query";').replace(
        'import { formatCurrency } from "@/lib/loan-display";',
        'import { formatCurrency, type LoanWithBorrowers } from "@/lib/loan-display";').replace(
        'useLoanQuery(loanId);',
        'useQuery<LoanWithBorrowers>({\n    queryKey: ["/api/loans", loanId],\n  });')
    assert sha(baseline.encode()) == expected, f"Non-extraction change: {name}"
    (page.parent / f"baseline-{name}.tsx").write_text(baseline)
# Reuse the existing element comparison with the new hook resolved, still asserting
# the exact single query option. Child elements remain inert, as in the original.
contracts = (copy / "verification/loan-display/contracts.mjs").read_text().replace(
    'if (name === "@/lib/loan-display")',
    'if (name === "@/hooks/use-loan-query") return load("client/src/hooks/use-loan-query.ts");\n    if (name === "@/lib/loan-display")')
(copy / "verification/loan-query/contracts.mjs").write_text(contracts)
# Same actual browser fixture; do NOT inherit the prior extraction's pixel waivers.
capture = (copy / "verification/loan-display/capture.mjs").read_text()
start = capture.index("      const approvedFocusPairs = {")
end = capture.index("      assert.deepEqual(pair[0].data", start)
capture = capture[:start] + "      const approvedFocusPairs = {};\n" + capture[end:]
(copy / "verification/loan-query/capture.mjs").write_text(capture)
typecheck = (copy / "verification/loan-display/typecheck.py").read_text().replace(
    '"/tmp/loan-display-"', '"/tmp/loan-query-"')
typecheck = typecheck.replace('shutil.copytree(ROOT / "server", copy / "server", dirs_exist_ok=True)', '').replace(
    'shutil.copyfile(ROOT / "vite.config.ts", copy / "vite.config.ts")', '')
(copy / "verification/loan-query/typecheck.py").write_text(typecheck)
env = {"PATH": os.environ["PATH"], "HOME": str(work / "home"), "TMPDIR": str(work),
       "TZ": "UTC", "LANG": "C.UTF-8", "CI": "true",
       "npm_config_cache": str(work / "npm-cache"), "npm_config_userconfig": "/dev/null"}
Path(env["HOME"]).mkdir(exist_ok=True)
results = {"source_hashes": before, "commands": []}
prior = json.loads((work / "results.json").read_text()) if "--resume" in sys.argv and (work / "results.json").exists() else {}
print(work, flush=True)
def run(label, args, guarded=True):
    previous = next((c for c in prior.get("commands", []) if c["label"] == label), None)
    if previous and label in ("contracts", "query", "baseline-query"):
        results["commands"].append(previous)
        print(label, previous["exit"], "(unchanged check reused)", flush=True)
        return previous["exit"]
    child = env.copy()
    if guarded:
        child["NODE_OPTIONS"] = "--require=" + str(copy / "verification/baseline/network-guard.cjs")
    with (work / f"{label}.log").open("w") as log:
        status = subprocess.run(args, cwd=copy, env=child, stdout=log, stderr=subprocess.STDOUT).returncode
    results["commands"].append({"label": label, "exit": status})
    print(label, status, flush=True)
    return status
try:
    if not (copy / "node_modules").exists():
        assert run("install", ["npm", "ci", "--ignore-scripts", "--no-audit", "--no-fund"], False) == 0
    assert run("contracts", ["node", "verification/loan-query/contracts.mjs"]) == 0
    query_status = run("query", ["node", "node_modules/vitest/vitest.mjs", "run", "--config", "verification/loan-query/vitest.config.ts"])
    originals = {copy / f"client/src/pages/loan-{name}.tsx": (copy / f"client/src/pages/loan-{name}.tsx").read_bytes() for name in HASHES}
    try:
        for page in originals:
            page.write_bytes((page.parent / page.name.replace("loan-", "baseline-")).read_bytes())
        baseline_status = run("baseline-query", ["node", "node_modules/vitest/vitest.mjs", "run", "--config", "verification/loan-query/vitest.config.ts"])
    finally:
        for page, data in originals.items():
            page.write_bytes(data)
    assert run("typecheck", ["python", "verification/loan-query/typecheck.py", str(copy)]) == 0
    assert run("browser", ["node", "verification/loan-query/capture.mjs"]) == 0
    assert query_status == baseline_status == 0, "Existing route fixture failure; see both logs (not waived)"
finally:
    results["preserved"] = all(sha((ROOT / p).read_bytes()) == h for p, h in before.items())
    (work / "results.json").write_text(json.dumps(results, indent=2))
    assert results["preserved"]
