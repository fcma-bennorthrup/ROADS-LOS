#!/usr/bin/env python3
"""Read-only preview port validation; requires Python 3.11+."""
import argparse
import pathlib
import re
import tomllib


def check(config, source, port=None):
    errors = []
    # PORT may override the fallback at runtime. Do not enforce this fallback
    # on deployment settings: they receive their own environment and routing.
    if port is None:
        match = re.search(r'process\.env\.PORT\s*\|\|\s*["\'](\d+)["\']', source)
        if not match:
            return ["Cannot determine server fallback port; provide --port explicitly."]
        port = int(match.group(1))
    if not 1 <= port <= 65535:
        return ["Server port must be between 1 and 65535."]
    workflows = config.get("workflows", {}).get("workflow", [])
    app = next((w for w in workflows if w.get("name") == "Start application"), None)
    if app is None:
        errors.append("Missing Start application workflow.")
    elif not any(t.get("waitForPort") == port for t in app.get("tasks", [])):
        errors.append(f"Start application must wait for server port {port}.")
    routes = [p for p in config.get("ports", []) if p.get("externalPort") == 80]
    if len(routes) != 1 or routes[0].get("localPort") != port:
        errors.append(f"Exactly one public port 80 mapping must target server port {port}.")
    return errors


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=pathlib.Path, default=pathlib.Path(".replit"))
    parser.add_argument("--source", type=pathlib.Path, default=pathlib.Path("server/index.ts"))
    parser.add_argument("--port", type=int, help="Explicit effective development PORT, if overridden")
    args = parser.parse_args()
    try:
        problems = check(tomllib.loads(args.config.read_text()), args.source.read_text(), args.port)
    except (OSError, ValueError) as error:
        problems = [str(error)]
    for problem in problems:
        print(f"FAIL: {problem}")
    if not problems:
        print("PASS: preview mapping, workflow and server port agree.")
    raise SystemExit(bool(problems))
