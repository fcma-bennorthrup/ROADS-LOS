"""Task-local baseline/candidate comparison; never starts App or the backend."""
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[2]
TARGET = "client/src/components/loan/BalanceSheetSection.tsx"
ACCEPTED = {
    "package-lock.json": "caf5cbce73ec535033e36984f2c5d00e080a7a91c1575750b7008f7c52e9107e",
    "SETUP.md": "0226c80b675a0fab6c4df22b562013ceafd42bb8d60d5d0355a2642cb9a392e6",
    "replit.md": "a92e1ae7924aaf64eb78b69e48ea94f81c6998463017a8980244dc1680447e24",
    # Explicit approval for this comparison only; shared gates stay unchanged.
    "client/src/components/loan/BorrowerInformationContent.tsx": "d623472d85de0eacb6482690560d0866f83a6381daea70d30f68e0934903ccf3",
    "client/src/components/loan/CollateralContent.tsx": "6859528145067fbf634b94e34632bdd59b1441d2a180a73498aba8f1e99a8f45",
    "client/src/components/loan/ProductPricingContent.tsx": "d3afebeefa31736895038b6e3333725005db6fbbe883c79b2379500d6f8965a2",
    "client/src/contexts/checklist-context.tsx": "b1005210568e3ca13887ce534c25234dd89d08c539e5ab46026837340bb91ab1",
    "client/src/contexts/loan-activity-context.tsx": "c98d793e053b815638ac37d4eb13be75fb0781876e64dd160e66d2f84a8707db",
    "server/index.ts": "2eee6c655d508e045a980256d4aa57624ce3c336ac9fe0758d6b0b003fc6d64d",
}
def digest(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

candidate = (ROOT / TARGET).read_text()
hook = re.search(r"function useBalanceMenu\(\) \{\n(.*?)\n  return \{ menuOpen, setMenuOpen, menuRef \};\n\}\n\n", candidate, re.S)
assert hook
baseline = candidate.replace(hook[0], "").replace(
    "  const { menuOpen, setMenuOpen, menuRef } = useBalanceMenu();", hook[1].rstrip())
rows = re.findall(r"^\| `([^`]+)` \| (\d+) \| `([0-9a-f]{64})` \|",
                  (ROOT / "docs/architecture-audit/baseline.md").read_text(), re.M)
assert len(rows) == 174
before = {}
for name, _, historical in rows:
    p = ROOT / name
    assert p.is_file() and not p.is_symlink(), name
    before[name] = digest(p)
    if name == TARGET:
        assert hashlib.sha256(baseline.encode()).hexdigest() == historical, "Extraction changed more than lifecycle"
    else:
        assert before[name] == ACCEPTED.get(name, historical), name
work = Path(tempfile.mkdtemp(prefix="decisioning-verification-menu-"))
copy = work / "copy"
for name in before:
    dest = copy / name
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(ROOT / name, dest)
# Include the current first-party modules introduced by approved prior extractions.
shutil.copytree(ROOT / "client/src", copy / "client/src", dirs_exist_ok=True)
for name in ("baseline", "decisioning", "balance-menu"):
    shutil.copytree(ROOT / "verification" / name, copy / "verification" / name,
                    ignore=shutil.ignore_patterns("__pycache__"))
env = {"PATH": os.environ["PATH"], "HOME": str(work / "home"), "TMPDIR": str(work),
       "TZ": "UTC", "LANG": "C.UTF-8", "CI": "true",
       "npm_config_cache": str(work / "npm-cache"), "npm_config_userconfig": "/dev/null"}
Path(env["HOME"]).mkdir()
results = {"before": before, "commands": []}
def run(label, args, guarded=True):
    child = env.copy()
    if guarded:
        child["NODE_OPTIONS"] = "--require=" + str(copy / "verification/baseline/network-guard.cjs")
    with (work / f"{label}.log").open("w") as log:
        code = subprocess.run(args, cwd=copy, env=child, stdout=log, stderr=subprocess.STDOUT).returncode
    results["commands"].append({"label": label, "exit": code})
    print(label, code, flush=True)
    assert code == 0, str(work / f"{label}.log")

# Reuse the existing disposable browser driver without editing its shared file.
driver = (ROOT / "verification/decisioning/capture.mjs").read_text()
driver = driver.replace('["income", "balance-menu", "panels"]',
                        '["income", "balance-menu", "asset-menu", "hover", "focus", "panels"]')
driver = driver.replace('      if (state === "panels") {', '''
      if (state === "asset-menu") {
        await click('[data-testid="balance-sheet-row-current-assets"] [data-testid="button-more-asset-0"]');
      }
      if (state === "hover" || state === "focus") {
        await evaluate(`(() => {
          const b = document.querySelector('[data-testid="button-delete-asset-0"]');
          if (${JSON.stringify(state)} === 'hover')
            b.dispatchEvent(new MouseEvent('mouseover', {bubbles:true}));
          else b.focus();
        })()`);
      }
      if (state === "panels") {''')
driver = driver.replace('      const { data } = await call("Page.captureScreenshot", { format: "png" });', '''
      await evaluate(`Promise.all(document.getAnimations().map(a => a.finished.catch(() => {})))`);
      metadata.dom = await evaluate(`document.getElementById('root').innerHTML`);
      metadata.computed = await evaluate(`Array.from(document.querySelectorAll('#root *')).map(e => {
        const s = getComputedStyle(e), r = e.getBoundingClientRect();
        return [e.tagName, e.textContent, Array.from(s).sort().map(k => [k,s.getPropertyValue(k)]),
          [r.x,r.y,r.width,r.height], e.scrollTop,e.scrollLeft,e === document.activeElement];
      })`);
      metadata.viewport = await evaluate(`[innerWidth,innerHeight]`);
      if (metadata.viewport[0] !== width || metadata.viewport[1] !== height) throw Error('viewport mismatch');
      const { data } = await call("Page.captureScreenshot", { format: "png" });''')
(copy / "verification/balance-menu/capture.mjs").write_text(driver)
print(work, flush=True)
try:
    run("install", ["npm", "ci", "--ignore-scripts", "--no-audit", "--no-fund"], False)
    for phase, source in (("baseline", baseline), ("candidate", candidate)):
        (copy / TARGET).write_text(source)
        run(phase + "-tests", ["node", "node_modules/vitest/vitest.mjs", "run", "--config",
            "verification/baseline/vitest.config.ts", "--reporter=verbose",
            "verification/balance-menu", "verification/decisioning"])
        run(phase + "-browser", ["node", "verification/balance-menu/capture.mjs"])
        (work / "browser-evidence").rename(work / (phase + "-browser"))
    a, b = work / "baseline-browser", work / "candidate-browser"
    results["browser_exact"] = all((b / p.name).read_bytes() == p.read_bytes()
                                  for p in a.iterdir() if p.suffix in (".png", ".json"))
    assert results["browser_exact"], "Browser comparison differs"
finally:
    results["source_unchanged"] = all(digest(ROOT / p) == h for p, h in before.items())
    (work / "results.json").write_text(json.dumps(results, indent=2) + "\n")
    print("Workspace preserved:", results["source_unchanged"], flush=True)
