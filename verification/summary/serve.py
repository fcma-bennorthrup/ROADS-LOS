"""Static disposable fixture only; no application API or filesystem write route."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import sys

root = Path(sys.argv[1]).resolve()
assert str(root).startswith("/tmp/validation-baseline-") and root.name == "summary-browser"

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(root), **kwargs)

    def do_GET(self):
        route = self.path.split("?")[0]
        if route.startswith("/api/"):
            self.send_error(403, "External operations blocked")
            return
        if route.startswith("/loans/") or route == "/":
            self.path = "/index.html"
        elif route not in ("/fixture.js", "/fixture.css"):
            self.send_error(404)
            return
        super().do_GET()

ThreadingHTTPServer(("0.0.0.0", 4179), Handler).serve_forever()
