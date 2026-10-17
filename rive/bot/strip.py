#!/usr/bin/env python3
"""Stitch rendered frames into one strip, so a change reads at a glance.

    rive . --screenshot=build/a.png --advance=63 --data=glow=0
    python3 strip.py build/a.png build/b.png -o build/strip.png

Pure stdlib: the renders are 8-bit RGBA PNGs from `rive --screenshot`, which
is a narrow enough case to decode by hand and not worth a dependency for.
"""
import struct
import sys
import zlib


def read(path):
    data = open(path, "rb").read()
    pos, idat, w, h, ct = 8, b"", 0, 0, 6
    while pos < len(data):
        ln = struct.unpack(">I", data[pos:pos + 4])[0]
        typ = data[pos + 4:pos + 8]
        if typ == b"IHDR":
            w, h, _, ct = struct.unpack(">IIBB", data[pos + 8:pos + 18])
        elif typ == b"IDAT":
            idat += data[pos + 8:pos + 8 + ln]
        pos += 12 + ln
    ch = {0: 1, 2: 3, 4: 2, 6: 4}[ct]
    raw, stride = zlib.decompress(idat), w * ch
    out, prev, i = bytearray(), bytearray(stride), 0
    for _ in range(h):
        f = raw[i]
        i += 1
        line = bytearray(raw[i:i + stride])
        i += stride
        for x in range(stride):
            a = line[x - ch] if x >= ch else 0
            b = prev[x]
            c = prev[x - ch] if x >= ch else 0
            if f == 1:
                line[x] = (line[x] + a) & 255
            elif f == 2:
                line[x] = (line[x] + b) & 255
            elif f == 3:
                line[x] = (line[x] + (a + b) // 2) & 255
            elif f == 4:
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                line[x] = (line[x] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 255
        out += line
        prev = line
    return w, h, ch, out


def write(path, w, h, ch, px):
    def chunk(tag, body):
        return (struct.pack(">I", len(body)) + tag + body
                + struct.pack(">I", zlib.crc32(tag + body) & 0xFFFFFFFF))

    head = struct.pack(">IIBBBBB", w, h, 8, {1: 0, 3: 2, 2: 4, 4: 6}[ch], 0, 0, 0)
    raw = b"".join(b"\x00" + bytes(px[y * w * ch:(y + 1) * w * ch]) for y in range(h))
    open(path, "wb").write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", head)
                           + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))


def main(argv):
    out = "build/strip.png"
    if "-o" in argv:
        i = argv.index("-o")
        out = argv[i + 1]
        argv = argv[:i] + argv[i + 2:]
    if not argv:
        sys.exit(__doc__)
    frames = [read(p) for p in argv]
    h = max(f[1] for f in frames)
    ch = frames[0][2]
    if any(f[1] != h for f in frames):
        sys.exit("frames differ in height; render them at one viewport")
    total = sum(f[0] for f in frames)
    joined = bytearray()
    for y in range(h):
        for (fw, _, fch, px) in frames:
            joined += px[y * fw * fch:(y + 1) * fw * fch]
    write(out, total, h, ch, joined)
    print(f"{out} {total}x{h} from {len(frames)} frames")


if __name__ == "__main__":
    main(sys.argv[1:])
