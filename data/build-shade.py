#!/usr/bin/env python3
"""Rebuild the sidewalk-shade layer from the SlimShady source.

The previous files were misshapen because they were simplified with a ~5 m
Douglas-Peucker epsilon — larger than the 2-4 m width of a sidewalk, which
collapses the polygons.

This rebuild:
  * keeps shape — Douglas-Peucker at EPS (~0.4 m), only removing genuinely
    redundant near-collinear vertices that the GIS export densified;
  * stores the geometry ONCE in a single file, with the shade percentage for
    every slot kept as integer properties s1000/s1300/s1530/s1800 (0-100).
    (Shipping four copies of the same geometry was ~4x larger for no reason.)
  * rounds coordinates to 6 decimals (~0.11 m).

Usage:  python3 data/build-shade.py
Source: ../SlimShady/data/Buurt_data/*.geojson  (Gebruiksfunctie == "Sidewalk")
Output: data/shade.geojson
"""
import glob, json, math, os

HERE    = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.join(HERE, "..", "..", "SlimShady", "data", "Buurt_data")
SLOTS   = [("s1000", "shade_percent_at_1000"),
           ("s1300", "shade_percent_at_1300"),
           ("s1530", "shade_percent_at_1530"),
           ("s1800", "shade_percent_at_1800")]
OUT     = os.path.join(HERE, "shade.geojson")
EPS     = 4e-6   # ~0.4 m — well below sidewalk width, preserves shape
NDIGITS = 6


def dp_simplify(pts, eps):
    """Iterative Douglas-Peucker; keeps the first/last point fixed."""
    n = len(pts)
    if n <= 2:
        return pts
    keep = [False] * n
    keep[0] = keep[-1] = True
    stack = [(0, n - 1)]
    while stack:
        a, b = stack.pop()
        ax, ay = pts[a]; bx, by = pts[b]
        dx, dy = bx - ax, by - ay
        seg2 = dx * dx + dy * dy
        maxd, idx = eps, -1
        for i in range(a + 1, b):
            px, py = pts[i]
            if seg2 == 0:
                d = math.hypot(px - ax, py - ay)
            else:
                t = ((px - ax) * dx + (py - ay) * dy) / seg2
                t = 0.0 if t < 0 else 1.0 if t > 1 else t
                d = math.hypot(px - ax - t * dx, py - ay - t * dy)
            if d > maxd:
                maxd, idx = d, i
        if idx != -1:
            keep[idx] = True
            stack.append((a, idx)); stack.append((idx, b))
    return [pts[i] for i in range(n) if keep[i]]


def clean_ring(ring):
    simplified = dp_simplify(ring, EPS)
    out = []
    for x, y in simplified:
        rx, ry = round(x, NDIGITS), round(y, NDIGITS)
        if not out or out[-1][0] != rx or out[-1][1] != ry:
            out.append([rx, ry])
    if len(out) >= 2 and out[0] != out[-1]:
        out.append(out[0])
    return out if len(out) >= 4 else None


def clean_polygon(rings):
    cleaned = [r for r in (clean_ring(r) for r in rings) if r]
    return cleaned or None


def iter_polys(geom):
    if geom["type"] == "Polygon":
        p = clean_polygon(geom["coordinates"])
        if p:
            yield p
    elif geom["type"] == "MultiPolygon":
        for poly in geom["coordinates"]:
            p = clean_polygon(poly)
            if p:
                yield p


def pct(props, prop):
    v = props.get(prop)
    return 0 if v is None else max(0, min(100, int(round(v))))


def main():
    files = sorted(glob.glob(os.path.join(SRC_DIR, "*.geojson")))
    if not files:
        raise SystemExit(f"No source files found in {SRC_DIR}")
    print(f"Reading {len(files)} source files")

    features = []
    n_src = 0
    for fp in files:
        with open(fp) as fh:
            fc = json.load(fh)
        for feat in fc.get("features", []):
            props = feat.get("properties", {})
            if props.get("Gebruiksfunctie") != "Sidewalk":
                continue
            geom = feat.get("geometry")
            if not geom:
                continue
            n_src += 1
            sprops = {k: pct(props, p) for k, p in SLOTS}
            for poly in iter_polys(geom):
                features.append({
                    "type": "Feature",
                    "properties": sprops,
                    "geometry": {"type": "Polygon", "coordinates": poly},
                })

    with open(OUT, "w") as fh:
        json.dump({"type": "FeatureCollection", "features": features}, fh,
                  separators=(",", ":"))
    mb = os.path.getsize(OUT) / 1e6
    print(f"Sidewalks: {n_src} read -> {len(features)} polygons")
    print(f"Wrote {os.path.basename(OUT)}: {mb:.1f} MB")


if __name__ == "__main__":
    main()
