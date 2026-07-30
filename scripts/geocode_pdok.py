#!/usr/bin/env python3
"""Derive every location's position + district from its address via PDOK/BAG.

The sheet holds NO latitude, longitude, stadsdeel or wijk — all four are
derived here from the `address` column on every refresh, so position and
administrative geography are computed, never typed. BAG (the national address
registry, served free by PDOK) gives the official address point: authoritative,
reproducible, open-licensed. A past batch of hand-placed pins drifted ~175 m
from a data-entry slip; deriving from the address removes that class of error.

  * latitude/longitude  BAG address point (postcode centroid as a coarse
                        fallback so a resolvable place still appears).
  * stadsdeel           offline point-in-polygon over the 9 Amsterdam stadsdeel
                        polygons (see geo_common); for addresses outside the
                        city, the gemeente name (Diemen, Uithoorn, …) instead.
  * wijk                PDOK's CBS-wijk name for the resolved address.

Runs inside the refresh pipeline (fetch sheet -> THIS -> validate -> commit),
so it must be cheap and robust:

  * Address-keyed cache (data/geocode_cache.json). A row whose address is
    unchanged is served from cache with ZERO network calls, so steady-state
    refreshes hit PDOK 0 times; only a genuinely new/edited address is geocoded.
  * PDOK downtime never aborts a refresh: an uncached row is left unplaced (no
    coordinate) and flagged by validate_locations; it self-heals next run. There
    is no sheet coordinate to fall back to any more.

Confidence is self-consistency — does the address PDOK resolved match the parts
we asked for? The input postcode is the anchor (Dutch 6-char postcodes cover ~a
handful of addresses), so matching it is a real check, not circular. It never
gates the pipeline; validate_locations.py turns it into human-facing warnings.

  HIGH   bag              postcode + house number match
  MEDIUM bag-approx       postcode ok, house number differs / no-postcode match
  MEDIUM bag-pc-mismatch  street+number match but the sheet postcode disagrees
  LOW    bag-postcode     no address match -> postcode centroid (coarse)
  NONE   none / kept      no PDOK match, or PDOK down and uncached -> no pin

Usage:
  geocode_pdok.py [data/locations.csv] [--write] [--refresh]
    (no flag)  dry run: write geocode_review.csv, change nothing
    --write    write derived lat/long/stadsdeel/wijk in place (pipeline mode)
    --refresh  ignore the cache and re-geocode every row
"""
import argparse
import csv
import json
import os
import re
import sys
import time

import requests

import geo_common

PDOK = "https://api.pdok.nl/bzk/locatieserver/search/v3_1/free"
FIELDS = "type,huisnummer,postcode,gemeentenaam,wijknaam,centroide_ll"
CACHE_PATH = "data/geocode_cache.json"
EXPECTED_GEMEENTEN = {"amsterdam", "diemen", "ouder-amstel", "amstelveen"}
POSTCODE_RE = re.compile(r"(\d{4})\s*([A-Za-z]{2})")


def norm_key(address):
    return re.sub(r"\s+", " ", (address or "").strip()).lower()


def norm_pc(s):
    m = POSTCODE_RE.search(s or "")
    return (m[1] + m[2]).upper() if m else None


def input_hnr(address):
    head = POSTCODE_RE.split(address, 1)[0] if POSTCODE_RE.search(address) else address
    nums = re.findall(r"\b(\d{1,5})\b", head)
    return int(nums[0]) if nums else None


def _point(doc):
    ll = doc.get("centroide_ll", "")
    if ll.startswith("POINT("):
        lon, lat = map(float, ll[6:-1].split())
        return lat, lon
    return None, None


def _query(q, fq):
    r = requests.get(PDOK, params={"q": q, "fq": fq, "rows": 1, "fl": FIELDS}, timeout=20)
    r.raise_for_status()
    docs = r.json()["response"]["docs"]
    return docs[0] if docs else None


def _result(lat, lon, wijk, gemeente, source, conf, reason):
    return {"lat": lat, "lon": lon, "wijk": wijk, "gemeente": gemeente,
            "source": source, "conf": conf, "reason": reason}


