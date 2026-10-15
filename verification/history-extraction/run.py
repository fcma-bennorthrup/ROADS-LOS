"""Pinned reverse-extraction proof and isolated before/after History comparison."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[2]
COMPONENT = "client/src/components/loan/HistoryContent.tsx"
def digest(data):
    return hashlib.sha256(data).hexdigest()

def main():
    assert digest((ROOT / "package-lock.json").read_bytes()) == "caf5cbce73ec535033e36984f2c5d00e080a7a91c1575750b7008f7c52e9107e"
    assert digest((ROOT / "package.json").read_bytes()) == "e3a709a27242fa7cdf8385c115ea3a2ce4a332d1771b1de5e835b0e2bf21f753"
    candidate = (ROOT / COMPONENT).read_text()
    data = (ROOT / "client/src/components/loan/history-data.ts").read_text()
    transforms = (ROOT / "client/src/components/loan/history-transforms.ts").read_text()
    parser = transforms.split("export function parseTimestamp")[1].split("export function filterAndSortHistory")[0]
    parser = "function parseTimestamp" + parser
    body = transforms.split("  let data = entries;")[1].rsplit("\n}", 1)[0]
    body = "  let data = CHANGE_LOG;" + body
    body = "\n".join("  " + line if line else line for line in body.splitlines()) + "\n"
    imports = ('import { CHANGE_LOG, COLUMNS, ITEMS_PER_PAGE_OPTIONS, type ChangeLogEntry } from "./history-data";\n'
               'import { filterAndSortHistory } from "./history-transforms";\n')
    assert candidate.count(imports) == 1
    original = candidate.replace(imports, "\n" + data.replace("export ", "") + "\n" + parser.rstrip() + "\n")
    original = original.replace("    return filterAndSortHistory(CHANGE_LOG, searchQuery, sortDirection);\n", body)
    # Exact byte proof also protects unchanged JSX, handlers, memo dependencies,
    # navigation, pagination and every moved constant including the unused map.
    assert digest(original.encode()) == "56c38a3c5ede611dfddbdf49b0b208f7c7bfeeab0c2058ba9746874c94381fe1", "Reverse extraction differs from pre-edit local source"
    paths = [p for directory in ("client", "shared") for p in (ROOT / directory).rglob("*") if p.is_file()]
    paths += [ROOT / name for name in ("package.json", "package-lock.json", "vitest.config.ts", "tsconfig.json", "tailwind.config.ts", "postcss.config.js")]
    before = {str(p.relative_to(ROOT)): digest(p.read_bytes()) for p in paths}
    work = Path(tempfile.mkdtemp(prefix="history-extraction-"))
    copy = work / "copy"
    copy.mkdir()
    for directory in ("client", "shared", "verification"):
        shutil.copytree(ROOT / directory, copy / directory)
    for name in before:
        if "/" not in name:
            shutil.copyfile(ROOT / name, copy / name)
    # Reuse installed packages only when their versions match the accepted lock.
    for name, item in json.loads((ROOT / "package-lock.json").read_text())["packages"].items():
        if not name:
            continue
        manifest = ROOT / name / "package.json"
        if not manifest.exists() and item.get("optional"):
            continue
        assert json.loads(manifest.read_text())["version"] == item["version"], name
    os.symlink(ROOT / "node_modules", copy / "node_modules", target_is_directory=True)
    (copy / "verification/history-extraction/Baseline.tsx").write_text(original.replace(
        'from "./RoadsDropdown"', 'from "@/components/loan/RoadsDropdown"'))
    env = {"PATH": os.environ["PATH"], "HOME": str(work), "TMPDIR": str(work),
           "TZ": "UTC", "LANG": "C.UTF-8", "CI": "true"}
    result = {"before": before, "mechanical_equivalence": True, "commands": []}
    print("Disposable copy:", copy, flush=True)
    def run(label, args, guarded=True):
        child = env.copy()
        if guarded:
            child["NODE_OPTIONS"] = "--require=" + str(copy / "verification/baseline/network-guard.cjs")
        with (work / (label + ".log")).open("w") as log:
            code = subprocess.run(args, cwd=copy, env=child, stdout=log, stderr=subprocess.STDOUT).returncode
        result["commands"].append({"label": label, "exit": code})
        print(label, code, flush=True)
        assert code == 0, str(work / (label + ".log"))
    try:
        run("tests", ["node", "node_modules/vitest/vitest.mjs", "run", "--config",
                     "verification/history-extraction/vitest.config.ts", "--reporter=verbose"])
        browser = shutil.which("chromium")
        assert browser, "No existing Chromium available"
        for fixture, builder in (
            ("empty", "verification/history-loan-scope/build-capture.mjs"),
            ("synthetic", "verification/history-extraction/build-synthetic.mjs"),
        ):
            for version in ("before", "after"):
                (copy / COMPONENT).write_text(original if version == "before" else candidate)
                label = fixture + "-" + version
                run(label + "-build", ["node", builder])
                out = work / label
                out.mkdir()
                run(label + "-captures", ["node", "verification/history/browser-capture.mjs",
                                         browser, str(copy), str(out)], guarded=False)
            first = json.loads((work / (fixture + "-before/results.json")).read_text())
            second = json.loads((work / (fixture + "-after/results.json")).read_text())
            assert first == second, "Browser measurements or screenshot hashes differ: " + fixture
        result["browser_exact_match"] = True
    finally:
        (copy / COMPONENT).write_text(candidate)
        result["source_unchanged"] = all(digest((ROOT / p).read_bytes()) == h for p, h in before.items())
        result["copy_unchanged"] = all(digest((copy / p).read_bytes()) == h for p, h in before.items())
        (work / "results.json").write_text(json.dumps(result, indent=2) + "\n")
    assert result["source_unchanged"] and result["copy_unchanged"]

if __name__ == "__main__":
    main()
