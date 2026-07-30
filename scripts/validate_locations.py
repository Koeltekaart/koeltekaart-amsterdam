#!/usr/bin/env python3
"""Judge the geocode results and surface locations that need a human eye.

Reads `geocode_review.csv` (written by geocode_pdok.py) and classifies every
row by how trustworthy its resolved position is. Since coordinates are now
DERIVED from the address, a wrong pin is no longer the failure mode — an
address PDOK can't resolve cleanly is. This flags exactly those.

All position data (coordinate, stadsdeel, wijk) is DERIVED from the address —
the sheet no longer carries it — so the failure modes are: an address that
yields no coordinate at all (the location would vanish from the map), and an
address that resolves only imprecisely.

Severity is read from `source` (not `confidence`, which shows "cache" for
unchanged rows and would hide their real quality), plus whether a coordinate
and a district were actually produced:

  (no coordinate)   address unresolved / PDOK down / no address   BROKEN
  bag-approx        postcode ok but house number differs, or      REVIEW
                    no postcode and only a gemeente match
  bag-pc-mismatch   street+number matched, postcode disagrees     REVIEW
  bag-postcode      no address hit -> postcode centroid (coarse)  REVIEW
  (no district)     coordinate found but not inside any known     REVIEW
                    gemeente/stadsdeel
  bag               exact address, postcode + house number        OK

Output:
  * GitHub-Actions ::error:: / ::warning:: annotations (show inline on the run)
  * a Markdown report to --report and, if set, $GITHUB_STEP_SUMMARY
  * prints "PROBLEMS: N"
  * exit 1 when any BROKEN/REVIEW row exists (so a workflow can open an issue);
    exit 0 when the data is clean.
"""
import argparse
import csv
import os
import sys

REVIEW = {"bag-approx": "approximate match — verify house number/street",
          "bag-pc-mismatch": "postcode looks wrong — street+number resolved elsewhere; fix the postcode",
          "bag-postcode": "only the postcode resolved — position is block-level, not the building"}


def classify(rows):
    """Return (broken, review) lists of (name, issue, detail, address)."""
    broken, review = [], []
    for r in rows:
        name, src, addr = r["name"] or "(unnamed)", r["source"], r["address"]

        # No coordinate at all is now fatal — there is no sheet pin to fall back
        # to, so the location cannot be placed on the map.
        if not r.get("new_lat"):
            if src == "no-address":
                issue = "row has no address, so nothing can be geocoded"
            elif src == "kept":
                issue = "PDOK unreachable and address not cached — no coordinate this run"
            else:
                issue = "address does not resolve in PDOK/BAG — no coordinate"
            broken.append((name, issue, r["reason"], addr))
            continue

        if src in REVIEW:
            review.append((name, REVIEW[src], r["reason"], addr))
        elif not r.get("stadsdeel"):
            # Placed, but outside every gemeente/stadsdeel we can label.
            review.append((name, "could not determine a district for this coordinate",
                           r["reason"], addr))
    return broken, review


def annotate(level, name, issue, detail):
    # GitHub renders ::error/::warning:: inline on the workflow run.
    print(f"::{level} title=Location {level}::{name}: {issue} ({detail})")


def table(rows):
    if not rows:
        return "_none_\n"
    out = ["| Location | Issue | Detail | Address |", "|---|---|---|---|"]
    for name, issue, detail, addr in rows:
        cells = [c.replace("|", "\\|") for c in (name, issue, detail, addr)]
        out.append("| " + " | ".join(cells) + " |")
    return "\n".join(out) + "\n"


def report_md(broken, review):
    md = ["## Koelteplekken location data check\n"]
    md.append(f"**{len(broken)} broken**, **{len(review)} to review**.\n")
    md.append("### ❌ Broken — location cannot be placed until fixed\n" + table(broken))
    md.append("### ⚠️ Review — placed, but imprecise or ambiguous\n" + table(review))
    return "\n".join(md)


def main(review_csv, report_path):
    with open(review_csv, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    broken, review = classify(rows)

    for name, issue, detail, _ in broken:
        annotate("error", name, issue, detail)
    for name, issue, detail, _ in review:
        annotate("warning", name, issue, detail)

    md = report_md(broken, review)
    if report_path:
        with open(report_path, "w", encoding="utf-8") as f:
            f.write(md)
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as f:
            f.write(md)

    n = len(broken) + len(review)
    print(f"\nPROBLEMS: {n}  (broken={len(broken)}, review={len(review)})")
    return 1 if n else 0


if __name__ == "__main__":
    p = argparse.ArgumentParser(description="Flag locations whose position is unreliable.")
    p.add_argument("review_csv", nargs="?", default="geocode_review.csv")
    p.add_argument("--report", default="location_issues.md",
                   help="write the Markdown report here (for a GitHub issue body)")
    a = p.parse_args()
    sys.exit(main(a.review_csv, a.report))