def geocode(address):
    """Resolve an address to a coordinate + place labels. Raises on network
    error (the caller decides how to cope). Returns a dict with keys
    lat, lon, wijk, gemeente, source, conf, reason. lat/lon are None only when
    PDOK returns nothing at all.

    `gemeente` is used to label the district of locations OUTSIDE Amsterdam
    (Diemen, Uithoorn, …), which have no Amsterdam stadsdeel.
    """
    want_pc, want_hnr = norm_pc(address), input_hnr(address)
    doc = _query(address, "type:adres")

    # Retry against the postcode ONLY when the free-text match is weak: missing,
    # not an address, or the house number doesn't match. A solid street+number
    # match is trusted OVER the sheet's postcode, because the postcode is the
    # field most often mistyped. (Bezaanjachtplein 249 was written as "1034 BM",
    # which is a different street — IJdoornlaan; the old code let that wrong
    # postcode drag the pin ~350 m onto the wrong street.)
    weak = (not doc or doc.get("type") != "adres"
            or (want_hnr is not None and doc.get("huisnummer") != want_hnr))
    if want_pc and weak:
        retry = _query(f"{want_pc} {want_hnr}" if want_hnr else want_pc, "type:adres")
        if retry and norm_pc(retry.get("postcode", "")) == want_pc:
            doc = retry

    if doc and doc.get("type") == "adres":
        got_pc = norm_pc(doc.get("postcode", ""))
        gem_disp = doc.get("gemeentenaam") or ""
        gem = gem_disp.lower()
        wijk = doc.get("wijknaam") or ""
        lat, lon = _point(doc)
        hnr_ok = want_hnr is None or doc.get("huisnummer") == want_hnr
        if want_pc and got_pc == want_pc:
            if hnr_ok:
                return _result(lat, lon, wijk, gem_disp, "bag", "HIGH", "postcode + house number match")
            return _result(lat, lon, wijk, gem_disp, "bag-approx", "MEDIUM",
                           f"postcode ok, house nr {doc.get('huisnummer')} vs {want_hnr}")
        if want_pc and got_pc != want_pc and hnr_ok and gem in EXPECTED_GEMEENTEN:
            # Street + house number matched but the sheet's postcode points
            # elsewhere: the coordinate is trustworthy, the postcode is the typo.
            return _result(lat, lon, wijk, gem_disp, "bag-pc-mismatch", "MEDIUM",
                           f"street+number match, but sheet postcode {want_pc} != {got_pc} — fix the postcode")
        if not want_pc and gem in EXPECTED_GEMEENTEN:
            return _result(lat, lon, wijk, gem_disp, "bag-approx", "MEDIUM",
                           f"no input postcode; matched in {gem_disp}")

    # Fallback: postcode centroid — coarse but keeps the row on the map.
    if want_pc:
        pc = _query(want_pc, "type:postcode")
        if pc:
            lat, lon = _point(pc)
            return _result(lat, lon, "", "", "bag-postcode", "LOW",
                           f"no exact address; postcode {want_pc} centroid")
    return _result(None, None, "", "", "none", "NONE", "no PDOK match at all")


def load_cache():
    if os.path.exists(CACHE_PATH):
        with open(CACHE_PATH, encoding="utf-8") as f:
            return json.load(f)
    return {}


# Columns the sheet no longer carries — they are DERIVED here from the address.
# The sheet is the source of truth for everything a human knows; position and
# administrative geography are computed, never typed. Added to the output if the
# fetched CSV lacks them, so the site always sees a complete schema.
DERIVED_COLS = ["latitude", "longitude", "stadsdeel", "wijk"]


def _ensure_columns(fieldnames):
    """Return fieldnames with the derived columns present, inserted right after
    'address' for a readable CSV (order is deterministic, so no spurious diff)."""
    out = list(fieldnames)
    missing = [c for c in DERIVED_COLS if c not in out]
    if not missing:
        return out
    anchor = out.index("address") + 1 if "address" in out else len(out)
    return out[:anchor] + missing + out[anchor:]


def _district(lat, lon, gemeente):
    """District label: the Amsterdam stadsdeel when the point is inside the city
    (offline point-in-polygon), otherwise the gemeente name (Diemen, Uithoorn,
    Ouder-Amstel, …) so non-Amsterdam rows are still labelled, never blank."""
    sd = geo_common.stadsdeel_for(lat, lon)
    if sd:
        return sd
    return gemeente or ""


