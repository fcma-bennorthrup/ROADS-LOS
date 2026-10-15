"""Run dependency-free logging contracts in a disposable, secret-free copy."""
import hashlib
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

root = Path(__file__).resolve().parents[2]
paths = [
    "server/index.ts", "server/routes.ts",
    "verification/api-logging/baseline-middleware.txt",
    "verification/api-logging/logging.test.mjs",
]
before = {p: hashlib.sha256((root / p).read_bytes()).hexdigest() for p in paths}
with tempfile.TemporaryDirectory(prefix="api-logging-") as directory:
    copy = Path(directory)
    for name in paths:
        destination = copy / name
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(root / name, destination)
    env = {
        "PATH": os.environ["PATH"], "HOME": directory, "TMPDIR": directory,
        "TZ": "UTC", "LANG": "en_US.UTF-8", "LC_ALL": "en_US.UTF-8",
    }
    result = subprocess.run(
        ["node", "--test", "verification/api-logging/logging.test.mjs"],
        cwd=copy, env=env, check=False,
    )
after = {p: hashlib.sha256((root / p).read_bytes()).hexdigest() for p in paths}
assert before == after, "Source changed during verification"
raise SystemExit(result.returncode)
