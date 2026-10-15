"""Explain PNG mismatches without introducing an acceptance tolerance."""
import json
from pathlib import Path
import struct
import sys
import zlib

def pixels(path):
    data = path.read_bytes()
    assert data[:8] == b"\x89PNG\r\n\x1a\n"
    offset, compressed = 8, b""
    while offset < len(data):
        size = struct.unpack(">I", data[offset:offset+4])[0]
        kind, chunk = data[offset+4:offset+8], data[offset+8:offset+8+size]
        if kind == b"IHDR":
            width, height, depth, color, compression, filtering, interlace = struct.unpack(">IIBBBBB", chunk)
        if kind == b"IDAT":
            compressed += chunk
        offset += size + 12
    assert depth == 8 and color in (2, 6) and interlace == 0
    channels = {2:3, 6:4}[color]
    stride = width * channels
    raw = zlib.decompress(compressed)
    previous = bytearray(stride)
    rows = []
    for y in range(height):
        method = raw[y*(stride+1)]
        row = bytearray(raw[y*(stride+1)+1:(y+1)*(stride+1)])
        assert method in range(5)
        for i in range(stride):
            a = row[i-channels] if i >= channels else 0
            b = previous[i]
            c = previous[i-channels] if i >= channels else 0
            distances = [abs(b-c), abs(a-c), abs(a+b-2*c)]
            paeth = [a, b, c][distances.index(min(distances))]
            prediction = [0, a, b, (a+b)//2, paeth][method]
            row[i] = (row[i] + prediction) % 256
        rows.append(row)
        previous = row
    return width, height, channels, rows

folder = Path(sys.argv[1])
results = json.loads((folder / "results.json").read_text())
differences = []
for failure in results["failures"]:
    label = failure["label"]
    w, h, channels, a = pixels(folder / (label + ".png"))
    w2, h2, channels2, b = pixels(folder / (label + "-candidate.png"))
    assert (w,h,channels) == (w2,h2,channels2)
    changed = [(x,y) for y in range(h) for x in range(w)
               if a[y][x*channels:(x+1)*channels] != b[y][x*channels:(x+1)*channels]]
    differences.append({
        "label":label, "dimensions":[w,h], "changed_pixels":len(changed),
        "max_channel_difference":max(abs(av-bv) for ar,br in zip(a,b) for av,bv in zip(ar,br)),
        "bounds": [min(x for x,y in changed),min(y for x,y in changed),
                   max(x for x,y in changed),max(y for x,y in changed)] if changed else None,
        "state_equal":failure["baselineState"] == failure["candidateState"],
        "acceptance":"failed; no tolerance applied",
    })
print(json.dumps(differences,indent=2))
