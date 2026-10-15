"""Decode differing Chromium PNGs without installing image dependencies."""
from pathlib import Path
import hashlib
import json
import struct
import sys
import zlib

def decode(path):
    data = path.read_bytes()
    offset, compressed = 8, b""
    while offset < len(data):
        length = struct.unpack(">I", data[offset:offset + 4])[0]
        kind = data[offset + 4:offset + 8]
        value = data[offset + 8:offset + 8 + length]
        offset += length + 12
        if kind == b"IHDR":
            width, height, depth, color, _, _, interlace = struct.unpack(">IIBBBBB", value)
            assert depth == 8 and interlace == 0
        if kind == b"IDAT":
            compressed += value
    raw = zlib.decompress(compressed)
    channels = {2: 3, 6: 4}[color]
    stride = width * channels
    previous = bytearray(stride)
    rows = []
    for y in range(height):
        offset = y * (stride + 1)
        filter_type = raw[offset]
        row = bytearray(raw[offset + 1:offset + 1 + stride])
        for x in range(stride):
            left = row[x - channels] if x >= channels else 0
            above = previous[x]
            corner = previous[x - channels] if x >= channels else 0
            predicted = left + above - corner
            a, b, c = abs(predicted - left), abs(predicted - above), abs(predicted - corner)
            paeth = left if a <= b and a <= c else above if b <= c else corner
            correction = [0, left, above, (left + above) // 2, paeth][filter_type]
            row[x] = (row[x] + correction) % 256
        rows.append(row)
        previous = row
    return width, height, channels, rows

directory = Path(sys.argv[1])
results = []
for before in sorted(directory.glob("*-before-*.png")):
    after = before.with_name(before.name.replace("-before-", "-after-"))
    if not after.exists() or hashlib.sha256(before.read_bytes()).digest() == hashlib.sha256(after.read_bytes()).digest():
        continue
    width, height, channels, a = decode(before)
    w, h, ch, b = decode(after)
    assert (width, height, channels) == (w, h, ch)
    coords = [(x, y) for y in range(height) for x in range(width)
              if a[y][x * channels:(x + 1) * channels] != b[y][x * channels:(x + 1) * channels]]
    result = {"before": before.name, "after": after.name, "different_pixels": len(coords),
              "bbox": [min(x for x, y in coords), min(y for x, y in coords),
                       max(x for x, y in coords), max(y for x, y in coords)] if coords else None}
    results.append(result)
    print(json.dumps(result), flush=True)
(directory / "pixel-differences.json").write_text(json.dumps(results, indent=2))
