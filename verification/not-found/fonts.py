"""Explicit opt-in acquisition of only the font stylesheet declared by the app."""
import hashlib
import json
from pathlib import Path
import re
import sys
import urllib.request
from urllib.parse import urlparse

root, out = map(Path, sys.argv[1:])
out.mkdir(parents=True, exist_ok=True)
url = re.search(r'href="(https://fonts.googleapis.com/css2[^"]+)"',
                (root / "client/index.html").read_text()).group(1)

def download(url):
    assert urlparse(url).scheme == "https"
    assert urlparse(url).hostname in ("fonts.googleapis.com", "fonts.gstatic.com")
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=60) as response:
        assert urlparse(response.url).hostname in ("fonts.googleapis.com", "fonts.gstatic.com")
        return response.read()

css = download(url).decode()
ledger = {"stylesheet_url": url, "original_css_sha256": hashlib.sha256(css.encode()).hexdigest(), "files": []}
for i, font_url in enumerate(dict.fromkeys(re.findall(r"url\((https://[^)]+)\)", css))):
    data = download(font_url)
    name = f"font-{i}{Path(urlparse(font_url).path).suffix}"
    (out / name).write_bytes(data)
    css = css.replace(font_url, f"/fonts/{name}")
    ledger["files"].append({"url": font_url, "name": name, "bytes": len(data),
                            "sha256": hashlib.sha256(data).hexdigest()})
(out / "fonts.css").write_text(css)
(out / "ledger.json").write_text(json.dumps(ledger, indent=2) + "\n")
print("Pinned declared fonts:", len(ledger["files"]))
