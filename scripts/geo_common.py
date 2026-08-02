#!/usr/bin/env python3
"""Offline Amsterdam stadsdeel lookup (point-in-polygon).

Given a WGS84 coordinate, return which of the 9 Amsterdam stadsdelen it falls
in. The polygons are bundled (`data/geo/stadsdelen.geojson`, from the gemeente's
official gebieden dataset), so this needs no network and is fully deterministic
in CI — unlike the flaky live point-in-polygon endpoints.

Kept separate from geocode_pdok.py on purpose: geocoding an address is a network
concern, deciding which district a point sits in is pure geometry. geocode_pdok
imports `stadsdeel_for` and feeds it the coordinate it just derived.
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
STADSDELEN = os.path.join(HERE, "..", "data", "geo", "stadsdelen.geojson")

_POLYS = None


def _load():
    global _POLYS
    if _POLYS is None:
        fc = json.load(open(STADSDELEN, encoding="utf-8"))
        _POLYS = []
        for f in fc["features"]:
            g = f["geometry"]
            polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
            # The bundled geojson is also consumed by the dashboard, which
            # normalised every level to {name, stadsdeel, pop}. Accept the
            # gemeente's original "naam" too so a future re-export of the raw
            # dataset can't silently break the refresh pipeline again.
            props = f["properties"]
            name = props.get("name") or props.get("naam")
            if not name:
                raise KeyError(
                    f"{STADSDELEN}: feature has neither 'name' nor 'naam' "
                    f"(keys: {sorted(props)})"
                )
            _POLYS.append((name, polys))
    return _POLYS


def _in_ring(lng, lat, ring):
    """Ray-casting point-in-polygon for one ring of [lng, lat] pairs."""
    inside = False
    n = len(ring)
    j = n - 1
    for i in range(n):
        xi, yi = ring[i][0], ring[i][1]
        xj, yj = ring[j][0], ring[j][1]
        if ((yi > lat) != (yj > lat)) and \
           (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi):
            inside = not inside
        j = i
    return inside


def stadsdeel_for(lat, lng):
    """Name of the Amsterdam stadsdeel containing (lat, lng), or '' if the point
    is outside the city (e.g. Diemen, Ouder-Amstel). A polygon matches only when
    the point is inside its outer ring and not inside any hole."""
    if lat is None or lng is None:
        return ""
    for name, polys in _load():
        for rings in polys:
            if _in_ring(lng, lat, rings[0]) and \
               not any(_in_ring(lng, lat, h) for h in rings[1:]):
                return name
    return ""
