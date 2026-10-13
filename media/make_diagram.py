"""Draws the Tendril explainer diagram: the arm as printed, and the arm curled.

Plain geometry, no annotations. Run it to rewrite diagram.svg.
    python make_diagram.py
"""
import math

# --- shape parameters (same family as the generator) ---------------------
N = 18                  # segments
DTHETA = math.radians(18.0)
B = 0.25
Q = math.exp(-B * DTHETA)

L0 = 20.2               # pitch of the first segment, mm
H0 = 12.4               # depth of the first segment, mm
NOTCH = 0.42            # fraction of pitch taken by the V gap
TENDON = 0.70           # tendon height as a fraction of depth (inner side)

BODY = "#c9cdd4"
BODY_EDGE = "#6e7279"
BASE = "#d9a441"
BASE_EDGE = "#8a6520"
TENDON_C = "#e0714a"
TEXT = "#8b8b86"


def seg_dims(i):
    s = Q ** i
    return L0 * s, H0 * s, H0 * (Q ** (i + 1))


def mat_mul(a, b):
    return (
        a[0] * b[0] + a[1] * b[3], a[0] * b[1] + a[1] * b[4], a[0] * b[2] + a[1] * b[5] + a[2],
        a[3] * b[0] + a[4] * b[3], a[3] * b[1] + a[4] * b[4], a[3] * b[2] + a[4] * b[5] + a[5],
    )


def translate(dx, dy):
    return (1, 0, dx, 0, 1, dy)


def rotate(t):
    c, s = math.cos(t), math.sin(t)
    return (c, -s, 0, s, c, 0)


def apply(m, p):
    x, y = p
    return (m[0] * x + m[1] * y + m[2], m[3] * x + m[4] * y + m[5])


def arm(curled):
    """Returns (polygons, tendon_points) in mm, y up, notches on the +y side."""
    m = (1, 0, 0, 0, 1, 0)
    polys, tendon = [], []
    for i in range(N):
        pitch, h_start, h_end = seg_dims(i)
        gap = pitch * NOTCH
        poly = [(0, 0), (pitch, 0), (pitch - gap / 2, h_end), (gap / 2, h_start)]
        polys.append([apply(m, p) for p in poly])
        tendon.append(apply(m, (gap / 2, h_start * TENDON)))
        tendon.append(apply(m, (pitch - gap / 2, h_end * TENDON)))
        m = mat_mul(m, translate(pitch, 0))
        if curled:
            m = mat_mul(m, rotate(DTHETA))
    return polys, tendon


def bounds(groups):
    xs = [p[0] for g in groups for p in g]
    ys = [p[1] for g in groups for p in g]
    return min(xs), min(ys), max(xs), max(ys)


def draw(polys, tendon, base_at, sc, ox, oy, out):
    def tx(p):
        return ox + p[0] * sc, oy - p[1] * sc

    # mounting block at the root
    bx, by = tx(base_at)
    bw, bh = 15 * sc, H0 * 1.25 * sc
    out.append(
        f'<rect x="{bx - bw:.1f}" y="{by - bh:.1f}" width="{bw:.1f}" height="{bh:.1f}" '
        f'rx="{2.4 * sc:.1f}" fill="{BASE}" stroke="{BASE_EDGE}" stroke-width="1"/>'
    )
    for poly in polys:
        pts = " ".join(f"{x:.2f},{y:.2f}" for x, y in (tx(p) for p in poly))
        out.append(f'<polygon points="{pts}" fill="{BODY}" stroke="{BODY_EDGE}" stroke-width="1" stroke-linejoin="round"/>')
    pts = " ".join(f"{x:.2f},{y:.2f}" for x, y in (tx(p) for p in tendon))
    out.append(f'<polyline points="{pts}" fill="none" stroke="{TENDON_C}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>')


def main():
    W, H = 920, 600
    out = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" role="img" '
        f'aria-label="The arm straight as printed, and the same arm curled into a spiral">',
        '<style>text{font-family:Sora,ui-sans-serif,system-ui,sans-serif;font-size:14px;fill:' + TEXT + '}</style>',
    ]

    # --- straight -------------------------------------------------------
    polys, tendon = arm(curled=False)
    x0, y0, x1, y1 = bounds(polys)
    sc = (W - 150) / (x1 - x0)
    draw(polys, tendon, (0, 0), sc, 90, 150, out)
    out.append(f'<text x="90" y="186">as printed</text>')

    # --- curled ---------------------------------------------------------
    polys, tendon = arm(curled=True)
    pad_base = H0 * 1.3          # room for the mounting block at the root
    x0, y0, x1, y1 = bounds(polys)
    x0 -= pad_base
    y0 -= pad_base / 2
    box_w, box_h = W - 180, 300
    sc2 = min(box_w / (x1 - x0), box_h / (y1 - y0))
    ox = (W - (x1 - x0) * sc2) / 2 - x0 * sc2
    oy = 250 + (box_h + (y1 - y0) * sc2) / 2 - (y1 - y0) * sc2 / 2 + y1 * sc2 - (y1 - y0) * sc2
    oy = 250 + (box_h - (y1 - y0) * sc2) / 2 + y1 * sc2
    draw(polys, tendon, (0, 0), sc2, ox, oy, out)
    out.append(f'<text x="90" y="300">when you pull the string</text>')

    out.append("</svg>")
    with open("diagram.svg", "w", encoding="utf-8") as f:
        f.write("\n".join(out))
    print("wrote diagram.svg")


if __name__ == "__main__":
    main()
