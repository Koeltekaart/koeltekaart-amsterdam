#!/usr/bin/env python3
"""Extend data/layers/parks.json past the Amsterdam city limit.

The bundled park layer is the gemeente's own `PARKPLANTSOENGROEN` export
(maps.amsterdam.nl/open_geodata, CC0, last refreshed 2022-04-05). It is
authoritative and it stops at the municipal border: of its 125 polygons only two
sit outside Amsterdam (Amsterdamse Bos, Bergwijkpark) and those are there because
Amsterdam manages them, not because the dataset reaches across the border. So the
map shows a green city surrounded by nothing, even though Amstelveen's Broersepark
and the Diemerbos are the nearest shade for plenty of people on the edge of town.

There is no neighbouring equivalent of that export to bolt on. What was checked:

  BGT `functioneelgebied`      National, per-municipality bronhouder, has a
  (PDOK OGC API)               `plus_type = "recreatie: park"` with a name -
                               structurally the right shape. But park is optional
                               "plus" content and the neighbours skip it:
                               Amstelveen (G0362) publishes no functioneelgebied
                               at all, and all 19 of Diemen's (G0384) park
                               polygons carry `naam_leeg: waardeOnbekend`. Only
                               Ouder-Amstel fills names. Unusable as a base.

  BRT TOP10NL `terrein_vlak`   No `park` value in typelandgebruik around here
  (PDOK OGC API)               (just overig/grasland/bos) and zero of 1000
                               sampled features carry a naam. Dead end.

  CBS Bestand Bodemgebruik     Has a real "Park en plantsoen" class and full
  (PDOK WFS)                   national coverage, but the newest version PDOK
                               serves is 2017, the polygons are coarse blocks,
                               and they carry neither name nor area.

  OpenStreetMap (this script)  The only source with named park polygons for all
                               of Amstelveen, Diemen and Ouder-Amstel.

So: Amsterdam's own polygons are kept exactly as they are and OSM fills in
around them. Every appended feature is stamped `Bron` so the two never blur
together, and the OSM ones are re-derived from scratch on each run (see
`_keep_amsterdam`), which makes this re-runnable rather than append-only.

ODbL: OSM data requires attribution. js/app.js credits Kadaster/PDOK for the
basemap and now names OpenStreetMap alongside it - do not drop that line while
this layer contains `Bron: OpenStreetMap`.

Weesp is in the list on purpose. It has been an Amsterdam stadsdeel since 2022
but postdates the gemeente export, so the city's own park layer has a hole in it
that this fills from the same source as the neighbours.

Usage:
  fetch_parks.py [--write] [--out PATH]
    (no flag)  dry run: fetch, report what would change, touch nothing
    --write    rewrite data/layers/parks.json in place
"""
import argparse
import json
import os
import sys
import time

import requests
from pyproj import Transformer
from shapely.geometry import MultiPolygon, Polygon, shape
from shapely.ops import transform as shp_transform
from shapely.ops import unary_union

HERE = os.path.dirname(os.path.abspath(__file__))
PARKS = os.path.join(HERE, "..", "data", "layers", "parks.json")

# The public Overpass instances are volunteer-run and each of them will happily
# 504 on a `out geom` query under load - which mirror is healthy changes minute
# to minute, so the same query is simply offered to the next one. Order is
# preference, not fallback quality; all three serve the same planet.
ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
]
# Not decoration: overpass-api.de sits behind an Apache that answers a default
# python-requests agent with 406 Not Acceptable before Overpass ever sees the
# query. Identify the tool (Overpass etiquette asks for it anyway).
HEADERS = {"User-Agent": "koeltekaart-amsterdam/fetch_parks (+https://github.com/NojusStankevicius/koeltekaart-amsterdam)"}
TIMEOUT = 240
ATTEMPTS = 3       # rounds over the full endpoint list
BACKOFF = 20       # seconds, doubled per round

SRC_AMSTERDAM = "Gemeente Amsterdam (open geodata, CC0)"
SRC_OSM = "OpenStreetMap (ODbL)"

# Which areas to fill in, and how to select each one's boundary relation in OSM.
# The three gemeenten are the same set geocode_pdok.EXPECTED_GEMEENTEN accepts,
# i.e. the ones the map already places locations in. `ref:gemeentecode` is used
# rather than the name because it is the CBS code and cannot collide with a
# village or a neighbourhood of the same name; Weesp has no code of its own any
# more (it is Amsterdam's now), so it goes by name at admin_level 10.
MUNICIPALITIES = [
    ("Amstelveen",   '["boundary"="administrative"]["ref:gemeentecode"="0362"]'),
    ("Diemen",       '["boundary"="administrative"]["ref:gemeentecode"="0384"]'),
    ("Ouder-Amstel", '["boundary"="administrative"]["ref:gemeentecode"="0437"]'),
    ("Weesp",        '["boundary"="administrative"]["name"="Weesp"]["admin_level"="10"]'),
]

