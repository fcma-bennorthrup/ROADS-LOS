"""Explicitly authorized preparation only; never run during blocked tests.

Downloads only the existing HTML font stylesheet and its HTTPS gstatic fonts.
Pins all bytes in a local manifest; writes only to a disposable evidence folder.
"""
import base64
import hashlib
import json
from pathlib import Path
import re
import sys
import urllib.parse
import urllib.request

root = Path(__file__).resolve().parents[2]
out = Path(sys.argv[1]).resolve()
assert out.parent.name.startswith("token-verification-") and out.name == "fonts"
out.mkdir(exist_ok=True)
url = re.search(r'<link href="(https://fonts.googleapis.com/[^"]+)"', (root / "client/index.html").read_text())[1]
agent = "Mozilla/5.0 Chrome/130.0.0.0 Safari/537.36"
def get(url, host):
    assert urllib.parse.urlparse(url).scheme == "https"
    assert urllib.parse.urlparse(url).hostname == host
    request = urllib.request.Request(url, headers={"User-Agent": agent})
    with urllib.request.urlopen(request, timeout=60) as response:
        assert urllib.parse.urlparse(response.url).hostname == host
        return response.read()
def sha(data):
    return hashlib.sha256(data).hexdigest()
css = get(url, "fonts.googleapis.com")
(out / "original.css").write_bytes(css)
text = css.decode()
manifest = {"stylesheet_url": url, "stylesheet_sha256": sha(css), "user_agent": agent, "fonts": []}
for i, font_url in enumerate(dict.fromkeys(re.findall(r"url\((https://[^)]+)\)", text))):
    data = get(font_url, "fonts.gstatic.com")
    name = f"font-{i:02}.bin"
    (out / name).write_bytes(data)
    manifest["fonts"].append({"url": font_url, "file": name, "sha256": sha(data), "bytes": len(data)})
    text = text.replace(font_url, "data:font/woff2;base64," + base64.b64encode(data).decode())
(out / "inline.css").write_text(text)
manifest["inline_css_sha256"] = sha(text.encode())
pin = root / "docs/architecture-audit/token-equivalence-evidence/font-manifest.json"
if pin.exists():
    assert manifest == json.loads(pin.read_text()), (
        "Remote font snapshot changed; do not replace the approved pin without review"
    )
(out / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
print("Pinned font resources:", len(manifest["fonts"]), "stylesheet:", manifest["stylesheet_sha256"])
