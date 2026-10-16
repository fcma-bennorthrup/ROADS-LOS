"""Negative checks for explicitly approved manifests; no install or app execution."""
import copy
import json
from pathlib import Path
import subprocess
import sys
import tempfile

root = Path(__file__).resolve().parents[2]
approved = json.loads((Path(sys.argv[1]) if len(sys.argv) > 1 else
    root / "docs/architecture-audit/token-equivalence-evidence/approved-completion-baseline.json").read_text())
cases = [
    ("dependency hash", "package-lock.json", "change", "Unapproved contract change"),
    ("token expectation", "client/src/styles/design-tokens.css", "change", "Unapproved contract change"),
    ("other source drift", "server/routes.ts", "change", "Unreconciled drift"),
    ("missing new source", approved["added_source_paths"][0], "remove", "Unpinned source"),
    ("out-of-scope path", "../unapproved", "change", "Unpinned source"),
]
results = []
with tempfile.TemporaryDirectory(prefix="token-gate-check-") as directory:
    for label, name, operation, message in cases:
        fixture = copy.deepcopy(approved)
        if operation == "remove":
            del fixture["files"][name]
        else:
            fixture["files"][name] = "0" * 64
        path = Path(directory) / "manifest.json"
        path.write_text(json.dumps(fixture))
        run = subprocess.run(
            [sys.executable, str(root / "verification/tokens/run.py"), "--baseline", str(path)],
            cwd=root, capture_output=True, text=True,
        )
        assert run.returncode != 0 and message in run.stderr, (label, run.stdout, run.stderr)
        assert "token-verification-" not in run.stdout, "Rejected manifest reached installation"
        results.append({"case": label, "result": "passed", "rejected_before_install": True})
print(json.dumps(results, indent=2))
