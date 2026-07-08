#!/usr/bin/env python3
"""Generate a tileable warm-paper texture PNG using only the stdlib.

Multi-octave value noise on wrapped lattices -> seamless tile. Mapped to a
warm off-white plaster range (~19 luminance levels) so it reads as material.
"""
import binascii
import random
import struct
import zlib

SIZE = 512
SEED = 20260706


def smoothstep(t):
    return t * t * (3 - 2 * t)


def octave(grid, seed):
    """Tileable value-noise octave: grid x grid lattice, wrapped, upsampled to SIZE."""
    rnd = random.Random(seed)
    lat = [[rnd.random() for _ in range(grid)] for _ in range(grid)]
    out = [[0.0] * SIZE for _ in range(SIZE)]
    scale = grid / SIZE
    for y in range(SIZE):
        gy = y * scale
        y0 = int(gy) % grid
        y1 = (y0 + 1) % grid          # wrap -> seamless top/bottom
        fy = smoothstep(gy - int(gy))
        for x in range(SIZE):
            gx = x * scale
            x0 = int(gx) % grid
            x1 = (x0 + 1) % grid       # wrap -> seamless left/right
            fx = smoothstep(gx - int(gx))
            top = lat[y0][x0] * (1 - fx) + lat[y0][x1] * fx
            bot = lat[y1][x0] * (1 - fx) + lat[y1][x1] * fx
            out[y][x] = top * (1 - fy) + bot * fy
    return out


def build_field():
    # low-freq amps tamed so the tile reads as plaster mottling, not cloud blobs
    octaves = [(4, 0.45), (8, 0.35), (16, 0.3), (32, 0.18), (64, 0.1)]
    field = [[0.0] * SIZE for _ in range(SIZE)]
    for i, (grid, amp) in enumerate(octaves):
        o = octave(grid, SEED + i * 101)
        for y in range(SIZE):
            row = field[y]
            orow = o[y]
            for x in range(SIZE):
                row[x] += orow[x] * amp
    # normalize to 0..1
    lo = min(min(r) for r in field)
    hi = max(max(r) for r in field)
    span = hi - lo or 1.0
    for y in range(SIZE):
        for x in range(SIZE):
            n = (field[y][x] - lo) / span
            field[y][x] = smoothstep(n)  # slight S-curve -> concentrate mid-tones
    return field


def to_rgb(field):
    """Warm paper: L in ~243..253, warm cast R+4/G+1/B-5, clamped."""
    lo, hi = 243, 253
    rows = []
    for y in range(SIZE):
        row = bytearray()
        row.append(0)  # PNG filter byte: none
        for x in range(SIZE):
            L = lo + field[y][x] * (hi - lo)
            r = max(0, min(255, int(round(L + 4))))
            g = max(0, min(255, int(round(L + 1))))
            b = max(0, min(255, int(round(L - 5))))
            row += bytes((r, g, b))
        rows.append(bytes(row))
    return b"".join(rows)


def png_chunk(tag, data):
    return (struct.pack(">I", len(data)) + tag + data
            + struct.pack(">I", binascii.crc32(tag + data) & 0xFFFFFFFF))


def write_png(path, raw):
    ihdr = struct.pack(">IIBBBBB", SIZE, SIZE, 8, 2, 0, 0, 0)  # 8-bit, RGB
    idat = zlib.compress(raw, 9)
    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n")
        f.write(png_chunk(b"IHDR", ihdr))
        f.write(png_chunk(b"IDAT", idat))
        f.write(png_chunk(b"IEND", b""))


if __name__ == "__main__":
    import os
    field = build_field()
    raw = to_rgb(field)
    out = "frontend-next/public/textures/paper.png"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    write_png(out, raw)
    print("wrote", out, os.path.getsize(out), "bytes")