def main(path="data/locations.csv", *flags):
    write, refresh = "--write" in flags, "--refresh" in flags
    with open(path, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
        fieldnames = _ensure_columns(list(rows[0].keys()) if rows else [])

    cache = {} if refresh else load_cache()
    cache_dirty = False
    review = []
    counts = {"HIGH": 0, "MEDIUM": 0, "LOW": 0, "NONE": 0, "cache": 0, "skip": 0, "error": 0}

    for row in rows:
        name = (row.get("name") or "").strip()
        addr = (row.get("address") or "").strip()
        if not name or not addr:
            counts["skip"] += 1
            # Record it so the validator flags "no address -> no coordinate".
            review.append({"name": name, "confidence": "SKIP", "source": "no-address",
                           "new_lat": "", "new_lon": "", "stadsdeel": "", "wijk": "",
                           "reason": "row has no address" if name else "row has no name",
                           "address": addr})
            continue

        key = norm_key(addr)

        if key in cache:
            c = cache[key]
            lat, lon, wijk, gemeente = c["lat"], c["lon"], c.get("wijk", ""), c.get("gemeente", "")
            source, conf, reason = c["source"], "cache", "unchanged address"
            counts["cache"] += 1
        else:
            try:
                g = geocode(addr)
                lat, lon, wijk, gemeente = g["lat"], g["lon"], g["wijk"], g["gemeente"]
                source, conf, reason = g["source"], g["conf"], g["reason"]
                counts[conf] += 1
                if lat is not None:
                    cache[key] = {"lat": lat, "lon": lon, "wijk": wijk,
                                  "gemeente": gemeente, "source": source}
                    cache_dirty = True
                time.sleep(0.06)
            except requests.RequestException as e:
                # PDOK unreachable and not cached: no coordinate this run. There
                # is no sheet coordinate to fall back to any more, so the row is
                # left unplaced and the validator flags it; it self-heals once
                # PDOK is back (and stays cheap forever after via the cache).
                lat, lon, wijk, gemeente = None, None, "", ""
                source, conf, reason = "kept", "error", f"PDOK error: {e}"
                counts["error"] += 1

        stadsdeel = _district(lat, lon, gemeente)

        review.append({"name": name, "confidence": conf, "source": source,
                       "new_lat": f"{lat:.7f}" if lat is not None else "",
                       "new_lon": f"{lon:.7f}" if lon is not None else "",
                       "stadsdeel": stadsdeel, "wijk": wijk,
                       "reason": reason, "address": addr})

        # Everything downstream: write every derived field the sheet no longer
        # holds. Even a coarse (LOW) match is written so the location still
        # appears; the validator surfaces anything below a clean match. A row
        # with no coordinate at all is left blank and flagged, never guessed.
        if write:
            if lat is not None:
                row["latitude"], row["longitude"] = f"{lat:.7f}", f"{lon:.7f}"
            else:
                row["latitude"], row["longitude"] = "", ""
            row["stadsdeel"] = stadsdeel
            row["wijk"] = wijk

    if cache_dirty and (write or refresh):
        with open(CACHE_PATH, "w", encoding="utf-8") as f:
            json.dump(dict(sorted(cache.items())), f, ensure_ascii=False, indent=0)

    with open("geocode_review.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(review[0].keys()))
        w.writeheader()
        w.writerows(review)

    print(f"PDOK geocode: {counts['HIGH']} HIGH, {counts['MEDIUM']} MEDIUM, {counts['LOW']} postcode-fallback, "
          f"{counts['cache']} from cache, {counts['error']} kept (PDOK error), "
          f"{counts['NONE']} unresolved, {counts['skip']} skipped.")

    if write:
        # LF + QUOTE_MINIMAL to byte-match sheet_common.to_csv, so an unchanged
        # refresh produces an identical file (no spurious diff / redeploy).
        with open(path, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=fieldnames, lineterminator="\n")
            w.writeheader()
            w.writerows(rows)
        print(f"WROTE derived coordinates to {path}; cache in {CACHE_PATH}.")
    else:
        print("Dry run — nothing changed (see geocode_review.csv). Use --write to apply.")
    return 0


if __name__ == "__main__":
    p = argparse.ArgumentParser(description="Derive coordinates from address via PDOK/BAG.")
    p.add_argument("path", nargs="?", default="data/locations.csv")
    p.add_argument("--write", action="store_true", help="overwrite latitude/longitude in place")
    p.add_argument("--refresh", action="store_true", help="ignore cache; re-geocode every row")
    a = p.parse_args()
    flags = (["--write"] if a.write else []) + (["--refresh"] if a.refresh else [])
    sys.exit(main(a.path, *flags))
