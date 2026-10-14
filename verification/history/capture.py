"""Static screenshots only; no App/server and no browser dependency install.

Usage: python verification/history/capture.py /tmp/history-verification-.../copy
Requires the existing system chromium. Writes outputs beside the disposable copy.
"""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys

copy = Path(sys.argv[1]).resolve()
assert copy.parent.name.startswith("history-verification-") and copy.name == "copy"
root = Path(__file__).resolve().parents[2]
before = json.loads((copy.parent / "results.json").read_text())["before"]
def preserved(base):
    return all((base / name).is_file() and not (base / name).is_symlink()
               and hashlib.sha256((base / name).read_bytes()).hexdigest() == digest
               for name, digest in before.items())
assert preserved(root) and preserved(copy), "Drift since the isolated test run"
out = copy.parent / "captures"
out.mkdir(exist_ok=True)
env = {"PATH": os.environ["PATH"], "HOME": str(copy.parent / "browser-home"),
       "TMPDIR": str(copy.parent), "TZ": "UTC", "LANG": "C.UTF-8"}
Path(env["HOME"]).mkdir(exist_ok=True)
chromium = shutil.which("chromium")
assert chromium, "No authorized system browser is available"
subprocess.run(["node", "verification/history/build-capture.mjs"], cwd=copy, env=env, check=True)
subprocess.run(["node", "verification/history/browser-capture.mjs", chromium, str(copy), str(out)],
               cwd=copy, env=env, check=True, timeout=180)
result = json.loads((out / "results.json").read_text())
result["source_unchanged"] = preserved(root)
result["copy_unchanged"] = preserved(copy)
(out / "results.json").write_text(json.dumps(result, indent=2) + "\n")
assert result["source_unchanged"] and result["copy_unchanged"], "Capture changed baseline files"
