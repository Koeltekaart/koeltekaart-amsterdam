#!/usr/bin/env python3
"""Fetch one tab of the private Google Sheet as CSV, using a service account.

This is the INGESTION step (runs in GitHub Actions only, never in a browser).
It reads the LIVE sheet through the official Sheets API v4 — not the cached
"publish to web" snapshot — so the static file the public site serves is always
fresh, while the spreadsheet itself stays fully private (shared only to the
service account, never to "anyone with the link").

  fetch_sheet.py <gid> <output.csv> [--columns name,stadsdeel,...]

--columns is a PUBLIC-COLUMN ALLOW-LIST. When given, only those columns are
emitted, in exactly that order, and every other column in the tab is dropped.
This is a safety boundary: the committed CSV lands in a PUBLIC repo, so any
internal-only column (GGD contact, approval notes, EHBO status, …) added to the
tab must NOT leak. With the allow-list, such a column simply never reaches the
output — even if an editor adds it to the wrong tab by accident. A named column
that is missing from the tab is a hard error (fail loudly, never silently ship
a short row), so a rename in the sheet stops the run instead of dropping data.

Without --columns, the whole tab is emitted (used for the key/value settings tab,
whose leak risk is row-shaped, not column-shaped).

Environment:
  GOOGLE_SERVICE_ACCOUNT_KEY  service-account JSON key (inline JSON or a path)
  SHEET_ID                    the real /spreadsheets/d/<ID>/edit id

The output is plain LF-terminated CSV with rows padded to the header width, so
it is byte-stable for git change-detection and matches what the app expects.
"""
import argparse
import json
import os
import sys

from google.oauth2 import service_account
from googleapiclient.discovery import build

import sheet_common

SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"]


def _load_credentials():
    raw = os.environ["GOOGLE_SERVICE_ACCOUNT_KEY"]
    info = json.loads(raw) if raw.lstrip().startswith("{") else json.load(open(raw))
    return service_account.Credentials.from_service_account_info(info, scopes=SCOPES)


def main(gid, out_path, columns):
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

    text = sheet_common.to_csv(rows, columns)
    if text is None:
        return 1                                   # missing allow-listed column
    with open(out_path, "w", encoding="utf-8", newline="") as f:
        f.write(text)

    print(f"Wrote {out_path} from tab '{title}'"
          f"{' (allow-listed)' if columns else ''}.")
    return 0


if __name__ == "__main__":
    p = argparse.ArgumentParser(description="Fetch one Google Sheet tab as CSV.")
    p.add_argument("gid", help="numeric tab gid")
    p.add_argument("out_path", help="output CSV path")
    p.add_argument("--columns", default="",
                   help="comma-separated public-column allow-list; only these are emitted")
    args = p.parse_args()
    cols = [c.strip() for c in args.columns.split(",") if c.strip()]
    sys.exit(main(args.gid, args.out_path, cols))
