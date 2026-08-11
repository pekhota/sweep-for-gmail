#!/usr/bin/env python3
"""Generate Sweep's icon set.

The mark is an envelope with motion trails sweeping off to the left — "mail, cleared
away". Larger sizes carry the trails; the 16px favicon drops them, because at that size
they turn to mush and the envelope alone still reads.

Deliberately not Gmail red: the store rejects marks that imply affiliation with a
trademark holder, and an indigo mark is ownable in a sea of red envelope icons.

Pure stdlib — writes PNG bytes directly, no Pillow needed.
    python3 tools/make_icons.py
"""

import math
import os
import struct
import zlib

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "icons")

BG_TOP = (99, 102, 241)     # indigo-500
BG_BOTTOM = (67, 56, 202)   # indigo-700
INK = (255, 255, 255)


def lerp(a, b, t):
    return tuple(round(x + (y - x) * t) for x, y in zip(a, b))


def rounded_rect_alpha(fx, fy, size, radius):
    """Anti-aliased coverage of a rounded square, 0..1."""
    cx = min(max(fx, radius), size - radius)
    cy = min(max(fy, radius), size - radius)
    dist = math.hypot(fx - cx, fy - cy)
    return max(0.0, min(1.0, radius - dist + 0.5))


def capsule_alpha(fx, fy, x0, y0, x1, y1, width):
    """Anti-aliased coverage of a thick line with round caps, 0..1."""
    dx, dy = x1 - x0, y1 - y0
    span = dx * dx + dy * dy
    t = 0.0 if span == 0 else max(0.0, min(1.0, ((fx - x0) * dx + (fy - y0) * dy) / span))
    px, py = x0 + t * dx, y0 + t * dy
    return max(0.0, min(1.0, width / 2 - math.hypot(fx - px, fy - py) + 0.5))


def over(dst, src, alpha):
    return tuple(round(d + (s - d) * alpha) for d, s in zip(dst, src))


def envelope_alpha(fx, fy, x, y, w, h, stroke):
    """Outlined envelope: rounded body plus the flap's two diagonals."""
    body_outer = rounded_rect_alpha(fx - x, fy - y, 0, 0)  # placeholder, unused
    # Body ring: inside the outer rect but outside the inset rect.
    inside = 1.0 if (x <= fx <= x + w and y <= fy <= y + h) else 0.0
    inner = 1.0 if (x + stroke <= fx <= x + w - stroke and y + stroke <= fy <= y + h - stroke) else 0.0
    ring = max(0.0, inside - inner)

    # Flap: two strokes from the top corners down to the middle.
    mid_x, mid_y = x + w / 2, y + h * 0.52
    flap = max(
        capsule_alpha(fx, fy, x, y, mid_x, mid_y, stroke),
        capsule_alpha(fx, fy, x + w, y, mid_x, mid_y, stroke),
    )
    # Clip the flap to the body so it can't spill outside.
    flap = flap if inside else 0.0
    del body_outer
    return max(ring, flap)


def render(size, trails=True):
    radius = size * 0.223  # matches the Chrome Web Store's rounded-square convention

    # Envelope geometry — pushed right when trails are present, centred when not.
    if trails:
        w = size * 0.46
        x = size * 0.46
    else:
        w = size * 0.56
        x = (size - w) / 2
    h = w * 0.72
    y = (size - h) / 2
    stroke = max(1.0, size * 0.055)

    trail_specs = [  # (y ratio, x start ratio, x end ratio, width ratio)
        (0.30, 0.10, 0.38, 0.052),
        (0.50, 0.16, 0.40, 0.052),
        (0.70, 0.23, 0.38, 0.052),
    ]

    rows = []
    for py in range(size):
        row = []
        for px in range(size):
            fx, fy = px + 0.5, py + 0.5

            bg_cov = rounded_rect_alpha(fx, fy, size, radius)
            if bg_cov <= 0:
                row.append((0, 0, 0, 0))
                continue

            colour = lerp(BG_TOP, BG_BOTTOM, fy / size)

            ink = envelope_alpha(fx, fy, x, y, w, h, stroke)
            if trails:
                for ry, sx, ex, rw in trail_specs:
                    ink = max(
                        ink,
                        capsule_alpha(fx, fy, size * sx, size * ry, size * ex, size * ry, size * rw),
                    )

            if ink > 0:
                colour = over(colour, INK, min(1.0, ink))

            row.append((*colour, round(255 * min(1.0, bg_cov))))
        rows.append(row)
    return rows


def write_png(path, rows):
    size = len(rows)
    raw = b"".join(b"\x00" + b"".join(struct.pack("4B", *p) for p in row) for row in rows)

    def chunk(tag, data):
        body = tag + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)

    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )
    with open(path, "wb") as fh:
        fh.write(png)


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for size in (16, 48, 128):
        write_png(os.path.join(OUT, f"icon-{size}.png"), render(size, trails=size >= 48))
        print("wrote", f"icons/icon-{size}.png")
