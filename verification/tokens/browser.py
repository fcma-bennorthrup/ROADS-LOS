"""Build/run the full token browser matrix in an existing disposable copy.

First run run.py; then prepare-fonts.py <work>/fonts (authorized separately);
then python verification/tokens/browser.py <work>.
"""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys

root = Path(__file__).resolve().parents[2]
work = Path(sys.argv[1]).resolve()
assert work.parent == Path("/tmp") and work.name.startswith("token-verification-")
copy = work / "copy"
before = json.loads((work / "results.json").read_text())["before"]
def preserved(base):
    return all((base / name).is_file() and not (base / name).is_symlink()
               and hashlib.sha256((base / name).read_bytes()).hexdigest() == h for name,h in before.items())
assert preserved(root) and preserved(copy), "Drift since authored checks"
# Copy owned fixtures only. Never change shared fixtures or production sources.
shutil.copytree(root / "verification/tokens", copy / "verification/tokens", dirs_exist_ok=True)
env = {"PATH":os.environ["PATH"],"HOME":str(work / "browser-home"),"TMPDIR":str(work),
       "TZ":"UTC","LANG":"C.UTF-8",
       "NODE_OPTIONS":"--require=" + str(copy / "verification/baseline/network-guard.cjs")}
Path(env["HOME"]).mkdir(exist_ok=True)
browser = shutil.which("chromium")
assert browser, "Authorized existing Chromium unavailable"
result = {}
try:
    subprocess.run(["node","verification/tokens/build-browser.mjs"],cwd=copy,env=env,check=True)
    subprocess.run(["node","verification/tokens/browser.mjs",browser,str(work),*sys.argv[2:]],cwd=copy,env=env,check=True)
finally:
    result["source_unchanged"] = preserved(root)
    result["copy_unchanged"] = preserved(copy)
    (work / "browser-preservation.json").write_text(json.dumps(result,indent=2)+"\n")
    assert all(result.values()), "Browser verification changed production files"