# Tags that mean "public green you can walk into", matching the character of the
# Amsterdam export (parken, plantsoenen en recreatief groen).
#
# landuse=forest and leisure=garden are deliberately NOT here. In this corner of
# the country forest only tags sub-areas *inside* the Amsterdamse Bos (Buffelbos,
# Speeleilanden, Japanse Park, ...) which would stack duplicates on a polygon the
# Amsterdam file already has, and garden is community allotments and one private
# roof terrace, not public park.
QUERY = """[out:json][timeout:180];
relation%s;
map_to_area->.a;
(
  nwr["leisure"~"^(park|nature_reserve|recreation_ground)$"](area.a);
  nwr["landuse"="recreation_ground"](area.a);
);
out geom;
"""

CLOSED_ACCESS = {"private", "no", "customers", "permit", "permissive_no"}

# A plantsoen can be small, but under ~1000 m2 it is a traffic island with a tree
# on it, not somewhere to sit out a heat wave.
MIN_AREA_M2 = 1_000
# The Amsterdamse Bos, the largest thing the Amsterdam file knows about, is
# 9.2 km2. Above 10 km2 the only local hits are "Markermeer & IJmeer" (open
# water) and the Rondehoep (agricultural polder) - both tagged nature_reserve,
# neither a park.
MAX_AREA_M2 = 10_000_000

# Share of a candidate that has to fall inside the Amsterdam polygons before it
# counts as already-known. Half is deliberately loose: it drops Amsterdam parks
# that spill over the border and get caught by a neighbour's area query
# (Nelson Mandelapark, Bijlmerweide) and every feature mapped inside the
# Amsterdamse Bos, while keeping a park that merely touches the city edge.
OVERLAP_DROP = 0.5

# WGS84 -> Rijksdriehoek. Areas in the Amsterdam file are RD square metres, so
# they are computed the same way here rather than from a rough degree scaling.
_TO_RD = Transformer.from_crs("EPSG:4326", "EPSG:28992", always_xy=True).transform


def area_m2(geom):
    return shp_transform(_TO_RD, geom).area


# ── Overpass -> shapely ────────────────────────────────────────────────────
def _ring(points):
    """Close a list of {lat,lon} dicts into a coordinate ring, or None."""
    ring = [(p["lon"], p["lat"]) for p in points]
    if len(ring) < 3:
        return None
    if ring[0] != ring[-1]:
        ring.append(ring[0])
    return ring if len(ring) >= 4 else None


def _stitch(segments):
    """Join open way segments into closed rings.

    Overpass hands back a multipolygon relation as its member ways, in no
    particular order and each pointing whichever way it was drawn, so the rings
    have to be walked back together by matching endpoints. Segments that never
    close are dropped rather than guessed at; a relation missing part of its
    outline is broken upstream and should not become a half-drawn park.
    """
    todo = [list(s) for s in segments if len(s) >= 2]
    rings = []
    while todo:
        chain = todo.pop(0)
        joined = True
        while chain[0] != chain[-1] and joined:
            joined = False
            for i, seg in enumerate(todo):
                if seg[0] == chain[-1]:
                    chain += seg[1:]
                elif seg[-1] == chain[-1]:
                    chain += seg[-2::-1]
                elif seg[-1] == chain[0]:
                    chain = seg[:-1] + chain
                elif seg[0] == chain[0]:
                    chain = seg[::-1][:-1] + chain
                else:
                    continue
                todo.pop(i)
                joined = True
                break
        if chain[0] == chain[-1] and len(chain) >= 4:
            rings.append(chain)
    return rings


def _polygonise(el):
    """Turn one Overpass element into a valid shapely polygon, or None."""
    if el["type"] == "way":
        ring = _ring(el.get("geometry") or [])
        if not ring:
            return None
        geom = Polygon(ring)
    elif el["type"] == "relation":
        outer, inner = [], []
        for m in el.get("members", []):
            pts = m.get("geometry")
            if not pts:
                continue
            seg = [(p["lon"], p["lat"]) for p in pts]
            (inner if m.get("role") == "inner" else outer).append(seg)
        outers = [Polygon(r) for r in _stitch(outer)]
        inners = [Polygon(r) for r in _stitch(inner)]
        if not outers:
            return None
        # A hole belongs to whichever outer ring encloses it.
        parts = []
        for o in outers:
            holes = [i.exterior.coords for i in inners if o.contains(i)]
            parts.append(Polygon(o.exterior.coords, holes))
        geom = parts[0] if len(parts) == 1 else MultiPolygon(parts)
    else:
        return None  # nodes carry no area

    if not geom.is_valid:
        geom = geom.buffer(0)  # self-touching rings are common in OSM
    return geom if (not geom.is_empty and geom.is_valid) else None


