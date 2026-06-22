#!/usr/bin/env python3
"""Validate data/locations.csv before it is committed/deployed.

This is the gate that stops a typo in the Google Sheet from going live. It
mirrors the browser's tolerant hours parser (_normaliseSlot in js/app.js):

  * empty / "gesloten" / "closed" / "-" ............ Closed   (ok)
  * "HH:MM-HH:MM" (after light auto-repair) ......... Open     (ok)
  * non-empty but unparseable ("open 24h", "13-") .. UNKNOWN  (FAIL)

A cell that the site would render as "unknown — check website" is treated as a
hard error here: the human should fix the sheet rather than ship a location
whose hours nobody can read. Auto-repaired cells (e.g. "13:00-17") pass but are
reported as warnings so they can be tidied at the source.

Exit code 0 = safe to deploy, 1 = do not deploy.
"""
import csv
import re
import sys

DAY_COLS  = ["hours_mon", "hours_tue", "hours_wed", "hours_thu", "hours_fri", "hours_sat", "hours_sun"]
HEAT_COLS = ["heat_mon", "heat_tue", "heat_wed", "heat_thu", "heat_fri", "heat_sat", "heat_sun"]
CLOSED_WORDS = {"", "-", "–", "—", "gesloten", "closed", "dicht", "x", "n/a", "na"}
SLOT_RE = re.compile(r"^(\d{1,2})(?::(\d{2}))?-(\d{1,2})(?::(\d{2}))?$")
# A cell already in clean "H:MM-H:MM" / "HH:MM-HH:MM" form needs no tidying;
# single-digit hours and missing zero-padding are fine, not "repairs".
CLEAN_RE = re.compile(r"^\d{1,2}:\d{2}-\d{1,2}:\d{2}$")
MIN_ROWS  = 5      # a healthy export has far more; guards against truncated/error bodies
MIN_BYTES = 200


def classify(raw):
    """Return ('closed'|'ok'|'repaired'|'unknown', normalized_or_None)."""
    trimmed = (raw or "").strip()
    if trimmed.lower() in CLOSED_WORDS:
        return "closed", None
    text = re.sub(r"[^0-9:-]", "", trimmed.lower()
                  .replace("–", "-").replace("—", "-")
                  .replace(" ", "").replace(".", ":"))
    m = SLOT_RE.match(text)
    if not m:
        return "unknown", None
    oh, om, ch, cm = int(m[1]), int(m[2] or 0), int(m[3]), int(m[4] or 0)
    if oh > 23 or ch > 24 or om > 59 or cm > 59:
        return "unknown", None
    norm = f"{oh:02d}:{om:02d}-{ch:02d}:{cm:02d}"
    # Already clean "H:MM-H:MM" → ok; anything that needed real fixing → repaired.
    return ("ok" if CLEAN_RE.match(trimmed) else "repaired"), norm


def main(path="data/locations.csv"):
    with open(path, newline="", encoding="utf-8") as f:
        raw = f.read()
    if len(raw.encode("utf-8")) < MIN_BYTES:
        print(f"FAIL: {path} is suspiciously small ({len(raw)} bytes) — refusing.")
        return 1

    rows = list(csv.DictReader(raw.splitlines()))
    # Only rows with a name are real locations (the app skips the rest). A
    # half-entered or stray blank row must NOT block everyone else's updates.
    named = [(i, r) for i, r in enumerate(rows, start=2) if (r.get("name") or "").strip()]
    if len(named) < MIN_ROWS:
        print(f"FAIL: only {len(named)} named locations (< {MIN_ROWS}) — looks like a bad/truncated export.")
        return 1

    # Per-row issues are WARNINGS, not blockers: the site already degrades
    # gracefully (a coord-less row is skipped; an unparseable hours cell shows
    # "unknown" rather than a wrong open/closed). Only a catastrophic export
    # (caught above) blocks the deploy, so one editor typo can't freeze updates.
    warnings = []
    for i, row in named:
        name = (row.get("name") or "").strip()
        if not (row.get("latitude") or "").strip() or not (row.get("longitude") or "").strip():
            warnings.append(f"row {i} [{name}]: missing latitude/longitude → won't appear on the map")
        for col in DAY_COLS + HEAT_COLS:
            kind, _ = classify(row.get(col))
            if kind == "unknown":
                warnings.append(f"row {i} [{name}] {col} = {row.get(col)!r} → unreadable, shows 'unknown'")
            elif kind == "repaired":
                warnings.append(f"row {i} [{name}] {col} = {row.get(col)!r} → auto-repaired (please tidy)")

    for w in warnings:
        print("WARN:", w)
    print(f"\nOK: {len(named)} locations valid"
          + (f", {len(warnings)} thing(s) to tidy in the sheet (non-blocking)." if warnings else "."))
    return 0


if __name__ == "__main__":
    sys.exit(main(*sys.argv[1:]))
