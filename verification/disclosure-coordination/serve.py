"""Serve only the two disposable static builds, never the live application."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import sys
import threading


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.split("?")[0] in ("/", "/loans/one/documents", "/loans/two/documents"):
            self.path = "/verification/disclosure-coordination/index.html"
        super().do_GET()


root = Path(sys.argv[1]).resolve()
servers = [
    ThreadingHTTPServer(("0.0.0.0", port), partial(
        Handler, directory=str(root / stage / "verification/disclosure-coordination/dist"),
    ))
    for stage, port in (("baseline", 4173), ("candidate", 4174))
]
threading.Thread(target=servers[0].serve_forever, daemon=True).start()
servers[1].serve_forever()