def fetch(selector):
    """Run one municipality's query, rotating over the mirrors until one answers.

    An empty answer counts as a failure and moves on to the next mirror. None of
    these places has zero parks, so nothing here can legitimately come back
    empty - but a mirror whose area index does not cover the boundary (Weesp is
    admin_level 10, which not every instance indexes) answers 200 with an empty
    element list, and taking that at face value would quietly drop a whole
    municipality out of the layer on the next --write.
    """
    query = {"data": QUERY % selector}
    last = None
    for rnd in range(ATTEMPTS):
        for ep in ENDPOINTS:
            host = ep.split("/")[2]
            try:
                r = requests.post(ep, data=query, timeout=TIMEOUT, headers=HEADERS)
                r.raise_for_status()
                elements = r.json().get("elements", [])
                if elements:
                    return elements
                last = f"{host}: empty result (boundary not in its area index?)"
            except (requests.RequestException, ValueError) as e:
                last = f"{host}: {e}"
            print(f"     .. {last}", file=sys.stderr)
        if rnd < ATTEMPTS - 1:
            time.sleep(BACKOFF * (2 ** rnd))
    raise requests.RequestException(f"no mirror returned data, last was {last}")


# ── existing file ──────────────────────────────────────────────────────────
def _keep_amsterdam(features):
    """The gemeente's own features, i.e. everything this script did not add.

    Dropping our own previous output is what makes a re-run idempotent: OSM
    features are rebuilt from the live query every time instead of piling up.
    """
    return [f for f in features if f["properties"].get("Bron") != SRC_OSM]


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--write", action="store_true",
                    help="rewrite the park layer (default: dry run)")
    ap.add_argument("--out", default=PARKS, help="output path")
    args = ap.parse_args()

    fc = json.load(open(PARKS, encoding="utf-8"))
    base = _keep_amsterdam(fc["features"])
    print(f"kept {len(base)} gemeente features "
          f"(dropped {len(fc['features']) - len(base)} from a previous run)")

    known = unary_union([shape(f["geometry"]).buffer(0) for f in base])

    kept, seen, skipped = [], set(), []
    for label, selector in MUNICIPALITIES:
        try:
            elements = fetch(selector)
        except requests.RequestException as e:
            print(f"  !! {label}: Overpass failed ({e}) - layer left unchanged",
                  file=sys.stderr)
            return 1
        n_new = 0
        for el in elements:
            key = (el["type"], el["id"])
            if key in seen:
                continue
            seen.add(key)
            tags = el.get("tags") or {}
            name = (tags.get("name") or "").strip()
            if not name:
                continue
            if tags.get("access") in CLOSED_ACCESS:
                skipped.append((label, name, "access closed"))
                continue
            geom = _polygonise(el)
            if geom is None:
                skipped.append((label, name, "no usable geometry"))
                continue
            a = area_m2(geom)
            if a < MIN_AREA_M2 or a > MAX_AREA_M2:
                skipped.append((label, name, f"area {a/1e4:.1f} ha out of range"))
                continue
            if known.intersection(geom).area / geom.area >= OVERLAP_DROP:
                skipped.append((label, name, "already in the gemeente layer"))
                continue
            kept.append((label, name, round(a), geom))
            n_new += 1
        print(f"  {label:<13} {len(elements):>4} candidates -> {n_new} new")

    kept.sort(key=lambda k: (k[0], k[1]))

    next_id = max((f.get("id") or 0) for f in base) + 1
    for i, (label, name, a, geom) in enumerate(kept):
        base.append({
            "id": next_id + i,
            "type": "Feature",
            "geometry": json.loads(json.dumps(geom.__geo_interface__)),
            "properties": {
                "Stadsdeel": label,
                "Naam": name,
                # Stadspark is Amsterdam's own designation for its major city
                # parks; no other gemeente issues one, so it stays "N" here
                # rather than being invented from size.
                "Stadspark": "N",
                "Oppervlakte_m2": a,
                "Bron": SRC_OSM,
            },
        })
    for f in base:
        f["properties"].setdefault("Bron", SRC_AMSTERDAM)

    _round(base)
    fc["features"] = base

    print(f"\n{len(kept)} parks added, {len(base)} total")
    for label, name, a, _ in kept:
        print(f"  + {label:<13} {name:<34} {a/1e4:8.1f} ha")
    if skipped:
        print(f"\n{len(skipped)} candidates skipped:")
        for label, name, why in skipped:
            print(f"  - {label:<13} {name:<34} {why}")

    if not args.write:
        print("\ndry run - nothing written (pass --write)")
        return 0
    with open(args.out, "w", encoding="utf-8") as fh:
        json.dump(fc, fh, ensure_ascii=False, separators=(",", ":"))
    print(f"\nwrote {args.out}")
    return 0


def _round(features, nd=6):
    """Match the 6-decimal precision of the gemeente export (~10 cm), so the
    OSM geometry does not quietly triple the size of a file the browser
    downloads on every visit."""
    def walk(c):
        if isinstance(c[0], (int, float)):
            return [round(c[0], nd), round(c[1], nd)]
        return [walk(x) for x in c]
    for f in features:
        f["geometry"]["coordinates"] = walk(f["geometry"]["coordinates"])


if __name__ == "__main__":
    sys.exit(main())
