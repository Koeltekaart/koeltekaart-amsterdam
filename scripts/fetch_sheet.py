#!/usr/bin/env python3
"""Fetch one tab of the private Google Sheet as CSV, using a service account.

This is the INGESTION step (runs in GitHub Actions only, never in a browser).
It reads the LIVE sheet through the official Sheets API v4 — not the cached
"publish to web" snapshot — so the static file the public site serves is always
fresh, while the spreadsheet itself stays fully private (shared only to the
service account, never to "anyone with the link").

  fetch_sheet.py <gid> <output.csv>

Environment:
  GOOGLE_SERVICE_ACCOUNT_KEY  service-account JSON key (inline JSON or a path)
  SHEET_ID                    the real /spreadsheets/d/<ID>/edit id

The output is plain LF-terminated CSV with rows padded to the header width, so
it is byte-stable for git change-detection and matches what the app expects.
"""
import csv
import io
import json
import os
import sys

from google.oauth2 import service_account
from googleapiclient.discovery import build

SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"]


def _load_credentials():
    raw = os.environ["GOOGLE_SERVICE_ACCOUNT_KEY"]
    info = json.loads(raw) if raw.lstrip().startswith("{") else json.load(open(raw))
    return service_account.Credentials.from_service_account_info(info, scopes=SCOPES)


def main(gid, out_path):
    sheet_id = os.environ["SHEET_ID"]
    svc = build("sheets", "v4", credentials=_load_credentials(), cache_discovery=False)

    # Map the stable numeric gid → tab title (titles can be renamed, gids can't).
    meta = svc.spreadsheets().get(spreadsheetId=sheet_id).execute()
    titles = {s["properties"]["sheetId"]: s["properties"]["title"] for s in meta["sheets"]}
    title = titles.get(int(gid))
    if title is None:
        print(f"::error::gid {gid} not found in spreadsheet (tabs: {sorted(titles)})")
        return 1

    res = svc.spreadsheets().values().get(
        spreadsheetId=sheet_id,
        range=title,
        valueRenderOption="FORMATTED_VALUE",       # times as displayed, e.g. "08:00-22:00"
        dateTimeRenderOption="FORMATTED_STRING",
    ).execute()
    rows = res.get("values", [])
    if not rows:
        print(f"::error::tab '{title}' (gid {gid}) returned no rows")
        return 1

    # Clean each cell: editors sometimes Alt+Enter inside a cell, leaving
    # embedded CR/LF. Collapse those to spaces and trim, so the output is
    # single-line-per-row and byte-stable (otherwise git would see a "change"
    # on every run and redeploy needlessly).
    def clean(v):
        return " ".join(str(v).replace("\r", " ").replace("\n", " ").split())

    width = max(len(r) for r in rows)              # pad ragged rows to header width
    buf = io.StringIO()
    w = csv.writer(buf, lineterminator="\n")       # LF, not CRLF
    for r in rows:
        w.writerow([clean(c) for c in r] + [""] * (width - len(r)))
    with open(out_path, "w", encoding="utf-8", newline="") as f:
        f.write(buf.getvalue())

    print(f"Wrote {out_path}: {len(rows)} rows × {width} cols from tab '{title}'.")
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("usage: fetch_sheet.py <gid> <output.csv>")
        sys.exit(2)
    sys.exit(main(sys.argv[1], sys.argv[2]))
