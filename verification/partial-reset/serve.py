"""Serve built disposable fixture assets only; no application server or API."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os
import sys
os.chdir(Path(sys.argv[1]).resolve())
class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.split("?")[0] in ("/", "/loans/one/documents", "/loans/two/documents"):
            self.path = "/verification/partial-reset/index.html"
        super().do_GET()
ThreadingHTTPServer(("0.0.0.0", int(sys.argv[2])), Handler).serve_forever()
