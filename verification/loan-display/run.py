"""Task-local current-source comparison; never starts the live App."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[2]
HASHES = {
    "closing-booking": "b02c1858c031e648a5470eaffcbb201eeeec7258ce46dc9e66d74353e758d3b0",
    "coming-soon": "7ac5a07d1825312cfefdd8012589afae8bbdb3a63fc18f8f59305118c4083892",
    "decisioning": "35683e3b48b79bd654e753c795400f5aaa56d4d67ffd46d1f611835b8235d2e0",
    "documents": "33b39376b449aae42795052f713957cd7e1485d113ae4c6c174a61cd629b59b3",
    "history": "8eccfa2f9b594e10b8a2ba39d1246f8e79b5974d81d4b23320fc1921297369e3",
    "origination": "d381474008294d950ce458aaa17e768bd366a7126e9835ec48a0eb495b9136b0",
    "summary": "9a67e90d1c9a4424c2229608a9bf0ba9a423390d95cdc5e2c2ff3a1f8623fd1d",
}
def sha(data):
    return hashlib.sha256(data).hexdigest()

assert sha((ROOT / "package-lock.json").read_bytes()) == "caf5cbce73ec535033e36984f2c5d00e080a7a91c1575750b7008f7c52e9107e"
assert sha((ROOT / "package.json").read_bytes()) == "e3a709a27242fa7cdf8385c115ea3a2ce4a332d1771b1de5e835b0e2bf21f753"
work = Path(tempfile.mkdtemp(prefix="loan-display-"))
copy = work / "copy"
copy.mkdir()
paths = []
for folder in ("client", "shared", "verification", "attached_assets"):
    for p in (ROOT / folder).rglob("*"):
        if p.is_file() and not p.is_symlink() and "node_modules" not in p.parts:
            paths.append(p.relative_to(ROOT))
for name in ("package.json", "package-lock.json", ".npmrc", "tsconfig.json",
             "tailwind.config.ts", "postcss.config.js", "vitest.config.ts"):
    if (ROOT / name).exists():
        paths.append(Path(name))
before = {}
for name in paths:
    data = (ROOT / name).read_bytes()
    before[str(name)] = sha(data)
    target = copy / name
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
# Reverse only the extraction, then require the exact pre-edit page hashes.
# This proves every JSX node, prop, query option, event handler and default is unchanged.
helper = (copy / "client/src/lib/loan-display.ts").read_text()
original = helper.replace("export interface", "interface").replace("export function", "function")
original = original.replace("// Preserve the loan pages' prefix parsing, $NaN, and dollar-before-minus output.\n", "").rstrip()
for name, expected in HASHES.items():
    page = copy / f"client/src/pages/loan-{name}.tsx"
    baseline = page.read_text().replace(
        'import { formatCurrency, type LoanWithBorrowers } from "@/lib/loan-display";', original)
    assert sha(baseline.encode()) == expected, f"Non-extraction change: {name}"
    (page.parent / f"baseline-{name}.tsx").write_text(baseline)
env = {"PATH": os.environ["PATH"], "HOME": str(work / "home"), "TMPDIR": str(work),
       "TZ": "UTC", "LANG": "C.UTF-8", "CI": "true",
       "npm_config_cache": str(work / "npm-cache"), "npm_config_userconfig": "/dev/null"}
Path(env["HOME"]).mkdir()
results = {"source_hashes": before, "commands": []}
print(work, flush=True)
def run(label, args, guarded=True):
    child = env.copy()
    if guarded:
        child["NODE_OPTIONS"] = "--require=" + str(copy / "verification/baseline/network-guard.cjs")
    with (work / f"{label}.log").open("w") as log:
        status = subprocess.run(args, cwd=copy, env=child, stdout=log, stderr=subprocess.STDOUT).returncode
    results["commands"].append({"label": label, "exit": status})
    print(label, status, flush=True)
    return status
try:
    assert run("install", ["npm", "ci", "--ignore-scripts", "--no-audit", "--no-fund"], False) == 0
    assert run("contracts", ["node", "verification/loan-display/contracts.mjs"]) == 0
    assert run("browser", ["node", "verification/loan-display/capture.mjs"]) == 0
finally:
    results["preserved"] = all(sha((ROOT / p).read_bytes()) == h for p, h in before.items())
    (work / "results.json").write_text(json.dumps(results, indent=2))
    assert results["preserved"]
