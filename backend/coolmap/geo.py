from __future__ import annotations

import math
from typing import Any


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two points in kilometers using Haversine formula."""
    R = 6371  # Earth's radius in km
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def parse_bbox(bbox: str) -> tuple[float, float, float, float]:
    parts = [p.strip() for p in bbox.split(",")]
    if len(parts) != 4:
        raise ValueError("bbox must be four comma-separated numbers: minLon,minLat,maxLon,maxLat")
    try:
        min_lon, min_lat, max_lon, max_lat = (float(parts[0]), float(parts[1]), float(parts[2]), float(parts[3]))
    except ValueError as e:
        raise ValueError("bbox values must be numbers") from e
    if min_lon >= max_lon or min_lat >= max_lat:
        raise ValueError("bbox must have minLon < maxLon and minLat < maxLat")
    return min_lon, min_lat, max_lon, max_lat


def _coords_iter(geom: dict[str, Any]):
    t = geom.get("type")
    coords = geom.get("coordinates")
    if t == "Point":
        if coords and len(coords) >= 2:
            yield coords[0], coords[1]
    elif t == "Polygon":
        for ring in coords:
            for lon, lat in ring:
                yield lon, lat
    elif t == "MultiPolygon":
        for poly in coords:
            for ring in poly:
                for lon, lat in ring:
                    yield lon, lat
    else:
        raise ValueError(f"unsupported geometry type: {t}")


def geometry_bounds(geom: dict[str, Any]) -> tuple[float, float, float, float]:
    lons: list[float] = []
    lats: list[float] = []
    for lon, lat in _coords_iter(geom):
        lons.append(lon)
        lats.append(lat)
    return min(lons), min(lats), max(lons), max(lats)


def bboxes_intersect(
    a: tuple[float, float, float, float], b: tuple[float, float, float, float]
) -> bool:
    min_lon_a, min_lat_a, max_lon_a, max_lat_a = a
    min_lon_b, min_lat_b, max_lon_b, max_lat_b = b
    return not (
        max_lon_a < min_lon_b
        or min_lon_a > max_lon_b
        or max_lat_a < min_lat_b
        or min_lat_a > max_lat_b
    )


def point_in_bbox(lon: float, lat: float, bbox: tuple[float, float, float, float]) -> bool:
    min_lon, min_lat, max_lon, max_lat = bbox
    return min_lon <= lon <= max_lon and min_lat <= lat <= max_lat


def filter_feature_collection(
    fc: dict[str, Any], bbox: tuple[float, float, float, float]
) -> dict[str, Any]:
    out: list[dict[str, Any]] = []
    for feat in fc.get("features", []):
        geom = feat.get("geometry")
        if not geom:
            continue
        t = geom.get("type")
        if t == "Point":
            coords = geom.get("coordinates") or []
            if len(coords) >= 2 and point_in_bbox(float(coords[0]), float(coords[1]), bbox):
                out.append(feat)
        elif t in ("Polygon", "MultiPolygon"):
            if bboxes_intersect(geometry_bounds(geom), bbox):
                out.append(feat)
        else:
            continue
    name = fc.get("name")
    result: dict[str, Any] = {"type": "FeatureCollection", "features": out}
    if name is not None:
        result["name"] = name
    return result
