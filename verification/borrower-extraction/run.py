"""Compare the accepted source with a mechanically extracted candidate, in /tmp."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[2]
BORROWER = "client/src/components/loan/BorrowerInformationContent.tsx"
SPEC = importlib.util.spec_from_file_location("origination_runner", ROOT / "verification/origination/run.py")
ORIG = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(ORIG)
ACCEPTED = {**ORIG.ACCEPTED,
    # Explicit user approval for this comparison only; not a shared baseline change.
    "server/index.ts": "2eee6c655d508e045a980256d4aa57624ce3c336ac9fe0758d6b0b003fc6d64d"}

def digest(data):
    return hashlib.sha256(data).hexdigest()

def main():
    rows = re.findall(r"^\| `([^`]+)` \| (\d+) \| `([0-9a-f]{64})` \|",
                      (ROOT / "docs/architecture-audit/baseline.md").read_text(), re.M)
    assert len(rows) == 174
    original = (ROOT / "verification/borrower-extraction/BorrowerInformationBaseline.tsx").read_text().replace(
        'from "@/components/loan/RoadsDropdown"', 'from "./RoadsDropdown"')
    paths = [n for n, _, _ in rows]
    for name, _, historical in rows:
        data = original.encode() if name == BORROWER else (ROOT / name).read_bytes()
        assert digest(data) == ACCEPTED.get(name, historical), f"Baseline mismatch: {name}"

    # Exact reverse-extraction proof: exports/imports are the only edits to moved blocks.
    def block(start, end):
        return original[original.index(start):original.index(end)]
    helpers = block("function DisabledRadio(", "function PersonalInfoSection(")
    decl = block("const DECLARATION_QUESTIONS:", "function MilitarySection(")
    military = block("function MilitarySection(", "function DemographicSection(")
    demo = block("function DemographicSection(", "export function BorrowerInformationContent(")
    presentation = ROOT / "client/src/components/loan/borrower-presentation"
    expected = {
        "QuestionnaireDisplays.tsx": re.sub(r"(?m)^function ", "export function ", helpers),
        "DeclarationsSection.tsx": 'import { YesNoQuestion, DisabledCheckbox, MoneyDisplayField } from "./QuestionnaireDisplays";\n\n' + decl.replace("function DeclarationsSection", "export function DeclarationsSection"),
        "MilitarySection.tsx": 'import { Calendar } from "lucide-react";\nimport { YesNoQuestion, DisabledCheckbox } from "./QuestionnaireDisplays";\n\n' + military.replace("function MilitarySection", "export function MilitarySection"),
        "DemographicSection.tsx": 'import { DisabledRadio, DisabledCheckbox, MoneyDisplayField } from "./QuestionnaireDisplays";\n\n' + demo.replace("function DemographicSection", "export function DemographicSection"),
    }
    for name, content in expected.items():
        assert (presentation / name).read_text() == content, name
    candidate = original.replace(helpers, "").replace(decl + military + demo, "").replace(
        'import { RoadsDropdown } from "./RoadsDropdown";',
        'import { RoadsDropdown } from "./RoadsDropdown";\nimport { DeclarationsSection } from "./borrower-presentation/DeclarationsSection";\nimport { MilitarySection } from "./borrower-presentation/MilitarySection";\nimport { DemographicSection } from "./borrower-presentation/DemographicSection";')
    assert (ROOT / BORROWER).read_text() == candidate
    paths += [str(p.relative_to(ROOT)) for p in presentation.glob("*.tsx")]
    before = {p: digest((ROOT / p).read_bytes()) for p in paths}
    work = Path(tempfile.mkdtemp(prefix="borrower-extraction-"))
    copy = work / "copy"
    for name in paths:
        dest = copy / name
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT / name, dest)
    for scope in ("baseline", "origination", "borrower-extraction"):
        shutil.copytree(ROOT / "verification" / scope, copy / "verification" / scope)
    env = {"PATH": os.environ["PATH"], "HOME": str(work / "home"), "TMPDIR": str(work),
           "TZ": "UTC", "LANG": "C.UTF-8", "CI": "true",
           "npm_config_cache": str(work / "npm-cache"), "npm_config_userconfig": "/dev/null"}
    Path(env["HOME"]).mkdir()
    results = {"before": before, "mechanical_equivalence": True, "commands": [],
               "timezone": "UTC", "node": subprocess.check_output(["node", "--version"], env=env, text=True).strip()}
    print(work, flush=True)
    def run(label, argv, guarded=False):
        child = env.copy()
        if guarded:
            child["NODE_OPTIONS"] = "--require=" + str(copy / "verification/baseline/network-guard.cjs")
        with (work / f"{label}.log").open("w") as out:
            code = subprocess.run(argv, cwd=copy, env=child, stdout=out, stderr=subprocess.STDOUT).returncode
        results["commands"].append({"label": label, "exit": code})
        print(label, code, flush=True)
    try:
        run("install", ["npm", "ci", "--ignore-scripts", "--no-audit", "--no-fund"])
        if results["commands"][-1]["exit"] == 0:
            run("tests", ["node", "node_modules/vitest/vitest.mjs", "run", "--config",
                         "verification/borrower-extraction/vitest.config.ts", "--reporter=verbose"], True)
    finally:
        results["source_unchanged"] = all(digest((ROOT / n).read_bytes()) == h for n, h in before.items())
        results["copy_unchanged"] = all(digest((copy / n).read_bytes()) == h for n, h in before.items())
        (work / "results.json").write_text(json.dumps(results, indent=2) + "\n")
    return 0 if (len(results["commands"]) == 2 and results["source_unchanged"]
                 and results["copy_unchanged"] and all(c["exit"] == 0 for c in results["commands"])) else 1

if __name__ == "__main__":
    raise SystemExit(main())
